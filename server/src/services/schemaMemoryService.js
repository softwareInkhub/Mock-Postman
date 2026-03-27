const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { SCHEMA_EXAMPLES } = require('../data/schemaExampleLibrary');

let langChainModules = null;
let lastExampleId = null;

const MEMORY_FILE_PATH = path.join(__dirname, '..', 'data', 'schema-memory.json');
const VECTOR_DIMENSION = 96;
const DEFAULT_MEMORY_LIMIT = 2;
const MIN_RELEVANCE_SCORE = 0.18;

const BRAND_ALIASES = {
  uber: 'ride hailing taxi booking riders drivers trips fare payments',
  ola: 'ride hailing taxi booking riders drivers trips fare payments',
  zomato: 'food delivery restaurants menus orders riders payments reviews',
  swiggy: 'food delivery restaurants menus orders riders payments reviews',
  blinkit: 'quick commerce grocery dark store inventory delivery slots substitutions',
  instamart: 'quick commerce grocery dark store inventory delivery slots substitutions',
  whatsapp: 'chat messaging direct messages groups media attachments read receipts',
  telegram: 'chat messaging direct messages groups channels media attachments',
  instagram: 'social media posts followers likes comments reels direct messages',
  facebook: 'social media posts followers likes comments pages groups messages',
  amazon: 'ecommerce marketplace catalog carts orders payments warehouses shipments returns',
  flipkart: 'ecommerce marketplace catalog carts orders payments warehouses shipments returns',
  airbnb: 'property listing booking reservations hosts guests availability reviews payments',
  youtube: 'video streaming creators channels uploads playlists comments subscriptions reactions',
  paytm: 'wallet fintech payments transfers merchants bank accounts kyc transactions',
  phonepe: 'wallet fintech payments transfers merchants bank accounts kyc transactions',
};

const tryLoadLangChain = () => {
  if (langChainModules !== null) {
    return langChainModules;
  }

  try {
    // Lazy-load so the server still runs if dependencies are not installed yet.
    const { MemoryVectorStore } = require('langchain/vectorstores/memory');
    const { Embeddings } = require('@langchain/core/embeddings');
    class DeterministicEmbeddings extends Embeddings {
      async embedDocuments(documents) {
        return documents.map((document) => textToVector(document));
      }

      async embedQuery(document) {
        return textToVector(document);
      }
    }

    langChainModules = {
      MemoryVectorStore,
      embeddings: new DeterministicEmbeddings(),
    };
  } catch (error) {
    langChainModules = false;
  }

  return langChainModules;
};

const ensureMemoryFile = () => {
  const directory = path.dirname(MEMORY_FILE_PATH);

  if (!fs.existsSync(directory)) {
    fs.mkdirSync(directory, { recursive: true });
  }

  if (!fs.existsSync(MEMORY_FILE_PATH)) {
    fs.writeFileSync(MEMORY_FILE_PATH, '[]', 'utf8');
  }
};

const safeParseJson = (value, fallback) => {
  try {
    return JSON.parse(value);
  } catch (error) {
    return fallback;
  }
};

const readPersistedMemories = () => {
  ensureMemoryFile();
  return safeParseJson(fs.readFileSync(MEMORY_FILE_PATH, 'utf8'), []);
};

const writePersistedMemories = (entries) => {
  ensureMemoryFile();
  fs.writeFileSync(MEMORY_FILE_PATH, JSON.stringify(entries, null, 2), 'utf8');
};

const normalizeWhitespace = (value) =>
  String(value || '')
    .toLowerCase()
    .replace(/[_-]/g, ' ')
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const tokenize = (value) =>
  normalizeWhitespace(value)
    .split(' ')
    .filter(Boolean);

const hashToken = (token) => {
  const hash = crypto.createHash('sha256').update(token).digest();
  return hash.readUInt32BE(0);
};

const textToVector = (value) => {
  const vector = new Array(VECTOR_DIMENSION).fill(0);
  const tokens = tokenize(value);

  if (!tokens.length) {
    return vector;
  }

  tokens.forEach((token) => {
    const index = hashToken(token) % VECTOR_DIMENSION;
    vector[index] += 1;
  });

  const magnitude = Math.sqrt(vector.reduce((sum, current) => sum + current * current, 0));
  return magnitude
    ? vector.map((current) => Number((current / magnitude).toFixed(8)))
    : vector;
};

const cosineSimilarity = (left, right) => {
  const length = Math.max(left.length, right.length);
  let total = 0;

  for (let index = 0; index < length; index += 1) {
    total += (left[index] || 0) * (right[index] || 0);
  }

  return total;
};

const compactJson = (value) => JSON.stringify(value ?? null);

