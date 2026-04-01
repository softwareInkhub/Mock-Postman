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
  useReactFlow,
} from '@xyflow/react';
import {
  ArrowRightLeft,
  Binary,
  Cable,
  Check,
  ChevronDown,
  ChevronRight,
  Clipboard,
  Database,
  Download,
  FileJson2,
  GitBranch,
  LayoutGrid,
  PencilLine,
  Sparkles,
  TrendingUp,
  WandSparkles,
  X,
  Zap,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Lightweight JSON syntax highlighter (no external deps)
// ---------------------------------------------------------------------------
function OpenApiHighlight({ doc }) {
  const raw = JSON.stringify(doc, null, 2);
  const tokens = raw.split(
    /("(?:[^"\\]|\\.)*"(?:\s*:)?|true|false|null|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?|[{}[\],:])/
  );
  return tokens.map((token, i) => {
    if (!token) return null;
    if (/^".*":$/.test(token)) {
      const key = token.slice(0, -1);
      return (
        <React.Fragment key={i}>
          <span className="oa-key">{key}</span>
          <span className="oa-punct">:</span>
        </React.Fragment>
      );
    }
    if (/^"/.test(token)) return <span key={i} className="oa-string">{token}</span>;
    if (token === 'true' || token === 'false') return <span key={i} className="oa-bool">{token}</span>;
    if (token === 'null') return <span key={i} className="oa-null">{token}</span>;
    if (/^-?\d/.test(token)) return <span key={i} className="oa-number">{token}</span>;
    return <span key={i} className="oa-punct">{token}</span>;
  });
}

// ---------------------------------------------------------------------------
// Lightweight YAML syntax highlighter (no external deps)
// ---------------------------------------------------------------------------
function YamlHighlight({ text }) {
  return text.split('\n').map((line, i) => {
    if (/^\s*#/.test(line)) {
      return <div key={i}><span className="oa-comment">{line}</span></div>;
    }
    const kvMatch = line.match(/^(\s*)([\w$@.-]+)(\s*:\s*)(.*)$/);
    if (kvMatch) {
      const [, indent, key, colon, rest] = kvMatch;
      let valueNode;
      if (!rest) valueNode = null;
      else if (/^["']/.test(rest)) valueNode = <span className="oa-string">{rest}</span>;
      else if (/^(true|false)$/.test(rest)) valueNode = <span className="oa-bool">{rest}</span>;
      else if (/^null$/.test(rest)) valueNode = <span className="oa-null">{rest}</span>;
      else if (/^-?\d/.test(rest)) valueNode = <span className="oa-number">{rest}</span>;
      else valueNode = <span className="oa-string">{rest}</span>;
      return (
        <div key={i}>
          {indent}
          <span className="oa-key">{key}</span>
          <span className="oa-punct">{colon}</span>
          {valueNode}
        </div>
      );
    }
    if (/^\s*-\s/.test(line)) {
      const dashMatch = line.match(/^(\s*-\s)(.*)$/);
      if (dashMatch) {
        const [, dash, rest] = dashMatch;
        return (
          <div key={i}>
            <span className="oa-punct">{dash}</span>
            <span className="oa-string">{rest}</span>
          </div>
        );
      }
    }
    return <div key={i}>{line}</div>;
  });
}

// ---------------------------------------------------------------------------
// Tree Panel — hierarchical schema structure viewer
// ---------------------------------------------------------------------------

/** Single recursive tree node row */
function TreeNode({ node, nodeMap, depth = 0, visited = new Set() }) {
  const [open, setOpen] = useState(depth < 2);
  const hasChildren = node.children && node.children.length > 0;
  const typeColor = node.type === 'sql' ? 'var(--blue)' : node.type === 'nosql' ? 'var(--violet)' : 'var(--teal)';
  const nextVisited = new Set(visited);
  nextVisited.add(node.name);

  return (
    <div className="tree-node" style={{ '--depth': depth }}>
      <div
        className={`tree-node__row${node.isRoot ? ' tree-node__row--root' : ''}`}
        onClick={() => hasChildren && setOpen((v) => !v)}
        style={{ paddingLeft: `${12 + depth * 18}px` }}
      >
        <span className="tree-node__toggle">
          {hasChildren
            ? (open ? <ChevronDown size={12} /> : <ChevronRight size={12} />)
            : <span style={{ width: 12, display: 'inline-block' }} />}
        </span>
        <span className="tree-node__dot" style={{ background: typeColor }} />
        <span className="tree-node__name">{node.name}</span>
        <span className="tree-node__type-badge" style={{ color: typeColor }}>
          {node.type === 'both' ? 'SQL+NoSQL' : node.type?.toUpperCase()}
        </span>
      </div>
      {open && hasChildren && (
        <div className="tree-node__children">
          {node.children.map((childName) => (
            nextVisited.has(childName) ? (
              <div
                key={`${node.name}-${childName}-cycle`}
                className="tree-node__row"
                style={{ paddingLeft: `${30 + (depth + 1) * 18}px` }}
              >
                <span className="tree-node__toggle">
                  <span style={{ width: 12, display: 'inline-block' }} />
                </span>
                <span className="tree-node__dot" style={{ background: typeColor }} />
                <span className="tree-node__name">{childName}</span>
                <span className="tree-node__type-badge" style={{ color: typeColor }}>
                  LINK
                </span>
              </div>
            ) : (
              <TreeNode
                key={childName}
                node={nodeMap[childName] || { name: childName, type: node.type, isRoot: false, children: [] }}
                nodeMap={nodeMap}
                depth={depth + 1}
                visited={nextVisited}
              />
            )
          ))}
        </div>
      )}
    </div>
  );
}

/** Full tree panel — overlay on left side of canvas */
function TreePanel({ tree, onClose }) {
  if (!tree) return null;
  const rootNodes = (tree.nodes || []).filter((n) => n.isRoot);
  const otherNodes = (tree.nodes || []).filter((n) => !n.isRoot);

  // Build a map for deep recursive rendering
  const nodeMap = {};
  for (const n of tree.nodes || []) nodeMap[n.name] = n;

  const renderNode = (node, depth) => (
    <TreeNode key={node.name} node={node} nodeMap={nodeMap} depth={depth} />
  );

  return (
    <motion.div
      className="tree-panel"
      initial={{ x: -320, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: -320, opacity: 0 }}
      transition={{ type: 'spring', damping: 26, stiffness: 240 }}
    >
      <div className="tree-panel__header">
        <div className="tree-panel__header-left">
          <GitBranch size={15} />
          <span>Schema Tree</span>
          <span className="tree-panel__root-label">{tree.root}</span>
        </div>
        <button type="button" className="icon-button" onClick={onClose}>
          <X size={16} />
        </button>
      </div>

      <div className="tree-panel__body">
        <p className="tree-panel__section-label">Root Entities</p>
        {rootNodes.length > 0
          ? rootNodes.map((n) => renderNode(n, 0))
          : <p className="tree-panel__empty">No root entities detected.</p>}

        {otherNodes.length > 0 && (
          <>
            <p className="tree-panel__section-label" style={{ marginTop: 16 }}>All Entities</p>
            {otherNodes.map((n) => renderNode(n, 1))}
          </>
        )}
      </div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Scores Meter — compact score display for sidebar
// ---------------------------------------------------------------------------

function ScoreMeter({ label, value }) {
  const pct = Math.round((value || 0) * 100);
  const color =
    pct >= 55 ? 'var(--teal)' :
    pct >= 35 ? 'var(--amber)' :
    '#ef4444';

  return (
    <div className="score-meter">
      <div className="score-meter__top">
        <span className="score-meter__label">{label}</span>
        <span className="score-meter__value" style={{ color }}>{pct}%</span>
      </div>
      <div className="score-meter__bar">
        <div
          className="score-meter__fill"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
    </div>
  );
}

function ScoresCard({ scores }) {
  if (!scores) return null;
  return (
    <div className="sidebar-card sidebar-card--scores">
      <p className="sidebar-card__eyebrow">
        <TrendingUp size={13} style={{ marginRight: 5 }} />
        Match Scores
      </p>
      <div className="scores-grid">
        <ScoreMeter label="Semantic" value={scores.semantic_score} />
        <ScoreMeter label="Structural" value={scores.structural_score} />
        <ScoreMeter label="Rel. Density" value={scores.relationship_density} />
        <div className="score-overall">
          <span>Overall</span>
          <strong style={{
            color: (scores.overall_score || 0) >= 0.55 ? 'var(--teal)' :
                   (scores.overall_score || 0) >= 0.35 ? 'var(--amber)' : '#ef4444'
          }}>
            {Math.round((scores.overall_score || 0) * 100)}%
          </strong>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Decision Badge — shows AI decision result in header
// ---------------------------------------------------------------------------

function DecisionBadge({ decision }) {
  if (!decision) return null;
  const isReconstruct = decision.action === 'RECONSTRUCT';

  return (
    <div className={`decision-badge decision-badge--${isReconstruct ? 'reconstruct' : 'refine'}`}>
      <WandSparkles size={12} />
      <span>AI: {decision.action}</span>
      <span className="decision-badge__confidence">
        {Math.round((decision.confidence || 0) * 100)}%
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Constants & helpers (unchanged)
// ---------------------------------------------------------------------------

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

      {!expanded && (
        <p className="schema-node__description">{data.description}</p>
      )}

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
    const raw = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || 'null');
    if (!raw) return null;

    // Validate the payload has a usable schema structure.
    // If it only has a single architecture (old pre-fix data), clear it so the
    // user sees the empty state and regenerates rather than a misleading blank canvas.
    const archs = raw?.schemaResult?.schema?.architectures || [];
    const hasAnyColumns = archs.some(
      (a) => (a.tables || a.collections || []).length > 0
    );
    if (!hasAnyColumns) {
      window.localStorage.removeItem(STORAGE_KEY);
      return null;
    }

    return raw;
  } catch {
    return null;
  }
};

const writeStoredPayload = (payload) => {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    return true;
  } catch {
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
      data: { label: edge.label, tone: mode === 'sql' ? '#5c8dff' : '#ff9f43' },
      style: { stroke: mode === 'sql' ? '#5c8dff' : '#ff9f43', strokeWidth: 3.5 },
      labelStyle: { fill: '#41526b', fontWeight: 800, fontSize: 11 },
      labelBgStyle: { fill: 'rgba(255,255,255,0.96)' },
      labelBgPadding: [10, 6],
      labelBgBorderRadius: 999,
    }));

  return { nodes: laidOutNodes, edges, architecture };
};

const prettyJson = (value) => {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
};

// ---------------------------------------------------------------------------
// Main canvas
// ---------------------------------------------------------------------------

function StudioCanvas() {
  const reactFlow = useReactFlow();
  const [payload, setPayload] = useState(readStoredPayload());
  const [mode, setMode] = useState(() => {
    const storedArchitectures = readStoredPayload()?.schemaResult?.schema?.architectures || [];
    const storedModes = storedArchitectures.map((item) => item.database_type).filter(Boolean);
    if (storedModes.includes('sql')) return 'sql';
    return storedModes[0] || 'sql';
  });
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [augmentDrawerMode, setAugmentDrawerMode] = useState(null);
  const [editPrompt, setEditPrompt] = useState('');
  const [augmentPrompt, setAugmentPrompt] = useState('');
  const [refineLoading, setRefineLoading] = useState(false);
  const [augmentLoading, setAugmentLoading] = useState(false);
  const [error, setError] = useState('');
  const [augmentError, setAugmentError] = useState('');
  const [openApiDoc, setOpenApiDoc] = useState(null);
  const [openApiYaml, setOpenApiYaml] = useState('');
  const [openApiFormat, setOpenApiFormat] = useState('json');
  const [openApiLoading, setOpenApiLoading] = useState(false);
  const [openApiError, setOpenApiError] = useState('');
  const [copied, setCopied] = useState(false);

  // Always show both buttons — mode availability is not gated on payload content.
  // If a mode's architecture is missing, buildGraph returns empty nodes (blank canvas).
  const MODE_BUTTONS = ['sql', 'nosql'];

  const graph = useMemo(() => buildGraph(payload, mode), [payload, mode]);
  const [nodes, setNodes, onNodesChange] = useNodesState(graph.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(graph.edges);

  useEffect(() => {
    setNodes(graph.nodes);
    setEdges(graph.edges);
  }, [graph, setEdges, setNodes]);

  useEffect(() => {
    if (graph.nodes.length === 0) return;
    const timer = window.setTimeout(() => {
      reactFlow.fitView({ padding: 0.18, duration: 350, includeHiddenNodes: true });
    }, 0);
    return () => window.clearTimeout(timer);
  }, [graph.nodes, graph.edges, mode, reactFlow]);

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
            data: { label: 'manual link', tone: mode === 'sql' ? '#5c8dff' : '#ff9f43' },
            style: { stroke: mode === 'sql' ? '#5c8dff' : '#ff9f43', strokeWidth: 3.5 },
            labelStyle: { fill: '#41526b', fontWeight: 800, fontSize: 11 },
            labelBgStyle: { fill: 'rgba(255,255,255,0.96)' },
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
        throw new Error(editResult.error?.message || 'Unable to apply changes.');
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
        body: JSON.stringify({ existingSchema, instruction: augmentPrompt, mode: augmentDrawerMode }),
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
          title: payload?.schemaForm?.prompt ? `${payload.schemaForm.prompt} API` : 'Generated API',
          version: '1.0.0',
          sourceArch: mode,
          format: 'yaml',
        }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error?.message || 'Failed to generate OpenAPI spec.');
      }
      setOpenApiDoc(result.openapi);
      setOpenApiYaml(result.yamlText || '');
    } catch (err) {
      setOpenApiError(err.message || 'Failed to generate OpenAPI spec.');
    } finally {
      setOpenApiLoading(false);
    }
  }, [payload, mode]);

  const copyOpenApi = useCallback(() => {
    if (!openApiDoc) return;
    const text = openApiFormat === 'yaml' ? openApiYaml : JSON.stringify(openApiDoc, null, 2);
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    });
  }, [openApiDoc, openApiYaml, openApiFormat]);

  const downloadOpenApi = useCallback(() => {
    if (!openApiDoc) return;
    const isYaml = openApiFormat === 'yaml';
    const content = isYaml ? openApiYaml : JSON.stringify(openApiDoc, null, 2);
    const mime = isYaml ? 'text/yaml' : 'application/json';
    const ext  = isYaml ? 'yaml' : 'json';
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const slug = (openApiDoc.info?.title || 'openapi').toLowerCase().replace(/\s+/g, '-');
    a.href = url;
    a.download = `${slug}.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  }, [openApiDoc, openApiYaml, openApiFormat]);

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
                {MODE_BUTTONS.map((item) => (
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

          {/* Flow canvas */}
          <div className="flow-shell" style={{ position: 'relative' }}>
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

            {/* Empty state — shown when the selected mode has no architecture in the schema */}
            {nodes.length === 0 && (
              <div className="canvas-empty-state">
                <div className="canvas-empty-state__card">
                  {mode === 'sql' ? <Database size={22} /> : <Binary size={22} />}
                  <p className="canvas-empty-state__title">
                    No {mode.toUpperCase()} architecture in this schema
                  </p>
                  <p className="canvas-empty-state__sub">
                    Regenerate with <strong>Database: Both</strong> from the dashboard to get both SQL and NoSQL views.
                  </p>
                </div>
              </div>
            )}
          </div>
        </section>

        <aside className="studio-sidebar">
          {/* Snapshot card */}
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

          {/* Match scores — shown when present */}
          {/* Schema actions */}
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

          {/* OpenAPI export card */}
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
            <button type="button" className="openapi-export-btn" onClick={exportOpenApi} disabled={openApiLoading}>
              <Zap size={15} />
              {openApiLoading ? 'Generating…' : 'Generate OpenAPI Spec'}
            </button>
          </div>

          {/* Visual notes */}
          <div className="sidebar-card">
            <p className="sidebar-card__eyebrow">Visual Notes</p>
            <div className="sidebar-card__list">
              <div><ArrowRightLeft size={15} />Drag blocks to reorganize the canvas.</div>
              <div><Cable size={15} />Pull new wires from one side handle to another.</div>
              <div><WandSparkles size={15} />Use Edit to regenerate instead of manually rewriting JSON.</div>
            </div>
          </div>

          {/* Decision reasoning card — shown when AI decision engine ran */}
          {/* Schema preview */}
          <div className="sidebar-card sidebar-card--code">
            <p className="sidebar-card__eyebrow">Schema Preview</p>
            <pre>{prettyJson(payload.schemaResult?.preview || '(empty)')}</pre>
          </div>
        </aside>
      </div>

      {/* ── Augment drawer ──────────────────────────────── */}
      <AnimatePresence>
        {augmentDrawerMode ? (
          <motion.div className="refine-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
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
                <button type="button" className="secondary-pill" onClick={() => setAugmentDrawerMode(null)}>Cancel</button>
                <button type="button" className="primary-pill" disabled={augmentLoading || !augmentPrompt.trim()} onClick={augmentSchema}>
                  {augmentLoading ? 'Updating...' : 'Apply Changes'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {/* ── Edit drawer ─────────────────────────────────── */}
      <AnimatePresence>
        {drawerOpen ? (
          <motion.div className="refine-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
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
                  <p>Describe the schema changes in plain English.</p>
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
                <button type="button" className="secondary-pill" onClick={() => setDrawerOpen(false)}>Cancel</button>
                <button type="button" className="primary-pill" disabled={refineLoading || !editPrompt.trim()} onClick={refineSchema}>
                  {refineLoading ? 'Regenerating...' : 'Apply Changes'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {/* ── OpenAPI viewer modal ─────────────────────────── */}
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
              <div className="openapi-modal__header">
                <div className="openapi-modal__header-left">
                  <span className="openapi-modal__badge"><FileJson2 size={13} />OpenAPI 3.1.0</span>
                  <h2 className="openapi-modal__title">{openApiDoc.info?.title}</h2>
                  <p className="openapi-modal__meta">
                    {Object.keys(openApiDoc.components?.schemas || {}).length} schemas &middot;&nbsp;
                    {Object.keys(openApiDoc.paths || {}).length} paths &middot;&nbsp;
                    JSON Schema 2020-12
                  </p>
                </div>
                <div className="openapi-modal__header-right">
                  <div className="openapi-format-toggle">
                    <button type="button" className={`openapi-format-btn${openApiFormat === 'json' ? ' openapi-format-btn--active' : ''}`} onClick={() => setOpenApiFormat('json')}>JSON</button>
                    <button type="button" className={`openapi-format-btn${openApiFormat === 'yaml' ? ' openapi-format-btn--active' : ''}`} onClick={() => setOpenApiFormat('yaml')}>YAML</button>
                  </div>
                  <button type="button" className="openapi-action-btn openapi-action-btn--copy" onClick={copyOpenApi}>
                    {copied ? <Check size={14} /> : <Clipboard size={14} />}
                    {copied ? 'Copied!' : `Copy ${openApiFormat.toUpperCase()}`}
                  </button>
                  <button type="button" className="openapi-action-btn openapi-action-btn--download" onClick={downloadOpenApi}>
                    <Download size={14} />
                    {`Download .${openApiFormat}`}
                  </button>
                  <button type="button" className="icon-button" onClick={() => { setOpenApiDoc(null); setOpenApiError(''); }}>
                    <X size={18} />
                  </button>
                </div>
              </div>
              <div className="openapi-modal__body">
                <pre className="openapi-modal__code">
                  {openApiFormat === 'yaml'
                    ? <YamlHighlight text={openApiYaml} />
                    : <OpenApiHighlight doc={openApiDoc} />}
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
