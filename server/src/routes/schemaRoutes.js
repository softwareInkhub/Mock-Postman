const express = require('express');
const { createSchema } = require('../controllers/schemaController');

const router = express.Router();

router.post('/schema/generate', createSchema);

module.exports = router;
