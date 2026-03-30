# Mock Postman Schema Generator

## What this backend is doing

This backend now has three connected responsibilities:

1. Run Postman-style API requests against external endpoints.
2. Generate application schemas from natural-language product prompts.
3. Store and retrieve schema memory to improve future generations.

## Current Schema Flow

1. Client sends `POST /api/schema/generate`.
2. `schemaController.js` forwards the request to `schemaGeneratorService.js`.
3. `schemaGeneratorService.js` deterministically builds the base schema using template composition in `schemaBuilderService.js`.
4. `schemaMemoryService.js` retrieves relevant schema memories from seeded examples plus persisted generated memories.
5. If an LLM provider is configured, the deterministic schema can be enhanced, validated, and repaired.
6. The final schema is post-processed, previewed, optionally converted to SQL, and stored back into schema memory.

## OpenAPI Flow

1. Client sends `POST /api/schema/openapi` with an existing schema.
2. `schemaController.js` calls `schemaOpenApiService.js`.
3. The service converts the internal architecture format into an OpenAPI 3.1 document with JSON Schema 2020-12 component schemas and CRUD-style paths.

## Shared Memory Architecture

Schema memory now supports cross-machine collaboration through a shared MongoDB backend.

### Recommended production/shared setup
- MongoDB Atlas
- Same Atlas connection string on every contributor machine
- Same database and collection name across the team

### Fallback setup
- Local JSON file at `server/src/data/schema-memory.json`
- Used only when MongoDB is not configured or not reachable

### Important migration behavior
- If MongoDB is configured, the server automatically backfills legacy generated memories from `schema-memory.json` into MongoDB.
- Once Atlas is connected, every machine that uses the same `MONGODB_URI` can retrieve the same schema memories.
- This does not train the LLM weights. It creates shared retrieval memory that makes behavior more consistent across devices.

## Environment Variables

```env
PORT=4000
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster-name>.mongodb.net/brmh_schema?retryWrites=true&w=majority&appName=BRMH
MONGODB_DB_NAME=brmh_schema
MONGODB_SCHEMA_MEMORY_COLLECTION=schema_memories
LLM_PROVIDER=anthropic
ANTHROPIC_API_KEY=replace_with_your_anthropic_api_key
```

## New Observability Endpoint

Use this endpoint to verify whether the current machine is using Atlas-backed memory or JSON fallback:

```http
GET /api/schema/memory/status
```

Example response:

```json
{
  "success": true,
  "memory": {
    "backend": "mongodb",
    "collection": "schema_memories",
    "generatedCount": 42,
    "seedCount": 10,
    "fallbackJsonCount": 25,
    "retrieverStrategy": "mongodb:langchain_memory_vector_store"
  }
}
```

## Key Backend Files

- `server/src/services/schemaGeneratorService.js`: main deterministic generation pipeline
- `server/src/services/schemaBuilderService.js`: deterministic schema composition engine
- `server/src/services/schemaMemoryService.js`: retrieval and persistence for schema memory
- `server/src/db/mongoClient.js`: MongoDB connection singleton
- `server/src/services/schemaOpenApiService.js`: OpenAPI export generator
- `server/src/services/schemaEditService.js`: deterministic schema edit flow
- `server/src/services/schemaAugmentService.js`: deterministic table/field augmentation flow

## What Still Comes Next

- add regression tests around Atlas-backed memory retrieval and persistence
- optionally add a one-time CLI script for explicit memory import/export
- add small admin tooling for inspecting or pruning shared schema memory
