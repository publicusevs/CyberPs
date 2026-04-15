import React, { useState, useCallback, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../services/api';
import {
    ArrowLeft, Upload, FileSpreadsheet, Network, Table2,
    AlertTriangle, CheckCircle2, Loader2, GitBranch,
    Download, RefreshCw, Shield, Info, X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import TrailViewer from '../components/trail/TrailViewer';
import TrailTable from '../components/trail/TrailTable';
import TrailFilters from '../components/trail/TrailFilters';
import NodeDetailPanel from '../components/trail/NodeDetailPanel';

const DEFAULT_FILTERS = {
    maxDepth: 5,
    startAcc: '',
    minAmount: '',
    maxAmount: '',
    showSuspiciousOnly: false,
};

// ────────────────────────────────────────────────────────────────────────────
// Standalone Analyzer Page: /trail
// ────────────────────────────────────────────────────────────────────────────
const MoneyTrailStandalone = () => {
    const navigate = useNavigate();
    const [excelFile, setExcelFile] = useState(null);
    const [loading, setLoading] = useState(false);
    const [graphData, setGraphData] = useState(null);
    const [rawMeta, setRawMeta] = useState(null);
    const [viewMode, setViewMode] = useState('graph'); // 'graph' | 'table'
    const [filters, setFilters] = useState(DEFAULT_FILTERS);
    const [selectedNodeId, setSelectedNodeId] = useState(null);
    const [error, setError] = useState(null);
    const fileInputRef = useRef(null);

    const selectedNode = graphData?.nodes?.find(n => n.id === selectedNodeId) || null;

    /* ── Upload & analyze ─────────────────────────────────────── */
    const handleAnalyze = useCallback(async () => {
        if (!excelFile) return;
        setLoading(true);
        setError(null);

        const form = new FormData();
        form.append('excel_file', excelFile);
        form.append('depth', filters.maxDepth);
        if (filters.startAcc) form.append('startAcc', filters.startAcc);
        if (filters.minAmount) form.append('minAmount', filters.minAmount);
        if (filters.maxAmount) form.append('maxAmount', filters.maxAmount);

        try {
            const res = await api.post('/trail/analyze-excel', form);
            if (res.data.success) {
                setGraphData(res.data.data);
                setRawMeta({ rawRows: res.data.rawRows, parsedTransactions: res.data.parsedTransactions, detectedColumns: res.data.detectedColumns });
                setSelectedNodeId(null);
            } else {
                setError(res.data.message || 'Analysis failed');
            }
        } catch (err) {
            setError(err.response?.data?.message || err.message || 'Failed to analyze file');
        } finally {
            setLoading(false);
        }
    }, [excelFile, filters]);

    /* ── Export graph as PNG (screenshot via browser) ─────────── */
    const handleExportPng = () => {
        const el = document.querySelector('.react-flow__renderer');
        if (!el) return alert('Graph not rendered yet.');
        // Use browser print as fallback
        window.print();
    };

    /* ── Filter change → re-fetch from same file isn't possible  */
    /* ── Instead just rebuild the graph client-side              */
    const handleFilterChange = (newFilters) => {
        setFilters(newFilters);
        // If we already have data and only visibility changed, no re-fetch needed
        // If depth/amount changed significantly, prompt re-analyze
    };

    const resetAll = () => {
        setExcelFile(null);
        setGraphData(null);
        setRawMeta(null);
        setError(null);
        setFilters(DEFAULT_FILTERS);
        setSelectedNodeId(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const hasGraph = graphData && graphData.nodes && graphData.nodes.length > 0;

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col" style={{ fontFamily: "'Inter', sans-serif" }}>
            {/* ── Header ────────────────────────────────────────────── */}
            <div className="sticky top-0 z-50 bg-white border-b border-slate-200 shadow-sm">
                <div style={{ padding: '14px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                        <button
                            onClick={() => navigate(-1)}
                            style={{ padding: 10, background: '#f1f5f9', border: 'none', borderRadius: 10, cursor: 'pointer', display: 'flex' }}
                        >
                            <ArrowLeft size={18} color="#475569" />
                        </button>
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <div style={{ width: 36, height: 36, background: 'linear-gradient(135deg, #6366f1, #3b82f6)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <Network size={18} color="#fff" />
                                </div>
                                <div>
                                    <h1 style={{ fontSize: 18, fontWeight: 900, color: '#0f172a', margin: 0, letterSpacing: -0.5, textTransform: 'uppercase', fontStyle: 'italic' }}>
                                        Money Trail <span style={{ color: '#3b82f6' }}>Analyzer</span>
                                    </h1>
                                    <p style={{ fontSize: 9, color: '#94a3b8', fontWeight: 800, margin: 0, letterSpacing: 2, textTransform: 'uppercase' }}>
                                        Generic Excel Upload Mode • No Case Required
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* View Toggle + Actions */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        {hasGraph && (
                            <>
                                <button
                                    onClick={resetAll}
                                    style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: 8, cursor: 'pointer', fontSize: 11, fontWeight: 700, color: '#64748b' }}
                                >
                                    <RefreshCw size={13} /> New Analysis
                                </button>
                                {/* View mode toggle */}
                                <div style={{ display: 'flex', background: '#f1f5f9', padding: 3, borderRadius: 10, border: '1px solid #e2e8f0' }}>
                                    <ViewBtn active={viewMode === 'graph'} onClick={() => setViewMode('graph')} icon={<Network size={13} />} label="Graph" />
                                    <ViewBtn active={viewMode === 'table'} onClick={() => setViewMode('table')} icon={<Table2 size={13} />} label="Table" />
                                </div>
                            </>
                        )}
                    </div>
                </div>

                {/* Meta bar */}
                {rawMeta && (
                    <div style={{ padding: '6px 24px', background: '#f0f9ff', borderTop: '1px solid #bae6fd', display: 'flex', gap: 20, alignItems: 'center' }}>
                        <InfoPill label="Excel Rows" value={rawMeta.rawRows} />
                        <InfoPill label="Transactions Parsed" value={rawMeta.parsedTransactions} />
                        <InfoPill label="Graph Nodes" value={graphData?.stats?.totalNodes} />
                        <InfoPill label="Total Flow" value={
                            graphData?.stats?.totalFlow >= 10000000
                                ? `₹${(graphData.stats.totalFlow / 10000000).toFixed(2)} Cr`
                                : `₹${(graphData?.stats?.totalFlow || 0).toLocaleString('en-IN')}`
                        } />
                        {graphData?.stats?.circularTransactions > 0 && (
                            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6, background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, padding: '3px 10px' }}>
                                <AlertTriangle size={11} color="#dc2626" />
                                <span style={{ fontSize: 10, fontWeight: 800, color: '#dc2626' }}>
                                    {graphData.stats.circularTransactions} Circular Flow(s) Detected
                                </span>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* ── Body ──────────────────────────────────────────────── */}
            <div style={{ flex: 1, display: 'flex', overflow: 'hidden', maxHeight: 'calc(100vh - 72px)' }}>

                {/* Upload Panel (shown before data) */}
                {!hasGraph && (
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40 }}>
                        <motion.div
                            initial={{ opacity: 0, y: 24 }}
                            animate={{ opacity: 1, y: 0 }}
                            style={{ width: '100%', maxWidth: 600 }}
                        >
                            <div style={{ background: '#fff', borderRadius: 24, padding: 48, border: '1px solid #e2e8f0', boxShadow: '0 8px 32px rgba(0,0,0,0.06)' }}>
                                <div style={{ textAlign: 'center', marginBottom: 40 }}>
                                    <div style={{ width: 80, height: 80, background: 'linear-gradient(135deg, #ede9fe, #dbeafe)', borderRadius: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                                        <Network size={36} color="#6366f1" />
                                    </div>
                                    <h2 style={{ fontSize: 22, fontWeight: 900, color: '#0f172a', marginBottom: 8 }}>Upload Transaction Excel</h2>
                                    <p style={{ fontSize: 12, color: '#64748b', lineHeight: 1.6 }}>
                                        Upload any bank statement or transaction Excel file.<br />
                                        The analyzer will detect money flow patterns automatically.
                                    </p>
                                </div>

                                {/* Drag drop zone */}
                                <label style={{
                                    display: 'block', border: '2px dashed #c7d2fe', borderRadius: 16,
                                    padding: '40px 32px', textAlign: 'center', cursor: 'pointer',
                                    background: excelFile ? '#f0fdf4' : '#f8fafc',
                                    transition: 'all 0.2s',
                                }}
                                    onDragOver={e => { e.preventDefault(); e.currentTarget.style.borderColor = '#6366f1'; e.currentTarget.style.background = '#eef2ff'; }}
                                    onDragLeave={e => { e.currentTarget.style.borderColor = '#c7d2fe'; e.currentTarget.style.background = excelFile ? '#f0fdf4' : '#f8fafc'; }}
                                    onDrop={e => {
                                        e.preventDefault();
                                        const f = e.dataTransfer.files[0];
                                        if (f) setExcelFile(f);
                                        e.currentTarget.style.borderColor = '#c7d2fe';
                                        e.currentTarget.style.background = '#f0fdf4';
                                    }}
                                >
                                    <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" style={{ display: 'none' }}
                                        onChange={e => setExcelFile(e.target.files[0])} />

                                    {excelFile ? (
                                        <div>
                                            <FileSpreadsheet size={40} color="#059669" style={{ margin: '0 auto 12px' }} />
                                            <p style={{ fontSize: 14, fontWeight: 800, color: '#065f46' }}>{excelFile.name}</p>
                                            <p style={{ fontSize: 11, color: '#6b7280', marginTop: 4 }}>
                                                {(excelFile.size / 1024).toFixed(1)} KB
                                            </p>
                                            <button onClick={(e) => { e.preventDefault(); setExcelFile(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                                                style={{ marginTop: 8, padding: '4px 12px', background: '#fee2e2', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 10, fontWeight: 700, color: '#dc2626' }}>
                                                Remove
                                            </button>
                                        </div>
                                    ) : (
                                        <div>
                                            <Upload size={40} color="#94a3b8" style={{ margin: '0 auto 12px' }} />
                                            <p style={{ fontSize: 14, fontWeight: 700, color: '#475569', marginBottom: 4 }}>
                                                Drag & Drop or Click to Browse
                                            </p>
                                            <p style={{ fontSize: 11, color: '#94a3b8' }}>Supports .xlsx, .xls</p>
                                        </div>
                                    )}
                                </label>

                                {/* Quick filters before analyze */}
                                <div style={{ marginTop: 24, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                    <div>
                                        <label style={{ fontSize: 10, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.8, display: 'block', marginBottom: 6 }}>Max Layers</label>
                                        <input type="number" min={1} max={10} value={filters.maxDepth}
                                            onChange={e => setFilters(f => ({ ...f, maxDepth: parseInt(e.target.value) || 5 }))}
                                            style={{ width: '100%', padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: 10, fontSize: 12, fontWeight: 700, outline: 'none', boxSizing: 'border-box' }} />
                                    </div>
                                    <div>
                                        <label style={{ fontSize: 10, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.8, display: 'block', marginBottom: 6 }}>Min Amount (₹)</label>
                                        <input type="number" min={0} value={filters.minAmount}
                                            onChange={e => setFilters(f => ({ ...f, minAmount: e.target.value }))}
                                            placeholder="0"
                                            style={{ width: '100%', padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: 10, fontSize: 12, fontWeight: 700, outline: 'none', boxSizing: 'border-box' }} />
                                    </div>
                                </div>

                                {/* Error */}
                                {error && (
                                    <div style={{ marginTop: 16, padding: '10px 16px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                                        <AlertTriangle size={14} color="#dc2626" style={{ flexShrink: 0, marginTop: 1 }} />
                                        <p style={{ fontSize: 11, color: '#dc2626', fontWeight: 600, margin: 0 }}>{error}</p>
                                    </div>
                                )}

                                <button
                                    onClick={handleAnalyze}
                                    disabled={!excelFile || loading}
                                    style={{
                                        width: '100%', marginTop: 24,
                                        padding: '14px',
                                        background: excelFile && !loading
                                            ? 'linear-gradient(135deg, #6366f1, #3b82f6)'
                                            : '#e2e8f0',
                                        border: 'none', borderRadius: 12, cursor: excelFile && !loading ? 'pointer' : 'not-allowed',
                                        fontSize: 13, fontWeight: 900, color: excelFile && !loading ? '#fff' : '#94a3b8',
                                        letterSpacing: 1, textTransform: 'uppercase',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                                        boxShadow: excelFile && !loading ? '0 4px 16px rgba(99,102,241,0.4)' : 'none',
                                        transition: 'all 0.2s',
                                    }}
                                >
                                    {loading ? <><Loader2 size={16} className="animate-spin" /> Analyzing...</> : <><GitBranch size={16} /> Analyze Money Trail</>}
                                </button>

                                {/* Info note */}
                                <div style={{ marginTop: 20, display: 'flex', alignItems: 'flex-start', gap: 8, padding: '12px 16px', background: '#f0f9ff', borderRadius: 10, border: '1px solid #bae6fd' }}>
                                    <Info size={13} color="#0284c7" style={{ flexShrink: 0, marginTop: 1 }} />
                                    <p style={{ fontSize: 10, color: '#0369a1', fontWeight: 600, margin: 0, lineHeight: 1.5 }}>
                                        For multi-layer trails, your Excel should have columns for sender account (e.g., "Sender Account", "From Account") AND receiver account (e.g., "Account No", "Account Number"). If only a destination column is found, all transactions will show as coming from a single ROOT node.
                                    </p>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}

                {/* Analysis workspace */}
                {hasGraph && (
                    <AnimatePresence mode="wait">
                        <motion.div
                            key="workspace"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            style={{ flex: 1, display: 'flex', overflow: 'hidden' }}
                        >
                            {/* Left: Filters */}
                            <TrailFilters
                                options={filters}
                                onChange={(newF) => setFilters(newF)}
                                nodes={graphData.nodes}
                                stats={graphData.stats}
                                onReset={() => setFilters(DEFAULT_FILTERS)}
                            />

                            {/* Center: Graph or Table */}
                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                                {viewMode === 'graph' ? (
                                    <TrailViewer
                                        graphData={graphData}
                                        filterOptions={filters}
                                        onSelectNode={setSelectedNodeId}
                                        selectedNodeId={selectedNodeId}
                                    />
                                ) : (
                                    <TrailTable
                                        edges={graphData.edges}
                                        nodes={graphData.nodes}
                                        onSelectNode={(id) => { setSelectedNodeId(id); setViewMode('graph'); }}
                                    />
                                )}
                            </div>

                            {/* Right: Node detail */}
                            <AnimatePresence>
                                {selectedNodeId && (
                                    <motion.div
                                        key="detail"
                                        initial={{ x: 320, opacity: 0 }}
                                        animate={{ x: 0, opacity: 1 }}
                                        exit={{ x: 320, opacity: 0 }}
                                        transition={{ type: 'spring', damping: 22, stiffness: 260 }}
                                        style={{ height: '100%' }}
                                    >
                                        <NodeDetailPanel
                                            node={selectedNode}
                                            allEdges={graphData.edges}
                                            allNodes={graphData.nodes}
                                            onClose={() => setSelectedNodeId(null)}
                                        />
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </motion.div>
                    </AnimatePresence>
                )}
            </div>
        </div>
    );
};

// ────────────────────────────────────────────────────────────────────────────
// Error Boundary for trail pages
// ────────────────────────────────────────────────────────────────────────────
class TrailErrorBoundary extends React.Component {
    state = { hasError: false, errorMsg: '' };
    static getDerivedStateFromError(err) { return { hasError: true, errorMsg: err?.message || 'Unknown error' }; }
    render() {
        if (this.state.hasError) {
            return (
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16, padding: 40, fontFamily: "'Inter', sans-serif" }}>
                    <AlertTriangle size={48} color="#ef4444" />
                    <h2 style={{ fontSize: 16, fontWeight: 900, color: '#dc2626' }}>Graph Render Error</h2>
                    <p style={{ fontSize: 11, color: '#64748b', maxWidth: 400, textAlign: 'center' }}>{this.state.errorMsg}</p>
                    <button onClick={() => window.location.reload()} style={{ padding: '10px 24px', background: '#1e293b', color: '#fff', border: 'none', borderRadius: 10, cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>
                        Reload Page
                    </button>
                </div>
            );
        }
        return this.props.children;
    }
}

// ────────────────────────────────────────────────────────────────────────────
// Case-Linked Trail Page: /cases/:id/trail
// ────────────────────────────────────────────────────────────────────────────
export const CaseMoneyTrail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [graphData, setGraphData] = useState(null);
    const [viewMode, setViewMode] = useState('graph');
    const [filters, setFilters] = useState(DEFAULT_FILTERS);
    const [selectedNodeId, setSelectedNodeId] = useState(null);
    const [error, setError] = useState(null);
    const [caseTitle, setCaseTitle] = useState(null);

    const selectedNode = graphData?.nodes?.find(n => n.id === selectedNodeId) || null;

    // Stable fetch function that takes filters as arg to avoid stale closure
    const fetchTrail = useCallback(async (f) => {
        setLoading(true);
        setError(null);
        try {
            const appliedFilters = f || DEFAULT_FILTERS;
            const params = new URLSearchParams({ depth: appliedFilters.maxDepth });
            if (appliedFilters.startAcc) params.set('startAcc', appliedFilters.startAcc);
            if (appliedFilters.minAmount) params.set('minAmount', appliedFilters.minAmount);
            if (appliedFilters.maxAmount) params.set('maxAmount', appliedFilters.maxAmount);

            const res = await api.get(`/trail/case/${id}?${params.toString()}`);
            if (res.data.success) {
                setGraphData(res.data.data);
            } else {
                setError(res.data.message || 'Analysis returned no data');
            }
        } catch (err) {
            setError(err.response?.data?.message || err.message || 'Failed to load money trail');
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        fetchTrail(DEFAULT_FILTERS);
        // Fetch case title separately, silently
        api.get(`/cases/${id}`)
            .then(r => {
                if (r?.data?.success && r.data.case) {
                    const c = r.data.case;
                    setCaseTitle(c.fir_no || c.ackn_no || c.victim_name || `Case #${id}`);
                } else if (r?.data?.case_id) {
                    setCaseTitle(`Case #${r.data.case_id}`);
                }
            })
            .catch(() => { /* silently fail */ });
    }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

    const handleFilterApply = useCallback((newF) => {
        setFilters(newF);
        fetchTrail(newF);
    }, [fetchTrail]);

    const hasGraph = graphData && graphData.nodes && graphData.nodes.length > 0;

    return (
        <TrailErrorBoundary>
            <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#f8fafc', fontFamily: "'Inter', sans-serif" }}>
                {/* Header */}
                <div style={{ padding: '14px 24px', background: '#fff', borderBottom: '1px solid #e2e8f0', boxShadow: '0 1px 4px rgba(0,0,0,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                        <button onClick={() => navigate(`/cases/${id}`)} style={{ padding: 10, background: '#f1f5f9', border: 'none', borderRadius: 10, cursor: 'pointer', display: 'flex' }}>
                            <ArrowLeft size={18} color="#475569" />
                        </button>
                        <div style={{ width: 38, height: 38, background: 'linear-gradient(135deg, #1e40af, #3b82f6)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Shield size={18} color="#fff" />
                        </div>
                        <div>
                            <h1 style={{ fontSize: 18, fontWeight: 900, color: '#0f172a', margin: 0, letterSpacing: -0.5, textTransform: 'uppercase', fontStyle: 'italic' }}>
                                Money Trail — <span style={{ color: '#3b82f6' }}>{caseTitle || `Case #${id}`}</span>
                            </h1>
                            <p style={{ fontSize: 9, color: '#94a3b8', margin: 0, fontWeight: 800, letterSpacing: 2, textTransform: 'uppercase' }}>
                                Live Transaction Graph • Case-Linked Mode
                            </p>
                        </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <button onClick={() => fetchTrail(filters)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px', background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: 8, cursor: 'pointer', fontSize: 11, fontWeight: 700, color: '#64748b' }}>
                            <RefreshCw size={12} /> Refresh
                        </button>
                        <button onClick={() => navigate('/trail')} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', background: '#ede9fe', border: '1px solid #c4b5fd', borderRadius: 8, cursor: 'pointer', fontSize: 11, fontWeight: 800, color: '#6d28d9' }}>
                            <Upload size={12} /> Upload New Excel
                        </button>
                        {hasGraph && (
                            <div style={{ display: 'flex', background: '#f1f5f9', padding: 3, borderRadius: 10, border: '1px solid #e2e8f0' }}>
                                <ViewBtn active={viewMode === 'graph'} onClick={() => setViewMode('graph')} icon={<Network size={13} />} label="Graph" />
                                <ViewBtn active={viewMode === 'table'} onClick={() => setViewMode('table')} icon={<Table2 size={13} />} label="Table" />
                            </div>
                        )}
                    </div>
                </div>

                {/* Stats bar */}
                {hasGraph && graphData.stats && (
                    <div style={{ padding: '8px 24px', background: '#f0f9ff', borderBottom: '1px solid #bae6fd', display: 'flex', gap: 24, alignItems: 'center', flexShrink: 0, flexWrap: 'wrap' }}>
                        <InfoPill label="Accounts" value={graphData.stats.totalNodes} />
                        <InfoPill label="Transactions" value={graphData.stats.totalEdges} />
                        <InfoPill label="Layers" value={graphData.stats.totalLayers} />
                        <InfoPill label="Total Flow" value={
                            graphData.stats.totalFlow >= 10000000
                                ? `₹${(graphData.stats.totalFlow / 10000000).toFixed(2)} Cr`
                                : `₹${(graphData.stats.totalFlow || 0).toLocaleString('en-IN')}`
                        } />
                        {graphData.stats.suspiciousNodes > 0 && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#fefce8', border: '1px solid #fde047', borderRadius: 8, padding: '3px 10px' }}>
                                <AlertTriangle size={11} color="#d97706" />
                                <span style={{ fontSize: 10, fontWeight: 800, color: '#b45309' }}>{graphData.stats.suspiciousNodes} Suspicious Account(s)</span>
                            </div>
                        )}
                        {graphData.stats.circularTransactions > 0 && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, padding: '3px 10px' }}>
                                <AlertTriangle size={11} color="#dc2626" />
                                <span style={{ fontSize: 10, fontWeight: 800, color: '#dc2626' }}>{graphData.stats.circularTransactions} Circular Flow(s)</span>
                            </div>
                        )}
                    </div>
                )}

                {/* Body */}
                <div style={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0 }}>
                    {/* Loading */}
                    {loading && (
                        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16 }}>
                            <div style={{ width: 48, height: 48, border: '3px solid #3b82f644', borderTop: '3px solid #3b82f6', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                            <p style={{ fontSize: 12, color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 2 }}>Building Money Trail Graph...</p>
                            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
                        </div>
                    )}

                    {/* Error */}
                    {!loading && error && (
                        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <div style={{ textAlign: 'center', maxWidth: 440 }}>
                                <AlertTriangle size={48} color="#ef4444" style={{ margin: '0 auto 16px' }} />
                                <p style={{ fontSize: 14, fontWeight: 700, color: '#dc2626', marginBottom: 8 }}>{error}</p>
                                <button onClick={() => fetchTrail(filters)} style={{ padding: '10px 24px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 10, cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>
                                    Retry
                                </button>
                            </div>
                        </div>
                    )}

                    {/* No data */}
                    {!loading && !error && !hasGraph && (
                        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16 }}>
                            <FileSpreadsheet size={56} color="#cbd5e1" />
                            <p style={{ fontSize: 14, color: '#94a3b8', fontWeight: 700, textAlign: 'center' }}>
                                No transactions found for this case.<br />
                                <span style={{ fontSize: 11 }}>Import an Excel file to populate the money trail.</span>
                            </p>
                            <div style={{ display: 'flex', gap: 10 }}>
                                <button onClick={() => navigate(`/cases/${id}`)} style={{ padding: '10px 24px', background: '#1e293b', color: '#fff', border: 'none', borderRadius: 10, cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>
                                    ← Back to Case
                                </button>
                                <button onClick={() => navigate('/trail')} style={{ padding: '10px 24px', background: '#6366f1', color: '#fff', border: 'none', borderRadius: 10, cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>
                                    Upload Excel
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Workspace */}
                    {!loading && hasGraph && (
                        <>
                            <TrailFilters
                                options={filters}
                                onChange={handleFilterApply}
                                nodes={graphData.nodes}
                                stats={graphData.stats}
                                onReset={() => handleFilterApply(DEFAULT_FILTERS)}
                            />
                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0 }}>
                                {viewMode === 'graph' ? (
                                    <TrailViewer
                                        graphData={graphData}
                                        filterOptions={filters}
                                        onSelectNode={setSelectedNodeId}
                                        selectedNodeId={selectedNodeId}
                                    />
                                ) : (
                                    <TrailTable
                                        edges={graphData.edges}
                                        nodes={graphData.nodes}
                                        onSelectNode={(nid) => { setSelectedNodeId(nid); setViewMode('graph'); }}
                                    />
                                )}
                            </div>
                            <AnimatePresence>
                                {selectedNodeId && (
                                    <motion.div
                                        key="detail"
                                        initial={{ x: 320, opacity: 0 }}
                                        animate={{ x: 0, opacity: 1 }}
                                        exit={{ x: 320, opacity: 0 }}
                                        transition={{ type: 'spring', damping: 22, stiffness: 260 }}
                                        style={{ height: '100%', flexShrink: 0 }}
                                    >
                                        <NodeDetailPanel
                                            node={selectedNode}
                                            allEdges={graphData.edges}
                                            allNodes={graphData.nodes}
                                            onClose={() => setSelectedNodeId(null)}
                                        />
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </>
                    )}
                </div>
            </div>
        </TrailErrorBoundary>
    );
};
/* ── Shared helpers ──────────────────────────────────────────────────────── */
const ViewBtn = ({ active, onClick, icon, label }) => (
    <button onClick={onClick} style={{
        display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px',
        background: active ? '#fff' : 'transparent',
        border: 'none', borderRadius: 8, cursor: 'pointer',
        fontSize: 11, fontWeight: 800,
        color: active ? '#3b82f6' : '#64748b',
        boxShadow: active ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
        transition: 'all 0.15s',
    }}>
        {icon} {label}
    </button>
);

const InfoPill = ({ label, value }) => (
    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        <span style={{ fontSize: 9, color: '#64748b', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.8 }}>{label}:</span>
        <span style={{ fontSize: 11, fontWeight: 900, color: '#0f172a' }}>{value ?? '—'}</span>
    </div>
);

export default MoneyTrailStandalone;
