const express = require('express');
const { generateCompletion } = require('../controllers/llmController');

const router = express.Router();

router.post('/llm/generate', generateCompletion);

module.exports = router;
