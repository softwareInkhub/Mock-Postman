const MAX_PREVIEW_LENGTH = 2000;

const isPlainObject = (value) =>
  Object.prototype.toString.call(value) === '[object Object]';

const toPreview = (value) => {
  if (value === null || value === undefined) {
    return '';
  }

  if (typeof value === 'string') {
    return value.slice(0, MAX_PREVIEW_LENGTH);
  }

  if (Buffer.isBuffer(value)) {
    return value.toString('utf-8', 0, MAX_PREVIEW_LENGTH);
  }

  try {
    return JSON.stringify(value, null, 2).slice(0, MAX_PREVIEW_LENGTH);
  } catch (error) {
    return String(value).slice(0, MAX_PREVIEW_LENGTH);
  }
};

const getResponseSize = (data, headers = {}) => {
  const contentLengthHeader = headers['content-length'];

  if (contentLengthHeader) {
    const parsedSize = Number(contentLengthHeader);

    if (!Number.isNaN(parsedSize)) {
      return parsedSize;
    }
  }

  if (typeof data === 'string') {
    return Buffer.byteLength(data, 'utf-8');
  }

  if (Buffer.isBuffer(data)) {
    return data.length;
  }

  try {
    return Buffer.byteLength(JSON.stringify(data), 'utf-8');
  } catch (error) {
    return 0;
  }
};

const normalizeHeaders = (headers = {}) => {
  if (!headers || typeof headers !== 'object') {
    return {};
  }

  return Object.entries(headers).reduce((accumulator, [key, value]) => {
    accumulator[String(key).toLowerCase()] = value;
    return accumulator;
  }, {});
};

const formatSuccessResponse = ({
  axiosResponse,
  durationMs,
  requestConfig,
}) => {
  const headers = normalizeHeaders(axiosResponse.headers);

  return {
    success: true,
    request: {
      url: requestConfig.url,
      method: requestConfig.method.toUpperCase(),
      params: requestConfig.params || {},
      headers: requestConfig.headers || {},
      body:
        requestConfig.data && isPlainObject(requestConfig.data)
          ? requestConfig.data
          : requestConfig.data || null,
      timeout: requestConfig.timeout,
    },
    response: {
      status: axiosResponse.status,
      statusText: axiosResponse.statusText,
      headers,
      data: axiosResponse.data,
      meta: {
        durationMs,
        sizeBytes: getResponseSize(axiosResponse.data, headers),
        contentType: headers['content-type'] || null,
      },
      preview: toPreview(axiosResponse.data),
    },
  };
};

const formatErrorResponse = ({
  error,
  durationMs,
  requestConfig,
}) => {
  const hasHttpResponse = Boolean(error.response);
  const responseHeaders = normalizeHeaders(error.response?.headers);
  const responseData = error.response?.data ?? null;

  return {
    success: false,
    request: {
      url: requestConfig.url,
      method: requestConfig.method.toUpperCase(),
      params: requestConfig.params || {},
      headers: requestConfig.headers || {},
      body:
        requestConfig.data && isPlainObject(requestConfig.data)
          ? requestConfig.data
          : requestConfig.data || null,
      timeout: requestConfig.timeout,
    },
    error: {
      message: error.message,
      code: error.code || null,
      isTimeout: error.code === 'ECONNABORTED',
      status: hasHttpResponse ? error.response.status : 502,
      statusText: hasHttpResponse ? error.response.statusText : 'Bad Gateway',
      headers: responseHeaders,
      data: responseData,
      meta: {
        durationMs,
        sizeBytes: getResponseSize(responseData, responseHeaders),
        contentType: responseHeaders['content-type'] || null,
      },
      preview: toPreview(responseData || error.message),
    },
  };
};

module.exports = {
  formatSuccessResponse,
  formatErrorResponse,
};
