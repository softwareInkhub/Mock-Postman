const axios = require('axios');
const {
  formatSuccessResponse,
  formatErrorResponse,
} = require('../utils/formatResponse');

const SUPPORTED_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'];
const DEFAULT_TIMEOUT = 15000;
const MAX_TIMEOUT = 60000;
const HOP_BY_HOP_HEADERS = new Set([
  'host',
  'connection',
  'content-length',
  'transfer-encoding',
  'accept-encoding',
]);

const isPlainObject = (value) =>
  Object.prototype.toString.call(value) === '[object Object]';

const sanitizeHeaders = (headers = {}) => {
  if (!isPlainObject(headers)) {
    return {};
  }

  return Object.entries(headers).reduce((accumulator, [key, value]) => {
    const normalizedKey = String(key).trim().toLowerCase();

    if (!normalizedKey || HOP_BY_HOP_HEADERS.has(normalizedKey)) {
      return accumulator;
    }

    accumulator[normalizedKey] = String(value);
    return accumulator;
  }, {});
};

const sanitizeParams = (params = {}) => {
  if (!isPlainObject(params)) {
    return {};
  }

  return Object.entries(params).reduce((accumulator, [key, value]) => {
    if (value === undefined || value === null || key === '') {
      return accumulator;
    }

    accumulator[key] = value;
    return accumulator;
  }, {});
};

const normalizeTimeout = (timeout) => {
  const numericTimeout = Number(timeout);

  if (Number.isNaN(numericTimeout) || numericTimeout <= 0) {
    return DEFAULT_TIMEOUT;
  }

  return Math.min(numericTimeout, MAX_TIMEOUT);
};

const validateUrl = (url) => {
  if (!url || typeof url !== 'string') {
    throw new Error('A target URL is required.');
  }

  let parsedUrl;

  try {
    parsedUrl = new URL(url);
  } catch (error) {
    throw new Error('The target URL is invalid.');
  }

  if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
    throw new Error('Only HTTP and HTTPS protocols are supported.');
  }

  return parsedUrl.toString();
};

const buildRequestConfig = (payload = {}) => {
  const method = String(payload.method || 'GET').toUpperCase();

  if (!SUPPORTED_METHODS.includes(method)) {
    throw new Error(
      `Unsupported method "${method}". Supported methods: ${SUPPORTED_METHODS.join(', ')}.`
    );
  }

  const url = validateUrl(payload.url);
  const headers = sanitizeHeaders(payload.headers);
  const params = sanitizeParams(payload.params);
  const timeout = normalizeTimeout(payload.timeout);
  const hasBody = !['GET', 'HEAD'].includes(method);
  const requestData = hasBody ? payload.body ?? null : undefined;

  return {
    method,
    url,
    headers,
    params,
    timeout,
    data: requestData,
    responseType: 'arraybuffer',
    validateStatus: () => true,
    maxBodyLength: Infinity,
    maxContentLength: Infinity,
  };
};

const parseResponseData = (data, headers = {}) => {
  const contentType = String(headers['content-type'] || '').toLowerCase();
  const buffer = Buffer.isBuffer(data) ? data : Buffer.from(data);

  if (contentType.includes('application/json')) {
    try {
      return JSON.parse(buffer.toString('utf-8'));
    } catch (error) {
      return buffer.toString('utf-8');
    }
  }

  if (
    contentType.startsWith('text/') ||
    contentType.includes('application/xml') ||
    contentType.includes('application/javascript') ||
    contentType.includes('application/x-www-form-urlencoded')
  ) {
    return buffer.toString('utf-8');
  }

  return buffer.toString('base64');
};

const executeRequest = async (payload) => {
  const requestConfig = buildRequestConfig(payload);
  const startedAt = Date.now();

  try {
    const axiosResponse = await axios(requestConfig);
    const durationMs = Date.now() - startedAt;
    const parsedData = parseResponseData(axiosResponse.data, axiosResponse.headers);

    return {
      statusCode: axiosResponse.status,
      body: formatSuccessResponse({
        axiosResponse: {
          ...axiosResponse,
          data: parsedData,
        },
        durationMs,
        requestConfig,
      }),
    };
  } catch (error) {
    const durationMs = Date.now() - startedAt;

    if (error.response) {
      error.response.data = parseResponseData(error.response.data, error.response.headers);
    }

    const formattedError = formatErrorResponse({
      error,
      durationMs,
      requestConfig,
    });

    return {
      statusCode: formattedError.error.status,
      body: formattedError,
    };
  }
};

module.exports = {
  executeRequest,
  SUPPORTED_METHODS,
};
