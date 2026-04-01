const { generateText } = require('./llmService');
const {
  buildSchemaEnhancementPrompt,
  buildSchemaRepairPrompt,
} = require('../prompts/schemaPrompts');
const { validateSchemaShape } = require('./schemaValidationService');
const { enhanceSchemaRelationships } = require('./schemaEnhancerService');
const { convertSchemaToSql } = require('./schemaSqlService');
const { buildSchemaPreview } = require('./schemaPreviewService');
const {
  getRelevantSchemaMemories,
  getMemoryBackend,
  getRetrieverStrategy,
  storeGeneratedSchemaMemory,
} = require('./schemaMemoryService');
const { buildSchema } = require('./schemaBuilderService');
const {
  enrichSchemaConstraints,
  validateSchemaWithAjv,
  buildValidationReport,
} = require('./schemaConstraintEnricherService');
const { buildTreeFromSchema, getRootNodes, getTreeEdges, formatRootLabel } = require('./schemaTreeService');
const { evaluateSchemaMatch, detectIrrelevantEntities } = require('./schemaMatchScoringService');
const { shouldInvokeAI, runDecisionEngine } = require('./schemaAiDecisionEngine');
const {
  parseEditContext,
  lockManualNodes,
  mergeWithProtection,
  validateManualEditsPreserved,
  stripManualMarkers,
} = require('./schemaEditProtectionService');

const MAX_REPAIR_ATTEMPTS = 2;
const DEFAULT_SCHEMA_MAX_TOKENS = 4096;
const SQL_ENGINES = new Set(['postgresql', 'mysql', 'sqlite', 'sqlserver']);
const NOSQL_ENGINES = new Set(['mongodb', 'dynamodb', 'firestore', 'cassandra']);

const deriveTreeRootLabel = (request, builderMeta) =>
  formatRootLabel(builderMeta?.domain || builderMeta?.domainLabel || request.prompt);

// ---------------------------------------------------------------------------
// Output mode inference (kept for normaliseSchemaRequest compatibility)
// ---------------------------------------------------------------------------

const inferOutputMode = ({ prompt, database }) => {
  const normalizedDatabase = String(database || '').trim().toLowerCase();
  const normalizedPrompt = String(prompt || '').trim().toLowerCase();

  if (normalizedDatabase === 'both' || normalizedDatabase === 'auto') {
    return {
      outputMode: 'both',
      requestedEngine: null,
    };
  }

  if (SQL_ENGINES.has(normalizedDatabase) || normalizedDatabase === 'sql') {
    return {
      outputMode: 'sql',
      requestedEngine: SQL_ENGINES.has(normalizedDatabase) ? normalizedDatabase : null,
    };
  }

  if (NOSQL_ENGINES.has(normalizedDatabase) || normalizedDatabase === 'nosql') {
    return {
      outputMode: 'nosql',
      requestedEngine: NOSQL_ENGINES.has(normalizedDatabase) ? normalizedDatabase : null,
    };
  }

  if (
    /\b(mongodb|mongo|document db|document database|nosql|dynamodb|firestore|cassandra)\b/i.test(
      normalizedPrompt
    )
  ) {
    return {
      outputMode: 'nosql',
      requestedEngine: /\bmongodb|mongo\b/i.test(normalizedPrompt) ? 'mongodb' : null,
    };
  }

  if (
    /\b(postgresql|postgres|mysql|sqlite|sql server|sqlserver|relational|rdbms|sql)\b/i.test(
      normalizedPrompt
    )
  ) {
    return {
      outputMode: 'sql',
      requestedEngine: /\bpostgresql|postgres\b/i.test(normalizedPrompt)
        ? 'postgresql'
        : /\bmysql\b/i.test(normalizedPrompt)
          ? 'mysql'
          : /\bsqlite\b/i.test(normalizedPrompt)
            ? 'sqlite'
            : /\bsql server|sqlserver\b/i.test(normalizedPrompt)
              ? 'sqlserver'
              : null,
    };
  }

  return {
    outputMode: 'both',
    requestedEngine: null,
  };
};

