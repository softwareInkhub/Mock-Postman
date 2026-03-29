/**
 * Prompt Parser Service
 *
 * Deterministically extracts structured intent from a free-text prompt:
 *   - Which domain it maps to
 *   - Which output mode (sql / nosql / both)
 *   - Any extra entities the user explicitly mentioned
 *   - Any field hints extracted from the prompt text
 *
 * No AI calls. Pure rules + keyword matching.
 */

const { DOMAIN_TEMPLATES, resolveDomain } = require('../data/domainTemplates');

// ---------------------------------------------------------------------------
// Normalisation helpers
// ---------------------------------------------------------------------------

const normalise = (text) =>
  String(text || '')
    .toLowerCase()
    .replace(/[_-]/g, ' ')
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const tokenise = (text) => normalise(text).split(' ').filter(Boolean);

// ---------------------------------------------------------------------------
// DB mode detection
// ---------------------------------------------------------------------------

const SQL_KEYWORDS = ['sql', 'postgresql', 'postgres', 'mysql', 'sqlite', 'sqlserver', 'relational', 'rdbms'];
const NOSQL_KEYWORDS = ['nosql', 'mongodb', 'mongo', 'dynamodb', 'firestore', 'cassandra', 'document database', 'document db'];

const SQL_ENGINES = { postgresql: 'postgresql', postgres: 'postgresql', mysql: 'mysql', sqlite: 'sqlite', sqlserver: 'sqlserver' };
const NOSQL_ENGINES = { mongodb: 'mongodb', mongo: 'mongodb', dynamodb: 'dynamodb', firestore: 'firestore', cassandra: 'cassandra' };

const detectOutputMode = (text) => {
  const norm = normalise(text);

  const sqlEngine = Object.keys(SQL_ENGINES).find((k) => norm.includes(k));
  if (sqlEngine) return { outputMode: 'sql', requestedEngine: SQL_ENGINES[sqlEngine] };

  const nosqlEngine = Object.keys(NOSQL_ENGINES).find((k) => norm.includes(k));
  if (nosqlEngine) return { outputMode: 'nosql', requestedEngine: NOSQL_ENGINES[nosqlEngine] };

  const hasSql = SQL_KEYWORDS.some((k) => norm.includes(k));
  const hasNosql = NOSQL_KEYWORDS.some((k) => norm.includes(k));

  if (hasSql && hasNosql) return { outputMode: 'both', requestedEngine: null };
  if (hasSql) return { outputMode: 'sql', requestedEngine: null };
  if (hasNosql) return { outputMode: 'nosql', requestedEngine: null };

  return { outputMode: 'both', requestedEngine: null };
};

// ---------------------------------------------------------------------------
// Domain detection
// ---------------------------------------------------------------------------

/**
 * Collects all candidate keywords from the prompt, then scores each domain.
 * Uses brand aliases (e.g. "uber" → ride hailing keywords) for boosting.
 */
const BRAND_ALIASES = {
  uber: ['ride', 'hailing', 'taxi', 'cab', 'driver', 'rider', 'trip'],
  ola: ['ride', 'hailing', 'taxi', 'driver', 'rider', 'trip'],
  zomato: ['food', 'delivery', 'restaurant', 'order', 'menu'],
  swiggy: ['food', 'delivery', 'restaurant', 'order', 'menu'],
  blinkit: ['grocery', 'quick commerce', 'dark store', 'inventory'],
  instamart: ['grocery', 'quick commerce', 'dark store', 'inventory'],
  whatsapp: ['chat', 'message', 'messaging', 'group', 'conversation'],
  telegram: ['chat', 'message', 'messaging', 'channel', 'group'],
  instagram: ['social', 'post', 'follow', 'feed', 'story'],
  facebook: ['social', 'post', 'follow', 'feed', 'group'],
  twitter: ['social', 'tweet', 'follow', 'feed', 'hashtag'],
  amazon: ['ecommerce', 'shop', 'product', 'order', 'cart', 'seller'],
  flipkart: ['ecommerce', 'shop', 'product', 'order', 'cart', 'seller'],
  airbnb: ['hotel', 'booking', 'property', 'host', 'guest', 'reservation'],
  youtube: ['video', 'streaming', 'creator', 'channel', 'upload', 'subscribe'],
  paytm: ['wallet', 'fintech', 'payment', 'transaction', 'transfer'],
  phonepe: ['wallet', 'fintech', 'payment', 'transaction', 'transfer'],
  udemy: ['course', 'lesson', 'instructor', 'learner', 'enroll'],
  coursera: ['course', 'lesson', 'instructor', 'learner', 'enroll'],
  jira: ['project', 'task', 'ticket', 'sprint', 'board'],
  trello: ['project', 'task', 'board', 'kanban'],
};

const expandWithAliases = (tokens) => {
  const expanded = [...tokens];
  for (const [brand, aliases] of Object.entries(BRAND_ALIASES)) {
    if (tokens.includes(brand)) {
      expanded.push(...aliases);
    }
  }
  return expanded;
};

const detectDomain = (text) => {
  const tokens = tokenise(text);
  const expanded = expandWithAliases(tokens);
  return resolveDomain(expanded);
};

// ---------------------------------------------------------------------------
// Extra entity extraction
// ---------------------------------------------------------------------------

/**
 * Common entity-like nouns that appear in prompts.
 * If the user says "include notifications" or "users can have subscriptions",
 * we surface those as extra entities to potentially add to the template.
 */
