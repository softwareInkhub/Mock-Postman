const { generateSchema } = require('../services/schemaGeneratorService');
const { getRandomSchemaExample } = require('../services/schemaMemoryService');

const createSchema = async (request, response, next) => {
  try {
    const result = await generateSchema(request.body);
    response.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

const getSchemaExample = (request, response, next) => {
  try {
    const example = getRandomSchemaExample();

    response.status(200).json({
      success: true,
      example,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createSchema,
  getSchemaExample,
};