const parseJsonObject = (rawText) => {
  const text = String(rawText || '').trim();

  if (!text) {
    throw new Error('The LLM returned an empty response.');
  }

  try {
    return JSON.parse(text);
  } catch (error) {
    const fencedMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/i);

    if (fencedMatch) {
      return JSON.parse(fencedMatch[1].trim());
    }

    const firstBrace = text.indexOf('{');
    const lastBrace = text.lastIndexOf('}');

    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      return JSON.parse(text.slice(firstBrace, lastBrace + 1));
    }

    throw new Error(error.message || 'The LLM response could not be parsed as JSON.');
  }
};

const callModel = async ({ prompt, payload, system, maxTokens }) => {
  const llmResult = await generateText({
    provider: payload.provider,
    model: payload.model,
    maxTokens,
    timeout: payload.timeout,
    options: payload.options,
    format: payload.provider === 'ollama' ? 'json' : undefined,
    system,
    prompt,
  });

  if (!llmResult.success) {
    throw new Error(llmResult.error?.message || 'Schema generation failed.');
  }

  return llmResult;
};

const callSchemaModel = async ({ prompt, payload }) =>
  callModel({
    prompt,
    payload,
    maxTokens: payload.maxTokens,
    system:
      'You enhance valid JSON database schemas. Return only valid JSON matching the provided contract exactly.',
  });

const normalizeSchemaRequest = (payload = {}) => {
  const userPrompt = String(payload.prompt || '').trim();

  if (!userPrompt) {
    throw new Error('A prompt is required to generate a schema.');
  }

  return {
    prompt: userPrompt,
    sourceData: payload.sourceData ?? null,
    editContext: payload.editContext ?? null,
    ...inferOutputMode({
      prompt: userPrompt,
      database: payload.database,
    }),
    includeSql: payload.includeSql !== false,
    provider: payload.provider,
    model: payload.model,
    maxTokens:
      Number(payload.maxTokens) > 0 ? Number(payload.maxTokens) : DEFAULT_SCHEMA_MAX_TOKENS,
    timeout: payload.timeout,
    options: payload.options,
  };
};

const validateModelResponse = (llmResult) => {
  try {
    const schema = parseJsonObject(llmResult.response);
    return {
      schema,
      validation: validateSchemaShape(schema),
      parseError: null,
    };
  } catch (error) {
    return {
      schema: null,
      validation: {
        valid: false,
        errors: [`Invalid JSON returned by model: ${error.message}`],
      },
      parseError: error,
    };
  }
};

/**
 * Optional AI enhancement pass.
 * Takes the deterministically built schema and asks the LLM to improve it
 * (descriptions, field suggestions, relationship hints) without replacing it.
 * If the LLM is not configured or fails, the deterministic schema is returned as-is.
 */
const tryEnhanceWithAi = async ({ schema, request, memoryContexts }) => {
  if (!request.provider) {
    return { schema, aiUsed: false, repairAttempt: 0, llmMeta: null };
  }

  const enhancementPrompt = buildSchemaEnhancementPrompt({
    userPrompt: request.prompt,
    sourceData: request.sourceData,
    schema,
    memoryContexts,
  });

  let llmResult;
  try {
    llmResult = await callSchemaModel({ prompt: enhancementPrompt, payload: request });
  } catch (err) {
    // AI unavailable — silently fall back to deterministic schema
    return { schema, aiUsed: false, repairAttempt: 0, llmMeta: null };
  }

  if (!llmResult.success) {
    return { schema, aiUsed: false, repairAttempt: 0, llmMeta: llmResult };
  }

  let { schema: enhancedSchema, validation, parseError } = validateModelResponse(llmResult);
  let repairAttempt = 0;

  while ((!validation.valid || parseError) && repairAttempt < MAX_REPAIR_ATTEMPTS) {
    repairAttempt += 1;
    llmResult = await callSchemaModel({
      prompt: buildSchemaRepairPrompt({
        originalPrompt: request.prompt,
        invalidResponse: llmResult.response,
        validationErrors: validation.errors,
      }),
      payload: request,
    });
    ({ schema: enhancedSchema, validation, parseError } = validateModelResponse(llmResult));
  }

  // If AI produced broken JSON even after repairs, fall back to deterministic output
  if (parseError || !validation.valid) {
    return { schema, aiUsed: false, repairAttempt, llmMeta: llmResult };
  }

  return { schema: enhancedSchema, aiUsed: true, repairAttempt, llmMeta: llmResult };
};

