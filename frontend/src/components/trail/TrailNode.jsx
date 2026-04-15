import { Handle, Position } from '@xyflow/react';
import { memo } from 'react';

const RISK_STYLES = {
    normal: {
        border: '#10b981',
        headerBg: 'linear-gradient(135deg,#f0fdf4,#dcfce7)',
        dot: '#10b981',
        badge: { bg: '#dcfce7', color: '#065f46' },
        glow: '0 0 0 2px rgba(16,185,129,0.2)',
    },
    moderate: {
        border: '#f59e0b',
        headerBg: 'linear-gradient(135deg,#fffbeb,#fef3c7)',
        dot: '#f59e0b',
        badge: { bg: '#fef3c7', color: '#92400e' },
        glow: '0 0 0 2px rgba(245,158,11,0.25)',
    },
    critical: {
        border: '#ef4444',
        headerBg: 'linear-gradient(135deg,#fef2f2,#fee2e2)',
        dot: '#ef4444',
        badge: { bg: '#fee2e2', color: '#991b1b' },
        glow: '0 0 12px rgba(239,68,68,0.4), 0 0 0 2px rgba(239,68,68,0.3)',
    },
};

const TrailNode = memo(({ data, selected }) => {
    const level = data.suspicionLevel || 'normal';
    const S = RISK_STYLES[level] || RISK_STYLES.normal;

    const fmt = (n) => {
        if (!n && n !== 0) return '—';
        if (n >= 10000000) return `₹${(n / 10000000).toFixed(2)}Cr`;
        if (n >= 100000) return `₹${(n / 100000).toFixed(2)}L`;
        return `₹${parseFloat(n).toLocaleString('en-IN')}`;
    };

    return (
        <div
            style={{
                border: `2px solid ${S.border}`,
                boxShadow: selected
                    ? `0 0 0 3px ${S.border}55, 0 8px 24px rgba(0,0,0,0.15)`
                    : `${S.glow}, 0 4px 14px rgba(0,0,0,0.08)`,
                borderRadius: 16,
                background: '#fff',
                minWidth: 190,
                maxWidth: 220,
                cursor: 'pointer',
                transition: 'box-shadow 0.2s, transform 0.15s',
                transform: selected ? 'scale(1.04)' : 'scale(1)',
                overflow: 'hidden',
            }}
        >
            {/* Handles */}
            <Handle type="target" position={Position.Top} style={{ background: S.dot, width: 10, height: 10, border: '2px solid #fff' }} />
            <Handle type="source" position={Position.Bottom} style={{ background: S.dot, width: 10, height: 10, border: '2px solid #fff' }} />

            {/* Header band */}
            <div style={{ background: S.headerBg, padding: '8px 12px 6px', borderBottom: `1px solid ${S.border}22` }}>
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 4 }}>
                    {data.isRoot && (
                        <span style={{ fontSize: 8, fontWeight: 900, letterSpacing: 1.2, background: '#dbeafe', color: '#1e40af', padding: '2px 6px', borderRadius: 6, textTransform: 'uppercase' }}>
                            ROOT
                        </span>
                    )}
                    {data.isCircular && (
                        <span style={{ fontSize: 8, fontWeight: 900, letterSpacing: 1.2, background: '#fee2e2', color: '#991b1b', padding: '2px 6px', borderRadius: 6, textTransform: 'uppercase' }}>
                            ⟳ CIRCULAR
                        </span>
                    )}
                    {!data.isRoot && !data.isCircular && level !== 'normal' && (
                        <span style={{ fontSize: 8, fontWeight: 900, background: S.badge.bg, color: S.badge.color, padding: '2px 6px', borderRadius: 6, textTransform: 'uppercase' }}>
                            {level === 'critical' ? '⚠ CRITICAL' : '⚡ MODERATE'}
                        </span>
                    )}
                </div>
                <p style={{ fontSize: 10, fontWeight: 900, color: '#0f172a', fontFamily: 'monospace', wordBreak: 'break-all', lineHeight: 1.3, margin: 0 }}>
                    {data.label}
                </p>
            </div>

            {/* Stats */}
            <div style={{ padding: '8px 12px 10px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                <div>
                    <p style={{ fontSize: 7, color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8, margin: 0 }}>Received</p>
                    <p style={{ fontSize: 10, fontWeight: 900, color: '#059669', margin: 0 }}>{fmt(data.total_in)}</p>
                </div>
                <div>
                    <p style={{ fontSize: 7, color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8, margin: 0 }}>Sent</p>
                    <p style={{ fontSize: 10, fontWeight: 900, color: '#dc2626', margin: 0 }}>{fmt(data.total_out)}</p>
                </div>
                <div style={{ gridColumn: '1/-1', display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 4, borderTop: '1px solid #f1f5f9' }}>
                    <span style={{ fontSize: 8, color: '#94a3b8', fontWeight: 700 }}>Layer {data.layer === 99 ? '?' : data.layer}</span>
                    <span style={{ fontSize: 8, color: '#64748b', fontWeight: 600 }}>{data.transactionCount || 0} txn</span>
                </div>
            </div>
        </div>
    );
});

TrailNode.displayName = 'TrailNode';
export default TrailNode;
