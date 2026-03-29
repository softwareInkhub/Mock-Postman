/**
 * Schema OpenAPI Service
 *
 * Converts the internal { architectures } schema format into a valid
 * OpenAPI 3.1.0 document. OpenAPI 3.1 is the first version to fully
 * adopt JSON Schema 2020-12 as its schema dialect, so every component
 * schema gets the canonical $schema declaration.
 *
 * Conversion rules (internal type → JSON Schema 2020-12):
 *   uuid        → { type: "string", format: "uuid" }
 *   varchar     → { type: "string" }
 *   text        → { type: "string" }
 *   boolean     → { type: "boolean" }
 *   integer     → { type: "integer" }
 *   decimal     → { type: "number", format: "decimal" }
 *   timestamp   → { type: "string", format: "date-time" }
 *   date        → { type: "string", format: "date" }
 *   jsonb       → { type: "object" }
 *   objectId    → { type: "string", pattern: "^[a-f\\d]{24}$", description: "MongoDB ObjectId" }
 *   array       → { type: "array", items: {} }
 *   object      → { type: "object" }
 *   (fallback)  → { type: "string" }
 *
 * Source preference:
 *   SQL architecture is used when present (most complete type info).
 *   NoSQL (MongoDB) architecture is used as a supplementary $ref set.
 *   If only NoSQL exists, it is used as the primary source.
 */

const JSON_SCHEMA_DIALECT = 'https://json-schema.org/draft/2020-12/schema';
const OPENAPI_VERSION = '3.1.0';

// ---------------------------------------------------------------------------
// Type map — internal engine types → JSON Schema 2020-12
// ---------------------------------------------------------------------------

const TYPE_MAP = {
  uuid:      { type: 'string',  format: 'uuid' },
  varchar:   { type: 'string' },
  text:      { type: 'string' },
  string:    { type: 'string' },
  boolean:   { type: 'boolean' },
  bool:      { type: 'boolean' },
  integer:   { type: 'integer' },
  int:       { type: 'integer' },
  bigint:    { type: 'integer', format: 'int64' },
  decimal:   { type: 'number',  format: 'decimal' },
  float:     { type: 'number',  format: 'float' },
  double:    { type: 'number',  format: 'double' },
  number:    { type: 'number' },
  timestamp: { type: 'string',  format: 'date-time' },
  datetime:  { type: 'string',  format: 'date-time' },
  date:      { type: 'string',  format: 'date' },
  time:      { type: 'string',  format: 'time' },
  jsonb:     { type: 'object',  additionalProperties: true },
  json:      { type: 'object',  additionalProperties: true },
  object:    { type: 'object',  additionalProperties: true },
  array:     { type: 'array',   items: {} },
  objectId:  {
    type: 'string',
    pattern: '^[a-f\\d]{24}$',
    description: 'MongoDB ObjectId (24-character hex string).',
  },
};

const resolveJsonSchemaType = (internalType) => {
  const key = String(internalType || '').toLowerCase().trim();
  return TYPE_MAP[key] || { type: 'string' };
};

// ---------------------------------------------------------------------------
// Pascal-case name helper (users → User, order_items → OrderItem)
// ---------------------------------------------------------------------------

