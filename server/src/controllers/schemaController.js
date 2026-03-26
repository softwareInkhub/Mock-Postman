const { generateSchema } = require('../services/schemaGeneratorService');

const createSchema = async (request, response, next) => {
  try {
    const result = await generateSchema(request.body);
    response.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createSchema,
};
