const express = require('express');
const {
  createSchema,
  augmentSchemaHandler,
  editSchemaHandler,
  openApiHandler,
  getSchemaExample,
  getSchemaMemoryStatus,
  evaluateSchemaHandler,
} = require('../controllers/schemaController');

const router = express.Router();

router.get('/schema/example', getSchemaExample);
router.get('/schema/memory/status', getSchemaMemoryStatus);
router.post('/schema/generate', createSchema);
router.post('/schema/augment', augmentSchemaHandler);
router.post('/schema/edit', editSchemaHandler);
router.post('/schema/openapi', openApiHandler);
router.post('/schema/evaluate', evaluateSchemaHandler);

module.exports = router;
