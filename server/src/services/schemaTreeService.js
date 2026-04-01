/**
 * Schema Tree Service
 *
 * Converts a schema (architectures array) into a hierarchical tree structure
 * compatible with the UI tree panel.
 *
 * Tree structure contract:
 *   {
 *     root: "<domain label>",
 *     nodes: [
 *       { name: "entity", type: "sql|nosql", children: ["child_entity", ...] }
 *     ]
 *   }
 *
 * Strategy:
 *   SQL   → parse foreign_key columns to infer parent → child (FK owner is child)
 *   NoSQL → fields of type "object" or "array" with a ref imply embedded children
 *   Both  → merged tree, duplicates collapsed by name
 */

// ---------------------------------------------------------------------------
// SQL tree builder
// ---------------------------------------------------------------------------

/**
 * Given a list of SQL tables, builds a parent→children map using foreign keys.
 * A table with a FK to another table is a "child" of that table.
 *
 * e.g. orders.user_id → users.id  ⟹  users is parent of orders
 */
const buildSqlParentMap = (tables) => {
  // parentMap[child] = Set<parent>
  const parentMap = {};
  const tableNames = new Set(tables.map((t) => t.name));

  for (const table of tables) {
    if (!parentMap[table.name]) parentMap[table.name] = new Set();

    for (const col of table.columns || []) {
      if (!col.foreign_key) continue;

      // foreign_key format: "parent_table.column"
      const parentTable = String(col.foreign_key).split('.')[0];
      if (parentTable && tableNames.has(parentTable) && parentTable !== table.name) {
        parentMap[table.name].add(parentTable);
      }
    }
  }

  return parentMap;
};

/**
 * Converts the parent map into children map for tree traversal.
 * childrenMap[parent] = Set<child>
 */
const invertToChildrenMap = (parentMap) => {
  const childrenMap = {};

  for (const [child, parents] of Object.entries(parentMap)) {
    for (const parent of parents) {
      if (!childrenMap[parent]) childrenMap[parent] = new Set();
      childrenMap[parent].add(child);
    }
  }

  return childrenMap;
};

/**
 * Finds root tables (tables that are not children of anyone else).
 */
const findRootTables = (tableNames, parentMap) => {
  const roots = [];
  for (const name of tableNames) {
    const parents = parentMap[name];
    if (!parents || parents.size === 0) {
      roots.push(name);
    }
  }
  return roots;
};

const buildSqlTreeNodes = (tables) => {
  const parentMap = buildSqlParentMap(tables);
  const childrenMap = invertToChildrenMap(parentMap);
  const tableNames = tables.map((t) => t.name);
  const roots = findRootTables(tableNames, parentMap);

  const nodes = [];

  for (const table of tables) {
    nodes.push({
      name: table.name,
      type: 'sql',
      isRoot: roots.includes(table.name),
      children: Array.from(childrenMap[table.name] || []),
    });
  }

  return nodes;
};

// ---------------------------------------------------------------------------
// NoSQL tree builder
// ---------------------------------------------------------------------------

/**
 * For NoSQL, embedded children are inferred from:
 *   1. Fields with type "object" or "array" and a `ref` property  → referenced collection
 *   2. Fields named `*_id` suggesting a reference to another collection
 */
const buildNoSqlTreeNodes = (collections) => {
  const collectionNames = new Set(collections.map((c) => c.name));
  const parentMap = {};

  for (const collection of collections) {
    if (!parentMap[collection.name]) parentMap[collection.name] = new Set();

    for (const field of collection.document_shape || []) {
      // Explicit ref
      if (field.ref && collectionNames.has(field.ref)) {
        parentMap[collection.name].add(field.ref);
        continue;
      }

      // Infer from *_id field names (e.g. user_id → users)
      if (field.name && field.name.endsWith('_id') && field.name !== '_id') {
        const base = field.name.replace(/_id$/, '');
        const plural = base.endsWith('s') ? base : `${base}s`;
        if (collectionNames.has(plural)) {
          parentMap[collection.name].add(plural);
        } else if (collectionNames.has(base)) {
          parentMap[collection.name].add(base);
        }
      }
    }
  }

  const childrenMap = invertToChildrenMap(parentMap);
  const roots = findRootTables(collections.map((c) => c.name), parentMap);

  const nodes = [];
  for (const collection of collections) {
    nodes.push({
      name: collection.name,
      type: 'nosql',
      isRoot: roots.includes(collection.name),
      children: Array.from(childrenMap[collection.name] || []),
    });
  }

  return nodes;
};

