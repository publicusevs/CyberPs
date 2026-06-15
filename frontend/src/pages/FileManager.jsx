import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api, { getAssetUrl } from '../services/api';
import { 
    Eye,
    X,
    Printer,
    ChevronLeft, 
    Trash2, 
    FileText, 
    Shield, 
    Download, 
    AlertCircle,
    FileSpreadsheet,
    FileCode,
    Loader2,
    CheckCircle2
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Table';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '../context/ToastContext';

const FileManager = () => {
    const { id } = useParams();
    const { toast } = useToast();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [caseData, setCaseData] = useState(null);
    const [deletingId, setDeletingId] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(null);
    const [selectedKeys, setSelectedKeys] = useState({});
    const [bulkDeleting, setBulkDeleting] = useState(false);
    const [confirmModal, setConfirmModal] = useState({
        isOpen: false,
        type: 'single',
        fileType: '',
        id: null,
        message: '',
        title: ''
    });
    const [deleteProgress, setDeleteProgress] = useState({
        isProcessing: false,
        total: 0,
        current: 0,
        successCount: 0,
        failCount: 0,
        currentItem: ''
    });

    useEffect(() => {
        fetchFiles();
    }, [id]);

    const fetchFiles = async () => {
        try {
            const res = await api.get(`/cases/${id}`);
            if (res.data.success) {
                setCaseData(res.data);
            }
        } catch (err) {
            console.error('Failed to fetch case files');
        } finally {
            setLoading(false);
        }
    };

    const handleToggleSelect = (type, fileId) => {
        const key = `${type}-${fileId}`;
        setSelectedKeys(prev => ({
            ...prev,
            [key]: !prev[key]
        }));
    };

    const getSelectedCount = () => {
        return Object.values(selectedKeys).filter(Boolean).length;
    };

    const getRenderedFirDocs = () => {
        return (caseData?.fir_docs || [caseData?.fir]).filter(Boolean);
    };

    const isAllSelected = () => {
        const firDocsRendered = getRenderedFirDocs();
        const evDocs = caseData?.evidence || [];
        const total = firDocsRendered.length + evDocs.length;
        if (total === 0) return false;
        
        const allFirSelected = firDocsRendered.every(doc => selectedKeys[`fir-${doc.doc_id}`]);
        const allEvSelected = evDocs.every(ev => selectedKeys[`evidence-${ev.evidence_id}`]);
        
        return allFirSelected && allEvSelected;
    };

    const handleToggleSelectAll = () => {
        const firDocsRendered = getRenderedFirDocs();
        const evDocs = caseData?.evidence || [];
        
        if (isAllSelected()) {
            setSelectedKeys({});
        } else {
            const newKeys = {};
            firDocsRendered.forEach(doc => {
                newKeys[`fir-${doc.doc_id}`] = true;
            });
            evDocs.forEach(ev => {
                newKeys[`evidence-${ev.evidence_id}`] = true;
            });
            setSelectedKeys(newKeys);
        }
    };

    const handleBulkDownload = () => {
        const firDocs = caseData?.fir_docs || [];
        const evidence = caseData?.evidence || [];
        
        const selectedList = Object.entries(selectedKeys)
            .filter(([_, isSelected]) => isSelected)
            .map(([key]) => {
                const [type, idStr] = key.split('-');
                const id = parseInt(idStr, 10);
                let filePath = '';
                if (type === 'fir') {
                    const doc = firDocs.find(d => d.doc_id === id);
                    if (doc) filePath = doc.file_path;
                } else if (type === 'evidence') {
                    const doc = evidence.find(d => d.evidence_id === id);
                    if (doc) filePath = doc.file_path;
                }
                return filePath;
            })
            .filter(Boolean);

        selectedList.forEach(filePath => {
            window.open(getAssetUrl(filePath), '_blank');
        });
    };

    const executeDelete = async () => {
        if (confirmModal.type === 'bulk') {
            const selectedList = Object.entries(selectedKeys)
                .filter(([_, isSelected]) => isSelected)
                .map(([key]) => {
                    const [type, idStr] = key.split('-');
                    return { type, id: parseInt(idStr, 10) };
                });

            if (selectedList.length === 0) return;

            setDeleteProgress({
                isProcessing: true,
                total: selectedList.length,
                current: 0,
                successCount: 0,
                failCount: 0,
                currentItem: ''
            });
            setBulkDeleting(true);

            let successCount = 0;
            let failCount = 0;

            for (let i = 0; i < selectedList.length; i++) {
                const item = selectedList[i];
                setDeleteProgress(prev => ({
                    ...prev,
                    current: i + 1,
                    currentItem: `${item.type.toUpperCase()} ID: ${item.id}`
                }));

                try {
                    const res = await api.post('/cases/delete-file', { type: item.type, id: item.id });
                    if (res.data.success) {
                        successCount++;
                        setDeleteProgress(prev => ({ ...prev, successCount: prev.successCount + 1 }));
                    } else {
                        failCount++;
                        setDeleteProgress(prev => ({ ...prev, failCount: prev.failCount + 1 }));
                    }
                } catch (err) {
                    console.error(`Failed to delete ${item.type} ID ${item.id}`, err);
                    failCount++;
                    setDeleteProgress(prev => ({ ...prev, failCount: prev.failCount + 1 }));
                }
            }

            setDeleteProgress(prev => ({ ...prev, isProcessing: false }));

            if (successCount > 0) {
                toast.success(`Successfully deleted ${successCount} file(s).`, "Bulk Delete Successful");
            }
            if (failCount > 0) {
                toast.error(`Failed to delete ${failCount} file(s).`, "Bulk Delete Error");
            }

            setSelectedKeys({});
            fetchFiles();
            setBulkDeleting(false);
            // DO NOT auto-close modal on bulk, let user see the final progress and click Done
        } else {
            setDeleteProgress({
                isProcessing: true,
                total: 1,
                current: 1,
                successCount: 0,
                failCount: 0,
                currentItem: `${confirmModal.fileType.toUpperCase()} ID: ${confirmModal.id}`
            });
            setDeletingId(confirmModal.id);
            try {
                const res = await api.post('/cases/delete-file', { type: confirmModal.fileType, id: confirmModal.id });
                if (res.data.success) {
                    setDeleteProgress(prev => ({ ...prev, successCount: 1 }));
                    fetchFiles();
                    toast.success("File deleted successfully", "Delete Successful");
                } else {
                    setDeleteProgress(prev => ({ ...prev, failCount: 1 }));
                }
            } catch (err) {
                setDeleteProgress(prev => ({ ...prev, failCount: 1 }));
                toast.error('Delete failed: ' + (err.response?.data?.message || err.message), "Protocol Error");
            } finally {
                setDeletingId(null);
            }
            setDeleteProgress(prev => ({ ...prev, isProcessing: false }));
            setConfirmModal(prev => ({ ...prev, isOpen: false }));
        }
    };

    const handleBulkDelete = () => {
        const selectedCount = Object.values(selectedKeys).filter(Boolean).length;
        if (selectedCount === 0) return;
        setConfirmModal({
            isOpen: true,
            type: 'bulk',
            title: 'Bulk Delete Confirmation',
            message: `Are you sure you want to delete the ${selectedCount} selected file(s)? This will also remove associated data from the database and folder.`
        });
    };

    const handleDelete = (type, fileId) => {
        setConfirmModal({
            isOpen: true,
            type: 'single',
            fileType: type,
            id: fileId,
            title: 'Delete Confirmation',
            message: 'Are you sure you want to delete this file? This will also remove associated data from the database and folder.'
        });
    };

    if (loading) return (
        <div className="min-h-[600px] flex items-center justify-center">
            <Loader2 className="animate-spin text-blue-600" size={40} />
        </div>
    );

    const firDocs = caseData?.fir_docs || [];
    const evidence = caseData?.evidence || [];
    const totalFiles = firDocs.length + evidence.length;

    return (
        <div className="max-w-6xl mx-auto space-y-10 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-6">
                    <button 
                        onClick={() => navigate(`/cases/${id}`)} 
                        className="p-3 bg-white border border-slate-200 rounded-2xl hover:bg-blue-600 hover:text-white transition-all text-slate-400 shadow-sm"
                    >
                        <ChevronLeft size={24} />
                    </button>
                    <div>
                        <h1 className="text-3xl font-black text-slate-900 tracking-tighter uppercase italic">
                            File <span className="text-rose-600">Manager</span>
                        </h1>
                        <p className="text-[10px] text-slate-400 font-bold tracking-widest uppercase mt-1">
                            Case Intelligence Archive #{id} // Total Items: {totalFiles}
                        </p>
                    </div>
                </div>

                {/* Bulk Action Controls */}
                <div className="flex items-center gap-4">
                    <AnimatePresence>
                        {totalFiles > 0 && (
                            <motion.button
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                onClick={handleToggleSelectAll}
                                className="px-5 py-3 text-xs font-black uppercase tracking-widest border border-slate-200 text-slate-600 bg-white hover:bg-slate-50 transition-all rounded-2xl shadow-sm flex items-center gap-2 cursor-pointer"
                            >
                                {isAllSelected() ? 'Deselect All' : 'Select All'}
                            </motion.button>
                        )}
                    </AnimatePresence>

                    <AnimatePresence>
                        {getSelectedCount() > 0 && (
                            <>
                                <motion.button
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 20 }}
                                    onClick={handleBulkDownload}
                                    className="px-6 py-3 text-xs font-black uppercase tracking-widest bg-blue-600 hover:bg-blue-700 text-white rounded-2xl transition-all shadow-lg shadow-blue-200/50 flex items-center gap-2 cursor-pointer"
                                >
                                    <Download size={16} />
                                    Download Selected ({getSelectedCount()})
                                </motion.button>
                                <motion.button
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 20 }}
                                    onClick={handleBulkDelete}
                                    disabled={bulkDeleting}
                                    className="px-6 py-3 text-xs font-black uppercase tracking-widest bg-rose-600 hover:bg-rose-700 text-white rounded-2xl transition-all shadow-lg shadow-rose-200/50 flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                                >
                                    {bulkDeleting ? (
                                        <Loader2 className="animate-spin" size={16} />
                                    ) : (
                                        <Trash2 size={16} />
                                    )}
                                    Delete Selected ({getSelectedCount()})
                                </motion.button>
                            </>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {/* Warning Box */}
            <div className="bg-amber-50 border border-amber-200 rounded-[28px] p-6 flex items-start gap-4">
                <div className="p-3 bg-amber-100 rounded-xl text-amber-600">
                    <AlertCircle size={20} />
                </div>
                <div>
                    <h4 className="text-sm font-black text-amber-900 uppercase tracking-tight">Critical Warning: IRREVERSIBLE ACTION</h4>
                    <p className="text-xs font-semibold text-amber-700 leading-relaxed mt-1 italic">
                        Deleting a "Forensic Money Trail Excel" will also wipe all associated transaction data from the tables. 
                        Files will be physically purged from the secure storage vault. Proceed with caution.
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-6">
                {/* FIR & Legal Notices Section */}
                {(caseData?.fir_docs || [caseData?.fir]).filter(Boolean).map((doc, idx) => (
                    <Card key={`fir-${idx}`} className="p-0 overflow-hidden border-blue-100 shadow-xl bg-white mb-4">
                        <div className="px-8 py-4 bg-blue-50/50 border-b border-blue-100 flex justify-between items-center">
                            <div className="flex items-center gap-3">
                                <Shield className="text-blue-600" size={18} />
                                <span className="text-[10px] font-black text-slate-900 uppercase tracking-widest italic">Core Authorization Dossier</span>
                            </div>
                            <Badge className={doc.file_type === 'Legal Notice' ? "bg-indigo-600 text-white border-transparent" : "bg-blue-600 text-white border-transparent"}>
                                {doc.file_type === 'Legal Notice' ? 'LEGAL_NOTICE' : 'PRIMARY_FIR'}
                            </Badge>
                        </div>
                        <div className="p-8 flex items-center justify-between">
                            <div className="flex items-center gap-6">
                                <input 
                                    type="checkbox" 
                                    checked={Boolean(selectedKeys[`fir-${doc.doc_id}`])}
                                    onChange={() => handleToggleSelect('fir', doc.doc_id)}
                                    className="w-5 h-5 text-rose-600 rounded border-slate-300 focus:ring-rose-500 cursor-pointer flex-shrink-0"
                                />
                                <div className={`p-4 rounded-2xl border ring-4 ${doc.file_type === 'Legal Notice' ? 'bg-indigo-50 text-indigo-600 border-indigo-100 ring-indigo-50/50' : 'bg-blue-50 text-blue-600 border-blue-100 ring-blue-50/50'}`}>
                                    <FileText size={28} />
                                </div>
                                <div className="space-y-1">
                                    <h3 className="text-lg font-black text-slate-900 tracking-tight uppercase">{doc.file_name}</h3>
                                    <p className="text-[10px] text-indigo-500 font-bold uppercase tracking-widest flex items-center gap-2">
                                        Intelligence Artifact // {doc.file_type || 'LEGAL_NOTICE'}
                                    </p>
                                </div>
                            </div>
                            <div className="flex gap-4">
                                <button 
                                    onClick={() => setPreviewUrl(getAssetUrl(doc.file_path))}
                                    className="p-4 bg-slate-50 text-slate-400 hover:text-indigo-600 hover:bg-white rounded-2xl transition-all border border-slate-100 shadow-sm"
                                >
                                    <Eye size={20} />
                                </button>
                                <a 
                                    href={getAssetUrl(doc.file_path)} 
                                    target="_blank" 
                                    rel="noreferrer" 
                                    className="p-4 bg-slate-50 text-slate-400 hover:text-blue-600 hover:bg-white rounded-2xl transition-all border border-slate-100 shadow-sm"
                                >
                                    <Download size={20} />
                                </a>
                                <Button 
                                    variant="outline" 
                                    className="border-rose-100 text-rose-500 hover:bg-rose-500 hover:text-white p-4 h-auto shadow-sm"
                                    onClick={() => handleDelete('fir', doc.doc_id)}
                                    disabled={deletingId === doc.doc_id}
                                >
                                    {deletingId === doc.doc_id ? <Loader2 className="animate-spin" size={20} /> : <Trash2 size={20} />}
                                </Button>
                            </div>
                        </div>
                    </Card>
                ))}

                {/* Evidence Section */}
                {evidence.length > 0 ? (
                    <div className="space-y-6">
                        <h3 className="text-xs font-black text-slate-800 tracking-[0.2em] uppercase px-4 flex items-center gap-2 italic">
                            <FileCode className="text-blue-600" size={14} /> SECURED_ARTIFACT_LIST
                        </h3>
                        <div className="grid grid-cols-1 gap-4">
                            {evidence.map((ev) => {
                                const isExcel = ev.description === 'Forensic Money Trail Excel Artifact';
                                return (
                                    <motion.div 
                                        key={ev.evidence_id}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                    >
                                        <Card className="p-6 bg-white border-slate-100 hover:border-blue-200 transition-all shadow-lg shadow-slate-200/40 relative overflow-hidden group">
                                            {isExcel && <div className="absolute top-0 left-0 w-1.5 h-full bg-emerald-500"></div>}
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-6">
                                                    <input 
                                                        type="checkbox" 
                                                        checked={Boolean(selectedKeys[`evidence-${ev.evidence_id}`])}
                                                        onChange={() => handleToggleSelect('evidence', ev.evidence_id)}
                                                        className="w-5 h-5 text-rose-600 rounded border-slate-300 focus:ring-rose-500 cursor-pointer flex-shrink-0"
                                                    />
                                                    <div className={`p-4 rounded-2xl border ${
                                                        isExcel ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-slate-50 text-slate-400 border-slate-100'
                                                    } group-hover:scale-110 transition-transform`}>
                                                        {isExcel ? <FileSpreadsheet size={24} /> : <Shield size={24} />}
                                                    </div>
                                                    <div>
                                                        <div className="flex items-center gap-3">
                                                            <h4 className="text-md font-black text-slate-900 tracking-tight uppercase">{ev.file_name}</h4>
                                                            {isExcel && <Badge className="bg-emerald-500 text-white border-transparent">DATA_SOURCE</Badge>}
                                                        </div>
                                                        <p className="text-[9px] text-blue-500 font-black uppercase tracking-tighter">
                                                            Forensic Evidence Artifact // SECURE_STORAGE
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="flex gap-3">
                                                    <button 
                                                        onClick={() => setPreviewUrl(getAssetUrl(ev.file_path) + '#view=FitH')}
                                                        className="p-3 bg-white text-slate-400 hover:text-indigo-600 rounded-xl transition-all border border-slate-100 shadow-sm"
                                                    >
                                                        <Eye size={18} />
                                                    </button>
                                                    <a 
                                                        href={getAssetUrl(ev.file_path)} 
                                                        target="_blank" 
                                                        rel="noreferrer" 
                                                        className="p-3 bg-white text-slate-400 hover:text-blue-600 rounded-xl transition-all border border-slate-100 shadow-sm"
                                                    >
                                                        <Download size={18} />
                                                    </a>
                                                    <button 
                                                        className="p-3 bg-rose-50 text-rose-500 hover:bg-rose-500 hover:text-white rounded-xl transition-all border border-rose-100 shadow-sm"
                                                        onClick={() => handleDelete('evidence', ev.evidence_id)}
                                                        disabled={deletingId === ev.evidence_id}
                                                    >
                                                        {deletingId === ev.evidence_id ? <Loader2 className="animate-spin" size={18} /> : <Trash2 size={18} />}
                                                    </button>
                                                </div>
                                            </div>
                                        </Card>
                                    </motion.div>
                                );
                            })}
                        </div>
                    </div>
                ) : (
                    <div className="text-center py-20 bg-white rounded-[40px] border border-dashed border-slate-200">
                        <Loader2 className="mx-auto text-slate-200 mb-4" size={40} />
                        <p className="text-slate-400 font-black text-[10px] tracking-widest uppercase italic">Archive currently empty</p>
                    </div>
                )}
            </div>
            
            {totalFiles > 0 && (
                <div className="text-center pt-10">
                    <p className="text-[9px] text-slate-300 font-bold uppercase tracking-[0.5em] italic flex items-center justify-center gap-3">
                        <CheckCircle2 size={10} /> end of forensic artifact vault <CheckCircle2 size={10} />
                    </p>
                </div>
            )}
            {/* Artifact Preview Modal */}
            <AnimatePresence>
                {previewUrl && (
                    <div className="fixed inset-0 z-[500] flex items-center justify-center p-6 backdrop-blur-2xl bg-slate-900/80">
                        <motion.div 
                            initial={{ scale: 0.9, opacity: 0, y: 30 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 30 }}
                            className="bg-white w-full max-w-6xl h-[90vh] rounded-[48px] shadow-[0_0_100px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col border border-white/20"
                        >
                            {/* Modal Header */}
                            <div className="px-8 py-6 bg-slate-900 flex items-center justify-between border-b border-white/10">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-blue-600 rounded-xl text-white">
                                        <Shield size={20} />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-black text-white uppercase tracking-tight italic">Forensic <span className="text-blue-400">Artifact Preview</span></h3>
                                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Secure View // Intelligence Dossier #{id}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <button 
                                        onClick={() => window.open(previewUrl, '_blank')}
                                        className="flex items-center gap-2 px-6 py-3 bg-white/5 hover:bg-white/10 text-white rounded-2xl text-xs font-black uppercase tracking-widest transition-all border border-white/10"
                                    >
                                        <Printer size={16} /> Print Artifact
                                    </button>
                                    <button 
                                        onClick={() => setPreviewUrl(null)} 
                                        className="p-3 text-white/40 hover:text-white hover:bg-white/10 rounded-2xl transition-all"
                                    >
                                        <X size={24} />
                                    </button>
                                </div>
                            </div>

                            {/* PDF Viewer */}
                            <div className="flex-1 bg-slate-800 p-4">
                                <iframe 
                                    src={previewUrl} 
                                    className="w-full h-full rounded-2xl border-none shadow-inner bg-white"
                                    title="Artifact Viewer"
                                />
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Delete Confirmation Modal */}
            <AnimatePresence>
                {confirmModal.isOpen && (
                    <div className="fixed inset-0 z-[500] flex items-center justify-center p-6 backdrop-blur-2xl bg-slate-900/80">
                        <motion.div 
                            initial={{ scale: 0.9, opacity: 0, y: 30 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 30 }}
                            className="bg-white w-full max-w-md rounded-[48px] shadow-[0_0_100px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col border border-rose-100"
                        >
                            <div className="p-8 text-center space-y-6">
                                <div className="w-20 h-20 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-6">
                                    <AlertCircle size={40} />
                                </div>
                                <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight">{confirmModal.title}</h3>
                                <p className="text-sm font-bold text-slate-500 tracking-wide uppercase">
                                    {confirmModal.message}
                                </p>
                                
                                {deleteProgress.total > 0 && (
                                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-3">
                                        <p className="text-xs font-black text-slate-600 tracking-widest uppercase">
                                            {deleteProgress.isProcessing ? 'Processing Deletion...' : 'Deletion Complete'}
                                        </p>
                                        
                                        <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
                                            <div 
                                                className="bg-rose-500 h-2.5 transition-all duration-300" 
                                                style={{ width: `${(deleteProgress.current / deleteProgress.total) * 100}%` }}
                                            ></div>
                                        </div>
                                        
                                        <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-slate-500">
                                            <span>Progress: {deleteProgress.current} / {deleteProgress.total}</span>
                                            <span>Remaining: {deleteProgress.total - deleteProgress.current}</span>
                                        </div>
                                        
                                        {(deleteProgress.successCount > 0 || deleteProgress.failCount > 0) && (
                                            <div className="flex justify-center gap-4 text-[10px] font-bold uppercase tracking-widest pt-2 border-t border-slate-200">
                                                <span className="text-emerald-600">Success: {deleteProgress.successCount}</span>
                                                <span className="text-rose-600">Failed: {deleteProgress.failCount}</span>
                                            </div>
                                        )}
                                        {deleteProgress.isProcessing && (
                                            <p className="text-[9px] text-slate-400 italic">Deleting: {deleteProgress.currentItem}</p>
                                        )}
                                    </div>
                                )}
                                
                                <div className="flex gap-4 pt-4">
                                    {(!deleteProgress.isProcessing && deleteProgress.total > 0 && confirmModal.type === 'bulk') ? (
                                        <button 
                                            onClick={() => {
                                                setConfirmModal(prev => ({ ...prev, isOpen: false }));
                                                setTimeout(() => setDeleteProgress({ isProcessing: false, total: 0, current: 0, successCount: 0, failCount: 0, currentItem: '' }), 300);
                                            }}
                                            className="w-full py-4 bg-slate-800 hover:bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest text-xs transition-all shadow-lg"
                                        >
                                            Done
                                        </button>
                                    ) : (
                                        <>
                                            <button 
                                                onClick={() => {
                                                    if (deleteProgress.isProcessing) return;
                                                    setConfirmModal(prev => ({ ...prev, isOpen: false }));
                                                    setTimeout(() => setDeleteProgress({ isProcessing: false, total: 0, current: 0, successCount: 0, failCount: 0, currentItem: '' }), 300);
                                                }}
                                                disabled={deleteProgress.isProcessing}
                                                className="flex-1 py-4 bg-slate-50 text-slate-500 hover:bg-slate-100 rounded-2xl font-black uppercase tracking-widest text-xs transition-all disabled:opacity-50"
                                            >
                                                Cancel
                                            </button>
                                            <button 
                                                onClick={executeDelete}
                                                disabled={deleteProgress.isProcessing || deleteProgress.total > 0}
                                                className="flex-1 py-4 bg-rose-600 hover:bg-rose-700 text-white rounded-2xl font-black uppercase tracking-widest text-xs transition-all shadow-lg shadow-rose-200 disabled:opacity-50"
                                            >
                                                {deleteProgress.isProcessing ? <Loader2 className="animate-spin mx-auto" size={16} /> : 'Confirm Delete'}
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default FileManager;
