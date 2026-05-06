import { X, TrendingDown, TrendingUp, AlertTriangle, CheckCircle, Activity, Hash } from 'lucide-react';

const fmt = (n) => {
    if (!n && n !== 0) return '—';
    if (n >= 10000000) return `₹${(n / 10000000).toFixed(2)} Cr`;
    if (n >= 100000) return `₹${(n / 100000).toFixed(2)} L`;
    return `₹${parseFloat(n).toLocaleString('en-IN')}`;
};

const SuspicionBadge = ({ level }) => {
    const map = {
        normal: { label: 'Normal', bg: '#f0fdf4', color: '#15803d', icon: CheckCircle },
        moderate: { label: 'Moderate Risk', bg: '#fffbeb', color: '#d97706', icon: Activity },
        critical: { label: 'Critical / Suspicious', bg: '#fef2f2', color: '#dc2626', icon: AlertTriangle },
    };
    const c = map[level] || map.normal;
    const Icon = c.icon;
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: c.bg, border: `1px solid ${c.color}33`, borderRadius: 10, padding: '6px 12px' }}>
            <Icon size={14} color={c.color} />
            <span style={{ fontSize: 11, fontWeight: 800, color: c.color, textTransform: 'uppercase', letterSpacing: 0.8 }}>{c.label}</span>
        </div>
    );
};

const REASON_LABELS = {
    CIRCULAR_TRANSACTION: { label: 'Circular Transaction', color: '#dc2626' },
    HIGH_FREQUENCY_TRANSFER: { label: 'High Frequency Transfers', color: '#d97706' },
    LARGE_TRANSFER_VOLUME: { label: 'Large Transfer Volume', color: '#d97706' },
    RAPID_MULTILAYER_MOVEMENT: { label: 'Rapid Multi-layer Movement', color: '#7c3aed' },
};

