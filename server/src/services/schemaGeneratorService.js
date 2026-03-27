const { generateText } = require('./llmService');
const {
  buildDomainBriefPrompt,
  buildSchemaGenerationPrompt,
  buildSchemaRepairPrompt,
} = require('../prompts/schemaPrompts');
const { validateSchemaShape } = require('./schemaValidationService');
const { enhanceSchemaRelationships } = require('./schemaEnhancerService');
const { convertSchemaToSql } = require('./schemaSqlService');
const { buildSchemaPreview } = require('./schemaPreviewService');
const {
  getRelevantSchemaMemories,
  getRetrieverStrategy,
  storeGeneratedSchemaMemory,
} = require('./schemaMemoryService');

const MAX_REPAIR_ATTEMPTS = 2;
const DOMAIN_BRIEF_MAX_TOKENS = 900;
const DEFAULT_SCHEMA_MAX_TOKENS = 4096;
const SQL_ENGINES = new Set(['postgresql', 'mysql', 'sqlite', 'sqlserver']);
const NOSQL_ENGINES = new Set(['mongodb', 'dynamodb', 'firestore', 'cassandra']);

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

const callPlanningModel = async ({ prompt, payload }) =>
  callModel({
    prompt,
    payload,
    maxTokens: Math.min(payload.maxTokens, DOMAIN_BRIEF_MAX_TOKENS),
    system: 'You produce compact JSON planning briefs for backend schema generation.',
  });

const callSchemaModel = async ({ prompt, payload }) =>
  callModel({
    prompt,
    payload,
    maxTokens: payload.maxTokens,
    system:
      'You generate valid JSON for backend schema design tasks. Keep the output concise and structured.',
  });

const normalizeSchemaRequest = (payload = {}) => {
  const userPrompt = String(payload.prompt || '').trim();

  if (!userPrompt) {
    throw new Error('A prompt is required to generate a schema.');
  }

  return {
    prompt: userPrompt,
    sourceData: payload.sourceData ?? null,
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

const buildCompactSchemaFallback = (request) => ({
  ...request,
  outputMode: request.outputMode === 'both' ? 'sql' : request.outputMode,
  requestedEngine:
    request.outputMode === 'both'
      ? request.requestedEngine || 'postgresql'
      : request.requestedEngine,
});

const getDefaultDomainBrief = (request) => ({
  domain: 'general application backend',
  summary: request.prompt,
  recommended_scope: 'mvp',
  sql_entities: [],
  nosql_entities: [],
  relationship_hints: [],
  field_hints: [],
});

const generateDomainBrief = async ({ request, memoryContexts }) => {
  const planningPrompt = buildDomainBriefPrompt({
    userPrompt: request.prompt,
    sourceData: request.sourceData,
    outputMode: request.outputMode,
    requestedEngine: request.requestedEngine,
    memoryContexts,
  });

  try {
    const planningResult = await callPlanningModel({
      prompt: planningPrompt,
      payload: request,
    });

    return parseJsonObject(planningResult.response);
  } catch (error) {
    return getDefaultDomainBrief(request);
  }
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

const generateSchema = async (payload = {}) => {
  const request = normalizeSchemaRequest(payload);
  const memoryContexts = await getRelevantSchemaMemories({
    prompt: request.prompt,
    sourceData: request.sourceData,
  });
  const domainBrief = await generateDomainBrief({
    request,
    memoryContexts,
  });

  const buildPrompt = ({ activeRequest, compactMode = false }) =>
    buildSchemaGenerationPrompt({
      userPrompt: activeRequest.prompt,
      sourceData: activeRequest.sourceData,
      outputMode: activeRequest.outputMode,
      requestedEngine: activeRequest.requestedEngine,
      memoryContexts,
      domainBrief,
      compactMode,
    });

  let activeRequest = request;
  let compactFallbackUsed = false;
  let llmResult = await callSchemaModel({
    prompt: buildPrompt({ activeRequest }),
    payload: activeRequest,
  });

  let { schema, validation, parseError } = validateModelResponse(llmResult);
  let repairAttempt = 0;

  if (parseError && llmResult.meta?.stopReason === 'max_tokens') {
    compactFallbackUsed = true;
    activeRequest = buildCompactSchemaFallback(request);
    llmResult = await callSchemaModel({
      prompt: buildPrompt({
        activeRequest,
        compactMode: true,
      }),
      payload: activeRequest,
    });

    ({ schema, validation, parseError } = validateModelResponse(llmResult));
  }

  while ((!validation.valid || parseError) && repairAttempt < MAX_REPAIR_ATTEMPTS) {
    repairAttempt += 1;

    llmResult = await callSchemaModel({
      prompt: buildSchemaRepairPrompt({
        originalPrompt: request.prompt,
        invalidResponse: llmResult.response,
        validationErrors: validation.errors,
      }),
      payload: activeRequest,
    });

    ({ schema, validation, parseError } = validateModelResponse(llmResult));
  }

  if (parseError) {
    const stopReason = llmResult.meta?.stopReason;
    const stopReasonMessage =
      stopReason === 'max_tokens'
        ? ` Anthropic stopped because it hit max_tokens (${activeRequest.maxTokens}). The service retried with a compact schema prompt but still could not finish.`
        : '';

    throw new Error(
      `Schema generation returned malformed JSON after retries: ${parseError.message}.${stopReasonMessage}`
    );
  }

  if (!validation.valid) {
    throw new Error(`Generated schema is invalid: ${validation.errors.join(' ')}`);
  }

  const enhancedSchema = enhanceSchemaRelationships(schema);
  const enhancedValidation = validateSchemaShape(enhancedSchema);

  if (!enhancedValidation.valid) {
    throw new Error(`Generated schema is invalid: ${enhancedValidation.errors.join(' ')}`);
  }

  storeGeneratedSchemaMemory({
    prompt: request.prompt,
    sourceData: request.sourceData,
    schema: enhancedSchema,
    meta: {
      title: request.prompt,
    },
  });

  return {
    success: true,
    message: 'Schema generated successfully.',
    schema: enhancedSchema,
    preview: buildSchemaPreview(enhancedSchema),
    sql: request.includeSql ? convertSchemaToSql(enhancedSchema) : null,
    prompt: request.prompt,
    sourceData: request.sourceData,
    meta: {
      provider: llmResult.provider,
      model: llmResult.model,
      outputMode: request.outputMode,
      finalOutputMode: activeRequest.outputMode,
      requestedEngine: activeRequest.requestedEngine,
      maxTokens: request.maxTokens,
      memoryHits: memoryContexts.length,
      retrieverStrategy: getRetrieverStrategy(),
      compactFallbackUsed,
      plannedDomain: domainBrief.domain || null,
      repaired: repairAttempt > 0,
      durationMs: llmResult.meta?.durationMs || null,
      stopReason: llmResult.meta?.stopReason || null,
    },
  };
};

module.exports = {
  generateSchema,
};
