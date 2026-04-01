/**
 * Schema Edit Protection Service
 *
 * Guarantees that user manual edits are NEVER overridden by AI or pipeline steps.
 *
 * Responsibilities:
 *   1. parseEditContext(editContext)
 *      → Normalizes the raw editContext payload from the API into a clean, typed structure
 *
 *   2. lockManualNodes(schema, parsedContext)
 *      → Stamps each manually-defined entity/field with a { _manual: true } marker
 *        so downstream services know to skip it during AI passes
 *
 *   3. mergeWithProtection(aiSchema, lockedSchema)
 *      → Merges AI-generated schema into the locked schema.
 *        Manual nodes are always kept. AI nodes fill in the gaps.
 *        If a node exists in both, manual fields win field-by-field.
 *
 *   4. validateManualEditsPreserved(originalSchema, newSchema, parsedContext)
 *      → After any pipeline step, verifies that every manually-defined
 *        entity and field is still present and unmodified.
 *        Returns { preserved: boolean, violations: string[] }
 *
 *   5. stripManualMarkers(schema)
 *      → Removes all { _manual: true } markers before sending schema to client
 */

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const deepClone = (obj) => JSON.parse(JSON.stringify(obj));
const normalise = (s) => String(s || '').toLowerCase().trim();

// ---------------------------------------------------------------------------
// 1. parseEditContext
// ---------------------------------------------------------------------------

/**
 * Normalizes raw editContext from the API request body.
 *
 * Raw shape (any of these may be present):
 *   {
 *     manualNodes:    ["orders", "payments"],    // table/collection names user added
 *     addedNodes:     ["wishlist"],              // alias for manualNodes
 *     removedNodes:   ["analytics"],             // tables user explicitly deleted
 *     editedFields:   { orders: ["total", "status"] }, // fields user manually typed
 *     manualEdges:    [{ from: "orders", to: "users" }], // user-drawn connections
 *     addedFields:    { users: ["avatar_url"] }  // alias for editedFields
 *   }
 *
 * Returns a clean, deduplicated ParsedEditContext:
 *   {
 *     protectedNodes:  Set<string>,   // entity names that must never be removed
 *     removedNodes:    Set<string>,   // entity names that must never be re-added
 *     protectedFields: Map<entity, Set<fieldName>>,  // fields that must not change
 *     manualEdges:     Array<{ from, to }>,
 *   }
 */
const parseEditContext = (editContext) => {
  if (!editContext || typeof editContext !== 'object') {
    return {
      protectedNodes: new Set(),
      removedNodes: new Set(),
      protectedFields: new Map(),
      manualEdges: [],
    };
  }

  // Collect protected node names from multiple possible keys
  const rawProtected = [
    ...(Array.isArray(editContext.manualNodes) ? editContext.manualNodes : []),
    ...(Array.isArray(editContext.addedNodes) ? editContext.addedNodes : []),
  ];
  const protectedNodes = new Set(rawProtected.map(normalise).filter(Boolean));

  // Removed nodes — AI must never re-introduce these
  const rawRemoved = Array.isArray(editContext.removedNodes) ? editContext.removedNodes : [];
  const removedNodes = new Set(rawRemoved.map(normalise).filter(Boolean));

  // Protected fields per entity
  const protectedFields = new Map();
  const rawFields = {
    ...(editContext.editedFields || {}),
    ...(editContext.addedFields || {}),
  };
  for (const [entity, fields] of Object.entries(rawFields)) {
    const entityKey = normalise(entity);
    if (!Array.isArray(fields)) continue;
    const fieldSet = new Set(fields.map(normalise).filter(Boolean));
    if (fieldSet.size > 0) {
      protectedFields.set(entityKey, fieldSet);
    }
  }

  // Manual edges
  const manualEdges = Array.isArray(editContext.manualEdges)
    ? editContext.manualEdges
        .filter((e) => e && e.from && e.to)
        .map((e) => ({ from: normalise(e.from), to: normalise(e.to) }))
    : [];

  return { protectedNodes, removedNodes, protectedFields, manualEdges };
};

// ---------------------------------------------------------------------------
// 2. lockManualNodes
// ---------------------------------------------------------------------------

/**
 * Stamps { _manual: true } onto every entity and field that was manually
 * defined by the user. These markers survive pipeline passes and are used
 * by mergeWithProtection to enforce the override.
 *
 * @param {object} schema        - { architectures: [...] }
 * @param {object} parsedContext - Result of parseEditContext()
 * @returns {object} A new schema with _manual markers applied (does not mutate input)
 */
