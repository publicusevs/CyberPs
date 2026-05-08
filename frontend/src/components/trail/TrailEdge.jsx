import { BaseEdge, EdgeLabelRenderer, getSmoothStepPath, MarkerType } from '@xyflow/react';
import { memo } from 'react';

const TrailEdge = memo(({
    id, sourceX, sourceY, targetX, targetY,
    sourcePosition, targetPosition,
    data = {},
    markerEnd,
    style = {},
    selected,
}) => {
    const [edgePath, labelX, labelY] = getSmoothStepPath({
        sourceX, sourceY, sourcePosition,
        targetX, targetY, targetPosition,
        borderRadius: 12,
    });

    const isCircular = data?.isCircular;
    const amount = data?.amount;
    const color = isCircular ? '#ef4444' : (selected ? '#3b82f6' : '#94a3b8');

    const fmt = (n) => {
        if (!n && n !== 0) return '';
        if (n >= 10000000) return `₹${(n / 10000000).toFixed(1)}Cr`;
        if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
        if (n >= 1000) return `₹${(n / 1000).toFixed(1)}K`;
        return `₹${parseFloat(n).toLocaleString('en-IN')}`;
    };

    return (
        <>
            <BaseEdge
                id={id}
                path={edgePath}
                markerEnd={markerEnd}
                style={{
                    stroke: color,
                    strokeWidth: isCircular ? 2.5 : (selected ? 2 : 1.5),
                    strokeDasharray: isCircular ? '6 3' : 'none',
                    animation: isCircular ? 'dash 1.5s linear infinite' : 'none',
                    ...style,
                }}
            />
            {amount > 0 && (
                <EdgeLabelRenderer>
                    <div
                        style={{
                            position: 'absolute',
                            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
                            pointerEvents: 'all',
                            zIndex: 10,
                        }}
                        className="nodrag nopan"
                    >
                        <div style={{
                            background: isCircular ? '#fef2f2' : '#f8fafc',
                            border: `1px solid ${isCircular ? '#fca5a5' : '#e2e8f0'}`,
                            borderRadius: 8,
                            padding: '2px 8px',
                            fontSize: 9,
                            fontWeight: 900,
                            color: isCircular ? '#dc2626' : '#475569',
                            whiteSpace: 'nowrap',
                            boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
                            fontFamily: 'monospace',
                        }}>
                            {fmt(amount)}
                            {isCircular && ' ⟳'}
                        </div>
                    </div>
                </EdgeLabelRenderer>
            )}
        </>
    );
});

TrailEdge.displayName = 'TrailEdge';
export default TrailEdge;
