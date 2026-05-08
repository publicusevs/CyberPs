import React, { useState, useEffect, useRef } from 'react';
import { 
    Plus, Search, Edit3, Trash2, Eye, Copy, 
    ChevronLeft, Save, Shield, Type, Hash, 
    Table, Layout, CheckCircle2, AlertCircle,
    Bold, Italic, Underline, List, AlignLeft, AlignCenter, AlignRight,
    Image as ImageIcon, X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../services/api';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';

const TemplatesConfig = () => {
    const [view, setView] = useState('list'); // 'list' | 'editor'
    const [templates, setTemplates] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTemplate, setActiveTemplate] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [saving, setSaving] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const [printMode, setPrintMode] = useState(false);
    
    // Modal states
    const [modalConfig, setModalConfig] = useState({ show: false, type: 'field', name: '', defaultValue: '' });
    const lastSelectionRef = useRef(null);

    const editorRef = useRef(null);

    useEffect(() => {
        fetchTemplates();
    }, []);

    const fetchTemplates = async () => {
        setLoading(true);
        try {
            const res = await api.get('/templates');
            if (res.data.success) {
                setTemplates(res.data.data);
            }
        } catch (err) {
            console.error('Failed to fetch templates');
        } finally {
            setLoading(false);
        }
    };

    const handleCreateNew = () => {
        setActiveTemplate({
            template_name: '',
            template_type: 'Standard',
            subject_text: '',
            body_text: '',
            footer_text: '',
            json_data: {
                fields: [],
                table_columns: [],
                mapping: {}
            }
        });
        setPrintMode(false);
        setView('editor');
    };

    const handleEdit = (tpl) => {
        // Parse json_data if it's a string
        let jsonData = tpl.json_data;
        if (typeof jsonData === 'string') {
            try {
                jsonData = JSON.parse(jsonData);
            } catch (e) {
                jsonData = { fields: [], table_columns: [], mapping: {} };
            }
        }
        setActiveTemplate({ ...tpl, json_data: jsonData });
        setPrintMode(false); // Ensure we start in editor mode
        setView('editor');
    };

    const handleDuplicate = async (tpl) => {
        const newName = prompt('Enter new template name:', `${tpl.template_name} (Copy)`);
        if (!newName) return;

        const duplicated = { 
            ...tpl, 
            template_name: newName,
            template_id: undefined 
        };
        try {
            await api.post('/templates', duplicated);
            fetchTemplates();
        } catch (err) {
            alert('DUPLICATION_ERROR: Likely name already exists.');
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('PERMANENT_ERASURE_PROTOCOL: Are you sure you want to delete this template?')) return;
        try {
            await api.delete(`/templates/${id}`);
            fetchTemplates();
        } catch (err) {
            alert('DELETE_ERROR');
        }
    };

    const handleSave = async () => {
        if (!activeTemplate.template_name) {
            alert('VALIDATION_ERROR: Template name is required.');
            return;
        }

        setSaving(true);
        try {
            const payload = {
                ...activeTemplate,
                body_text: editorRef.current.innerHTML
            };

            if (activeTemplate.template_id) {
                await api.put(`/templates/${activeTemplate.template_id}`, payload);
            } else {
                await api.post('/templates', payload);
            }
            
            setShowSuccess(true);
            setTimeout(() => {
                setShowSuccess(false);
                setView('list');
                fetchTemplates();
            }, 1500);
        } catch (err) {
            alert('SAVE_ERROR: Persistence failure.');
        } finally {
            setSaving(false);
        }
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

    const applyFontSize = (size) => {
        editorRef.current.focus();
        if (lastSelectionRef.current) {
            const sel = window.getSelection();
            sel.removeAllRanges();
            sel.addRange(lastSelectionRef.current);
        }

        document.execCommand('fontSize', false, '7');
        
        // Use a more aggressive approach to find and replace font tags
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
        // Sometimes nested tags need a second pass
        fixFonts();
    };

    const handleImageUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                const img = `<img src="${event.target.result}" style="max-width: 100%; height: auto; border-radius: 8px; margin: 10px 0;" />`;
                document.execCommand('insertHTML', false, img);
            };
            reader.readAsDataURL(file);
        }
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

    const saveSelection = () => {
        const sel = window.getSelection();
        if (sel.rangeCount > 0) {
            lastSelectionRef.current = sel.getRangeAt(0);
        }
    };

    const insertPlaceholder = (name) => {
        const placeholder = `{${name}}`;
        editorRef.current.focus();
        
        if (lastSelectionRef.current) {
            const sel = window.getSelection();
            sel.removeAllRanges();
            sel.addRange(lastSelectionRef.current);
        }
        
        document.execCommand('insertText', false, placeholder);
        
        // Update last selection after insertion
        const sel = window.getSelection();
        if (sel.rangeCount > 0) {
            lastSelectionRef.current = sel.getRangeAt(0);
        }
    };

    const openModal = (type) => {
        setModalConfig({ show: true, type, name: '', defaultValue: '' });
    };

    const handleModalSubmit = () => {
        const { type, name, defaultValue } = modalConfig;
        if (!name) return;

        // Capture current editor content to prevent reset
        const currentBody = editorRef.current?.innerHTML || activeTemplate.body_text;

        if (type === 'field') {
            const exists = activeTemplate.json_data.fields.some(f => f.name === name);
            if (exists) return alert('Field already exists.');

            setActiveTemplate(prev => ({
                ...prev,
                body_text: currentBody,
                json_data: {
                    ...prev.json_data,
                    fields: [...prev.json_data.fields, { name, type: 'text', defaultValue }]
                }
            }));
        } else {
            const exists = activeTemplate.json_data.table_columns.includes(name);
            if (exists) return alert('Column already exists.');

            setActiveTemplate(prev => ({
                ...prev,
                body_text: currentBody,
                json_data: {
                    ...prev.json_data,
                    table_columns: [...prev.json_data.table_columns, name]
                }
            }));
        }
        setModalConfig({ show: false, type: 'field', name: '', defaultValue: '' });
    };

    const removeField = (name) => {
        const currentBody = editorRef.current?.innerHTML || activeTemplate.body_text;
        setActiveTemplate(prev => ({
            ...prev,
            body_text: currentBody,
            json_data: {
                ...prev.json_data,
                fields: prev.json_data.fields.filter(f => f.name !== name)
            }
        }));
    };

    const removeColumn = (name) => {
        const currentBody = editorRef.current?.innerHTML || activeTemplate.body_text;
        setActiveTemplate(prev => ({
            ...prev,
            body_text: currentBody,
            json_data: {
                ...prev.json_data,
                table_columns: prev.json_data.table_columns.filter(c => c !== name)
            }
        }));
    };

    const getProcessedHTML = (html) => {
        if (!html) return '';
        let processed = html;
        if (activeTemplate?.json_data?.fields) {
            activeTemplate.json_data.fields.forEach(field => {
                const regex = new RegExp(`\\{${field.name}\\}`, 'g');
                processed = processed.replace(regex, `<span class="bg-blue-50 text-blue-700 px-1 rounded border border-blue-200 print:bg-transparent print:border-none print:p-0">${field.defaultValue || `[${field.name}]`}</span>`);
            });
        }
        if (activeTemplate?.json_data?.table_columns) {
            activeTemplate.json_data.table_columns.forEach(col => {
                const regex = new RegExp(`\\{${col}\\}`, 'g');
                processed = processed.replace(regex, `<span class="bg-emerald-50 text-emerald-700 px-1 rounded border border-emerald-200 print:bg-transparent print:border-none print:p-0">[${col}]</span>`);
            });
        }
        return processed;
    };

    const filteredTemplates = templates.filter(t => 
        t.template_name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (view === 'list') {
        return (
            <div className="space-y-8 pb-20">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div>
                        <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic">
                            Templates <span className="text-blue-600">Config</span>
                        </h1>
                        <p className="text-slate-400 text-[10px] font-black tracking-widest uppercase mt-2 italic flex items-center gap-2">
                            <Shield size={12} className="text-blue-500" /> ADMIN_TERMINAL // DOC_AUTOMATION_V2
                        </p>
                    </div>
                    <div className="flex items-center gap-4 w-full md:w-auto">
                        <div className="relative flex-1 md:w-80 group">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors" size={18} />
                            <input 
                                type="text" 
                                placeholder="SEARCH_TEMPLATES..." 
                                className="w-full pl-12 pr-4 py-3.5 bg-white border border-slate-200 rounded-2xl text-[10px] font-black tracking-widest outline-none focus:ring-4 focus:ring-blue-500/5 transition-all"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <Button 
                            onClick={handleCreateNew}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-2xl shadow-xl shadow-blue-100 flex items-center gap-3 active:scale-95"
                        >
                            <Plus size={20} /> <span className="font-black text-xs tracking-widest uppercase italic">Create Template</span>
                        </Button>
                    </div>
                </div>

                <Card className="border-none shadow-2xl shadow-slate-200/50 overflow-hidden bg-white/80 backdrop-blur-xl">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50/50 border-b border-slate-100">
                                    <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Template Details</th>
                                    <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Type</th>
                                    <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Created Date</th>
                                    <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Last Updated</th>
                                    <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {loading ? (
                                    <tr>
                                        <td colSpan="5" className="px-8 py-20 text-center animate-pulse">
                                            <div className="flex flex-col items-center gap-4">
                                                <div className="w-12 h-12 rounded-full border-4 border-blue-100 border-t-blue-600 animate-spin"></div>
                                                <p className="font-black text-[10px] text-slate-400 tracking-[0.3em] uppercase italic">Syncing Template Registry...</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : filteredTemplates.length === 0 ? (
                                    <tr>
                                        <td colSpan="5" className="px-8 py-20 text-center">
                                            <p className="font-black text-slate-300 tracking-widest uppercase italic">No templates found in active dossier.</p>
                                        </td>
                                    </tr>
                                ) : filteredTemplates.map(tpl => (
                                    <tr key={tpl.template_id} className="hover:bg-slate-50/50 transition-colors group">
                                        <td className="px-8 py-6">
                                            <div>
                                                <p className="text-sm font-black text-slate-900 uppercase italic group-hover:text-blue-600 transition-colors">{tpl.template_name}</p>
                                                <p className="text-[9px] font-bold text-slate-400 mt-1 uppercase tracking-tighter">ID: {tpl.template_id}</p>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <span className="px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-[9px] font-black uppercase italic border border-blue-100">
                                                {tpl.template_type}
                                            </span>
                                        </td>
                                        <td className="px-8 py-6">
                                            <p className="text-[10px] font-bold text-slate-500 uppercase">{new Date(tpl.created_at).toLocaleDateString()}</p>
                                        </td>
                                        <td className="px-8 py-6">
                                            <p className="text-[10px] font-bold text-slate-500 uppercase">{new Date(tpl.updated_at).toLocaleDateString()}</p>
                                        </td>
                                        <td className="px-8 py-6">
                                            <div className="flex items-center justify-end gap-2">
                                                <button onClick={() => handleEdit(tpl)} className="p-2.5 bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white rounded-xl transition-all shadow-sm flex items-center gap-2 px-4" title="View / Edit">
                                                    <Eye size={16} /> <span className="text-[9px] font-black uppercase italic">View / Edit</span>
                                                </button>
                                                <button onClick={() => { handleEdit(tpl); setPrintMode(true); }} className="p-2.5 bg-slate-900 text-white hover:bg-slate-800 rounded-xl transition-all shadow-lg flex items-center gap-2 px-4" title="Final Print View">
                                                    <ImageIcon size={16} /> <span className="text-[9px] font-black uppercase italic">Final Print</span>
                                                </button>
                                                <button onClick={() => handleDuplicate(tpl)} className="p-2.5 bg-slate-50 text-slate-400 hover:bg-emerald-50 hover:text-emerald-600 rounded-xl transition-all" title="Duplicate"><Copy size={16} /></button>
                                                <button onClick={() => handleDelete(tpl.template_id)} className="p-2.5 bg-slate-50 text-slate-400 hover:bg-rose-50 hover:text-rose-600 rounded-xl transition-all" title="Delete"><Trash2 size={16} /></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Card>
            </div>
        );
    }

    const handleEnterPrintMode = () => {
        // Sync editor content to state first
        const currentBody = editorRef.current?.innerHTML || activeTemplate.body_text;
        setActiveTemplate(prev => ({ ...prev, body_text: currentBody }));
        setPrintMode(true);
    };

    return (
        <div className="space-y-10 pb-20">
            {/* Editor Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div className="flex items-center gap-5">
                    <button onClick={() => { setView('list'); setPrintMode(false); }} className="p-3 bg-white border border-slate-200 rounded-2xl hover:bg-slate-900 hover:text-white transition-all text-slate-400 shadow-sm">
                        <ChevronLeft size={20} />
                    </button>
                    <div>
                        <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase italic underline decoration-blue-500 underline-offset-8">
                            {printMode ? 'Final Print' : (activeTemplate?.template_id ? 'Edit' : 'Create')} <span className="text-blue-600">Template</span>
                        </h1>
                        <p className="text-slate-400 text-[10px] font-black tracking-widest uppercase mt-4 italic flex items-center gap-2">
                            {printMode ? <ImageIcon size={12} className="text-blue-500" /> : <Edit3 size={12} className="text-blue-500" />} 
                            MODE: {printMode ? 'FINAL_PRINT_CALIBRATION' : 'ARCHITECT_STUDIO'} // TARGET: {activeTemplate?.template_name || 'NEW_PROTOCOL'}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    {!printMode && (
                        <button 
                            onClick={handleEnterPrintMode}
                            className="flex items-center gap-3 px-8 py-4 bg-blue-50 text-blue-600 rounded-2xl font-black text-xs uppercase tracking-[0.2em] hover:bg-blue-600 hover:text-white transition-all shadow-sm active:scale-95"
                        >
                            <Eye size={18} /> Final Preview
                        </button>
                    )}
                    {printMode && (
                        <button 
                            onClick={() => setPrintMode(false)}
                            className="flex items-center gap-3 px-8 py-4 bg-slate-100 text-slate-600 rounded-2xl font-black text-xs uppercase tracking-[0.2em] hover:bg-slate-200 transition-all shadow-sm active:scale-95"
                        >
                            <Edit3 size={18} /> Back to Edit
                        </button>
                    )}
                    {printMode && (
                        <button 
                            onClick={() => window.print()}
                            className="flex items-center gap-3 px-8 py-4 bg-white border border-slate-200 text-slate-900 rounded-2xl font-black text-xs uppercase tracking-[0.2em] hover:bg-slate-50 transition-all shadow-sm active:scale-95"
                        >
                            <ImageIcon size={18} /> Print Document
                        </button>
                    )}
                    <button 
                        onClick={handleSave}
                        disabled={saving}
                        className="flex items-center gap-3 px-10 py-4 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] hover:bg-blue-600 transition-all shadow-2xl shadow-slate-200 active:scale-95 disabled:opacity-50"
                    >
                        {saving ? 'SYNCING...' : <><Save size={18} /> {activeTemplate?.template_id ? 'UPDATE_TEMPLATE' : 'COMMIT_CHANGES'}</>}
                    </button>
                </div>
            </div>

            <div className={`grid grid-cols-1 ${printMode ? 'lg:grid-cols-1' : 'lg:grid-cols-12'} gap-10`}>
                {/* Left Side: Editor Core */}
                <div className={`${printMode ? 'lg:col-span-1 max-w-4xl mx-auto w-full' : 'lg:col-span-8'} space-y-8 no-print`}>
                    <Card className={`p-8 border-slate-200 shadow-xl space-y-6 ${printMode ? 'bg-slate-50 border-none shadow-none' : ''}`}>
                        {!printMode && (
                            <div className="space-y-4">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 italic">Template Identity</label>
                                <input 
                                    type="text"
                                    placeholder="ENTER_TEMPLATE_NAME (e.g. Cyber Bank Notice)"
                                    className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-black italic focus:ring-4 focus:ring-blue-500/5 outline-none transition-all"
                                    value={activeTemplate?.template_name}
                                    onChange={(e) => setActiveTemplate(p => ({ ...p, template_name: e.target.value }))}
                                />
                            </div>
                        )}

                        <div className="space-y-4">
                            <div className="flex items-center justify-between px-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">{printMode ? 'Final Document Stream' : 'Document Content Editor'}</label>
                                <div className="flex items-center gap-2 bg-slate-900 p-1.5 rounded-xl shadow-lg no-print">
                                    <button onClick={() => formatText('bold')} className="p-2 text-white/50 hover:text-blue-400 transition-colors" title="Bold"><Bold size={14} /></button>
                                    <button onClick={() => formatText('italic')} className="p-2 text-white/50 hover:text-blue-400 transition-colors" title="Italic"><Italic size={14} /></button>
                                    <button onClick={() => formatText('underline')} className="p-2 text-white/50 hover:text-blue-400 transition-colors" title="Underline"><Underline size={14} /></button>
                                    <div className="w-px h-4 bg-white/10 mx-1"></div>
                                    <button onClick={() => formatText('insertUnorderedList')} className="p-2 text-white/50 hover:text-blue-400 transition-colors" title="List"><List size={14} /></button>
                                    <div className="w-px h-4 bg-white/10 mx-1"></div>
                                    <button onClick={() => formatText('justifyLeft')} className="p-2 text-white/50 hover:text-blue-400 transition-colors" title="Align Left"><AlignLeft size={14} /></button>
                                    <button onClick={() => formatText('justifyCenter')} className="p-2 text-white/50 hover:text-blue-400 transition-colors" title="Align Center"><AlignCenter size={14} /></button>
                                    <button onClick={() => formatText('justifyRight')} className="p-2 text-white/50 hover:text-blue-400 transition-colors" title="Align Right"><AlignRight size={14} /></button>
                                    <div className="w-px h-4 bg-white/10 mx-1"></div>
                                    <label className="p-2 text-white/50 hover:text-blue-400 transition-colors cursor-pointer" title="Insert Image">
                                        <ImageIcon size={14} />
                                        <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
                                    </label>
                                    <div className="w-px h-4 bg-white/10 mx-1"></div>
                                    <select 
                                        onChange={(e) => applyFontSize(e.target.value)}
                                        className="bg-slate-800 text-white/50 text-[9px] font-black outline-none cursor-pointer hover:text-blue-400 px-2 py-1 rounded-md max-w-[60px]"
                                        defaultValue="16"
                                    >
                                        {[8, 9, 10, 11, 12, 14, 16, 18, 20, 22, 24, 26, 28, 32, 36, 40, 48, 50].map(size => (
                                            <option key={size} value={size}>{size}px</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            
                            <div className={`relative ${printMode ? 'bg-white p-0' : ''}`}>
                                {!printMode && (
                                    <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                                        <Shield size={200} />
                                    </div>
                                )}
                                <div 
                                    key={(activeTemplate?.template_id || 'new') + (printMode ? '_print' : '_edit')}
                                    ref={editorRef}
                                    contentEditable="true"
                                    suppressContentEditableWarning
                                    onPaste={handlePaste}
                                    onMouseUp={saveSelection}
                                    onKeyUp={saveSelection}
                                    className={`${printMode ? 'min-h-[1100px] p-20 shadow-2xl border border-slate-100' : 'min-h-[600px] p-10 border border-slate-200'} bg-white rounded-3xl outline-none prose prose-slate max-w-none text-slate-800 shadow-inner focus:bg-slate-50/20 transition-colors print:shadow-none print:p-0 print:m-0 print:border-none cursor-text`}
                                    dangerouslySetInnerHTML={{ __html: printMode ? getProcessedHTML(activeTemplate?.body_text) : activeTemplate?.body_text }}
                                />
                            </div>
                        </div>
                    </Card>
                </div>

                {/* Right Side: Field & Column Manager */}
                {!printMode && (
                    <div className="lg:col-span-4 space-y-8 no-print">
                        <Card className="p-8 border-slate-200 shadow-xl bg-slate-900 text-white">
                        <div className="flex items-center justify-between mb-8">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-blue-600 rounded-lg"><Type size={18} /></div>
                                <h3 className="text-xs font-black uppercase tracking-widest italic">Field Manager</h3>
                            </div>
                            <button onClick={() => openModal('field')} className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-all text-blue-400"><Plus size={16} /></button>
                        </div>
                        
                        <div className="space-y-3 max-h-[250px] overflow-y-auto custom-scrollbar pr-2">
                            {activeTemplate?.json_data?.fields.length === 0 ? (
                                <p className="text-[9px] text-slate-500 font-bold uppercase italic text-center py-6 border border-dashed border-white/10 rounded-xl">No custom fields defined</p>
                            ) : activeTemplate?.json_data?.fields.map(field => (
                                <div key={field.name} className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/10 group hover:border-blue-500/50 transition-all cursor-pointer" onClick={() => insertPlaceholder(field.name)}>
                                    <div className="flex items-center gap-3">
                                        <div className="w-1.5 h-1.5 bg-blue-500 rounded-full group-hover:scale-150 transition-transform"></div>
                                            <div>
                                                <p className="text-[10px] font-black italic text-blue-400">{"{" + field.name + "}"}</p>
                                                <p className="text-[8px] text-slate-300 font-bold mt-1 uppercase truncate max-w-[150px]">Value: {field.defaultValue || 'DYN_DATA'}</p>
                                            </div>
                                    </div>
                                    <button onClick={(e) => { e.stopPropagation(); removeField(field.name); }} className="opacity-0 group-hover:opacity-100 p-1.5 hover:text-rose-400 transition-all"><Trash2 size={14} /></button>
                                </div>
                            ))}
                        </div>

                        <div className="mt-12">
                            <div className="flex items-center justify-between mb-8">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-emerald-600 rounded-lg"><Table size={18} /></div>
                                    <h3 className="text-xs font-black uppercase tracking-widest italic">Table Columns</h3>
                                </div>
                                <button onClick={() => openModal('column')} className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-all text-emerald-400"><Plus size={16} /></button>
                            </div>

                            <div className="space-y-3 max-h-[250px] overflow-y-auto custom-scrollbar pr-2">
                                {activeTemplate?.json_data?.table_columns.length === 0 ? (
                                    <p className="text-[9px] text-slate-500 font-bold uppercase italic text-center py-6 border border-dashed border-white/10 rounded-xl">No dynamic columns defined</p>
                                ) : activeTemplate?.json_data?.table_columns.map(col => (
                                    <div key={col} className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/10 group hover:border-emerald-500/50 transition-all cursor-pointer" onClick={() => insertPlaceholder(col)}>
                                        <div className="flex items-center gap-3">
                                            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full group-hover:scale-150 transition-transform"></div>
                                            <p className="text-[10px] font-black italic text-emerald-400">{"{" + col + "}"}</p>
                                        </div>
                                        <button onClick={(e) => { e.stopPropagation(); removeColumn(col); }} className="opacity-0 group-hover:opacity-100 p-1.5 hover:text-rose-400 transition-all"><Trash2 size={14} /></button>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="mt-12 p-5 bg-blue-600/10 rounded-2xl border border-blue-600/20">
                            <div className="flex gap-4">
                                <AlertCircle size={18} className="text-blue-400 shrink-0" />
                                <p className="text-[9px] font-bold text-slate-300 leading-relaxed uppercase tracking-wider">
                                    Click on a field or column placeholder to insert it into the editor at the current cursor position.
                                </p>
                            </div>
                        </div>
                    </Card>
                    </div>
                )}
            </div>

            <AnimatePresence>
                {modalConfig.show && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[300] flex items-center justify-center bg-slate-900/80 backdrop-blur-md p-6"
                    >
                        <motion.div 
                            initial={{ scale: 0.9, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden"
                        >
                            <div className="p-8 bg-slate-900 text-white flex justify-between items-center">
                                <div className="flex items-center gap-4">
                                    <div className={`p-3 rounded-2xl ${modalConfig.type === 'field' ? 'bg-blue-600' : 'bg-emerald-600'}`}>
                                        {modalConfig.type === 'field' ? <Type size={20} /> : <Table size={20} />}
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-black uppercase italic tracking-tight">Add {modalConfig.type}</h3>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-1">Unique Identifier Protocol</p>
                                    </div>
                                </div>
                                <button onClick={() => setModalConfig({ ...modalConfig, show: false })} className="text-slate-400 hover:text-white"><X size={24} /></button>
                            </div>
                            <div className="p-8 space-y-6">
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Identifier Name</label>
                                    <input 
                                        autoFocus
                                        type="text"
                                        placeholder={`e.g. ${modalConfig.type === 'field' ? 'Customer_Name' : 'Amount'}`}
                                        className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-black italic outline-none focus:ring-4 focus:ring-blue-500/5 transition-all"
                                        value={modalConfig.name}
                                        onChange={(e) => setModalConfig({ ...modalConfig, name: e.target.value.replace(/\s+/g, '_') })}
                                    />
                                    <p className="text-[9px] text-slate-400 italic px-1">* Spaces will be converted to underscores automatically.</p>
                                </div>

                                {modalConfig.type === 'field' && (
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Default / Sample Value</label>
                                        <input 
                                            type="text"
                                            placeholder="e.g. John Doe"
                                            className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-black italic outline-none focus:ring-4 focus:ring-blue-500/5 transition-all"
                                            value={modalConfig.defaultValue}
                                            onChange={(e) => setModalConfig({ ...modalConfig, defaultValue: e.target.value })}
                                        />
                                    </div>
                                )}
                                <Button 
                                    onClick={handleModalSubmit}
                                    className={`w-full py-5 rounded-2xl text-white font-black uppercase tracking-widest italic shadow-xl ${modalConfig.type === 'field' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-emerald-600 hover:bg-emerald-700'}`}
                                >
                                    Confirm Addition
                                </Button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}

                {showSuccess && (
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm"
                    >
                        <Card className="p-12 bg-white border-none shadow-2xl text-center space-y-6 max-w-sm mx-auto">
                            <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto animate-bounce">
                                <CheckCircle2 size={40} />
                            </div>
                            <div>
                                <h3 className="text-2xl font-black text-slate-900 uppercase italic">Sync Success</h3>
                                <p className="text-slate-500 text-sm font-bold mt-2">Template protocol permanently committed to unit registry.</p>
                            </div>
                        </Card>
                    </motion.div>
                )}
            </AnimatePresence>

            <style>{`
                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: rgba(255,255,255,0.05); }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.2); }
                [contenteditable] { caret-color: #3b82f6; }
                .prose p { margin-bottom: 1em; }
                .prose img { 
                    display: block; 
                    max-width: 100%; 
                    height: auto; 
                    border-radius: 8px; 
                    margin: 15px 0;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.05);
                }
                @media print {
                    .no-print { display: none !important; }
                    body { background: white !important; margin: 0 !important; padding: 0 !important; }
                    .prose { padding: 0 !important; margin: 0 !important; max-width: 100% !important; }
                    main { margin: 0 !important; padding: 0 !important; }
                    aside { display: none !important; }
                    header { display: none !important; }
                }
            `}</style>
        </div>
    );
};

export default TemplatesConfig;
