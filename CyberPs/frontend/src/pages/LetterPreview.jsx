import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { generateLetterHtml, downloadPdf } from '../services/letterGenerator';
import {
    FileText,
    CheckCircle2,
    Upload,
    Send,
    Download,
    Building2,
    Hash,
    ShieldCheck,
    Printer,
    FileSearch,
    Building,
    ExternalLink,
    Mail,
    ChevronLeft,
    CheckSquare,
    Square,
    FileSpreadsheet,
    AlertTriangle,
    Search,
    Filter,
    Plus,
    Trash2,
    X,
    Save,
    FileDown,
    ZoomIn,
    ZoomOut,
    Minus
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Table';
import { motion, AnimatePresence } from 'framer-motion';

const LetterPreview = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [caseData, setCaseData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [processStep, setProcessStep] = useState(2);
    const [bankGroups, setBankGroups] = useState([]);
    const [selectedBank, setSelectedBank] = useState(null);
    const [selectedBankIds, setSelectedBankIds] = useState(new Set());
    const [selectedRecordUtrs, setSelectedRecordUtrs] = useState(new Set());
    const [generating, setGenerating] = useState(false);
    const [zoom, setZoom] = useState(0.75);
    const [stats, setStats] = useState({ totalBanks: 0, totalRecords: 0, status: 'CLEAN' });
    const [excelFile, setExcelFile] = useState(null);
    const [importing, setImporting] = useState(false);
    const [filters, setFilters] = useState([]); // {id, column, value}
    const [remark, setRemark] = useState('');
    const [isCompleting, setIsCompleting] = useState(false);
    const [layerFilter, setLayerFilter] = useState('ALL');

    const [letterTemplate, setLetterTemplate] = useState({
        headerLine1: 'OFFICE OF THE DEPUTY SUPERITENDENT OF POLICE',
        headerLine2: 'STATION, JAIPUR, RAJASTHAN, INDIA',
        headerLine3: 'Ghat Gate, Agra Road, Jaipur, Rajasthan 302003',
        subjectText: 'SUBJECT: NOTICE UNDER SECTION 94/106 BNSS 2023 - REQUEST FOR INFORMATION AND DEBIT FREEZE OF FRAUDULENT ACCOUNT(S).',
        bodyText: 'This is to inform you that a cyber crime investigation is currently underway regarding multiple fraudulent transactions. During technical analysis, the following account(s) held in your bank have been identified as involved in the receipt/transfer of misappropriated funds:',
        footerText: 'FURTHER, YOU ARE REQUESTED TO IMMEDIATELY DEBIT FREEZE THE AFOREMENTIONED ACCOUNT(S) TO PREVENT FURTHER LOSS OF FUNDS.'
    });

    const filterColumns = [
        { id: 'ackNo', label: 'Ack No', type: 'text' },
        { id: 'account', label: 'Account Number', type: 'text' },
        { id: 'bank', label: 'Bank', type: 'text' },
        { id: 'utr', label: 'UTR Payload', type: 'text' },
        { id: 'layer', label: 'Layer', type: 'text' },
        { id: 'amount', label: 'Amount', type: 'number' },
        { id: 'dateStr', label: 'Trans Date', type: 'text' },
        { id: 'actionTaken', label: 'Action Status', type: 'text' },
        { id: 'remarks', label: 'Remarks', type: 'text' }
    ];

    const filterOperators = [
        { id: 'contains', label: 'Contains', types: ['text'] },
        { id: 'equals', label: '=', types: ['text', 'number'] },
        { id: 'not_equals', label: '!=', types: ['text', 'number'] },
        { id: 'gt', label: '>', types: ['number'] },
        { id: 'lt', label: '<', types: ['number'] },
        { id: 'gte', label: '>=', types: ['number'] },
        { id: 'lte', label: '<=', types: ['number'] },
        { id: 'starts', label: 'Starts With', types: ['text'] },
        { id: 'ends', label: 'Ends With', types: ['text'] },
        { id: 'null', label: 'Is Null', types: ['text', 'number'] },
        { id: 'not_null', label: 'Is Not Null', types: ['text', 'number'] }
    ];

    const addFilter = () => {
        setFilters([...filters, {
            id: Date.now(),
            column: 'bank',
            operator: 'contains',
            value: '',
            joiner: 'AND',
            isNot: false
        }]);
    };

    const removeFilter = (id) => {
        setFilters(filters.filter(f => f.id !== id));
    };

    const updateFilter = (id, field, val) => {
        setFilters(filters.map(f => {
            if (f.id === id) {
                const updated = { ...f, [field]: val };
                if (field === 'column') {
                    const col = filterColumns.find(c => c.id === val);
                    const op = filterOperators.find(o => o.id === updated.operator);
                    if (op && !op.types.includes(col.type)) {
                        updated.operator = col.type === 'number' ? 'equals' : 'contains';
                    }
                }
                return updated;
            }
            return f;
        }));
    };

    const evaluateClause = (rec, f) => {
        const targetVal = rec[f.column];
        const queryVal = f.value;

        let result = true;

        if (f.operator === 'null') {
            result = !targetVal;
        } else if (f.operator === 'not_null') {
            result = !!targetVal;
        } else if (!queryVal) {
            result = true;
        } else {
            const sTarget = String(targetVal || '').toLowerCase();
            const sQuery = String(queryVal || '').toLowerCase();
            const nTarget = parseFloat(targetVal);
            const nQuery = parseFloat(queryVal);

            switch (f.operator) {
                case 'contains': result = sTarget.includes(sQuery); break;
                case 'equals': result = sTarget === sQuery; break;
                case 'not_equals': result = sTarget !== sQuery; break;
                case 'gt': result = nTarget > nQuery; break;
                case 'lt': result = nTarget < nQuery; break;
                case 'gte': result = nTarget >= nQuery; break;
                case 'lte': result = nTarget <= nQuery; break;
                case 'starts': result = sTarget.startsWith(sQuery); break;
                case 'ends': result = sTarget.endsWith(sQuery); break;
                default: result = true;
            }
        }

        return f.isNot ? !result : result;
    };

    const passesAllFilters = (rec) => {
        if (layerFilter !== 'ALL' && rec.layer.toString() !== layerFilter.toString()) return false;
        
        if (filters.length === 0) return true;
        let finalResult = evaluateClause(rec, filters[0]);
        for (let i = 1; i < filters.length; i++) {
            const f = filters[i];
            const clauseResult = evaluateClause(rec, f);
            if (f.joiner === 'AND') {
                finalResult = finalResult && clauseResult;
            } else if (f.joiner === 'OR') {
                finalResult = finalResult || clauseResult;
            }
        }
        return finalResult;
    };

    useEffect(() => {
        fetchProcessData();
    }, [id]);

    useEffect(() => {
        if (bankGroups.length > 0 && processStep === 3) {
            const viable = bankGroups.find(g => selectedBankIds.has(g.name) && g.records.some(r => selectedRecordUtrs.has(r.utr) && passesAllFilters(r)));
            if (viable) {
                prepareSelectedBank(viable);
            } else {
                setSelectedBank(null);
            }
        }
    }, [filters, layerFilter, selectedRecordUtrs]);

    const fetchProcessData = async () => {
        try {
            const res = await api.get(`/cases/${id}`);
            if (res.data.success) {
                setCaseData(res.data);
                let transactions = res.data.transactions || [];

                try {
                    const flowRes = await api.get(`/transactions/case/${id}/flow`);
                    if (flowRes.data.success && flowRes.data.data.length > 0) {
                        transactions = flowRes.data.data.map(t => ({
                            ...t,
                            trans_date: t.date,
                            receiver_acc: t.account,
                            utr_no: t.utr,
                            platform: t.bank
                        }));
                    }
                } catch (flowErr) {
                    console.warn('Could not fetch rich flow data, using fallback DB data');
                }

                const groups = {};
                const allUtrs = new Set();
                transactions.forEach(t => {
                    const bank = (t.platform || 'Unknown Bank').trim();

                    if (!groups[bank]) groups[bank] = { name: bank, records: [] };
                    const record = {
                        account: t.cleanAccount || t.receiver_acc,
                        originalAccount: t.receiver_acc,
                        utr: t.utr_no,
                        amount: t.amount,
                        date: t.trans_date,
                        dateStr: t.dateStr || t.trans_date,
                        bank: bank,
                        layer: t.layer ? t.layer.toString() : '1',
                        ifsc: t.ifsc || 'N/A',
                        ackNo: t.ackNo || 'N/A',
                        remarks: t.remarks || 'N/A',
                        actionTaken: t.actionTaken || 'N/A',
                        actionDate: t.actionDate || 'N/A',
                        raw: t.raw || {}
                    };
                    groups[bank].records.push(record);
                    allUtrs.add(record.utr);
                });

                const groupArray = Object.values(groups);
                setBankGroups(groupArray);
                setSelectedBankIds(new Set(groupArray.map(g => g.name)));
                setSelectedRecordUtrs(allUtrs);

                setStats({
                    totalBanks: groupArray.length,
                    totalRecords: allUtrs.size,
                    status: 'CLEAN'
                });

                if (groupArray.length > 0) {
                    prepareSelectedBank(groupArray[0], allUtrs);
                }
            }
        } catch (err) {
            console.error('Process initialization failed');
        } finally {
            setLoading(false);
        }
    };

    const prepareSelectedBank = (group, activeUtrs = null) => {
        if (!group) return;
        const currentUtrs = activeUtrs || selectedRecordUtrs;

        const filteredRecords = group.records.filter(r => {
            return currentUtrs.has(r.utr) && passesAllFilters(r);
        });

        if (filteredRecords.length === 0) {
            if (!activeUtrs) setSelectedBank(null); // Only nullify if it was global auto-sync
            return;
        }

        const letterData = {
            year: new Date().getFullYear(),
            refId: `${id}/782-JP`,
            date: new Date().toLocaleDateString('en-GB'),
            bankName: group.name,
            records: filteredRecords.map(r => ({
                accountNumber: r.account,
                transactionId: r.utr,
                amount: typeof r.amount === 'string' ? r.amount : `₹${parseFloat(r.amount).toLocaleString()}`
            })),
            startDate: '01/01/2024',
            endDate: new Date().toLocaleDateString('en-GB'),
            headerLine1: letterTemplate.headerLine1,
            headerLine2: letterTemplate.headerLine2,
            headerLine3: letterTemplate.headerLine3,
            subjectText: letterTemplate.subjectText,
            bodyText: letterTemplate.bodyText,
            footerText: letterTemplate.footerText
        };
        setSelectedBank(letterData);
    };

    const toggleBankSelection = (name) => {
        const newSelected = new Set(selectedBankIds);
        if (newSelected.has(name)) {
            newSelected.delete(name);
        } else {
            newSelected.add(name);
        }
        setSelectedBankIds(newSelected);
    };

    const toggleRecordSelection = (utr) => {
        const newSelected = new Set(selectedRecordUtrs);
        if (newSelected.has(utr)) {
            newSelected.delete(utr);
        } else {
            newSelected.add(utr);
        }
        setSelectedRecordUtrs(newSelected);

        // Refresh preview based on current selection or fallback to first visible
        const currentGroup = bankGroups.find(g => g.name === selectedBank?.bankName);
        if (currentGroup) {
            prepareSelectedBank(currentGroup, newSelected);
        } else {
            const firstGroup = bankGroups.find(g => selectedBankIds.has(g.name));
            if (firstGroup) prepareSelectedBank(firstGroup, newSelected);
        }
    };

    const toggleSelectAllRecords = () => {
        const visibleRecords = bankGroups.filter(g => selectedBankIds.has(g.name)).flatMap(g => g.records);
        const visibleUtrs = visibleRecords.map(r => r.utr);
        const isAllSelected = visibleUtrs.every(u => selectedRecordUtrs.has(u));

        const newSelected = new Set(selectedRecordUtrs);
        if (isAllSelected) {
            visibleUtrs.forEach(u => newSelected.delete(u));
        } else {
            visibleUtrs.forEach(u => newSelected.add(u));
        }
        setSelectedRecordUtrs(newSelected);

        const currentGroup = bankGroups.find(g => g.name === selectedBank?.bankName);
        if (currentGroup) {
            prepareSelectedBank(currentGroup, newSelected);
        } else {
            const firstGroup = bankGroups.find(g => selectedBankIds.has(g.name));
            if (firstGroup) prepareSelectedBank(firstGroup, newSelected);
        }
    };

    const handleBulkDownload = async () => {
        const { default: jsPDF } = await import('jspdf');
        const pdf = new jsPDF('p', 'mm', 'a4');
        let isFirst = true;

        const selectedGroups = bankGroups.filter(g => selectedBankIds.has(g.name));

        for (const group of selectedGroups) {
            const filteredRecords = group.records.filter(r => {
                return selectedRecordUtrs.has(r.utr) && passesAllFilters(r);
            });

            if (filteredRecords.length === 0) continue;

            const letterData = {
                year: new Date().getFullYear(),
                refId: `${id}/782-JP`,
                date: new Date().toLocaleDateString('en-GB'),
                bankName: group.name,
                records: filteredRecords.map(r => ({
                    accountNumber: r.account,
                    transactionId: r.utr,
                    amount: `₹${parseFloat(r.amount).toLocaleString()}`
                })),
                startDate: '01/01/2024',
                endDate: new Date().toLocaleDateString('en-GB')
            };

            const { generateBulkPdf } = await import('../services/letterGenerator');
            generateBulkPdf(pdf, letterData, isFirst);
            isFirst = false;
        }

        pdf.save(`BULK_NOTICES_CASE_${id}.pdf`);
    };

    const handleStepChange = (newStep) => {
        if (newStep === 3) {
            setGenerating(true);
            // Directly find and prepare the first viable bank group
            const firstViable = bankGroups.find(g => selectedBankIds.has(g.name) && g.records.some(r => selectedRecordUtrs.has(r.utr) && passesAllFilters(r)));
            if (firstViable) {
                prepareSelectedBank(firstViable);
            }
            setTimeout(() => setGenerating(false), 800);
        }
        setProcessStep(newStep);
    };

    const handleSaveToDossier = async () => {
        if (!selectedBank) return;
        setGenerating(true);

        try {
            const { default: jsPDF } = await import('jspdf');
            const pdf = new jsPDF('p', 'mm', 'a4');
            const { generateBulkPdf } = await import('../services/letterGenerator');

            // Helper to generate data URI
            generateBulkPdf(pdf, selectedBank, true);
            const pdfBase64 = pdf.output('datauristring');

            const res = await api.post('/cases/save-notice', {
                case_id: id,
                bank_name: selectedBank.bankName,
                pdf_base64: pdfBase64
            });

            if (res.data.success) {
                alert('Success: Notice saved to Secure Evidence Repository');
                setProcessStep(4);
            }
        } catch (err) {
            console.error('Save failed:', err);
            alert('Failure: Could not save notice to dossier');
        } finally {
            setGenerating(false);
        }
    };

    const handleExcelUpload = async () => {
        if (!excelFile) return;
        setImporting(true);
        const formData = new FormData();
        formData.append('excel_file', excelFile);
        formData.append('case_id', id);

        try {
            const res = await api.post('/transactions/import', formData);
            if (res.data.success) {
                setExcelFile(null);
                await fetchProcessData();
                setProcessStep(2);
            }
        } catch (err) {
            alert('Excel import failed: ' + (err.response?.data?.message || err.message));
        } finally {
            setImporting(false);
        }
    };

    const handleCompleteMission = async () => {
        setIsCompleting(true);
        try {
            // Aggregate forensic phase complete details
            const selectedBanksCount = bankGroups.filter(g => selectedBankIds.has(g.name)).length;
            const targetRecordsCount = bankGroups.filter(g => selectedBankIds.has(g.name))
                .flatMap(g => g.records)
                .filter(r => selectedRecordUtrs.has(r.utr) && passesAllFilters(r)).length;

            const detailedRemark = `[FORENSIC PROCESS FINALIZED]\nTarget Banks Analyzed: ${selectedBanksCount}\nVerified Transactions Sealed: ${targetRecordsCount}\nOrigin Log Remarks: ${remark || 'System notices generated and deposited to secure dossier.'}`;

            // 1. Update status hierarchy
            await api.post(`/cases/${id}/status`, {
                status: 'Closed',
                remarks: detailedRemark
            });

            // 2. Auto-Broadcast as Internal Memo for Timeline sync
            await api.post('/cases/notes', {
                case_id: id,
                note_text: detailedRemark
            });

            navigate(`/cases/${id}`);
        } catch (err) {
            console.error('Failed to complete mission:', err);
            alert('Failure: Could not finalize case status');
        } finally {
            setIsCompleting(false);
        }
    };

    if (loading) return <div className="p-20 text-center font-black text-slate-400 uppercase tracking-[0.5em] text-xs">Initializing Forensic Engine...</div>;

    const rawActiveRecords = bankGroups.filter(g => selectedBankIds.has(g.name)).flatMap(g => g.records);

    // Apply Multi-Filters with Logic (AND, OR, NOT)
    const activeRecords = rawActiveRecords.filter(rec => passesAllFilters(rec));

    const areAllRecordsSelected = activeRecords.length > 0 && activeRecords.every(r => selectedRecordUtrs.has(r.utr));

    return (
        <div className="max-w-[1700px] mx-auto space-y-10 animate-in fade-in duration-700 pb-20">
            {/* Page Header */}
            <div className="flex items-center justify-between bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm relative z-30">
                <div className="flex items-center gap-6">
                    <button onClick={() => navigate(`/cases/${id}`)} className="p-4 bg-slate-50 border border-slate-200 rounded-2xl hover:bg-blue-600 hover:text-white transition-all text-slate-400 shadow-sm">
                        <ChevronLeft size={24} />
                    </button>
                    <div>
                        <h1 className="text-3xl font-black text-slate-900 tracking-tighter uppercase italic">
                            Report <span className="text-blue-600">Generation</span> Terminal
                        </h1>
                        <p className="text-[10px] text-slate-400 font-bold tracking-widest uppercase mt-1">
                            Case Intelligence Dossier #{id} // Forensic Phase {processStep} of 4
                        </p>
                    </div>
                </div>

                {/* Center Progress Bar */}
                <div className="hidden lg:flex items-center gap-4 bg-slate-50 px-10 py-5 rounded-2xl border border-slate-100">
                    {[
                        { id: 1, label: 'UPLOAD', icon: Upload },
                        { id: 2, label: 'REVIEW', icon: FileSearch },
                        { id: 3, label: 'DRAFT', icon: FileText },
                        { id: 4, label: 'DISPATCH', icon: Send }
                    ].map((step) => (
                        <React.Fragment key={step.id}>
                            <div className="flex flex-col items-center gap-2 cursor-pointer" onClick={() => handleStepChange(step.id)}>
                                <div className={`w-10 h-10 rounded-full border-2 flex items-center justify-center transition-all hover:scale-110 ${processStep >= step.id ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-200' : 'bg-white border-slate-200 text-slate-300 hover:border-blue-400 hover:text-blue-400'}`}>
                                    {processStep > step.id ? <CheckCircle2 size={18} /> : <step.icon size={18} />}
                                </div>
                                <span className={`text-[8px] font-black uppercase tracking-widest ${processStep >= step.id ? 'text-blue-600' : 'text-slate-300'}`}>{step.label}</span>
                            </div>
                            {step.id < 4 && <div className={`w-16 h-0.5 rounded-full ${processStep > step.id ? 'bg-blue-600' : 'bg-slate-200'}`}></div>}
                        </React.Fragment>
                    ))}
                </div>

                <div className="flex gap-4">
                    {processStep === 2 && <Button variant="primary" className="px-10 py-4" icon={FileText} onClick={() => handleStepChange(3)}>Generate Notices</Button>}
                    {processStep === 3 && <Button variant="primary" className="bg-emerald-600 border-none px-10 py-4" icon={Send} onClick={() => setProcessStep(4)}>Proceed to Final</Button>}
                </div>
            </div>

            <div className="grid grid-cols-1 gap-10">
                {/* Dynamic Content Sector */}
                <div>
                    <AnimatePresence mode="wait">
                        {processStep === 1 && (
                            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} key="step1">
                                <Card className="p-0 overflow-hidden border-slate-200 shadow-xl bg-white">
                                    <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/20">
                                        <div className="flex items-center gap-4">
                                            <div className="p-3 bg-blue-600 rounded-2xl shadow-lg shadow-blue-100">
                                                <Upload className="text-white" size={24} />
                                            </div>
                                            <div>
                                                <h3 className="text-xl font-black text-slate-900 tracking-tight uppercase italic">Forensic <span className="text-blue-600">Upload</span> Engine</h3>
                                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5 italic">Import Excel Money Trail Data</p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="p-12 space-y-8">
                                        <div className="bg-white border-2 border-dashed border-slate-200 rounded-[32px] p-14 text-center relative group hover:border-blue-400 transition-all shadow-sm">
                                            <input type="file" accept=".xlsx,.xls" onChange={(e) => setExcelFile(e.target.files[0])} className="absolute inset-0 opacity-0 cursor-pointer z-20" />
                                            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner group-hover:scale-110 transition-transform">
                                                <FileSpreadsheet className="text-slate-300 group-hover:text-blue-500 transition-colors" size={32} />
                                            </div>
                                            <h3 className="text-lg font-black text-slate-900 mb-2 tracking-tight">{excelFile ? excelFile.name : 'Forensic Excel फ़ाइल चुनें'}</h3>
                                            <p className="text-slate-400 text-[10px] max-w-sm mx-auto mb-4 font-bold uppercase tracking-widest">Supports .xlsx, .xls formatted bank statements with transaction data</p>
                                            {excelFile && (
                                                <div className="inline-flex items-center gap-2 bg-emerald-50 text-emerald-600 px-5 py-2 rounded-full text-xs font-black uppercase tracking-wide border border-emerald-100 mt-2">
                                                    <CheckCircle2 size={14} /> File Ready
                                                </div>
                                            )}
                                        </div>

                                        {bankGroups.length > 0 && (
                                            <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-2xl p-5">
                                                <AlertTriangle className="text-amber-500 flex-shrink-0" size={20} />
                                                <p className="text-xs font-bold text-amber-700">
                                                    Data already loaded ({stats.totalRecords} transactions across {stats.totalBanks} banks). Uploading again will add more records.
                                                </p>
                                            </div>
                                        )}

                                        <div className="flex gap-4">
                                            <Button
                                                variant="primary"
                                                className="flex-1 py-5 text-xs tracking-widest"
                                                disabled={!excelFile || importing}
                                                loading={importing}
                                                onClick={handleExcelUpload}
                                                icon={FileSearch}
                                            >
                                                {importing ? 'Processing...' : 'Process & Continue to Review'}
                                            </Button>
                                            {bankGroups.length > 0 && (
                                                <Button
                                                    variant="outline"
                                                    className="px-8 py-5 text-xs tracking-widest"
                                                    onClick={() => handleStepChange(2)}
                                                    icon={ExternalLink}
                                                >
                                                    Skip to Review
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                </Card>
                            </motion.div>
                        )}

                        {processStep === 2 && (
                            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} key="step2">
                                <Card className="p-0 overflow-hidden border-slate-200 shadow-xl bg-white">
                                    <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/20">
                                        <div className="flex items-center gap-4">
                                            <div className="p-3 bg-blue-600 rounded-2xl shadow-lg shadow-blue-100">
                                                <ShieldCheck className="text-white" size={24} />
                                            </div>
                                            <div>
                                                <h3 className="text-xl font-black text-slate-900 tracking-tight uppercase italic">Forensic Data <span className="text-blue-600">Normalization</span></h3>
                                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5 italic">Mapping Intelligence Nodes & Transaction Sinks</p>
                                            </div>
                                        </div>
                                        <div className="flex gap-4">
                                            <select 
                                                value={layerFilter} 
                                                onChange={(e) => setLayerFilter(e.target.value)}
                                                className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest outline-none focus:border-blue-500 cursor-pointer"
                                            >
                                                <option value="ALL">All Layers</option>
                                                {(() => {
                                                    const maxLayer = Math.max(...bankGroups.flatMap(g => g.records.map(r => parseInt(r.layer) || 1)), 1);
                                                    return Array.from({ length: maxLayer }, (_, i) => (
                                                        <option key={i + 1} value={(i + 1).toString()}>Layer {i + 1}</option>
                                                     ));
                                                })()}
                                            </select>
                                            <Button variant="outline" className={`px-6 text-[10px] font-black tracking-widest uppercase transition-all ${filters.length > 0 ? 'bg-blue-600 text-white border-blue-600' : ''}`} icon={Filter} onClick={addFilter}>
                                                {filters.length > 0 ? `Filters Active (${filters.length})` : 'Add Intelligence Filter'}
                                            </Button>
                                            <Button variant="outline" className="text-xs" icon={ExternalLink}>Export Master</Button>
                                        </div>
                                    </div>

                                    {/* Multi-Filter Interface */}
                                    <AnimatePresence>
                                        {filters.length > 0 && (
                                            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="px-8 py-6 bg-slate-50 border-b border-slate-100 overflow-hidden">
                                                <div className="flex flex-wrap gap-4">
                                                    {filters.map((f, idx) => {
                                                        const col = filterColumns.find(c => c.id === f.column);
                                                        const validOperators = filterOperators.filter(op => op.types.includes(col?.type || 'text'));

                                                        return (
                                                            <div key={f.id} className="flex items-center gap-2 bg-white p-2 rounded-xl border border-slate-200 shadow-sm animate-in zoom-in duration-300">
                                                                {idx > 0 && (
                                                                    <>
                                                                        <select
                                                                            value={f.joiner}
                                                                            onChange={(e) => updateFilter(f.id, 'joiner', e.target.value)}
                                                                            className="bg-slate-900 text-white text-[10px] font-black uppercase tracking-tighter px-2 py-2 rounded-lg border-none focus:ring-0 cursor-pointer"
                                                                        >
                                                                            <option value="AND">AND</option>
                                                                            <option value="OR">OR</option>
                                                                        </select>

                                                                        <button
                                                                            onClick={() => updateFilter(f.id, 'isNot', !f.isNot)}
                                                                            className={`px-3 py-2 rounded-lg text-[10px] font-black uppercase tracking-tighter transition-all ${f.isNot ? 'bg-rose-600 text-white shadow-lg shadow-rose-100' : 'bg-slate-100 text-slate-400'}`}
                                                                        >
                                                                            NOT
                                                                        </button>
                                                                    </>
                                                                )}

                                                                <select
                                                                    value={f.column}
                                                                    onChange={(e) => updateFilter(f.id, 'column', e.target.value)}
                                                                    className="bg-slate-50 text-[10px] font-black uppercase tracking-tighter px-3 py-2 rounded-lg border-none focus:ring-2 focus:ring-blue-500"
                                                                >
                                                                    {filterColumns.map(col => (
                                                                        <option key={col.id} value={col.id}>{col.label}</option>
                                                                    ))}
                                                                </select>

                                                                <select
                                                                    value={f.operator}
                                                                    onChange={(e) => updateFilter(f.id, 'operator', e.target.value)}
                                                                    className="bg-blue-50 text-blue-600 text-[10px] font-black uppercase tracking-tighter px-3 py-2 rounded-lg border-none focus:ring-2 focus:ring-blue-500"
                                                                >
                                                                    {validOperators.map(op => (
                                                                        <option key={op.id} value={op.id}>{op.label}</option>
                                                                    ))}
                                                                </select>

                                                                <div className="h-4 w-[1px] bg-slate-200"></div>

                                                                {f.operator !== 'null' && f.operator !== 'not_null' && (
                                                                    <div className="relative">
                                                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={14} />
                                                                        <input
                                                                            type="text"
                                                                            placeholder={col?.type === 'number' ? 'Value...' : 'Contains...'}
                                                                            value={f.value}
                                                                            onChange={(e) => updateFilter(f.id, 'value', e.target.value)}
                                                                            className="pl-9 pr-4 py-2 bg-slate-50 text-[10px] font-bold text-slate-700 placeholder:text-slate-300 rounded-lg border-none focus:ring-2 focus:ring-blue-500 w-48"
                                                                        />
                                                                    </div>
                                                                )}

                                                                <button
                                                                    onClick={() => removeFilter(f.id)}
                                                                    className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all"
                                                                >
                                                                    <X size={14} />
                                                                </button>
                                                            </div>
                                                        );
                                                    })}
                                                    <button
                                                        onClick={addFilter}
                                                        className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-xl border border-dashed border-blue-200 hover:bg-blue-600 hover:text-white transition-all text-[10px] font-black uppercase tracking-widest"
                                                    >
                                                        <Plus size={14} /> Add Clause
                                                    </button>
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>

                                    <div className="max-h-[800px] overflow-y-auto">
                                        <table className="w-full text-left border-collapse">
                                            <thead className="sticky top-0 bg-white shadow-sm z-10">
                                                <tr className="border-b border-slate-100 bg-slate-50">
                                                    <th className="px-3 py-4 w-12 text-center border-r border-slate-200">
                                                        <button
                                                            onClick={toggleSelectAllRecords}
                                                            className={`p-1 rounded-md transition-all border-2 ${areAllRecordsSelected ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-slate-300 text-transparent'}`}
                                                        >
                                                            {areAllRecordsSelected ? <CheckSquare size={14} /> : <Square size={14} />}
                                                        </button>
                                                    </th>
                                                    <th className="px-3 py-4 text-[9px] font-black text-slate-500 uppercase tracking-tighter border-r border-slate-200 text-center">S.No</th>
                                                    <th className="px-4 py-4 text-[9px] font-black text-slate-500 uppercase tracking-tighter border-r border-slate-200">Acknowledgement No</th>
                                                    <th className="px-4 py-4 text-[9px] font-black text-slate-500 uppercase tracking-tighter border-r border-slate-200">Account No / Wallet / PG / PA Id</th>
                                                    <th className="px-4 py-4 text-[9px] font-black text-slate-500 uppercase tracking-tighter border-r border-slate-200">Transaction Id / UTR Number</th>
                                                    <th className="px-4 py-4 text-[9px] font-black text-slate-500 uppercase tracking-tighter border-r border-slate-200">Bank/FIs</th>
                                                    <th className="px-3 py-4 text-[9px] font-black text-blue-600 uppercase tracking-tighter border-r border-slate-200 text-center bg-blue-50/50">Layer</th>
                                                    <th className="px-4 py-4 text-[9px] font-black text-slate-500 uppercase tracking-tighter border-r border-slate-200">Account No.</th>
                                                    <th className="px-4 py-4 text-[9px] font-black text-slate-500 uppercase tracking-tighter border-r border-slate-200">IFSC Code</th>
                                                    <th className="px-4 py-4 text-[9px] font-black text-slate-500 uppercase tracking-tighter border-r border-slate-200">Transaction Date</th>
                                                    <th className="px-4 py-4 text-[9px] font-black text-slate-500 uppercase tracking-tighter border-r border-slate-200">Transaction Id / UTR Number2</th>
                                                    <th className="px-4 py-4 text-[9px] font-black text-slate-500 uppercase tracking-tighter border-r border-slate-200">Transaction Amount</th>
                                                    <th className="px-4 py-4 text-[9px] font-black text-slate-500 uppercase tracking-tighter border-r border-slate-200">Disputed Amount</th>
                                                    <th className="px-4 py-4 text-[9px] font-black text-slate-500 uppercase tracking-tighter border-r border-slate-200">Reference No</th>
                                                    <th className="px-4 py-4 text-[9px] font-black text-slate-500 uppercase tracking-tighter border-r border-slate-200">Remarks</th>
                                                    <th className="px-4 py-4 text-[9px] font-black text-slate-500 uppercase tracking-tighter border-r border-slate-200">Action Taken By Bank</th>
                                                    <th className="px-4 py-4 text-[9px] font-black text-slate-500 uppercase tracking-tighter border-r border-slate-200">Date of Action</th>
                                                    <th className="px-4 py-4 text-[9px] font-black text-slate-500 uppercase tracking-tighter">pisnodal</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                                {activeRecords.map((rec, i) => {
                                                    const raw = rec.raw || {};
                                                    return (
                                                        <tr key={i} className="hover:bg-slate-50/50 transition-colors group">
                                                            <td className="px-3 py-3 text-center border-r border-slate-100">
                                                                <button
                                                                    onClick={() => toggleRecordSelection(rec.utr)}
                                                                    className={`p-1 rounded-md transition-all border-2 ${selectedRecordUtrs.has(rec.utr) ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-slate-300 text-transparent'}`}
                                                                >
                                                                    {selectedRecordUtrs.has(rec.utr) ? <CheckSquare size={14} /> : <Square size={14} />}
                                                                </button>
                                                            </td>
                                                            <td className="px-3 py-3 text-[10px] text-center font-bold text-slate-400 border-r border-slate-100">{raw['S.No'] || raw['S. No'] || raw['S No'] || (i + 1)}</td>
                                                            <td className="px-4 py-3 text-[10px] font-bold text-slate-600 border-r border-slate-100">{raw['Acknowledgement No'] || rec.ackNo}</td>
                                                            <td className="px-4 py-3 text-[10px] font-black text-slate-900 border-r border-slate-100">{raw['Account No / Wallet / PG / PA Id'] || rec.originalAccount}</td>
                                                            <td className="px-4 py-3 text-[10px] font-mono text-slate-500 border-r border-slate-100">{raw['Transaction Id / UTR Number'] || rec.utr}</td>
                                                            <td className="px-4 py-3 text-[10px] font-bold text-slate-700 border-r border-slate-100">{raw['Bank/FIs'] || rec.bank}</td>
                                                            <td className="px-3 py-3 text-[10px] text-center font-black text-blue-600 border-r border-slate-100 bg-blue-50/20">{rec.layer}</td>
                                                            <td className="px-4 py-3 text-[10px] font-bold text-slate-600 border-r border-slate-100">{raw['Account No.'] || raw['Account No'] || 'N/A'}</td>
                                                            <td className="px-4 py-3 text-[10px] font-bold text-slate-500 border-r border-slate-100">{raw['IFSC Code'] || rec.ifsc}</td>
                                                            <td className="px-4 py-3 text-[10px] font-bold text-slate-500 border-r border-slate-100">{raw['Transaction Date'] || rec.dateStr}</td>
                                                            <td className="px-4 py-3 text-[10px] font-mono text-slate-400 border-r border-slate-100">{raw['Transaction Id / UTR Number2'] || 'N/A'}</td>
                                                            <td className="px-4 py-3 text-[10px] font-black text-slate-900 border-r border-slate-100 italic">₹{parseFloat(raw['Transaction Amount'] || rec.amount).toLocaleString()}</td>
                                                            <td className="px-4 py-3 text-[10px] font-black text-rose-600 border-r border-slate-100">₹{parseFloat(raw['Disputed Amount'] || 0).toLocaleString()}</td>
                                                            <td className="px-4 py-3 text-[10px] font-bold text-slate-400 border-r border-slate-100">{raw['Reference No'] || 'N/A'}</td>
                                                            <td className="px-4 py-3 text-[9px] font-medium text-slate-400 border-r border-slate-100 max-w-[150px] truncate">{raw['Remarks'] || rec.remarks}</td>
                                                            <td className="px-4 py-3 text-[10px] font-black text-emerald-600 border-r border-slate-100 uppercase">{raw['Action Taken By Bank'] || rec.actionTaken}</td>
                                                            <td className="px-4 py-3 text-[10px] font-bold text-slate-400 border-r border-slate-100">{raw['Date of Action'] || rec.actionDate}</td>
                                                            <td className="px-4 py-3 text-[10px] font-bold text-slate-400">{raw['pisnodal'] || 'N/A'}</td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                </Card>
                            </motion.div>
                        )}

                        {processStep === 3 && (() => {
                            // Build all letters for selected banks
                            const allLetters = bankGroups
                                .filter(g => selectedBankIds.has(g.name))
                                .map(g => {
                                    const recs = g.records.filter(r => selectedRecordUtrs.has(r.utr) && passesAllFilters(r));
                                    if (recs.length === 0) return null;
                                    return {
                                        year: new Date().getFullYear(),
                                        refId: `${id}/782-JP`,
                                        date: new Date().toLocaleDateString('en-GB'),
                                        bankName: g.name,
                                        records: recs.map(r => ({
                                            accountNumber: r.account,
                                            transactionId: r.utr,
                                            amount: typeof r.amount === 'string' ? r.amount : `\u20b9${parseFloat(r.amount).toLocaleString()}`
                                        })),
                                        startDate: '01/01/2024',
                                        endDate: new Date().toLocaleDateString('en-GB')
                                    };
                                })
                                .filter(Boolean);

                            return (
                                <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, x: 20 }} key="step3" className="flex flex-col gap-6">
                                    {/* Top Action Bar */}
                                    <div className="flex justify-between items-center bg-white px-8 py-6 rounded-[28px] border border-blue-100 shadow-sm">
                                        <div className="flex items-center gap-4">
                                            <Printer className="text-blue-600" size={20} />
                                            <h3 className="text-sm font-black text-slate-900 tracking-tighter uppercase italic">Legal Correspondence <span className="text-blue-600">Ready Matrix</span></h3>
                                            <span className="ml-4 px-4 py-1 bg-blue-50 text-blue-600 rounded-full text-[10px] font-black uppercase">{allLetters.length} Notice{allLetters.length !== 1 ? 's' : ''}</span>
                                        </div>
                                        <div className="flex gap-3">
                                            <Button variant="outline" className="px-6 rounded-xl" icon={Download} onClick={handleBulkDownload}>Bulk Download</Button>
                                            <Button variant="outline" className="px-6 rounded-xl" icon={Printer} onClick={() => downloadPdf('letter-preview', `NOTICE_${selectedBank?.bankName}.pdf`)}>Print</Button>
                                            <Button variant="primary" className="px-6 rounded-xl shadow-blue-200 bg-blue-600 border-none" icon={Save} onClick={handleSaveToDossier}>Save to Dossier</Button>
                                        </div>
                                    </div>

                                    {/* Editable Template Panel */}
                                    <Card className="bg-white p-8 rounded-[28px] border border-slate-200 shadow-sm space-y-6">
                                        <div className="flex items-center gap-3 mb-4">
                                            <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center">
                                                <FileText size={16} className="text-indigo-600" />
                                            </div>
                                            <h3 className="text-sm font-black text-slate-900 tracking-tight uppercase">Edit Notice Format</h3>
                                        </div>

                                        <div className="grid grid-cols-1 gap-6">
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pb-4 border-b border-slate-100">
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Header Line 1 (Dept)</label>
                                                    <input
                                                        type="text"
                                                        value={letterTemplate.headerLine1}
                                                        onChange={(e) => setLetterTemplate({ ...letterTemplate, headerLine1: e.target.value })}
                                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-bold text-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Header Line 2 (Station)</label>
                                                    <input
                                                        type="text"
                                                        value={letterTemplate.headerLine2}
                                                        onChange={(e) => setLetterTemplate({ ...letterTemplate, headerLine2: e.target.value })}
                                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-bold text-rose-600 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Header Line 3 (Address)</label>
                                                    <input
                                                        type="text"
                                                        value={letterTemplate.headerLine3}
                                                        onChange={(e) => setLetterTemplate({ ...letterTemplate, headerLine3: e.target.value })}
                                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-bold text-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                    />
                                                </div>
                                            </div>

                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Subject Line</label>
                                                <textarea
                                                    value={letterTemplate.subjectText}
                                                    onChange={(e) => setLetterTemplate({ ...letterTemplate, subjectText: e.target.value })}
                                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs font-bold text-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-h-[60px]"
                                                />
                                            </div>

                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Notice Body / Context</label>
                                                <textarea
                                                    value={letterTemplate.bodyText}
                                                    onChange={(e) => setLetterTemplate({ ...letterTemplate, bodyText: e.target.value })}
                                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs font-bold text-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-h-[100px]"
                                                />
                                            </div>

                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Footer / Directive (e.g. DEBIT FREEZE)</label>
                                                <textarea
                                                    value={letterTemplate.footerText}
                                                    onChange={(e) => setLetterTemplate({ ...letterTemplate, footerText: e.target.value })}
                                                    className="w-full bg-rose-50/50 border border-rose-100 rounded-xl p-4 text-xs font-bold text-rose-700 focus:ring-2 focus:ring-rose-500 focus:border-rose-500 min-h-[60px]"
                                                />
                                            </div>
                                        </div>
                                    </Card>

                                    {/* Zoom Controls */}
                                    <div className="flex items-center justify-center gap-3">
                                        <button onClick={() => setZoom(z => Math.max(0.3, z - 0.1))} className="p-3 bg-white rounded-xl border border-slate-200 hover:bg-slate-50 hover:border-blue-300 transition-all shadow-sm"><ZoomOut size={16} className="text-slate-600" /></button>
                                        <div className="px-5 py-2 bg-white rounded-xl border border-slate-200 text-[10px] font-black text-slate-600 uppercase tracking-widest min-w-[80px] text-center">{Math.round(zoom * 100)}%</div>
                                        <button onClick={() => setZoom(z => Math.min(1.5, z + 0.1))} className="p-3 bg-white rounded-xl border border-slate-200 hover:bg-slate-50 hover:border-blue-300 transition-all shadow-sm"><ZoomIn size={16} className="text-slate-600" /></button>
                                        <button onClick={() => setZoom(0.75)} className="px-4 py-2 bg-white rounded-xl border border-slate-200 hover:bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest transition-all shadow-sm">Reset</button>
                                    </div>

                                    {/* PDF Viewer Frame */}
                                    <div className="bg-slate-600 rounded-[32px] shadow-inner relative overflow-hidden">
                                        <div className="max-h-[85vh] overflow-y-auto p-8 md:p-12" style={{ scrollBehavior: 'smooth' }}>
                                            {generating ? (
                                                <div className="flex flex-col items-center justify-center gap-6 min-h-[600px]">
                                                    <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                                                    <div className="text-center">
                                                        <p className="text-white font-black uppercase tracking-[0.4em] text-sm animate-pulse">Analyzing Transaction Sinks...</p>
                                                        <p className="text-white/40 text-[9px] font-bold uppercase mt-2 tracking-widest">Normalizing forensic weights & drafting notices</p>
                                                    </div>
                                                </div>
                                            ) : allLetters.length > 0 ? (
                                                <div className="flex flex-col items-center gap-10">
                                                    {allLetters.map((letter, idx) => (
                                                        <motion.div
                                                            key={letter.bankName}
                                                            initial={{ y: 30, opacity: 0 }}
                                                            animate={{ y: 0, opacity: 1 }}
                                                            transition={{ delay: idx * 0.1 }}
                                                            className="relative w-full flex flex-col items-center"
                                                        >
                                                            {/* Page Label */}
                                                            <div className="mb-3 flex items-center gap-3">
                                                                <span className="px-4 py-1.5 bg-white/10 backdrop-blur-md rounded-full text-[9px] font-black text-white/70 uppercase tracking-[0.3em]">
                                                                    Notice {idx + 1} of {allLetters.length} — {letter.bankName}
                                                                </span>
                                                            </div>
                                                            {/* Letter Paper */}
                                                            <div
                                                                id={idx === 0 ? 'letter-preview' : `letter-preview-${idx}`}
                                                                className="bg-white rounded-sm shadow-[0_20px_60px_rgba(0,0,0,0.4)] ring-1 ring-black/10 origin-top transition-transform duration-300 ease-out"
                                                                style={{ transform: `scale(${zoom})`, width: '210mm', transformOrigin: 'top center' }}
                                                                dangerouslySetInnerHTML={{ __html: generateLetterHtml(letter) }}
                                                            />
                                                        </motion.div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="flex flex-col items-center justify-center gap-4 min-h-[600px]">
                                                    <div className="p-6 bg-white/10 rounded-full backdrop-blur-md"><AlertTriangle className="text-amber-400" size={40} /></div>
                                                    <p className="font-black uppercase tracking-[0.4em] text-white">No Records Selected</p>
                                                    <p className="text-[9px] text-white/50 font-bold uppercase max-w-xs text-center leading-relaxed">Please ensure you have checked at least one record that passes your current filters.</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </motion.div>
                            );
                        })()}

                        {processStep === 4 && (
                            <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} key="step4" className="flex items-center justify-center min-h-[600px]">
                                <Card className="max-w-xl w-full p-16 text-center space-y-8 bg-white shadow-2xl rounded-[48px] border-none relative overflow-hidden">
                                    <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-600 via-blue-400 to-emerald-500"></div>
                                    <div className="w-28 h-28 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-sm ring-8 ring-emerald-50/50">
                                        <Send size={48} className="translate-x-1 -translate-y-1" />
                                    </div>
                                    <div className="space-y-4">
                                        <h3 className="text-4xl font-black text-slate-900 tracking-tighter italic uppercase">Operation <span className="text-emerald-600">Finalized</span></h3>
                                        <p className="text-slate-500 text-sm leading-relaxed font-semibold italic">
                                            All forensic warrants have been verified and sealed in the evidence repository. The dossier is ready for digital dispatch or physical printing.
                                        </p>
                                    </div>
                                    <div className="text-left">
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Completion Remarks / Origin Log</label>
                                        <textarea
                                            value={remark}
                                            onChange={(e) => setRemark(e.target.value)}
                                            placeholder="Enter operational log remarks here..."
                                            className="w-full h-24 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm resize-none"
                                        />
                                    </div>
                                    <div className="pt-8 grid grid-cols-2 gap-4">
                                        <Button variant="outline" className="py-5" icon={Mail}>Nodal Email Blast</Button>
                                        <Button
                                            variant="primary"
                                            className="bg-blue-600 py-5 shadow-2xl shadow-blue-200"
                                            icon={CheckCircle2}
                                            onClick={handleCompleteMission}
                                            disabled={isCompleting}
                                        >
                                            {isCompleting ? 'Finalizing...' : 'Complete Mission'}
                                        </Button>
                                    </div>
                                    <p className="text-[10px] text-slate-300 font-bold uppercase tracking-[0.4em] pt-4 italic">v2.4 secure_node encrypted signal</p>
                                </Card>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
};

export default LetterPreview;
