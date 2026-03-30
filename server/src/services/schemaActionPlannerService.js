const SUPPORTED_SQL_TYPES = new Set(['uuid', 'varchar', 'text', 'integer', 'boolean', 'date', 'timestamp', 'decimal', 'jsonb']);
const SUPPORTED_NOSQL_TYPES = new Set(['objectId', 'string', 'number', 'boolean', 'date', 'array', 'object']);

const toSnake = (text) =>
  String(text || '')
    .toLowerCase()
    .replace(/[+]/g, ' and ')
    .replace(/[^a-z0-9_\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\s+/g, '_');

const singularize = (word) => {
  if (!word) return word;
  if (word.endsWith('ies')) return word.slice(0, -3) + 'y';
  if (word.endsWith('ses')) return word.slice(0, -2);
  if (word.endsWith('s') && !word.endsWith('ss')) return word.slice(0, -1);
  return word;
};

const pluralize = (word) => {
  if (!word || word.endsWith('s')) return word;
  if (/[^aeiou]y$/.test(word)) return word.slice(0, -1) + 'ies';
  return word + 's';
};

const unique = (values) => [...new Set(values.filter(Boolean))];

const levenshteinDistance = (left, right) => {
  const a = String(left || '');
  const b = String(right || '');
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;

  const rows = Array.from({ length: a.length + 1 }, () => Array(b.length + 1).fill(0));
  for (let i = 0; i <= a.length; i += 1) rows[i][0] = i;
  for (let j = 0; j <= b.length; j += 1) rows[0][j] = j;

  for (let i = 1; i <= a.length; i += 1) {
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      rows[i][j] = Math.min(
        rows[i - 1][j] + 1,
        rows[i][j - 1] + 1,
        rows[i - 1][j - 1] + cost
      );
    }
  }

  return rows[a.length][b.length];
};

const bestFuzzyMatch = (normalized, candidates) => {
  let best = null;
  for (const candidate of candidates) {
    const distance = levenshteinDistance(normalized, candidate);
    const maxAllowed = normalized.length >= 8 ? 2 : 1;
    if (distance <= maxAllowed && (!best || distance < best.distance)) {
      best = { candidate, distance };
    }
  }
  return best?.candidate || null;
};

const stripTrailingConnector = (clause) =>
  clause
    .replace(/[\s,]+$/g, '')
    .replace(/\s+(?:and|then|also)$/i, '')
    .trim();

const splitInstructionIntoClauses = (instruction) =>
  String(instruction || '')
    .replace(/[.;]+/g, ',')
    .replace(/\s+/g, ' ')
    .split(/\s*(?:(?:,\s*)?(?=add\b|create\b|include\b|append\b|insert\b|remove\b|delete\b|drop\b|eliminate\b|rename\b|change\b|make\b|set\b|update\b|connect\b|link\b|relate\b|attach\b|join\b|show\b|read\b|inspect\b|explain\b|define\b|establish\b|associate\b|bridge\b|wire\b|map\b|tie\b|reference\b|belong\b))/i)
    .map(stripTrailingConnector)
    .filter(Boolean);

