import { useCallback, useEffect, useMemo, useState } from 'react';
import React from 'react';
import dagre from 'dagre';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Background,
  Controls,
  Handle,
  Panel,
  Position,
  ReactFlow,
  ReactFlowProvider,
  addEdge,
  useEdgesState,
  useNodesState,
} from '@xyflow/react';
import {
  ArrowRightLeft,
  Binary,
  Cable,
  Check,
  ChevronDown,
  Clipboard,
  Database,
  Download,
  FileJson2,
  LayoutGrid,
  PencilLine,
  Sparkles,
  WandSparkles,
  X,
  Zap,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Lightweight JSON syntax highlighter (no external deps)
// ---------------------------------------------------------------------------
function OpenApiHighlight({ doc }) {
  const raw = JSON.stringify(doc, null, 2);

  // Split into tokens: strings, numbers, booleans, nulls, punctuation
  const tokens = raw.split(
    /("(?:[^"\\]|\\.)*"(?:\s*:)?|true|false|null|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?|[{}[\],:])/
  );

  return tokens.map((token, i) => {
    if (!token) return null;

    // Key (string followed by colon)
    if (/^".*":$/.test(token)) {
      const key = token.slice(0, -1); // remove trailing colon
      return (
        <React.Fragment key={i}>
          <span className="oa-key">{key}</span>
          <span className="oa-punct">:</span>
        </React.Fragment>
      );
    }
    // String value
    if (/^"/.test(token)) return <span key={i} className="oa-string">{token}</span>;
    // Boolean
    if (token === 'true' || token === 'false') return <span key={i} className="oa-bool">{token}</span>;
    // Null
    if (token === 'null') return <span key={i} className="oa-null">{token}</span>;
    // Number
    if (/^-?\d/.test(token)) return <span key={i} className="oa-number">{token}</span>;
    // Punctuation / whitespace
    return <span key={i} className="oa-punct">{token}</span>;
  });
}

const STORAGE_KEY = 'brmh-schema-preview';
const NODE_WIDTH = 300;
const NODE_HEIGHT_COLLAPSED = 76;

const nodeTypes = {
  schema: SchemaNode,
};

function SchemaNode({ data, selected }) {
  const [expanded, setExpanded] = useState(false);
  const isSql = data.variant === 'sql';

  return (
    <div className={[
      'schema-node',
      selected ? 'schema-node--selected' : '',
      isSql ? 'schema-node--sql' : 'schema-node--nosql',
      expanded ? 'schema-node--expanded' : '',
    ].join(' ')}>
      <Handle type="target" position={Position.Left} className="node-handle node-handle--target" />
      <Handle type="source" position={Position.Right} className="node-handle node-handle--source" />

      {/* Header — always visible, click to expand/collapse */}
      <div className="schema-node__header" onClick={() => setExpanded((v) => !v)}>
        <div className="schema-node__header-left">
          <p className="schema-node__eyebrow">{isSql ? 'TABLE' : 'COLLECTION'}</p>
          <h3 className="schema-node__title">{data.label}</h3>
        </div>
        <div className="schema-node__header-right">
          <span className="schema-node__count">{data.fields.length}</span>
          <ChevronDown
            size={13}
            className={`schema-node__chevron${expanded ? ' schema-node__chevron--open' : ''}`}
          />
        </div>
      </div>

      {/* Collapsed: show brief description only */}
      {!expanded && (
        <p className="schema-node__description">{data.description}</p>
      )}

      {/* Expanded: full field list */}
      {expanded && (
        <div className="schema-node__fields">
          {data.fields.map((field) => (
            <div key={field.name} className="schema-node__field">
              <div className="schema-node__field-left">
                <strong className="schema-node__field-name">{field.name}</strong>
                <span className="schema-node__field-type">{field.type || 'string'}</span>
              </div>
              <div className="schema-node__badges">
                {field.primary_key && <span className="badge badge--pk">PK</span>}
                {field.foreign_key && <span className="badge badge--fk">FK</span>}
                {field.required && !field.primary_key && <span className="badge badge--req">REQ</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const readStoredPayload = () => {
  try {
    return JSON.parse(window.localStorage.getItem(STORAGE_KEY) || 'null');
  } catch (error) {
    return null;
  }
};

const writeStoredPayload = (payload) => {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    return true;
  } catch (error) {
    return false;
  }
};

const toFieldList = (variant, item) =>
  (variant === 'sql' ? item.columns || [] : item.document_shape || []).map((field) => ({
    name: field.name,
    type: field.type || (variant === 'sql' ? 'column' : 'attribute'),
    required: Boolean(field.required),
    primary_key: Boolean(field.primary_key || field.primary),
    foreign_key: Boolean(field.foreign_key),
  }));

const inferNoSqlConnections = (collections = []) =>
  collections.flatMap((collection) =>
    (collection.document_shape || [])
      .filter((field) => /(_id|Ids|ids|Ref|ref)$/i.test(field.name || ''))
      .map((field, index) => ({
        id: `${collection.name}-${field.name}-${index}`,
        source: collection.name,
        target:
          String(field.references || field.name)
            .replace(/(_id|Ids|ids|Ref|ref)$/i, '')
            .replace(/\./g, '')
            .trim() || collection.name,
        label: field.name,
      }))
  );

const buildGraph = (payload, mode) => {
  const architectures = payload?.schemaResult?.schema?.architectures || [];
  const architecture = architectures.find((item) => item.database_type === mode);
  if (!architecture) {
    return { nodes: [], edges: [], architecture: null };
  }

  const items = mode === 'sql' ? architecture.tables || [] : architecture.collections || [];
  const dag = new dagre.graphlib.Graph();
  dag.setDefaultEdgeLabel(() => ({}));
  dag.setGraph({ rankdir: 'LR', nodesep: 36, ranksep: 100, marginx: 40, marginy: 40 });

  const nodes = items.map((item) => {
    dag.setNode(item.name, { width: NODE_WIDTH, height: NODE_HEIGHT_COLLAPSED });
    return {
      id: item.name,
      type: 'schema',
      position: { x: 0, y: 0 },
      data: {
        label: item.name,
        description: item.description || architecture.use_case || 'Schema node',
        variant: mode,
        fields: toFieldList(mode, item).slice(0, 9),
      },
    };
  });

  const rawEdges =
    mode === 'sql'
      ? items.flatMap((item) =>
          (item.columns || [])
            .filter((field) => field.foreign_key)
            .map((field, index) => ({
              id: `${item.name}-${field.name}-${index}`,
              source: item.name,
              target: String(field.foreign_key || '').split('.')[0] || item.name,
              label: field.name,
            }))
        )
      : inferNoSqlConnections(items);

  rawEdges.forEach((edge) => dag.setEdge(edge.source, edge.target));
  dagre.layout(dag);

  const laidOutNodes = nodes.map((node) => {
    const position = dag.node(node.id);
    return {
      ...node,
      position: {
        x: position.x - NODE_WIDTH / 2,
        y: position.y - NODE_HEIGHT_COLLAPSED / 2,
      },
    };
  });

  const edges = rawEdges
    .filter((edge) => items.some((item) => item.name === edge.source) && items.some((item) => item.name === edge.target))
    .map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      sourceHandle: null,
      targetHandle: null,
      type: 'smoothstep',
      label: edge.label,
      animated: true,
      data: {
        label: edge.label,
        tone: mode === 'sql' ? '#5c8dff' : '#ff9f43',
      },
      style: {
        stroke: mode === 'sql' ? '#5c8dff' : '#ff9f43',
        strokeWidth: 3.5,
      },
      labelStyle: {
        fill: '#41526b',
        fontWeight: 800,
        fontSize: 11,
      },
      labelBgStyle: {
        fill: 'rgba(255,255,255,0.96)',
      },
      labelBgPadding: [10, 6],
      labelBgBorderRadius: 999,
    }));

  return { nodes: laidOutNodes, edges, architecture };
};

const prettyJson = (value) => {
  try {
    return JSON.stringify(value, null, 2);
  } catch (error) {
    return String(value);
  }
};

function StudioCanvas() {
  const [payload, setPayload] = useState(readStoredPayload());
  const [mode, setMode] = useState('sql');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [augmentDrawerMode, setAugmentDrawerMode] = useState(null); // 'tables' | 'fields' | null
  const [editPrompt, setEditPrompt] = useState('');
  const [augmentPrompt, setAugmentPrompt] = useState('');
  const [refineLoading, setRefineLoading] = useState(false);
  const [augmentLoading, setAugmentLoading] = useState(false);
  const [error, setError] = useState('');
  const [augmentError, setAugmentError] = useState('');
  const [openApiDoc, setOpenApiDoc] = useState(null);   // null = closed, object = open
  const [openApiLoading, setOpenApiLoading] = useState(false);
  const [openApiError, setOpenApiError] = useState('');
  const [copied, setCopied] = useState(false);

  const graph = useMemo(() => buildGraph(payload, mode), [payload, mode]);
  const [nodes, setNodes, onNodesChange] = useNodesState(graph.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(graph.edges);

  useEffect(() => {
    setNodes(graph.nodes);
    setEdges(graph.edges);
  }, [graph, setEdges, setNodes]);

  useEffect(() => {
    const availableModes = (payload?.schemaResult?.schema?.architectures || []).map((item) => item.database_type);
    if (availableModes.length && !availableModes.includes(mode)) {
      setMode(availableModes[0]);
    }
  }, [mode, payload]);

  const architectureCountLabel = mode === 'sql' ? 'Tables' : 'Collections';

  const onConnect = useCallback(
    (params) => {
      setEdges((current) =>
        addEdge(
          {
            ...params,
            type: 'smoothstep',
            label: 'manual link',
            animated: true,
            data: {
              label: 'manual link',
              tone: mode === 'sql' ? '#5c8dff' : '#ff9f43',
            },
            style: {
              stroke: mode === 'sql' ? '#5c8dff' : '#ff9f43',
              strokeWidth: 3.5,
            },
            labelStyle: {
              fill: '#41526b',
              fontWeight: 800,
              fontSize: 11,
            },
            labelBgStyle: {
              fill: 'rgba(255,255,255,0.96)',
            },
            labelBgPadding: [10, 6],
            labelBgBorderRadius: 999,
          },
          current
        )
      );
    },
    [mode, setEdges]
  );

  const refineSchema = useCallback(async () => {
    if (!editPrompt.trim()) return;

    const existingSchema = payload?.schemaResult?.schema;
    if (!existingSchema) {
      setError('No existing schema found. Generate a schema first.');
      return;
    }

    setRefineLoading(true);
    setError('');

    try {
      const editResponse = await fetch('/api/schema/edit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ existingSchema, instruction: editPrompt }),
      });
      const editResult = await editResponse.json();

      if (!editResponse.ok || !editResult.success) {
        throw new Error(editResult.error?.message || 'Unable to apply changes with the deterministic schema editor. Try being more specific about the table or field change you want.');
      }

      const nextPayload = { ...payload, schemaResult: editResult };
      setPayload(nextPayload);
      writeStoredPayload(nextPayload);
      setEditPrompt('');
      setDrawerOpen(false);
    } catch (requestError) {
      setError(requestError.message || 'Unable to apply changes.');
    } finally {
      setRefineLoading(false);
    }
  }, [editPrompt, payload]);

  const augmentSchema = useCallback(async () => {
    if (!augmentPrompt.trim()) return;

    const existingSchema = payload?.schemaResult?.schema;
    if (!existingSchema) {
      setAugmentError('No existing schema found. Generate a schema first.');
      return;
    }

    setAugmentLoading(true);
    setAugmentError('');

    try {
      const response = await fetch('/api/schema/augment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          existingSchema,
          instruction: augmentPrompt,
          mode: augmentDrawerMode,
        }),
      });
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error?.message || 'Unable to augment schema.');
      }

      const nextPayload = { ...payload, schemaResult: result };
      setPayload(nextPayload);
      writeStoredPayload(nextPayload);
      setAugmentPrompt('');
      setAugmentDrawerMode(null);
    } catch (err) {
      setAugmentError(err.message || 'Unable to augment schema.');
    } finally {
      setAugmentLoading(false);
    }
  }, [augmentPrompt, augmentDrawerMode, payload]);

  const exportOpenApi = useCallback(async () => {
    const schema = payload?.schemaResult?.schema;
    if (!schema) return;
    setOpenApiLoading(true);
    setOpenApiError('');
    try {
      const response = await fetch('/api/schema/openapi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          schema,
          title: payload?.schemaForm?.prompt
            ? `${payload.schemaForm.prompt} API`
            : 'Generated API',
          version: '1.0.0',
          sourceArch: mode,
        }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error?.message || 'Failed to generate OpenAPI spec.');
      }
      setOpenApiDoc(result.openapi);
    } catch (err) {
      setOpenApiError(err.message || 'Failed to generate OpenAPI spec.');
    } finally {
      setOpenApiLoading(false);
    }
  }, [payload, mode]);

  const copyOpenApi = useCallback(() => {
    if (!openApiDoc) return;
    navigator.clipboard.writeText(JSON.stringify(openApiDoc, null, 2)).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    });
  }, [openApiDoc]);

  const downloadOpenApi = useCallback(() => {
    if (!openApiDoc) return;
    const blob = new Blob([JSON.stringify(openApiDoc, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const slug = (openApiDoc.info?.title || 'openapi').toLowerCase().replace(/\s+/g, '-');
    a.href = url;
    a.download = `${slug}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [openApiDoc]);

  if (!payload?.schemaResult) {
    return (
      <div className="studio studio--empty">
        <div className="empty-state-card">
          <Sparkles size={28} />
          <h1>BRMH Schema Studio</h1>
          <p>Generate a schema from the dashboard first, then open Preview Schema again.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="studio">
      <div className="studio-shell">
        <section className="studio-main">
          <header className="studio-header">
            <div className="studio-header__brand">
              <div className="studio-header__logo">
                <Sparkles size={17} color="white" />
              </div>
              <div>
                <div className="studio-header__wordmark">BRMH Schema Studio</div>
                <div className="studio-header__sub">Visual · Deterministic · OpenAPI-ready</div>
              </div>
            </div>

            <div className="studio-header__actions">
              <div className="mode-switch">
                {['sql', 'nosql'].map((item) => (
                  <button
                    key={item}
                    type="button"
                    className={item === mode ? 'mode-switch__button mode-switch__button--active' : 'mode-switch__button'}
                    onClick={() => setMode(item)}
                  >
                    {item === 'sql' ? <Database size={14} /> : <Binary size={14} />}
                    {item.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
          </header>

          <div className="flow-shell">
            <ReactFlow
              nodes={nodes}
              edges={edges}
              nodeTypes={nodeTypes}
              fitView
              minZoom={0.4}
              maxZoom={1.55}
              defaultEdgeOptions={{ type: 'smoothstep' }}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              proOptions={{ hideAttribution: true }}
            >
              <Background color="rgba(99, 120, 160, 0.18)" gap={26} size={1} variant="dots" />
              <Controls className="studio-controls" />
              <Panel position="top-left" className="studio-panel">
                <div className="studio-panel__metric">
                  <LayoutGrid size={16} />
                  <span>{architectureCountLabel}</span>
                  <strong>{nodes.length}</strong>
                </div>
                <div className="studio-panel__metric">
                  <Cable size={16} />
                  <span>Connections</span>
                  <strong>{edges.length}</strong>
                </div>
              </Panel>
            </ReactFlow>
          </div>
        </section>

        <aside className="studio-sidebar">
          <div className="sidebar-card">
            <p className="sidebar-card__eyebrow">Schema Snapshot</p>
            <div className="sidebar-card__stats">
              <div>
                <span>Mode</span>
                <strong>{mode.toUpperCase()}</strong>
              </div>
              <div>
                <span>Provider</span>
                <strong>{payload.schemaResult?.meta?.provider || 'default'}</strong>
              </div>
              <div>
                <span>Duration</span>
                <strong>{String(payload.schemaResult?.meta?.durationMs || 0)} ms</strong>
              </div>
              <div>
                <span>Output</span>
                <strong>{payload.schemaResult?.meta?.outputMode || 'both'}</strong>
              </div>
            </div>
          </div>

          <div className="sidebar-card">
            <p className="sidebar-card__eyebrow">Schema Actions</p>
            <div className="sidebar-actions">
              <button type="button" className="primary-pill sidebar-action-pill" onClick={() => setDrawerOpen(true)}>
                <PencilLine size={15} />
                Edit Schema
              </button>
              <div className="sidebar-actions--row">
                <button type="button" className="augment-pill augment-pill--tables" onClick={() => { setAugmentDrawerMode('tables'); setAugmentError(''); setAugmentPrompt(''); }}>
                  <LayoutGrid size={15} />
                  Add / Remove Tables
                </button>
                <button type="button" className="augment-pill augment-pill--fields" onClick={() => { setAugmentDrawerMode('fields'); setAugmentError(''); setAugmentPrompt(''); }}>
                  <Cable size={15} />
                  Add / Remove Fields
                </button>
              </div>
            </div>
          </div>

          {/* ── OpenAPI Export Card ─────────────────────── */}
          <div className="sidebar-card sidebar-card--openapi">
            <div className="openapi-card__top">
              <div>
                <p className="sidebar-card__eyebrow">Export</p>
                <p className="openapi-card__title">OpenAPI 3.1</p>
                <p className="openapi-card__sub">JSON Schema 2020-12 · CRUD paths · $ref components</p>
              </div>
              <FileJson2 size={28} className="openapi-card__icon" />
            </div>
            {openApiError ? <p className="openapi-card__error">{openApiError}</p> : null}
            <button
              type="button"
              className="openapi-export-btn"
              onClick={exportOpenApi}
              disabled={openApiLoading}
            >
              <Zap size={15} />
              {openApiLoading ? 'Generating…' : 'Generate OpenAPI Spec'}
            </button>
          </div>

          <div className="sidebar-card">
            <p className="sidebar-card__eyebrow">Visual Notes</p>
            <div className="sidebar-card__list">
              <div>
                <ArrowRightLeft size={15} />
                Drag blocks to reorganize the canvas.
              </div>
              <div>
                <Cable size={15} />
                Pull new wires from one side handle to another.
              </div>
              <div>
                <WandSparkles size={15} />
                Use Edit to regenerate instead of manually rewriting JSON.
              </div>
            </div>
          </div>

          <div className="sidebar-card sidebar-card--code">
            <p className="sidebar-card__eyebrow">Schema Preview</p>
            <pre>{prettyJson(payload.schemaResult?.preview || '(empty)')}</pre>
          </div>
        </aside>
      </div>


      <AnimatePresence>
        {augmentDrawerMode ? (
          <motion.div
            className="refine-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="refine-drawer"
              initial={{ x: 120, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 120, opacity: 0 }}
              transition={{ type: 'spring', damping: 24, stiffness: 220 }}
            >
              <div className="refine-drawer__head">
                <div>
                  <p className="studio-kicker">
                    {augmentDrawerMode === 'tables' ? 'Add / Remove Tables' : 'Add / Remove Fields'}
                  </p>
                  <h2>{augmentDrawerMode === 'tables' ? 'What table changes do you need?' : 'What field changes do you need?'}</h2>
                  <p>
                    {augmentDrawerMode === 'tables'
                      ? 'Describe the new tables or collections to append. The existing schema is preserved.'
                      : 'Describe the fields or columns to add to existing tables. Specify which table if needed.'}
                  </p>
                </div>
                <button type="button" className="icon-button" onClick={() => setAugmentDrawerMode(null)}>
                  <X size={18} />
                </button>
              </div>
              <textarea
                value={augmentPrompt}
                onChange={(e) => setAugmentPrompt(e.target.value)}
                placeholder={augmentDrawerMode === 'tables'
                  ? 'e.g. Add a notifications table and a coupons table with expiry dates.'
                  : 'e.g. Add a profile_picture_url field to users, and add a discount_pct column to products.'}
                className="refine-drawer__textarea"
              />
              {augmentError ? <div className="refine-error">{augmentError}</div> : null}
              <div className="refine-drawer__actions">
                <button type="button" className="secondary-pill" onClick={() => setAugmentDrawerMode(null)}>
                  Cancel
                </button>
                <button
                  type="button"
                  className="primary-pill"
                  disabled={augmentLoading || !augmentPrompt.trim()}
                  onClick={augmentSchema}
                >
                  {augmentLoading ? 'Updating...' : 'Apply Changes'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {drawerOpen ? (
          <motion.div
            className="refine-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="refine-drawer"
              initial={{ x: 120, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 120, opacity: 0 }}
              transition={{ type: 'spring', damping: 24, stiffness: 220 }}
            >
              <div className="refine-drawer__head">
                <div>
                  <p className="studio-kicker">Prompt Refinement</p>
                  <h2>Make The Schema Better</h2>
                  <p>Describe the schema changes in plain English. You can add, remove, rename, or combine multiple changes in one instruction.</p>
                </div>
                <button type="button" className="icon-button" onClick={() => setDrawerOpen(false)}>
                  <X size={18} />
                </button>
              </div>

              <textarea
                value={editPrompt}
                onChange={(event) => setEditPrompt(event.target.value)}
                placeholder="Rename users to customers, remove delivery_partners, add coupons table, and add coupon_code to orders."
                className="refine-drawer__textarea"
              />

              {error ? <div className="refine-error">{error}</div> : null}

              <div className="refine-drawer__actions">
                <button type="button" className="secondary-pill" onClick={() => setDrawerOpen(false)}>
                  Cancel
                </button>
                <button type="button" className="primary-pill" disabled={refineLoading || !editPrompt.trim()} onClick={refineSchema}>
                  {refineLoading ? 'Regenerating...' : 'Apply Changes'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {/* ── OpenAPI Viewer Modal ──────────────────────────── */}
      <AnimatePresence>
        {openApiDoc ? (
          <motion.div
            className="openapi-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
          >
            <motion.div
              className="openapi-modal"
              initial={{ y: 60, opacity: 0, scale: 0.97 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 60, opacity: 0, scale: 0.97 }}
              transition={{ type: 'spring', damping: 26, stiffness: 240 }}
            >
              {/* Modal header */}
              <div className="openapi-modal__header">
                <div className="openapi-modal__header-left">
                  <span className="openapi-modal__badge">
                    <FileJson2 size={13} />
                    OpenAPI 3.1.0
                  </span>
                  <h2 className="openapi-modal__title">{openApiDoc.info?.title}</h2>
                  <p className="openapi-modal__meta">
                    {Object.keys(openApiDoc.components?.schemas || {}).length} schemas &middot;&nbsp;
                    {Object.keys(openApiDoc.paths || {}).length} paths &middot;&nbsp;
                    JSON Schema 2020-12
                  </p>
                </div>
                <div className="openapi-modal__header-right">
                  <button
                    type="button"
                    className="openapi-action-btn openapi-action-btn--copy"
                    onClick={copyOpenApi}
                  >
                    {copied ? <Check size={14} /> : <Clipboard size={14} />}
                    {copied ? 'Copied!' : 'Copy JSON'}
                  </button>
                  <button
                    type="button"
                    className="openapi-action-btn openapi-action-btn--download"
                    onClick={downloadOpenApi}
                  >
                    <Download size={14} />
                    Download .json
                  </button>
                  <button
                    type="button"
                    className="icon-button"
                    onClick={() => { setOpenApiDoc(null); setOpenApiError(''); }}
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              {/* Scrollable JSON body */}
              <div className="openapi-modal__body">
                <pre className="openapi-modal__code">
                  <OpenApiHighlight doc={openApiDoc} />
                </pre>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

export function SchemaStudioApp() {
  return (
    <ReactFlowProvider>
      <StudioCanvas />
    </ReactFlowProvider>
  );
}
