const OUTPUT_CONTRACT = {
  architectures: [
    {
      database_type: 'sql',
      database_engine: 'postgresql',
      use_case: 'Best when strong relationships and transactional consistency matter.',
      tables: [
        {
          name: 'users',
          description: 'Stores application users.',
          columns: [
            {
              name: 'id',
              type: 'uuid',
              primary: true,
              required: true,
              description: 'Primary key for the users table.',
            },
          ],
        },
      ],
    },
    {
      database_type: 'nosql',
      database_engine: 'mongodb',
      use_case: 'Best when flexible document structures are more important than joins.',
      collections: [
        {
          name: 'users',
          description: 'Stores user documents.',
          document_shape: [
            {
              name: '_id',
              type: 'objectId',
              required: true,
              description: 'Primary identifier for the document.',
            },
          ],
        },
      ],
    },
  ],
};

const stringify = (value) => JSON.stringify(value, null, 2);

const buildSchemaGenerationPrompt = ({
  userPrompt,
  sourceData,
  outputMode = 'auto',
  requestedEngine = null,
}) => {
  const sourceDataSection = sourceData
    ? `Use this sample JSON/API payload as additional context when inferring entities and relationships:\n${stringify(
        sourceData
      )}\n`
    : 'No source JSON was supplied. Infer the schema only from the user request.\n';

  const databaseModeInstructions =
    outputMode === 'both'
      ? 'Generate two architectures: one SQL design and one NoSQL design.'
      : outputMode === 'sql'
        ? `Generate one SQL architecture only.${requestedEngine ? ` Prefer the ${requestedEngine} engine.` : ''}`
        : outputMode === 'nosql'
          ? `Generate one NoSQL architecture only.${requestedEngine ? ` Prefer the ${requestedEngine} engine.` : ''}`
          : 'If the user clearly implies SQL or NoSQL, generate that one. If the request is broad or does not specify a database style, generate both one SQL architecture and one NoSQL architecture.';

  return `
You are a senior backend architect who designs SQL and NoSQL data models.

Goal:
Generate a production-minded relational schema for this request:
"${userPrompt}"

Requirements:
- Database selection rule: ${databaseModeInstructions}
- Output ONLY valid JSON
- Return the result inside an "architectures" array
- For SQL architectures, every table must contain an "id" primary key
- For SQL architectures, add foreign keys whenever tables are related
- For NoSQL architectures, use collections with a practical document shape
- For NoSQL architectures, embed subdocuments only when it makes sense for the use case
- Use snake_case table names and column names
- Prefer normalized tables for SQL instead of duplicating data
- Use realistic SQL-oriented column types such as uuid, varchar, text, integer, boolean, date, timestamp, decimal
- Use realistic NoSQL-oriented field types such as objectId, string, number, boolean, date, array, object
- Include required: true for fields that should be mandatory
- Add short descriptions for tables, collections, and fields
- If a many-to-many relationship exists in SQL, create a join table
- Focus on the core MVP schema only
- Limit the schema to 8 tables maximum unless the user explicitly asks for a larger design
- Keep each table practical and concise, usually 4 to 8 columns
- Do not include optional analytics, audit, notification, admin, feature-flag, logging, or reporting tables unless explicitly requested
- If the request is broad, choose the most essential entities and relationships instead of trying to cover every possible feature
- Do not include markdown fences

${sourceDataSection}
Return JSON in exactly this shape:
${stringify(OUTPUT_CONTRACT)}

Example of a foreign key column:
{
  "name": "user_id",
  "type": "uuid",
  "required": true,
  "foreign_key": "users.id",
  "description": "References the owning user."
}

Example of a NoSQL field:
{
  "name": "_id",
  "type": "objectId",
  "required": true,
  "description": "Primary identifier for the document."
}
`.trim();
};

const buildSchemaRepairPrompt = ({
  originalPrompt,
  invalidResponse,
  validationErrors,
}) => `
You previously attempted to generate a database schema JSON, but it failed validation.

Original user request:
"${originalPrompt}"

Validation errors:
${validationErrors.map((error, index) => `${index + 1}. ${error}`).join('\n')}

Invalid response:
${invalidResponse}

Rewrite the response so that it is valid JSON and matches the required schema contract exactly.
Output ONLY JSON.
`.trim();

module.exports = {
  OUTPUT_CONTRACT,
  buildSchemaGenerationPrompt,
  buildSchemaRepairPrompt,
};
