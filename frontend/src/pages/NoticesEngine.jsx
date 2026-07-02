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
    Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight, List, ImageIcon, Printer, Download,
    Mail, Check, Users, XCircle
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

export default function NoticesEngine({ caseId, caseData, onClose, initialTab = 'wizard' }) {
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
    const [activeTab, setActiveTab] = useState(initialTab); // wizard | register

    // Email Blast State
    const [showEmailModal, setShowEmailModal] = useState(false);
    const [fetchingRecipients, setFetchingRecipients] = useState(false);
    const [emailRecipients, setEmailRecipients] = useState([]);
    const [selectedRecipients, setSelectedRecipients] = useState(new Set());
    const [missionReport, setMissionReport] = useState(null);
    const [statusOverlay, setStatusOverlay] = useState({ show: false, type: 'success', title: '', message: '' });
    const [isSendingEmails, setIsSendingEmails] = useState(false);
    const [completionRemarks, setCompletionRemarks] = useState('');
    const [genModal, setGenModal] = useState({ show: false, total: 0, generated: 0, remaining: 0, currentBank: '', isComplete: false });
    const [mailModal, setMailModal] = useState({ show: false, total: 0, sent: 0, remaining: 0, currentBank: '', isComplete: false });
    const [selectedMailTemplateId, setSelectedMailTemplateId] = useState('');

    useEffect(() => {
        if (initialTab) setActiveTab(initialTab);
    }, [initialTab]);

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
        
        // Show modal immediately so user knows something is happening
        setGenModal({
            show: true,
            total: previewBanks.length,
            generated: 0,
            remaining: previewBanks.length,
            currentBank: 'Saving notices to database...',
            isComplete: false
        });

        try {
            // 1. Generate notices in database to get dispatch numbers
            const res = await api.post('/notices/generate', {
                case_id: caseId,
                notice_category: selectedCategory,
                notice_type_code: selectedType,
                banks: previewBanks
            });
            
            if (res.data.success) {
                const newlyGenerated = res.data.data;
                setGenerated(newlyGenerated);

                // 2. Convert all generated HTML notices into PDF and upload to uploads/notices/{case_id}/
                const { convertHtmlToPdfBlob, wrapHtmlInContainer } = await import('../services/letterGenerator');

                let completedCount = 0;
                const totalCount = newlyGenerated.length;
                
                // Update modal with actual counts
                setGenModal(prev => ({
                    ...prev,
                    total: totalCount,
                    remaining: totalCount,
                    currentBank: newlyGenerated[0]?.bank_name || 'Initializing PDF Engine...'
                }));

                for (const g of newlyGenerated) {
                    // Update current bank processing state
                    setGenModal(prev => ({ ...prev, currentBank: g.bank_name }));

                    // V.V. IMP: Yield the main thread for 150ms so React can actually render the overlay 
                    // and browser can run Garbage Collection before the heavy canvas operation!
                    await new Promise(r => setTimeout(r, 150));

                    try {
                        const finalHtml = g.notice_content.includes('letter-print-container') 
                            ? g.notice_content 
                            : wrapHtmlInContainer(g.notice_content, {top:50, left:50, right:50, bottom:50});

                        const pdfBlob = await convertHtmlToPdfBlob(finalHtml);
                        const pdfBase64 = await new Promise((resolve) => {
                            const reader = new FileReader();
                            reader.onloadend = () => resolve(reader.result);
                            reader.readAsDataURL(pdfBlob);
                        });
                        
                        await api.post('/cases/save-notice', { 
                            case_id: caseId, 
                            bank_name: g.bank_name, 
                            pdf_base64: pdfBase64,
                            version_mode: 'increment',
                            notice_category: selectedCategory
                        });
                    } catch (canvasErr) {
                        console.error('Failed to generate PDF for: ', g.bank_name, canvasErr);
                    }
                    
                    
                    completedCount++;
                    
                    setGenModal(prev => ({
                        ...prev,
                        generated: completedCount,
                        remaining: totalCount - completedCount
                    }));
                }

                setGenModal(prev => ({ 
                    ...prev, 
                    isComplete: true, 
                    currentBank: 'All Notices Generated Successfully' 
                }));
                
                await fetchDispatch();
                setStep('done');
            }
        } catch (err) {
            setGenModal(prev => ({ ...prev, show: false }));
            setStatusOverlay({ show: true, type: 'error', title: 'Generation Failed', message: err.response?.data?.message || err.message });
            setTimeout(() => setStatusOverlay({ show: false, type: '', title: '', message: '' }), 3000);
        } finally {
            setGenerating(false);
        }
    };

    const handleOpenEmailModal = async () => {
        try {
            setFetchingRecipients(true);
            setMissionReport(null);
            setStatusOverlay({ show: true, type: 'success', title: 'Initializing Mission', message: 'Fetching secure Nodal Officer endpoints...' });

            const res = await api.get(`/cases/${caseId}/nodal-recipients?category=${selectedCategory}`);
            if (res.data.success) {
                setEmailRecipients(res.data.data);
                const valid = res.data.data.filter(r => r.email).map(r => r.bankname);
                setSelectedRecipients(new Set(valid));
                const mailTemplates = templates.filter(t => t.template_type === 'Mail');
                if (mailTemplates.length > 0 && !selectedMailTemplateId) {
                    setSelectedMailTemplateId(mailTemplates[0].template_id.toString());
                }
                setShowEmailModal(true);
                setStatusOverlay({ show: false, type: 'success', title: '', message: '' });
            }
        } catch (error) {
            console.error('Error fetching nodal endpoints:', error);
            setStatusOverlay({ show: true, type: 'error', title: 'Network Failure', message: 'Failed to retrieve Nodal Officer registry.' });
            setTimeout(() => setStatusOverlay({ show: false, type: '', title: '', message: '' }), 3000);
        } finally {
            setFetchingRecipients(false);
        }
    };

    const handleSendEmails = async () => {
        const toSend = emailRecipients.filter(r => selectedRecipients.has(r.bankname));
        if (toSend.length === 0) {
            alert('Please select at least one recipient');
            return;
        }

        setIsSendingEmails(true);
        const totalCount = toSend.length;
        let completedCount = 0;
        let succeeded = [];
        let failed = [];

        setMailModal({
            show: true,
            total: totalCount,
            sent: 0,
            remaining: totalCount,
            currentBank: toSend[0]?.bankname || 'Initializing Dispatch...',
            isComplete: false
        });

        try {
            const now = new Date();
            const year = now.getFullYear();

            for (const recipient of toSend) {
                setMailModal(prev => ({ ...prev, currentBank: recipient.bankname }));

                try {
                    const mailTemplate = templates.find(t => t.template_id.toString() === selectedMailTemplateId.toString()) || templates.find(t => t.template_type === 'Mail');
                    const defaultSubject = 'NOTICE UNDER SECTION 94/106 BNSS 2023 - ' + recipient.bankname + ' [CASE ID: ' + caseId + ']';
                    const defaultBody = `Respected Nodal Officer,\n\nPlease find attached the legal notice under section 94/106 BNSS 2023 regarding Case ID: ${caseId}.\n\nYou are requested to take immediate action as per the instructions in the attached document.\n\nRegards,\nInvestigation Officer\nCyber Crime Police Station`;

                    const payload = {
                        recipients: [recipient],
                        subject: mailTemplate?.subject_text || defaultSubject,
                        body: mailTemplate?.body_text || defaultBody
                    };

                    const res = await api.post(`/cases/${caseId}/send-nodal-emails`, payload);
                    
                    if (res.data.success && res.data.data[0]?.success) {
                        const item = res.data.data[0];
                        succeeded.push(item);
                        
                        const g = generated.find(gn => gn.bank_name === item.bankname);
                        const ref = g ? g.dispatch_no : `CYB/${year}/${caseId}/N/A`;
                        const individualNote = `[NOTICE DISPATCHED] Bank: ${item.bankname} | Ref: ${ref} | Status: Sent to ${item.email || 'Nodal Registry'}`;
                        try {
                            await api.post(`/cases/${caseId}/notes`, { note_text: individualNote });
                        } catch (e) {}
                    } else {
                        const item = res.data.data?.[0] || { bankname: recipient.bankname, success: false, error: 'Dispatch Failed' };
                        failed.push(item);
                    }
                } catch (err) {
                    failed.push({ bankname: recipient.bankname, success: false, error: err.message });
                }

                completedCount++;
                setMailModal(prev => ({
                    ...prev,
                    sent: completedCount,
                    remaining: totalCount - completedCount
                }));
            }

            if (failed.length > 0) {
                const failNote = `[MAIL BLAST FAILURE ALERT] - ${new Date().toLocaleString()}\nFailed Targets: ${failed.map(r => `${r.bankname} (Error: ${r.error || 'Connection Refused'})`).join(', ')}`;
                try {
                    await api.post(`/cases/${caseId}/notes`, { note_text: failNote });
                } catch (e) {}
            }

            setMissionReport({
                succeeded: succeeded.length,
                failed: failed.length,
                details: [...succeeded, ...failed].map(item => {
                    const g = generated.find(gn => gn.bank_name === item.bankname);
                    return {
                        ...item,
                        accounts: item.success ? 'Secure Dispatch' : 'Failed Dispatch',
                        ref: g ? g.dispatch_no : `CYB/${year}/${caseId}/N/A`
                    };
                }),
                timestamp: new Date().toLocaleTimeString()
            });

            setMailModal(prev => ({
                ...prev,
                isComplete: true,
                currentBank: 'All Dispatches Completed Successfully'
            }));

        } catch (err) {
            setMailModal(prev => ({ ...prev, show: false }));
            setStatusOverlay({ show: true, type: 'error', title: 'Mission Aborted', message: 'Batch mailing failed: ' + err.message });
        } finally {
            setIsSendingEmails(false);
        }
    };

    const toggleRecipient = (bankName) => {
        const next = new Set(selectedRecipients);
        next.has(bankName) ? next.delete(bankName) : next.add(bankName);
        setSelectedRecipients(next);
    };

    const toggleSelectAll = () => {
        const validRecipients = emailRecipients.filter(r => r.email);
        if (selectedRecipients.size === validRecipients.length) {
            setSelectedRecipients(new Set());
        } else {
            setSelectedRecipients(new Set(validRecipients.map(r => r.bankname)));
        }
    };

    const handleCompleteMission = async () => {
        if (completionRemarks.trim()) {
            try {
                await api.post(`/cases/${caseId}/notes`, { note_text: `[OPERATION FINALIZED] ${completionRemarks}` });
            } catch (err) {}
        }
        onClose();
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
                                <motion.div key="done" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center justify-center py-16 px-8 max-w-xl mx-auto space-y-8">
                                    <div className="w-24 h-24 bg-emerald-50 rounded-full flex items-center justify-center shadow-[0_0_40px_rgba(16,185,129,0.2)]">
                                        <Send className="text-emerald-500 transform translate-x-1 -translate-y-1" size={48} />
                                    </div>
                                    <div className="text-center space-y-4">
                                        <h2 className="text-4xl font-black italic tracking-tighter">
                                            <span className="text-slate-900">OPERATION </span>
                                            <span className="text-emerald-500">FINALIZED</span>
                                        </h2>
                                        <p className="text-sm font-bold text-slate-500 italic leading-relaxed">
                                            All forensic warrants have been verified and sealed in the evidence repository. The dossier is ready for digital dispatch or physical printing.
                                        </p>
                                    </div>
                                    
                                    <div className="w-full space-y-2 text-left">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Completion Remarks / Origin Log</label>
                                        <textarea
                                            value={completionRemarks}
                                            onChange={e => setCompletionRemarks(e.target.value)}
                                            placeholder="Enter operational log remarks here..."
                                            className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 text-sm font-medium text-slate-700 placeholder:text-slate-300 focus:outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all min-h-[120px] resize-none"
                                        />
                                    </div>

                                    <div className="flex items-center gap-4 w-full">
                                        <Button 
                                            variant="outline" 
                                            icon={Mail} 
                                            className="flex-1 py-4 border-slate-200 text-slate-700 hover:bg-slate-50 tracking-widest text-[11px] font-black h-auto"
                                            onClick={handleOpenEmailModal}
                                        >
                                            NODAL EMAIL BLAST
                                        </Button>
                                        <Button 
                                            variant="primary" 
                                            icon={CheckCircle2} 
                                            className="flex-1 py-4 bg-blue-600 hover:bg-blue-700 shadow-xl shadow-blue-600/20 tracking-widest text-[11px] font-black border-none h-auto"
                                            onClick={handleCompleteMission}
                                        >
                                            COMPLETE MISSION
                                        </Button>
                                    </div>

                                    <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.4em] italic pt-8">
                                        V2.4 SECURE_NODE ENCRYPTED SIGNAL
                                    </p>
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
            {/* Email Blast Modal */}
            <AnimatePresence>
                {showEmailModal && (
                    <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
                        <motion.div 
                            initial={{ opacity: 0 }} 
                            animate={{ opacity: 1 }} 
                            exit={{ opacity: 0 }} 
                            onClick={() => setShowEmailModal(false)} 
                            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" 
                        />
                        <motion.div 
                            initial={{ scale: 0.95, opacity: 0, y: 20 }} 
                            animate={{ scale: 1, opacity: 1, y: 0 }} 
                            exit={{ scale: 0.95, opacity: 0, y: 20 }} 
                            className="bg-white/95 backdrop-blur-xl w-full max-w-3xl max-h-[85vh] rounded-[32px] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.2)] relative z-10 flex flex-col overflow-hidden border border-white" 
                        >
                            {/* Tactical Header */}
                            <div className="p-8 bg-gradient-to-r from-slate-900 to-slate-800 flex justify-between items-center flex-shrink-0 relative overflow-hidden">
                                <div className="absolute inset-0 opacity-10 pointer-events-none">
                                    <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '24px 24px' }}></div>
                                </div>
                                <div className="flex items-center gap-5 relative z-10">
                                    <div className="p-4 bg-blue-500 rounded-2xl text-white shadow-[0_0_20px_rgba(59,130,246,0.5)]">
                                        <Send size={28} className="animate-pulse" />
                                    </div>
                                    <div>
                                        <h3 className="text-2xl font-black text-white uppercase tracking-tight italic">Nodal <span className="text-blue-400">Blast Protocol</span></h3>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-ping"></span>
                                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em]">Target Identification & Verification Active</p>
                                        </div>
                                    </div>
                                </div>
                                <button onClick={() => setShowEmailModal(false)} className="p-3 text-slate-400 hover:text-white hover:bg-white/10 rounded-2xl transition-all relative z-10">
                                    <X size={24} />
                                </button>
                            </div>
                            <div className="p-10 overflow-y-auto flex-1 space-y-6 custom-scrollbar bg-slate-50/30">
                                {missionReport ? (
                                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-5 duration-500">
                                        <div className="bg-white p-10 rounded-[40px] border-2 border-slate-100 shadow-xl shadow-slate-200/50 text-center relative overflow-hidden">
                                            <div className={`absolute top-0 left-0 w-full h-2 ${missionReport.failed === 0 ? 'bg-emerald-500' : 'bg-amber-500'}`}></div>
                                            <div className={`w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 ${missionReport.failed === 0 ? 'bg-emerald-50 text-emerald-500' : 'bg-amber-50 text-amber-500'}`}>
                                                {missionReport.failed === 0 ? <CheckCircle2 size={56} /> : <AlertTriangle size={56} />}
                                            </div>
                                            <h3 className="text-3xl font-black text-slate-900 uppercase italic tracking-tighter">Forensic Mission <span className={missionReport.failed === 0 ? 'text-emerald-600' : 'text-amber-600'}>Completed</span></h3>
                                            <p className="text-xs text-slate-400 font-bold uppercase tracking-[0.3em] mt-2">Dossier Intelligence Dispatch Log // {missionReport.timestamp}</p>
                                            
                                            <div className="grid grid-cols-2 gap-4 mt-10">
                                                <div className="bg-slate-50 p-6 rounded-[32px] border border-slate-100">
                                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Succeeded</p>
                                                    <p className="text-4xl font-black text-emerald-600 mt-1">{missionReport.succeeded}</p>
                                                </div>
                                                <div className="bg-slate-50 p-6 rounded-[32px] border border-slate-100">
                                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Failures</p>
                                                    <p className={`text-4xl font-black mt-1 ${missionReport.failed > 0 ? 'text-rose-600' : 'text-slate-300'}`}>{missionReport.failed}</p>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-3">
                                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] ml-4">Detailed Dispatch Dossier</h4>
                                            {missionReport.details.map((item, i) => (
                                                <div key={i} className="bg-white p-6 rounded-[32px] border border-slate-100 flex items-center justify-between shadow-sm hover:shadow-md transition-all">
                                                    <div className="flex items-center gap-5">
                                                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-white font-black text-xl shadow-lg ${item.success ? 'bg-emerald-500 shadow-emerald-100' : 'bg-rose-500 shadow-rose-100'}`}>
                                                            {item.bankname[0]}
                                                        </div>
                                                        <div>
                                                            <div className="flex items-center gap-3">
                                                                <p className="text-base font-black text-slate-900">{item.bankname}</p>
                                                                <span className={`px-3 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest ${item.success ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                                                                    {item.success ? 'SECURE_SENT' : 'DISPATCH_ERROR'}
                                                                </span>
                                                            </div>
                                                            <p className="text-[10px] text-slate-400 font-bold uppercase mt-1 tracking-tight">{item.ref}</p>
                                                            <p className="text-[11px] text-blue-600 font-black uppercase mt-0.5">{item.email || 'Nodal Endpoint'}</p>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-[10px] font-black text-slate-400 uppercase leading-none">Status</p>
                                                        <p className="text-sm font-black text-slate-900 mt-1">{item.accounts}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ) : emailRecipients.length === 0 ? (
                                    <div className="text-center py-20 bg-white rounded-[32px] border-2 border-dashed border-slate-200">
                                        <div className="w-20 h-20 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-6">
                                            <AlertTriangle className="text-amber-500" size={40} />
                                        </div>
                                        <h4 className="text-lg font-black text-slate-900 uppercase italic">No Field Artifacts Detected</h4>
                                        <p className="text-sm text-slate-500 mt-2 max-w-xs mx-auto">Please ensure notices were successfully generated before dispatch.</p>
                                    </div>
                                ) : (
                                    <>
                                        <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm mb-4">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Select Mail Dispatch Template</label>
                                            <select 
                                                value={selectedMailTemplateId}
                                                onChange={(e) => setSelectedMailTemplateId(e.target.value)}
                                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 outline-none focus:border-blue-500 transition-all shadow-inner"
                                            >
                                                <option value="">-- Default Fallback Notice --</option>
                                                {templates.filter(t => t.template_type === 'Mail').map(t => (
                                                    <option key={t.template_id} value={t.template_id}>{t.template_name}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="flex items-center justify-between p-1 bg-white border border-slate-200 rounded-3xl shadow-sm sticky top-0 z-10">
                                            <div className="flex items-center gap-4 px-6 py-4 cursor-pointer group flex-1" onClick={toggleSelectAll}>
                                                <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${selectedRecipients.size === emailRecipients.filter(r => r.email).length ? 'bg-blue-600 border-blue-600' : 'border-slate-300 group-hover:border-blue-400'}`}>
                                                    {selectedRecipients.size === emailRecipients.filter(r => r.email).length && <Check size={14} className="text-white" strokeWidth={4} />}
                                                </div>
                                                <span className="text-xs font-black text-slate-700 uppercase tracking-wider">Select All Combatants</span>
                                            </div>
                                            <div className="px-6 py-4 bg-slate-50 rounded-2xl flex items-center gap-3">
                                                <div className="text-right">
                                                    <p className="text-[10px] font-black text-slate-400 uppercase leading-none">Selected</p>
                                                    <p className="text-xl font-black text-blue-600 leading-none mt-1">{selectedRecipients.size}</p>
                                                </div>
                                                <Users size={24} className="text-blue-600 opacity-20" />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 gap-4">
                                            {emailRecipients.map((rec, idx) => {
                                                const isSelected = selectedRecipients.has(rec.bankname);
                                                const hasEmail = !!rec.email;
                                                return (
                                                    <motion.div 
                                                        whileHover={{ x: 5 }}
                                                        key={idx} 
                                                        className={`p-6 border-2 rounded-[32px] flex items-center justify-between transition-all duration-300 group ${isSelected ? 'border-blue-500 bg-blue-50/30 shadow-lg shadow-blue-50' : 'border-white bg-white shadow-sm hover:border-slate-200'}`} 
                                                        onClick={() => toggleRecipient(rec.bankname)}
                                                    >
                                                        <div className="flex items-center gap-6">
                                                            <div className={`w-7 h-7 rounded-xl border-2 flex items-center justify-center transition-all ${isSelected ? 'bg-blue-600 border-blue-600 shadow-md shadow-blue-200' : 'border-slate-200'}`}>
                                                                {isSelected && <Check size={16} className="text-white" strokeWidth={4} />}
                                                            </div>
                                                            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-2xl transition-all shadow-sm ${isSelected ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
                                                                {rec.bankname[0]}
                                                            </div>
                                                            <div>
                                                                <h4 className="text-base font-black text-slate-900 tracking-tight">{rec.bankname}</h4>
                                                                <div className="flex items-center gap-2 mt-1">
                                                                    <div className={`w-2 h-2 rounded-full ${hasEmail ? 'bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]' : 'bg-rose-500'}`}></div>
                                                                    <p className={`text-[11px] font-bold tracking-tight uppercase ${hasEmail ? 'text-blue-600' : 'text-rose-500'}`}>{rec.email || 'Registry Link Broken'}</p>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="flex flex-col items-end gap-2">
                                                            <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider ${isSelected ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-500'}`}>
                                                                {rec.files.length} Notice{rec.files.length !== 1 ? 's' : ''}
                                                            </span>
                                                            <FileText size={16} className={isSelected ? 'text-blue-600 opacity-40' : 'text-slate-300'} />
                                                        </div>
                                                    </motion.div>
                                                );
                                            })}
                                        </div>
                                    </>
                                )}
                            </div>
                            <div className="p-8 bg-white border-t border-slate-100 flex gap-5 flex-shrink-0">
                                {missionReport ? (
                                    <button 
                                        onClick={() => setShowEmailModal(false)}
                                        className="flex-1 py-6 rounded-[32px] bg-slate-900 text-white flex items-center justify-center gap-4 text-sm font-black uppercase tracking-[0.4em] hover:bg-black transition-all shadow-2xl shadow-slate-300 hover:scale-[1.02] active:scale-95"
                                    >
                                        <XCircle size={20} />
                                        DISMISS MISSION REPORT
                                    </button>
                                ) : (
                                    <>
                                        <button 
                                            onClick={() => setShowEmailModal(false)}
                                            className="px-8 py-5 rounded-[24px] text-sm font-black text-slate-500 uppercase tracking-widest hover:bg-slate-100 transition-all border-2 border-transparent"
                                        >
                                            Cancel Mission
                                        </button>
                                        <button 
                                            onClick={handleSendEmails}
                                            disabled={isSendingEmails || selectedRecipients.size === 0}
                                            className={`flex-1 py-5 rounded-[24px] flex items-center justify-center gap-3 text-sm font-black uppercase tracking-[0.2em] transition-all shadow-2xl ${isSendingEmails || selectedRecipients.size === 0 ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'bg-blue-600 text-white shadow-blue-200 hover:scale-[1.02] active:scale-95'}`}
                                        >
                                            {isSendingEmails ? (
                                                <div className="flex items-center gap-3">
                                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                                    <span>Infiltrating Networks...</span>
                                                </div>
                                            ) : (
                                                <>
                                                    <Send size={18} />
                                                    <span>Execute Blast Mission</span>
                                                </>
                                            )}
                                        </button>
                                    </>
                                )}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Generation Progress Modal */}
            <AnimatePresence>
                {genModal.show && (
                    <div className="fixed inset-0 z-[400] flex items-center justify-center p-6">
                        <motion.div 
                            initial={{ opacity: 0 }} 
                            animate={{ opacity: 1 }} 
                            exit={{ opacity: 0 }} 
                            className="absolute inset-0 bg-slate-900/90 backdrop-blur-md" 
                        />
                        <motion.div 
                            initial={{ scale: 0.9, opacity: 0, y: 20 }} 
                            animate={{ scale: 1, opacity: 1, y: 0 }} 
                            exit={{ scale: 0.9, opacity: 0, y: 20 }} 
                            className="bg-white w-full max-w-lg rounded-[40px] p-10 relative z-10 shadow-2xl overflow-hidden border-4 border-slate-100"
                        >
                            <div className="text-center mb-8">
                                <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl transition-all duration-500 ${genModal.isComplete ? 'bg-emerald-500 shadow-emerald-200 text-white' : 'bg-blue-600 shadow-blue-200 text-white'}`}>
                                    {genModal.isComplete ? <CheckCircle2 size={40} /> : <div className="w-8 h-8 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>}
                                </div>
                                <h3 className="text-2xl font-black text-slate-900 uppercase italic tracking-tight">
                                    {genModal.isComplete ? 'Generation Complete' : 'Archiving Artifacts'}
                                </h3>
                                <p className="text-slate-400 font-bold mt-2 text-xs uppercase tracking-widest truncate px-4">
                                    {genModal.currentBank}
                                </p>
                            </div>

                            <div className="space-y-4">
                                <div className="bg-slate-50 p-6 rounded-[24px] border border-slate-100 flex items-center justify-between">
                                    <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Total Notices</span>
                                    <span className="text-xl font-black text-slate-900">{genModal.total}</span>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-blue-50 p-6 rounded-[24px] border border-blue-100 text-center">
                                        <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest block mb-1">Generated</span>
                                        <span className="text-3xl font-black text-blue-600">{genModal.generated}</span>
                                    </div>
                                    <div className="bg-amber-50 p-6 rounded-[24px] border border-amber-100 text-center">
                                        <span className="text-[10px] font-black text-amber-400 uppercase tracking-widest block mb-1">Remaining</span>
                                        <span className="text-3xl font-black text-amber-600">{genModal.remaining}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-8">
                                <div className="h-3 bg-slate-100 rounded-full overflow-hidden mb-8">
                                    <div 
                                        className={`h-full transition-all duration-300 ease-out ${genModal.isComplete ? 'bg-emerald-500' : 'bg-blue-600'}`}
                                        style={{ width: `${(genModal.generated / Math.max(1, genModal.total)) * 100}%` }}
                                    ></div>
                                </div>

                                {genModal.isComplete ? (
                                    <button 
                                        onClick={() => setGenModal({ ...genModal, show: false })}
                                        className="w-full py-5 bg-emerald-500 text-white rounded-[24px] text-sm font-black uppercase tracking-[0.2em] hover:bg-emerald-600 transition-all shadow-xl shadow-emerald-200"
                                    >
                                        Complete
                                    </button>
                                ) : (
                                    <button 
                                        disabled
                                        className="w-full py-5 bg-slate-100 text-slate-400 rounded-[24px] text-sm font-black uppercase tracking-[0.2em] cursor-not-allowed flex items-center justify-center gap-3"
                                    >
                                        <div className="w-4 h-4 border-2 border-slate-300 border-t-slate-500 rounded-full animate-spin"></div>
                                        Please Wait...
                                    </button>
                                )}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Email Dispatch Progress Modal */}
            <AnimatePresence>
                {mailModal.show && (
                    <div className="fixed inset-0 z-[500] flex items-center justify-center p-6">
                        <motion.div 
                            initial={{ opacity: 0 }} 
                            animate={{ opacity: 1 }} 
                            exit={{ opacity: 0 }} 
                            className="absolute inset-0 bg-slate-900/90 backdrop-blur-md" 
                        />
                        <motion.div 
                            initial={{ scale: 0.9, opacity: 0, y: 20 }} 
                            animate={{ scale: 1, opacity: 1, y: 0 }} 
                            exit={{ scale: 0.9, opacity: 0, y: 20 }} 
                            className="bg-white w-full max-w-lg rounded-[40px] p-10 relative z-10 shadow-2xl overflow-hidden border-4 border-slate-100"
                        >
                            <div className="text-center mb-8">
                                <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl transition-all duration-500 ${mailModal.isComplete ? 'bg-emerald-500 shadow-emerald-200 text-white' : 'bg-blue-600 shadow-blue-200 text-white'}`}>
                                    {mailModal.isComplete ? <CheckCircle2 size={40} /> : <div className="w-8 h-8 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>}
                                </div>
                                <h3 className="text-2xl font-black text-slate-900 uppercase italic tracking-tight">
                                    {mailModal.isComplete ? 'Blast Complete' : 'Dispatching Notices'}
                                </h3>
                                <p className="text-slate-400 font-bold mt-2 text-xs uppercase tracking-widest truncate px-4">
                                    {mailModal.currentBank}
                                </p>
                            </div>

                            <div className="space-y-4">
                                <div className="bg-slate-50 p-6 rounded-[24px] border border-slate-100 flex items-center justify-between">
                                    <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Total Notices</span>
                                    <span className="text-xl font-black text-slate-900">{mailModal.total}</span>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-blue-50 p-6 rounded-[24px] border border-blue-100 text-center">
                                        <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest block mb-1">Send Mail</span>
                                        <span className="text-3xl font-black text-blue-600">{mailModal.sent}</span>
                                    </div>
                                    <div className="bg-amber-50 p-6 rounded-[24px] border border-amber-100 text-center">
                                        <span className="text-[10px] font-black text-amber-400 uppercase tracking-widest block mb-1">Remaining</span>
                                        <span className="text-3xl font-black text-amber-600">{mailModal.remaining}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-8">
                                <div className="h-3 bg-slate-100 rounded-full overflow-hidden mb-8">
                                    <div 
                                        className={`h-full transition-all duration-300 ease-out ${mailModal.isComplete ? 'bg-emerald-500' : 'bg-blue-600'}`}
                                        style={{ width: `${(mailModal.sent / Math.max(1, mailModal.total)) * 100}%` }}
                                    ></div>
                                </div>

                                {mailModal.isComplete ? (
                                    <button 
                                        onClick={() => { setMailModal({ ...mailModal, show: false }); setShowEmailModal(false); }}
                                        className="w-full py-5 bg-emerald-500 text-white rounded-[24px] text-sm font-black uppercase tracking-[0.2em] hover:bg-emerald-600 transition-all shadow-xl shadow-emerald-200"
                                    >
                                        Complete
                                    </button>
                                ) : (
                                    <button 
                                        disabled
                                        className="w-full py-5 bg-slate-100 text-slate-400 rounded-[24px] text-sm font-black uppercase tracking-[0.2em] cursor-not-allowed flex items-center justify-center gap-3"
                                    >
                                        <div className="w-4 h-4 border-2 border-slate-300 border-t-slate-500 rounded-full animate-spin"></div>
                                        Please Wait...
                                    </button>
                                )}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Status Overlay */}
            <AnimatePresence>
                {statusOverlay.show && (
                    <div className="fixed inset-0 z-[300] flex items-center justify-center p-6">
                        <motion.div 
                            initial={{ opacity: 0 }} 
                            animate={{ opacity: 1 }} 
                            exit={{ opacity: 0 }} 
                            onClick={() => setStatusOverlay({ ...statusOverlay, show: false })} 
                            className="absolute inset-0 bg-slate-900/80 backdrop-blur-md" 
                        />
                        <motion.div 
                            initial={{ scale: 0.8, opacity: 0, rotate: -5 }} 
                            animate={{ scale: 1, opacity: 1, rotate: 0 }} 
                            exit={{ scale: 0.8, opacity: 0 }} 
                            className="bg-white w-full max-w-sm rounded-[40px] p-10 text-center relative z-10 shadow-[0_40px_80px_-20px_rgba(0,0,0,0.4)] overflow-hidden"
                        >
                            <div className={`w-24 h-24 rounded-[32px] flex items-center justify-center mx-auto mb-8 shadow-2xl ${statusOverlay.type === 'success' ? 'bg-emerald-500 shadow-emerald-200 text-white' : statusOverlay.type === 'error' ? 'bg-rose-500 shadow-rose-200 text-white' : 'bg-amber-500 shadow-amber-200 text-white'}`}>
                                {statusOverlay.type === 'success' ? <CheckCircle2 size={48} /> : statusOverlay.type === 'error' ? <XCircle size={48} /> : <AlertTriangle size={48} />}
                            </div>
                            <h3 className="text-2xl font-black text-slate-900 uppercase italic tracking-tight">{statusOverlay.title}</h3>
                            <p className="text-slate-500 font-bold mt-4 text-sm leading-relaxed">{statusOverlay.message}</p>
                            <button 
                                onClick={() => setStatusOverlay({ ...statusOverlay, show: false })}
                                className="w-full mt-10 py-5 bg-slate-900 text-white rounded-[24px] text-xs font-black uppercase tracking-[0.2em] hover:bg-slate-800 transition-all shadow-xl"
                            >
                                Dismiss Intel
                            </button>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

        </div>
    );
}
