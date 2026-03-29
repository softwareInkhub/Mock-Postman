const {
  resolveFieldTypes,
  buildGenericSqlTable,
  buildGenericNoSqlCollection,
} = require('./fieldTypeMapperService');
const { FEATURE_MODULES } = require('../data/featureModules');
const { DOMAIN_TEMPLATES } = require('../data/domainTemplates');

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

const clone = (value) => JSON.parse(JSON.stringify(value));
const unique = (values) => [...new Set(values.filter(Boolean))];

const nameMatches = (candidate, actual) => {
  const left = toSnake(candidate);
  const right = toSnake(actual);
  if (!left || !right) return false;
  return (
    left === right ||
    singularize(left) === singularize(right) ||
    pluralize(left) === right ||
    left === pluralize(right)
  );
};

const resolveEntityTables = (entityName) => {
  const singular = singularize(entityName);

  for (const [key, mod] of Object.entries(FEATURE_MODULES)) {
    if (key === singular || key === entityName || key === pluralize(singular)) {
      return {
        sqlTables: mod.sql?.tables || [],
        nosqlCollections: mod.nosql?.collections || [],
      };
    }
  }

  for (const [key, template] of Object.entries(DOMAIN_TEMPLATES)) {
    if (key === singular || key === entityName) {
      return {
        sqlTables: template.sql?.tables || [],
        nosqlCollections: template.nosql?.collections || [],
      };
    }
  }

  return {
    sqlTables: [buildGenericSqlTable(entityName)],
    nosqlCollections: [buildGenericNoSqlCollection(entityName)],
  };
};

const stripDanglingTableReferences = (schema, removedTargets) => {
  const removed = unique(removedTargets.map((target) => singularize(toSnake(target))));

  for (const architecture of schema.architectures || []) {
    const items = architecture.database_type === 'sql' ? architecture.tables || [] : architecture.collections || [];
    for (const item of items) {
      const fields = architecture.database_type === 'sql' ? item.columns || [] : item.document_shape || [];
      for (const field of fields) {
        if (field.foreign_key) {
          const foreignTable = singularize(String(field.foreign_key).split('.')[0]);
          if (removed.includes(foreignTable)) delete field.foreign_key;
        }
        if (field.references) {
          const refTable = singularize(String(field.references).split('.')[0]);
          if (removed.includes(refTable)) delete field.references;
        }
      }
    }
  }

  return schema;
};

const stripDanglingFieldReferences = (schema, removedByTable) => {
  for (const architecture of schema.architectures || []) {
    const items = architecture.database_type === 'sql' ? architecture.tables || [] : architecture.collections || [];
    for (const item of items) {
      const fields = architecture.database_type === 'sql' ? item.columns || [] : item.document_shape || [];
      for (const field of fields) {
        if (field.foreign_key) {
          const [tableName, columnName] = String(field.foreign_key).split('.');
          const removedFields = removedByTable[singularize(toSnake(tableName))] || new Set();
          if (removedFields.has(toSnake(columnName || 'id'))) delete field.foreign_key;
        }
        if (field.references) {
          const [tableName, columnName] = String(field.references).split('.');
          const removedFields = removedByTable[singularize(toSnake(tableName))] || new Set();
          if (removedFields.has(toSnake(columnName || 'id'))) delete field.references;
        }
      }
    }
  }

  return schema;
};

const findItems = (architecture, tableName) => {
  const items = architecture.database_type === 'sql' ? architecture.tables || [] : architecture.collections || [];
  return items.filter((item) => nameMatches(tableName, item.name));
};

const getFieldList = (architecture, item) => architecture.database_type === 'sql' ? item.columns || [] : item.document_shape || [];
const setFieldList = (architecture, item, fields) => {
  if (architecture.database_type === 'sql') item.columns = fields;
  else item.document_shape = fields;
};

const makeField = (architecture, operation) => {
  const fieldName = toSnake(operation.field || operation.newName || 'field');
  const { sqlType, nosqlType } = resolveFieldTypes(fieldName);
  return {
    name: fieldName,
    type: operation.newType || (architecture.database_type === 'sql' ? sqlType : nosqlType),
    required: operation.required === true,
    description: operation.description || `${fieldName} field.`,
    ...(architecture.database_type === 'sql' && operation.foreignKey ? { foreign_key: operation.foreignKey } : {}),
    ...(architecture.database_type !== 'sql' && operation.references ? { references: operation.references } : {}),
  };
};

