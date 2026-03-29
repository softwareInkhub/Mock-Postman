const { validateSchemaShape } = require('./schemaValidationService');
const { buildSchemaPreview } = require('./schemaPreviewService');
const { convertSchemaToSql } = require('./schemaSqlService');
const { enhanceSchemaRelationships } = require('./schemaEnhancerService');
const { applySchemaOperations } = require('./schemaActionExecutorService');
const { planSchemaActions } = require('./schemaActionPlannerService');

const editSchema = async ({ existingSchema, instruction }) => {
  if (!existingSchema || !instruction) {
    throw new Error('existingSchema and instruction are required.');
  }

  const operations = planSchemaActions({
    existingSchema,
    instruction,
    mode: 'edit',
  });

  const { schema, labels } = applySchemaOperations({ existingSchema, operations });
  const enhanced = enhanceSchemaRelationships(schema);
  const validation = validateSchemaShape(enhanced);
  if (!validation.valid) {
    throw new Error('Schema is invalid after edit: ' + validation.errors.join(' '));
  }

  return {
    success: true,
    message: 'Schema edited successfully. ' + labels.join(' | '),
    schema: enhanced,
    preview: buildSchemaPreview(enhanced),
    sql: convertSchemaToSql(enhanced),
    meta: {
      editOp: operations.length === 1 ? operations[0].type : 'compound',
      operations,
      instruction,
      interpretation: {
        source: 'deterministic_schema_planner',
      },
    },
  };
};

module.exports = { editSchema };
