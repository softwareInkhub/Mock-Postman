/**
 * Schema AI Decision Engine
 *
 * This is the GATEKEEPER for AI involvement. It is only invoked when:
 *   A) overall_score < SCORE_THRESHOLD  (schema is a poor match for the prompt)
 *   B) schema contains entities flagged as irrelevant to the domain
 *
 * Decisions:
 *   REFINE      — schema structure is mostly correct; enhance/complete missing parts
 *   RECONSTRUCT — schema is fundamentally wrong; rebuild from scratch
 *
 * Priority rule:
 *   User manual edits are ALWAYS preserved. AI may only add or improve — never remove.
 *
 * Output contract (matches system prompt specification):
 *   {
 *     decision:          "REFINE" | "RECONSTRUCT",
 *     schema:            { architectures: [...] },
 *     tree:              { root, nodes },
 *     ui_hints:          { root_node, primary_entities, suggested_connections },
 *     confidence:        0.0 – 1.0,
 *     reasoning_summary: string (≤ 80 words)
 *   }
 */

const { generateText } = require('./llmService');
const { buildSchemaEnhancementPrompt, buildSchemaRepairPrompt } = require('../prompts/schemaPrompts');
const { validateSchemaShape } = require('./schemaValidationService');
const { enhanceSchemaRelationships } = require('./schemaEnhancerService');
const { buildTreeFromSchema, getRootNodes, getTreeEdges, formatRootLabel } = require('./schemaTreeService');
const {
  evaluateSchemaMatch,
  detectIrrelevantEntities,
  SCORE_THRESHOLD,
} = require('./schemaMatchScoringService');
const { buildSchema } = require('./schemaBuilderService');
const { parsePrompt } = require('./promptParserService');

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

// Below this, always RECONSTRUCT (schema is fundamentally off)
const RECONSTRUCT_THRESHOLD = 0.35;
const MAX_REPAIR_ATTEMPTS = 2;
const stringify = (v) => JSON.stringify(v, null, 2);

// ---------------------------------------------------------------------------
// Decision logic
// ---------------------------------------------------------------------------

/**
 * Determines REFINE vs RECONSTRUCT based on scores and irrelevant entity detection.
 *
 * Rules:
 *   overall < 0.35                        → RECONSTRUCT (fundamentally wrong)
 *   hasIrrelevant && overall < threshold  → RECONSTRUCT (wrong domain entities)
 *   overall < threshold (but >= 0.35)     → REFINE (structure salvageable)
 *   semantic is very low despite ok overall → REFINE (entities need a pass)
 */
const determineDecision = (scores, irrelevantCheck) => {
  if (scores.overall_score < RECONSTRUCT_THRESHOLD) {
    return {
      decision: 'RECONSTRUCT',
      reason: `Overall score ${scores.overall_score} is below hard floor (${RECONSTRUCT_THRESHOLD}). Schema is fundamentally misaligned.`,
    };
  }

  if (irrelevantCheck.hasIrrelevant && scores.overall_score < SCORE_THRESHOLD) {
    return {
      decision: 'RECONSTRUCT',
      reason: `Schema contains irrelevant entities (${irrelevantCheck.irrelevantEntities.join(', ')}) and score is below threshold.`,
    };
  }

  return {
    decision: 'REFINE',
    reason: `Score ${scores.overall_score} is below threshold (${SCORE_THRESHOLD}) but structure is salvageable. Enhancing missing parts.`,
  };
};

// ---------------------------------------------------------------------------
// Prompt builders for the AI decision engine
// ---------------------------------------------------------------------------

const buildRefinePrompt = ({ prompt, existingSchema, scores, manualNodes, memoryContexts }) => {
  const manualSection =
    manualNodes.length > 0
      ? `\nUser has manually defined these entities — DO NOT remove or rename them:\n${manualNodes.join(', ')}\n`
      : '';

  return `
You are a senior backend architect refining a database schema that scored poorly on relevance.

User prompt: "${prompt}"

Match scores:
- Semantic score:       ${scores.semantic_score} (how well entity names match the prompt)
- Structural score:     ${scores.structural_score} (similarity to known schemas)
- Relationship density: ${scores.relationship_density} (FK/ref field ratio)
- Overall score:        ${scores.overall_score} (threshold is ${SCORE_THRESHOLD})
${manualSection}
Current schema to refine:
${stringify(existingSchema)}

Your job — REFINE ONLY:
- Keep all existing tables and collections
- Fix or add entity names that better match the prompt domain
- Add missing MVP entities that are clearly needed
- Improve relationship coverage (foreign keys, refs)
- Improve field types and descriptions where incorrect
- Do NOT add analytics, audit, admin tables unless explicitly requested
- Do NOT remove any manually defined entities listed above
- Output ONLY valid JSON in the exact same { architectures: [...] } contract shape
- No markdown fences, no explanation text
`.trim();
};

