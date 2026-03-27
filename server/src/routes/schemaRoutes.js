const express = require('express');
const { createSchema, getSchemaExample } = require('../controllers/schemaController');

const router = express.Router();

router.get('/schema/example', getSchemaExample);
router.post('/schema/generate', createSchema);

module.exports = router;