const applyAddTable = (schema, operation) => {
  const tableName = toSnake(operation.table);
  for (const architecture of schema.architectures || []) {
    const existingNames = new Set(
      architecture.database_type === 'sql'
        ? (architecture.tables || []).map((table) => table.name)
        : (architecture.collections || []).map((collection) => collection.name)
    );
    const { sqlTables, nosqlCollections } = resolveEntityTables(tableName);
    const items = architecture.database_type === 'sql' ? sqlTables : nosqlCollections;
    for (const item of items) {
      if (!existingNames.has(item.name)) {
        if (architecture.database_type === 'sql') architecture.tables.push(item);
        else architecture.collections.push(item);
        existingNames.add(item.name);
      }
    }
  }
  return `Added table/collection ${tableName}`;
};

const applyRemoveTable = (schema, operation) => {
  const tableName = toSnake(operation.table);
  for (const architecture of schema.architectures || []) {
    if (architecture.database_type === 'sql') {
      architecture.tables = (architecture.tables || []).filter((table) => !nameMatches(tableName, table.name));
    } else {
      architecture.collections = (architecture.collections || []).filter((collection) => !nameMatches(tableName, collection.name));
    }
  }
  stripDanglingTableReferences(schema, [tableName]);
  return `Removed table/collection ${tableName}`;
};

const applyRenameTable = (schema, operation) => {
  const tableName = toSnake(operation.table);
  const newName = toSnake(operation.newName);
  for (const architecture of schema.architectures || []) {
    const items = architecture.database_type === 'sql' ? architecture.tables || [] : architecture.collections || [];
    for (const item of items) {
      if (nameMatches(tableName, item.name)) item.name = newName;
      const fields = getFieldList(architecture, item);
      for (const field of fields) {
        if (field.foreign_key) {
          const [refTable, refField] = String(field.foreign_key).split('.');
          if (nameMatches(tableName, refTable)) field.foreign_key = `${newName}.${refField || 'id'}`;
        }
        if (field.references) {
          const [refTable, refField] = String(field.references).split('.');
          if (nameMatches(tableName, refTable)) field.references = `${newName}.${refField || 'id'}`;
        }
      }
    }
  }
  return `Renamed table/collection ${tableName} to ${newName}`;
};

const applyAddField = (schema, operation) => {
  const tableName = toSnake(operation.table);
  const fieldName = toSnake(operation.field);
  for (const architecture of schema.architectures || []) {
    const matchingItems = tableName ? findItems(architecture, tableName) : (architecture.database_type === 'sql' ? architecture.tables || [] : architecture.collections || []);
    for (const item of matchingItems) {
      const fields = getFieldList(architecture, item);
      if (!fields.some((field) => nameMatches(fieldName, field.name))) {
        fields.push(makeField(architecture, operation));
        setFieldList(architecture, item, fields);
      }
    }
  }
  return `Added field ${fieldName}${tableName ? ` to ${tableName}` : ''}`;
};

const applyRemoveField = (schema, operation) => {
  const tableName = toSnake(operation.table);
  const fieldName = toSnake(operation.field);
  const removedByTable = {};
  for (const architecture of schema.architectures || []) {
    const matchingItems = tableName ? findItems(architecture, tableName) : (architecture.database_type === 'sql' ? architecture.tables || [] : architecture.collections || []);
    for (const item of matchingItems) {
      const before = getFieldList(architecture, item);
      const after = before.filter((field) => !nameMatches(fieldName, field.name));
      if (after.length !== before.length) {
        setFieldList(architecture, item, after);
        const key = singularize(toSnake(item.name));
        if (!removedByTable[key]) removedByTable[key] = new Set();
        removedByTable[key].add(fieldName);
      }
    }
  }
  stripDanglingFieldReferences(schema, removedByTable);
  return `Removed field ${fieldName}${tableName ? ` from ${tableName}` : ''}`;
};

