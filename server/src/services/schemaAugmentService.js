const { validateSchemaShape } = require('./schemaValidationService');
const { buildSchemaPreview } = require('./schemaPreviewService');
const { convertSchemaToSql } = require('./schemaSqlService');
const { enhanceSchemaRelationships } = require('./schemaEnhancerService');
const { applySchemaOperations } = require('./schemaActionExecutorService');
const { planSchemaActions } = require('./schemaActionPlannerService');

const augmentSchema = async ({ existingSchema, instruction, mode }) => {
  if (!existingSchema || !instruction) {
    throw new Error('existingSchema and instruction are required.');
  }
  if (mode !== 'tables' && mode !== 'fields') {
    throw new Error('mode must be "tables" or "fields".');
  }

  const operations = planSchemaActions({
    existingSchema,
    instruction,
    mode,
  });

  const { schema, labels } = applySchemaOperations({ existingSchema, operations });
  const enhanced = enhanceSchemaRelationships(schema);
  const validation = validateSchemaShape(enhanced);
  if (!validation.valid) {
    throw new Error('Schema update failed validation: ' + validation.errors.join(' '));
  }

  return {
    success: true,
    message: labels.join(' | '),
    schema: enhanced,
    preview: buildSchemaPreview(enhanced),
    sql: convertSchemaToSql(enhanced),
    meta: {
      augmentMode: mode,
      instruction,
      operations,
      interpretation: {
        source: 'deterministic_schema_planner',
      },
    },
  };
};

module.exports = { augmentSchema };