const buildReconstructPrompt = ({ prompt, scores, manualNodes, memoryContexts, outputMode }) => {
  const manualSection =
    manualNodes.length > 0
      ? `\nUser has manually defined these entities — you MUST include them in the reconstruction:\n${manualNodes.join(', ')}\n`
      : '';

  const dbInstruction =
    outputMode === 'sql'
      ? 'Generate one SQL architecture only.'
      : outputMode === 'nosql'
        ? 'Generate one NoSQL architecture only.'
        : 'Generate both one SQL architecture and one NoSQL architecture.';

  return `
You are a senior backend architect rebuilding a database schema from scratch.

The previous schema was fundamentally wrong for this request (overall score: ${scores.overall_score}).

User prompt: "${prompt}"
${manualSection}
Requirements:
- ${dbInstruction}
- Build the correct MVP schema for the domain described in the prompt
- Include the most important entities and their relationships
- Use snake_case names, realistic field types, foreign keys for SQL
- Every SQL table must have an "id" uuid primary key
- Every NoSQL collection must have a "_id" objectId field
- Include 4–8 tables/collections for MVP scope
- No analytics, audit, admin, or notification tables unless the prompt requires them
- If manually defined entities are listed above, include all of them
- Output ONLY valid JSON in this exact contract:
{
  "architectures": [
    {
      "database_type": "sql",
      "database_engine": "postgresql",
      "use_case": "...",
      "tables": [{ "name": "...", "description": "...", "columns": [...] }]
    },
    {
      "database_type": "nosql",
      "database_engine": "mongodb",
      "use_case": "...",
      "collections": [{ "name": "...", "description": "...", "document_shape": [...] }]
    }
  ]
}
- No markdown fences, no explanation text
`.trim();
};

// ---------------------------------------------------------------------------
// LLM call with repair loop
// ---------------------------------------------------------------------------

const callLlmWithRepair = async ({ prompt: llmPrompt, provider, model, maxTokens, timeout, options }) => {
  if (!provider) return null;

  const callArgs = { provider, model, maxTokens: maxTokens || 4096, timeout, options };

  const parseResponse = (raw) => {
    const text = String(raw || '').trim();
    try {
      return JSON.parse(text);
    } catch {
      const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
      if (fenced) return JSON.parse(fenced[1].trim());
      const first = text.indexOf('{');
      const last = text.lastIndexOf('}');
      if (first !== -1 && last > first) return JSON.parse(text.slice(first, last + 1));
      throw new Error('Could not parse LLM response as JSON');
    }
  };

  let result = await generateText({ ...callArgs, prompt: llmPrompt });
  if (!result.success) return null;

  let parsed = null;
  let validation = { valid: false, errors: [] };

  try {
    parsed = parseResponse(result.response);
    validation = validateSchemaShape(parsed);
  } catch {
    validation = { valid: false, errors: ['JSON parse failed'] };
  }

  let repairAttempts = 0;
  while (!validation.valid && repairAttempts < MAX_REPAIR_ATTEMPTS) {
    repairAttempts++;
    const repairPrompt = buildSchemaRepairPrompt({
      originalPrompt: llmPrompt,
      invalidResponse: result.response,
      validationErrors: validation.errors,
    });
    result = await generateText({ ...callArgs, prompt: repairPrompt });
    if (!result.success) break;
    try {
      parsed = parseResponse(result.response);
      validation = validateSchemaShape(parsed);
    } catch {
      validation = { valid: false, errors: ['JSON parse failed on repair'] };
    }
  }

  if (!validation.valid || !parsed) return null;
  return parsed;
};