const applyRenameField = (schema, operation) => {
  const tableName = toSnake(operation.table);
  const fieldName = toSnake(operation.field);
  const newName = toSnake(operation.newName);
  for (const architecture of schema.architectures || []) {
    const matchingItems = tableName ? findItems(architecture, tableName) : (architecture.database_type === 'sql' ? architecture.tables || [] : architecture.collections || []);
    for (const item of matchingItems) {
      const fields = getFieldList(architecture, item);
      for (const field of fields) {
        if (nameMatches(fieldName, field.name)) field.name = newName;
      }
      for (const otherItem of (architecture.database_type === 'sql' ? architecture.tables || [] : architecture.collections || [])) {
        const otherFields = getFieldList(architecture, otherItem);
        for (const field of otherFields) {
          if (field.foreign_key) {
            const [refTable, refField] = String(field.foreign_key).split('.');
            if (nameMatches(item.name, refTable) && nameMatches(fieldName, refField)) {
              field.foreign_key = `${item.name}.${newName}`;
            }
          }
          if (field.references) {
            const [refTable, refField] = String(field.references).split('.');
            if (nameMatches(item.name, refTable) && nameMatches(fieldName, refField)) {
              field.references = `${item.name}.${newName}`;
            }
          }
        }
      }
    }
  }
  return `Renamed field ${fieldName} to ${newName}${tableName ? ` in ${tableName}` : ''}`;
};

const applyUpdateField = (schema, operation) => {
  const tableName = toSnake(operation.table);
  const fieldName = toSnake(operation.field);
  for (const architecture of schema.architectures || []) {
    const matchingItems = tableName ? findItems(architecture, tableName) : (architecture.database_type === 'sql' ? architecture.tables || [] : architecture.collections || []);
    for (const item of matchingItems) {
      const fields = getFieldList(architecture, item);
      for (const field of fields) {
        if (nameMatches(fieldName, field.name)) {
          if (operation.newType) field.type = operation.newType;
          if (typeof operation.required === 'boolean') field.required = operation.required;
          if (operation.description) field.description = operation.description;
          if (architecture.database_type === 'sql' && operation.foreignKey) field.foreign_key = operation.foreignKey;
          if (architecture.database_type !== 'sql' && operation.references) field.references = operation.references;
        }
      }
    }
  }
  return `Updated field ${fieldName}${tableName ? ` in ${tableName}` : ''}`;
};

const applyConnectTables = (schema, operation) => {
  const sourceTable = toSnake(operation.sourceTable);
  const targetTable = toSnake(operation.targetTable);
  const relationshipField = toSnake(operation.relationshipField || `${singularize(targetTable)}_id`);

  for (const architecture of schema.architectures || []) {
    const sourceItems = findItems(architecture, sourceTable);
    for (const item of sourceItems) {
      const fields = getFieldList(architecture, item);
      if (!fields.some((field) => nameMatches(relationshipField, field.name))) {
        if (architecture.database_type === 'sql') {
          fields.push({
            name: relationshipField,
            type: 'uuid',
            required: false,
            foreign_key: `${targetTable}.id`,
            description: `References ${targetTable}.`,
          });
        } else {
          fields.push({
            name: relationshipField,
            type: 'objectId',
            required: false,
            references: `${targetTable}._id`,
            description: `References ${targetTable}.`,
          });
        }
        setFieldList(architecture, item, fields);
      }
    }
  }

  return `Connected ${sourceTable} to ${targetTable} using ${relationshipField}`;
};

const applyReadOperation = (operation) => {
  if (operation.type === 'read_table') return operation.note || `Inspected table ${toSnake(operation.table)}`;
  return operation.note || `Inspected field ${toSnake(operation.field)} in ${toSnake(operation.table)}`;
};

const applySchemaOperations = ({ existingSchema, operations }) => {
  const workingSchema = clone(existingSchema);
  const labels = [];

  for (const operation of operations || []) {
    if (!operation?.type) continue;
    if (operation.type === 'add_table') labels.push(applyAddTable(workingSchema, operation));
    else if (operation.type === 'remove_table') labels.push(applyRemoveTable(workingSchema, operation));
    else if (operation.type === 'rename_table') labels.push(applyRenameTable(workingSchema, operation));
    else if (operation.type === 'add_field') labels.push(applyAddField(workingSchema, operation));
    else if (operation.type === 'remove_field') labels.push(applyRemoveField(workingSchema, operation));
    else if (operation.type === 'rename_field') labels.push(applyRenameField(workingSchema, operation));
    else if (operation.type === 'update_field') labels.push(applyUpdateField(workingSchema, operation));
    else if (operation.type === 'connect_tables') labels.push(applyConnectTables(workingSchema, operation));
    else if (operation.type === 'read_table' || operation.type === 'read_field') labels.push(applyReadOperation(operation));
  }

  return { schema: workingSchema, labels };
};

module.exports = { applySchemaOperations };