const toPascalCase = (snakeName) =>
  String(snakeName || '')
    .split(/[_\s-]+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join('');

// Strip trailing plural "s" for the schema name only when it's a clear plural
// (users → User, categories → Category, addresses → Address)
const toSchemaName = (tableName) => {
  const pascal = toPascalCase(tableName);
  // Simple de-pluralisation — only remove trailing 's' that isn't part of the stem
  if (pascal.endsWith('ies')) return pascal.slice(0, -3) + 'y';   // categories → Category
  if (pascal.endsWith('ses') || pascal.endsWith('xes') || pascal.endsWith('zes')) {
    return pascal.slice(0, -2); // addresses → Address
  }
  if (pascal.endsWith('s') && pascal.length > 3) return pascal.slice(0, -1);
  return pascal;
};

// ---------------------------------------------------------------------------
// Build a single JSON Schema 2020-12 object from SQL table columns
// ---------------------------------------------------------------------------

const buildComponentFromSqlTable = (table) => {
  const properties = {};
  const required = [];

  for (const col of (table.columns || [])) {
    const propSchema = { ...resolveJsonSchemaType(col.type) };

    if (col.description) propSchema.description = col.description;

    // FK annotation
    if (col.foreign_key) {
      propSchema['x-foreign-key'] = col.foreign_key;
    }

    // PK annotation
    if (col.primary || col.primary_key) {
      propSchema['x-primary-key'] = true;
    }

    properties[col.name] = propSchema;

    if (col.required && (col.primary || col.primary_key || col.required === true)) {
      required.push(col.name);
    }
  }

  const schema = {
    $schema: JSON_SCHEMA_DIALECT,
    type: 'object',
    description: table.description || `${table.name} record.`,
    properties,
  };

  if (required.length > 0) schema.required = required;

  return schema;
};

// ---------------------------------------------------------------------------
// Build a single JSON Schema 2020-12 object from NoSQL collection
// ---------------------------------------------------------------------------

const buildComponentFromNoSqlCollection = (collection) => {
  const properties = {};
  const required = [];

  for (const field of (collection.document_shape || [])) {
    const propSchema = { ...resolveJsonSchemaType(field.type) };

    if (field.description) propSchema.description = field.description;

    if (field.foreign_key) propSchema['x-foreign-key'] = field.foreign_key;
    if (field.primary || field.primary_key) propSchema['x-primary-key'] = true;

    properties[field.name] = propSchema;

    if (field.required) required.push(field.name);
  }

  const schema = {
    $schema: JSON_SCHEMA_DIALECT,
    type: 'object',
    description: collection.description || `${collection.name} document.`,
    properties,
  };

  if (required.length > 0) schema.required = required;

  return schema;
};

// ---------------------------------------------------------------------------
// Build CRUD path operations for a single resource
// ---------------------------------------------------------------------------

const buildPathsForResource = (schemaName, resourceName, schemaRef) => {
  const listPath = `/${resourceName}`;
  const itemPath = `/${resourceName}/{id}`;

  return {
    [listPath]: {
      get: {
        operationId: `list${schemaName}`,
        summary: `List all ${resourceName}`,
        tags: [schemaName],
        parameters: [
          { name: 'limit',  in: 'query', schema: { type: 'integer', default: 20, maximum: 100 } },
          { name: 'offset', in: 'query', schema: { type: 'integer', default: 0 } },
        ],
        responses: {
          200: {
            description: `Paginated list of ${resourceName}.`,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    data:   { type: 'array', items: { $ref: schemaRef } },
                    total:  { type: 'integer' },
                    limit:  { type: 'integer' },
                    offset: { type: 'integer' },
                  },
                },
              },
            },
          },
        },
      },
      post: {
        operationId: `create${schemaName}`,
        summary: `Create a new ${schemaName}`,
        tags: [schemaName],
        requestBody: {
          required: true,
          content: {
            'application/json': { schema: { $ref: schemaRef } },
          },
        },
        responses: {
          201: {
            description: `${schemaName} created.`,
            content: {
              'application/json': { schema: { $ref: schemaRef } },
            },
          },
          422: { description: 'Validation error.' },
        },
      },
    },
    [itemPath]: {
      parameters: [
        { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
      ],
      get: {
        operationId: `get${schemaName}`,
        summary: `Get a ${schemaName} by ID`,
        tags: [schemaName],
        responses: {
          200: {
            description: `${schemaName} found.`,
            content: {
              'application/json': { schema: { $ref: schemaRef } },
            },
          },
          404: { description: 'Not found.' },
        },
      },
      patch: {
        operationId: `update${schemaName}`,
        summary: `Update a ${schemaName}`,
        tags: [schemaName],
        requestBody: {
          required: true,
          content: {
            'application/json': { schema: { $ref: schemaRef } },
          },
        },
        responses: {
          200: {
            description: `${schemaName} updated.`,
            content: {
              'application/json': { schema: { $ref: schemaRef } },
            },
          },
          404: { description: 'Not found.' },
          422: { description: 'Validation error.' },
        },
      },
      delete: {
        operationId: `delete${schemaName}`,
        summary: `Delete a ${schemaName}`,
        tags: [schemaName],
        responses: {
          204: { description: `${schemaName} deleted.` },
          404: { description: 'Not found.' },
        },
      },
    },
  };
};

