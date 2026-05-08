import { useState } from 'react';
import { SlidersHorizontal, ChevronDown, ChevronUp, RotateCcw, AlertTriangle, GitBranch } from 'lucide-react';

const Section = ({ title, children, icon: Icon }) => {
    const [open, setOpen] = useState(true);
    return (
        <div style={{ borderBottom: '1px solid #f1f5f9' }}>
            <button
                onClick={() => setOpen(o => !o)}
                style={{ width: '100%', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'none', border: 'none', cursor: 'pointer' }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {Icon && <Icon size={13} color="#3b82f6" />}
                    <span style={{ fontSize: 10, fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: 1.2 }}>{title}</span>
                </div>
                {open ? <ChevronUp size={14} color="#94a3b8" /> : <ChevronDown size={14} color="#94a3b8" />}
            </button>
            {open && <div style={{ padding: '0 16px 16px' }}>{children}</div>}
        </div>
    );
};

const TrailFilters = ({ options, onChange, nodes = [], stats, onReset }) => {
    const { maxDepth = 5, startAcc = '', minAmount = '', maxAmount = '', showSuspiciousOnly = false } = options;

    const accountOptions = nodes.map(n => n.id).sort();

    const update = (key, val) => onChange({ ...options, [key]: val });

    return (
        <div style={{ width: 240, background: '#fff', borderRight: '1px solid #e2e8f0', overflowY: 'auto', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
            {/* Header */}
            <div style={{ padding: '16px 16px 12px', borderBottom: '1px solid #f1f5f9', background: '#f8fafc' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <SlidersHorizontal size={14} color="#3b82f6" />
                        <span style={{ fontSize: 11, fontWeight: 900, color: '#1e293b', textTransform: 'uppercase', letterSpacing: 1 }}>Filters</span>
                    </div>
                    <button onClick={onReset} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 8px', background: '#f1f5f9', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 9, fontWeight: 800, color: '#64748b' }}>
                        <RotateCcw size={10} /> Reset
                    </button>
                </div>
            </div>

            {/* Stats Summary */}
            {stats && (
                <div style={{ padding: '12px 16px', background: '#f8fafc', borderBottom: '1px solid #f1f5f9' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                        <StatPill label="Nodes" value={stats.totalNodes} color="#3b82f6" />
                        <StatPill label="Edges" value={stats.totalEdges} color="#8b5cf6" />
                        <StatPill label="Layers" value={stats.totalLayers} color="#10b981" />
                        <StatPill label="Circular" value={stats.circularTransactions} color={stats.circularTransactions > 0 ? '#ef4444' : '#10b981'} />
                        <div style={{ gridColumn: '1/-1' }}>
                            <StatPill label="Suspicious" value={stats.suspiciousNodes} color={stats.suspiciousNodes > 0 ? '#f59e0b' : '#10b981'} wide />
                        </div>
                    </div>
                </div>
            )}

            <Section title="Start Account" icon={GitBranch}>
                <select
                    value={startAcc}
                    onChange={e => update('startAcc', e.target.value)}
                    style={{ width: '100%', padding: '8px 10px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 10, fontWeight: 700, color: '#334155', background: '#f8fafc', outline: 'none', cursor: 'pointer' }}
                >
                    <option value="">Auto Detect (All Roots)</option>
                    {accountOptions.slice(0, 100).map(acc => (
                        <option key={acc} value={acc}>{acc.length > 28 ? acc.substring(0, 28) + '…' : acc}</option>
                    ))}
                </select>
                <p style={{ fontSize: 9, color: '#94a3b8', marginTop: 6 }}>Leave empty to auto-detect root nodes</p>
            </Section>

            <Section title="Layer Depth">
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <input
                        type="range" min={1} max={10} value={maxDepth}
                        onChange={e => update('maxDepth', parseInt(e.target.value))}
                        style={{ flex: 1, accentColor: '#3b82f6' }}
                    />
                    <span style={{ fontSize: 14, fontWeight: 900, color: '#1e293b', minWidth: 24, textAlign: 'center' }}>{maxDepth}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                    <span style={{ fontSize: 9, color: '#94a3b8' }}>1 Layer</span>
                    <span style={{ fontSize: 9, color: '#94a3b8' }}>10 Layers</span>
                </div>
            </Section>

            <Section title="Amount Range (₹)">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div>
                        <label style={{ fontSize: 9, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.8, display: 'block', marginBottom: 4 }}>Min Amount</label>
                        <input
                            type="number" min={0}
                            value={minAmount}
                            onChange={e => update('minAmount', e.target.value)}
                            placeholder="0"
                            style={{ width: '100%', padding: '7px 10px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 11, fontWeight: 700, color: '#334155', background: '#f8fafc', outline: 'none', boxSizing: 'border-box' }}
                        />
                    </div>
                    <div>
                        <label style={{ fontSize: 9, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.8, display: 'block', marginBottom: 4 }}>Max Amount</label>
                        <input
                            type="number" min={0}
                            value={maxAmount}
                            onChange={e => update('maxAmount', e.target.value)}
                            placeholder="No limit"
                            style={{ width: '100%', padding: '7px 10px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 11, fontWeight: 700, color: '#334155', background: '#f8fafc', outline: 'none', boxSizing: 'border-box' }}
                        />
                    </div>
                </div>
            </Section>

            <Section title="Visibility" icon={AlertTriangle}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', padding: '4px 0' }}>
                    <div
                        onClick={() => update('showSuspiciousOnly', !showSuspiciousOnly)}
                        style={{
                            width: 36, height: 20, borderRadius: 10,
                            background: showSuspiciousOnly ? '#ef4444' : '#e2e8f0',
                            position: 'relative', cursor: 'pointer', transition: 'background 0.2s', flexShrink: 0
                        }}
                    >
                        <div style={{
                            width: 16, height: 16, borderRadius: '50%', background: '#fff',
                            position: 'absolute', top: 2,
                            left: showSuspiciousOnly ? 18 : 2,
                            transition: 'left 0.2s',
                            boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
                        }} />
                    </div>
                    <span style={{ fontSize: 10, fontWeight: 700, color: '#475569' }}>
                        {showSuspiciousOnly ? 'Suspicious Only' : 'Show All Nodes'}
                    </span>
                </label>
            </Section>

            {/* Legend */}
            <div style={{ padding: '12px 16px', marginTop: 'auto', borderTop: '1px solid #f1f5f9' }}>
                <p style={{ fontSize: 9, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 10 }}>Risk Legend</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <LegendItem color="#10b981" label="Normal" />
                    <LegendItem color="#f59e0b" label="Moderate Risk" />
                    <LegendItem color="#ef4444" label="Critical / Suspicious" />
                    <LegendItem color="#ef4444" dashed label="Circular Transaction" />
                </div>
            </div>
        </div>
    );
};

const StatPill = ({ label, value, color, wide }) => (
    <div style={{
        background: `${color}11`, border: `1px solid ${color}33`,
        borderRadius: 8, padding: '6px 8px',
        textAlign: 'center',
        gridColumn: wide ? '1/-1' : 'auto',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    }}>
        <span style={{ fontSize: 9, fontWeight: 700, color: '#64748b' }}>{label}</span>
        <span style={{ fontSize: 13, fontWeight: 900, color }}>{value ?? '—'}</span>
    </div>
);

const LegendItem = ({ color, label, dashed }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{
            width: 24, height: 3,
            background: dashed ? 'none' : color,
            borderTop: dashed ? `2px dashed ${color}` : 'none',
            borderRadius: 2,
        }} />
        <span style={{ fontSize: 9, fontWeight: 700, color: '#64748b' }}>{label}</span>
    </div>
);

export default TrailFilters;
