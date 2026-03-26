const ALLOWED_SQL_ENGINES = new Set(['postgresql', 'mysql', 'sqlite', 'sqlserver']);
const ALLOWED_NOSQL_ENGINES = new Set(['mongodb', 'dynamodb', 'firestore', 'cassandra']);

const isPlainObject = (value) =>
  Object.prototype.toString.call(value) === '[object Object]';

const isNonEmptyString = (value) => typeof value === 'string' && value.trim().length > 0;

const validateField = (field, containerType, containerName, fieldIndex, errors) => {
  const label = `${containerType}["${containerName}"].fields[${fieldIndex}]`;

  if (!isPlainObject(field)) {
    errors.push(`${label} must be an object.`);
    return;
  }

  if (!isNonEmptyString(field.name)) {
    errors.push(`${label}.name must be a non-empty string.`);
  }

  if (!isNonEmptyString(field.type)) {
    errors.push(`${label}.type must be a non-empty string.`);
  }

  if (field.required !== undefined && typeof field.required !== 'boolean') {
    errors.push(`${label}.required must be a boolean when provided.`);
  }

  if (field.description !== undefined && !isNonEmptyString(field.description)) {
    errors.push(`${label}.description must be a non-empty string when provided.`);
  }
};

const validateColumn = (column, tableName, columnIndex, errors) => {
  const label = `tables["${tableName}"].columns[${columnIndex}]`;

  if (!isPlainObject(column)) {
    errors.push(`${label} must be an object.`);
    return;
  }

  if (!isNonEmptyString(column.name)) {
    errors.push(`${label}.name must be a non-empty string.`);
  }

  if (!isNonEmptyString(column.type)) {
    errors.push(`${label}.type must be a non-empty string.`);
  }

  if (column.primary !== undefined && typeof column.primary !== 'boolean') {
    errors.push(`${label}.primary must be a boolean when provided.`);
  }

  if (column.required !== undefined && typeof column.required !== 'boolean') {
    errors.push(`${label}.required must be a boolean when provided.`);
  }

  if (column.foreign_key !== undefined && !isNonEmptyString(column.foreign_key)) {
    errors.push(`${label}.foreign_key must be a non-empty string when provided.`);
  }

  if (column.description !== undefined && !isNonEmptyString(column.description)) {
    errors.push(`${label}.description must be a non-empty string when provided.`);
  }
};

const validateSqlArchitecture = (architecture, index, errors) => {
  const label = `architectures[${index}]`;

  if (!Array.isArray(architecture.tables) || architecture.tables.length === 0) {
    errors.push(`${label}.tables must be a non-empty array for SQL architectures.`);
    return;
  }

  architecture.tables.forEach((table, tableIndex) => {
    const tableLabel = `${label}.tables[${tableIndex}]`;

    if (!isPlainObject(table)) {
      errors.push(`${tableLabel} must be an object.`);
      return;
    }

    if (!isNonEmptyString(table.name)) {
      errors.push(`${tableLabel}.name must be a non-empty string.`);
    }

    if (table.description !== undefined && !isNonEmptyString(table.description)) {
      errors.push(`${tableLabel}.description must be a non-empty string when provided.`);
    }

    if (!Array.isArray(table.columns) || table.columns.length === 0) {
      errors.push(`${tableLabel}.columns must be a non-empty array.`);
      return;
    }

    table.columns.forEach((column, columnIndex) =>
      validateColumn(column, table.name || `table_${tableIndex}`, columnIndex, errors)
    );

    if (!table.columns.some((column) => column?.primary === true)) {
      errors.push(`${tableLabel} must define a primary key column.`);
    }
  });

  const tableMap = new Map();

  architecture.tables.forEach((table) => {
    tableMap.set(table.name, new Set(table.columns.map((column) => column.name)));
  });

  architecture.tables.forEach((table) => {
    table.columns.forEach((column) => {
      if (!column.foreign_key) {
        return;
      }

      const [foreignTable, foreignColumn] = String(column.foreign_key).split('.');

      if (!tableMap.has(foreignTable)) {
        errors.push(
          `Foreign key "${column.foreign_key}" on ${table.name}.${column.name} points to an unknown table.`
        );
        return;
      }

      if (!tableMap.get(foreignTable).has(foreignColumn)) {
        errors.push(
          `Foreign key "${column.foreign_key}" on ${table.name}.${column.name} points to an unknown column.`
        );
      }
    });
  });
};