const ENTITY_HINTS = [
  'notification', 'notifications',
  'subscription', 'subscriptions',
  'payment', 'payments',
  'address', 'addresses',
  'review', 'reviews',
  'rating', 'ratings',
  'tag', 'tags',
  'category', 'categories',
  'attachment', 'attachments',
  'report', 'reports',
  'dashboard',
  'session', 'sessions',
  'token', 'tokens',
  'webhook', 'webhooks',
  'invoice', 'invoices',
  'coupon', 'coupons',
  'discount', 'discounts',
  'referral', 'referrals',
  'audit', 'audit log',
  'media',
  'file', 'files',
  'document', 'documents',
  'event', 'events',
  'schedule', 'schedules',
  'location', 'locations',
  'zone', 'zones',
  'region', 'regions',
  'role', 'roles',
  'permission', 'permissions',
];

const extractExtraEntities = (text, domainKey) => {
  const norm = normalise(text);
  const templateEntityNames = new Set(
    [
      ...(DOMAIN_TEMPLATES[domainKey]?.sql?.tables || []).map((t) => t.name),
      ...(DOMAIN_TEMPLATES[domainKey]?.nosql?.collections || []).map((c) => c.name),
    ].map(normalise)
  );

  const matched = ENTITY_HINTS
    .filter((hint) => {
      const normHint = normalise(hint);
      return norm.includes(normHint) && !templateEntityNames.has(normHint);
    })
    .map((hint) => normalise(hint).replace(/\s+/g, '_'));

  // Deduplicate: if both singular and plural matched, keep only the plural
  return matched.filter((entity, _i, arr) => {
    // Keep this entity only if no other matched entity starts with it
    // e.g. drop "notification" if "notifications" is also present
    return !arr.some((other) => other !== entity && other.startsWith(entity));
  });
};

// ---------------------------------------------------------------------------
// Field hint extraction
// ---------------------------------------------------------------------------

/**
 * Looks for field-like phrases in the prompt:
 *   "track latitude and longitude", "store phone number", "include email"
 * Returns a flat list of field name hints as snake_case strings.
 */
const FIELD_HINT_PATTERNS = [
  { pattern: /\b(email|e-mail)\b/i, field: 'email' },
  { pattern: /\b(phone|mobile|contact number)\b/i, field: 'phone' },
  { pattern: /\b(address(es)?)\b/i, field: 'address' },
  { pattern: /\b(latitude|lat)\b/i, field: 'latitude' },
  { pattern: /\b(longitude|lng|long)\b/i, field: 'longitude' },
  { pattern: /\b(location)\b/i, field: 'location' },
  { pattern: /\b(timestamp|created.?at|updated.?at)\b/i, field: 'created_at' },
  { pattern: /\b(price|cost|fare|amount|fee)\b/i, field: 'price' },
  { pattern: /\b(status)\b/i, field: 'status' },
  { pattern: /\b(description)\b/i, field: 'description' },
  { pattern: /\b(image|photo|avatar|picture)\b/i, field: 'image_url' },
  { pattern: /\b(rating|score|stars)\b/i, field: 'rating' },
  { pattern: /\b(password|hash)\b/i, field: 'password_hash' },
  { pattern: /\b(token)\b/i, field: 'token' },
  { pattern: /\b(role)\b/i, field: 'role' },
  { pattern: /\b(slug)\b/i, field: 'slug' },
  { pattern: /\b(title)\b/i, field: 'title' },
  { pattern: /\b(name)\b/i, field: 'name' },
];

const extractFieldHints = (text) => {
  const found = new Set();
  for (const { pattern, field } of FIELD_HINT_PATTERNS) {
    if (pattern.test(text)) found.add(field);
  }
  return [...found];
};

// ---------------------------------------------------------------------------
// Source data entity extraction
// ---------------------------------------------------------------------------

/**
 * If the user provided a sourceData JSON object, extract the top-level keys
 * as likely entity names.
 */
const extractSourceDataEntities = (sourceData) => {
  if (!sourceData || typeof sourceData !== 'object' || Array.isArray(sourceData)) return [];
  return Object.keys(sourceData).map((key) => normalise(key).replace(/\s+/g, '_'));
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Parses a free-text prompt (and optional sourceData) into a structured
 * ParsedIntent object that the schema builder can act on deterministically.
 *
 * @param {string} prompt
 * @param {object|null} sourceData
 * @returns {ParsedIntent}
 *
 * ParsedIntent shape:
 * {
 *   domain: string,               // e.g. 'food_delivery'
 *   outputMode: string,           // 'sql' | 'nosql' | 'both'
 *   requestedEngine: string|null, // e.g. 'postgresql' or null
 *   extraEntities: string[],      // entity names not in the template
 *   fieldHints: string[],         // field names mentioned in prompt
 *   sourceEntities: string[],     // top-level keys from sourceData
 * }
 */
const parsePrompt = (prompt, sourceData = null) => {
  const text = String(prompt || '');

  const domain = detectDomain(text);
  const { outputMode, requestedEngine } = detectOutputMode(text);
  const extraEntities = extractExtraEntities(text, domain);
  const fieldHints = extractFieldHints(text);
  const sourceEntities = extractSourceDataEntities(sourceData);

  return {
    domain,
    outputMode,
    requestedEngine,
    extraEntities,
    fieldHints,
    sourceEntities,
  };
};

module.exports = { parsePrompt };

