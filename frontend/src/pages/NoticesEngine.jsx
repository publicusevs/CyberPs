import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import {
    X, Building2, Shield, ChevronRight, ChevronLeft,
    FileText, CheckCircle2, AlertTriangle, Send,
    Banknote, Search, CheckSquare, Square, Clock,
    FileSearch, Hash, User, Inbox, ChevronDown, ChevronUp, Filter, SlidersHorizontal, Upload,
    Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight, List, ImageIcon, Printer, Download
} from 'lucide-react';

const NOTICE_CATEGORIES = [
    { id: 'BANK', label: 'Bank Notices', icon: Building2, color: 'blue', active: true, desc: 'KYC, Freeze, Hold, Statement, Transaction Details' },
    { id: 'TELECOM', label: 'Telecom Notices', icon: Hash, color: 'slate', active: false, desc: 'CDR, IPDR, Tower Dump Requests — Phase 2' },
    { id: 'SOCIAL', label: 'Social Media', icon: User, color: 'slate', active: false, desc: 'Platform data, account details — Phase 2' },
    { id: 'COURT', label: 'Court Notices', icon: FileText, color: 'slate', active: false, desc: 'Summons, warrants, orders — Phase 2' },
    { id: 'GOVT', label: 'Govt. Dept.', icon: Shield, color: 'slate', active: false, desc: 'Department notices — Phase 2' },
];

const NOTICE_TYPES = {
    BANK: [
        { id: 'KYC_REQUEST', label: 'KYC Information Request', desc: 'Request account holder KYC documents and identity details', icon: FileSearch },
        { id: 'DEBIT_FREEZE', label: 'Debit Freeze Request', desc: 'Request immediate freeze on debit transactions from suspect account', icon: Shield },
        { id: 'AMOUNT_HOLD', label: 'Amount Hold Request', desc: 'Request hold on specific disputed fraud amount in account', icon: Banknote },
        { id: 'STATEMENT_REQUEST', label: 'Account Statement Request', desc: 'Request full account statement for investigation period', icon: FileText },
        { id: 'TXN_DETAILS', label: 'Transaction Details Request', desc: 'Request specific UTR/transaction details and beneficiary info', icon: Hash },
    ]
};

const STATUS_COLOR = { Generated: 'blue', Sent: 'emerald', Replied: 'violet', Draft: 'slate' };

