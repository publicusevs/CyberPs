import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { 
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

    const fir = caseData?.fir;
    const evidence = caseData?.evidence || [];
    const totalFiles = (fir ? 1 : 0) + evidence.length;

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
                {/* FIR Section */}
                {fir && (
                    <Card className="p-0 overflow-hidden border-blue-100 shadow-xl bg-white">
                        <div className="px-8 py-4 bg-blue-50/50 border-b border-blue-100 flex justify-between items-center">
                            <div className="flex items-center gap-3">
                                <Shield className="text-blue-600" size={18} />
                                <span className="text-[10px] font-black text-slate-900 uppercase tracking-widest italic">Core Authorization Dossier</span>
                            </div>
                            <Badge className="bg-blue-600 text-white border-transparent">PRIMARY_FIR</Badge>
                        </div>
                        <div className="p-8 flex items-center justify-between">
                            <div className="flex items-center gap-6">
                                <div className="p-4 bg-blue-50 rounded-2xl text-blue-600 border border-blue-100 ring-4 ring-blue-50/50">
                                    <FileText size={28} />
                                </div>
                                <div className="space-y-1">
                                    <h3 className="text-lg font-black text-slate-900 tracking-tight uppercase">{fir.file_name}</h3>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest flex items-center gap-2">
                                        PATH: {fir.file_path} // TYPE: {fir.file_type}
                                    </p>
                                </div>
                            </div>
                            <div className="flex gap-4">
                                <a 
                                    href={`http://localhost:5000/${fir.file_path}`} 
                                    target="_blank" 
                                    rel="noreferrer" 
                                    className="p-4 bg-slate-50 text-slate-400 hover:text-blue-600 hover:bg-white rounded-2xl transition-all border border-slate-100 shadow-sm"
                                >
                                    <Download size={20} />
                                </a>
                                <Button 
                                    variant="outline" 
                                    className="border-rose-100 text-rose-500 hover:bg-rose-500 hover:text-white p-4 h-auto shadow-sm"
                                    onClick={() => handleDelete('fir', fir.doc_id)}
                                    disabled={deletingId === fir.doc_id}
                                >
                                    {deletingId === fir.doc_id ? <Loader2 className="animate-spin" size={20} /> : <Trash2 size={20} />}
                                </Button>
                            </div>
                        </div>
                    </Card>
                )}

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
                                                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">
                                                            {ev.description || 'GENERIC_EVIDENCE'} // {new Date(ev.uploaded_at).toLocaleDateString()}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="flex gap-3">
                                                    <a 
                                                        href={`http://localhost:5000/${ev.file_path}`} 
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
        </div>
    );
};

export default FileManager;
