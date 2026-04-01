const { generateSchema } = require('../services/schemaGeneratorService');
const { augmentSchema } = require('../services/schemaAugmentService');
const { editSchema } = require('../services/schemaEditService');
const { convertSchemaToOpenApi } = require('../services/schemaOpenApiService');
const yaml = require('js-yaml');
const { getRandomSchemaExample, getMemoryStatus } = require('../services/schemaMemoryService');
const { evaluateSchemaMatch, detectIrrelevantEntities } = require('../services/schemaMatchScoringService');
const { runDecisionEngine } = require('../services/schemaAiDecisionEngine');
const { buildTreeFromSchema, formatRootLabel } = require('../services/schemaTreeService');
const { parseEditContext } = require('../services/schemaEditProtectionService');
const { parsePrompt } = require('../services/promptParserService');

const createSchema = async (request, response, next) => {
  try {
    const result = await generateSchema(request.body);
    response.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

const augmentSchemaHandler = async (request, response, next) => {
  try {
    const { existingSchema, instruction, mode } = request.body;
    const result = await augmentSchema({ existingSchema, instruction, mode });
    response.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

const editSchemaHandler = async (request, response, next) => {
  try {
    const { existingSchema, instruction, provider, model } = request.body;
    const result = await editSchema({ existingSchema, instruction, provider, model });
    response.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

const openApiHandler = (request, response, next) => {
  try {
    const { schema, title, version, description, serverUrl, sourceArch, format } = request.body;
    if (!schema) {
      return response.status(400).json({ success: false, error: { message: 'schema is required.' } });
    }
    const doc = convertSchemaToOpenApi(schema, { title, version, description, serverUrl, sourceArch });

    const wantsYaml = String(format || '').toLowerCase() === 'yaml';
    if (wantsYaml) {
      const yamlText = yaml.dump(doc, { lineWidth: 120, noRefs: true, quotingType: '"' });
      return response.status(200).json({ success: true, openapi: doc, yamlText });
    }

    response.status(200).json({ success: true, openapi: doc });
  } catch (error) {
    next(error);
  }
};

const getSchemaExample = (_request, response, next) => {
  try {
    const example = getRandomSchemaExample();
    response.status(200).json({ success: true, example });
  } catch (error) {
    next(error);
  }
};

const getSchemaMemoryStatus = async (_request, response, next) => {
  try {
    const status = await getMemoryStatus();
    response.status(200).json({ success: true, memory: status });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/schema/evaluate
 *
 * Runs the AI decision engine explicitly on an existing schema.
 * Useful for the frontend to trigger a REFINE/RECONSTRUCT pass
 * on a schema the user has already been working with.
 *
 * Request body:
 *   {
 *     prompt:           string  (required) — original generation prompt
 *     schema:           object  (required) — current schema to evaluate
 *     retrievedSchemas: array   (optional) — memory schemas for structural scoring
 *     editContext:      object  (optional) — manual edit context
 *     provider:         string  (optional) — LLM provider
 *     model:            string  (optional)
 *     maxTokens:        number  (optional)
 *     outputMode:       string  (optional) 'sql' | 'nosql' | 'both'
 *   }
 *
 * Response: full decision engine output
 *   { decision, schema, tree, ui_hints, confidence, reasoning_summary, scores, meta }
 */
const evaluateSchemaHandler = async (request, response, next) => {
  try {
    const {
      prompt,
      schema,
      retrievedSchemas = [],
      editContext = null,
      provider,
      model,
      maxTokens,
      outputMode = 'both',
    } = request.body;

    if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
      return response.status(400).json({
        success: false,
        error: { message: 'prompt is required.' },
      });
    }

    if (!schema || !Array.isArray(schema.architectures)) {
      return response.status(400).json({
        success: false,
        error: { message: 'schema with architectures array is required.' },
      });
    }

    // Score the provided schema
    const scores = evaluateSchemaMatch(prompt, retrievedSchemas, schema);
    const irrelevantCheck = detectIrrelevantEntities(prompt, schema);

    // Always run the decision engine on this endpoint (it's an explicit evaluation request)
    const result = await runDecisionEngine({
      prompt,
      existingSchema: schema,
      retrievedSchemas,
      scores,
      editContext,
      provider,
      model,
      maxTokens,
      outputMode,
    });

    // Build tree for the original schema too (for comparison)
    const originalTree = buildTreeFromSchema(schema, formatRootLabel(parsePrompt(prompt).domain || prompt));
    const parsedEdit = parseEditContext(editContext);

    response.status(200).json({
      success: true,
      decision: result.decision,
      schema: result.schema,
      tree: result.tree,
      ui_hints: result.ui_hints,
      confidence: result.confidence,
      reasoning_summary: result.reasoning_summary,
      scores,
      irrelevant_entities: irrelevantCheck.irrelevantEntities,
      original_tree: originalTree,
      ai_invoked: result.meta.ai_used,
      manual_nodes_preserved: [...parsedEdit.protectedNodes],
      meta: result.meta,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createSchema,
  augmentSchemaHandler,
  editSchemaHandler,
  openApiHandler,
  getSchemaExample,
  getSchemaMemoryStatus,
  evaluateSchemaHandler,
};
