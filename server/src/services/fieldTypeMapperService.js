/**
 * Field Type Mapper Service
 *
 * Maps field names to SQL and NoSQL types using deterministic rules.
 * Priority order:
 *   1. Exact name match
 *   2. Suffix pattern match  (e.g. anything ending in _id → uuid)
 *   3. Prefix pattern match  (e.g. is_ → boolean)
 *   4. Substring keyword     (e.g. "price" anywhere → decimal)
 *   5. Default fallback      (varchar / string)
 */

// ---------------------------------------------------------------------------
// Rule tables
// ---------------------------------------------------------------------------

/**
 * Exact field name → [sqlType, nosqlType]
 */
const EXACT_MAP = {
  id:               ['uuid',      'objectId'],
  _id:              ['uuid',      'objectId'],
  uuid:             ['uuid',      'string'],
  email:            ['varchar',   'string'],
  phone:            ['varchar',   'string'],
  mobile:           ['varchar',   'string'],
  password:         ['varchar',   'string'],
  password_hash:    ['varchar',   'string'],
  token:            ['text',      'string'],
  refresh_token:    ['text',      'string'],
  access_token:     ['text',      'string'],
  name:             ['varchar',   'string'],
  full_name:        ['varchar',   'string'],
  first_name:       ['varchar',   'string'],
  last_name:        ['varchar',   'string'],
  username:         ['varchar',   'string'],
  title:            ['varchar',   'string'],
  slug:             ['varchar',   'string'],
  description:      ['text',      'string'],
  body:             ['text',      'string'],
  content:          ['text',      'string'],
  message:          ['text',      'string'],
  caption:          ['text',      'string'],
  bio:              ['text',      'string'],
  notes:            ['text',      'string'],
  address:          ['text',      'string'],
  street:           ['varchar',   'string'],
  city:             ['varchar',   'string'],
  state:            ['varchar',   'string'],
  country:          ['varchar',   'string'],
  zip:              ['varchar',   'string'],
  postal_code:      ['varchar',   'string'],
  status:           ['varchar',   'string'],
  type:             ['varchar',   'string'],
  role:             ['varchar',   'string'],
  category:         ['varchar',   'string'],
  currency:         ['varchar',   'string'],
  language:         ['varchar',   'string'],
  locale:           ['varchar',   'string'],
  timezone:         ['varchar',   'string'],
  url:              ['text',      'string'],
  image_url:        ['text',      'string'],
  avatar_url:       ['text',      'string'],
  thumbnail_url:    ['text',      'string'],
  cover_url:        ['text',      'string'],
  video_url:        ['text',      'string'],
  media_url:        ['text',      'string'],
  attachment_url:   ['text',      'string'],
  icon_url:         ['text',      'string'],
  price:            ['decimal',   'number'],
  amount:           ['decimal',   'number'],
  total:            ['decimal',   'number'],
  total_amount:     ['decimal',   'number'],
  subtotal:         ['decimal',   'number'],
  fare:             ['decimal',   'number'],
  fee:              ['decimal',   'number'],
  cost:             ['decimal',   'number'],
  balance:          ['decimal',   'number'],
  salary:           ['decimal',   'number'],
  discount:         ['decimal',   'number'],
  tax:              ['decimal',   'number'],
  revenue:          ['decimal',   'number'],
  value:            ['decimal',   'number'],
  weight:           ['decimal',   'number'],
  height:           ['decimal',   'number'],
  width:            ['decimal',   'number'],
  length:           ['decimal',   'number'],
  latitude:         ['decimal',   'number'],
  longitude:        ['decimal',   'number'],
  lat:              ['decimal',   'number'],
  lng:              ['decimal',   'number'],
  rating:           ['integer',   'number'],
  score:            ['integer',   'number'],
  stars:            ['integer',   'number'],
  count:            ['integer',   'number'],
  quantity:         ['integer',   'number'],
  stock:            ['integer',   'number'],
  age:              ['integer',   'number'],
  views:            ['integer',   'number'],
  likes:            ['integer',   'number'],
  order:            ['integer',   'number'],
  position:         ['integer',   'number'],
  duration:         ['integer',   'number'],
  duration_sec:     ['integer',   'number'],
  duration_ms:      ['integer',   'number'],
  page:             ['integer',   'number'],
  limit:            ['integer',   'number'],
  progress_pct:     ['integer',   'number'],
  is_active:        ['boolean',   'boolean'],
  is_verified:      ['boolean',   'boolean'],
  is_deleted:       ['boolean',   'boolean'],
  is_online:        ['boolean',   'boolean'],
  is_available:     ['boolean',   'boolean'],
  is_public:        ['boolean',   'boolean'],
  is_enabled:       ['boolean',   'boolean'],
  is_admin:         ['boolean',   'boolean'],
  verified:         ['boolean',   'boolean'],
  active:           ['boolean',   'boolean'],
  enabled:          ['boolean',   'boolean'],
  published:        ['boolean',   'boolean'],
  deleted:          ['boolean',   'boolean'],
  created_at:       ['timestamp', 'date'],
  updated_at:       ['timestamp', 'date'],
  deleted_at:       ['timestamp', 'date'],
  published_at:     ['timestamp', 'date'],
  started_at:       ['timestamp', 'date'],
  completed_at:     ['timestamp', 'date'],
  expired_at:       ['timestamp', 'date'],
  scheduled_at:     ['timestamp', 'date'],
  enrolled_at:      ['timestamp', 'date'],
  joined_at:        ['timestamp', 'date'],
  shipped_at:       ['timestamp', 'date'],
  issued_at:        ['timestamp', 'date'],
  last_login_at:    ['timestamp', 'date'],
  date_of_birth:    ['date',      'date'],
  birth_date:       ['date',      'date'],
  check_in:         ['date',      'date'],
  check_out:        ['date',      'date'],
  due_date:         ['date',      'date'],
  tags:             ['text',      'array'],
  permissions:      ['text',      'array'],
  roles:            ['text',      'array'],
  images:           ['text',      'array'],
  attachments:      ['text',      'array'],
  items:            ['text',      'array'],
  metadata:         ['jsonb',     'object'],
  settings:         ['jsonb',     'object'],
  preferences:      ['jsonb',     'object'],
  attributes:       ['jsonb',     'object'],
  vehicle:          ['jsonb',     'object'],
  location:         ['jsonb',     'object'],
  pickup:           ['jsonb',     'object'],
  dropoff:          ['jsonb',     'object'],
  address_details:  ['jsonb',     'object'],
};

