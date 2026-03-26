const renderSqlArchitecturePreview = (architecture) => {
  const tableLines = architecture.tables.map((table) => {
    const columnSummary = table.columns
      .map((column) => {
        const parts = [column.name, column.type];

        if (column.primary) {
          parts.push('PK');
        }

        if (column.foreign_key) {
          parts.push(`FK->${column.foreign_key}`);
        }

        return parts.join(' ');
      })
      .join(', ');

    return `- table ${table.name}: ${columnSummary}`;
  });

  return [
    `[SQL: ${architecture.database_engine}]`,
    architecture.use_case || 'Core relational architecture.',
    ...tableLines,
  ].join('\n');
};

const renderNoSqlArchitecturePreview = (architecture) => {
  const collectionLines = architecture.collections.map((collection) => {
    const fieldSummary = collection.document_shape
      .map((field) => `${field.name} ${field.type}`)
      .join(', ');

    return `- collection ${collection.name}: ${fieldSummary}`;
  });

  return [
    `[NoSQL: ${architecture.database_engine}]`,
    architecture.use_case || 'Core document architecture.',
    ...collectionLines,
  ].join('\n');
};

const buildSchemaPreview = (schema) =>
  schema.architectures
    .map((architecture) => {
      if (architecture.database_type === 'nosql') {
        return renderNoSqlArchitecturePreview(architecture);
      }

      return renderSqlArchitecturePreview(architecture);
    })
    .join('\n\n');

module.exports = {
  buildSchemaPreview,
};