// ---------------------------------------------------------------------------
// UI hints builder
// ---------------------------------------------------------------------------

const buildUiHints = (schema, tree) => {
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

// ---------------------------------------------------------------------------
// Confidence estimator
// ---------------------------------------------------------------------------

/**
 * Maps the post-AI overall score to a confidence value.
 * If AI was unavailable, confidence is derived from the fallback schema scores.
 */
const estimateConfidence = (scores, decision, aiWasUsed) => {
  const base = scores.overall_score;
  // RECONSTRUCT from scratch gets a slight confidence bonus (clean slate)
  const decisionBonus = decision === 'RECONSTRUCT' ? 0.05 : 0;
  // If AI was not used, cap confidence at 0.70 (deterministic fallback)
  const aiPenalty = aiWasUsed ? 0 : -0.10;
  return Math.min(1, Math.max(0, base + decisionBonus + aiPenalty));
};

// ---------------------------------------------------------------------------
// Reasoning summary builder (≤ 80 words)
// ---------------------------------------------------------------------------

const buildReasoningSummary = ({ decision, scores, irrelevantEntities, prompt, aiUsed }) => {
  const action = decision === 'RECONSTRUCT'
    ? 'Rebuilt schema from scratch'
    : 'Refined existing schema';

  const scoreNote = `(semantic: ${scores.semantic_score}, structural: ${scores.structural_score}, density: ${scores.relationship_density}, overall: ${scores.overall_score})`;

  const irrelevantNote = irrelevantEntities.length > 0
    ? ` Found irrelevant entities: ${irrelevantEntities.slice(0, 3).join(', ')}.`
    : '';

  const aiNote = aiUsed ? ' AI enhancement applied.' : ' Deterministic fallback used (AI unavailable).';

  return `${action} for prompt: "${prompt.slice(0, 40)}${prompt.length > 40 ? '...' : ''}". Scores ${scoreNote}.${irrelevantNote}${aiNote}`.slice(0, 500);
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Determines whether AI intervention is needed.
 *
 * @param {object} scores - Result from evaluateSchemaMatch()
 * @param {object} irrelevantCheck - Result from detectIrrelevantEntities()
 * @returns {boolean}
 */
const shouldInvokeAI = (scores, irrelevantCheck) => {
  return !scores.passes_threshold || irrelevantCheck.hasIrrelevant;
};

/**
 * Core decision engine. Invoked only when shouldInvokeAI() returns true.
 *
 * @param {object} params
 * @param {string}  params.prompt           - Original user prompt
 * @param {object}  params.existingSchema   - Current deterministic schema
 * @param {Array}   params.retrievedSchemas - Retrieved memory schemas
 * @param {object}  params.scores           - From evaluateSchemaMatch()
 * @param {object}  [params.editContext]    - Manual edit context (optional)
 * @param {string}  [params.provider]       - LLM provider (optional)
 * @param {string}  [params.model]          - LLM model (optional)
 * @param {number}  [params.maxTokens]      - Max tokens for LLM (optional)
 * @param {string}  [params.outputMode]     - 'sql' | 'nosql' | 'both'
 *
 * @returns {Promise<{
 *   decision: string,
 *   schema: object,
 *   tree: object,
 *   ui_hints: object,
 *   confidence: number,
 *   reasoning_summary: string,
 *   meta: object
 * }>}
 */
const runDecisionEngine = async ({
  prompt,
  existingSchema,
  retrievedSchemas = [],
  scores,
  editContext = null,
  provider = null,
  model = null,
  maxTokens = 4096,
  timeout = null,
  options = null,
  outputMode = 'both',
}) => {
  // 1. Detect irrelevant entities
  const irrelevantCheck = detectIrrelevantEntities(prompt, existingSchema);

  // 2. Decide REFINE vs RECONSTRUCT
  const { decision, reason } = determineDecision(scores, irrelevantCheck);

  // 3. Extract manually defined nodes from edit context (must never be removed)
  const manualNodes = [];
  if (editContext) {
    if (Array.isArray(editContext.manualNodes)) manualNodes.push(...editContext.manualNodes);
    if (Array.isArray(editContext.addedNodes)) manualNodes.push(...editContext.addedNodes);
  }

  // 4. Attempt AI improvement (if provider configured)
  let finalSchema = existingSchema;
  let aiUsed = false;

  if (provider) {
    let llmPrompt;

    if (decision === 'REFINE') {
      llmPrompt = buildRefinePrompt({
        prompt,
        existingSchema,
        scores,
        manualNodes,
        memoryContexts: retrievedSchemas,
      });
    } else {
      llmPrompt = buildReconstructPrompt({
        prompt,
        scores,
        manualNodes,
        memoryContexts: retrievedSchemas,
        outputMode,
      });
    }

    let aiSchema = await callLlmWithRepair({
      prompt: llmPrompt,
      provider,
      model,
      maxTokens,
      timeout,
      options,
    });

    if (aiSchema) {
      // Ensure manually-defined nodes survived
      if (manualNodes.length > 0) {
        aiSchema = mergeManualNodes(aiSchema, existingSchema, manualNodes);
      }
      finalSchema = enhanceSchemaRelationships(aiSchema);
      aiUsed = true;
    }
    // If AI failed, silently keep existing schema (failsafe)
  }

  // 5. Re-score the final schema
  const finalScores = evaluateSchemaMatch(prompt, retrievedSchemas, finalSchema);

  // 6. Build tree
  const parsedPrompt = parsePrompt(prompt);
  const tree = buildTreeFromSchema(finalSchema, formatRootLabel(parsedPrompt.domain || prompt));

  // 7. Build UI hints
  const ui_hints = buildUiHints(finalSchema, tree);

  // 8. Estimate confidence
  const confidence = parseFloat(estimateConfidence(finalScores, decision, aiUsed).toFixed(3));

  // 9. Reasoning summary
  const reasoning_summary = buildReasoningSummary({
    decision,
    scores: finalScores,
    irrelevantEntities: irrelevantCheck.irrelevantEntities,
    prompt,
    aiUsed,
  });

  return {
    decision,
    schema: finalSchema,
    tree,
    ui_hints,
    confidence,
    reasoning_summary,
    meta: {
      triggered_by: reason,
      ai_used: aiUsed,
      provider: aiUsed ? provider : null,
      model: aiUsed ? model : null,
      manual_nodes_preserved: manualNodes,
      irrelevant_entities_detected: irrelevantCheck.irrelevantEntities,
      pre_ai_scores: scores,
      post_ai_scores: finalScores,
    },
  };
};

// ---------------------------------------------------------------------------
// Manual node preservation helper
// ---------------------------------------------------------------------------

/**
 * Ensures that manually-defined entities from the original schema
 * are present in the AI-generated schema. If any are missing, they
 * are copied from the original schema.
 */
const mergeManualNodes = (aiSchema, originalSchema, manualNodeNames) => {
  const manualSet = new Set(manualNodeNames.map((n) => String(n).toLowerCase()));
  const result = JSON.parse(JSON.stringify(aiSchema));

  for (const arch of originalSchema?.architectures || []) {
    const dbType = String(arch.database_type || '').toLowerCase();

    if (dbType === 'sql') {
      const targetArch = result.architectures.find((a) => a.database_type === 'sql');
      if (!targetArch) continue;

      const existingNames = new Set((targetArch.tables || []).map((t) => t.name.toLowerCase()));
      for (const table of arch.tables || []) {
        if (manualSet.has(table.name.toLowerCase()) && !existingNames.has(table.name.toLowerCase())) {
          targetArch.tables.push(JSON.parse(JSON.stringify(table)));
        }
      }
    }

    if (dbType === 'nosql') {
      const targetArch = result.architectures.find((a) => a.database_type === 'nosql');
      if (!targetArch) continue;

      const existingNames = new Set((targetArch.collections || []).map((c) => c.name.toLowerCase()));
      for (const col of arch.collections || []) {
        if (manualSet.has(col.name.toLowerCase()) && !existingNames.has(col.name.toLowerCase())) {
          targetArch.collections.push(JSON.parse(JSON.stringify(col)));
        }
      }
    }
  }

  return result;
};

module.exports = {
  shouldInvokeAI,
  runDecisionEngine,
  mergeManualNodes,
  determineDecision,
  RECONSTRUCT_THRESHOLD,
};
