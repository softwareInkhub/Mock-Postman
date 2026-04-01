/**
 * Schema Builder Service  —  Deterministic Core Engine
 *
 * Strategy:
 *   1. Check domain confidence against DOMAIN_TEMPLATES (15 known domains)
 *      → If score >= 2: use domain template directly (known domain path)
 *   2. Otherwise: FEATURE COMPOSITION path
 *      → Detect all matching feature modules from featureModules.js
 *      → Merge their tables/collections, deduplicating by name
 *      → If no features matched either: extract concept nouns from prompt
 *        and generate generic tables from them
 *   3. Append extra entities (from prompt hints + sourceData keys)
 *   4. Wrap in the { architectures } contract
 *
 * This means "astrology dating app" → dating module + astrology module composed,
 * not "generic → users + items".
 */

const { DOMAIN_TEMPLATES, resolveDomain } = require("../data/domainTemplates");
const { FEATURE_MODULES, detectFeatures } = require("../data/featureModules");
const { parsePrompt } = require("./promptParserService");
const {
  buildGenericSqlTable,
  buildGenericNoSqlCollection,
} = require("./fieldTypeMapperService");

const SQL_ENGINES = new Set(["postgresql", "mysql", "sqlite", "sqlserver"]);
const NOSQL_ENGINES = new Set([
  "mongodb",
  "dynamodb",
  "firestore",
  "cassandra",
]);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const deepClone = (obj) => JSON.parse(JSON.stringify(obj));

const normalise = (text) =>
  String(text || "")
    .toLowerCase()
    .replace(/[_-]/g, " ")
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const ensureDescriptions = (architectures) =>
  architectures.map((arch) => {
    if (arch.database_type === "sql") {
      return {
        ...arch,
        tables: arch.tables.map((table) => ({
          ...table,
          description: table.description || `Stores ${table.name} records.`,
          columns: table.columns.map((col) => ({
            ...col,
            description:
              col.description || `${col.name} for the ${table.name} table.`,
          })),
        })),
      };
    }
    return {
      ...arch,
      collections: arch.collections.map((col) => ({
        ...col,
        description: col.description || `Stores ${col.name} documents.`,
        document_shape: col.document_shape.map((field) => ({
          ...field,
          description:
            field.description ||
            `${field.name} for the ${col.name} collection.`,
        })),
      })),
    };
  });

const resolveRequestedEngines = (requestedEngine) => {
  // 🧠 NEW: handle object input (dual mode)
  if (requestedEngine && typeof requestedEngine === "object") {
    return {
      sql: SQL_ENGINES.has(requestedEngine.sql)
        ? requestedEngine.sql
        : "postgresql",
      nosql: NOSQL_ENGINES.has(requestedEngine.nosql)
        ? requestedEngine.nosql
        : "mongodb",
    };
  }

  const normalized = String(requestedEngine || "")
    .trim()
    .toLowerCase();

  if (!normalized) {
    return {
      sql: "postgresql",
      nosql: "mongodb",
    };
  }

  return {
    sql: SQL_ENGINES.has(normalized) ? normalized : null,
    nosql: NOSQL_ENGINES.has(normalized) ? normalized : null,
  };
};

// ---------------------------------------------------------------------------
// Domain confidence scoring
// ---------------------------------------------------------------------------

/**
 * Returns the score of the best-matching domain for the given tokens.
 * Used to decide whether to use the domain template path or feature composition.
 */
const domainConfidenceScore = (tokens) => {
  const normalizedInput = tokens
    .map((k) => String(k).toLowerCase().trim())
    .filter((k) => k.length >= 3);

  let bestScore = 0;
  for (const [domainKey, template] of Object.entries(DOMAIN_TEMPLATES)) {
    if (domainKey === "generic") continue;
    const score = template.keywords.reduce((count, kw) => {
      return (
        count + (normalizedInput.some((input) => input.includes(kw)) ? 1 : 0)
      );
    }, 0);
    if (score > bestScore) bestScore = score;
  }
  return bestScore;
};

