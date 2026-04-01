/**
 * Schema Match Scoring Service
 *
 * Computes four scores that quantify how well an existing/generated schema
 * matches the user's prompt and retrieved memory schemas.
 *
 * Scores (all 0.0 – 1.0):
 *   semantic_score        — entity names in the schema overlap with prompt keywords
 *   structural_score      — table/collection structure similarity vs retrieved schemas
 *   relationship_density  — ratio of FK/ref fields to total fields (richness of links)
 *   overall_score         — weighted combination of the three above
 *
 * Thresholds (exported):
 *   SCORE_THRESHOLD       — overall_score below this triggers AI intervention
 */

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SCORE_THRESHOLD = 0.55;

// Weights for overall_score calculation
const WEIGHTS = {
  semantic: 0.45,
  structural: 0.30,
  relationship: 0.25,
};

// Words that should never count as entity matches
const SEMANTIC_STOP_WORDS = new Set([
  'the', 'and', 'for', 'with', 'that', 'this', 'from', 'into', 'want',
  'need', 'build', 'make', 'create', 'design', 'generate', 'system',
  'backend', 'frontend', 'app', 'application', 'platform', 'tool',
  'like', 'where', 'can', 'should', 'will', 'have', 'based', 'using',
  'similar', 'able', 'also', 'just', 'each', 'every', 'more', 'most',
  'such', 'than', 'then', 'when', 'which', 'who', 'how', 'what', 'why',
  'support', 'manage', 'allow', 'enable', 'include', 'get', 'use',
  'simple', 'complex', 'basic', 'advanced', 'new', 'old', 'best', 'good',
  'database', 'schema', 'table', 'column', 'field', 'record', 'data',
]);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const normalise = (text) =>
  String(text || '')
    .toLowerCase()
    .replace(/[_-]/g, ' ')
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const tokenize = (text) =>
  normalise(text)
    .split(' ')
    .filter((t) => t.length >= 3 && !SEMANTIC_STOP_WORDS.has(t));

const clamp = (v) => Math.min(1, Math.max(0, v));

// ---------------------------------------------------------------------------
// Extract entity names from a schema
// ---------------------------------------------------------------------------

/**
 * Pulls all table and collection names from schema.architectures.
 * Also includes column/field names for deeper semantic matching.
 */
const extractSchemaTokens = (schema) => {
  const tokens = new Set();
  for (const arch of schema?.architectures || []) {
    if (arch.database_type === 'sql') {
      for (const table of arch.tables || []) {
        tokenize(table.name).forEach((t) => tokens.add(t));
        for (const col of table.columns || []) {
          tokenize(col.name).forEach((t) => tokens.add(t));
        }
      }
    } else if (arch.database_type === 'nosql') {
      for (const col of arch.collections || []) {
        tokenize(col.name).forEach((t) => tokens.add(t));
        for (const field of col.document_shape || []) {
          tokenize(field.name).forEach((t) => tokens.add(t));
        }
      }
    }
  }
  return tokens;
};

/**
 * Extracts just entity (table/collection) names — used for structural scoring.
 */
const extractEntityNames = (schema) => {
  const names = new Set();
  for (const arch of schema?.architectures || []) {
    if (arch.database_type === 'sql') {
      for (const t of arch.tables || []) names.add(normalise(t.name));
    } else if (arch.database_type === 'nosql') {
      for (const c of arch.collections || []) names.add(normalise(c.name));
    }
  }
  return names;
};

// ---------------------------------------------------------------------------
// Score 1: Semantic Score
// ---------------------------------------------------------------------------

/**
 * Measures how many prompt keywords appear as entity/field names in the schema.
 *
 * Algorithm:
 *   promptTokens = tokenize(prompt)
 *   schemaTokens = all table + column names tokenized
 *   hits = tokens in prompt that appear (substring) in schemaTokens
 *   score = hits / promptTokens.length  (capped at 1.0)
 */
const computeSemanticScore = (prompt, schema) => {
  const promptTokens = tokenize(prompt);
  if (promptTokens.length === 0) return 0;

  const schemaTokens = extractSchemaTokens(schema);
  if (schemaTokens.size === 0) return 0;

  let hits = 0;
  for (const pt of promptTokens) {
    // Exact match or schema token contains the prompt token (e.g. "order" matches "orders")
    for (const st of schemaTokens) {
      if (st === pt || st.startsWith(pt) || pt.startsWith(st)) {
        hits++;
        break;
      }
    }
  }

  return clamp(hits / promptTokens.length);
};

// ---------------------------------------------------------------------------
// Score 2: Structural Score
// ---------------------------------------------------------------------------

/**
 * Measures how similar the current schema's entity set is to the retrieved
 * memory schemas (Jaccard similarity of entity name sets).
 *
 * If no retrieved schemas, falls back to comparing entity count ratio.
 *
 * Algorithm:
 *   For each retrieved schema:
 *     jaccard = |current ∩ retrieved| / |current ∪ retrieved|
 *   score = average jaccard across all retrieved schemas
 */
