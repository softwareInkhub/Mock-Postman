# Mock Postman Schema Generator

## What this backend is doing

This server now has two complementary jobs:

1. Act like a Postman-style request runner that can call public APIs and return the response.
2. Act like a schema architect that can take a plain-English prompt, or a prompt plus sample JSON, and generate a relational database design with primary keys, foreign keys, and optional SQL output.

## Main flow

1. Client sends a POST request to `/api/schema/generate`.
2. `schemaController.js` passes the request body to `schemaGeneratorService.js`.
3. `schemaGeneratorService.js` retrieves relevant schema memories, builds a stricter prompt with those few-shot examples, calls the configured LLM provider through `llmService.js`, extracts JSON, validates it, optionally repairs it once, enhances missing foreign keys, stores the final schema back into memory, and returns the result.
4. `schemaSqlService.js` converts the validated schema into `CREATE TABLE` statements when SQL output is requested.

## Request example

```json
{
  "provider": "anthropic",
  "model": "claude-sonnet-4-20250514",
  "database": "postgresql",
  "prompt": "Create a product management schema where users manage products and each product belongs to a category",
  "includeSql": true
}
```

## Response shape

```json
{
  "success": true,
  "message": "Schema generated successfully.",
  "schema": {
    "database": "postgresql",
    "tables": []
  },
  "sql": "CREATE TABLE ...",
  "meta": {
    "provider": "anthropic",
    "model": "claude-sonnet-4-20250514",
    "database": "postgresql",
    "repaired": false,
    "durationMs": 1234
  }
}
```

## Memory instead of training

The model is not being trained. Instead, the backend now uses retrieval-augmented generation:

1. Stores a seeded library of common product backends such as ride hailing, chat, delivery, social media, and fintech.
2. Persists each successful generated schema in `server/src/data/schema-memory.json`.
3. Retrieves the most relevant memories for a new prompt before calling the LLM.
4. Parses and validates the returned JSON programmatically, then repairs or enriches relationships before returning it.