// ---------------------------------------------------------------------------
// Domain template path (known domains)
// ---------------------------------------------------------------------------

const buildFromDomainTemplate = (
  template,
  extraEntities,
  fieldHints,
  outputMode,
  requestedEngines,
) => {
  const architectures = [];

  if (outputMode === "sql" || outputMode === "both") {
    const tables = deepClone(template.sql.tables);
    const seen = new Set(tables.map((t) => t.name));
    for (const entity of extraEntities) {
      if (!seen.has(entity)) {
        tables.push(buildGenericSqlTable(entity, fieldHints));
        seen.add(entity);
      }
    }
    architectures.push({
      database_type: "sql",
      database_engine: requestedEngines.sql || template.sql.engine,
      use_case:
        "Best when strong relationships and transactional consistency matter.",
      tables,
    });
  }

  if (outputMode === "nosql" || outputMode === "both") {
    const collections = deepClone(template.nosql.collections);
    const seen = new Set(collections.map((c) => c.name));
    for (const entity of extraEntities) {
      if (!seen.has(entity)) {
        collections.push(buildGenericNoSqlCollection(entity, fieldHints));
        seen.add(entity);
      }
    }
    architectures.push({
      database_type: "nosql",
      database_engine: requestedEngines.nosql || template.nosql.engine,
      use_case:
        "Best when flexible document structures are more important than joins.",
      collections,
    });
  }

  return architectures;
};

// ---------------------------------------------------------------------------
// Feature composition path (novel/creative/multi-concept prompts)
// ---------------------------------------------------------------------------

/**
 * Merges tables from multiple feature modules, deduplicating by table name.
 * When two modules both define a `users` table, the first one wins.
 */
const mergeSqlTables = (moduleKeys) => {
  const seen = new Set();
  const tables = [];
  for (const key of moduleKeys) {
    const mod = FEATURE_MODULES[key];
    if (!mod?.sql?.tables) continue;
    for (const table of mod.sql.tables) {
      if (!seen.has(table.name)) {
        tables.push(deepClone(table));
        seen.add(table.name);
      }
    }
  }
  return { tables, seen };
};

const mergeNoSqlCollections = (moduleKeys) => {
  const seen = new Set();
  const collections = [];
  for (const key of moduleKeys) {
    const mod = FEATURE_MODULES[key];
    if (!mod?.nosql?.collections) continue;
    for (const col of mod.nosql.collections) {
      if (!seen.has(col.name)) {
        collections.push(deepClone(col));
        seen.add(col.name);
      }
    }
  }
  return { collections, seen };
};

/**
 * When no features match either, extract meaningful nouns from the prompt
 * and turn them into generic tables. This is the last-resort fallback.
 *
 * Extracts words that look like entities: 3+ chars, not stop words,
 * not verbs/adjectives in a curated stop list.
 */
const STOP_WORDS = new Set([
  "the",
  "and",
  "for",
  "with",
  "that",
  "this",
  "from",
  "into",
  "want",
  "need",
  "build",
  "make",
  "create",
  "design",
  "generate",
  "system",
  "backend",
  "frontend",
  "app",
  "application",
  "platform",
  "tool",
  "like",
  "where",
  "can",
  "should",
  "will",
  "have",
  "based",
  "using",
  "similar",
  "able",
  "also",
  "just",
  "each",
  "every",
  "more",
  "most",
  "such",
  "than",
  "then",
  "when",
  "which",
  "who",
  "how",
  "what",
  "why",
  "support",
  "manage",
  "allow",
  "enable",
  "include",
  "get",
  "use",
  "simple",
  "complex",
  "basic",
  "advanced",
  "new",
  "old",
  "best",
  "good",
]);

const extractConceptNouns = (text) => {
  const tokens = normalise(text).split(" ").filter(Boolean);
  return tokens.filter(
    (t) => t.length >= 4 && !STOP_WORDS.has(t) && !/^\d+$/.test(t),
  );
};