// ---------------------------------------------------------------------------
// Public entry point
// ---------------------------------------------------------------------------

/**
 * Convert an internal schema { architectures } object into an
 * OpenAPI 3.1.0 document with JSON Schema 2020-12 component schemas.
 *
 * @param {object} schema      - The internal { architectures } schema object
 * @param {object} [options]
 * @param {string} [options.title]       - API title (default: "Generated API")
 * @param {string} [options.version]     - API version (default: "1.0.0")
 * @param {string} [options.description] - API description
 * @param {string} [options.serverUrl]   - Base server URL
 * @param {string} [options.sourceArch]  - "sql" | "nosql" | "auto" (default: "auto")
 * @returns {object} - Full OpenAPI 3.1.0 document as a plain JS object
 */
const convertSchemaToOpenApi = (schema, options = {}) => {
  const {
    title = 'Generated API',
    version = '1.0.0',
    description = 'Auto-generated from BRMH Schema Studio.',
    serverUrl = 'https://api.example.com/v1',
    sourceArch = 'auto',
  } = options;

  const architectures = schema?.architectures || [];

  const sqlArch   = architectures.find((a) => a.database_type === 'sql');
  const nosqlArch = architectures.find((a) => a.database_type === 'nosql');

  // Determine which architecture to use as the primary source
  let primaryArch = null;
  if (sourceArch === 'sql')   primaryArch = sqlArch;
  else if (sourceArch === 'nosql') primaryArch = nosqlArch;
  else primaryArch = sqlArch || nosqlArch; // auto: prefer SQL

  if (!primaryArch) {
    throw new Error('No architecture found in schema. Generate a schema first.');
  }

  const isSql = primaryArch.database_type === 'sql';
  const items = isSql
    ? (primaryArch.tables || [])
    : (primaryArch.collections || []);

  // Build component schemas + paths
  const componentSchemas = {};
  let paths = {};
  const tags = [];

  for (const item of items) {
    const schemaName = toSchemaName(item.name);
    const schemaRef  = `#/components/schemas/${schemaName}`;

    componentSchemas[schemaName] = isSql
      ? buildComponentFromSqlTable(item)
      : buildComponentFromNoSqlCollection(item);

    Object.assign(paths, buildPathsForResource(schemaName, item.name, schemaRef));

    tags.push({
      name: schemaName,
      description: item.description || `Operations on ${item.name}.`,
    });
  }

  // Build the OpenAPI document
  const doc = {
    openapi: OPENAPI_VERSION,

    info: {
      title,
      version,
      description,
      'x-generated-by': 'BRMH Schema Studio',
      'x-schema-dialect': JSON_SCHEMA_DIALECT,
    },

    servers: [
      { url: serverUrl, description: 'Primary server' },
    ],

    tags,

    paths,

    components: {
      schemas: componentSchemas,

      // Standard error response schema (JSON Schema 2020-12)
      responses: {
        ErrorResponse: {
          description: 'A standard error response.',
          content: {
            'application/json': {
              schema: {
                $schema: JSON_SCHEMA_DIALECT,
                type: 'object',
                properties: {
                  error:   { type: 'string' },
                  message: { type: 'string' },
                  status:  { type: 'integer' },
                },
                required: ['error', 'message'],
              },
            },
          },
        },
      },

      // Standard pagination parameters
      parameters: {
        LimitParam: {
          name: 'limit',
          in: 'query',
          description: 'Maximum number of items to return.',
          schema: { type: 'integer', default: 20, minimum: 1, maximum: 100 },
        },
        OffsetParam: {
          name: 'offset',
          in: 'query',
          description: 'Number of items to skip.',
          schema: { type: 'integer', default: 0, minimum: 0 },
        },
      },
    },
  };

  return doc;
};

module.exports = { convertSchemaToOpenApi };
