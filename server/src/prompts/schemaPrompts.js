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

const buildMemorySection = (memoryContexts = []) => {
  if (!Array.isArray(memoryContexts) || memoryContexts.length === 0) {
    return 'No prior relevant examples were retrieved.\n';
  }

  return `Relevant retrieved examples:\n${memoryContexts
    .map(
      (memory, index) => `Example ${index + 1} (${memory.type}, relevance ${memory.relevanceScore}):
- Title: ${memory.title}
- Prompt: ${memory.prompt}
- Tags: ${(memory.tags || []).join(', ') || 'none'}
- Domain Summary: ${memory.domainSummary || 'No stored domain summary'}
- Core Entities: ${(memory.coreEntities || []).join(', ') || 'none'}
- Relationships: ${(memory.relationshipHints || []).join(', ') || 'none'}
- Schema Summary: ${memory.schemaSummary || 'No stored schema summary yet'}`
    )
    .join('\n\n')}\n`;
};

const buildDomainBriefPrompt = ({
  userPrompt,
  sourceData,
  outputMode = 'auto',
  requestedEngine = null,
  memoryContexts = [],
}) => {
  const sourceDataSection = sourceData
    ? `Source JSON is available. Use it only to confirm likely entities and relationships:\n${stringify(
        sourceData
      )}\n`
    : 'No source JSON is available. Infer the backend domain only from the user prompt and retrieved examples.\n';

  const databaseModeInstructions =
    outputMode === 'both'
      ? 'Plan for both SQL and NoSQL output.'
      : outputMode === 'sql'
        ? `Plan for SQL output only.${requestedEngine ? ` Prefer ${requestedEngine}.` : ''}`
        : outputMode === 'nosql'
          ? `Plan for NoSQL output only.${requestedEngine ? ` Prefer ${requestedEngine}.` : ''}`
          : 'If the user clearly implies SQL or NoSQL, follow that. Otherwise plan for both.';

  return `
You are planning the smallest useful backend schema for an app idea.

User request:
"${userPrompt}"

Requirements:
- ${databaseModeInstructions}
- Infer the likely product category and MVP scope
- Focus on the most important entities, relationships, and flows
- Keep the plan compact enough that a second model call can generate the final schema within token limits
- If the prompt is brand-based like "Uber-like backend", infer the standard backend entities for that category
- Prefer names and structures that can later map cleanly to OpenAPI 3.1 resources
- Do not include analytics, admin, reporting, or audit modules unless the user asked for them
- Return only JSON

${sourceDataSection}
${buildMemorySection(memoryContexts)}
Return JSON exactly in this shape:
{
  "domain": "short domain label",
  "summary": "one short paragraph",
  "recommended_scope": "mvp",
  "sql_entities": ["users", "orders"],
  "nosql_entities": ["users", "orders"],
  "relationship_hints": ["orders belongs to users"],
  "field_hints": [
    {
      "entity": "users",
      "fields": ["id uuid", "email varchar", "created_at timestamp"]
    }
  ]
}
`.trim();
};

const buildSchemaGenerationPrompt = ({
  userPrompt,
  sourceData,
  outputMode = 'auto',
  requestedEngine = null,
  memoryContexts = [],
  domainBrief = null,
  compactMode = false,
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

  const scopeRules = compactMode
    ? `- Keep the output compact
- For SQL, use at most 5 tables
- For NoSQL, use at most 4 collections
- Keep each table or collection to about 5 or 6 fields
- Only include the absolute MVP entities needed for the request`
    : `- Focus on the core MVP schema only
- Limit the schema to 8 tables maximum unless the user explicitly asks for a larger design
- Keep each table practical and concise, usually 4 to 8 columns`;

  return `
You are a senior backend architect who designs SQL and NoSQL data models that can later be translated into OpenAPI 3.1 resource models.

Goal:
Generate a production-minded application schema for this request:
"${userPrompt}"

Requirements:
- Database selection rule: ${databaseModeInstructions}
- Output ONLY valid JSON matching the exact contract below
- This output is NOT JSON Schema syntax. It is an application data-model contract for later OpenAPI 3.1 generation
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
${scopeRules}
- Do not include optional analytics, audit, notification, admin, feature-flag, logging, or reporting tables unless explicitly requested
- If the request is broad, choose the most essential entities and relationships instead of trying to cover every possible feature
- If the request is short, branded, or vague such as "Uber-like backend", infer the usual MVP entities, transactions, and relationships for that product category
- Favor resource names and field structures that would map cleanly to REST endpoints and OpenAPI 3.1 schemas later
- Do not include markdown fences

${sourceDataSection}
${buildMemorySection(memoryContexts)}
Inferred domain brief:
${domainBrief ? stringify(domainBrief) : 'No domain brief available.'}

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
  buildDomainBriefPrompt,
  buildSchemaGenerationPrompt,
  buildSchemaRepairPrompt,
};
