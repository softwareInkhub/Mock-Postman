const { generateSchema } = require('../services/schemaGeneratorService');
const { augmentSchema } = require('../services/schemaAugmentService');
const { editSchema } = require('../services/schemaEditService');
const { convertSchemaToOpenApi } = require('../services/schemaOpenApiService');
const yaml = require('js-yaml');
const { getRandomSchemaExample, getMemoryStatus } = require('../services/schemaMemoryService');

const createSchema = async (request, response, next) => {
  try {
    const result = await generateSchema(request.body);
    response.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

const augmentSchemaHandler = async (request, response, next) => {
  try {
    const { existingSchema, instruction, mode } = request.body;
    const result = await augmentSchema({ existingSchema, instruction, mode });
    response.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

const editSchemaHandler = async (request, response, next) => {
  try {
    const { existingSchema, instruction, provider, model } = request.body;
    const result = await editSchema({ existingSchema, instruction, provider, model });
    response.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

const openApiHandler = (request, response, next) => {
  try {
    const { schema, title, version, description, serverUrl, sourceArch, format } = request.body;
    if (!schema) {
      return response.status(400).json({ success: false, error: { message: 'schema is required.' } });
    }
    const doc = convertSchemaToOpenApi(schema, { title, version, description, serverUrl, sourceArch });

    const wantsYaml = String(format || '').toLowerCase() === 'yaml';
    if (wantsYaml) {
      const yamlText = yaml.dump(doc, { lineWidth: 120, noRefs: true, quotingType: '"' });
      return response.status(200).json({ success: true, openapi: doc, yamlText });
    }

    response.status(200).json({ success: true, openapi: doc });
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

const getSchemaMemoryStatus = async (request, response, next) => {
  try {
    const status = await getMemoryStatus();
    response.status(200).json({
      success: true,
      memory: status,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createSchema,
  augmentSchemaHandler,
  editSchemaHandler,
  openApiHandler,
  getSchemaExample,
  getSchemaMemoryStatus,
};
