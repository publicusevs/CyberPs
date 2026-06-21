import React, { useState, useEffect, useRef } from 'react';
import { 
    Plus, Search, Edit3, Trash2, Eye, Copy, 
    ChevronLeft, Save, Shield, Type, Hash, Database,
    Table, Layout, CheckCircle2, AlertCircle,
    Bold, Italic, Underline, List, AlignLeft, AlignCenter, AlignRight,
    Image as ImageIcon, X, Indent, Outdent, WrapText
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../services/api';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import RichTextEditor from '../components/ui/RichTextEditor';

const staticSocialVars = [
    { name: 'whatsapp_no', label: 'WhatsApp Number' },
    { name: 'gmail_id', label: 'Gmail / Google ID' },
    { name: 'facebook_id', label: 'Facebook Profile ID/URL' },
    { name: 'twitter_id', label: 'Twitter/X Handle' },
    { name: 'linkedin_id', label: 'LinkedIn Profile' },
    { name: 'insta_id', label: 'Instagram Username' },
    { name: 'telegram_id', label: 'Telegram Handle' },
    { name: 'website_url', label: 'Website URL' },
    { name: 'other_social', label: 'Other Social handle' },
    { name: 'facebook_address', label: 'Facebook Nodal Address' },
    { name: 'insta_address', label: 'Instagram Nodal Address' },
    { name: 'whatsapp_address', label: 'WhatsApp Nodal Address' },
    { name: 'gmail_address', label: 'Gmail/Google Nodal Address' },
    { name: 'telegram_address', label: 'Telegram Nodal Address' },
    { name: 'twitter_address', label: 'Twitter/X Nodal Address' },
    { name: 'linkedin_address', label: 'LinkedIn Nodal Address' },
    { name: 'snapchat_address', label: 'Snapchat Nodal Address' }
];

const TemplatesConfig = () => {
    const [view, setView] = useState('list'); // 'list' | 'editor'
    const [templates, setTemplates] = useState([]);
    const [globalVars, setGlobalVars] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTemplate, setActiveTemplate] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [protocolSearchQuery, setProtocolSearchQuery] = useState('');
    const [saving, setSaving] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const [printMode, setPrintMode] = useState(false);
    
    // Modal and Calibration states
    const [modalConfig, setModalConfig] = useState({ show: false, type: 'field', name: '', defaultValue: '' });
    const [margins, setMargins] = useState({ top: 50, left: 50, right: 50 }); // in px
    const [lineSpacing, setLineSpacing] = useState('1.5');
    const [paragraphSpacing, setParagraphSpacing] = useState('12');
    const [wordWrap, setWordWrap] = useState(true);
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const lastSelectionRef = useRef(null);

    const editorRef = useRef(null);
    const quillRef = useRef(null);

    useEffect(() => {
        fetchTemplates();
        fetchGlobalVars();
    }, []);



    const fetchGlobalVars = async () => {
        try {
            const res = await api.get('/variables');
            if (res.data.success) {
                setGlobalVars(res.data.data);
            }
        } catch (err) {
            console.error('Failed to fetch global variables');
        }
    };

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
        setMargins({ top: 50, left: 50, right: 50 });
        setLineSpacing('1.5');
        setParagraphSpacing('12');
        setWordWrap(true);
        setActiveTemplate({
            template_name: '',
            template_type: 'Bank Notice',
            subject_text: '',
            body_text: '',
            footer_text: '',
            json_data: {
                fields: [],
                table_columns: [],
                mapping: {},
                margins: { top: 50, left: 50, right: 50 },
                lineSpacing: '1.5',
                paragraphSpacing: '12',
                wordWrap: true
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
                jsonData = null;
            }
        }
        
        // Ensure standard structure
        if (!jsonData || typeof jsonData !== 'object') {
            jsonData = { fields: [], table_columns: [], mapping: {}, margins: { top: 50, left: 50, right: 50 }, lineSpacing: '1.5', paragraphSpacing: '12', wordWrap: true };
        } else {
            jsonData = {
                fields: jsonData.fields || [],
                table_columns: jsonData.table_columns || [],
                mapping: jsonData.mapping || {},
                margins: jsonData.margins || { top: 50, left: 50, right: 50 },
                lineSpacing: jsonData.lineSpacing || '1.5',
                paragraphSpacing: jsonData.paragraphSpacing || '12',
                wordWrap: jsonData.wordWrap !== undefined ? jsonData.wordWrap : true
            };
        }
        setActiveTemplate({ ...tpl, json_data: jsonData });
        setMargins(jsonData.margins);
        setLineSpacing(jsonData.lineSpacing || '1.5');
        setParagraphSpacing(jsonData.paragraphSpacing || '12');
        setWordWrap(jsonData.wordWrap !== undefined ? jsonData.wordWrap : true);
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
            const currentBody = quillRef.current?.getQuill() ? quillRef.current.getQuill().root.innerHTML : (editorRef.current ? editorRef.current.innerHTML : activeTemplate.body_text);
            const payload = {
                ...activeTemplate,
                body_text: currentBody,
                json_data: {
                    ...activeTemplate.json_data,
                    margins: margins,
                    lineSpacing: lineSpacing,
                    paragraphSpacing: paragraphSpacing,
                    wordWrap: wordWrap
                }
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

    const insertPlaceholder = (name) => {
        const placeholder = `{${name}}`;
        if (quillRef.current?.getQuill()) {
            const q = quillRef.current.getQuill();
            q.focus();
            const range = q.getSelection();
            if (range) {
                q.insertText(range.index, placeholder);
                q.setSelection(range.index + placeholder.length);
            } else {
                const length = q.getLength();
                q.insertText(length - 1, placeholder);
                q.setSelection(length - 1 + placeholder.length);
            }
        }
    };

    const openModal = (type) => {
        setModalConfig({ show: true, type, name: '', defaultValue: '' });
    };

    const handleModalSubmit = () => {
        const { type, name, defaultValue } = modalConfig;
        if (!name) return;

        const currentBody = quillRef.current?.getQuill() ? quillRef.current.getQuill().root.innerHTML : (editorRef.current?.innerHTML || activeTemplate.body_text);

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
        const currentBody = quillRef.current?.getQuill() ? quillRef.current.getQuill().root.innerHTML : (editorRef.current?.innerHTML || activeTemplate.body_text);
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
        const currentBody = quillRef.current?.getQuill() ? quillRef.current.getQuill().root.innerHTML : (editorRef.current?.innerHTML || activeTemplate.body_text);
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
        
        // 1. Replace Global Protocol Variables
        if (globalVars && globalVars.length > 0) {
            globalVars.forEach(v => {
                const regex = new RegExp(`\\{${v.variable_name}\\}`, 'g');
                processed = processed.replace(regex, `<span class="bg-emerald-50 text-emerald-700 px-1 rounded border border-emerald-200 print:bg-transparent print:border-none print:p-0">${v.variable_value || `[${v.variable_name}]`}</span>`);
            });
        }

        // 1.5 Replace Social Media Variables with Sample Values
        const socialSamples = {
            'whatsapp_no': '+91 9999999999',
            'gmail_id': 'suspect@gmail.com',
            'facebook_id': 'facebook.com/suspect.profile',
            'twitter_id': '@suspect_handle',
            'linkedin_id': 'linkedin.com/in/suspect',
            'insta_id': '@suspect_instagram',
            'telegram_id': '@suspect_telegram',
            'website_url': 'www.suspect-website.com',
            'other_social': 'other_social_details',
            'facebook_address': 'Meta Platforms (India) Pvt Ltd, 216A, Som Datt Chamber II, 9 Bhikaji Cama Place, New Delhi - 110066',
            'insta_address': 'Meta Platforms (India) Pvt Ltd, 216A, Som Datt Chamber II, 9 Bhikaji Cama Place, New Delhi - 110066',
            'whatsapp_address': 'WhatsApp LLC, 1601 Willow Road, Menlo Park, California 94025, USA (India Nodal: Mumbai)',
            'gmail_address': 'Google India Pvt Ltd, Unitech Signature Tower-II, Sector-15, Gurgaon, Haryana-122001',
            'telegram_address': 'Telegram FZ-LLC, Business Central Towers, Dubai, UAE',
            'twitter_address': 'Twitter Communications India Pvt. Ltd., DLF Cyber City, Gurgaon, Haryana-122002',
            'linkedin_address': 'LinkedIn Ireland Unlimited Company, Wilton Plaza, Dublin 2, Ireland',
            'snapchat_address': 'Snap Inc., 3000 31st Street, Santa Monica, CA 90405, USA'
        };
        Object.entries(socialSamples).forEach(([name, sampleVal]) => {
            const regex = new RegExp(`\\{${name}\\}`, 'g');
            processed = processed.replace(regex, `<span class="bg-blue-50 text-blue-700 px-1 rounded border border-blue-200 print:bg-transparent print:border-none print:p-0">${sampleVal}</span>`);
        });

        // 2. Replace Local Template Fields
        if (activeTemplate?.json_data?.fields) {
            activeTemplate.json_data.fields.forEach(field => {
                const regex = new RegExp(`\\{${field.name}\\}`, 'g');
                processed = processed.replace(regex, `<span class="bg-blue-50 text-blue-700 px-1 rounded border border-blue-200 print:bg-transparent print:border-none print:p-0">${field.defaultValue || `[${field.name}]`}</span>`);
            });
        }

        // 3. Replace Table Columns
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
        const currentBody = quillRef.current?.getQuill() ? quillRef.current.getQuill().root.innerHTML : (editorRef.current?.innerHTML || activeTemplate.body_text);
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
                            onClick={() => setSidebarOpen(!sidebarOpen)}
                            className="flex items-center gap-3 px-8 py-4 bg-slate-100 text-slate-600 rounded-2xl font-black text-xs uppercase tracking-[0.2em] hover:bg-slate-200 transition-all shadow-sm active:scale-95"
                            title={sidebarOpen ? "Minimize Registry Column" : "Show Registry Column"}
                        >
                            <Layout size={18} /> {sidebarOpen ? 'Hide Registry' : 'Show Registry'}
                        </button>
                    )}
                    {!printMode && (
                        <button 
                            onClick={handleEnterPrintMode}
                            className="flex items-center gap-3 px-8 py-4 bg-blue-50 text-blue-600 rounded-2xl font-black text-xs uppercase tracking-[0.2em] hover:bg-blue-600 hover:text-white transition-all shadow-sm active:scale-95"
                        >
                            <Eye size={18} /> Print Preview
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
                <div className={`${printMode ? 'lg:col-span-1 max-w-4xl mx-auto w-full' : (sidebarOpen ? 'lg:col-span-8' : 'lg:col-span-12')} space-y-8 no-print`}>
                    <Card className={`overflow-visible border-slate-200 shadow-2xl transition-all duration-500 ${printMode ? 'bg-slate-50 border-none shadow-none p-0' : 'bg-white p-0'}`}>


                        <div className={`${printMode ? 'p-0' : 'p-10'} space-y-8`}>
                            {!printMode && (
                                <div className="space-y-4">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 italic flex items-center gap-2">
                                        <Shield size={12} className="text-blue-500" /> Template Identity Mapping
                                    </label>
                                    <input 
                                        type="text"
                                        placeholder="ENTER_TEMPLATE_NAME (e.g. Cyber Bank Notice)"
                                        className="w-full px-8 py-5 bg-slate-50 border-2 border-slate-100 rounded-3xl text-sm font-black italic focus:border-blue-500/50 focus:bg-white outline-none transition-all shadow-inner"
                                        value={activeTemplate?.template_name}
                                        onChange={(e) => setActiveTemplate(p => ({ ...p, template_name: e.target.value }))}
                                    />
                                </div>
                            )}

                            {!printMode && (
                                <div className="space-y-4">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 italic flex items-center gap-2">
                                        <Shield size={12} className="text-blue-500" /> Notice Category / Type
                                    </label>
                                    <select
                                        value={activeTemplate?.template_type || 'Bank Notice'}
                                        onChange={(e) => setActiveTemplate(p => ({ ...p, template_type: e.target.value }))}
                                        className="w-full px-8 py-5 bg-slate-50 border-2 border-slate-100 rounded-3xl text-sm font-black italic focus:border-blue-500/50 focus:bg-white outline-none transition-all shadow-inner cursor-pointer"
                                    >
                                        <option value="Bank Notice">Bank Notice</option>
                                        <option value="Telecom Notice">Telecom Notice</option>
                                        <option value="Social Media">Social Media</option>
                                        <option value="Court Notice">Court Notice</option>
                                        <option value="Govt Notice">Govt Notice</option>
                                        <option value="Others">Others</option>
                                    </select>
                                </div>
                            )}

                            <div className="space-y-4">
                                <div className="flex items-center justify-between px-1">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">{printMode ? 'Final Document Stream' : 'Document Content Matrix'}</label>
                                </div>
                                
                                <div className="w-full overflow-x-auto custom-scrollbar pb-4">
                                    <div 
                                        className={`relative ${printMode ? 'bg-white p-0' : 'bg-slate-100/30 p-10 rounded-[40px] border-2 border-dashed border-slate-200 shadow-inner'}`}
                                        style={printMode ? {} : { width: '874px', minWidth: '874px', maxWidth: '874px', marginLeft: 'auto', marginRight: 'auto' }}
                                    >
                                        <style>{`
                                            .custom-editor-style p {
                                                margin-bottom: ${paragraphSpacing}px !important;
                                                margin-top: 0px !important;
                                            }
                                        `}</style>
                                        {!printMode && (
                                            <div className="absolute inset-0 flex items-center justify-center opacity-5 pointer-events-none">
                                                <Shield size={400} />
                                            </div>
                                        )}
                                        {printMode ? (
                                            <div 
                                                key={(activeTemplate?.template_id || 'new') + '_print'}
                                                style={{
                                                    paddingTop: `${margins.top}px`,
                                                    paddingLeft: `${margins.left}px`,
                                                    paddingRight: `${margins.right}px`,
                                                    lineHeight: lineSpacing,
                                                    whiteSpace: wordWrap ? 'pre-wrap' : 'pre',
                                                    overflowX: wordWrap ? 'visible' : 'auto',
                                                    width: 'auto',
                                                    minWidth: 'auto',
                                                    maxWidth: 'auto'
                                                }}
                                                className="min-h-[1123px] shadow-2xl border border-slate-100 bg-white rounded-xl prose prose-slate max-w-none text-slate-800 print:shadow-none print:p-0 print:m-0 print:border-none cursor-text mx-auto custom-editor-style"
                                                dangerouslySetInnerHTML={{ __html: getProcessedHTML(activeTemplate?.body_text) }}
                                            />
                                        ) : (
                                            <RichTextEditor
                                                key={(activeTemplate?.template_id || 'new') + '_edit'}
                                                ref={quillRef}
                                                id="template-editor"
                                                value={activeTemplate?.body_text || ''}
                                                onChange={(html) => setActiveTemplate(p => p ? { ...p, body_text: html } : p)}
                                                margins={margins}
                                                lineSpacing={lineSpacing}
                                                paragraphSpacing={paragraphSpacing}
                                                wordWrap={wordWrap}
                                                printMode={printMode}
                                                onWordWrapChange={setWordWrap}
                                                onLineSpacingChange={setLineSpacing}
                                                onParagraphSpacingChange={setParagraphSpacing}
                                                editorContainerClassName="min-h-[1123px]"
                                                style={{
                                                    width: '794px',
                                                    minWidth: '794px',
                                                    maxWidth: '794px'
                                                }}
                                                className="shadow-2xl border border-slate-200 bg-white rounded-xl outline-none prose prose-slate max-w-none text-slate-800 focus:ring-0 transition-all cursor-text mx-auto custom-editor-style ql-editor-wrapper"
                                            />
                                        )}

                                    {/* Margin Controls */}
                                    {!printMode && (
                                        <>
                                            {/* Top Margin Handle */}
                                            <motion.div 
                                                drag="y"
                                                dragConstraints={{ top: 0, bottom: 200 }}
                                                onDrag={(e, info) => setMargins(prev => ({ ...prev, top: Math.max(0, prev.top + info.delta.y) }))}
                                                className="absolute left-10 right-10 h-1 bg-blue-500/20 hover:bg-blue-500 cursor-ns-resize z-20 group"
                                                style={{ top: `${margins.top + 40}px` }}
                                            >
                                                <div className="absolute left-1/2 -translate-x-1/2 -top-6 bg-slate-900 text-white text-[8px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap font-black uppercase">Margin Top: {Math.round(margins.top)}px</div>
                                            </motion.div>

                                            {/* Left Margin Handle */}
                                            <motion.div 
                                                drag="x"
                                                dragConstraints={{ left: 0, right: 200 }}
                                                onDrag={(e, info) => setMargins(prev => ({ ...prev, left: Math.max(0, prev.left + info.delta.x) }))}
                                                className="absolute top-10 bottom-10 w-1 bg-blue-500/20 hover:bg-blue-500 cursor-ew-resize z-20 group"
                                                style={{ left: `${margins.left + 40}px` }}
                                            >
                                                <div className="absolute top-1/2 -translate-y-1/2 -left-20 bg-slate-900 text-white text-[8px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap font-black uppercase origin-center -rotate-90">Margin Left: {Math.round(margins.left)}px</div>
                                            </motion.div>

                                            {/* Right Margin Handle */}
                                            <motion.div 
                                                drag="x"
                                                dragConstraints={{ left: -200, right: 0 }}
                                                onDrag={(e, info) => setMargins(prev => ({ ...prev, right: Math.max(0, prev.right - info.delta.x) }))}
                                                className="absolute top-10 bottom-10 w-1 bg-blue-500/20 hover:bg-blue-500 cursor-ew-resize z-20 group"
                                                style={{ right: `${margins.right + 40}px` }}
                                            >
                                                <div className="absolute top-1/2 -translate-y-1/2 -right-20 bg-slate-900 text-white text-[8px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap font-black uppercase origin-center rotate-90">Margin Right: {Math.round(margins.right)}px</div>
                                            </motion.div>
                                        </>
                                    )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </Card>
                </div>

                {/* Right Side: Field & Column Manager */}
                {!printMode && sidebarOpen && (
                    <div className="lg:col-span-4 space-y-8 no-print">
                        <Card className="p-8 border-slate-200 shadow-xl bg-slate-900 text-white">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-emerald-600 rounded-lg"><Database size={18} /></div>
                                <h3 className="text-xs font-black uppercase tracking-widest italic">Protocol Registry</h3>
                            </div>
                            <div className="flex items-center gap-2">
                                <button onClick={() => window.open('/global-variables', '_blank')} className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-all text-emerald-400 shadow-lg" title="View All Variables"><Eye size={16} /></button>
                                <button onClick={() => window.open('/global-variables', '_blank')} className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-all text-blue-400 shadow-lg" title="Add New Variable"><Plus size={16} /></button>
                                <button onClick={() => setSidebarOpen(false)} className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-all text-rose-400 shadow-lg" title="Minimize Registry"><X size={16} /></button>
                            </div>
                        </div>

                        <div className="mb-6 relative group">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-emerald-400 transition-colors" size={14} />
                            <input 
                                type="text"
                                placeholder="SEARCH_PROTOCOLS..."
                                className="w-full pl-9 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-[10px] text-white placeholder:text-slate-500 font-black tracking-widest outline-none focus:border-emerald-500/50 focus:bg-white/10 transition-all shadow-inner uppercase"
                                value={protocolSearchQuery}
                                onChange={(e) => setProtocolSearchQuery(e.target.value)}
                            />
                        </div>
                        
                        <div className="space-y-3 max-h-[300px] overflow-y-auto custom-scrollbar pr-2 mb-12">
                            {staticSocialVars.filter(v => 
                                v.name.toLowerCase().includes(protocolSearchQuery.toLowerCase()) ||
                                v.label.toLowerCase().includes(protocolSearchQuery.toLowerCase())
                            ).map(v => (
                                <div key={v.name} className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/10 group hover:border-blue-500/50 transition-all cursor-pointer" onClick={() => insertPlaceholder(v.name)}>
                                    <div className="flex items-center gap-3">
                                        <div className="w-1.5 h-1.5 bg-blue-500 rounded-full group-hover:scale-150 transition-transform"></div>
                                        <div>
                                            <p className="text-[10px] font-black italic text-blue-400">{"{" + v.name + "}"}</p>
                                            <p className="text-[8px] text-slate-400 font-bold mt-0.5 uppercase truncate max-w-[150px]">{v.label}</p>
                                        </div>
                                    </div>
                                    <div className="opacity-0 group-hover:opacity-100 p-1.5 text-white/20"><Plus size={14} /></div>
                                </div>
                            ))}

                            {globalVars.length > 0 && (
                                <div className="border-t border-white/10 my-4 pt-4">
                                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-3">Custom Protocol Variables</p>
                                </div>
                            )}

                            {globalVars.filter(v => 
                                v.variable_name.toLowerCase().includes(protocolSearchQuery.toLowerCase()) || 
                                (v.variable_value && v.variable_value.toLowerCase().includes(protocolSearchQuery.toLowerCase()))
                            ).map(v => (
                                <div key={v.variable_id} className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/10 group hover:border-emerald-500/50 transition-all cursor-pointer" onClick={() => insertPlaceholder(v.variable_name)}>
                                    <div className="flex items-center gap-3">
                                        <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full group-hover:scale-150 transition-transform"></div>
                                            <div>
                                                <p className="text-[10px] font-black italic text-emerald-400">{"{" + v.variable_name + "}"}</p>
                                                <p className="text-[8px] text-slate-300 font-bold mt-1 uppercase truncate max-w-[150px]">Value: {v.variable_value}</p>
                                            </div>
                                    </div>
                                    <div className="opacity-0 group-hover:opacity-100 p-1.5 text-white/20"><Plus size={14} /></div>
                                </div>
                            ))}
                        </div>

                        <div className="flex items-center justify-between mb-8">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-blue-600 rounded-lg"><Type size={18} /></div>
                                <h3 className="text-xs font-black uppercase tracking-widest italic">Template Fields</h3>
                            </div>
                            <button onClick={() => openModal('field')} className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-all text-blue-400"><Plus size={16} /></button>
                        </div>
                        
                        <div className="space-y-3 max-h-[250px] overflow-y-auto custom-scrollbar pr-2">
                            {(!activeTemplate?.json_data?.fields || activeTemplate.json_data.fields.length === 0) ? (
                                <p className="text-[9px] text-slate-500 font-bold uppercase italic text-center py-6 border border-dashed border-white/10 rounded-xl">No custom fields defined</p>
                            ) : activeTemplate.json_data.fields.map(field => (
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
                                {(!activeTemplate?.json_data?.table_columns || activeTemplate.json_data.table_columns.length === 0) ? (
                                    <p className="text-[9px] text-slate-500 font-bold uppercase italic text-center py-6 border border-dashed border-white/10 rounded-xl">No dynamic columns defined</p>
                                ) : activeTemplate.json_data.table_columns.map(col => (
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
                .ql-editor table {
                    border-collapse: collapse;
                    margin-left: auto !important;
                    margin-right: auto !important;
                    margin-top: 15px !important;
                    margin-bottom: 15px !important;
                }
                .ql-editor td, .ql-editor th {
                    border: 1px solid #cbd5e1;
                    padding: 8px 12px;
                    min-width: 50px;
                }
                .prose table {
                    border-collapse: collapse;
                    margin-left: auto !important;
                    margin-right: auto !important;
                    margin-top: 15px !important;
                    margin-bottom: 15px !important;
                }
                .prose td, .prose th {
                    border: 1px solid #cbd5e1;
                    padding: 8px 12px;
                    min-width: 50px;
                }
                /* Quill overrides to preserve A4 page layout */
                .ql-container.ql-snow {
                    border: none !important;
                    font-family: inherit;
                    font-size: inherit;
                }
                .ql-editor {
                    min-height: 1123px !important;
                    outline: none;
                }
                #quill-toolbar button.ql-active {
                    color: #34d399 !important; /* emerald-400 */
                    background-color: rgba(255, 255, 255, 0.1);
                }
                @media print {
                    .no-print { display: none !important; }
                    body { background: white !important; margin: 0 !important; padding: 0 !important; }
                    .prose { max-width: 100% !important; }
                    main { margin: 0 !important; padding: 0 !important; }
                    aside { display: none !important; }
                    header { display: none !important; }
                    .bg-white.rounded-3xl.outline-none { 
                        padding-top: ${margins.top}px !important; 
                        padding-left: ${margins.left}px !important; 
                        padding-right: ${margins.right}px !important; 
                        border: none !important;
                        box-shadow: none !important;
                        min-height: auto !important;
                    }
                }
            `}</style>
        </div>
    );
};

export default TemplatesConfig;