const validateNoSqlArchitecture = (architecture, index, errors) => {
  const label = `architectures[${index}]`;

  if (!Array.isArray(architecture.collections) || architecture.collections.length === 0) {
    errors.push(`${label}.collections must be a non-empty array for NoSQL architectures.`);
    return;
  }

  architecture.collections.forEach((collection, collectionIndex) => {
    const collectionLabel = `${label}.collections[${collectionIndex}]`;

    if (!isPlainObject(collection)) {
      errors.push(`${collectionLabel} must be an object.`);
      return;
    }

    if (!isNonEmptyString(collection.name)) {
      errors.push(`${collectionLabel}.name must be a non-empty string.`);
    }

    if (
      collection.description !== undefined &&
      !isNonEmptyString(collection.description)
    ) {
      errors.push(`${collectionLabel}.description must be a non-empty string when provided.`);
    }

    if (
      !Array.isArray(collection.document_shape) ||
      collection.document_shape.length === 0
    ) {
      errors.push(`${collectionLabel}.document_shape must be a non-empty array.`);
      return;
    }

    collection.document_shape.forEach((field, fieldIndex) =>
      validateField(field, 'collections', collection.name || `collection_${collectionIndex}`, fieldIndex, errors)
    );
  });
};

const validateArchitecture = (architecture, index, errors) => {
  const label = `architectures[${index}]`;

  if (!isPlainObject(architecture)) {
    errors.push(`${label} must be an object.`);
    return;
  }

  if (!isNonEmptyString(architecture.database_type)) {
    errors.push(`${label}.database_type must be a non-empty string.`);
    return;
  }

  if (!isNonEmptyString(architecture.database_engine)) {
    errors.push(`${label}.database_engine must be a non-empty string.`);
  }

  if (architecture.use_case !== undefined && !isNonEmptyString(architecture.use_case)) {
    errors.push(`${label}.use_case must be a non-empty string when provided.`);
  }

  const databaseType = architecture.database_type.trim().toLowerCase();
  const databaseEngine = String(architecture.database_engine || '').trim().toLowerCase();

  if (databaseType === 'sql') {
    if (!ALLOWED_SQL_ENGINES.has(databaseEngine)) {
      errors.push(
        `${label}.database_engine must be one of: ${Array.from(ALLOWED_SQL_ENGINES).join(', ')} for SQL architectures.`
      );
    }

    validateSqlArchitecture(architecture, index, errors);
    return;
  }

  if (databaseType === 'nosql') {
    if (!ALLOWED_NOSQL_ENGINES.has(databaseEngine)) {
      errors.push(
        `${label}.database_engine must be one of: ${Array.from(ALLOWED_NOSQL_ENGINES).join(', ')} for NoSQL architectures.`
      );
    }

    validateNoSqlArchitecture(architecture, index, errors);
    return;
  }

  errors.push(`${label}.database_type must be either "sql" or "nosql".`);
};

const validateSchemaShape = (schema) => {
  const errors = [];

  if (!isPlainObject(schema)) {
    return {
      valid: false,
      errors: ['Schema output must be a JSON object.'],
    };
  }

  if (!Array.isArray(schema.architectures) || schema.architectures.length === 0) {
    errors.push('architectures must be a non-empty array.');
  } else {
    schema.architectures.forEach((architecture, index) =>
      validateArchitecture(architecture, index, errors)
    );
  }

  return {
    valid: errors.length === 0,
    errors,
  };
};

module.exports = {
  validateSchemaShape,
};
