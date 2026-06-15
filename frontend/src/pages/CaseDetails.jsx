import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api, { getAssetUrl } from '../services/api';
import {
    ArrowLeft,
    FileText,
    MessageSquare,
    History,
    Download,
    Send,
    UserCheck,
    Banknote,
    Fingerprint,
    Shield,
    X,
    Plus,
    Upload,
    FileSpreadsheet,
    Mail,
    ChevronRight,
    Printer,
    FileSearch,
    BadgeCheck,
    ExternalLink,
    Play,
    Trash2,
    Eye,
    User,
    MessageCircle,
    Hash,
    AtSign,
    Globe,
    Link2,
    Edit2,
    Save,
    Activity,
    AlertTriangle,
    Network,
    Inbox,
    Loader2
} from 'lucide-react';

import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Table';
import { InputField } from '../components/ui/InputField';
import { motion, AnimatePresence } from 'framer-motion';
import NoticesEngine from './NoticesEngine';
import { useToast } from '../context/ToastContext';

const CaseDetails = () => {
    const { id } = useParams();
    const { toast } = useToast();
    const navigate = useNavigate();
    const [caseData, setCaseData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [newNote, setNewNote] = useState('');
    const [showEvidModal, setShowEvidModal] = useState(false);
    const [showExcelModal, setShowExcelModal] = useState(false);
    const [showProfileModal, setShowProfileModal] = useState(false);
    const [showNoticesEngine, setShowNoticesEngine] = useState(false);
    const [noticesTab, setNoticesTab] = useState('wizard');
    const [selectedKeys, setSelectedKeys] = useState({});
    const [confirmDelete, setConfirmDelete] = useState({ isOpen: false, type: null, id: null, isBulk: false });
    const [deleteProgress, setDeleteProgress] = useState({
        isProcessing: false,
        total: 0,
        current: 0,
        successCount: 0,
        failCount: 0,
        currentItem: ''
    });

    // Excel Upload State
    const [excelFile, setExcelFile] = useState(null);
    const [importing, setImporting] = useState(false);

    // Form States
    const [evidenceFiles, setEvidenceFiles] = useState([]);
    const [evidDesc, setEvidDesc] = useState('');

    // Edit Profile States
    const [editProfileMode, setEditProfileMode] = useState(false);
    const [editableVictim, setEditableVictim] = useState(null);
    const [editableAccusedList, setEditableAccusedList] = useState([]);
    const [isSavingProfile, setIsSavingProfile] = useState(false);

    useEffect(() => {
        fetchCaseDetails();
    }, [id]);

    const fetchCaseDetails = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await api.get(`/cases/${id}`);
            if (res.data.success) {
                setCaseData(res.data);
                setEditableVictim(res.data.victim);
                setEditableAccusedList(res.data.accusedList || []);
            } else {
                setError(res.data.message || 'Failed to retrieve case details.');
            }
        } catch (err) {
            console.error('Core breach detected:', err);
            setError(err.response?.data?.message || err.message || 'Failed to connect to security server.');
        } finally {
            setLoading(false);
        }
    };

    const handleToggleSelect = (type, id) => {
        const key = `${type}-${id}`;
        setSelectedKeys(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const executeDelete = async () => {
        try {
            if (confirmDelete.isBulk) {
                const selectedList = Object.entries(selectedKeys)
                    .filter(([_, isSelected]) => isSelected)
                    .map(([key]) => {
                        const [type, idStr] = key.split('-');
                        return { type, idStr, id: parseInt(idStr, 10) };
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
                        failCount++;
                        setDeleteProgress(prev => ({ ...prev, failCount: prev.failCount + 1 }));
                    }
                }

                setDeleteProgress(prev => ({ ...prev, isProcessing: false }));

                if (successCount > 0) {
                    fetchCaseDetails();
                    setSelectedKeys({});
                    toast.success(`Successfully deleted ${successCount} file(s).`, "Bulk Delete Successful");
                }
                if (failCount > 0) {
                    toast.error(`Failed to delete ${failCount} file(s).`, "Bulk Delete Error");
                }
            } else {
                setDeleteProgress({
                    isProcessing: true,
                    total: 1,
                    current: 1,
                    successCount: 0,
                    failCount: 0,
                    currentItem: `${confirmDelete.type?.toUpperCase()} ID: ${confirmDelete.id}`
                });
                try {
                    const res = await api.post('/cases/delete-file', { type: confirmDelete.type, id: confirmDelete.id });
                    if (res.data.success) {
                        setDeleteProgress(prev => ({ ...prev, successCount: 1 }));
                        fetchCaseDetails();
                        toast.success("File deleted successfully", "Delete Successful");
                    } else {
                        setDeleteProgress(prev => ({ ...prev, failCount: 1 }));
                    }
                } catch (err) {
                    setDeleteProgress(prev => ({ ...prev, failCount: 1 }));
                    toast.error('Delete failed: ' + (err.response?.data?.message || err.message), "Protocol Error");
                }
                setDeleteProgress(prev => ({ ...prev, isProcessing: false }));
                setConfirmDelete({ isOpen: false, type: null, id: null, isBulk: false });
            }
        } catch (err) {
            toast.error('Delete failed: ' + (err.response?.data?.message || err.message), "Protocol Error");
        }
        
        if (!confirmDelete.isBulk) {
            setConfirmDelete({ isOpen: false, type: null, id: null, isBulk: false });
        }
    };

    const handleDeleteFile = (type, fileId) => {
        setConfirmDelete({ isOpen: true, type, id: fileId, isBulk: false });
    };

    const handleBulkDelete = () => {
        const selectedCount = Object.values(selectedKeys).filter(Boolean).length;
        if (selectedCount === 0) return;
        setConfirmDelete({ isOpen: true, type: null, id: null, isBulk: true });
    };

    const handleBulkDownload = () => {
        const { fir, evidence } = caseData || {};
        const forensicExcel = evidence?.find(e => e.description === 'Forensic Money Trail Excel Artifact');
        const otherEvidence = evidence?.filter(ev => ev.description !== 'Forensic Money Trail Excel Artifact');

        const selectedList = Object.entries(selectedKeys)
            .filter(([_, isSelected]) => isSelected)
            .map(([key]) => {
                const [type, idStr] = key.split('-');
                const id = parseInt(idStr, 10);
                let filePath = '';
                if (type === 'fir' && fir && fir.doc_id === id) filePath = fir.file_path;
                if (type === 'evidence') {
                    if (forensicExcel && forensicExcel.evidence_id === id) filePath = forensicExcel.file_path;
                    else {
                        const ev = otherEvidence?.find(e => e.evidence_id === id);
                        if (ev) filePath = ev.file_path;
                    }
                }
                return filePath;
            })
            .filter(Boolean);

        selectedList.forEach(filePath => {
            window.open(getAssetUrl(filePath), '_blank');
        });
    };

    const handleAddNote = async (e) => {
        e.preventDefault();
        if (!newNote.trim()) return;
        try {
            await api.post('/cases/notes', { case_id: id, note_text: newNote });
            setNewNote('');
            fetchCaseDetails();
            toast.success("Memo successfully added to timeline", "Memo Posted");
        } catch (err) {
            toast.error('Note uplink failed', "Protocol Error");
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
                toast.success("Excel Transactions imported successfully", "Import Complete");
                navigate(`/cases/${id}/process`);
            }
        } catch (err) {
            toast.error('Excel import failed: ' + (err.response?.data?.message || err.message), "Protocol Error");
        } finally {
            setImporting(false);
        }
    };

    const handleAddEvidence = async (e) => {
        e.preventDefault();
        const formData = new FormData();
        formData.append('case_id', id);
        formData.append('description', evidDesc);
        Array.from(evidenceFiles).forEach(file => formData.append('evidence_files', file));

        try {
            await api.post('/cases/evidence', formData);
            setShowEvidModal(false);
            setEvidenceFiles([]);
            setEvidDesc('');
            fetchCaseDetails();
            toast.success("Evidence artifact sealed in vault", "Artifact Uploaded");
        } catch (err) {
            toast.error('Artifact upload failed', "Protocol Error");
        }
    };



    if (loading) return <div className="p-20 text-center text-slate-400 font-bold uppercase tracking-widest text-xs animate-pulse">Loading case dossier...</div>;
    
    if (error) {
        return (
            <div className="max-w-2xl mx-auto mt-20 p-10 bg-white border border-rose-100 rounded-3xl shadow-xl text-center space-y-6 animate-in fade-in zoom-in duration-300">
                <div className="w-16 h-16 bg-rose-50 border border-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mx-auto shadow-sm">
                    <AlertTriangle size={32} />
                </div>
                <div>
                    <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight italic">Case Dossier Offline</h2>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Error code: CASE_ACCESS_DENIED</p>
                </div>
                <div className="p-4 bg-rose-50 text-rose-700 text-sm font-bold rounded-2xl border border-rose-100/50">
                    {error}
                </div>
                <Button variant="primary" onClick={() => navigate('/cases')} className="mx-auto" icon={ArrowLeft}>
                    Return to Evidence Vault
                </Button>
            </div>
        );
    }

    if (!caseData) return <div className="p-20 text-center text-rose-500 font-black uppercase tracking-widest">Please Wait we are processing and configuring FIR</div>;

    const { case: details, victim, transactions, notes, fir, evidence, accusedList } = caseData;
    const forensicExcel = evidence?.find(e => e.description === 'Forensic Money Trail Excel Artifact');

    // Group transactions by source_file
    const transactionGroups = (transactions || []).reduce((acc, t) => {
        const source = t.source_file || 'Legacy Excel Data';
        if (!acc[source]) acc[source] = [];
        acc[source].push(t);
        return acc;
    }, {});
    const groupedSources = Object.entries(transactionGroups);

    return (
        <div className="space-y-10 animate-in fade-in duration-500 pb-20">
            {/* Minimal Excel Upload Modal */}
            <AnimatePresence>
                {showProfileModal && (
                    <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-md">
                        <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }} className="w-full max-w-4xl overflow-y-auto max-h-[90vh]">
                            <Card className="p-0 border-none shadow-2xl overflow-hidden bg-white">
                                <div className="p-8 bg-slate-900 border-b border-slate-800 flex justify-between items-center sticky top-0 z-50">
                                    <div className="flex items-center gap-4">
                                        <div className="w-1.5 h-10 bg-emerald-500 rounded-full"></div>
                                        <div>
                                            <h2 className="text-xl font-black text-white tracking-tight uppercase">Complete Victim & OSINT Profile</h2>
                                            <p className="text-[10px] text-emerald-400 font-bold tracking-widest uppercase">Target Suspect Digital Footprints</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <Button variant="outline" size="sm" icon={Edit2} className="text-slate-300 border-slate-700 hover:bg-slate-800" onClick={() => navigate(`/cases/edit/${id}`)}>
                                            Edit Case & Profiles
                                        </Button>
                                        <button onClick={() => setShowProfileModal(false)} className="text-slate-400 hover:text-white p-2 hover:bg-slate-800 rounded-full transition-all">
                                            <X size={24} />
                                        </button>
                                    </div>
                                </div>

                                <div className="p-10 space-y-10">
                                    {/* CORE VICTIM Block */}
                                    <div>
                                        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                            <User size={14} /> Registered Subject (Victim)
                                        </h3>
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 bg-slate-50 p-6 rounded-2xl border border-slate-100">
                                            <div><p className="text-[9px] text-slate-400 font-bold uppercase mb-1">Full Name</p><p className="text-sm font-black text-slate-900">{victim?.name || 'N/A'}</p></div>
                                            <div><p className="text-[9px] text-slate-400 font-bold uppercase mb-1">Mobile Comm</p><p className="text-sm font-black text-slate-900">{victim?.mobile || 'N/A'}</p></div>
                                            <div><p className="text-[9px] text-slate-400 font-bold uppercase mb-1">Email Link</p><p className="text-sm font-bold text-slate-700 truncate">{victim?.email || 'N/A'}</p></div>
                                            <div><p className="text-[9px] text-slate-400 font-bold uppercase mb-1">Bank Name</p><p className="text-sm font-bold text-slate-700">{victim?.bank_name}</p></div>
                                            <div className="col-span-2 md:col-span-4"><p className="text-[9px] text-slate-400 font-bold uppercase mb-1">Geographic Node (Address)</p><p className="text-sm text-slate-700">{victim?.address || 'N/A'}</p></div>
                                        </div>
                                    </div>

                                    {/* DIGITAL FOOTPRINTS Block (Multiple Accused Support) */}
                                    {accusedList && accusedList.length > 0 ? (
                                        accusedList.map((accused, idx) => (
                                            <div key={idx} className="mb-10 last:mb-0 border border-slate-200 p-6 rounded-[24px] bg-slate-50 relative overflow-hidden">
                                                <div className="absolute left-0 top-0 bottom-0 w-1 bg-rose-500"></div>
                                                <div className="flex items-center gap-3 mb-6">
                                                    <div className="bg-rose-500 text-white font-black text-[10px] w-6 h-6 flex items-center justify-center rounded-full leading-none">{idx + 1}</div>
                                                    <h3 className="text-[10px] font-black text-rose-600 uppercase tracking-widest flex items-center gap-2">
                                                        <Globe size={14} /> Acquired OSINT: <span className="text-slate-900 ml-2">{accused.name || accused.alias || 'Unknown Suspect'}</span>
                                                    </h3>
                                                </div>
                                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                                                    <div className="bg-white/5 border border-white/10 p-4 rounded-xl flex items-center gap-4">
                                                        <div className="p-2 bg-slate-700 text-slate-300 rounded-lg"><User size={18} /></div>
                                                        <div className="min-w-0 flex-1"><p className="text-[9px] text-slate-500 font-bold uppercase">Alias</p><p className="text-sm font-bold text-slate-900 truncate">{accused.alias || '--'}</p></div>
                                                    </div>
                                                    <div className="bg-white/5 border border-white/10 p-4 rounded-xl flex items-center gap-4">
                                                        <div className="p-2 bg-slate-700 text-slate-300 rounded-lg"><Activity size={18} /></div>
                                                        <div className="min-w-0 flex-1"><p className="text-[9px] text-slate-500 font-bold uppercase">Mobile</p><p className="text-sm font-bold text-slate-900 truncate">{accused.mobile || '--'}</p></div>
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                                    <div className="bg-white border border-slate-200 p-4 rounded-xl flex items-center gap-4">
                                                        <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg"><MessageCircle size={18} /></div>
                                                        <div className="min-w-0 flex-1"><p className="text-[9px] text-slate-400 font-bold uppercase">WhatsApp</p><p className="text-sm font-bold text-slate-900 truncate">{accused.whatsapp_no || '--'}</p></div>
                                                    </div>
                                                    <div className="bg-white border border-slate-200 p-4 rounded-xl flex items-center gap-4">
                                                        <div className="p-2 bg-rose-50 text-rose-500 rounded-lg"><Mail size={18} /></div>
                                                        <div className="min-w-0 flex-1"><p className="text-[9px] text-slate-400 font-bold uppercase">Gmail Trace</p><p className="text-sm font-bold text-slate-900 truncate">{accused.gmail_id || '--'}</p></div>
                                                    </div>
                                                    <div className="bg-white border border-slate-200 p-4 rounded-xl flex items-center gap-4">
                                                        <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><Globe size={18} /></div>
                                                        <div className="min-w-0 flex-1"><p className="text-[9px] text-slate-400 font-bold uppercase">Facebook UID</p><p className="text-sm font-bold text-slate-900 truncate">{accused.facebook_id || '--'}</p></div>
                                                    </div>
                                                    <div className="bg-white border border-slate-200 p-4 rounded-xl flex items-center gap-4">
                                                        <div className="p-2 bg-sky-50 text-sky-500 rounded-lg"><AtSign size={18} /></div>
                                                        <div className="min-w-0 flex-1"><p className="text-[9px] text-slate-400 font-bold uppercase">Twitter / X</p><p className="text-sm font-bold text-slate-900 truncate">{accused.twitter_id || '--'}</p></div>
                                                    </div>
                                                    <div className="bg-white border border-slate-200 p-4 rounded-xl flex items-center gap-4">
                                                        <div className="p-2 bg-fuchsia-50 text-fuchsia-600 rounded-lg"><Hash size={18} /></div>
                                                        <div className="min-w-0 flex-1"><p className="text-[9px] text-slate-400 font-bold uppercase">Instagram Profile</p><p className="text-sm font-bold text-slate-900 truncate">{accused.insta_id || '--'}</p></div>
                                                    </div>
                                                    <div className="bg-white border border-slate-200 p-4 rounded-xl flex items-center gap-4">
                                                        <div className="p-2 bg-blue-50 text-blue-800 rounded-lg"><Globe size={18} /></div>
                                                        <div className="min-w-0 flex-1"><p className="text-[9px] text-slate-400 font-bold uppercase">LinkedIn Path</p><p className="text-sm font-bold text-slate-900 truncate">{accused.linkedin_id || '--'}</p></div>
                                                    </div>
                                                    <div className="bg-white border border-slate-200 p-4 rounded-xl flex items-center gap-4">
                                                        <div className="p-2 bg-cyan-50 text-cyan-600 rounded-lg"><MessageCircle size={18} /></div>
                                                        <div className="min-w-0 flex-1"><p className="text-[9px] text-slate-400 font-bold uppercase">Telegram ID</p><p className="text-sm font-bold text-slate-900 truncate">{accused.telegram_id || '--'}</p></div>
                                                    </div>
                                                    <div className="bg-white border border-slate-200 p-4 rounded-xl flex items-center gap-4 md:col-span-2">
                                                        <div className="p-2 bg-slate-100 text-slate-600 rounded-lg"><Link2 size={18} /></div>
                                                        <div className="min-w-0 flex-1"><p className="text-[9px] text-slate-400 font-bold uppercase">Website / Other </p><p className="text-sm font-bold text-slate-900 truncate">{accused.website_url || accused.other_social || '--'}</p></div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="p-10 border border-slate-200 border-dashed rounded-2xl text-center">
                                            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">No accused suspects identified for this case yet.</p>
                                        </div>
                                    )}
                                </div>
                            </Card>
                        </motion.div>
                    </div>
                )}

                {showExcelModal && (
                    <div className="fixed inset-0 z-[150] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-md">
                        <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }} className="w-full max-w-2xl overflow-y-auto">
                            <Card className="p-0 border-none shadow-2xl overflow-hidden bg-[#f8fafc]">
                                <div className="p-8 bg-white border-b border-slate-100 flex justify-between items-center sticky top-0 z-50">
                                    <div className="flex items-center gap-4">
                                        <div className="w-1.5 h-8 bg-blue-600 rounded-full"></div>
                                        <div>
                                            <h2 className="text-xl font-black text-slate-900 tracking-tight uppercase">EXCEL फ़ाइल अपलोड करें</h2>
                                            <p className="text-[10px] text-slate-400 font-bold tracking-widest uppercase">MONEY TRAIL INGESTION ENGINE</p>
                                        </div>
                                    </div>
                                    <button onClick={() => setShowExcelModal(false)} className="text-slate-400 hover:text-slate-600 p-2 hover:bg-slate-50 rounded-full transition-all">
                                        <X size={24} />
                                    </button>
                                </div>

                                <div className="p-10 space-y-8">
                                    <div className="bg-white border-2 border-dashed border-slate-200 rounded-[32px] p-12 text-center relative group hover:border-blue-400 transition-all shadow-sm">
                                        <input type="file" accept=".xlsx,.xls" onChange={(e) => setExcelFile(e.target.files[0])} className="absolute inset-0 opacity-0 cursor-pointer z-20" />
                                        <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner group-hover:scale-110 transition-transform">
                                            <Upload className="text-slate-200 group-hover:text-blue-500 transition-colors" size={24} />
                                        </div>
                                        <h3 className="text-lg font-black text-slate-900 mb-2 tracking-tight">{excelFile ? excelFile.name : 'Forensic Excel फ़ाइल चुनें'}</h3>
                                        <p className="text-slate-400 text-[10px] max-w-xs mx-auto mb-8 font-bold uppercase tracking-widest">Supports .xlsx, .xls formatted bank statements</p>

                                        <Button variant="primary" className="bg-[#cc5a51] hover:bg-[#b04a42] border-none px-10 py-3 rounded-xl text-xs font-bold shadow-xl shadow-rose-100">
                                            SELECT TARGET FILE
                                        </Button>
                                    </div>

                                    {importing && (
                                        <div className="mb-2">
                                            <div className="flex justify-between items-center text-[10px] font-bold text-blue-500 uppercase tracking-widest mb-2">
                                                <span>Processing Data & Artifacts...</span>
                                                <span className="animate-pulse">Please wait</span>
                                            </div>
                                            <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                                                <motion.div 
                                                    className="h-full bg-blue-500 rounded-full"
                                                    initial={{ width: "30%", x: "-100%" }}
                                                    animate={{ width: "30%", x: "400%" }}
                                                    transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                                                />
                                            </div>
                                        </div>
                                    )}

                                    <div className="flex gap-4">
                                        <Button
                                            variant="primary"
                                            className="flex-1 py-4 text-xs tracking-widest"
                                            disabled={!excelFile || importing}
                                            loading={importing}
                                            onClick={handleExcelUpload}
                                            icon={FileSearch}
                                        >
                                            Process & Generate Letters
                                        </Button>
                                    </div>
                                </div>
                            </Card>
                        </motion.div>
                    </div>
                )}

                {showEvidModal && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-sm">
                        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="w-full max-w-xl">
                            <Card className="p-8 border-blue-100 shadow-2xl">
                                <div className="flex justify-between items-center mb-8">
                                    <h3 className="text-xl font-bold text-slate-900 uppercase">Secure Asset Upload</h3>
                                    <button onClick={() => setShowEvidModal(false)} className="text-slate-400 hover:text-slate-600"><X size={24} /></button>
                                </div>
                                <form onSubmit={handleAddEvidence} className="space-y-6">
                                    <label className="block border-2 border-dashed border-slate-200 rounded-2xl p-8 text-center hover:border-blue-600 hover:bg-blue-50 transition-all cursor-pointer">
                                        <input type="file" multiple onChange={(e) => setEvidenceFiles(Array.from(e.target.files))} className="hidden" />
                                        <Upload className="mx-auto text-blue-600 mb-3" size={32} />
                                        <p className="text-xs font-bold text-slate-900 uppercase tracking-widest">
                                            {evidenceFiles.length > 0 ? `${evidenceFiles.length} Selected` : 'Select Digital Artifacts'}
                                        </p>
                                    </label>
                                    <div className="space-y-4">
                                        <InputField label="Evidence Description" value={evidDesc} onChange={e => setEvidDesc(e.target.value)} placeholder="Bank statement, Call logs, etc." />
                                        <div className="flex flex-wrap gap-2">
                                            {['Manual Notice', 'Notice Sent', 'Mail Letter', 'Bank Reply Mail', 'Official Letter', 'Phone Call Recording'].map(preset => (
                                                <button
                                                    key={preset}
                                                    type="button"
                                                    onClick={() => setEvidDesc(preset)}
                                                    className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-tight transition-all border ${evidDesc === preset ? 'bg-blue-600 text-white border-blue-600' : 'bg-slate-50 text-slate-500 border-slate-200 hover:border-blue-400'}`}
                                                >
                                                    {preset}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <Button type="submit" variant="primary" className="w-full h-14" disabled={evidenceFiles.length === 0}>Seal Artifact Vault</Button>
                                </form>
                            </Card>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Action Bar */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div className="flex items-center gap-5">
                    <button onClick={() => navigate(-1)} className="p-3 bg-white border border-slate-200 rounded-2xl hover:bg-blue-600 hover:text-white transition-all text-slate-400">
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase">
                                Case <span className="text-blue-600">#{details.fir_no || details.ackn_no}</span>
                            </h1>
                            <Badge variant={details.status === 'Active' ? 'default' : 'success'}>{details.status}</Badge>
                        </div>
                        <p className="text-slate-400 text-[10px] font-black tracking-widest uppercase mt-1 italic">
                            ACK_ID: {details.ackn_no || 'MANUAL'} // AUTH_LOG: {new Date(details.created_at).toLocaleDateString()}
                        </p>
                    </div>
                </div>
                <div className="flex flex-wrap gap-4 w-full md:w-auto justify-end">
                    <Button variant="outline" className="border-blue-200 text-blue-700 hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-all shadow-sm" icon={Edit2} onClick={() => navigate(`/cases/edit/${id}`)}>
                        Modify Core Protocol
                    </Button>
                    <Button variant="outline" icon={Download}>Export Intel</Button>
                    <Button variant="primary" icon={UserCheck}>Update Status</Button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Intel Sector */}
                <div className="lg:col-span-2 space-y-8">
                    {/* Information Module */}
                    <Card className="p-8 bg-white border-slate-200">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-5 mb-8">
                            <div className="flex items-center gap-3">
                                <Fingerprint className="text-blue-600" size={24} />
                                <h2 className="text-lg font-bold text-slate-900 uppercase">Subject Profile & Incident Context</h2>
                            </div>
                            <Button variant="outline" className="px-6 py-2 h-auto text-xs font-bold tracking-widest shadow-sm bg-blue-50 text-blue-600 border-none hover:bg-blue-600 hover:text-white transition-all transform hover:scale-105" icon={User} onClick={() => setShowProfileModal(true)}>
                                Victim Profile & OSINT
                            </Button>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-3 gap-10">
                            <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Victim Metadata</p>
                                <p className="text-sm font-bold text-slate-900">{victim?.name || '--'}</p>
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Contact Link</p>
                                <p className="text-sm font-mono text-slate-700">{victim?.mobile || '--'}</p>
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Disputed Assets</p>
                                <p className="text-sm font-bold text-rose-600">₹{parseFloat(details.fraud_amount).toLocaleString()}</p>
                            </div>
                        </div>

                        <div className="mt-10">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Investigation Briefing</p>
                            <div className="p-6 bg-slate-50 border border-slate-100 rounded-2xl text-sm leading-relaxed text-slate-700 relative font-medium">
                                "{details.description || 'No descriptive logs available.'}"
                            </div>
                        </div>
                    </Card>

                    {/* Investigation Timeline */}
                    <Card className="p-8">
                        <div className="flex items-center justify-between mb-8">
                            <div className="flex items-center gap-3">
                                <History className="text-blue-600" size={24} />
                                <h2 className="text-lg font-bold text-slate-900 uppercase">Operational Timeline</h2>
                            </div>
                        </div>

                        <div className="space-y-10 relative before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-[2px] before:bg-slate-100 max-h-[500px] overflow-y-auto pr-4 scrollbar-thin scrollbar-thumb-slate-200">
                            {[...notes].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).map((note, i) => (
                                <div key={i} className="relative pl-12">
                                    <div className="absolute left-0 top-1 w-6 h-6 rounded-full bg-slate-100 border-2 border-slate-200 flex items-center justify-center z-10">
                                        <MessageSquare className="w-2.5 h-2.5 text-slate-500" />
                                    </div>
                                    <div className="bg-slate-50 border border-slate-100 p-5 rounded-2xl">
                                        <div className="flex justify-between items-start mb-2">
                                            <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest italic">{note.author || 'System Admin'}</p>
                                            <p className="text-[9px] text-slate-300 font-bold">{new Date(note.created_at).toLocaleDateString()} {new Date(note.created_at).toLocaleTimeString()}</p>
                                        </div>
                                        <p className="text-xs font-medium text-slate-700 italic">"{note.note_text}"</p>
                                    </div>
                                </div>
                            ))}

                            <div className="relative pl-12">
                                <div className="absolute left-0 top-1 w-6 h-6 rounded-full bg-white border-2 border-blue-600 flex items-center justify-center z-10 shadow-sm">
                                    <div className="w-1.5 h-1.5 bg-blue-600 rounded-full"></div>
                                </div>
                                <div className="pt-0.5">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Origin Log // {new Date(details.created_at).toLocaleDateString()}</p>
                                    <p className="text-sm font-bold text-slate-900">Case dossier initialized.</p>
                                </div>
                            </div>
                        </div>
                    </Card>

                    {/* Quick Memo Access (Integrated below timeline) */}
                    <Card className="p-8">
                        <form onSubmit={handleAddNote} className="space-y-4">
                            <div className="flex items-center gap-3 mb-4">
                                <MessageSquare className="text-blue-600" size={18} />
                                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Internal Memo Link</h3>
                            </div>
                            <textarea
                                className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 text-xs h-24 outline-none focus:border-blue-600 focus:bg-white transition-all resize-none text-slate-700 placeholder:text-slate-300 font-medium"
                                placeholder="Type case briefing here..."
                                value={newNote}
                                onChange={(e) => setNewNote(e.target.value)}
                            ></textarea>
                            <Button type="submit" variant="primary" className="w-full py-4 text-[10px] tracking-widest uppercase font-black shadow-lg shadow-blue-50" icon={Send} disabled={!newNote.trim()}>
                                Broadcast Memo
                            </Button>
                        </form>
                    </Card>
                </div>

                {/* Secure Assets Sector */}
                <div className="space-y-8">
                    {/* Artifact Vault */}
                    <Card className="p-8 bg-white border-t-4 border-t-blue-600 shadow-lg shadow-slate-200/50">
                        <div className="flex items-center justify-between mb-8">
                            <div className="flex items-center gap-3">
                                <Shield className="text-blue-600" size={24} />
                                <h2 className="text-lg font-bold text-slate-900 uppercase tracking-tight">Secured Artifacts</h2>
                            </div>
                            <div className="flex gap-2">
                                {Object.values(selectedKeys).filter(Boolean).length > 0 && (
                                    <>
                                        <Button variant="ghost" className="p-2 h-auto text-blue-600 hover:bg-blue-50 text-[10px] uppercase font-black tracking-widest flex gap-2" onClick={handleBulkDownload}>
                                            <Download size={16} /> Download
                                        </Button>
                                        <Button variant="ghost" className="p-2 h-auto text-rose-600 hover:bg-rose-50 text-[10px] uppercase font-black tracking-widest flex gap-2" onClick={handleBulkDelete}>
                                            <Trash2 size={16} /> Delete
                                        </Button>
                                    </>
                                )}
                                <Button variant="ghost" className="p-1 h-auto text-blue-500 hover:bg-blue-50" onClick={() => navigate(`/cases/${id}/files`)}><Eye size={20} /></Button>
                                <Button variant="ghost" className="p-1 h-auto text-rose-600 hover:bg-rose-50" onClick={() => navigate(`/cases/${id}/files`)}><Trash2 size={20} /></Button>
                                <Button variant="ghost" className="p-1 h-auto text-blue-600" onClick={() => setShowEvidModal(true)}><Plus size={20} /></Button>
                            </div>
                        </div>

                        <div className="space-y-4">
                            {fir && (
                                <div className="p-4 bg-blue-50/50 rounded-2xl border border-blue-100 flex items-center justify-between group hover:bg-blue-50 transition-all">
                                    <div className="flex items-center gap-4">
                                        <input 
                                            type="checkbox" 
                                            checked={Boolean(selectedKeys[`fir-${fir.doc_id}`])}
                                            onChange={() => handleToggleSelect('fir', fir.doc_id)}
                                            className="w-4 h-4 text-rose-600 rounded border-slate-300 focus:ring-rose-500 cursor-pointer"
                                        />
                                        <div className="p-2 bg-blue-100 rounded-lg text-blue-600"><FileText size={18} /></div>
                                        <div>
                                            <p className="text-[11px] font-black text-slate-900 truncate max-w-[120px] uppercase">FIR_ROOT_DOSS</p>
                                            <p className="text-[8px] text-slate-400 font-bold uppercase mt-0.5">Auth Artifact</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <a href={getAssetUrl(fir.file_path)} target="_blank" rel="noreferrer" className="p-2 text-blue-600 bg-white border border-blue-50 rounded-lg shadow-sm hover:bg-blue-600 hover:text-white transition-all"><Eye size={14} /></a>
                                        <a href={getAssetUrl(fir.file_path)} target="_blank" rel="noreferrer" className="p-2 text-blue-600 bg-white border border-blue-50 rounded-lg shadow-sm hover:bg-blue-600 hover:text-white transition-all"><Download size={14} /></a>
                                        <button onClick={() => handleDeleteFile('fir', fir.doc_id)} className="p-2 text-rose-500 bg-white border border-rose-50 rounded-lg shadow-sm hover:bg-rose-600 hover:text-white transition-all"><Trash2 size={14} /></button>
                                    </div>
                                </div>
                            )}

                            {forensicExcel && (
                                <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 flex items-center justify-between group">
                                    <div className="flex items-center gap-4">
                                        <input 
                                            type="checkbox" 
                                            checked={Boolean(selectedKeys[`evidence-${forensicExcel.evidence_id}`])}
                                            onChange={() => handleToggleSelect('evidence', forensicExcel.evidence_id)}
                                            className="w-4 h-4 text-rose-600 rounded border-slate-300 focus:ring-rose-500 cursor-pointer"
                                        />
                                        <div className="p-2 bg-emerald-100 rounded-lg text-emerald-600"><FileSpreadsheet size={18} /></div>
                                        <div>
                                            <p className="text-[11px] font-black text-slate-900 truncate max-w-[120px] uppercase">{forensicExcel.file_name}</p>
                                            <p className="text-[8px] text-emerald-600 font-black uppercase mt-0.5 italic flex items-center gap-1">
                                                <BadgeCheck size={10} /> Forensic Money Trail
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <button onClick={() => navigate(`/cases/${id}/process`)} title="Process Logic" className="p-2 bg-white text-emerald-600 rounded-lg shadow-sm border border-emerald-100 hover:bg-emerald-600 hover:text-white transition-all"><Play size={14} /></button>
                                        <a href={getAssetUrl(forensicExcel.file_path)} target="_blank" rel="noreferrer" title="Download Excel" className="p-2 bg-white text-emerald-600 rounded-lg shadow-sm border border-emerald-100 hover:bg-emerald-600 hover:text-white transition-all"><Download size={14} /></a>
                                        <button onClick={() => handleDeleteFile('evidence', forensicExcel.evidence_id)} title="Purge Artifact" className="p-2 bg-white text-rose-500 rounded-lg shadow-sm border border-rose-100 hover:bg-rose-600 hover:text-white transition-all"><Trash2 size={14} /></button>
                                    </div>
                                </div>
                            )}

                            {evidence?.filter(ev => ev.description !== 'Forensic Money Trail Excel Artifact').map(ev => {
                                let IconComp = Shield;
                                let iconColor = "text-slate-400";
                                let bgColor = "bg-slate-50";

                                if (ev.description?.toLowerCase().includes('notice')) {
                                    IconComp = FileSearch;
                                    iconColor = "text-amber-600";
                                    bgColor = "bg-amber-50";
                                }
                                else if (ev.description?.toLowerCase().includes('mail') || ev.description?.toLowerCase().includes('email')) {
                                    IconComp = Mail;
                                    iconColor = "text-blue-600";
                                    bgColor = "bg-blue-50";
                                }
                                else if (ev.description?.toLowerCase().includes('letter')) {
                                    IconComp = FileText;
                                    iconColor = "text-emerald-600";
                                    bgColor = "bg-emerald-50";
                                }

                                return (
                                    <div key={ev.evidence_id} className={`p-4 ${bgColor} rounded-2xl border border-slate-100 flex items-center justify-between group hover:bg-white hover:border-blue-100 transition-all`}>
                                        <div className="flex items-center gap-4">
                                            <input 
                                                type="checkbox" 
                                                checked={Boolean(selectedKeys[`evidence-${ev.evidence_id}`])}
                                                onChange={() => handleToggleSelect('evidence', ev.evidence_id)}
                                                className="w-4 h-4 text-rose-600 rounded border-slate-300 focus:ring-rose-500 cursor-pointer"
                                            />
                                            <div className={`p-2 bg-white rounded-lg ${iconColor} border border-slate-100`}><IconComp size={18} /></div>
                                            <div>
                                                <p className="text-[11px] font-black text-slate-900 truncate max-w-[200px] uppercase tracking-tight">{ev.file_name}</p>
                                                <p className="text-[8px] text-slate-400 font-bold uppercase mt-0.5 italic">{ev.description || 'EVIDENCE_BLOB'}</p>
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            <a href={getAssetUrl(ev.file_path)} target="_blank" rel="noreferrer" title="Quick View" className="p-2 text-blue-600 bg-white border border-blue-50 rounded-lg shadow-sm hover:bg-blue-600 hover:text-white transition-all"><Eye size={14} /></a>
                                            <a href={getAssetUrl(ev.file_path)} target="_blank" rel="noreferrer" title="Download Source" className="p-2 text-blue-600 bg-white border border-blue-50 rounded-lg shadow-sm hover:bg-blue-600 hover:text-white transition-all"><Download size={14} /></a>
                                            <button onClick={() => handleDeleteFile('evidence', ev.evidence_id)} title="Delete Forever" className="p-2 text-rose-500 bg-white border border-rose-50 rounded-lg shadow-sm hover:bg-rose-600 hover:text-white transition-all"><Trash2 size={14} /></button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </Card>

                    {/* Transaction Stream (Money Trail) */}
                    <Card className="p-8 border-t-4 border-t-emerald-600">
                        <div className="flex items-center justify-between mb-8">
                            <div className="flex items-center gap-3">
                                <Banknote className="text-emerald-600" size={24} />
                                <h2 className="text-lg font-bold text-slate-900 uppercase tracking-tight">Money Trail</h2>
                            </div>
                            <div className="flex gap-3">
                                <button onClick={() => navigate(`/cases/${id}/trail`)} title="Money Trail Analyzer" className="flex items-center gap-2 px-3 py-2 text-indigo-600 bg-indigo-50 hover:bg-indigo-600 hover:text-white rounded-xl transition-all shadow-sm border border-indigo-100 text-[9px] font-black uppercase tracking-widest">
                                    <Network size={14} /> Trail Graph
                                </button>
                                <button onClick={() => setShowExcelModal(true)} title="Upload Forensic Excel" className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all shadow-sm border border-slate-100"><Upload size={18} /></button>
                                <button onClick={() => navigate(`/cases/${id}/files`)} title="View Excel History" className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all shadow-sm border border-slate-100"><Eye size={18} /></button>
                                <button onClick={() => navigate(`/cases/${id}/files`)} title="Manage All Files" className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all shadow-sm border border-slate-100"><Trash2 size={18} /></button>
                                <button onClick={() => navigate(`/cases/${id}/process`)} title="Process Letters" className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all shadow-sm border border-slate-100"><Play size={18} /></button>
                            </div>
                        </div>

                        {/* LETTERS & NOTICES ENGINE BUTTON */}
                        <button
                            onClick={() => { setNoticesTab('wizard'); setShowNoticesEngine(true); }}
                            className="w-full mb-6 flex items-center justify-between px-6 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-2xl transition-all shadow-lg shadow-blue-200 group"
                        >
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-white/20 rounded-xl">
                                    <FileText size={18} />
                                </div>
                                <div className="text-left">
                                    <p className="text-[11px] font-black uppercase tracking-widest">Letters & Notices Engine</p>
                                    <p className="text-[9px] text-blue-200 font-bold uppercase tracking-widest">KYC · Freeze · Hold · Statement · Txn Details</p>
                                </div>
                            </div>
                            <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
                        </button>

                        {forensicExcel ? (
                            <Button
                                variant="primary"
                                className="w-full mb-6 bg-[#cc5a51] border-none shadow-xl shadow-rose-50 py-5 text-[10px] tracking-[0.2em] font-black"
                                onClick={() => navigate(`/cases/${id}/process`)}
                                icon={FileSearch}
                            >
                                LETTER PROCESS
                            </Button>
                        ) : (
                            <Button
                                variant="outline"
                                className="w-full mb-6 border-dashed border-slate-200 py-6 text-[10px] tracking-widest font-black text-slate-400"
                                onClick={() => setShowExcelModal(true)}
                                icon={FileSpreadsheet}
                            >
                                IMPORT EXCEL FILE
                            </Button>
                        )}

                        {/* DISPATCH REGISTER BUTTON */}
                        <button
                            onClick={() => { setNoticesTab('register'); setShowNoticesEngine(true); }}
                            className="w-full mb-8 flex items-center justify-between px-6 py-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-2xl transition-all shadow-lg shadow-emerald-200 group"
                        >
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-white/20 rounded-xl">
                                    <Inbox size={18} />
                                </div>
                                <div className="text-left">
                                    <p className="text-[11px] font-black uppercase tracking-widest">Dispatch Register</p>
                                    <p className="text-[9px] text-emerald-200 font-bold uppercase tracking-widest">View & Print Generated Official Records</p>
                                </div>
                            </div>
                            <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
                        </button>

                    </Card>
                </div>
            </div>

            {/* Delete Confirmation Modal */}
            <AnimatePresence>
                {confirmDelete.isOpen && (
                    <div className="fixed inset-0 z-[500] flex items-center justify-center p-6 backdrop-blur-2xl bg-slate-900/80">
                        <motion.div 
                            initial={{ scale: 0.9, opacity: 0, y: 30 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 30 }}
                            className="bg-white w-full max-w-md rounded-[48px] shadow-[0_0_100px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col border border-rose-100"
                        >
                            <div className="p-8 text-center space-y-6">
                                <div className="w-20 h-20 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-6">
                                    <AlertTriangle size={40} />
                                </div>
                                <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Are you sure?</h3>
                                <p className="text-sm font-bold text-slate-500 tracking-wide uppercase">
                                    {confirmDelete.isBulk 
                                        ? `You are about to delete ${Object.values(selectedKeys).filter(Boolean).length} selected file(s).` 
                                        : 'You are about to delete this file.'} 
                                    This action cannot be undone.
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
                                    {(!deleteProgress.isProcessing && deleteProgress.total > 0 && confirmDelete.isBulk) ? (
                                        <button 
                                            onClick={() => {
                                                setConfirmDelete({ isOpen: false, type: null, id: null, isBulk: false });
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
                                                    setConfirmDelete({ isOpen: false, type: null, id: null, isBulk: false });
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

            {/* Notices Engine Modal */}
            <AnimatePresence>
                {showNoticesEngine && (
                    <NoticesEngine
                        caseId={id}
                        caseData={caseData}
                        onClose={() => setShowNoticesEngine(false)}
                        initialTab={noticesTab}
                    />
                )}
            </AnimatePresence>
        </div>
    );
};

export default CaseDetails;