const summarizeSchema = (schema) => {
  const architectures = Array.isArray(schema?.architectures) ? schema.architectures : [];

  return architectures
    .map((architecture) => {
      if (architecture.database_type === 'sql') {
        return `SQL ${architecture.database_engine}: ${String(
          (architecture.tables || []).map((table) => table.name).join(', ')
        )}`;
      }

      return `NoSQL ${architecture.database_engine}: ${String(
        (architecture.collections || []).map((collection) => collection.name).join(', ')
      )}`;
    })
    .join(' | ');
};

const summarizeSourceData = (sourceData) => {
  if (!sourceData || typeof sourceData !== 'object') {
    return '';
  }

  return Object.entries(sourceData)
    .slice(0, 5)
    .map(([key, value]) => {
      if (Array.isArray(value) && value.length > 0 && value[0] && typeof value[0] === 'object') {
        return `${key}: ${Object.keys(value[0]).slice(0, 6).join(', ')}`;
      }

      if (value && typeof value === 'object') {
        return `${key}: ${Object.keys(value).slice(0, 6).join(', ')}`;
      }

      return `${key}: value`;
    })
    .join(' | ');
};

const extractSchemaInsights = (schema) => {
  const architectures = Array.isArray(schema?.architectures) ? schema.architectures : [];
  const entityNames = [];
  const relationshipHints = [];

  architectures.forEach((architecture) => {
    if (architecture.database_type === 'sql') {
      (architecture.tables || []).forEach((table) => {
        entityNames.push(table.name);
        (table.columns || []).forEach((column) => {
          if (column.foreign_key) {
            relationshipHints.push(`${table.name}.${column.name} -> ${column.foreign_key}`);
          }
        });
      });
      return;
    }

    (architecture.collections || []).forEach((collection) => {
      entityNames.push(collection.name);
    });
  });

  return {
    coreEntities: entityNames.slice(0, 8),
    relationshipHints: relationshipHints.slice(0, 8),
  };
};

const buildDomainSummary = ({ title, prompt, sourceData }) => {
  const normalizedPrompt = normalizeWhitespace(prompt);
  const sourceSummary = summarizeSourceData(sourceData);
  const promptSummary = normalizedPrompt
    .split(' ')
    .slice(0, 22)
    .join(' ');

  return `${title || 'schema'}: ${promptSummary}${sourceSummary ? ` | sample fields: ${sourceSummary}` : ''}`;
};

const buildEntryContent = (entry) => {
  return [
    `title: ${entry.title || entry.id || 'schema memory'}`,
    `prompt: ${entry.prompt || ''}`,
    `tags: ${Array.isArray(entry.tags) ? entry.tags.join(', ') : ''}`,
    `keywords: ${entry.queryExpansion || ''}`,
    `domain_summary: ${entry.domainSummary || ''}`,
    `source_summary: ${entry.sourceSummary || ''}`,
    `entities: ${(entry.coreEntities || []).join(', ')}`,
    `relationships: ${(entry.relationshipHints || []).join(', ')}`,
    `schema_summary: ${entry.schemaSummary || ''}`,
  ].join('\n');
};

const inferQueryExpansion = ({ prompt, sourceData }) => {
  const normalizedPrompt = normalizeWhitespace(prompt);
  const matchedAliases = Object.entries(BRAND_ALIASES)
    .filter(([brand]) => normalizedPrompt.includes(brand))
    .map(([, expansion]) => expansion);

  const sourceKeywords = sourceData ? normalizeWhitespace(compactJson(sourceData)) : '';

  return [normalizedPrompt, ...matchedAliases, sourceKeywords].filter(Boolean).join(' ');
};

const buildSeedEntries = () =>
  SCHEMA_EXAMPLES.map((example) => ({
    id: `seed_${example.id}`,
    type: 'seed',
    title: example.title,
    prompt: example.prompt,
    tags: example.tags,
    sourceData: example.sourceData,
    sourceSummary: summarizeSourceData(example.sourceData),
    domainSummary: buildDomainSummary({
      title: example.title,
      prompt: example.prompt,
      sourceData: example.sourceData,
    }),
    queryExpansion: inferQueryExpansion({
      prompt: example.prompt,
      sourceData: example.sourceData,
    }),
    schema: null,
    schemaSummary: '',
    coreEntities: Object.keys(example.sourceData || {}),
    relationshipHints: [],
    createdAt: 'seeded',
  }));

const getAllMemoryEntries = () => [...buildSeedEntries(), ...readPersistedMemories()];

const pickDistinctEntries = (results, limit) => {
  const seenIds = new Set();
  const selected = [];

  results.forEach((result) => {
    if (selected.length >= limit) {
      return;
    }

    if (seenIds.has(result.entry.id)) {
      return;
    }

    seenIds.add(result.entry.id);
    selected.push(result);
  });

  return selected;
};

