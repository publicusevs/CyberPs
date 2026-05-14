import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
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

const FileManager = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [caseData, setCaseData] = useState(null);
    const [deletingId, setDeletingId] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(null);

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

    const handleDelete = async (type, fileId) => {
        if (!window.confirm('Are you sure you want to delete this file? This will also remove associated data from the database and folder.')) return;
        
        setDeletingId(fileId);
        try {
            const res = await api.post('/cases/delete-file', { type, id: fileId });
            if (res.data.success) {
                // Refresh list
                fetchFiles();
            }
        } catch (err) {
            alert('Delete failed: ' + (err.response?.data?.message || err.message));
        } finally {
            setDeletingId(null);
        }
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
                                    onClick={() => setPreviewUrl(`http://localhost:${__BACKEND_PORT__}/${doc.file_path.replace(/^\//, '')}`)}
                                    className="p-4 bg-slate-50 text-slate-400 hover:text-indigo-600 hover:bg-white rounded-2xl transition-all border border-slate-100 shadow-sm"
                                >
                                    <Eye size={20} />
                                </button>
                                <a 
                                    href={`http://localhost:${__BACKEND_PORT__}/${doc.file_path.replace(/^\//, '')}`} 
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
                                                        onClick={() => setPreviewUrl(`http://localhost:${__BACKEND_PORT__}/${ev.file_path.replace(/^\//, '')}#view=FitH`)}
                                                        className="p-3 bg-white text-slate-400 hover:text-indigo-600 rounded-xl transition-all border border-slate-100 shadow-sm"
                                                    >
                                                        <Eye size={18} />
                                                    </button>
                                                    <a 
                                                        href={`http://localhost:${__BACKEND_PORT__}/${ev.file_path.replace(/^\//, '')}`} 
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
        </div>
    );
};

export default FileManager;