const generateSchema = async (payload = {}) => {
  const request = normalizeSchemaRequest(payload);

  // ── Step 1: Parse manual edit context ────────────────────────────────────
  const parsedEditContext = parseEditContext(request.editContext);

  // ── Step 2: Deterministic schema build (no AI) ───────────────────────────
  const { architectures, meta: builderMeta } = buildSchema({
    prompt: request.prompt,
    sourceData: request.sourceData,
    outputMode: request.outputMode,
    requestedEngine: request.requestedEngine,
  });

  let schema = { architectures };

  // ── Step 3: Validate deterministic output ────────────────────────────────
  const deterministicValidation = validateSchemaShape(schema);
  if (!deterministicValidation.valid) {
    throw new Error(`Deterministic schema build failed validation: ${deterministicValidation.errors.join(' ')}`);
  }

  // ── Step 4: Lock manual nodes before any AI pass ─────────────────────────
  const lockedSchema = lockManualNodes(schema, parsedEditContext);

  // ── Step 5: Retrieve memory context ──────────────────────────────────────
  const memoryContexts = await getRelevantSchemaMemories({
    prompt: request.prompt,
    sourceData: request.sourceData,
  });

  // ── Step 6: Compute match scores ─────────────────────────────────────────
  const scores = evaluateSchemaMatch(request.prompt, memoryContexts, lockedSchema);
  const irrelevantCheck = detectIrrelevantEntities(request.prompt, lockedSchema);

  // ── Step 7: AI path — decision engine OR standard enhancement ────────────
  let finalSchema;
  let aiUsed = false;
  let repairAttempt = 0;
  let llmMeta = null;
  let decisionResult = null;

  if (shouldInvokeAI(scores, irrelevantCheck)) {
    // Scores failed threshold or irrelevant entities detected — run full decision engine
    decisionResult = await runDecisionEngine({
      prompt: request.prompt,
      existingSchema: lockedSchema,
      retrievedSchemas: memoryContexts,
      scores,
      editContext: request.editContext,
      provider: request.provider,
      model: request.model,
      maxTokens: request.maxTokens,
      timeout: request.timeout,
      options: request.options,
      outputMode: request.outputMode,
    });

    // Merge AI output with manual-protected original
    finalSchema = mergeWithProtection(
      decisionResult.schema,
      lockedSchema,
      parsedEditContext
    );
    aiUsed = decisionResult.meta.ai_used;
  } else {
    // Scores passed — optional light enhancement pass (existing behaviour)
    const enhancementResult = await tryEnhanceWithAi({
      schema: lockedSchema,
      request,
      memoryContexts,
    });

    // Merge enhancement output with manual-protected original
    finalSchema = mergeWithProtection(
      enhancementResult.schema,
      lockedSchema,
      parsedEditContext
    );
    aiUsed = enhancementResult.aiUsed;
    repairAttempt = enhancementResult.repairAttempt;
    llmMeta = enhancementResult.llmMeta;
  }

  // ── Step 8: Audit — verify manual edits were preserved ───────────────────
  const editAudit = validateManualEditsPreserved(lockedSchema, finalSchema, parsedEditContext);
  if (!editAudit.preserved) {
    // Safety fallback: restore full locked schema so manual work is never lost
    console.warn('[schemaGenerator] Manual edit violations detected — reverting to locked schema.', editAudit.violations);
    finalSchema = stripManualMarkers(lockedSchema);
  }

  // ── Step 9: Strip internal markers ───────────────────────────────────────
  finalSchema = stripManualMarkers(finalSchema);

  // ── Step 10: Post-processing (deterministic) ──────────────────────────────
  const relationshipSchema = enhanceSchemaRelationships(finalSchema);
  const finalValidation = validateSchemaShape(relationshipSchema);

  if (!finalValidation.valid) {
    throw new Error(`Schema is invalid after post-processing: ${finalValidation.errors.join(' ')}`);
  }

  // ── Step 11: Constraint enrichment + AJV validation ──────────────────────
  const enhancedSchema = enrichSchemaConstraints(relationshipSchema);
  const ajvReport = validateSchemaWithAjv(enhancedSchema);
  const validationReport = buildValidationReport(enhancedSchema);

  // ── Step 12: Build tree + UI hints ───────────────────────────────────────
  const tree =
    decisionResult?.tree ??
    buildTreeFromSchema(enhancedSchema, deriveTreeRootLabel(request, builderMeta));
  const ui_hints = decisionResult?.ui_hints ?? buildDefaultUiHints(enhancedSchema, tree);

  // ── Step 13: Persist to memory ───────────────────────────────────────────
  storeGeneratedSchemaMemory({
    prompt: request.prompt,
    sourceData: request.sourceData,
    schema: enhancedSchema,
    meta: { title: request.prompt },
  });

  return {
    success: true,
    message: 'Schema generated successfully.',
    schema: enhancedSchema,
    tree,
    ui_hints,
    preview: buildSchemaPreview(enhancedSchema),
    sql: request.includeSql ? convertSchemaToSql(enhancedSchema) : null,
    prompt: request.prompt,
    sourceData: request.sourceData,
    validation: {
      ajv: ajvReport,
      fieldReport: validationReport,
    },
    scores,
    decision: decisionResult
      ? {
          action: decisionResult.decision,
          confidence: decisionResult.confidence,
          reasoning_summary: decisionResult.reasoning_summary,
        }
      : null,
    meta: {
      domain: builderMeta.domain,
      domainLabel: builderMeta.domainLabel,
      compositionMode: builderMeta.compositionMode,
      featuresUsed: builderMeta.featuresUsed,
      outputMode: builderMeta.outputMode,
      requestedEngine: builderMeta.requestedEngine,
      extraEntities: builderMeta.extraEntities,
      deterministic: true,
      aiEnhanced: aiUsed,
      decisionEngineInvoked: !!decisionResult,
      manualNodesProtected: [...parsedEditContext.protectedNodes],
      editAuditPassed: editAudit.preserved,
      provider: llmMeta?.provider || (decisionResult?.meta?.provider) || null,
      model: llmMeta?.model || (decisionResult?.meta?.model) || null,
      maxTokens: request.maxTokens,
      memoryHits: memoryContexts.length,
      memoryBackend: getMemoryBackend(),
      retrieverStrategy: getRetrieverStrategy(),
      repaired: repairAttempt > 0,
      durationMs: llmMeta?.meta?.durationMs || null,
      stopReason: llmMeta?.meta?.stopReason || null,
    },
  };
};

// ---------------------------------------------------------------------------
// Default UI hints (used when decision engine was NOT invoked)
// ---------------------------------------------------------------------------

const buildDefaultUiHints = (schema, tree) => {
  const rootNodes = getRootNodes(tree);
  const edges = getTreeEdges(tree);

  const primaryEntities = rootNodes.length > 0
    ? rootNodes
    : tree.nodes.slice(0, 3).map((n) => n.name);

  const suggestedConnections = edges.slice(0, 8).map(([parent, child]) => ({
    from: parent,
    to: child,
    label: `${parent} → ${child}`,
  }));

  return {
    root_node: tree.root,
    primary_entities: primaryEntities,
    suggested_connections: suggestedConnections,
  };
};

module.exports = {
  generateSchema,
};