const buildFromFeatureComposition = (
  prompt,
  featureKeys,
  extraEntities,
  fieldHints,
  outputMode,
  requestedEngines,
) => {
  // If no features detected, extract concept nouns and make generic tables
  let sqlTables, sqlSeen, nosqlCollections, nosqlSeen;

  if (featureKeys.length === 0) {
    const concepts = extractConceptNouns(prompt);
    // Always have a users table as base
    const baseUsers = deepClone(FEATURE_MODULES.auth.sql.tables[0]);
    sqlTables = [baseUsers];
    sqlSeen = new Set(["users"]);
    nosqlCollections = [deepClone(FEATURE_MODULES.auth.nosql.collections[0])];
    nosqlSeen = new Set(["users"]);

    for (const concept of concepts.slice(0, 5)) {
      const tableName = concept.endsWith("s") ? concept : `${concept}s`;
      if (!sqlSeen.has(tableName)) {
        sqlTables.push(buildGenericSqlTable(tableName, fieldHints));
        sqlSeen.add(tableName);
      }
      if (!nosqlSeen.has(tableName)) {
        nosqlCollections.push(
          buildGenericNoSqlCollection(tableName, fieldHints),
        );
        nosqlSeen.add(tableName);
      }
    }
  } else {
    ({ tables: sqlTables, seen: sqlSeen } = mergeSqlTables(featureKeys));
    ({ collections: nosqlCollections, seen: nosqlSeen } =
      mergeNoSqlCollections(featureKeys));

    // Ensure users table is always present
    if (!sqlSeen.has("users")) {
      sqlTables.unshift(deepClone(FEATURE_MODULES.auth.sql.tables[0]));
      sqlSeen.add("users");
    }
    if (!nosqlSeen.has("users")) {
      nosqlCollections.unshift(
        deepClone(FEATURE_MODULES.auth.nosql.collections[0]),
      );
      nosqlSeen.add("users");
    }
  }

  // Append extra entities
  for (const entity of extraEntities) {
    if (!sqlSeen.has(entity)) {
      sqlTables.push(buildGenericSqlTable(entity, fieldHints));
      sqlSeen.add(entity);
    }
    if (!nosqlSeen.has(entity)) {
      nosqlCollections.push(buildGenericNoSqlCollection(entity, fieldHints));
      nosqlSeen.add(entity);
    }
  }

  const architectures = [];

  if (outputMode === "sql" || outputMode === "both") {
    architectures.push({
      database_type: "sql",
      database_engine: requestedEngines.sql || "postgresql",
      use_case:
        "Best when strong relationships and transactional consistency matter.",
      tables: sqlTables,
    });
  }

  if (outputMode === "nosql" || outputMode === "both") {
    architectures.push({
      database_type: "nosql",
      database_engine: requestedEngines.nosql || "mongodb",
      use_case:
        "Best when flexible document structures are more important than joins.",
      collections: nosqlCollections,
    });
  }

  return architectures;
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

const MIXED_PROMPT_COMPONENTS = {
  // Ride hailing
  uber: { type: "domain", key: "ride_hailing" },
  ola: { type: "domain", key: "ride_hailing" },
  lyft: { type: "domain", key: "ride_hailing" },
  rapido: { type: "domain", key: "ride_hailing" },
  // Ecommerce
  amazon: { type: "domain", key: "ecommerce" },
  flipkart: { type: "domain", key: "ecommerce" },
  meesho: { type: "domain", key: "ecommerce" },
  shopify: { type: "domain", key: "ecommerce" },
  // Classifieds / C2C marketplace
  olx: { type: "domain", key: "marketplace" },
  craigslist: { type: "domain", key: "marketplace" },
  ebay: { type: "domain", key: "marketplace" },
  etsy: { type: "domain", key: "marketplace" },
  // Video
  youtube: { type: "domain", key: "video_streaming" },
  twitch: { type: "domain", key: "video_streaming" },
  // Social
  instagram: { type: "domain", key: "social_media" },
  twitter: { type: "domain", key: "social_media" },
  tiktok: { type: "domain", key: "social_media" },
  // Food
  zomato: { type: "domain", key: "food_delivery" },
  swiggy: { type: "domain", key: "food_delivery" },
  doordash: { type: "domain", key: "food_delivery" },
  // Fintech
  paytm: { type: "domain", key: "fintech_wallet" },
  phonepe: { type: "domain", key: "fintech_wallet" },
  stripe: { type: "feature", key: "payments" },
  // Chat
  whatsapp: { type: "domain", key: "chat_app" },
  telegram: { type: "domain", key: "chat_app" },
  // Booking
  airbnb: { type: "domain", key: "hotel_booking" },
  // Education
  udemy: { type: "domain", key: "learning_platform" },
  coursera: { type: "domain", key: "learning_platform" },
  // Music
  spotify: { type: "feature", key: "music" },
};

const detectPromptComponents = (tokens) => {
  const normalizedText = tokens.join(" ");
  const seen = new Set();
  const components = [];

  for (const [brand, component] of Object.entries(MIXED_PROMPT_COMPONENTS)) {
    if (!normalizedText.includes(brand)) {
      continue;
    }

    const identity = component.type + ":" + component.key;
    if (seen.has(identity)) {
      continue;
    }

    seen.add(identity);
    components.push(component);
  }

  return components;
};

const appendUniqueSqlTables = (targetTables, seen, tables) => {
  for (const table of tables || []) {
    if (seen.has(table.name)) {
      continue;
    }

    targetTables.push(deepClone(table));
    seen.add(table.name);
  }
};

const appendUniqueNoSqlCollections = (targetCollections, seen, collections) => {
  for (const collection of collections || []) {
    if (seen.has(collection.name)) {
      continue;
    }

    targetCollections.push(deepClone(collection));
    seen.add(collection.name);
  }
};

const buildFromPromptComponents = ({
  components,
  extraEntities,
  fieldHints,
  outputMode,
  requestedEngines,
}) => {
  const sqlTables = [];
  const sqlSeen = new Set();
  const noSqlCollections = [];
  const noSqlSeen = new Set();

  for (const component of components) {
    if (component.type === "domain") {
      const template = DOMAIN_TEMPLATES[component.key];
      if (!template) {
        continue;
      }

      appendUniqueSqlTables(sqlTables, sqlSeen, template.sql?.tables || []);
      appendUniqueNoSqlCollections(
        noSqlCollections,
        noSqlSeen,
        template.nosql?.collections || [],
      );
      continue;
    }

    const module = FEATURE_MODULES[component.key];
    if (!module) {
      continue;
    }

    appendUniqueSqlTables(sqlTables, sqlSeen, module.sql?.tables || []);
    appendUniqueNoSqlCollections(
      noSqlCollections,
      noSqlSeen,
      module.nosql?.collections || [],
    );
  }

  if (!sqlSeen.has("users")) {
    sqlTables.unshift(deepClone(FEATURE_MODULES.auth.sql.tables[0]));
    sqlSeen.add("users");
  }

  if (!noSqlSeen.has("users")) {
    noSqlCollections.unshift(
      deepClone(FEATURE_MODULES.auth.nosql.collections[0]),
    );
    noSqlSeen.add("users");
  }

  for (const entity of extraEntities) {
    if (!sqlSeen.has(entity)) {
      sqlTables.push(buildGenericSqlTable(entity, fieldHints));
      sqlSeen.add(entity);
    }

    if (!noSqlSeen.has(entity)) {
      noSqlCollections.push(buildGenericNoSqlCollection(entity, fieldHints));
      noSqlSeen.add(entity);
    }
  }

  const architectures = [];

  if (outputMode === "sql" || outputMode === "both") {
    architectures.push({
      database_type: "sql",
      database_engine: requestedEngines.sql || "postgresql",
      use_case:
        "Best when strong relationships and transactional consistency matter.",
      tables: sqlTables,
    });
  }

  if (outputMode === "nosql" || outputMode === "both") {
    architectures.push({
      database_type: "nosql",
      database_engine: requestedEngines.nosql || "mongodb",
      use_case:
        "Best when flexible document structures are more important than joins.",
      collections: noSqlCollections,
    });
  }

  return architectures;
};

/**
 * Builds a complete schema deterministically from a prompt + optional sourceData.
 */
const buildSchema = ({
  prompt,
  sourceData = null,
  outputMode: outputModeOverride,
  requestedEngine: engineOverride,
}) => {
  const parsed = parsePrompt(prompt, sourceData);

  const outputMode = outputModeOverride || parsed.outputMode;
  const requestedEnginesInput =
    engineOverride === undefined ? parsed.requestedEngine : engineOverride;

  const requestedEngines = resolveRequestedEngines(requestedEnginesInput);
  const allExtra = [
    ...new Set([...parsed.extraEntities, ...parsed.sourceEntities]),
  ];

  const tokens = normalise(prompt).split(" ").filter(Boolean);
  const confidence = domainConfidenceScore(tokens);
  const featuresUsed = detectFeatures(tokens);
  const promptComponents = detectPromptComponents(tokens);

  let architectures;
  let domainLabel;
  let compositionMode;

  if (promptComponents.length >= 2) {
    domainLabel = promptComponents
      .map((component) => component.key.replace(/_/g, " "))
      .join(" + ");
    compositionMode = "mixed_component_composition";
    architectures = buildFromPromptComponents({
      components: promptComponents,
      extraEntities: allExtra,
      fieldHints: parsed.fieldHints,
      outputMode,
      requestedEngines,
    });
  } else if (promptComponents.length === 1) {
    const [component] = promptComponents;

    if (component.type === "domain") {
      const template = DOMAIN_TEMPLATES[component.key];
      domainLabel = template.label;
      compositionMode = "brand_domain_override";
      architectures = buildFromDomainTemplate(
        template,
        allExtra,
        parsed.fieldHints,
        outputMode,
        requestedEngines,
      );
    } else {
      domainLabel = component.key.replace(/_/g, " ");
      compositionMode = "feature_composition";
      architectures = buildFromFeatureComposition(
        prompt,
        [component.key],
        allExtra,
        parsed.fieldHints,
        outputMode,
        requestedEngines,
      );
    }
  } else if (confidence >= 2) {
    const template = DOMAIN_TEMPLATES[parsed.domain];
    domainLabel = template.label;
    compositionMode = "domain_template";
    architectures = buildFromDomainTemplate(
      template,
      allExtra,
      parsed.fieldHints,
      outputMode,
      requestedEngines,
    );
  } else if (featuresUsed.length >= 2) {
    domainLabel = featuresUsed.join(" + ").replace(/_/g, " ");
    compositionMode = "feature_composition";
    architectures = buildFromFeatureComposition(
      prompt,
      featuresUsed,
      allExtra,
      parsed.fieldHints,
      outputMode,
      requestedEngines,
    );
  } else {
    domainLabel =
      featuresUsed.length > 0
        ? featuresUsed
            .map((k) => (FEATURE_MODULES[k] ? k.replace(/_/g, " ") : k))
            .join(" + ")
        : "custom";
    compositionMode =
      featuresUsed.length > 0 ? "feature_composition" : "concept_extraction";
    architectures = buildFromFeatureComposition(
      prompt,
      featuresUsed,
      allExtra,
      parsed.fieldHints,
      outputMode,
      requestedEngines,
    );
  }

  return {
    architectures: ensureDescriptions(architectures),
    meta: {
      domain: parsed.domain,
      domainLabel,
      compositionMode,
      featuresUsed:
        promptComponents.length > 0
          ? promptComponents.map((component) => component.key)
          : featuresUsed,
      outputMode,
      requestedEngine,
      extraEntities: allExtra,
      fieldHints: parsed.fieldHints,
      sourceEntities: parsed.sourceEntities,
      deterministic: true,
    },
  };
};

module.exports = { buildSchema };
