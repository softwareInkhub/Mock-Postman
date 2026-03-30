const { generateText } = require('./llmService');

const parseJsonObject = (rawText) => {
  const text = String(rawText || '').trim();
  if (!text) {
    throw new Error('The model returned an empty response.');
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

    throw error;
  }
};

const summarizeSchema = (schema) => {
  if (!schema?.architectures) return 'No schema available.';

  return schema.architectures
    .map((architecture) => {
      if (architecture.database_type === 'sql') {
        return [
          '[SQL]',
          ...(architecture.tables || []).map((table) =>
            `- ${table.name}: ${(table.columns || []).map((column) => `${column.name}:${column.type}`).join(', ')}`
          ),
        ].join('\n');
      }

      return [
        '[NoSQL]',
        ...(architecture.collections || []).map((collection) =>
          `- ${collection.name}: ${(collection.document_shape || []).map((field) => `${field.name}:${field.type}`).join(', ')}`
        ),
      ].join('\n');
    })
    .join('\n\n');
};

const normalizeOperation = (operation = {}) => ({
  type: typeof operation.type === 'string' ? operation.type.trim() : '',
  table: typeof operation.table === 'string' ? operation.table.trim() : undefined,
  fromTable: typeof operation.fromTable === 'string' ? operation.fromTable.trim() : undefined,
  toTable: typeof operation.toTable === 'string' ? operation.toTable.trim() : undefined,
  field: typeof operation.field === 'string' ? operation.field.trim() : undefined,
  newName: typeof operation.newName === 'string' ? operation.newName.trim() : undefined,
  newType: typeof operation.newType === 'string' ? operation.newType.trim() : undefined,
  description: typeof operation.description === 'string' ? operation.description.trim() : undefined,
  required: typeof operation.required === 'boolean' ? operation.required : undefined,
  foreignKey: typeof operation.foreignKey === 'string' ? operation.foreignKey.trim() : undefined,
  references: typeof operation.references === 'string' ? operation.references.trim() : undefined,
  sourceTable: typeof operation.sourceTable === 'string' ? operation.sourceTable.trim() : undefined,
  targetTable: typeof operation.targetTable === 'string' ? operation.targetTable.trim() : undefined,
  relationshipField: typeof operation.relationshipField === 'string' ? operation.relationshipField.trim() : undefined,
  fields: Array.isArray(operation.fields) ? operation.fields : undefined,
  note: typeof operation.note === 'string' ? operation.note.trim() : undefined,
});

const validateOperation = (operation, mode) => {
  const allowedByMode = {
    edit: new Set(['add_table', 'remove_table', 'rename_table', 'add_field', 'remove_field', 'rename_field', 'update_field', 'connect_tables', 'read_table', 'read_field']),
    tables: new Set(['add_table', 'remove_table', 'rename_table', 'connect_tables', 'read_table']),
    fields: new Set(['add_field', 'remove_field', 'rename_field', 'update_field', 'read_field']),
  };

  if (!allowedByMode[mode]?.has(operation.type)) {
    return false;
  }

  return true;
};

const buildPrompt = ({ existingSchema, instruction, mode }) => {
  const scopeText =
    mode === 'tables'
      ? 'You may only produce table or collection operations.'
      : mode === 'fields'
        ? 'You may only produce field or column operations.'
        : 'You may produce table and field operations.';

  return `You convert natural-language schema editing instructions into structured operations.

Current schema summary:
${summarizeSchema(existingSchema)}

User instruction:
"${instruction}"

Rules:
- ${scopeText}
- Understand casual English, product language, and compound instructions.
- Infer the exact intended action from the current schema.
- Use snake_case names in the operations.
- If the user says connect/link one table to another, use type "connect_tables".
- If the user wants a rename, use rename_table or rename_field.
- If the user wants a type/required/description/key change, use update_field.
- If the user asks to inspect/show/explain an existing table or field, use read_table or read_field.
- Return only valid JSON.

Allowed operation shapes:
{
  "operations": [
    { "type": "add_table", "table": "vendors" },
    { "type": "remove_table", "table": "delivery_partners" },
    { "type": "rename_table", "table": "users", "newName": "customers" },
    { "type": "add_field", "table": "orders", "field": "coupon_code", "newType": "varchar", "required": false },
    { "type": "remove_field", "table": "users", "field": "phone" },
    { "type": "rename_field", "table": "profiles", "field": "dob", "newName": "birth_date" },
    { "type": "update_field", "table": "orders", "field": "total_amount", "newType": "decimal", "required": true, "description": "Total payable amount for the order." },
    { "type": "connect_tables", "sourceTable": "zodiacs", "targetTable": "users", "relationshipField": "user_id" },
    { "type": "connect_tables", "sourceTable": "zodiacs", "targetTable": "profiles", "relationshipField": "profile_id" },
    { "type": "read_table", "table": "users", "note": "User wants to inspect this table." },
    { "type": "read_field", "table": "orders", "field": "status", "note": "User wants details about this field." }
  ]
}

Return JSON only.`;
};

