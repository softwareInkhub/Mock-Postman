const quoteIdentifier = (identifier) => `"${String(identifier).replace(/"/g, '""')}"`;

const buildColumnSql = (column) => {
  const segments = [quoteIdentifier(column.name), column.type];

  if (column.primary) {
    segments.push('PRIMARY KEY');
  }

  if (column.required) {
    segments.push('NOT NULL');
  }

  return segments.join(' ');
};

const buildForeignKeySql = (column) => {
  if (!column.foreign_key) {
    return null;
  }

  const [tableName, columnName] = column.foreign_key.split('.');

  return `FOREIGN KEY (${quoteIdentifier(column.name)}) REFERENCES ${quoteIdentifier(
    tableName
  )} (${quoteIdentifier(columnName)})`;
};

const convertArchitectureToSql = (architecture) =>
  architecture.tables
    .map((table) => {
      const columnDefinitions = table.columns.map(buildColumnSql);
      const foreignKeys = table.columns.map(buildForeignKeySql).filter(Boolean);
      const allDefinitions = [...columnDefinitions, ...foreignKeys];

      return `CREATE TABLE ${quoteIdentifier(table.name)} (\n  ${allDefinitions.join(',\n  ')}\n);`;
    })
    .join('\n\n');

const convertSchemaToSql = (schema) =>
  schema.architectures
    .filter((architecture) => architecture.database_type === 'sql')
    .map((architecture) => ({
      database_engine: architecture.database_engine,
      sql: convertArchitectureToSql(architecture),
    }));

module.exports = {
  convertSchemaToSql,
};
