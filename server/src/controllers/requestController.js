const { executeRequest, SUPPORTED_METHODS } = require('../services/requestService');

const getHealth = (request, response) => {
  response.status(200).json({
    success: true,
    service: 'mock-postman-backend',
    message: 'Server is running.',
    supportedMethods: SUPPORTED_METHODS,
    timestamp: new Date().toISOString(),
  });
};

const sendRequest = async (request, response, next) => {
  try {
    const result = await executeRequest(request.body);
    response.status(result.statusCode).json(result.body);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getHealth,
  sendRequest,
};