export default function NoticesEngine({ caseId, caseData, onClose }) {
    const [step, setStep] = useState('category'); // category | type | entities | preview | generate | done
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [selectedType, setSelectedType] = useState(null);
    const [bankGroups, setBankGroups] = useState([]);
    const [selectedBanks, setSelectedBanks] = useState(new Set());
    const [selectedUtrs, setSelectedUtrs] = useState(new Set());
    const [search, setSearch] = useState('');
    const [minAmount, setMinAmount] = useState('');
    const [selectedLayers, setSelectedLayers] = useState([]);
    const [expandedBanks, setExpandedBanks] = useState(new Set());
    
    // New State for Templates & Preview
    const [templates, setTemplates] = useState([]);
    const [previewBanks, setPreviewBanks] = useState([]);
    const [selectedNoticeHtml, setSelectedNoticeHtml] = useState(null);
    const [generating, setGenerating] = useState(false);
    const [importing, setImporting] = useState(false);
    const [generated, setGenerated] = useState([]);
    const [dispatchList, setDispatchList] = useState([]);
    const [activeTab, setActiveTab] = useState('wizard'); // wizard | register

    useEffect(() => {
        // Build bank groups from existing transactions
        const groups = {};
        (caseData?.transactions || []).forEach(t => {
            const bank = (t.platform || 'Unknown Bank').trim();
            if (!groups[bank]) groups[bank] = { name: bank, accounts: [] };
            groups[bank].accounts.push({ 
                account: t.receiver_acc, 
                utr: t.utr_no, 
                amount: t.amount, 
                date: t.trans_date,
                layer: String(t.layer || t.layer_no || t.level || 1)
            });
        });
        const arr = Object.values(groups);
        setBankGroups(arr);
        setSelectedBanks(new Set(arr.map(g => g.name)));
        setSelectedUtrs(new Set(arr.flatMap(g => g.accounts.map(a => a.utr))));
    }, [caseData]);

    useEffect(() => { fetchDispatch(); }, []);

    const fetchDispatch = async () => {
        try {
            const res = await api.get(`/notices/dispatch/${caseId}`);
            if (res.data.success) setDispatchList(res.data.data);
        } catch {}
    };

    useEffect(() => {
        const fetchTemplates = async () => {
            try {
                const res = await api.get('/templates');
                if (res.data.success) setTemplates(res.data.data);
            } catch (err) {}
        };
        fetchTemplates();
    }, []);

    const toggleBank = (name) => {
        const s = new Set(selectedBanks);
        const group = filteredGroups.find(g => g.name === name);
        if (s.has(name)) {
            s.delete(name);
        } else {
            s.add(name);
            // Optionally auto-select visible accounts when bank is checked
            if (group) toggleAllInBank(group);
        }
        setSelectedBanks(s);
    };

    const toggleUtr = (utr) => {
        const s = new Set(selectedUtrs);
        s.has(utr) ? s.delete(utr) : s.add(utr);
        setSelectedUtrs(s);
    };

    const toggleAllInBank = (group) => {
        const utrs = group.accounts.map(a => a.utr);
        const allSelected = utrs.every(u => selectedUtrs.has(u));
        const s = new Set(selectedUtrs);
        utrs.forEach(u => allSelected ? s.delete(u) : s.add(u));
        setSelectedUtrs(s);
    };

    const handleUploadExcel = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setImporting(true);
        const formData = new FormData();
        formData.append('excel_file', file);
        formData.append('case_id', caseId);

        try {
            const res = await api.post('/transactions/import', formData);
            if (res.data.success) {
                const caseRes = await api.get(`/cases/${caseId}`);
                if (caseRes.data.success) {
                    const groups = {};
                    (caseRes.data.transactions || []).forEach(t => {
                        const bank = (t.platform || 'Unknown Bank').trim();
                        if (!groups[bank]) groups[bank] = { name: bank, accounts: [] };
                        groups[bank].accounts.push({ 
                            account: t.receiver_acc, 
                            utr: t.utr_no, 
                            amount: t.amount, 
                            date: t.trans_date,
                            layer: String(t.layer || t.layer_no || t.level || 1)
                        });
                    });
                    const arr = Object.values(groups);
                    setBankGroups(arr);
                    setSelectedBanks(new Set(arr.map(g => g.name)));
                    setSelectedUtrs(new Set(arr.flatMap(g => g.accounts.map(a => a.utr))));
                }
            }
        } catch (err) {
            alert('Excel import failed: ' + (err.response?.data?.message || err.message));
        } finally {
            setImporting(false);
            e.target.value = null;
        }
    };

    const toggleExpand = (name) => {
        const s = new Set(expandedBanks);
        s.has(name) ? s.delete(name) : s.add(name);
        setExpandedBanks(s);
    };

    const formatText = (command, value = null) => {
        document.execCommand(command, false, value);
    };

    const applyFontSize = (size) => {
        document.execCommand('fontSize', false, '7');
        const fontElements = document.getElementsByTagName('font');
        for (let i = 0; i < fontElements.length; i++) {
            if (fontElements[i].size === '7' || fontElements[i].getAttribute('size') === '7') {
                const span = document.createElement('span');
                span.style.fontSize = `${size}px`;
                span.innerHTML = fontElements[i].innerHTML;
                fontElements[i].parentNode.replaceChild(span, fontElements[i]);
            }
        }
    };

    const filteredGroups = bankGroups.map(g => {
        const filteredAccounts = g.accounts.filter(a => {
            const matchesSearch = !search || 
                g.name.toLowerCase().includes(search.toLowerCase()) || 
                a.account?.includes(search) || 
                a.utr?.includes(search);
            const matchesAmount = !minAmount || parseFloat(a.amount || 0) >= parseFloat(minAmount);
            const matchesLayer = selectedLayers.length === 0 || selectedLayers.includes(a.layer);
            return matchesSearch && matchesAmount && matchesLayer;
        });
        return { ...g, accounts: filteredAccounts };
    }).filter(g => g.accounts.length > 0);

    const handlePreview = () => {
        const banks = filteredGroups
            .filter(g => selectedBanks.has(g.name))
            .map(g => ({ name: g.name, accounts: g.accounts.filter(a => selectedUtrs.has(a.utr)) }))
            .filter(g => g.accounts.length > 0);

        if (banks.length === 0) { alert('No accounts selected'); return; }

        const tpl = templates.find(t => t.template_type === selectedType);
        const baseHtml = tpl ? tpl.body_text : '<p>No template found for this Notice Type. Please create one in Templates Config.</p>';
        
        const pbanks = banks.map(b => {
            let bankHtml = baseHtml
                .replace(/\{BANK_NAME\}/g, b.name)
                .replace(/\{ACCOUNT_NO\}/g, b.accounts.map(a => a.account).join(', '));
            return { ...b, content: bankHtml };
        });

        setPreviewBanks(pbanks);
        setStep('preview');
    };

    const handleGenerate = async () => {
        if (previewBanks.length === 0) { alert('No accounts selected'); return; }
        setGenerating(true);
        try {
            const res = await api.post('/notices/generate', {
                case_id: caseId,
                notice_category: selectedCategory,
                notice_type_code: selectedType,
                banks: previewBanks
            });
            if (res.data.success) {
                setGenerated(res.data.data);
                await fetchDispatch();
                setStep('done');
            }
        } catch (err) {
            alert(err.response?.data?.message || 'Generation failed');
        } finally {
            setGenerating(false);
        }
    };

    const totalSelected = filteredGroups
        .filter(g => selectedBanks.has(g.name))
        .flatMap(g => g.accounts)
        .filter(a => selectedUtrs.has(a.utr)).length;

    return (
        <div className="fixed inset-0 z-[999] flex items-start justify-center p-4 bg-slate-900/70 backdrop-blur-md overflow-y-auto">
            <motion.div
                initial={{ scale: 0.94, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.94, opacity: 0, y: 20 }}
                className="w-full max-w-5xl my-8"
            >
                <Card className="p-0 overflow-hidden shadow-2xl border-none">
                    {/* Header */}
                    <div className="bg-slate-900 p-6 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="w-1 h-10 bg-blue-500 rounded-full" />
                            <div>
                                <h2 className="text-xl font-black text-white uppercase tracking-tight">Letters & Notices Engine</h2>
                                <p className="text-[10px] text-slate-400 font-bold tracking-widest uppercase mt-0.5">Case #{caseId} — Context-Aware Notice Generation</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            {/* Tabs */}
                            <div className="flex bg-slate-800 rounded-xl p-1 gap-1">
                                {[{ id: 'wizard', label: 'New Notice' }, { id: 'register', label: `Dispatch Register (${dispatchList.length})` }].map(t => (
                                    <button key={t.id} onClick={() => { setActiveTab(t.id); if (t.id === 'wizard') setStep('category'); }}
                                        className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === t.id ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}>
                                        {t.label}
                                    </button>
                                ))}
                            </div>
                            <button onClick={onClose} className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-full transition-all">
                                <X size={20} />
                            </button>
                        </div>
                    </div>

                    <div className="bg-white min-h-[500px]">
                        <AnimatePresence mode="wait">
                            {activeTab === 'register' && (
                                <motion.div key="register" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="p-8">
                                    <div className="flex items-center gap-3 mb-6 border-b border-slate-100 pb-4">
                                        <Inbox className="text-blue-600" size={20} />
                                        <h3 className="text-base font-bold text-slate-900 uppercase">Dispatch Register</h3>
                                    </div>
                                    {dispatchList.length === 0 ? (
                                        <div className="py-20 text-center">
                                            <FileText className="mx-auto text-slate-200 mb-4" size={48} />
                                            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">No notices generated yet for this case.</p>
                                        </div>
                                    ) : (
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-xs">
                                                <thead>
                                                    <tr className="border-b border-slate-100">
                                                        {['Dispatch No', 'Bank / Entity', 'Notice Type', 'Accounts', 'Generated By', 'Date', 'Status', ''].map(h => (
                                                            <th key={h} className={`text-left p-3 text-[9px] font-black text-slate-400 uppercase tracking-widest ${h === '' ? 'text-right' : ''}`}>{h}</th>
                                                        ))}
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {dispatchList.map(d => (
                                                        <tr key={d.notice_id} 
                                                            className="border-b border-slate-50 hover:bg-slate-50 cursor-pointer transition-all"
                                                            onClick={() => setSelectedNoticeHtml(d.notice_content)}
                                                        >
                                                            <td className="p-3 font-mono font-bold text-blue-700 text-[10px]">{d.dispatch_no}</td>
                                                            <td className="p-3 font-bold text-slate-900">{d.bank_name}</td>
                                                            <td className="p-3 text-slate-600">{d.notice_type_code?.replace(/_/g, ' ')}</td>
                                                            <td className="p-3 text-slate-500">{d.selected_accounts?.length || 0} accts</td>
                                                            <td className="p-3 text-slate-500">{d.issued_by}</td>
                                                            <td className="p-3 text-slate-400">{new Date(d.created_at).toLocaleDateString()}</td>
                                                            <td className="p-3">
                                                                <span className={`px-2 py-1 rounded-full text-[8px] font-black uppercase bg-${STATUS_COLOR[d.status] || 'slate'}-50 text-${STATUS_COLOR[d.status] || 'slate'}-600 border border-${STATUS_COLOR[d.status] || 'slate'}-100`}>
                                                                    {d.status}
                                                                </span>
                                                            </td>
                                                            <td className="p-3 text-right">
                                                                <Button variant="ghost" className="h-8 w-8 p-0" onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    const printWindow = window.open('', '_blank');
                                                                    printWindow.document.write(`<html><head><title>${d.dispatch_no}</title></head><body style="margin:0;padding:20mm;">` + d.notice_content + '</body></html>');
                                                                    printWindow.document.close();
                                                                    setTimeout(() => { printWindow.print(); }, 500);
                                                                }}>
                                                                    <Printer size={14} className="text-slate-400 hover:text-blue-600" />
                                                                </Button>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </motion.div>
                            )}

                            {activeTab === 'wizard' && step === 'category' && (
                                <motion.div key="cat" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} className="p-8 space-y-6">
                                    <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                                        <FileText className="text-blue-600" size={20} />
                                        <h3 className="text-base font-bold text-slate-900 uppercase">Step 1 — Select Notice Category</h3>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {NOTICE_CATEGORIES.map(cat => (
                                            <button key={cat.id} disabled={!cat.active}
                                                onClick={() => { setSelectedCategory(cat.id); setStep('type'); }}
                                                className={`p-6 rounded-2xl border-2 text-left transition-all relative group
                                                    ${cat.active ? 'border-blue-200 hover:border-blue-600 hover:shadow-lg hover:shadow-blue-50 cursor-pointer bg-white' : 'border-slate-100 bg-slate-50 cursor-not-allowed opacity-60'}`}>
                                                {!cat.active && (
                                                    <span className="absolute top-3 right-3 text-[8px] font-black uppercase tracking-widest bg-slate-200 text-slate-500 px-2 py-0.5 rounded-full">Phase 2</span>
                                                )}
                                                <cat.icon className={`mb-3 ${cat.active ? 'text-blue-600' : 'text-slate-300'}`} size={28} />
                                                <p className={`font-black text-sm uppercase tracking-tight ${cat.active ? 'text-slate-900' : 'text-slate-400'}`}>{cat.label}</p>
                                                <p className="text-[10px] text-slate-400 mt-1 font-medium">{cat.desc}</p>
                                            </button>
                                        ))}
                                    </div>
                                </motion.div>
                            )}

                            {activeTab === 'wizard' && step === 'type' && (
                                <motion.div key="type" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} className="p-8 space-y-6">
                                    <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                                        <div className="flex items-center gap-3">
                                            <button onClick={() => setStep('category')} className="hover:text-blue-600 transition-colors flex items-center gap-1 text-[11px] font-black tracking-widest text-slate-400 uppercase bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
                                                <ChevronLeft size={14} /> Back
                                            </button>
                                            <ChevronRight className="text-slate-300" size={14} />
                                            <h3 className="text-base font-bold text-slate-900 uppercase">Step 2 — Select Notice Type</h3>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {(NOTICE_TYPES[selectedCategory] || []).map(nt => (
                                            <button key={nt.id}
                                                onClick={() => { setSelectedType(nt.id); setStep('entities'); }}
                                                className="p-6 rounded-2xl border-2 border-blue-100 hover:border-blue-600 hover:shadow-lg hover:shadow-blue-50 text-left transition-all bg-white group">
                                                <div className="flex items-center gap-3 mb-2">
                                                    <div className="p-2 bg-blue-50 rounded-xl group-hover:bg-blue-600 transition-colors">
                                                        <nt.icon className="text-blue-600 group-hover:text-white transition-colors" size={18} />
                                                    </div>
                                                    <p className="font-black text-sm text-slate-900 uppercase tracking-tight">{nt.label}</p>
                                                </div>
                                                <p className="text-[10px] text-slate-400 font-medium">{nt.desc}</p>
                                            </button>
                                        ))}
                                    </div>

                                </motion.div>
                            )}

                            {activeTab === 'wizard' && step === 'entities' && (
                                <motion.div key="ent" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} className="p-8 space-y-6">
                                    <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                                        <div className="flex items-center gap-3">
                                            <button onClick={() => setStep('type')} className="hover:text-blue-600 transition-colors flex items-center gap-1 text-[11px] font-black tracking-widest text-slate-400 uppercase bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
                                                <ChevronLeft size={14} /> Back
                                            </button>
                                            <ChevronRight className="text-slate-300" size={14} />
                                            <h3 className="text-base font-bold text-slate-900 uppercase">Step 3 — Select Bank Accounts</h3>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-3 py-1 rounded-full border border-blue-100">
                                                {totalSelected} accounts selected
                                            </span>
                                            <div className="relative overflow-hidden inline-block">
                                                <input type="file" accept=".xlsx,.xls" onChange={handleUploadExcel} disabled={importing} className="absolute inset-0 opacity-0 cursor-pointer z-10 w-full h-full" title="Upload more transactions" />
                                                <button className={`flex items-center gap-2 text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-xl transition-all pointer-events-none ${importing ? 'bg-slate-100 text-slate-400 border border-slate-200' : 'bg-emerald-50 text-emerald-600 border border-emerald-200 hover:bg-emerald-600 hover:text-white'}`}>
                                                    <Upload size={14} />
                                                    {importing ? 'Processing...' : 'Upload Excel'}
                                                </button>
                                            </div>
                                            <div className="relative">
                                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={14} />
                                                <input
                                                    value={search} onChange={e => setSearch(e.target.value)}
                                                    placeholder="Search bank or account..."
                                                    className="pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-500 w-56"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Filters Bar */}
                                    <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
                                        <div className="flex items-center gap-6">
                                            <div className="flex items-center gap-2">
                                                <Filter className="text-slate-400" size={16} />
                                                <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Advanced Filters:</span>
                                            </div>
                                            
                                            <div className="flex items-center gap-3">
                                                <label className="text-[10px] font-bold text-slate-500 uppercase">Min Amount (₹)</label>
                                                <input 
                                                    type="number" 
                                                    value={minAmount} 
                                                    onChange={e => setMinAmount(e.target.value)}
                                                    className="w-32 px-3 py-1.5 text-xs font-bold border border-slate-200 rounded-lg outline-none focus:border-blue-500 bg-white"
                                                    placeholder="e.g. 5000"
                                                />
                                            </div>

                                            <div className="flex items-center gap-3 border-l border-slate-200 pl-6">
                                                <label className="text-[10px] font-bold text-slate-500 uppercase">Layers</label>
                                                <div className="flex gap-1.5">
                                                    {['1', '2', '3', '4', '5'].map(l => (
                                                        <button 
                                                            key={l}
                                                            onClick={() => {
                                                                const newLayers = selectedLayers.includes(l) 
                                                                    ? selectedLayers.filter(x => x !== l) 
                                                                    : [...selectedLayers, l];
                                                                setSelectedLayers(newLayers);
                                                            }}
                                                            className={`w-7 h-7 rounded-lg text-[11px] font-bold transition-all shadow-sm ${
                                                                selectedLayers.includes(l) ? 'bg-blue-600 text-white border-blue-600' : 'bg-white border border-slate-200 text-slate-500 hover:border-blue-300'
                                                            }`}
                                                        >
                                                            {l}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Select/Deselect All Visible */}
                                        <button 
                                            onClick={() => {
                                                const visibleUtrs = filteredGroups.flatMap(g => g.accounts.map(a => a.utr));
                                                const allVisibleSelected = visibleUtrs.length > 0 && visibleUtrs.every(u => selectedUtrs.has(u));
                                                const newSelected = new Set(selectedUtrs);
                                                visibleUtrs.forEach(u => allVisibleSelected ? newSelected.delete(u) : newSelected.add(u));
                                                setSelectedUtrs(newSelected);
                                            }}
                                            className="text-[10px] font-black uppercase text-blue-600 hover:text-white hover:bg-blue-600 px-3 py-1.5 rounded-lg border border-blue-200 transition-all"
                                        >
                                            {filteredGroups.flatMap(g => g.accounts.map(a => a.utr)).length > 0 && filteredGroups.flatMap(g => g.accounts.map(a => a.utr)).every(u => selectedUtrs.has(u)) ? 'Deselect All Visible' : 'Select All Visible'}
                                        </button>
                                    </div>

                                    {bankGroups.length === 0 ? (
                                        <div className="py-16 text-center">
                                            <AlertTriangle className="mx-auto text-amber-300 mb-3" size={36} />
                                            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-6">No transaction data found. Upload a 1930 Excel to populate bank accounts.</p>
                                            <div className="relative inline-block">
                                                <input type="file" accept=".xlsx,.xls" onChange={handleUploadExcel} disabled={importing} className="absolute inset-0 opacity-0 cursor-pointer z-10 w-full h-full" />
                                                <Button variant="outline" className="border-blue-200 text-blue-600 hover:bg-blue-50 relative pointer-events-none" loading={importing} icon={Upload}>
                                                    {importing ? 'Processing File...' : 'Upload 1930 Excel'}
                                                </Button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                                            {filteredGroups.map(group => {
                                                const bankSelected = selectedBanks.has(group.name);
                                                const groupUtrs = group.accounts.map(a => a.utr);
                                                const allUtrsSelected = groupUtrs.length > 0 && groupUtrs.every(u => selectedUtrs.has(u));
                                                const isExpanded = expandedBanks.has(group.name);

                                                return (
                                                    <div key={group.name} className={`border-2 rounded-2xl overflow-hidden transition-all ${bankSelected ? 'border-blue-200' : 'border-slate-100'}`}>
                                                        {/* Bank Header */}
                                                        <div className={`flex items-center justify-between p-4 cursor-pointer transition-colors ${bankSelected ? 'bg-blue-50/50 hover:bg-blue-100/50' : 'bg-slate-50 hover:bg-slate-100'}`}
                                                            onClick={() => toggleExpand(group.name)}>
                                                            <div className="flex items-center gap-4">
                                                                <div 
                                                                    onClick={(e) => { e.stopPropagation(); toggleBank(group.name); }}
                                                                    className="p-1 hover:bg-blue-100 rounded cursor-pointer transition-colors"
                                                                >
                                                                    {bankSelected ? <CheckSquare className="text-blue-600" size={18} /> : <Square className="text-slate-300" size={18} />}
                                                                </div>
                                                                <Building2 className={bankSelected ? 'text-blue-600' : 'text-slate-400'} size={20} />
                                                                <div>
                                                                    <p className="text-sm font-black text-slate-900 uppercase">{group.name}</p>
                                                                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                                                                        {group.accounts.length} visible accounts
                                                                    </p>
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center gap-4">
                                                                {bankSelected && (
                                                                    <button onClick={e => { e.stopPropagation(); toggleAllInBank(group); }}
                                                                        className="text-[9px] font-black uppercase text-blue-600 hover:text-white hover:bg-blue-600 px-3 py-1.5 bg-white rounded-lg border border-blue-100 transition-colors shadow-sm">
                                                                        {allUtrsSelected ? 'Deselect Bank' : 'Select Bank'}
                                                                    </button>
                                                                )}
                                                                <div className="text-slate-400 p-1">
                                                                    {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                                                                </div>
                                                            </div>
                                                        </div>
                                                        
                                                        {/* Account rows (Collapsible) */}
                                                        <AnimatePresence>
                                                            {isExpanded && bankSelected && (
                                                                <motion.div 
                                                                    initial={{ height: 0, opacity: 0 }}
                                                                    animate={{ height: 'auto', opacity: 1 }}
                                                                    exit={{ height: 0, opacity: 0 }}
                                                                    className="divide-y divide-slate-50 bg-white"
                                                                >
                                                                    {group.accounts.map(acc => (
                                                                        <div key={acc.utr}
                                                                            onClick={() => toggleUtr(acc.utr)}
                                                                            className="flex items-center justify-between px-6 py-3 hover:bg-blue-50/50 cursor-pointer transition-all">
                                                                            <div className="flex items-center gap-4">
                                                                                {selectedUtrs.has(acc.utr)
                                                                                    ? <CheckSquare className="text-blue-600 flex-shrink-0" size={14} />
                                                                                    : <Square className="text-slate-200 flex-shrink-0" size={14} />}
                                                                                <div>
                                                                                    <span className="text-xs font-bold text-slate-700 block">{acc.account || 'N/A'}</span>
                                                                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-0.5 block">
                                                                                        Layer {acc.layer}
                                                                                    </span>
                                                                                </div>
                                                                            </div>
                                                                            <div className="flex items-center gap-6 text-right">
                                                                                <span className="text-[10px] text-slate-400 font-mono">UTR: {acc.utr || 'N/A'}</span>
                                                                                <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md border border-emerald-100">
                                                                                    ₹{parseFloat(acc.amount || 0).toLocaleString()}
                                                                                </span>
                                                                            </div>
                                                                        </div>
                                                                    ))}
                                                                </motion.div>
                                                            )}
                                                        </AnimatePresence>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}

                                    <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                                        <button onClick={() => setStep('type')} className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase hover:text-blue-600 transition-colors">
                                            <ChevronLeft size={14} /> Back
                                        </button>
                                        <div className="flex gap-3">
                                            <div className="text-right mr-4">
                                                <p className="text-[10px] font-black text-slate-400 uppercase">Notice Type</p>
                                                <p className="text-xs font-bold text-slate-700">{selectedType?.replace(/_/g, ' ')}</p>
                                            </div>
                                            <Button variant="primary" disabled={totalSelected === 0}
                                                icon={Send} onClick={handlePreview} className="px-10 shadow-lg shadow-blue-200">
                                                Preview Notice(s)
                                            </Button>
                                        </div>
                                    </div>
                                </motion.div>
                            )}

                            {activeTab === 'wizard' && step === 'preview' && (
                                <motion.div key="preview" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} className="p-8 space-y-6">
                                    <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                                        <div className="flex items-center gap-3">
                                            <button onClick={() => setStep('entities')} className="hover:text-blue-600 transition-colors flex items-center gap-1 text-[11px] font-black tracking-widest text-slate-400 uppercase bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
                                                <ChevronLeft size={14} /> Back
                                            </button>
                                            <ChevronRight className="text-slate-300" size={14} />
                                            <h3 className="text-base font-bold text-slate-900 uppercase">Step 4 — Editable Preview</h3>
                                        </div>
                                    </div>

                                    <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5 flex gap-4">
                                        <AlertTriangle className="text-blue-500 flex-shrink-0 mt-0.5" size={18} />
                                        <div>
                                            <p className="text-xs font-black text-blue-700 uppercase mb-1">Individual Bank Previews</p>
                                            <p className="text-[11px] text-slate-600">Review and edit the generated notice for each bank below. Variables like {'{DISPATCH_NO}'} and {'{DATE}'} will be automatically assigned upon final generation.</p>
                                        </div>
                                    </div>

                                    {/* Toolbar */}
                                    <div className="bg-slate-900 rounded-xl border border-slate-800 p-2 flex flex-wrap items-center justify-center gap-4 shadow-xl">
                                        <div className="flex items-center gap-1 bg-white/5 p-1 rounded-lg border border-white/10 shadow-inner">
                                            <button onMouseDown={(e) => { e.preventDefault(); formatText('bold'); }} className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded transition-all" title="Bold"><Bold size={14} /></button>
                                            <button onMouseDown={(e) => { e.preventDefault(); formatText('italic'); }} className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded transition-all" title="Italic"><Italic size={14} /></button>
                                            <button onMouseDown={(e) => { e.preventDefault(); formatText('underline'); }} className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded transition-all" title="Underline"><Underline size={14} /></button>
                                        </div>
                                        <div className="flex items-center gap-1 bg-white/5 p-1 rounded-lg border border-white/10 shadow-inner">
                                            <button onMouseDown={(e) => { e.preventDefault(); formatText('justifyLeft'); }} className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded transition-all" title="Align Left"><AlignLeft size={14} /></button>
                                            <button onMouseDown={(e) => { e.preventDefault(); formatText('justifyCenter'); }} className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded transition-all" title="Align Center"><AlignCenter size={14} /></button>
                                            <button onMouseDown={(e) => { e.preventDefault(); formatText('justifyRight'); }} className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded transition-all" title="Align Right"><AlignRight size={14} /></button>
                                        </div>
                                        <div className="flex items-center gap-1 bg-white/5 p-1 rounded-lg border border-white/10 shadow-inner">
                                            <button onMouseDown={(e) => { e.preventDefault(); formatText('insertUnorderedList'); }} className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded transition-all" title="List"><List size={14} /></button>
                                        </div>
                                        <div className="flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-lg border border-white/10 shadow-inner">
                                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest italic">Size</span>
                                            <select 
                                                onChange={(e) => applyFontSize(e.target.value)}
                                                className="bg-transparent text-emerald-400 text-[11px] font-black outline-none cursor-pointer w-14"
                                                defaultValue="14"
                                            >
                                                {[8, 9, 10, 11, 12, 14, 16, 18, 20, 24, 28, 36].map(size => (
                                                    <option key={size} value={size}>{size}px</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>

                                    <div className="space-y-8 max-h-[65vh] overflow-y-auto custom-scrollbar bg-slate-800 p-8 rounded-2xl border border-slate-700 inset-shadow-sm">
                                        {previewBanks.map((b, idx) => (
                                            <div key={idx} className="flex flex-col items-center">
                                                <div className="bg-slate-900/50 backdrop-blur-md text-slate-300 text-[10px] font-black uppercase tracking-[0.2em] px-6 py-2 rounded-full mb-6 border border-slate-700 shadow-lg">
                                                    NOTICE {idx + 1} OF {previewBanks.length} — {b.name}
                                                </div>
                                                <div className="bg-white shadow-2xl rounded-sm w-[210mm] overflow-hidden transform-gpu hover:scale-[1.01] transition-transform duration-300">
                                                    <div 
                                                        className="min-h-[297mm] p-[20mm] outline-none prose prose-sm max-w-none prose-slate text-[14px]"
                                                        contentEditable
                                                        suppressContentEditableWarning
                                                        onBlur={(e) => {
                                                            const newBanks = [...previewBanks];
                                                            newBanks[idx].content = e.currentTarget.innerHTML;
                                                            setPreviewBanks(newBanks);
                                                        }}
                                                        dangerouslySetInnerHTML={{ __html: b.content }}
                                                    />
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="flex items-center justify-end pt-4 border-t border-slate-100">
                                        <Button variant="primary" loading={generating} disabled={generating}
                                            icon={Send} onClick={handleGenerate} className="px-10 shadow-lg shadow-blue-200">
                                            Final Generate {previewBanks.length} Notice(s)
                                        </Button>
                                    </div>
                                </motion.div>
                            )}

                            {activeTab === 'wizard' && step === 'done' && (
                                <motion.div key="done" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="p-8 space-y-6">
                                    <div className="text-center py-8">
                                        <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-6 border-2 border-emerald-100">
                                            <CheckCircle2 className="text-emerald-600" size={40} />
                                        </div>
                                        <h3 className="text-2xl font-black text-slate-900 uppercase mb-2">Notices Generated</h3>
                                        <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">{generated.length} dispatch record(s) sealed in dossier</p>
                                    </div>
                                    <div className="space-y-3">
                                        {generated.map(g => (
                                            <div key={g.dispatch_no} 
                                                 className="flex items-center justify-between p-4 bg-emerald-50 border border-emerald-100 rounded-2xl cursor-pointer hover:bg-emerald-100 transition-colors"
                                                 onClick={() => setSelectedNoticeHtml(g.notice_content)}>
                                                <div>
                                                    <p className="text-[10px] font-black text-slate-400 uppercase">Dispatch No.</p>
                                                    <p className="font-mono font-black text-blue-700 text-sm">{g.dispatch_no}</p>
                                                </div>
                                                <div className="text-right flex items-center gap-4">
                                                    <div>
                                                        <p className="text-[10px] font-black text-slate-400 uppercase">Bank</p>
                                                        <p className="text-sm font-bold text-slate-900">{g.bank_name}</p>
                                                    </div>
                                                    <Button variant="ghost" className="h-10 w-10 p-0 rounded-full bg-white border border-emerald-200" onClick={(e) => {
                                                        e.stopPropagation();
                                                        const printWindow = window.open('', '_blank');
                                                        printWindow.document.write(`<html><head><title>${g.dispatch_no}</title></head><body style="margin:0;padding:20mm;">` + g.notice_content + '</body></html>');
                                                        printWindow.document.close();
                                                        setTimeout(() => { printWindow.print(); }, 500);
                                                    }}>
                                                        <Printer size={16} className="text-emerald-600" />
                                                    </Button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5 flex gap-4">
                                        <AlertTriangle className="text-blue-500 flex-shrink-0 mt-0.5" size={18} />
                                        <div>
                                            <p className="text-xs font-black text-blue-700 uppercase mb-1">Check Dispatch Register</p>
                                            <p className="text-[11px] text-slate-600">The notices have been successfully generated and saved to the Dispatch Register. You can view or print them from there.</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-3 justify-end">
                                        <Button variant="outline" className="border-slate-200 text-slate-700" onClick={() => {
                                            const printWindow = window.open('', '_blank');
                                            printWindow.document.write('<html><head><title>Bulk Print Notices</title></head><body style="margin:0;padding:0;">');
                                            generated.forEach((g, index) => {
                                                printWindow.document.write(`<div style="padding:20mm; page-break-after: always;">${g.notice_content}</div>`);
                                            });
                                            printWindow.document.write('</body></html>');
                                            printWindow.document.close();
                                            setTimeout(() => { printWindow.print(); }, 500);
                                        }}>
                                            <Printer size={16} className="mr-2" /> Bulk Print {generated.length} Notices
                                        </Button>
                                        <Button variant="outline" className="border-blue-200 text-blue-700 bg-blue-50" icon={FileText}
                                            onClick={() => setActiveTab('register')}>
                                            View Dispatch Register
                                        </Button>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </Card>
            </motion.div>

            {/* Document Viewer Modal */}
            <AnimatePresence>
                {selectedNoticeHtml && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[1000] flex items-center justify-center p-6 bg-slate-900/80 backdrop-blur-sm"
                    >
                        <motion.div
                            initial={{ scale: 0.95, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.95, y: 20 }}
                            className="bg-slate-100 w-full max-w-4xl max-h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden"
                        >
                            <div className="bg-white px-6 py-4 border-b border-slate-200 flex items-center justify-between shadow-sm z-10">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center">
                                        <FileText className="text-blue-600" size={16} />
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-black text-slate-900 uppercase">Document Viewer</h3>
                                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Official Dispatch Record</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Button variant="primary" icon={Send} onClick={() => {
                                        const printWindow = window.open('', '_blank');
                                        printWindow.document.write('<html><head><title>Print Notice</title></head><body style="padding:40px;">' + selectedNoticeHtml + '</body></html>');
                                        printWindow.document.close();
                                        setTimeout(() => { printWindow.print(); }, 500);
                                    }}>
                                        Print Document
                                    </Button>
                                    <button onClick={() => setSelectedNoticeHtml(null)} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-full transition-all">
                                        <X size={20} />
                                    </button>
                                </div>
                            </div>
                            <div className="flex-1 overflow-y-auto p-8 bg-slate-100 flex justify-center custom-scrollbar">
                                <div 
                                    className="bg-white shadow-md w-full max-w-[800px] min-h-[1100px] prose prose-sm max-w-none prose-slate"
                                    dangerouslySetInnerHTML={{ __html: selectedNoticeHtml }}
                                />
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
