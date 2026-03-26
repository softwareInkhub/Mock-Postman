const path = require('path');
require('dotenv').config({
  path: path.join(__dirname, '..', '..', '.env'),
});

const axios = require('axios');

const DEFAULT_TIMEOUT = 60000;
const DEFAULT_PROVIDER = 'anthropic';

const DEFAULT_OLLAMA_BASE_URL = 'http://localhost:11434';
const DEFAULT_OLLAMA_MODEL = 'phi3:mini';

const DEFAULT_ANTHROPIC_BASE_URL = 'https://api.anthropic.com';
const DEFAULT_ANTHROPIC_VERSION = '2023-06-01';
const DEFAULT_ANTHROPIC_MODEL = 'claude-sonnet-4-20250514';
const DEFAULT_ANTHROPIC_MAX_TOKENS = 1024;

const isPlainObject = (value) =>
  Object.prototype.toString.call(value) === '[object Object]';

const normalizeBaseUrl = (baseUrl, fallback) => String(baseUrl || fallback).replace(/\/+$/, '');

const extractAnthropicText = (content = []) =>
  Array.isArray(content)
    ? content
        .filter((item) => item?.type === 'text' && typeof item.text === 'string')
        .map((item) => item.text)
        .join('\n')
    : '';

const buildBasePayload = (payload = {}) => {
  const prompt = String(payload.prompt || '').trim();

  if (!prompt) {
    throw new Error('A prompt is required.');
  }

  return {
    prompt,
    system: payload.system ? String(payload.system) : undefined,
    options: isPlainObject(payload.options) ? payload.options : undefined,
    timeout:
      Number(payload.timeout) > 0 ? Number(payload.timeout) : DEFAULT_TIMEOUT,
  };
};

const buildOllamaPayload = (payload = {}) => {
  const requestPayload = buildBasePayload(payload);

  return {
    ...requestPayload,
    provider: 'ollama',
    model: String(payload.model || process.env.OLLAMA_MODEL || DEFAULT_OLLAMA_MODEL).trim(),
    format: payload.format ? payload.format : undefined,
    stream: false,
  };
};

const buildAnthropicPayload = (payload = {}) => {
  const requestPayload = buildBasePayload(payload);
  const apiKey = String(process.env.ANTHROPIC_API_KEY || '').trim();

  if (!apiKey || apiKey === 'replace_with_your_anthropic_api_key') {
    throw new Error('Anthropic API key is missing. Set ANTHROPIC_API_KEY in your environment.');
  }

  return {
    ...requestPayload,
    provider: 'anthropic',
    apiKey,
    baseUrl: normalizeBaseUrl(process.env.ANTHROPIC_API_BASE_URL, DEFAULT_ANTHROPIC_BASE_URL),
    version: String(process.env.ANTHROPIC_VERSION || DEFAULT_ANTHROPIC_VERSION).trim(),
    model: String(payload.model || process.env.ANTHROPIC_MODEL || DEFAULT_ANTHROPIC_MODEL).trim(),
    maxTokens: Number(payload.maxTokens || process.env.ANTHROPIC_MAX_TOKENS) > 0
      ? Number(payload.maxTokens || process.env.ANTHROPIC_MAX_TOKENS)
      : DEFAULT_ANTHROPIC_MAX_TOKENS,
  };
};

const generateWithOllama = async (payload = {}) => {
  const requestPayload = buildOllamaPayload(payload);
  const baseUrl = normalizeBaseUrl(process.env.OLLAMA_BASE_URL, DEFAULT_OLLAMA_BASE_URL);
  const startedAt = Date.now();

  try {
    const response = await axios.post(
      `${baseUrl}/api/generate`,
      {
        model: requestPayload.model,
        prompt: requestPayload.prompt,
        system: requestPayload.system,
        format: requestPayload.format,
        options: requestPayload.options,
        stream: requestPayload.stream,
      },
      {
        timeout: requestPayload.timeout,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    return {
      success: true,
      provider: 'ollama',
      model: response.data.model || requestPayload.model,
      prompt: requestPayload.prompt,
      system: requestPayload.system || null,
      response: response.data.response || '',
      raw: response.data,
      meta: {
        baseUrl,
        durationMs: Date.now() - startedAt,
        done: response.data.done ?? true,
        totalDuration: response.data.total_duration ?? null,
        loadDuration: response.data.load_duration ?? null,
        promptEvalCount: response.data.prompt_eval_count ?? null,
        evalCount: response.data.eval_count ?? null,
      },
    };
  } catch (error) {
    const status = error.response?.status || 502;
    const message =
      error.response?.data?.error ||
      error.message ||
      'Failed to reach the Ollama server.';

    return {
      success: false,
      provider: 'ollama',
      model: requestPayload.model,
      prompt: requestPayload.prompt,
      error: {
        message,
        status,
        details: error.response?.data || null,
      },
      meta: {
        baseUrl,
        durationMs: Date.now() - startedAt,
      },
    };
  }
};

const generateWithAnthropic = async (payload = {}) => {
  const requestPayload = buildAnthropicPayload(payload);
  const startedAt = Date.now();

  try {
    const response = await axios.post(
      `${requestPayload.baseUrl}/v1/messages`,
      {
        model: requestPayload.model,
        max_tokens: requestPayload.maxTokens,
        system: requestPayload.system,
        messages: [
          {
            role: 'user',
            content: requestPayload.prompt,
          },
        ],
      },
      {
        timeout: requestPayload.timeout,
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': requestPayload.apiKey,
          'anthropic-version': requestPayload.version,
        },
      }
    );

    return {
      success: true,
      provider: 'anthropic',
      model: response.data.model || requestPayload.model,
      prompt: requestPayload.prompt,
      system: requestPayload.system || null,
      response: extractAnthropicText(response.data.content),
      raw: response.data,
      meta: {
        baseUrl: requestPayload.baseUrl,
        durationMs: Date.now() - startedAt,
        stopReason: response.data.stop_reason || null,
        inputTokens: response.data.usage?.input_tokens ?? null,
        outputTokens: response.data.usage?.output_tokens ?? null,
      },
    };
  } catch (error) {
    const status = error.response?.status || 502;
    const message =
      error.response?.data?.error?.message ||
      error.response?.data?.error ||
      error.message ||
      'Failed to reach the Anthropic API.';

    return {
      success: false,
      provider: 'anthropic',
      model: requestPayload.model,
      prompt: requestPayload.prompt,
      error: {
        message,
        status,
        details: error.response?.data || null,
      },
      meta: {
        baseUrl: requestPayload.baseUrl,
        durationMs: Date.now() - startedAt,
      },
    };
  }
};

const generateText = async (payload = {}) => {
  const provider = String(payload.provider || process.env.LLM_PROVIDER || DEFAULT_PROVIDER)
    .trim()
    .toLowerCase();

  if (provider === 'ollama') {
    return generateWithOllama(payload);
  }

  if (provider === 'anthropic') {
    return generateWithAnthropic(payload);
  }

  throw new Error(`Unsupported LLM provider "${provider}".`);
};

module.exports = {
  generateText,
};