const computeStructuralScore = (retrievedSchemas, currentSchema) => {
  const fallbackScore = () => {
    const entityCount = extractEntityNames(currentSchema).size;
    return clamp(entityCount / 6);
  };

  if (!Array.isArray(retrievedSchemas) || retrievedSchemas.length === 0) {
    // No memory available: score based on entity count (3+ entities = reasonable structure)
    return fallbackScore(); // 6+ entities = full score
  }

  const currentEntities = extractEntityNames(currentSchema);
  if (currentEntities.size === 0) return 0;

  let totalJaccard = 0;
  let validCount = 0;

  for (const mem of retrievedSchemas) {
    const memSchema = mem?.schema || mem;
    const memEntities = extractEntityNames(memSchema);
    if (memEntities.size === 0) continue;

    const intersection = new Set([...currentEntities].filter((e) => memEntities.has(e)));
    const union = new Set([...currentEntities, ...memEntities]);
    totalJaccard += intersection.size / union.size;
    validCount++;
  }

  if (validCount === 0) {
    return fallbackScore();
  }

  const averageJaccard = clamp(totalJaccard / validCount);
  return averageJaccard === 0 ? fallbackScore() : averageJaccard;
};

// ---------------------------------------------------------------------------
// Score 3: Relationship Density
// ---------------------------------------------------------------------------

/**
 * Measures how well-connected the schema is.
 *
 * SQL:   density = FK columns / total columns
 * NoSQL: density = *_id + ref fields / total fields
 *
 * A well-designed schema should have ~15–30% FK density.
 * We target 0.20 as the "ideal" density and score proportionally.
 */
const computeRelationshipDensity = (schema) => {
  let totalFields = 0;
  let linkFields = 0;

  for (const arch of schema?.architectures || []) {
    if (arch.database_type === 'sql') {
      for (const table of arch.tables || []) {
        for (const col of table.columns || []) {
          totalFields++;
          if (col.foreign_key) linkFields++;
        }
      }
    } else if (arch.database_type === 'nosql') {
      for (const col of arch.collections || []) {
        for (const field of col.document_shape || []) {
          totalFields++;
          if (
            field.ref ||
            (field.name && field.name.endsWith('_id') && field.name !== '_id')
          ) {
            linkFields++;
          }
        }
      }
    }
  }

  if (totalFields === 0) return 0;

  const rawDensity = linkFields / totalFields;

  // Score peaks at 0.20 density, falls off on either side
  // density=0    → score=0
  // density=0.10 → score=0.5
  // density=0.20 → score=1.0
  // density=0.40 → score=0.5 (too FK-heavy)
  // density>0.50 → score diminishes
  if (rawDensity <= 0.20) {
    return clamp(rawDensity / 0.20);
  }
  // Gentle penalty for over-connected schemas
  return clamp(1 - (rawDensity - 0.20) / 0.60);
};

// ---------------------------------------------------------------------------
// Score 4: Overall Score (weighted)
// ---------------------------------------------------------------------------

/**
 * Combines the three component scores using WEIGHTS.
 * Returns an object with all four scores + a breakdown.
 */
const computeOverallScore = ({ semantic_score, structural_score, relationship_density }) => {
  const overall =
    WEIGHTS.semantic * semantic_score +
    WEIGHTS.structural * structural_score +
    WEIGHTS.relationship * relationship_density;

  return clamp(overall);
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Full scoring pipeline.
 *
 * @param {string} prompt           - The user's original prompt
 * @param {Array}  retrievedSchemas - Schemas retrieved from memory (may be empty)
 * @param {object} existingSchema   - The schema to score ({ architectures })
 * @returns {{
 *   semantic_score: number,
 *   structural_score: number,
 *   relationship_density: number,
 *   overall_score: number,
 *   passes_threshold: boolean,
 *   threshold: number
 * }}
 */
const evaluateSchemaMatch = (prompt, retrievedSchemas, existingSchema) => {
  const semantic_score = computeSemanticScore(prompt, existingSchema);
  const structural_score = computeStructuralScore(retrievedSchemas, existingSchema);
  const relationship_density = computeRelationshipDensity(existingSchema);
  const overall_score = computeOverallScore({
    semantic_score,
    structural_score,
    relationship_density,
  });

  return {
    semantic_score: parseFloat(semantic_score.toFixed(3)),
    structural_score: parseFloat(structural_score.toFixed(3)),
    relationship_density: parseFloat(relationship_density.toFixed(3)),
    overall_score: parseFloat(overall_score.toFixed(3)),
    passes_threshold: overall_score >= SCORE_THRESHOLD,
    threshold: SCORE_THRESHOLD,
  };
};

/**
 * Detects whether the schema contains entities irrelevant to the prompt.
 * Returns { hasIrrelevant: boolean, irrelevantEntities: string[] }
 */
const detectIrrelevantEntities = (prompt, schema) => {
  const promptTokens = new Set(tokenize(prompt));
  const irrelevant = new Set();

  for (const arch of schema?.architectures || []) {
    const entities =
      arch.database_type === 'sql'
        ? (arch.tables || []).map((t) => t.name)
        : (arch.collections || []).map((c) => c.name);

    for (const entityName of entities) {
      const entityTokens = tokenize(entityName);
      const hasOverlap = entityTokens.some((et) => {
        for (const pt of promptTokens) {
          if (et === pt || et.startsWith(pt) || pt.startsWith(et)) return true;
        }
        return false;
      });

      // "users" and "audit_logs" are always valid baseline entities
      const isBaseline = ['users', 'auditlogs', 'audit', 'sessions', 'logs'].includes(
        normalise(entityName).replace(/\s/g, '')
      );

      if (!hasOverlap && !isBaseline) {
        irrelevant.add(entityName);
      }
    }
  }

  return {
    hasIrrelevant: irrelevant.size > 0,
    irrelevantEntities: Array.from(irrelevant),
  };
};

module.exports = {
  evaluateSchemaMatch,
  detectIrrelevantEntities,
  computeSemanticScore,
  computeStructuralScore,
  computeRelationshipDensity,
  computeOverallScore,
  SCORE_THRESHOLD,
  WEIGHTS,
};