/**
 * Suffix rules: field name ends with → [sqlType, nosqlType]
 * Checked after exact match fails.
 */
const SUFFIX_RULES = [
  { suffix: '_id',    sql: 'uuid',      nosql: 'objectId' },
  { suffix: '_ids',   sql: 'text',      nosql: 'array' },
  { suffix: '_at',    sql: 'timestamp', nosql: 'date' },
  { suffix: '_date',  sql: 'date',      nosql: 'date' },
  { suffix: '_url',   sql: 'text',      nosql: 'string' },
  { suffix: '_hash',  sql: 'varchar',   nosql: 'string' },
  { suffix: '_key',   sql: 'varchar',   nosql: 'string' },
  { suffix: '_token', sql: 'text',      nosql: 'string' },
  { suffix: '_code',  sql: 'varchar',   nosql: 'string' },
  { suffix: '_type',  sql: 'varchar',   nosql: 'string' },
  { suffix: '_name',  sql: 'varchar',   nosql: 'string' },
  { suffix: '_email', sql: 'varchar',   nosql: 'string' },
  { suffix: '_phone', sql: 'varchar',   nosql: 'string' },
  { suffix: '_count', sql: 'integer',   nosql: 'number' },
  { suffix: '_pct',   sql: 'integer',   nosql: 'number' },
  { suffix: '_sec',   sql: 'integer',   nosql: 'number' },
  { suffix: '_ms',    sql: 'integer',   nosql: 'number' },
  { suffix: '_amount', sql: 'decimal',  nosql: 'number' },
  { suffix: '_price', sql: 'decimal',   nosql: 'number' },
  { suffix: '_fee',   sql: 'decimal',   nosql: 'number' },
  { suffix: '_cost',  sql: 'decimal',   nosql: 'number' },
  { suffix: '_rate',  sql: 'decimal',   nosql: 'number' },
  { suffix: '_score', sql: 'integer',   nosql: 'number' },
  { suffix: '_list',  sql: 'text',      nosql: 'array' },
  { suffix: '_data',  sql: 'jsonb',     nosql: 'object' },
  { suffix: '_json',  sql: 'jsonb',     nosql: 'object' },
  { suffix: '_meta',  sql: 'jsonb',     nosql: 'object' },
];

/**
 * Prefix rules: field name starts with → [sqlType, nosqlType]
 */
const PREFIX_RULES = [
  { prefix: 'is_',    sql: 'boolean',   nosql: 'boolean' },
  { prefix: 'has_',   sql: 'boolean',   nosql: 'boolean' },
  { prefix: 'can_',   sql: 'boolean',   nosql: 'boolean' },
  { prefix: 'allow_', sql: 'boolean',   nosql: 'boolean' },
  { prefix: 'total_', sql: 'decimal',   nosql: 'number' },
  { prefix: 'max_',   sql: 'integer',   nosql: 'number' },
  { prefix: 'min_',   sql: 'integer',   nosql: 'number' },
  { prefix: 'num_',   sql: 'integer',   nosql: 'number' },
];

