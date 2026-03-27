import React, { useCallback, useEffect, useMemo, useState } from 'react';
import dagre from 'dagre';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Background,
  Controls,
  Handle,
  MiniMap,
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
  Database,
  LayoutGrid,
  PencilLine,
  Sparkles,
  WandSparkles,
  X,
} from 'lucide-react';

const STORAGE_KEY = 'brmh-schema-preview';
const NODE_WIDTH = 320;
const NODE_HEIGHT = 220;

const nodeTypes = {
  schema: SchemaNode,
};

function SchemaNode({ data, selected }) {
  return (
    <div className={`schema-node ${selected ? 'schema-node--selected' : ''} ${data.variant === 'sql' ? 'schema-node--sql' : 'schema-node--nosql'}`}>
      <Handle type="target" position={Position.Left} className="node-handle node-handle--target" />
      <Handle type="source" position={Position.Right} className="node-handle node-handle--source" />

      <div className="schema-node__top">
        <div>
          <p className="schema-node__eyebrow">{data.variant === 'sql' ? 'Table' : 'Collection'}</p>
          <h3 className="schema-node__title">{data.label}</h3>
        </div>
        <span className="schema-node__count">{data.fields.length} fields</span>
      </div>

      <p className="schema-node__description">{data.description}</p>

      <div className="schema-node__fields">
        {data.fields.map((field) => (
          <div key={field.name} className="schema-node__field">
            <div>
              <strong>{field.name}</strong>
              <span>{field.type || 'string'}</span>
            </div>
            <div className="schema-node__badges">
              {field.primary_key ? <span>PK</span> : null}
              {field.required ? <span>REQ</span> : null}
              {field.foreign_key ? <span>FK</span> : null}
            </div>
          </div>
        ))}
      </div>
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
    primary_key: Boolean(field.primary_key),
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
  dag.setGraph({ rankdir: 'LR', nodesep: 54, ranksep: 120, marginx: 44, marginy: 44 });

  const nodes = items.map((item) => {
    dag.setNode(item.name, { width: NODE_WIDTH, height: NODE_HEIGHT });
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
        y: position.y - NODE_HEIGHT / 2,
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
  const [editPrompt, setEditPrompt] = useState('');
  const [refineLoading, setRefineLoading] = useState(false);
  const [error, setError] = useState('');

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

  const selectedNode = nodes[0] || null;
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
    if (!payload?.schemaForm?.prompt || !editPrompt.trim()) {
      return;
    }

    setRefineLoading(true);
    setError('');

    try {
      const response = await fetch('/api/schema/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: `${payload.schemaForm.prompt}\n\nApply these requested schema changes while keeping the response visually coherent:\n${editPrompt}`,
          provider: payload.schemaForm.provider || undefined,
          model: payload.schemaForm.model || undefined,
          sourceData: payload.schemaResult?.schema || undefined,
        }),
      });
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error?.message || 'Unable to refine schema.');
      }

      const nextPayload = {
        ...payload,
        schemaResult: result,
      };

      setPayload(nextPayload);
      writeStoredPayload(nextPayload);
      setEditPrompt('');
      setDrawerOpen(false);
    } catch (requestError) {
      setError(requestError.message || 'Unable to refine schema.');
    } finally {
      setRefineLoading(false);
    }
  }, [editPrompt, payload]);

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
            <div>
              <p className="studio-kicker">Visual Schema Studio</p>
              <h1>BRMH</h1>
              <p className="studio-copy">
                Premium schema canvas with Apple-inspired surfaces, graceful edge routing, drag-and-drop blocks, and cursor-driven wiring.
              </p>
            </div>

            <div className="studio-header__actions">
              <button type="button" className="primary-pill primary-pill--header" onClick={() => setDrawerOpen(true)}>
                <PencilLine size={16} />
                Edit Schema
              </button>

              <div className="mode-switch">
                {['sql', 'nosql'].map((item) => (
                  <button
                    key={item}
                    type="button"
                    className={item === mode ? 'mode-switch__button mode-switch__button--active' : 'mode-switch__button'}
                    onClick={() => setMode(item)}
                  >
                    {item === 'sql' ? <Database size={16} /> : <Binary size={16} />}
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
              <Background color="rgba(110, 128, 152, 0.22)" gap={28} size={1.2} />
              <MiniMap
                pannable
                zoomable
                className="studio-minimap"
                nodeStrokeColor={(node) => (node.data?.variant === 'sql' ? '#5c8dff' : '#ff9f43')}
                nodeColor={() => 'rgba(255,255,255,0.92)'}
              />
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
            <div className="sidebar-card__row">
              <div>
                <p className="sidebar-card__eyebrow">Schema Refinement</p>
                <p className="sidebar-card__text">Open a dedicated prompt panel to request structural changes and regenerate the schema.</p>
              </div>
              <button type="button" className="primary-pill" onClick={() => setDrawerOpen(true)}>
                <PencilLine size={16} />
                Edit
              </button>
            </div>
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

      <button type="button" className="floating-edit-pill" onClick={() => setDrawerOpen(true)}>
        <PencilLine size={16} />
        Edit Schema
      </button>

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
                  <p>Describe the changes you want and regenerate the graph with a cleaner information architecture.</p>
                </div>
                <button type="button" className="icon-button" onClick={() => setDrawerOpen(false)}>
                  <X size={18} />
                </button>
              </div>

              <textarea
                value={editPrompt}
                onChange={(event) => setEditPrompt(event.target.value)}
                placeholder="Add an invoices table linked to organizations, split comments into moderation events, and make the NoSQL graph optimized for feed reads."
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