const searchWithFallback = ({ entries, queryText, limit }) => {
  const queryVector = textToVector(queryText);

  const ranked = entries
    .map((entry) => {
      const entryText = buildEntryContent(entry);
      return {
        entry,
        score: cosineSimilarity(queryVector, textToVector(entryText)),
      };
    })
    .filter((item) => item.score >= MIN_RELEVANCE_SCORE)
    .sort((left, right) => right.score - left.score);

  return pickDistinctEntries(ranked, limit);
};

const searchWithLangChain = async ({ entries, queryText, limit }) => {
  const loaded = tryLoadLangChain();

  if (!loaded) {
    return searchWithFallback({ entries, queryText, limit });
  }

  const texts = entries.map((entry) => buildEntryContent(entry));
  const metadatas = entries.map((entry) => ({
    entryId: entry.id,
  }));

  const store = await loaded.MemoryVectorStore.fromTexts(texts, metadatas, loaded.embeddings);
  const results = await store.similaritySearchWithScore(queryText, Math.max(limit * 2, 6));

  const entriesById = new Map(entries.map((entry) => [entry.id, entry]));
  const normalized = results
    .map(([document, score]) => ({
      entry: entriesById.get(document.metadata.entryId),
      score: typeof score === 'number' ? score : 0,
    }))
    .filter((item) => item.entry && item.score >= MIN_RELEVANCE_SCORE)
    .sort((left, right) => right.score - left.score);

  return pickDistinctEntries(normalized, limit);
};

const formatMemoryForPrompt = (result) => ({
  title: result.entry.title || result.entry.id,
  prompt: result.entry.prompt,
  tags: result.entry.tags || [],
  domainSummary: result.entry.domainSummary || '',
  sourceSummary: result.entry.sourceSummary || '',
  coreEntities: result.entry.coreEntities || [],
  relationshipHints: result.entry.relationshipHints || [],
  schemaSummary: result.entry.schemaSummary || '',
  relevanceScore: Number(result.score.toFixed(3)),
  type: result.entry.type,
});

const getRelevantSchemaMemories = async ({ prompt, sourceData, limit = DEFAULT_MEMORY_LIMIT }) => {
  const entries = getAllMemoryEntries();
  const queryText = inferQueryExpansion({ prompt, sourceData });

  if (!queryText) {
    return [];
  }

  const results = await searchWithLangChain({
    entries,
    queryText,
    limit,
  });

  return results.map(formatMemoryForPrompt);
};

const buildMemoryFingerprint = ({ prompt, sourceData, schemaSummary }) =>
  crypto
    .createHash('sha256')
    .update(`${normalizeWhitespace(prompt)}|${compactJson(sourceData)}|${schemaSummary}`)
    .digest('hex');

const storeGeneratedSchemaMemory = ({ prompt, sourceData, schema, meta }) => {
  const schemaSummary = summarizeSchema(schema);
  const schemaInsights = extractSchemaInsights(schema);
  const persistedEntries = readPersistedMemories();
  const fingerprint = buildMemoryFingerprint({
    prompt,
    sourceData,
    schemaSummary,
  });

  if (persistedEntries.some((entry) => entry.fingerprint === fingerprint)) {
    return;
  }

  persistedEntries.unshift({
    id: `generated_${Date.now()}`,
    type: 'generated',
    title: meta?.title || 'Generated schema memory',
    prompt,
    tags: meta?.tags || [],
    sourceData: sourceData ?? null,
    sourceSummary: summarizeSourceData(sourceData),
    domainSummary: buildDomainSummary({
      title: meta?.title || 'Generated schema memory',
      prompt,
      sourceData,
    }),
    queryExpansion: inferQueryExpansion({ prompt, sourceData }),
    schema,
    schemaSummary,
    coreEntities: schemaInsights.coreEntities,
    relationshipHints: schemaInsights.relationshipHints,
    fingerprint,
    createdAt: new Date().toISOString(),
  });

  writePersistedMemories(persistedEntries.slice(0, 250));
};

const getRandomSchemaExample = () => {
  const candidates =
    SCHEMA_EXAMPLES.length > 1
      ? SCHEMA_EXAMPLES.filter((example) => example.id !== lastExampleId)
      : SCHEMA_EXAMPLES;

  const selected = candidates[Math.floor(Math.random() * candidates.length)];
  lastExampleId = selected.id;
  return selected;
};

const getRetrieverStrategy = () =>
  tryLoadLangChain() ? 'langchain_memory_vector_store' : 'local_similarity_fallback';

module.exports = {
  getRelevantSchemaMemories,
  getRandomSchemaExample,
  getRetrieverStrategy,
  storeGeneratedSchemaMemory,
};