// ---------------------------------------------------------------------------
// Merge and deduplicate nodes from SQL + NoSQL
// ---------------------------------------------------------------------------

/**
 * Merges SQL and NoSQL nodes. When both architectures have a node with the
 * same name, their children are combined and the node is marked as "both".
 */
const mergeNodes = (sqlNodes, nosqlNodes) => {
  const nodeMap = {};

  for (const node of sqlNodes) {
    nodeMap[node.name] = { ...node, children: new Set(node.children) };
  }

  for (const node of nosqlNodes) {
    if (nodeMap[node.name]) {
      // Merge children, update type to "both"
      for (const child of node.children) nodeMap[node.name].children.add(child);
      nodeMap[node.name].type = 'both';
      nodeMap[node.name].isRoot = nodeMap[node.name].isRoot || node.isRoot;
    } else {
      nodeMap[node.name] = { ...node, children: new Set(node.children) };
    }
  }

  return Object.values(nodeMap).map((n) => ({
    name: n.name,
    type: n.type,
    isRoot: n.isRoot,
    children: Array.from(n.children),
  }));
};

// ---------------------------------------------------------------------------
// Infer root label from architectures
// ---------------------------------------------------------------------------

const formatRootLabel = (value) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '') || 'schema';

const inferRootLabel = (architectures) => {
  for (const arch of architectures) {
    if (arch.use_case) {
      const normalizedUseCase = formatRootLabel(arch.use_case);
      if (normalizedUseCase && normalizedUseCase !== 'schema') {
        return normalizedUseCase;
      }
    }
  }
  return 'schema';
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Builds a hierarchical tree from a schema object ({ architectures }).
 *
 * @param {object} schema - Schema with `architectures` array
 * @param {string} [rootLabel] - Optional override for root node name
 * @returns {{ root: string, nodes: Array<{ name, type, isRoot, children }> }}
 */
const buildTreeFromSchema = (schema, rootLabel = null) => {
  const architectures = schema?.architectures || [];

  let sqlNodes = [];
  let nosqlNodes = [];

  for (const arch of architectures) {
    const dbType = String(arch.database_type || '').toLowerCase();

    if (dbType === 'sql' && Array.isArray(arch.tables)) {
      sqlNodes = buildSqlTreeNodes(arch.tables);
    } else if (dbType === 'nosql' && Array.isArray(arch.collections)) {
      nosqlNodes = buildNoSqlTreeNodes(arch.collections);
    }
  }

  const nodes = mergeNodes(sqlNodes, nosqlNodes);
  const root = formatRootLabel(rootLabel || inferRootLabel(architectures));

  return { root, nodes };
};

/**
 * Returns only the root-level nodes (those not referenced as children).
 * Useful for UI "primary entities" hint.
 */
const getRootNodes = (tree) => tree.nodes.filter((n) => n.isRoot).map((n) => n.name);

/**
 * Returns all edges as [parent, child] pairs for graph compatibility.
 */
const getTreeEdges = (tree) => {
  const edges = [];
  for (const node of tree.nodes) {
    for (const child of node.children) {
      edges.push([node.name, child]);
    }
  }
  return edges;
};

module.exports = {
  buildTreeFromSchema,
  getRootNodes,
  getTreeEdges,
  formatRootLabel,
};
