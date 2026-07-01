import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
    ChevronLeft, Save, Printer, Download, 
    FileSignature, Edit3, Eye, CheckCircle2,
    Shield, Type, Bold, Italic, List
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../services/api';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

const NoticeEditor = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [notice, setNotice] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const editorRef = useRef(null);
    const lastSelectionRef = useRef(null);

    useEffect(() => {
        const fetchLatestNotice = async () => {
            try {
                const res = await api.get(`/notices/case/${id}`);
                if (res.data.success && res.data.data.length > 0) {
                    setNotice(res.data.data[0]);
                } else {
                    navigate(`/cases/${id}/notices`);
                }
            } catch (err) {
                console.error('Notice retrieval failed');
            } finally {
                setLoading(false);
            }
        };
        fetchLatestNotice();
    }, [id]);

    const handleSave = async () => {
        setSaving(true);
        try {
            const updatedContent = editorRef.current.innerHTML;
            await api.put(`/notices/${notice.notice_id}`, {
                notice_content: updatedContent,
                status: 'Issued'
            });
            setShowSuccess(true);
            setTimeout(() => setShowSuccess(false), 3000);
        } catch (err) {
            alert('SAVE_ERROR: Internal persistence link broken');
        } finally {
            setSaving(false);
        }
    };

    const handleDownloadPDF = async () => {
        const element = editorRef.current;
        const canvas = await html2canvas(element, {
            scale: 2,
            useCORS: true,
            logging: false
        });
        
        const imgData = canvas.toDataURL('image/jpeg', 0.80);
        const pdf = new jsPDF('p', 'mm', 'a4');
        const imgWidth = 210;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        
        pdf.addImage(imgData, 'JPEG', 0, 0, imgWidth, imgHeight, undefined, 'FAST');
        pdf.save(`NOTICE_${notice.platform_name}_CASE_${id}.pdf`);
    };

    const formatText = (command, value = null) => {
        editorRef.current.focus();
        if (lastSelectionRef.current) {
            const sel = window.getSelection();
            sel.removeAllRanges();
            sel.addRange(lastSelectionRef.current);
        }
        document.execCommand(command, false, value);
    };

    const saveSelection = () => {
        const sel = window.getSelection();
        if (sel.rangeCount > 0) {
            lastSelectionRef.current = sel.getRangeAt(0);
        }
    };

    const applyFontSize = (size) => {
        editorRef.current.focus();
        if (lastSelectionRef.current) {
            const sel = window.getSelection();
            sel.removeAllRanges();
            sel.addRange(lastSelectionRef.current);
        }

        document.execCommand('fontSize', false, '7');
        
        const fixFonts = () => {
            const fontElements = Array.from(editorRef.current.getElementsByTagName('font'));
            fontElements.forEach(font => {
                if (font.size === '7' || font.getAttribute('size') === '7') {
                    const span = document.createElement('span');
                    span.style.fontSize = `${size}px`;
                    span.innerHTML = font.innerHTML;
                    font.parentNode.replaceChild(span, font);
                }
            });
        };

        fixFonts();
        fixFonts();
    };

    const handlePaste = (e) => {
        const items = (e.clipboardData || e.originalEvent.clipboardData).items;
        for (let index in items) {
            const item = items[index];
            if (item.kind === 'file') {
                const blob = item.getAsFile();
                const reader = new FileReader();
                reader.onload = (event) => {
                    const img = `<img src="${event.target.result}" style="max-width: 100%; height: auto; border-radius: 8px; margin: 10px 0;" />`;
                    document.execCommand('insertHTML', false, img);
                };
                reader.readAsDataURL(blob);
                e.preventDefault();
            }
        }
    };

    if (loading) return <div className="p-20 text-center animate-pulse font-black italic uppercase text-slate-400">Booting Editorial Engine...</div>;

    return (
        <div className="max-w-5xl mx-auto space-y-8 pb-20">
            {/* Context Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div className="flex items-center gap-5">
                    <button onClick={() => navigate(-1)} className="p-3 bg-white border border-slate-200 rounded-2xl hover:bg-emerald-600 hover:text-white transition-all text-slate-400">
                        <ChevronLeft size={20} />
                    </button>
                    <div>
                        <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase italic">
                            Notice <span className="text-emerald-600">Editorial</span>
                        </h1>
                        <p className="text-slate-400 text-[10px] font-black tracking-widest uppercase mt-1 italic flex items-center gap-2">
                            <Edit3 size={12} className="text-emerald-500" /> MODE: FINAL_CALIBRATION // TARGET: {notice?.platform_name}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button onClick={handleDownloadPDF} className="flex items-center gap-3 px-6 py-3 bg-white border border-slate-200 text-slate-700 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-slate-50 transition-all shadow-sm">
                        <Download size={16} /> PDF_EXPORT
                    </button>
                    <button 
                        onClick={handleSave}
                        disabled={saving}
                        className="flex items-center gap-3 px-8 py-3 bg-slate-900 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-emerald-600 transition-all shadow-xl shadow-slate-200 active:scale-95"
                    >
                        {saving ? 'SAVING...' : <><Save size={16} /> COMMIT_RECORDS</>}
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                {/* Editor Sidebar / Toolbar */}
                <div className="lg:col-span-1 flex lg:flex-col gap-3 sticky top-32 z-20">
                    <Card className="p-2 bg-slate-900 border-none flex lg:flex-col gap-2 shadow-2xl">
                        <button onClick={() => formatText('bold')} className="p-3 text-white/50 hover:text-blue-400 hover:bg-white/10 rounded-lg transition-all" title="Bold"><Bold size={18} /></button>
                        <button onClick={() => formatText('italic')} className="p-3 text-white/50 hover:text-blue-400 hover:bg-white/10 rounded-lg transition-all" title="Italic"><Italic size={18} /></button>
                        <button onClick={() => formatText('insertUnorderedList')} className="p-3 text-white/50 hover:text-blue-400 hover:bg-white/10 rounded-lg transition-all" title="Bullet List"><List size={18} /></button>
                        <div className="h-px bg-white/10 mx-2 hidden lg:block"></div>
                        <select 
                            onChange={(e) => applyFontSize(e.target.value)}
                            className="bg-transparent text-white/50 text-[10px] font-black outline-none cursor-pointer hover:text-blue-400 p-2 text-center"
                            defaultValue="16"
                        >
                            {[8, 9, 10, 11, 12, 14, 16, 18, 20, 22, 24, 26, 28, 32, 36, 40, 48, 50].map(size => (
                                <option key={size} value={size}>{size}px</option>
                            ))}
                        </select>
                        <div className="h-px bg-white/10 mx-2 hidden lg:block"></div>
                        <button onClick={() => window.print()} className="p-3 text-white/50 hover:text-emerald-400 hover:bg-white/10 rounded-lg transition-all" title="Print"><Printer size={18} /></button>
                    </Card>
                </div>

                {/* The Paper / Canvas */}
                <Card className="lg:col-span-11 bg-white border border-slate-200 shadow-2xl relative overflow-hidden p-0 mb-10">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-slate-50 rounded-bl-full -mr-10 -mt-10 border border-slate-100 flex items-center justify-center p-8 opacity-40">
                        <Shield className="text-slate-200" size={60} />
                    </div>
                    
                    <div 
                        key={notice.notice_id}
                        ref={editorRef}
                        contentEditable="true"
                        suppressContentEditableWarning
                        onPaste={handlePaste}
                        onMouseUp={saveSelection}
                        onKeyUp={saveSelection}
                        className="min-h-[1000px] outline-none prose prose-slate max-w-none text-slate-800 focus:bg-slate-50/30 transition-colors p-10 cursor-text"
                        dangerouslySetInnerHTML={{ __html: notice.notice_content }}
                    />
                </Card>
            </div>

            <AnimatePresence>
                {showSuccess && (
                    <motion.div 
                        initial={{ opacity: 0, y: 50 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 50 }}
                        className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-emerald-600 text-white px-8 py-4 rounded-2xl shadow-2xl flex items-center gap-4 z-[100] border-t-4 border-emerald-400"
                    >
                        <CheckCircle2 size={24} />
                        <div>
                            <p className="font-black uppercase italic tracking-widest text-[10px] opacity-80">Sync Complete</p>
                            <p className="font-bold text-sm">Legal notice record permanently committed to dossier history.</p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <style>{`
                [contenteditable] {
                    caret-color: #3b82f6;
                }
                .prose img {
                    display: block;
                    max-width: 100%;
                    height: auto;
                    border-radius: 12px;
                    margin: 20px 0;
                    box-shadow: 0 10px 30px rgba(0,0,0,0.1);
                }
                @media print {
                    header, aside, .no-print, button { display: none !important; }
                    body { background: white !important; }
                    .prose { padding: 0 !important; }
                }
            `}</style>
        </div>
    );
};

export default NoticeEditor;