/**
 * Substring keyword rules: field name contains → [sqlType, nosqlType]
 * Checked last before fallback.
 */
const SUBSTRING_RULES = [
  { keyword: 'price',   sql: 'decimal',   nosql: 'number' },
  { keyword: 'amount',  sql: 'decimal',   nosql: 'number' },
  { keyword: 'balance', sql: 'decimal',   nosql: 'number' },
  { keyword: 'count',   sql: 'integer',   nosql: 'number' },
  { keyword: 'number',  sql: 'integer',   nosql: 'number' },
  { keyword: 'date',    sql: 'date',      nosql: 'date' },
  { keyword: 'time',    sql: 'timestamp', nosql: 'date' },
  { keyword: 'stamp',   sql: 'timestamp', nosql: 'date' },
  { keyword: 'url',     sql: 'text',      nosql: 'string' },
  { keyword: 'image',   sql: 'text',      nosql: 'string' },
  { keyword: 'photo',   sql: 'text',      nosql: 'string' },
  { keyword: 'avatar',  sql: 'text',      nosql: 'string' },
  { keyword: 'description', sql: 'text',  nosql: 'string' },
  { keyword: 'body',    sql: 'text',      nosql: 'string' },
  { keyword: 'content', sql: 'text',      nosql: 'string' },
  { keyword: 'token',   sql: 'text',      nosql: 'string' },
  { keyword: 'setting', sql: 'jsonb',     nosql: 'object' },
  { keyword: 'config',  sql: 'jsonb',     nosql: 'object' },
  { keyword: 'meta',    sql: 'jsonb',     nosql: 'object' },
  { keyword: 'detail',  sql: 'jsonb',     nosql: 'object' },
];

// ---------------------------------------------------------------------------
// Core lookup
// ---------------------------------------------------------------------------

/**
 * Returns { sqlType, nosqlType } for a given field name.
 */
const resolveFieldTypes = (fieldName) => {
  const name = String(fieldName || '').trim().toLowerCase();

  // 1. Exact match
  if (EXACT_MAP[name]) {
    const [sqlType, nosqlType] = EXACT_MAP[name];
    return { sqlType, nosqlType };
  }

  // 2. Suffix rules
  for (const rule of SUFFIX_RULES) {
    if (name.endsWith(rule.suffix)) {
      return { sqlType: rule.sql, nosqlType: rule.nosql };
    }
  }

  // 3. Prefix rules
  for (const rule of PREFIX_RULES) {
    if (name.startsWith(rule.prefix)) {
      return { sqlType: rule.sql, nosqlType: rule.nosql };
    }
  }

  // 4. Substring keywords
  for (const rule of SUBSTRING_RULES) {
    if (name.includes(rule.keyword)) {
      return { sqlType: rule.sql, nosqlType: rule.nosql };
    }
  }

  // 5. Default fallback
  return { sqlType: 'varchar', nosqlType: 'string' };
};

/**
 * Generates a generic extra table/collection for an entity name
 * that wasn't in the domain template. Uses common field patterns
 * plus whatever field hints were extracted from the prompt.
 */
const buildGenericSqlTable = (entityName, fieldHints = []) => {
  const columns = [
    { name: 'id', type: 'uuid', primary: true, required: true, description: `Primary key for the ${entityName} table.` },
    { name: 'created_at', type: 'timestamp', required: true, description: `Timestamp when the ${entityName} was created.` },
  ];

  for (const hint of fieldHints) {
    const { sqlType } = resolveFieldTypes(hint);
    columns.push({ name: hint, type: sqlType, required: false, description: `${hint} for the ${entityName}.` });
  }

  return {
    name: entityName,
    description: `Stores ${entityName} records.`,
    columns,
  };
};

const buildGenericNoSqlCollection = (entityName, fieldHints = []) => {
  const document_shape = [
    { name: '_id', type: 'objectId', required: true, description: `Primary identifier for the ${entityName} collection.` },
    { name: 'created_at', type: 'date', required: true, description: `Creation timestamp.` },
  ];

  for (const hint of fieldHints) {
    const { nosqlType } = resolveFieldTypes(hint);
    document_shape.push({ name: hint, type: nosqlType, required: false, description: `${hint} for the ${entityName}.` });
  }

  return {
    name: entityName,
    description: `Stores ${entityName} documents.`,
    document_shape,
  };
};

module.exports = {
  resolveFieldTypes,
  buildGenericSqlTable,
  buildGenericNoSqlCollection,
};
