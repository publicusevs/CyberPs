import { useState, useMemo } from 'react';
import { Download, ArrowUpDown, ArrowDown, ArrowUp, AlertTriangle, CheckCircle, Activity, Search, ChevronLeft, ChevronRight } from 'lucide-react';

const PAGE_SIZE = 50;

const fmt = (n) => {
    if (!n && n !== 0) return '—';
    if (n >= 10000000) return `₹${(n / 10000000).toFixed(2)} Cr`;
    if (n >= 100000) return `₹${(n / 100000).toFixed(2)} L`;
    return `₹${parseFloat(n).toLocaleString('en-IN')}`;
};

const RISK_COLORS = {
    normal: { bg: '#f0fdf4', color: '#15803d', border: '#bbf7d0' },
    moderate: { bg: '#fffbeb', color: '#d97706', border: '#fde68a' },
    critical: { bg: '#fef2f2', color: '#dc2626', border: '#fecaca' },
};

const TrailTable = ({ edges = [], nodes = [], onSelectNode }) => {
    const [sortKey, setSortKey] = useState('amount');
    const [sortDir, setSortDir] = useState('desc');
    const [filterText, setFilterText] = useState('');
    const [filterRisk, setFilterRisk] = useState('all');
    const [page, setPage] = useState(0);

    // Build node lookup
    const nodeMap = useMemo(() => {
        const m = {};
        nodes.forEach(n => { m[n.id] = n; });
        return m;
    }, [nodes]);

    // Flatten edges with node info
    const tableData = useMemo(() => {
        return edges.map(e => {
            const fromNode = nodeMap[e.from] || {};
            const toNode = nodeMap[e.to] || {};
            const maxRisk = [fromNode.suspicionLevel, toNode.suspicionLevel].includes('critical')
                ? 'critical'
                : [fromNode.suspicionLevel, toNode.suspicionLevel].includes('moderate')
                    ? 'moderate'
                    : 'normal';
            return {
                ...e,
                fromLayer: fromNode.layer,
                toLayer: toNode.layer,
                riskLevel: e.isCircular ? 'critical' : maxRisk,
                fromSuspicion: fromNode.suspicionLevel,
                toSuspicion: toNode.suspicionLevel,
            };
        });
    }, [edges, nodeMap]);

    // Filter
    const filtered = useMemo(() => {
        return tableData.filter(row => {
            const q = filterText.toLowerCase();
            const textMatch = !q ||
                row.from?.toLowerCase().includes(q) ||
                row.to?.toLowerCase().includes(q) ||
                row.utr?.toLowerCase().includes(q) ||
                row.platform?.toLowerCase().includes(q);
            const riskMatch = filterRisk === 'all' || row.riskLevel === filterRisk;
            return textMatch && riskMatch;
        });
    }, [tableData, filterText, filterRisk]);

    // Sort
    const sorted = useMemo(() => {
        return [...filtered].sort((a, b) => {
            let va = a[sortKey], vb = b[sortKey];
            if (sortKey === 'amount') { va = parseFloat(va) || 0; vb = parseFloat(vb) || 0; }
            if (va < vb) return sortDir === 'asc' ? -1 : 1;
            if (va > vb) return sortDir === 'asc' ? 1 : -1;
            return 0;
        });
    }, [filtered, sortKey, sortDir]);

    // Paginate
    const totalPages = Math.ceil(sorted.length / PAGE_SIZE);
    const paged = sorted.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

    const handleSort = (key) => {
        if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
        else { setSortKey(key); setSortDir('desc'); }
    };

    const SortIcon = ({ k }) => {
        if (sortKey !== k) return <ArrowUpDown size={11} color="#cbd5e1" />;
        return sortDir === 'asc' ? <ArrowUp size={11} color="#3b82f6" /> : <ArrowDown size={11} color="#3b82f6" />;
    };

    // CSV Export
    const exportCsv = () => {
        const header = ['From Account', 'To Account', 'Amount', 'UTR/Reference', 'Bank/Platform', 'From Layer', 'To Layer', 'Risk Level', 'Circular'];
        const rows = sorted.map(r => [
            r.from, r.to, r.amount,
            r.utr || '', r.platform || '',
            r.fromLayer === 99 ? 'Disconnected' : `Layer ${r.fromLayer}`,
            r.toLayer === 99 ? 'Disconnected' : `Layer ${r.toLayer}`,
            r.riskLevel, r.isCircular ? 'Yes' : 'No'
        ]);
        const csv = [header, ...rows].map(r => r.map(v => `"${String(v || '').replace(/"/g, '""')}"`).join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `money_trail_${Date.now()}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const COLS = [
        { key: 'from', label: 'From Account', sortable: true },
        { key: 'to', label: 'To Account', sortable: true },
        { key: 'amount', label: 'Amount', sortable: true },
        { key: 'fromLayer', label: 'From Layer', sortable: true },
        { key: 'toLayer', label: 'To Layer', sortable: true },
        { key: 'utr', label: 'UTR / Reference', sortable: false },
        { key: 'platform', label: 'Bank / Platform', sortable: false },
        { key: 'riskLevel', label: 'Risk', sortable: true },
    ];

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#fff' }}>
            {/* Toolbar */}
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, background: '#f8fafc' }}>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                    {/* Search */}
                    <div style={{ position: 'relative' }}>
                        <Search size={13} color="#94a3b8" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }} />
                        <input
                            value={filterText}
                            onChange={e => { setFilterText(e.target.value); setPage(0); }}
                            placeholder="Search account, UTR..."
                            style={{ paddingLeft: 30, paddingRight: 12, paddingTop: 7, paddingBottom: 7, border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 11, fontWeight: 600, color: '#334155', background: '#fff', width: 220, outline: 'none' }}
                        />
                    </div>
                    {/* Risk filter */}
                    <select
                        value={filterRisk}
                        onChange={e => { setFilterRisk(e.target.value); setPage(0); }}
                        style={{ padding: '7px 12px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 11, fontWeight: 700, color: '#475569', background: '#fff', outline: 'none', cursor: 'pointer' }}
                    >
                        <option value="all">All Risk Levels</option>
                        <option value="critical">Critical</option>
                        <option value="moderate">Moderate</option>
                        <option value="normal">Normal</option>
                    </select>
                    <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 700 }}>{sorted.length} rows</span>
                </div>
                <button
                    onClick={exportCsv}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 16px', background: '#1e293b', color: '#fff', border: 'none', borderRadius: 8, fontSize: 11, fontWeight: 800, cursor: 'pointer', letterSpacing: 0.5 }}
                >
                    <Download size={13} /> Export CSV
                </button>
            </div>

            {/* Table */}
            <div style={{ flex: 1, overflowY: 'auto', overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 800 }}>
                    <thead style={{ position: 'sticky', top: 0, background: '#fff', zIndex: 5 }}>
                        <tr style={{ borderBottom: '2px solid #f1f5f9' }}>
                            {COLS.map(col => (
                                <th
                                    key={col.key}
                                    onClick={() => col.sortable && handleSort(col.key)}
                                    style={{
                                        padding: '12px 16px', textAlign: 'left',
                                        fontSize: 9, fontWeight: 900, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1.2,
                                        cursor: col.sortable ? 'pointer' : 'default',
                                        whiteSpace: 'nowrap',
                                        userSelect: 'none',
                                    }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                        {col.label} {col.sortable && <SortIcon k={col.key} />}
                                    </div>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {paged.map((row, i) => {
                            const R = RISK_COLORS[row.riskLevel] || RISK_COLORS.normal;
                            return (
                                <tr
                                    key={`${row.from}-${row.to}-${row.utr}-${i}`}
                                    style={{
                                        background: row.riskLevel !== 'normal' ? `${R.bg}88` : (i % 2 === 0 ? '#fff' : '#fafafa'),
                                        borderBottom: '1px solid #f1f5f9',
                                        cursor: 'pointer',
                                        transition: 'background 0.1s',
                                    }}
                                    onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                                    onMouseLeave={e => e.currentTarget.style.background = row.riskLevel !== 'normal' ? `${R.bg}88` : (i % 2 === 0 ? '#fff' : '#fafafa')}
                                    onClick={() => onSelectNode && onSelectNode(row.from)}
                                >
                                    <td style={{ padding: '10px 16px' }}>
                                        <span style={{ fontSize: 10, fontWeight: 900, color: '#0f172a', fontFamily: 'monospace' }}>{row.from}</span>
                                    </td>
                                    <td style={{ padding: '10px 16px' }}>
                                        <span style={{ fontSize: 10, fontWeight: 900, color: '#0f172a', fontFamily: 'monospace' }}>{row.to}</span>
                                        {row.isCircular && <span style={{ marginLeft: 6, fontSize: 8, fontWeight: 900, color: '#dc2626', background: '#fee2e2', padding: '1px 5px', borderRadius: 4 }}>LOOP</span>}
                                    </td>
                                    <td style={{ padding: '10px 16px' }}>
                                        <span style={{ fontSize: 11, fontWeight: 900, color: '#059669' }}>{fmt(row.amount)}</span>
                                    </td>
                                    <td style={{ padding: '10px 16px', textAlign: 'center' }}>
                                        <LayerBadge layer={row.fromLayer} />
                                    </td>
                                    <td style={{ padding: '10px 16px', textAlign: 'center' }}>
                                        <LayerBadge layer={row.toLayer} />
                                    </td>
                                    <td style={{ padding: '10px 16px' }}>
                                        <span style={{ fontSize: 9, color: '#64748b', fontFamily: 'monospace', fontWeight: 600 }}>{row.utr ? row.utr.substring(0, 30) : '—'}</span>
                                    </td>
                                    <td style={{ padding: '10px 16px' }}>
                                        <span style={{ fontSize: 9, color: '#64748b', fontWeight: 700 }}>{row.platform || '—'}</span>
                                    </td>
                                    <td style={{ padding: '10px 16px' }}>
                                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: R.bg, border: `1px solid ${R.border}`, borderRadius: 8, padding: '3px 8px' }}>
                                            {row.riskLevel === 'critical'
                                                ? <AlertTriangle size={10} color={R.color} />
                                                : row.riskLevel === 'moderate'
                                                    ? <Activity size={10} color={R.color} />
                                                    : <CheckCircle size={10} color={R.color} />}
                                            <span style={{ fontSize: 9, fontWeight: 800, color: R.color, textTransform: 'uppercase', letterSpacing: 0.6 }}>
                                                {row.riskLevel}
                                            </span>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
                {paged.length === 0 && (
                    <div style={{ padding: 48, textAlign: 'center' }}>
                        <p style={{ fontSize: 12, color: '#94a3b8', fontWeight: 700 }}>No transactions match your filters.</p>
                    </div>
                )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div style={{ padding: '12px 20px', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc' }}>
                    <span style={{ fontSize: 10, color: '#94a3b8', fontWeight: 700 }}>
                        Page {page + 1} of {totalPages} ({sorted.length} total)
                    </span>
                    <div style={{ display: 'flex', gap: 6 }}>
                        <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
                            style={{ padding: '5px 10px', borderRadius: 6, border: '1px solid #e2e8f0', background: '#fff', cursor: page === 0 ? 'not-allowed' : 'pointer', opacity: page === 0 ? 0.4 : 1 }}>
                            <ChevronLeft size={14} color="#475569" />
                        </button>
                        <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}
                            style={{ padding: '5px 10px', borderRadius: 6, border: '1px solid #e2e8f0', background: '#fff', cursor: page >= totalPages - 1 ? 'not-allowed' : 'pointer', opacity: page >= totalPages - 1 ? 0.4 : 1 }}>
                            <ChevronRight size={14} color="#475569" />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

const LayerBadge = ({ layer }) => (
    <span style={{
        padding: '2px 8px', borderRadius: 8, fontSize: 9, fontWeight: 800,
        background: layer === 99 ? '#f1f5f9' : '#dbeafe',
        color: layer === 99 ? '#94a3b8' : '#1d4ed8',
        border: layer === 99 ? '1px solid #e2e8f0' : '1px solid #bfdbfe',
    }}>
        {layer === 99 ? '?' : `L${layer}`}
    </span>
);

export default TrailTable;
