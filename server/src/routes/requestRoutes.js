const express = require('express');
const {
  getHealth,
  sendRequest,
} = require('../controllers/requestController');

const router = express.Router();

router.get('/health', getHealth);
router.post('/requests/send', sendRequest);

module.exports = router;