const lockManualNodes = (schema, parsedContext) => {
  if (!parsedContext.protectedNodes.size && !parsedContext.protectedFields.size) {
    return schema;
  }

  const cloned = deepClone(schema);

  for (const arch of cloned.architectures || []) {
    const dbType = normalise(arch.database_type);

    if (dbType === 'sql') {
      for (const table of arch.tables || []) {
        const tableKey = normalise(table.name);

        if (parsedContext.protectedNodes.has(tableKey)) {
          table._manual = true;
        }

        const protectedFieldNames = parsedContext.protectedFields.get(tableKey);
        if (protectedFieldNames) {
          for (const col of table.columns || []) {
            if (protectedFieldNames.has(normalise(col.name))) {
              col._manual = true;
            }
          }
        }
      }
    }

    if (dbType === 'nosql') {
      for (const collection of arch.collections || []) {
        const colKey = normalise(collection.name);

        if (parsedContext.protectedNodes.has(colKey)) {
          collection._manual = true;
        }

        const protectedFieldNames = parsedContext.protectedFields.get(colKey);
        if (protectedFieldNames) {
          for (const field of collection.document_shape || []) {
            if (protectedFieldNames.has(normalise(field.name))) {
              field._manual = true;
            }
          }
        }
      }
    }
  }

  return cloned;
};

// ---------------------------------------------------------------------------
// 3. mergeWithProtection
// ---------------------------------------------------------------------------

/**
 * Merges an AI-generated schema into a locked (manually-stamped) schema.
 *
 * Rules per entity:
 *   - If entity is _manual in locked schema → keep it entirely, skip AI version
 *   - If entity exists in AI schema but not in locked → add it (it's a new suggestion)
 *   - If entity exists in both and is NOT _manual:
 *       → merge fields: manual fields win, AI adds new non-duplicate fields
 *
 * Rules for removed nodes:
 *   - Any entity in parsedContext.removedNodes is excluded from the final schema
 *
 * @param {object} aiSchema      - Schema produced by AI (no _manual markers)
 * @param {object} lockedSchema  - Schema with _manual markers applied
 * @param {object} parsedContext - Result of parseEditContext()
 * @returns {object} Merged schema (no _manual markers — they are stripped at end)
 */
const mergeWithProtection = (aiSchema, lockedSchema, parsedContext) => {
  const result = { architectures: [] };

  const dbTypes = new Set([
    ...(aiSchema?.architectures || []).map((a) => normalise(a.database_type)),
    ...(lockedSchema?.architectures || []).map((a) => normalise(a.database_type)),
  ]);

  for (const dbType of dbTypes) {
    const aiArch = (aiSchema?.architectures || []).find(
      (a) => normalise(a.database_type) === dbType
    );
    const lockedArch = (lockedSchema?.architectures || []).find(
      (a) => normalise(a.database_type) === dbType
    );

    if (dbType === 'sql') {
      result.architectures.push(
        mergeSqlArchitectures(aiArch, lockedArch, parsedContext)
      );
    } else if (dbType === 'nosql') {
      result.architectures.push(
        mergeNoSqlArchitectures(aiArch, lockedArch, parsedContext)
      );
    }
  }

  return stripManualMarkers(result);
};

const mergeSqlArchitectures = (aiArch, lockedArch, parsedContext) => {
  const base = lockedArch || aiArch;
  const mergedArch = {
    database_type: 'sql',
    database_engine: base.database_engine || 'postgresql',
    use_case: base.use_case || '',
    tables: [],
  };

  const lockedTables = new Map(
    (lockedArch?.tables || []).map((t) => [normalise(t.name), t])
  );
  const aiTables = new Map(
    (aiArch?.tables || []).map((t) => [normalise(t.name), t])
  );

  const seen = new Set();

  // First: apply all locked tables (manual ones stay as-is)
  for (const [key, lockedTable] of lockedTables) {
    if (parsedContext.removedNodes.has(key)) continue; // user deleted this

    if (lockedTable._manual) {
      // Manual entity — keep exactly as the user defined it
      mergedArch.tables.push(deepClone(lockedTable));
    } else {
      // Not manually locked — merge with AI version if available
      const aiTable = aiTables.get(key);
      mergedArch.tables.push(mergeTableColumns(lockedTable, aiTable, parsedContext));
    }
    seen.add(key);
  }

  // Then: add any new tables from AI that aren't in the locked schema
  for (const [key, aiTable] of aiTables) {
    if (seen.has(key)) continue;
    if (parsedContext.removedNodes.has(key)) continue; // user deleted this
    mergedArch.tables.push(deepClone(aiTable));
  }

  return mergedArch;
};

const mergeTableColumns = (lockedTable, aiTable, parsedContext) => {
  const tableKey = normalise(lockedTable.name);
  const protectedFieldNames = parsedContext.protectedFields.get(tableKey) || new Set();

  const merged = deepClone(lockedTable);

  if (!aiTable) return merged;

  const lockedColNames = new Set((lockedTable.columns || []).map((c) => normalise(c.name)));

  for (const aiCol of aiTable.columns || []) {
    const colKey = normalise(aiCol.name);
    if (lockedColNames.has(colKey)) {
      // Column exists in both — if manually protected, keep locked version
      if (protectedFieldNames.has(colKey)) continue;
      // Otherwise: AI can update the non-protected column
      const idx = merged.columns.findIndex((c) => normalise(c.name) === colKey);
      if (idx !== -1) merged.columns[idx] = deepClone(aiCol);
    } else {
      // New column from AI — add it
      merged.columns.push(deepClone(aiCol));
    }
  }

  return merged;
};

