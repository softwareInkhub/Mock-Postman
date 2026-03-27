const path = require('path');
require('dotenv').config({
  path: path.join(__dirname, '..', '.env'),
});

const express = require('express');
const cors = require('cors');
const requestRoutes = require('./routes/requestRoutes');
const llmRoutes = require('./routes/llmRoutes');
const schemaRoutes = require('./routes/schemaRoutes');

const app = express();
const PORT = Number(process.env.PORT) || 4000;
const publicDirectory = path.join(__dirname, 'public');
const frontendDistDirectory = path.join(__dirname, '..', '..', 'frontend', 'dist');

app.use(
  cors({
    origin: '*',
  })
);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(publicDirectory));
app.use('/studio', express.static(frontendDistDirectory));

app.use('/api', requestRoutes);
app.use('/api', llmRoutes);
app.use('/api', schemaRoutes);

app.get(/^\/studio(?:\/.*)?$/, (request, response) => {
  response.sendFile(path.join(frontendDistDirectory, 'index.html'));
});

app.use((error, request, response, next) => {
  const normalizedMessage = String(error.message || '').toLowerCase();
  const statusCode =
    normalizedMessage.includes('overloaded') ||
    normalizedMessage.includes('temporarily unavailable') ||
    normalizedMessage.includes('rate limit')
      ? 503
      : error.message?.includes('URL') ||
          error.message?.includes('method') ||
          error.message?.includes('prompt') ||
          error.message?.includes('schema')
        ? 400
        : 500;

  response.status(statusCode).json({
    success: false,
    error: {
      message: error.message || 'Unexpected server error.',
      status: statusCode,
    },
  });
});

app.listen(PORT, () => {
  console.log(`Mock Postman backend is running on port ${PORT}`);
});

module.exports = app;