const NodeDetailPanel = ({ node, allEdges = [], onClose, onFocusNode, allNodes = [] }) => {
    if (!node) return null;

    const incomingEdges = allEdges.filter(e => e.to === node.id);
    const outgoingEdges = allEdges.filter(e => e.from === node.id);

    // Find peer nodes
    const getNodeLabel = (id) => {
        const found = allNodes.find(n => n.id === id);
        return found ? found.label : id;
    };

    return (
        <div style={{
            width: 320,
            height: '100%',
            background: '#fff',
            borderLeft: '1px solid #e2e8f0',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            flexShrink: 0,
        }}>
            {/* Header */}
            <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', background: '#f8fafc', position: 'sticky', top: 0, zIndex: 10 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 9, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 4 }}>Selected Node</p>
                    <p style={{ fontSize: 11, fontWeight: 900, color: '#0f172a', fontFamily: 'monospace', wordBreak: 'break-all', lineHeight: 1.4 }}>{node.label}</p>
                </div>
                <button onClick={onClose} style={{ padding: 6, borderRadius: 8, border: 'none', background: '#f1f5f9', cursor: 'pointer', marginLeft: 8, flexShrink: 0 }}>
                    <X size={16} color="#64748b" />
                </button>
            </div>

            <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 20 }}>
                {/* Suspicion Status */}
                <SuspicionBadge level={node.suspicionLevel} />

                {/* Suspicion Reasons */}
                {node.suspicionReasons?.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <p style={{ fontSize: 9, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1.2 }}>Risk Indicators</p>
                        {node.suspicionReasons.map(r => {
                            const info = REASON_LABELS[r] || { label: r, color: '#64748b' };
                            return (
                                <div key={r} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 10px', background: `${info.color}11`, borderRadius: 8, border: `1px solid ${info.color}33` }}>
                                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: info.color, flexShrink: 0 }} />
                                    <span style={{ fontSize: 10, fontWeight: 700, color: info.color }}>{info.label}</span>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Financial Stats */}
                <div>
                    <p style={{ fontSize: 9, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 10 }}>Financial Summary</p>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                        <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 12, padding: '12px 14px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
                                <TrendingUp size={12} color="#059669" />
                                <span style={{ fontSize: 9, fontWeight: 800, color: '#059669', textTransform: 'uppercase' }}>Total In</span>
                            </div>
                            <p style={{ fontSize: 16, fontWeight: 900, color: '#065f46' }}>{fmt(node.total_in)}</p>
                        </div>
                        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 12, padding: '12px 14px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
                                <TrendingDown size={12} color="#dc2626" />
                                <span style={{ fontSize: 9, fontWeight: 800, color: '#dc2626', textTransform: 'uppercase' }}>Total Out</span>
                            </div>
                            <p style={{ fontSize: 16, fontWeight: 900, color: '#991b1b' }}>{fmt(node.total_out)}</p>
                        </div>
                    </div>
                </div>

                {/* Meta */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <p style={{ fontSize: 9, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1.2 }}>Metadata</p>
                    <MetaRow label="Layer" value={node.layer === 99 ? 'Disconnected' : `Layer ${node.layer}`} />
                    <MetaRow label="Transactions" value={`${node.transactionCount || 0} outgoing`} />
                    <MetaRow label="Incoming Connections" value={`${incomingEdges.length} sources`} />
                    <MetaRow label="Outgoing Connections" value={`${outgoingEdges.length} destinations`} />
                    <MetaRow label="Is Root Node" value={node.isRoot ? 'Yes' : 'No'} />
                    <MetaRow label="Circular Involvement" value={node.isCircular ? '⚠ Yes' : 'No'} highlight={node.isCircular} />
                </div>

                {/* Focus Button */}
                <button
                    onClick={() => onFocusNode && onFocusNode(node.id)}
                    style={{
                        width: '100%',
                        padding: '12px',
                        background: '#eef2ff',
                        border: '1px solid #c7d2fe',
                        borderRadius: 12,
                        cursor: 'pointer',
                        fontSize: 12,
                        fontWeight: 800,
                        color: '#4f46e5',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 8,
                        transition: 'all 0.2s',
                        boxShadow: '0 2px 4px rgba(79, 70, 229, 0.05)'
                    }}
                    onMouseOver={e => { e.currentTarget.style.background = '#e0e7ff'; e.currentTarget.style.borderColor = '#a5b4fc'; }}
                    onMouseOut={e => { e.currentTarget.style.background = '#eef2ff'; e.currentTarget.style.borderColor = '#c7d2fe'; }}
                >
                    <Hash size={14} /> Focus Trail From Here
                </button>

                {/* Incoming connections */}
                {incomingEdges.length > 0 && (
                    <ConnectionList
                        title="Incoming from"
                        edges={incomingEdges}
                        labelKey="from"
                        getLabel={getNodeLabel}
                        color="#059669"
                    />
                )}

                {/* Outgoing connections */}
                {outgoingEdges.length > 0 && (
                    <ConnectionList
                        title="Outgoing to"
                        edges={outgoingEdges}
                        labelKey="to"
                        getLabel={getNodeLabel}
                        color="#dc2626"
                    />
                )}
            </div>
        </div>
    );
};

const MetaRow = ({ label, value, highlight }) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 10px', background: '#f8fafc', borderRadius: 8 }}>
        <span style={{ fontSize: 10, color: '#94a3b8', fontWeight: 700 }}>{label}</span>
        <span style={{ fontSize: 10, fontWeight: 800, color: highlight ? '#dc2626' : '#334155' }}>{value}</span>
    </div>
);

const ConnectionList = ({ title, edges, labelKey, getLabel, color }) => (
    <div>
        <p style={{ fontSize: 9, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 8 }}>{title}</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 180, overflowY: 'auto' }}>
            {edges.slice(0, 15).map(edge => (
                <div key={edge.id || `${edge.from}-${edge.to}`} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '6px 10px', background: '#f8fafc', borderRadius: 8,
                    border: edge.isCircular ? '1px solid #fca5a5' : '1px solid transparent'
                }}>
                    <span style={{ fontSize: 9, color: '#475569', fontWeight: 700, fontFamily: 'monospace', maxWidth: '60%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {getLabel(edge[labelKey])}
                    </span>
                    <span style={{ fontSize: 9, fontWeight: 900, color }}>
                        {edge.amount >= 100000
                            ? `₹${(edge.amount / 100000).toFixed(1)}L`
                            : `₹${parseFloat(edge.amount || 0).toLocaleString('en-IN')}`}
                    </span>
                </div>
            ))}
            {edges.length > 15 && (
                <p style={{ fontSize: 9, color: '#94a3b8', textAlign: 'center', padding: 4 }}>+{edges.length - 15} more</p>
            )}
        </div>
    </div>
);

export default NodeDetailPanel;
