const { generateText } = require('../services/llmService');

const generateCompletion = async (request, response, next) => {
  try {
    const result = await generateText(request.body);
    const statusCode = result.success ? 200 : result.error.status;

    response.status(statusCode).json(result);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  generateCompletion,
};
