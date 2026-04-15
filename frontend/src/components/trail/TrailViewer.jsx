import { useCallback, useEffect, useMemo, useRef } from 'react';
import {
    ReactFlow, MiniMap, Controls, Background, BackgroundVariant,
    useNodesState, useEdgesState, MarkerType, Panel,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import dagre from '@dagrejs/dagre';
import TrailNode from './TrailNode';
import TrailEdge from './TrailEdge';

const nodeTypes = { trailNode: TrailNode };
const edgeTypes = { trailEdge: TrailEdge };

const NODE_W = 200;
const NODE_H = 100;

function getLayoutedElements(rawNodes, rawEdges, direction = 'TB', showSuspiciousOnly = false) {
    // Filter
    const visibleNodes = showSuspiciousOnly
        ? rawNodes.filter(n => n.suspicionLevel !== 'normal')
        : rawNodes;

    const visibleIds = new Set(visibleNodes.map(n => n.id));
    const visibleEdges = rawEdges.filter(e => visibleIds.has(e.from) && visibleIds.has(e.to));

    // Dagre layout
    const g = new dagre.graphlib.Graph();
    g.setDefaultEdgeLabel(() => ({}));
    g.setGraph({ rankdir: direction, ranksep: 120, nodesep: 70, edgesep: 40 });

    visibleNodes.forEach(n => g.setNode(n.id, { width: NODE_W, height: NODE_H }));
    visibleEdges.forEach(e => g.setEdge(e.from, e.to));

    dagre.layout(g);

    const flowNodes = visibleNodes.map(n => {
        const pos = g.node(n.id) || { x: 0, y: 0 };
        return {
            id: n.id,
            type: 'trailNode',
            position: { x: pos.x - NODE_W / 2, y: pos.y - NODE_H / 2 },
            data: {
                label: n.label,
                total_in: n.total_in,
                total_out: n.total_out,
                transactionCount: n.transactionCount,
                suspicionLevel: n.suspicionLevel,
                suspicionReasons: n.suspicionReasons,
                isRoot: n.isRoot,
                isCircular: n.isCircular,
                layer: n.layer,
            },
            draggable: true,
        };
    });

    const flowEdges = visibleEdges.map(e => ({
        id: e.id || `${e.from}->${e.to}::${e.utr}`,
        source: e.from,
        target: e.to,
        type: 'trailEdge',
        data: { amount: e.amount, utr: e.utr, platform: e.platform, isCircular: e.isCircular },
        animated: e.isCircular,
        markerEnd: {
            type: MarkerType.ArrowClosed,
            width: 14,
            height: 14,
            color: e.isCircular ? '#ef4444' : '#94a3b8',
        },
        style: {
            stroke: e.isCircular ? '#ef4444' : '#cbd5e1',
        },
    }));

    return { nodes: flowNodes, edges: flowEdges };
}

const TrailViewer = ({ graphData, filterOptions = {}, onSelectNode, selectedNodeId }) => {
    const [nodes, setNodes, onNodesChange] = useNodesState([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState([]);
    const rfRef = useRef(null);

    const { showSuspiciousOnly = false } = filterOptions;

    // Rebuild layout whenever graphData or filter changes
    useEffect(() => {
        if (!graphData || !graphData.nodes || graphData.nodes.length === 0) {
            setNodes([]);
            setEdges([]);
            return;
        }

        const { nodes: ln, edges: le } = getLayoutedElements(
            graphData.nodes,
            graphData.edges,
            'TB',
            showSuspiciousOnly
        );
        setNodes(ln);
        setEdges(le);
    }, [graphData, showSuspiciousOnly]);

    // Highlight selected node
    useEffect(() => {
        setNodes(nds => nds.map(n => ({
            ...n,
            selected: n.id === selectedNodeId,
        })));
    }, [selectedNodeId]);

    const onNodeClick = useCallback((_, node) => {
        if (onSelectNode) onSelectNode(node.id);
    }, [onSelectNode]);

    const onPaneClick = useCallback(() => {
        if (onSelectNode) onSelectNode(null);
    }, [onSelectNode]);

    const stats = graphData?.stats;

    if (!graphData || graphData.nodes.length === 0) {
        return (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', flexDirection: 'column', gap: 16 }}>
                <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontSize: 28 }}>🔍</span>
                </div>
                <p style={{ fontSize: 14, color: '#94a3b8', fontWeight: 700, textAlign: 'center' }}>
                    No transaction data to visualize.<br />
                    <span style={{ fontSize: 11 }}>Upload an Excel file or load case data.</span>
                </p>
            </div>
        );
    }

    return (
        <div style={{ flex: 1, position: 'relative', background: '#f1f5f9' }}>
            <ReactFlow
                ref={rfRef}
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onNodeClick={onNodeClick}
                onPaneClick={onPaneClick}
                nodeTypes={nodeTypes}
                edgeTypes={edgeTypes}
                fitView
                fitViewOptions={{ padding: 0.2 }}
                minZoom={0.1}
                maxZoom={3}
                proOptions={{ hideAttribution: true }}
            >
                <Background
                    variant={BackgroundVariant.Dots}
                    gap={20}
                    size={1}
                    color="#cbd5e1"
                />
                <Controls style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10 }} />
                <MiniMap
                    nodeColor={n => {
                        const level = n.data?.suspicionLevel;
                        if (level === 'critical') return '#ef4444';
                        if (level === 'moderate') return '#f59e0b';
                        return '#10b981';
                    }}
                    style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10 }}
                />

                {/* Stats Panel */}
                {stats && (
                    <Panel position="top-right">
                        <div style={{
                            background: '#ffffffee', backdropFilter: 'blur(8px)',
                            border: '1px solid #e2e8f0', borderRadius: 12,
                            padding: '10px 14px', display: 'flex', gap: 16,
                            boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
                        }}>
                            <Stat label="Nodes" value={stats.totalNodes} color="#3b82f6" />
                            <Stat label="Edges" value={stats.totalEdges} color="#8b5cf6" />
                            <Stat label="Layers" value={stats.totalLayers} color="#10b981" />
                            {stats.circularTransactions > 0 && <Stat label="Circular" value={stats.circularTransactions} color="#ef4444" />}
                            {stats.suspiciousNodes > 0 && <Stat label="Suspicious" value={stats.suspiciousNodes} color="#f59e0b" />}
                            <Stat label="Total Flow" value={
                                stats.totalFlow >= 10000000 ? `₹${(stats.totalFlow / 10000000).toFixed(1)}Cr`
                                    : stats.totalFlow >= 100000 ? `₹${(stats.totalFlow / 100000).toFixed(1)}L`
                                        : `₹${(stats.totalFlow || 0).toLocaleString('en-IN')}`
                            } color="#059669" />
                        </div>
                    </Panel>
                )}
            </ReactFlow>

            {/* Circular alert */}
            {graphData?.circularEdges?.length > 0 && (
                <div style={{
                    position: 'absolute', bottom: 80, left: 12,
                    background: '#fef2f2', border: '1px solid #fecaca',
                    borderRadius: 10, padding: '8px 14px',
                    display: 'flex', alignItems: 'center', gap: 8,
                    boxShadow: '0 2px 8px rgba(239,68,68,0.15)',
                    zIndex: 10,
                }}>
                    <span style={{ fontSize: 14 }}>⟳</span>
                    <div>
                        <p style={{ fontSize: 10, fontWeight: 900, color: '#dc2626', textTransform: 'uppercase', letterSpacing: 0.8 }}>Circular Transactions Detected</p>
                        <p style={{ fontSize: 9, color: '#ef4444', fontWeight: 600 }}>{graphData.circularEdges.length} circular flow(s) — dashed red edges</p>
                    </div>
                </div>
            )}
        </div>
    );
};

const Stat = ({ label, value, color }) => (
    <div style={{ textAlign: 'center' }}>
        <p style={{ fontSize: 8, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 2 }}>{label}</p>
        <p style={{ fontSize: 13, fontWeight: 900, color }}>{value}</p>
    </div>
);

export default TrailViewer;
