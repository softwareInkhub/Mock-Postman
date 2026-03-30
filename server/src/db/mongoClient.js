const { MongoClient } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI || '';
const DB_NAME = process.env.MONGODB_DB_NAME || (() => {
  try {
    return new URL(MONGODB_URI).pathname.replace(/^\//, '') || 'brmh_schema';
  } catch {
    return 'brmh_schema';
  }
})();
const SCHEMA_MEMORY_COLLECTION =
  process.env.MONGODB_SCHEMA_MEMORY_COLLECTION || 'schema_memories';

let _client = null;
let _db = null;
let _connectionAttempted = false;
let _lastConnectionError = '';

const getDb = async () => {
  if (_db) return _db;
  if (_connectionAttempted) return null;

  _connectionAttempted = true;

  if (!MONGODB_URI) {
    _lastConnectionError = 'MONGODB_URI not set';
    console.warn('[MongoDB] MONGODB_URI not set - schema memory will use local JSON file.');
    return null;
  }

  try {
    _client = new MongoClient(MONGODB_URI, {
      serverSelectionTimeoutMS: 4000,
      connectTimeoutMS: 4000,
    });

    await _client.connect();
    _db = _client.db(DB_NAME);
    _lastConnectionError = '';

    const col = _db.collection(SCHEMA_MEMORY_COLLECTION);
    await col.createIndex({ fingerprint: 1 }, { unique: true, sparse: true });
    await col.createIndex({ createdAt: -1 });
    await col.createIndex({ type: 1 });

    console.log(`[MongoDB] Connected -> ${DB_NAME}`);
    return _db;
  } catch (err) {
    _lastConnectionError = err.message || 'Unknown MongoDB connection error';
    console.warn(`[MongoDB] Connection failed (${_lastConnectionError}) - falling back to JSON file.`);
    _client = null;
    _db = null;
    return null;
  }
};

const getMongoDebugState = () => ({
  configured: Boolean(MONGODB_URI),
  dbName: DB_NAME,
  collection: SCHEMA_MEMORY_COLLECTION,
  attempted: _connectionAttempted,
  connected: Boolean(_db),
  lastConnectionError: _lastConnectionError || null,
});

const closeDb = async () => {
  if (_client) {
    await _client.close();
  }
  _client = null;
  _db = null;
  _connectionAttempted = false;
  _lastConnectionError = '';
};

process.on('SIGINT', () => closeDb().then(() => process.exit(0)));
process.on('SIGTERM', () => closeDb().then(() => process.exit(0)));

module.exports = {
  getDb,
  closeDb,
  getMongoDebugState,
  SCHEMA_MEMORY_COLLECTION,
};
