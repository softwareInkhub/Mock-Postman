const IRREGULAR_PLURALS = {
  category: 'categories',
};

const pluralize = (value = '') => {
  const singular = String(value).trim().toLowerCase();

  if (!singular) {
    return singular;
  }

  if (IRREGULAR_PLURALS[singular]) {
    return IRREGULAR_PLURALS[singular];
  }

  if (singular.endsWith('y')) {
    return `${singular.slice(0, -1)}ies`;
  }

  if (singular.endsWith('s')) {
    return singular;
  }

  return `${singular}s`;
};

const enhanceSqlArchitecture = (architecture) => {
  const tableNames = new Set(architecture.tables.map((table) => table.name));

  return {
    ...architecture,
    database_type: 'sql',
    database_engine: String(architecture.database_engine || 'postgresql').toLowerCase(),
    tables: architecture.tables.map((table) => {
      const seenPrimaryKey = table.columns.some((column) => column.primary === true);

      const columns = table.columns.map((column) => {
        const normalizedColumn = {
          ...column,
        };

        if (!normalizedColumn.description) {
          normalizedColumn.description = `${normalizedColumn.name} for the ${table.name} table.`;
        }

        if (
          !normalizedColumn.foreign_key &&
          normalizedColumn.name.endsWith('_id') &&
          normalizedColumn.name !== 'id'
        ) {
          const baseName = normalizedColumn.name.replace(/_id$/, '');
          const guessedTable = pluralize(baseName);

          if (tableNames.has(guessedTable)) {
            normalizedColumn.foreign_key = `${guessedTable}.id`;
          }
        }

        return normalizedColumn;
      });

      if (!seenPrimaryKey) {
        columns.unshift({
          name: 'id',
          type: 'uuid',
          primary: true,
          required: true,
          description: `Primary key for the ${table.name} table.`,
        });
      }

      return {
        ...table,
        description: table.description || `Stores ${table.name} records.`,
        columns,
      };
    }),
  };
};

const enhanceNoSqlArchitecture = (architecture) => ({
  ...architecture,
  database_type: 'nosql',
  database_engine: String(architecture.database_engine || 'mongodb').toLowerCase(),
  collections: architecture.collections.map((collection) => {
    const hasPrimaryField = collection.document_shape.some((field) => field.name === '_id');
    const documentShape = collection.document_shape.map((field) => ({
      ...field,
      description:
        field.description || `${field.name} for the ${collection.name} collection.`,
    }));

    if (!hasPrimaryField) {
      documentShape.unshift({
        name: '_id',
        type: 'objectId',
        required: true,
        description: `Primary identifier for the ${collection.name} collection.`,
      });
    }

    return {
      ...collection,
      description: collection.description || `Stores ${collection.name} documents.`,
      document_shape: documentShape,
    };
  }),
});

const enhanceSchemaRelationships = (schema) => ({
  ...schema,
  architectures: schema.architectures.map((architecture) => {
    const databaseType = String(architecture.database_type || '').trim().toLowerCase();

    if (databaseType === 'nosql') {
      return enhanceNoSqlArchitecture(architecture);
    }

    return enhanceSqlArchitecture(architecture);
  }),
});

module.exports = {
  enhanceSchemaRelationships,
};