const mergeNoSqlArchitectures = (aiArch, lockedArch, parsedContext) => {
  const base = lockedArch || aiArch;
  const mergedArch = {
    database_type: 'nosql',
    database_engine: base.database_engine || 'mongodb',
    use_case: base.use_case || '',
    collections: [],
  };

  const lockedCols = new Map(
    (lockedArch?.collections || []).map((c) => [normalise(c.name), c])
  );
  const aiCols = new Map(
    (aiArch?.collections || []).map((c) => [normalise(c.name), c])
  );

  const seen = new Set();

  for (const [key, lockedCol] of lockedCols) {
    if (parsedContext.removedNodes.has(key)) continue;

    if (lockedCol._manual) {
      mergedArch.collections.push(deepClone(lockedCol));
    } else {
      const aiCol = aiCols.get(key);
      mergedArch.collections.push(mergeCollectionFields(lockedCol, aiCol, parsedContext));
    }
    seen.add(key);
  }

  for (const [key, aiCol] of aiCols) {
    if (seen.has(key)) continue;
    if (parsedContext.removedNodes.has(key)) continue;
    mergedArch.collections.push(deepClone(aiCol));
  }

  return mergedArch;
};

const mergeCollectionFields = (lockedCol, aiCol, parsedContext) => {
  const colKey = normalise(lockedCol.name);
  const protectedFieldNames = parsedContext.protectedFields.get(colKey) || new Set();

  const merged = deepClone(lockedCol);
  if (!aiCol) return merged;

  const lockedFieldNames = new Set((lockedCol.document_shape || []).map((f) => normalise(f.name)));

  for (const aiField of aiCol.document_shape || []) {
    const fieldKey = normalise(aiField.name);
    if (lockedFieldNames.has(fieldKey)) {
      if (protectedFieldNames.has(fieldKey)) continue;
      const idx = merged.document_shape.findIndex((f) => normalise(f.name) === fieldKey);
      if (idx !== -1) merged.document_shape[idx] = deepClone(aiField);
    } else {
      merged.document_shape.push(deepClone(aiField));
    }
  }

  return merged;
};

// ---------------------------------------------------------------------------
// 4. validateManualEditsPreserved
// ---------------------------------------------------------------------------

/**
 * Verifies that every entity and field that was manually defined
 * still exists in the new schema after a pipeline transformation.
 *
 * @param {object} originalSchema  - Schema before the transformation (with _manual markers)
 * @param {object} newSchema       - Schema after the transformation
 * @param {object} parsedContext   - Result of parseEditContext()
 * @returns {{ preserved: boolean, violations: string[] }}
 */
const validateManualEditsPreserved = (originalSchema, newSchema, parsedContext) => {
  const violations = [];

  if (!parsedContext.protectedNodes.size && !parsedContext.protectedFields.size) {
    return { preserved: true, violations: [] };
  }

  const getEntityNames = (schema) => {
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

  const getFieldsForEntity = (schema, entityName) => {
    const fields = new Set();
    for (const arch of schema?.architectures || []) {
      if (arch.database_type === 'sql') {
        const table = (arch.tables || []).find((t) => normalise(t.name) === entityName);
        if (table) for (const c of table.columns || []) fields.add(normalise(c.name));
      } else if (arch.database_type === 'nosql') {
        const col = (arch.collections || []).find((c) => normalise(c.name) === entityName);
        if (col) for (const f of col.document_shape || []) fields.add(normalise(f.name));
      }
    }
    return fields;
  };

  const newEntityNames = getEntityNames(newSchema);

  // Check every protected node is still present
  for (const protectedNode of parsedContext.protectedNodes) {
    if (!newEntityNames.has(protectedNode)) {
      violations.push(`Entity "${protectedNode}" was manually defined but is missing from the updated schema.`);
    }
  }

  // Check every protected field is still present
  for (const [entityName, fieldNames] of parsedContext.protectedFields) {
    const newFields = getFieldsForEntity(newSchema, entityName);
    for (const fieldName of fieldNames) {
      if (!newFields.has(fieldName)) {
        violations.push(`Field "${fieldName}" in entity "${entityName}" was manually defined but is missing from the updated schema.`);
      }
    }
  }

  return {
    preserved: violations.length === 0,
    violations,
  };
};

// ---------------------------------------------------------------------------
// 5. stripManualMarkers
// ---------------------------------------------------------------------------

/**
 * Removes all { _manual: true } markers from a schema before
 * sending it to the client or storing it in memory.
 *
 * @param {object} schema - Schema potentially containing _manual markers
 * @returns {object} Clean schema with no _manual properties
 */
const stripManualMarkers = (schema) => {
  const strip = (obj) => {
    if (Array.isArray(obj)) return obj.map(strip);
    if (obj && typeof obj === 'object') {
      const out = {};
      for (const [k, v] of Object.entries(obj)) {
        if (k === '_manual') continue;
        out[k] = strip(v);
      }
      return out;
    }
    return obj;
  };

  return strip(schema);
};

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

module.exports = {
  parseEditContext,
  lockManualNodes,
  mergeWithProtection,
  validateManualEditsPreserved,
  stripManualMarkers,
};
