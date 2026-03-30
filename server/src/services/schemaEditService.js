const { validateSchemaShape } = require('./schemaValidationService');
const { buildSchemaPreview } = require('./schemaPreviewService');
const { convertSchemaToSql } = require('./schemaSqlService');
const { enhanceSchemaRelationships } = require('./schemaEnhancerService');
const { applySchemaOperations } = require('./schemaActionExecutorService');
const { planSchemaActions } = require('./schemaActionPlannerService');
const { reviewDeterministicSchemaInterpretation } = require('./schemaActionInterpreterService');
const { storeGeneratedSchemaMemory } = require('./schemaMemoryService');
const {
  enrichSchemaConstraints,
  validateSchemaWithAjv,
  buildValidationReport,
} = require('./schemaConstraintEnricherService');

const editSchema = async ({ existingSchema, instruction, provider, model }) => {
  if (!existingSchema || !instruction) {
    throw new Error('existingSchema and instruction are required.');
  }

  const deterministicOperations = planSchemaActions({
    existingSchema,
    instruction,
    mode: 'edit',
  });

  let operations = deterministicOperations;
  let review = {
    used: false,
    approved: true,
    reason: 'Deterministic interpretation used without Claude review.',
    normalizedInstruction: instruction,
    source: 'deterministic_schema_planner',
    llmMeta: null,
  };

  try {
    const reviewed = await reviewDeterministicSchemaInterpretation({
      existingSchema,
      instruction,
      deterministicOperations,
      mode: 'edit',
      provider,
      model,
    });

    operations = reviewed.operations;
    review = {
      used: true,
      approved: reviewed.approved,
      reason: reviewed.reason || (reviewed.approved
        ? 'Claude approved the deterministic interpretation.'
        : 'Claude corrected the deterministic interpretation before execution.'),
      normalizedInstruction: reviewed.normalizedInstruction || instruction,
      source: reviewed.approved ? 'claude_validated_deterministic_plan' : 'claude_corrected_plan',
      llmMeta: reviewed.llmMeta,
    };
  } catch (error) {
    review = {
      ...review,
      fallbackReason: error.message,
    };
  }

  const { schema, labels } = applySchemaOperations({ existingSchema, operations });
  const relationshipSchema = enhanceSchemaRelationships(schema);
  const validation = validateSchemaShape(relationshipSchema);
  if (!validation.valid) {
    throw new Error('Schema is invalid after edit: ' + validation.errors.join(' '));
  }

  const enhanced = enrichSchemaConstraints(relationshipSchema);
  const ajvReport = validateSchemaWithAjv(enhanced);
  const validationReport = buildValidationReport(enhanced);

  storeGeneratedSchemaMemory({
    prompt: `Schema edit: ${instruction}`,
    sourceData: {
      editInstruction: instruction,
      operations,
      review: {
        used: review.used,
        approved: review.approved,
        source: review.source,
      },
    },
    schema: enhanced,
    meta: {
      title: review.normalizedInstruction || instruction,
      tags: ['schema_edit', 'edit_flow'],
    },
  });

  return {
    success: true,
    message: 'Schema edited successfully. ' + labels.join(' | '),
    schema: enhanced,
    preview: buildSchemaPreview(enhanced),
    sql: convertSchemaToSql(enhanced),
    validation: {
      ajv: ajvReport,
      fieldReport: validationReport,
    },
    meta: {
      editOp: operations.length === 1 ? operations[0].type : 'compound',
      operations,
      instruction,
      normalizedInstruction: review.normalizedInstruction || instruction,
      interpretation: {
        source: review.source,
        deterministicOperations,
        claudeReviewUsed: review.used,
        claudeApprovedDeterministicInterpretation: review.approved,
        claudeReason: review.reason,
        fallbackReason: review.fallbackReason || null,
        provider: review.llmMeta?.provider || null,
        model: review.llmMeta?.model || null,
      },
    },
  };
};

module.exports = { editSchema };