const cleanListPhrase = (text) =>
  String(text || '')
    .replace(/\b(?:the|a|an|appropriate|suitable|relevant|necessary)\b/gi, ' ')
    .replace(/\b(?:table|tables|collection|collections|entity|entities|field|fields|column|columns|attribute|attributes|key|keys|relationships?)\b/gi, ' ')
    .replace(/\b(?:with|using|via|having)\b.+$/i, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const splitPhraseList = (text) =>
  cleanListPhrase(text)
    .split(/\s*(?:,|\band\b|\balso\b|\bthen\b|&)\s*/i)
    .map((part) => toSnake(part))
    .filter(Boolean);

const buildSchemaIndex = (schema) => {
  const tables = new Map();
  const canonicalTables = [];
  const fieldsByTable = new Map();

  for (const architecture of schema?.architectures || []) {
    const items = architecture.database_type === 'sql' ? architecture.tables || [] : architecture.collections || [];
    for (const item of items) {
      const canonical = item.name;
      canonicalTables.push(canonical);
      const aliases = unique([
        canonical,
        singularize(canonical),
        canonical.replace(/_/g, ' '),
        singularize(canonical).replace(/_/g, ' '),
      ].map(toSnake));
      for (const alias of aliases) tables.set(alias, canonical);

      const fieldMap = new Map();
      const fields = architecture.database_type === 'sql' ? item.columns || [] : item.document_shape || [];
      for (const field of fields) {
        const fieldAliases = unique([
          field.name,
          singularize(field.name),
          field.name.replace(/_/g, ' '),
          singularize(field.name).replace(/_/g, ' '),
        ].map(toSnake));
        for (const alias of fieldAliases) fieldMap.set(alias, field.name);
      }
      fieldsByTable.set(canonical, fieldMap);
    }
  }

  return { tables, canonicalTables, fieldsByTable };
};

const resolveTableName = (index, candidate) => {
  const normalized = toSnake(candidate);
  if (!normalized) return null;
  if (index.tables.has(normalized)) return index.tables.get(normalized);

  const singular = singularize(normalized);
  if (index.tables.has(singular)) return index.tables.get(singular);

  for (const canonical of index.canonicalTables) {
    const canonicalNormalized = toSnake(canonical);
    if (normalized === singularize(canonicalNormalized) || singular === canonicalNormalized) {
      return canonical;
    }
  }

  for (const canonical of index.canonicalTables) {
    const canonicalNormalized = toSnake(canonical);
    if (normalized.includes(canonicalNormalized) || canonicalNormalized.includes(normalized)) {
      return canonical;
    }
  }

  const fuzzyAlias = bestFuzzyMatch(normalized, Array.from(index.tables.keys()).filter((alias) => alias.length >= 4));
  if (fuzzyAlias && index.tables.has(fuzzyAlias)) return index.tables.get(fuzzyAlias);

  return normalized;
};

const resolveFieldName = (index, tableName, candidate) => {
  const normalized = toSnake(candidate);
  if (!normalized) return null;

  const canonicalTable = tableName ? resolveTableName(index, tableName) : null;
  const fieldMap = canonicalTable ? index.fieldsByTable.get(canonicalTable) : null;
  if (fieldMap) {
    if (fieldMap.has(normalized)) return fieldMap.get(normalized);
    const singular = singularize(normalized);
    if (fieldMap.has(singular)) return fieldMap.get(singular);

    for (const [alias, canonical] of fieldMap.entries()) {
      if ((normalized.includes(alias) || alias.includes(normalized)) && alias.length >= 4) {
        return canonical;
      }
    }

    const fuzzyAlias = bestFuzzyMatch(normalized, Array.from(fieldMap.keys()).filter((alias) => alias.length >= 4));
    if (fuzzyAlias && fieldMap.has(fuzzyAlias)) return fieldMap.get(fuzzyAlias);
  }

  return normalized;
};

const resolveFieldType = (schema, typeText) => {
  const normalized = String(typeText || '').trim().toLowerCase();
  if (!normalized) return undefined;
  const firstArchitecture = schema?.architectures?.[0];
  const prefersSql = firstArchitecture?.database_type !== 'nosql';

  const aliasMap = {
    string: prefersSql ? 'varchar' : 'string',
    text: 'text',
    uuid: 'uuid',
    id: prefersSql ? 'uuid' : 'objectId',
    objectid: 'objectId',
    object_id: 'objectId',
    number: prefersSql ? 'decimal' : 'number',
    int: 'integer',
    integer: 'integer',
    decimal: 'decimal',
    float: prefersSql ? 'decimal' : 'number',
    bool: 'boolean',
    boolean: 'boolean',
    date: 'date',
    datetime: 'timestamp',
    timestamp: 'timestamp',
    json: prefersSql ? 'jsonb' : 'object',
    jsonb: 'jsonb',
    object: prefersSql ? 'jsonb' : 'object',
    array: prefersSql ? 'jsonb' : 'array',
  };

  const mapped = aliasMap[normalized] || normalized;
  if (SUPPORTED_SQL_TYPES.has(mapped) || SUPPORTED_NOSQL_TYPES.has(mapped)) return mapped;
  return undefined;
};

const parseRequiredFlag = (text) => {
  if (/\b(?:optional|nullable|not required)\b/i.test(text)) return false;
  if (/\b(?:required|mandatory|must have|non-null|not null)\b/i.test(text)) return true;
  return undefined;
};

const parseDescription = (text) => {
  const match = text.match(/\bdescription\s+(?:to|as|=)\s+["“]?([^"”]+)["”]?/i);
  return match ? match[1].trim() : undefined;
};

const parseReadOperation = (index, clause, mode) => {
  const text = clause.trim();
  let match = text.match(/^(?:show|read|inspect|explain)\s+(?:me\s+)?(?:the\s+)?(.+?)\s+(?:table|collection|entity)$/i);
  if (match && mode !== 'fields') {
    return [{ type: 'read_table', table: resolveTableName(index, match[1]), note: `Inspect table ${resolveTableName(index, match[1])}` }];
  }

  match = text.match(/^(?:show|read|inspect|explain)\s+(?:me\s+)?(?:the\s+)?(.+?)\s+(?:field|column|attribute)\s+(?:in|on|inside|within)\s+(.+)$/i);
  if (match && mode !== 'tables') {
    const table = resolveTableName(index, match[2]);
    return [{ type: 'read_field', table, field: resolveFieldName(index, table, match[1]), note: `Inspect field ${resolveFieldName(index, table, match[1])} in ${table}` }];
  }

  return [];
};

const extractTablePair = (index, rawA, rawB) => {
  const source = resolveTableName(index, splitPhraseList(rawA)[0]);
  const targets = splitPhraseList(rawB).map((t) => resolveTableName(index, t));
  return targets.filter(Boolean).map((target) => ({ type: 'connect_tables', sourceTable: source, targetTable: target }));
};

const parseConnectOperation = (index, clause, mode) => {
  if (mode === 'fields') return [];
  const text = clause.trim();

  // Pattern 1 — classic: connect|link|relate|attach|join|associate|bridge|tie|map|wire X to|with Y
  let m = text.match(/^(?:connect|link|relate|attach|join|associate|bridge|tie|map|wire)\s+(.+?)\s+(?:to|with)\s+(.+)$/i);
  if (m) return extractTablePair(index, m[1], m[2]);

  // Pattern 2 — "define|establish|create|add|build|set up|put a connection|relationship|link|association between X and Y"
  m = text.match(/^(?:define|establish|create|add|make|build|put|set\s+up|wire\s+up)?\s*(?:a\s+|an\s+)?(?:connection|relationship|relation|link|association|foreign[\s_]key|ref|reference|join|bridge)\s+between\s+(.+?)\s+and\s+(.+)$/i);
  if (m) return extractTablePair(index, m[1], m[2]);

  // Pattern 3 — "between X and Y" anywhere in clause (catches "define a connection between X and Y" variants)
  m = text.match(/\bbetween\s+(.+?)\s+and\s+(.+)$/i);
  if (m) return extractTablePair(index, m[1], m[2]);

  // Pattern 4 — "X references|belongs to|is linked to|is related to|depends on Y"
  m = text.match(/^(.+?)\s+(?:references?|belongs?\s+to|is\s+linked\s+to|is\s+connected\s+to|is\s+related\s+to|is\s+associated\s+with|depends?\s+on|ties?\s+to)\s+(.+)$/i);
  if (m) return extractTablePair(index, m[1], m[2]);

  // Pattern 5 — "X and Y should be connected|linked|related|associated|joined"
  m = text.match(/^(.+?)\s+and\s+(.+?)\s+(?:should\s+be|must\s+be|needs?\s+to\s+be|have\s+to\s+be|needs?\s+(?:a\s+)?(?:to\s+be)?)\s*(?:connected|linked|related|associated|tied|joined|bridged)$/i);
  if (m) return extractTablePair(index, m[1], m[2]);

  // Pattern 6 — "link|connect X and Y (together)"
  m = text.match(/^(?:link|connect|join|associate|tie|bridge)\s+(.+?)\s+and\s+(.+?)(?:\s+together)?$/i);
  if (m) return extractTablePair(index, m[1], m[2]);

  // Pattern 7 — "add a relationship|foreign key|reference from X to Y"
  m = text.match(/^(?:add|create|define|put)\s+(?:a\s+)?(?:relationship|foreign[\s_]key|reference|ref|link|connection)\s+from\s+(.+?)\s+to\s+(.+)$/i);
  if (m) return extractTablePair(index, m[1], m[2]);

  // Pattern 8 — "X has many|has one|has a Y" / "X belongs to Y" / "X is part of Y"
  m = text.match(/^(.+?)\s+(?:has\s+(?:many|one|a|an)|is\s+part\s+of|is\s+under|is\s+owned\s+by|belongs?\s+to)\s+(.+)$/i);
  if (m) return extractTablePair(index, m[1], m[2]);

  return [];
};

const parseRenameTable = (index, clause, mode) => {
  if (mode === 'fields') return [];
  let match = clause.match(/^(?:rename|change)\s+(?:the\s+)?(?:table\s+|collection\s+|entity\s+)?(.+?)\s+(?:to|as)\s+(.+)$/i);
  if (!match) match = clause.match(/^(?:make|turn)\s+(.+?)\s+into\s+(.+)$/i);
  if (!match) return [];

  return [{ type: 'rename_table', table: resolveTableName(index, match[1]), newName: toSnake(cleanListPhrase(match[2])) }];
};

const parseRenameField = (index, clause, mode) => {
  if (mode === 'tables') return [];

  let match = clause.match(/^(?:rename|change)\s+(?:the\s+)?(?:field|column|attribute)\s+(.+?)\s+(?:to|as)\s+(.+?)\s+(?:in|on|inside|within)\s+(.+)$/i);
  if (match) {
    const table = resolveTableName(index, match[3]);
    return [{ type: 'rename_field', table, field: resolveFieldName(index, table, match[1]), newName: toSnake(cleanListPhrase(match[2])) }];
  }

  match = clause.match(/^(?:in|on|inside|within)\s+(.+?),\s*(?:rename|change)\s+(.+?)\s+(?:to|as)\s+(.+)$/i);
  if (match) {
    const table = resolveTableName(index, match[1]);
    return [{ type: 'rename_field', table, field: resolveFieldName(index, table, match[2]), newName: toSnake(cleanListPhrase(match[3])) }];
  }

  match = clause.match(/^(?:rename|change)\s+(.+?)\s+(?:to|as)\s+(.+?)\s+(?:in|on|inside|within)\s+(.+)$/i);
  if (match) {
    const table = resolveTableName(index, match[3]);
    return [{ type: 'rename_field', table, field: resolveFieldName(index, table, match[1]), newName: toSnake(cleanListPhrase(match[2])) }];
  }

  return [];
};

const parseTableMutations = (index, clause, mode) => {
  if (mode === 'fields') return [];
  const operations = [];
  const removeMatch = clause.match(/(?:remove|delete|drop|eliminate)\s+(.+?)(?=(?:\badd\b|\bcreate\b|\binclude\b|\bappend\b|\binsert\b|$))/i);
  if (removeMatch) {
    splitPhraseList(removeMatch[1]).forEach((name) => operations.push({ type: 'remove_table', table: resolveTableName(index, name) }));
  }
  const addMatch = clause.match(/(?:add|create|include|append|insert|introduce|define|establish|set\s+up|build)\s+(.+?)(?=(?:\bremove\b|\bdelete\b|\bdrop\b|\beliminate\b|$))/i);
  if (addMatch) {
    splitPhraseList(addMatch[1]).forEach((name) => operations.push({ type: 'add_table', table: resolveTableName(index, name) }));
  }
  return operations;
};

const parseFieldAddRemove = (index, clause, mode) => {
  if (mode === 'tables') return [];
  const operations = [];

  const removeMatch = clause.match(/(?:remove|delete|drop|eliminate)\s+(.+?)\s+(?:from|in|on|inside|within)\s+(.+)$/i);
  if (removeMatch) {
    const table = resolveTableName(index, removeMatch[2]);
    splitPhraseList(removeMatch[1]).forEach((field) => operations.push({ type: 'remove_field', table, field: resolveFieldName(index, table, field) }));
  }

  const addMatch = clause.match(/(?:add|create|include|append|insert)\s+(.+?)\s+(?:to|in|on|inside|within)\s+(.+)$/i);
  if (addMatch) {
    const table = resolveTableName(index, addMatch[2]);
    splitPhraseList(addMatch[1]).forEach((field) => operations.push({ type: 'add_field', table, field: resolveFieldName(index, table, field) }));
  }

  return operations;
};

const parseFieldUpdates = (index, clause, mode, schema, context) => {
  if (mode === 'tables') return [];
  const operations = [];

  let match = clause.match(/^(?:make|set)\s+(.+?)\s+(?:in|on|inside|within)\s+(.+?)\s+(required|mandatory|optional|nullable|not required|non-null|not null)$/i);
  if (match) {
    const table = resolveTableName(index, match[2]);
    operations.push({ type: 'update_field', table, field: resolveFieldName(index, table, match[1]), required: parseRequiredFlag(match[3]) });
  }

  match = clause.match(/^(?:make|set)\s+(.+?)\s+(required|mandatory|optional|nullable|not required|non-null|not null)\s+(?:in|on|inside|within)\s+(.+)$/i);
  if (match) {
    const table = resolveTableName(index, match[3]);
    operations.push({ type: 'update_field', table, field: resolveFieldName(index, table, match[1]), required: parseRequiredFlag(match[2]) });
  }

  if (!operations.length && /^(?:make|set)\s+it\s+(required|mandatory|optional|nullable|not required|non-null|not null)$/i.test(clause) && context?.lastField) {
    const pronounMatch = clause.match(/^(?:make|set)\s+it\s+(required|mandatory|optional|nullable|not required|non-null|not null)$/i);
    operations.push({ type: 'update_field', table: context.lastField.table, field: context.lastField.field, required: parseRequiredFlag(pronounMatch[1]) });
  }

  match = clause.match(/^(?:change|set|update|convert)\s+(?:the\s+type\s+of\s+)?(.+?)\s+(?:in|on|inside|within)\s+(.+?)\s+(?:to|as)\s+([a-zA-Z0-9_ ]+)$/i);
  if (match) {
    const table = resolveTableName(index, match[2]);
    operations.push({
      type: 'update_field',
      table,
      field: resolveFieldName(index, table, match[1]),
      newType: resolveFieldType(schema, toSnake(match[3])) || toSnake(match[3]),
      required: parseRequiredFlag(clause),
      description: parseDescription(clause),
    });
  }

  match = clause.match(/^(?:update)\s+(.+?)\s+(?:in|on|inside|within)\s+(.+)$/i);
  if (match) {
    const table = resolveTableName(index, match[2]);
    const required = parseRequiredFlag(clause);
    const newType = resolveFieldType(schema, toSnake((clause.match(/\b(?:type\s+(?:to|as)|as)\s+([a-zA-Z0-9_ ]+)/i) || [])[1] || ''));
    const description = parseDescription(clause);
    if (required !== undefined || newType || description) {
      operations.push({ type: 'update_field', table, field: resolveFieldName(index, table, match[1]), required, ...(newType ? { newType } : {}), ...(description ? { description } : {}) });
    }
  }

  return operations;
};

const dedupeOperations = (operations) => {
  const seen = new Set();
  return operations.filter((operation) => {
    const key = JSON.stringify(operation);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const updateContext = (context, operations) => {
  for (const operation of operations) {
    if (['add_field', 'remove_field', 'rename_field', 'update_field', 'read_field'].includes(operation.type)) {
      context.lastField = { table: operation.table, field: operation.newName || operation.field };
    }
    if (['add_table', 'remove_table', 'rename_table', 'read_table', 'connect_tables'].includes(operation.type)) {
      context.lastTable = operation.newName || operation.table || operation.sourceTable || operation.targetTable;
    }
  }
};

const planSchemaActions = ({ existingSchema, instruction, mode = 'edit' }) => {
  const index = buildSchemaIndex(existingSchema);
  const clauses = splitInstructionIntoClauses(instruction);
  const operations = [];
  const context = { lastTable: null, lastField: null };

  for (const clause of clauses) {
    if (/^(?:make|set)\s+it\s+(required|mandatory|optional|nullable|not required|non-null|not null)$/i.test(clause) && context.lastField) {
      const pronounMatch = clause.match(/^(?:make|set)\s+it\s+(required|mandatory|optional|nullable|not required|non-null|not null)$/i);
      const parsed = [{
        type: 'update_field',
        table: context.lastField.table,
        field: context.lastField.field,
        required: parseRequiredFlag(pronounMatch[1]),
      }];
      operations.push(...parsed);
      updateContext(context, parsed);
      continue;
    }

    const parsers = [
      () => parseReadOperation(index, clause, mode),
      () => parseConnectOperation(index, clause, mode),
      () => parseRenameField(index, clause, mode),
      () => parseFieldUpdates(index, clause, mode, existingSchema, context),
      () => parseRenameTable(index, clause, mode),
      () => parseFieldAddRemove(index, clause, mode),
      () => parseTableMutations(index, clause, mode),
    ];

    let parsed = [];
    for (const parser of parsers) {
      parsed = parser();
      if (parsed.length) break;
    }

    if (!parsed.length) {
      throw new Error(`Could not understand this instruction part: "${clause}"`);
    }

    operations.push(...parsed);
    updateContext(context, parsed);
  }

  const scoped = operations.filter((operation) => {
    if (mode === 'tables') return ['add_table', 'remove_table', 'rename_table', 'connect_tables', 'read_table'].includes(operation.type);
    if (mode === 'fields') return ['add_field', 'remove_field', 'rename_field', 'update_field', 'read_field'].includes(operation.type);
    return true;
  });

  if (!scoped.length) {
    throw new Error(mode === 'tables' ? 'No table operations were found in your instruction.' : mode === 'fields' ? 'No field operations were found in your instruction.' : 'No schema operations were found in your instruction.');
  }

  return dedupeOperations(scoped);
};

module.exports = {
  planSchemaActions,
};
