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
    Users,
    Check,
    CheckCircle,
    XCircle,
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
    const [showEmailModal, setShowEmailModal] = useState(false);
    const [emailRecipients, setEmailRecipients] = useState([]);
    const [isSendingEmails, setIsSendingEmails] = useState(false);
    const [fetchingRecipients, setFetchingRecipients] = useState(false);
    const [selectedRecipients, setSelectedRecipients] = useState(new Set());
    const [statusOverlay, setStatusOverlay] = useState({ show: false, type: 'success', title: '', message: '' });
    const [missionReport, setMissionReport] = useState(null);
    const [showConflictModal, setShowConflictModal] = useState(false);
    const [pendingNotice, setPendingNotice] = useState(null);
    const [conflictQueue, setConflictQueue] = useState([]);

    // Layer filter + sort state
    const [layerFilter, setLayerFilter] = useState('ALL');
    const [sortConfig, setSortConfig] = useState({ key: 'layer', dir: 'asc' });
    const [searchText, setSearchText] = useState('');

    const filterColumns = [
        { id: 'account', label: 'Account Number', type: 'text' },
        { id: 'bank', label: 'Bank', type: 'text' },
        { id: 'utr', label: 'UTR Payload', type: 'text' },
        { id: 'layer', label: 'Layer', type: 'text' },
        { id: 'amount', label: 'Amount', type: 'number' }
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
        setFilters([...filters, { id: Date.now(), column: 'bank', operator: 'contains', value: '', joiner: 'AND', isNot: false }]);
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
    }, [filters, selectedRecordUtrs]);

    const fetchProcessData = async () => {
        try {
            const res = await api.get(`/cases/${id}`);
            if (res.data.success) {
                setCaseData(res.data);
                const transactions = res.data.transactions;
                const groups = {};
                const allUtrs = new Set();

                transactions.forEach(t => {
                    const bank = (t.platform || 'Unknown Bank').trim();
                    if (!groups[bank]) groups[bank] = { name: bank, records: [] };
                    // Extract real layer from DB — normalize to numeric for sorting
                    const rawLayer = t.layer || '';
                    const layerMatch = rawLayer.toString().trim().match(/\d+/);
                    const layerNum = layerMatch ? parseInt(layerMatch[0], 10) : 999;
                    const layerLabel = layerMatch ? `Layer ${layerNum}` : (rawLayer || 'Layer ?');
                    const record = {
                        account: t.receiver_acc,
                        sender: t.sender_acc || 'Case Root',
                        utr: t.utr_no,
                        amount: t.amount,
                        date: t.trans_date,
                        bank: bank,
                        layer: layerLabel,
                        layerNum: layerNum,
                        ifsc: t.ifsc_code || 'N/A'
                    };
                    groups[bank].records.push(record);
                    allUtrs.add(record.utr);
                });

                const groupArray = Object.values(groups);
                setBankGroups(groupArray);
                setSelectedBankIds(new Set(groupArray.map(g => g.name)));
                setSelectedRecordUtrs(allUtrs);
                setStats({ totalBanks: groupArray.length, totalRecords: allUtrs.size, status: 'CLEAN' });

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
            endDate: new Date().toLocaleDateString('en-GB')
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
        const lettersToSave = bankGroups
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

        if (lettersToSave.length === 0) {
            setStatusOverlay({
                show: true,
                type: 'warning',
                title: 'Selection Empty',
                message: 'No valid notice artifacts selected. Please verify your bank selections.'
            });
            setTimeout(() => setStatusOverlay({ show: false, type: 'success', title: '', message: '' }), 3000);
            return;
        }

        setGenerating(true);
        try {
            const { default: jsPDF } = await import('jspdf');
            const { generateBulkPdf } = await import('../services/letterGenerator');

            let savedCount = 0;
            for (const letter of lettersToSave) {
                const pdf = new jsPDF('p', 'mm', 'a4');
                generateBulkPdf(pdf, letter, true);
                
                // Use a Promise to get reliable base64 from Blob
                const pdfBlob = pdf.output('blob');
                const pdfBase64 = await new Promise((resolve) => {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve(reader.result);
                    reader.readAsDataURL(pdfBlob);
                });
                
                const res = await api.post('/cases/save-notice', { 
                    case_id: id, 
                    bank_name: letter.bankName, 
                    pdf_base64: pdfBase64 
                });
                if (res.data.success) savedCount++;
            }
            
            setStatusOverlay({
                show: true,
                type: 'success',
                title: 'Dossier Deposit Successful',
                message: `${savedCount} Notices have been securely archived in the Evidence Repository.`
            });
            
            setTimeout(() => {
                setProcessStep(4);
                setStatusOverlay({ show: false, type: 'success', title: '', message: '' });
            }, 2500);
        } catch (err) {
            console.error('Save failed:', err);
            setStatusOverlay({
                show: true,
                type: 'error',
                title: 'Archive Failure',
                message: 'Intelligence synchronization failed. Could not deposit notices to dossier.'
            });
        } finally {
            setGenerating(false);
        }
    };

    const handleOpenEmailModal = async () => {
        try {
            setFetchingRecipients(true);
            setMissionReport(null);
            
            // 1. Identify letters to generate
            const targetBanks = bankGroups.filter(g => selectedBankIds.has(g.name));
            const letters = targetBanks.map(g => {
                const recs = g.records.filter(r => selectedRecordUtrs.has(r.utr) && passesAllFilters(r));
                if (recs.length === 0) return null;
                return {
                    bankName: g.name,
                    data: {
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
                    }
                };
            }).filter(Boolean);

            if (letters.length === 0) {
                alert('No notices to process');
                return;
            }

            // 2. Generation & Conflict Detection Loop
            const { default: jsPDF } = await import('jspdf');
            const { generateBulkPdf } = await import('../services/letterGenerator');
            
            const queue = [];
            setStatusOverlay({ show: true, type: 'warning', title: 'Dossier Integrity Scan', message: 'Scanning for intelligence collisions...' });

            for (const letter of letters) {
                const pdf = new jsPDF('p', 'mm', 'a4');
                generateBulkPdf(pdf, letter.data, true);
                const pdfBlob = pdf.output('blob');
                const pdfBase64 = await new Promise(resolve => {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve(reader.result);
                    reader.readAsDataURL(pdfBlob);
                });

                // Check for conflict
                const res = await api.post('/cases/save-notice', { 
                    case_id: id, 
                    bank_name: letter.bankName, 
                    pdf_base64: pdfBase64,
                    version_mode: 'none' 
                });

                if (!res.data.success && res.data.conflict) {
                    queue.push({ letter: letter.data, pdfBase64, bankName: letter.bankName });
                }
            }

            setStatusOverlay({ show: false, type: 'success', title: '', message: '' });

            if (queue.length > 0) {
                setConflictQueue(queue);
                setPendingNotice(queue[0]);
                setShowConflictModal(true);
            } else {
                // No conflicts, proceed to final modal
                await new Promise(r => setTimeout(r, 800));
                setProcessStep(4);
                const res = await api.get(`/cases/${id}/nodal-recipients`);
                if (res.data.success) {
                    setEmailRecipients(res.data.data);
                    const valid = res.data.data.filter(r => r.email).map(r => r.bankname);
                    setSelectedRecipients(new Set(valid));
                    setShowEmailModal(true);
                }
            }
        } catch (err) {
            console.error('Autopilot mission failed:', err);
            setStatusOverlay({ show: true, type: 'error', title: 'Sync Failure', message: err.message });
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
        try {
            const payload = {
                recipients: toSend,
                subject: 'NOTICE UNDER SECTION 94/106 BNSS 2023 - {{bankName}} [CASE ID: ' + id + ']',
                body: `Respected Nodal Officer,\n\nPlease find attached the legal notice under section 94/106 BNSS 2023 regarding Case ID: ${id}.\n\nYou are requested to take immediate action as per the instructions in the attached document.\n\nRegards,\nInvestigation Officer\nCyber Crime Police Station`
            };
            const res = await api.post(`/cases/${id}/send-nodal-emails`, payload);
            if (res.data.success) {
                const results = res.data.data;
                const succeeded = results.filter(r => r.success);
                const failed = results.filter(r => !r.success);
                
                // --- Generate Individual & Summary Timeline Notes ---
                const now = new Date();
                const year = now.getFullYear();
                
                // 1. Individual Success Logs
                for (const item of succeeded) {
                    // Robust match: case-insensitive and trim
                    const bankInfo = bankGroups.find(bg => 
                        bg.name.toLowerCase().trim() === item.bankname.toLowerCase().trim()
                    );
                    const accountCount = bankInfo ? bankInfo.records.length : 'N/A';
                    const randomRef = Math.floor(100 + Math.random() * 899); // Mock sequence
                    
                    const individualNote = `[NOTICE DISPATCHED] Bank: ${item.bankname} | Ref: CCPS/JP/NOTICE/${year}/${id}/${randomRef}-JP | Accounts: ${accountCount} | Status: Freeze Requested & Sent to ${item.email || 'Nodal Registry'}`;
                    
                    try {
                        await api.post(`/cases/${id}/notes`, { note_text: individualNote });
                    } catch (e) { console.error('Individual log failed', e); }
                }

                // 2. Failure Summary (if any)
                if (failed.length > 0) {
                    const failNote = `[MAIL BLAST FAILURE ALERT] - ${now.toLocaleString()}\n` + 
                                     `Failed Targets: ${failed.map(r => `${r.bankname} (Error: ${r.error || 'Connection Refused'})`).join(', ')}`;
                    try {
                        await api.post(`/cases/${id}/notes`, { note_text: failNote });
                    } catch (e) { console.error('Fail log failed', e); }
                }
                // ----------------------------------------------------

                // 3. Set Mission Report for UI
                setMissionReport({
                    succeeded: succeeded.length,
                    failed: failed.length,
                    details: results.map(item => {
                        const bankInfo = bankGroups.find(bg => bg.name.toLowerCase().trim() === item.bankname.toLowerCase().trim());
                        return {
                            ...item,
                            accounts: bankInfo ? bankInfo.records.length : 'N/A',
                            ref: `CCPS/JP/NOTICE/${year}/${id}/${Math.floor(100 + Math.random() * 899)}-JP`
                        };
                    }),
                    timestamp: new Date().toLocaleTimeString()
                });

                setStatusOverlay({
                    show: true,
                    type: failed.length === 0 ? 'success' : 'warning',
                    title: 'Blast Mission Complete',
                    message: `Successfully dispatched ${succeeded.length} notices.`
                });
                // Note: We don't close the modal here anymore, we show the report
            }
        } catch (err) {
            setStatusOverlay({
                show: true,
                type: 'error',
                title: 'Mission Aborted',
                message: 'Batch mailing failed: ' + err.message
            });
        } finally {
            setIsSendingEmails(false);
        }
    };

    const handleResolveConflict = async (choice) => {
        if (!pendingNotice) return;
        
        try {
            if (choice === 'accept') {
                setFetchingRecipients(true);
                const res = await api.post('/cases/save-notice', {
                    case_id: id,
                    bank_name: pendingNotice.bankName,
                    pdf_base64: pendingNotice.pdfBase64,
                    version_mode: 'increment'
                });
                if (res.data.success) {
                    setStatusOverlay({ show: true, type: 'success', title: 'Intelligence Synced', message: `New version saved as ${res.data.fileName}` });
                }
            }
            
            // Remove resolved item from queue
            const nextQueue = conflictQueue.slice(1);
            setConflictQueue(nextQueue);
            
            if (nextQueue.length > 0) {
                setPendingNotice(nextQueue[0]);
                // Stay in modal
            } else {
                setShowConflictModal(false);
                setPendingNotice(null);
                
                // Finalize: Sync Step 4 and Open Email Modal
                setProcessStep(4);
                const res = await api.get(`/cases/${id}/nodal-recipients`);
                if (res.data.success) {
                    setEmailRecipients(res.data.data);
                    const valid = res.data.data.filter(r => r.email).map(r => r.bankname);
                    setSelectedRecipients(new Set(valid));
                    setShowEmailModal(true);
                }
            }
        } catch (err) {
            console.error('Resolution failed:', err);
        } finally {
            setFetchingRecipients(false);
        }
    };

    const toggleRecipient = (bankname) => {
        const next = new Set(selectedRecipients);
        if (next.has(bankname)) next.delete(bankname);
        else next.add(bankname);
        setSelectedRecipients(next);
    };

    const toggleSelectAll = () => {
        if (selectedRecipients.size === emailRecipients.length) {
            setSelectedRecipients(new Set());
        } else {
            setSelectedRecipients(new Set(emailRecipients.map(r => r.bankname)));
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
            await api.post(`/cases/${id}/status`, { status: 'Closed', remarks: detailedRemark });

            // 2. Auto-Broadcast as Internal Memo for Timeline sync
            await api.post(`/cases/${id}/notes`, { note_text: detailedRemark });

            navigate(`/cases/${id}`);
        } catch (err) {
            console.error('Failed to complete mission:', err);
            setStatusOverlay({
                show: true,
                type: 'error',
                title: 'Mission Integrity Failure',
                message: 'Forensic finalization failed. Please verify neural link or dossier status.'
            });
        } finally {
            setIsCompleting(false);
        }
    };

    if (loading) return <div className="p-20 text-center font-black text-slate-400 uppercase tracking-[0.5em] text-xs">Initializing Forensic Engine...</div>;

    // Helper: extract numeric layer for sorting
    const getLayerNum = (rec) => rec.layerNum ?? 999;

    // Collect all unique layers across all bank groups
    const allLayers = [...new Set(
        bankGroups.flatMap(g => g.records.map(r => r.layer))
    )].filter(Boolean).sort((a, b) => {
        const na = parseInt((a || '').match(/\d+/)?.[0] || 999);
        const nb = parseInt((b || '').match(/\d+/)?.[0] || 999);
        return na - nb;
    });

    const rawActiveRecords = bankGroups.filter(g => selectedBankIds.has(g.name)).flatMap(g => g.records);

    // Apply layer filter
    const layerFiltered = layerFilter === 'ALL'
        ? rawActiveRecords
        : rawActiveRecords.filter(r => r.layer === layerFilter);

    // Apply search text
    const searchFiltered = searchText.trim()
        ? layerFiltered.filter(r =>
            (r.account || '').toLowerCase().includes(searchText.toLowerCase()) ||
            (r.utr || '').toLowerCase().includes(searchText.toLowerCase()) ||
            (r.bank || '').toLowerCase().includes(searchText.toLowerCase()) ||
            (r.sender || '').toLowerCase().includes(searchText.toLowerCase())
        )
        : layerFiltered;

    // Apply multi-column filters (existing filter system)
    const activeRecords = searchFiltered.filter(rec => passesAllFilters(rec));

    // Apply sorting
    const sortedRecords = [...activeRecords].sort((a, b) => {
        const dir = sortConfig.dir === 'asc' ? 1 : -1;
        if (sortConfig.key === 'layer') return (getLayerNum(a) - getLayerNum(b)) * dir;
        if (sortConfig.key === 'amount') return (parseFloat(a.amount) - parseFloat(b.amount)) * dir;
        if (sortConfig.key === 'account') return (a.account || '').localeCompare(b.account || '') * dir;
        if (sortConfig.key === 'bank') return (a.bank || '').localeCompare(b.bank || '') * dir;
        if (sortConfig.key === 'utr') return (a.utr || '').localeCompare(b.utr || '') * dir;
        if (sortConfig.key === 'date') return (new Date(a.date) - new Date(b.date)) * dir;
        return 0;
    });

    const toggleSort = (key) => {
        setSortConfig(prev => ({
            key,
            dir: prev.key === key && prev.dir === 'asc' ? 'desc' : 'asc'
        }));
    };

    const SortIcon = ({ colKey }) => {
        if (sortConfig.key !== colKey) return <span className="text-slate-200 ml-1">⇅</span>;
        return <span className="text-blue-500 ml-1">{sortConfig.dir === 'asc' ? '↑' : '↓'}</span>;
    };

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
                                            <Button variant="primary" className="flex-1 py-5 text-xs tracking-widest" disabled={!excelFile || importing} loading={importing} onClick={handleExcelUpload} icon={FileSearch} >
                                                {importing ? 'Processing...' : 'Process & Continue to Review'}
                                            </Button>
                                            {bankGroups.length > 0 && (
                                                <Button variant="outline" className="px-8 py-5 text-xs tracking-widest" onClick={() => handleStepChange(2)} icon={ExternalLink} >
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
                                                                        <select value={f.joiner} onChange={(e) => updateFilter(f.id, 'joiner', e.target.value)} className="bg-slate-900 text-white text-[10px] font-black uppercase tracking-tighter px-2 py-2 rounded-lg border-none focus:ring-0 cursor-pointer" >
                                                                            <option value="AND">AND</option>
                                                                            <option value="OR">OR</option>
                                                                        </select>
                                                                        <button onClick={() => updateFilter(f.id, 'isNot', !f.isNot)} className={`px-3 py-2 rounded-lg text-[10px] font-black uppercase tracking-tighter transition-all ${f.isNot ? 'bg-rose-600 text-white shadow-lg shadow-rose-100' : 'bg-slate-100 text-slate-400'}`} > NOT </button>
                                                                    </>
                                                                )}
                                                                <select value={f.column} onChange={(e) => updateFilter(f.id, 'column', e.target.value)} className="bg-slate-50 text-[10px] font-black uppercase tracking-tighter px-3 py-2 rounded-lg border-none focus:ring-2 focus:ring-blue-500" >
                                                                    {filterColumns.map(col => (
                                                                        <option key={col.id} value={col.id}>{col.label}</option>
                                                                    ))}
                                                                </select>
                                                                <select value={f.operator} onChange={(e) => updateFilter(f.id, 'operator', e.target.value)} className="bg-blue-50 text-blue-600 text-[10px] font-black uppercase tracking-tighter px-3 py-2 rounded-lg border-none focus:ring-2 focus:ring-blue-500" >
                                                                    {validOperators.map(op => (
                                                                        <option key={op.id} value={op.id}>{op.label}</option>
                                                                    ))}
                                                                </select>
                                                                <div className="h-4 w-[1px] bg-slate-200"></div>
                                                                {f.operator !== 'null' && f.operator !== 'not_null' && (
                                                                    <div className="relative">
                                                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={14} />
                                                                        <input type="text" placeholder={col?.type === 'number' ? 'Value...' : 'Contains...'} value={f.value} onChange={(e) => updateFilter(f.id, 'value', e.target.value)} className="pl-9 pr-4 py-2 bg-slate-50 text-[10px] font-bold text-slate-700 placeholder:text-slate-300 rounded-lg border-none focus:ring-2 focus:ring-blue-500 w-48" />
                                                                    </div>
                                                                )}
                                                                <button onClick={() => removeFilter(f.id)} className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all" >
                                                                    <X size={14} />
                                                                </button>
                                                            </div>
                                                        );
                                                    })}
                                                    <button onClick={addFilter} className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-xl border border-dashed border-blue-200 hover:bg-blue-600 hover:text-white transition-all text-[10px] font-black uppercase tracking-widest" >
                                                        <Plus size={14} /> Add Clause
                                                    </button>
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>

                                    {/* Layer Dropdown Filter + Search Bar */}
                                    <div className="px-8 py-5 border-b border-slate-100 flex flex-wrap gap-4 items-center bg-slate-50/50">
                                        {/* Layer Dropdown */}
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Layer:</span>
                                            <select
                                                value={layerFilter}
                                                onChange={e => setLayerFilter(e.target.value)}
                                                className="bg-white border border-slate-200 rounded-xl px-4 py-2 text-[11px] font-black text-slate-700 uppercase tracking-wider focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm cursor-pointer"
                                            >
                                                <option value="ALL">All Layers ({allLayers.length})</option>
                                                {allLayers.map(l => (
                                                    <option key={l} value={l}>{l}</option>
                                                ))}
                                            </select>
                                        </div>

                                        {/* Search */}
                                        <div className="relative flex-1 min-w-[200px] max-w-xs">
                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={14} />
                                            <input
                                                type="text"
                                                placeholder="Search account, UTR, bank..."
                                                value={searchText}
                                                onChange={e => setSearchText(e.target.value)}
                                                className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-[11px] font-medium text-slate-700 placeholder:text-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm"
                                            />
                                        </div>


                                    </div>

                                    <div className="max-h-[700px] overflow-y-auto">
                                        <table className="w-full text-left border-collapse">
                                            <thead className="sticky top-0 bg-white shadow-sm z-10">
                                                <tr className="border-b border-slate-100">
                                                    <th className="px-6 py-5 w-16 text-center">
                                                        <button onClick={toggleSelectAllRecords} className={`p-1 rounded-md transition-all border-2 ${areAllRecordsSelected ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-slate-300 text-transparent'}`}>
                                                            {areAllRecordsSelected ? <CheckSquare size={16} /> : <Square size={16} />}
                                                        </button>
                                                    </th>
                                                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest cursor-pointer hover:text-blue-600 select-none" onClick={() => toggleSort('layer')}>
                                                        Layer <SortIcon colKey="layer" />
                                                    </th>
                                                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest cursor-pointer hover:text-blue-600 select-none" onClick={() => toggleSort('account')}>
                                                        Account Number <SortIcon colKey="account" />
                                                    </th>
                                                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest cursor-pointer hover:text-blue-600 select-none text-center" onClick={() => toggleSort('bank')}>
                                                        Bank <SortIcon colKey="bank" />
                                                    </th>
                                                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest cursor-pointer hover:text-blue-600 select-none" onClick={() => toggleSort('utr')}>
                                                        UTR No. <SortIcon colKey="utr" />
                                                    </th>
                                                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest cursor-pointer hover:text-blue-600 select-none" onClick={() => toggleSort('date')}>
                                                        Date <SortIcon colKey="date" />
                                                    </th>
                                                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest cursor-pointer hover:text-blue-600 select-none text-right" onClick={() => toggleSort('amount')}>
                                                        Amount <SortIcon colKey="amount" />
                                                    </th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-50">
                                                {sortedRecords.map((rec, i) => (
                                                    <tr key={i} className="hover:bg-slate-50/50 transition-colors group">
                                                        <td className="px-6 py-4 text-center">
                                                            <button onClick={() => toggleRecordSelection(rec.utr)} className={`p-1 rounded-md transition-all border-2 ${selectedRecordUtrs.has(rec.utr) ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-slate-300 text-transparent'}`}>
                                                                {selectedRecordUtrs.has(rec.utr) ? <CheckSquare size={16} /> : <Square size={16} />}
                                                            </button>
                                                        </td>
                                                        <td className="px-6 py-4 text-center">
                                                            <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase border ${
                                                                rec.layerNum <= 1 ? 'bg-rose-50 text-rose-600 border-rose-200' :
                                                                rec.layerNum <= 3 ? 'bg-amber-50 text-amber-600 border-amber-200' :
                                                                rec.layerNum <= 6 ? 'bg-blue-50 text-blue-600 border-blue-200' :
                                                                'bg-slate-100 text-slate-600 border-slate-200'
                                                            }`}>{rec.layer}</span>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <p className="text-xs font-black text-slate-900 tracking-tight">{rec.account}</p>
                                                            <p className="text-[9px] text-slate-400 font-bold uppercase mt-0.5">IFSC: {rec.ifsc}</p>
                                                        </td>
                                                        <td className="px-6 py-4 text-center">
                                                            <span className="px-3 py-1 bg-blue-50 text-blue-600 rounded-lg text-[9px] font-black uppercase tracking-tighter border border-blue-100">{rec.bank}</span>
                                                        </td>
                                                        <td className="px-6 py-4 font-mono text-xs text-slate-500 font-bold tracking-tight">{rec.utr}</td>
                                                        <td className="px-6 py-4 text-[10px] text-slate-400 font-bold">
                                                            {rec.date ? new Date(rec.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' }) : '—'}
                                                        </td>
                                                        <td className="px-6 py-4 text-right font-black text-sm text-slate-900 italic">₹{parseFloat(rec.amount || 0).toLocaleString('en-IN')}</td>
                                                    </tr>
                                                ))}
                                                {sortedRecords.length === 0 && (
                                                    <tr><td colSpan={7} className="px-6 py-16 text-center text-slate-400 text-xs font-black uppercase tracking-widest">No records match the current filters</td></tr>
                                                )}
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
                                                        <motion.div key={letter.bankName} initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: idx * 0.1 }} className="relative w-full flex flex-col items-center" >
                                                            {/* Page Label */}
                                                            <div className="mb-3 flex items-center gap-3">
                                                                <span className="px-4 py-1.5 bg-white/10 backdrop-blur-md rounded-full text-[9px] font-black text-white/70 uppercase tracking-[0.3em]"> Notice {idx + 1} of {allLetters.length} — {letter.bankName} </span>
                                                            </div>
                                                            {/* Letter Paper */}
                                                            <div id={idx === 0 ? 'letter-preview' : `letter-preview-${idx}`} className="bg-white rounded-sm shadow-[0_20px_60px_rgba(0,0,0,0.4)] ring-1 ring-black/10 origin-top transition-transform duration-300 ease-out" style={{ transform: `scale(${zoom})`, width: '210mm', transformOrigin: 'top center' }} dangerouslySetInnerHTML={{ __html: generateLetterHtml(letter) }} />
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
                                        <p className="text-slate-500 text-sm leading-relaxed font-semibold italic"> All forensic warrants have been verified and sealed in the evidence repository. The dossier is ready for digital dispatch or physical printing. </p>
                                    </div>
                                    <div className="text-left">
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Completion Remarks / Origin Log</label>
                                        <textarea value={remark} onChange={(e) => setRemark(e.target.value)} placeholder="Enter operational log remarks here..." className="w-full h-24 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm resize-none" />
                                    </div>
                                    <div className="pt-8 grid grid-cols-2 gap-4">
                                        <Button 
                                            variant="outline" 
                                            className="py-5" 
                                            icon={Mail} 
                                            onClick={handleOpenEmailModal}
                                            loading={fetchingRecipients}
                                            disabled={fetchingRecipients}
                                        >
                                            Nodal Email Blast
                                        </Button>
                                        <Button variant="primary" className="bg-blue-600 py-5 shadow-2xl shadow-blue-200" icon={CheckCircle2} onClick={handleCompleteMission} disabled={isCompleting} >
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
                                                {missionReport.failed === 0 ? <CheckCircle size={56} /> : <AlertTriangle size={56} />}
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
                                                        <p className="text-[10px] font-black text-slate-400 uppercase leading-none">Accounts</p>
                                                        <p className="text-xl font-black text-slate-900 mt-1">{item.accounts}</p>
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
                                        <p className="text-sm text-slate-500 mt-2 max-w-xs mx-auto">Please execute "Save to Dossier" to generate bank-specific notice artifacts before dispatch.</p>
                                    </div>
                                ) : (
                                    <>
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
                                {statusOverlay.type === 'success' ? <CheckCircle size={48} /> : statusOverlay.type === 'error' ? <XCircle size={48} /> : <AlertTriangle size={48} />}
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
            <AnimatePresence>
                {showConflictModal && pendingNotice && (
                    <div className="fixed inset-0 z-[400] flex items-center justify-center p-6 backdrop-blur-xl bg-slate-900/60">
                        <motion.div 
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            className="bg-white w-full max-w-5xl h-[85vh] rounded-[48px] shadow-[0_0_100px_rgba(0,0,0,0.4)] overflow-hidden flex flex-col border border-white/20"
                        >
                            {/* Header */}
                            <div className="p-8 bg-rose-600 flex items-center justify-between relative overflow-hidden">
                                <div className="absolute inset-0 opacity-10 pointer-events-none">
                                    <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '24px 24px' }}></div>
                                </div>
                                <div className="flex items-center gap-5 relative z-10">
                                    <div className="p-4 bg-white/20 rounded-2xl text-white backdrop-blur-md">
                                        <AlertTriangle size={28} className="animate-bounce" />
                                    </div>
                                    <div>
                                        <h3 className="text-2xl font-black text-white uppercase tracking-tight italic">Intelligence <span className="text-rose-200">Collision Detected</span></h3>
                                        <p className="text-[10px] text-rose-100 font-bold uppercase tracking-[0.2em] mt-1">Collision {conflictQueue.length > 0 ? 1 : 0} of {conflictQueue.length} // Bank: {pendingNotice.bankName}</p>
                                    </div>
                                </div>
                                <button onClick={() => setShowConflictModal(false)} className="p-3 text-white/60 hover:text-white hover:bg-white/10 rounded-2xl transition-all">
                                    <X size={24} />
                                </button>
                            </div>

                            {/* Preview Area */}
                            <div className="flex-1 bg-slate-100 p-8 flex gap-8">
                                <div className="flex-1 bg-white rounded-[32px] shadow-inner overflow-hidden border border-slate-200 relative">
                                    <iframe 
                                        src={pendingNotice.pdfBase64} 
                                        className="w-full h-full border-none"
                                        title="Notice Preview"
                                    />
                                    <div className="absolute top-6 left-6 px-4 py-2 bg-rose-600 text-white text-[10px] font-black uppercase tracking-widest rounded-full shadow-lg">
                                        PROPOSED NEW ARTIFACT
                                    </div>
                                </div>
                                
                                <div className="w-80 space-y-6">
                                    <div className="bg-rose-50 p-6 rounded-[32px] border border-rose-100">
                                        <h4 className="text-xs font-black text-rose-900 uppercase tracking-wider mb-2">Protocol Warning</h4>
                                        <p className="text-xs text-rose-700 leading-relaxed font-bold">
                                            A legal notice for this target bank is already registered. Saving a new version will create a series (e.g. _2, _3) without overwriting historical data.
                                        </p>
                                    </div>

                                    <div className="bg-white p-6 rounded-[32px] border border-slate-200 space-y-4">
                                        <div>
                                            <p className="text-[10px] font-black text-slate-400 uppercase">Target Bank</p>
                                            <p className="text-sm font-black text-slate-900 mt-1">{pendingNotice.letter.bankName}</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-black text-slate-400 uppercase">Transaction Count</p>
                                            <p className="text-sm font-black text-slate-900 mt-1">{pendingNotice.letter.records.length} Records Detected</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="p-8 bg-white border-t border-slate-100 flex gap-5">
                                <button 
                                    onClick={() => handleResolveConflict('reject')}
                                    className="px-10 py-5 rounded-[24px] text-sm font-black text-slate-500 uppercase tracking-widest hover:bg-slate-100 transition-all border-2 border-slate-200"
                                >
                                    Reject & Use Old
                                </button>
                                <button 
                                    onClick={() => handleResolveConflict('accept')}
                                    className="flex-1 py-5 rounded-[24px] bg-emerald-600 text-white flex items-center justify-center gap-4 text-sm font-black uppercase tracking-[0.2em] hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-100 hover:scale-[1.02] active:scale-95"
                                >
                                    <CheckCircle size={20} />
                                    Accept & Save as New Version
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default LetterPreview;