const buildReviewPrompt = ({ existingSchema, instruction, mode, deterministicOperations }) => {
  const scopeText =
    mode === 'tables'
      ? 'Only table or collection operations are allowed.'
      : mode === 'fields'
        ? 'Only field or column operations are allowed.'
        : 'Table and field operations are allowed.';

  return `You are validating whether a deterministic schema edit parser correctly understood a user request.

Current schema summary:
${summarizeSchema(existingSchema)}

Original user instruction:
"${instruction}"

Deterministic parser output:
${JSON.stringify(deterministicOperations, null, 2)}

Rules:
- The user may write in any human language. Understand the user's meaning before judging.
- ${scopeText}
- Compare the original instruction against the deterministic parser output.
- If the deterministic parser is correct, approve it.
- If it is incomplete, wrong, or misses the user's meaning, correct it.
- Keep operation names in snake_case.
- Return JSON only.

Return shape:
{
  "approved": true,
  "reason": "Short explanation.",
  "normalizedInstruction": "English summary of what the user wants.",
  "operations": [
    { "type": "update_field", "table": "messages", "field": "body", "required": true }
  ]
}`;
};

const interpretSchemaInstruction = async ({ existingSchema, instruction, mode = 'edit', provider, model }) => {
  const llmResult = await generateText({
    provider,
    model,
    maxTokens: 1400,
    system: 'You are a precise schema instruction compiler. Return JSON only.',
    prompt: buildPrompt({ existingSchema, instruction, mode }),
  });

  if (!llmResult.success) {
    throw new Error(llmResult.error?.message || 'Schema instruction interpretation failed.');
  }

  const parsed = parseJsonObject(llmResult.response);
  const operations = Array.isArray(parsed.operations)
    ? parsed.operations.map(normalizeOperation).filter((operation) => validateOperation(operation, mode))
    : [];

  if (!operations.length) {
    throw new Error('The model did not return any valid schema operations.');
  }

  return {
    operations,
    raw: parsed,
    llmMeta: llmResult.meta || null,
  };
};

const reviewDeterministicSchemaInterpretation = async ({
  existingSchema,
  instruction,
  deterministicOperations,
  mode = 'edit',
  provider,
  model,
}) => {
  const llmResult = await generateText({
    provider,
    model,
    maxTokens: 1800,
    system:
      'You validate schema-edit intent across languages. Compare the user request with the proposed operations and return JSON only.',
    prompt: buildReviewPrompt({ existingSchema, instruction, mode, deterministicOperations }),
  });

  if (!llmResult.success) {
    throw new Error(llmResult.error?.message || 'Schema interpretation review failed.');
  }

  const parsed = parseJsonObject(llmResult.response);
  const operations = Array.isArray(parsed.operations)
    ? parsed.operations.map(normalizeOperation).filter((operation) => validateOperation(operation, mode))
    : [];

  return {
    approved: parsed.approved !== false,
    reason: typeof parsed.reason === 'string' ? parsed.reason.trim() : '',
    normalizedInstruction:
      typeof parsed.normalizedInstruction === 'string'
        ? parsed.normalizedInstruction.trim()
        : '',
    operations: operations.length ? operations : deterministicOperations,
    raw: parsed,
    llmMeta: llmResult.meta || null,
  };
};

module.exports = {
  interpretSchemaInstruction,
  reviewDeterministicSchemaInterpretation,
};
