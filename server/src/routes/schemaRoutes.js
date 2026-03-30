const express = require('express');
const {
  createSchema,
  augmentSchemaHandler,
  editSchemaHandler,
  openApiHandler,
  getSchemaExample,
  getSchemaMemoryStatus,
} = require('../controllers/schemaController');

const router = express.Router();

router.get('/schema/example', getSchemaExample);
router.get('/schema/memory/status', getSchemaMemoryStatus);
router.post('/schema/generate', createSchema);
router.post('/schema/augment', augmentSchemaHandler);
router.post('/schema/edit', editSchemaHandler);
router.post('/schema/openapi', openApiHandler);

module.exports = router;
