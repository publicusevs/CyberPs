import React, { useState, useEffect } from 'react';
import { 
    Plus, Search, Edit3, Trash2, Save, 
    Database, Hash, Type, Shield, AlertCircle,
    CheckCircle2, X, RefreshCw, Layers, ChevronRight,
    Filter, Download, Copy, ExternalLink
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../services/api';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';

const GlobalVariables = () => {
    const [variables, setVariables] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [activeVar, setActiveVar] = useState({ variable_name: '', variable_value: '', category: 'General' });
    const [saving, setSaving] = useState(false);
    const [status, setStatus] = useState({ type: '', message: '' });
    const [selectedCategory, setSelectedCategory] = useState('All');

    useEffect(() => {
        fetchVariables();
    }, []);

    const fetchVariables = async () => {
        setLoading(true);
        try {
            const res = await api.get('/variables');
            if (res.data.success) {
                setVariables(res.data.data);
            }
        } catch (err) {
            console.error('Failed to fetch variables');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!activeVar.variable_name || !activeVar.variable_value) {
            setStatus({ type: 'error', message: 'CRITICAL_MISSING_DATA: Name and Value required.' });
            return;
        }

        setSaving(true);
        try {
            if (activeVar.variable_id) {
                await api.put(`/variables/${activeVar.variable_id}`, activeVar);
            } else {
                await api.post('/variables', activeVar);
            }
            
            setStatus({ type: 'success', message: 'PROTOCOL_SYNC_COMPLETE: Registry updated.' });
            setTimeout(() => {
                setShowModal(false);
                setStatus({ type: '', message: '' });
                fetchVariables();
            }, 1500);
        } catch (err) {
            setStatus({ type: 'error', message: 'NETWORK_FAILURE: Persistence layer unreachable.' });
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('PERMANENT_ERASURE_PROTOCOL: This variable will be purged from all templates. Proceed?')) return;
        try {
            await api.delete(`/variables/${id}`);
            fetchVariables();
        } catch (err) {
            alert('PURGE_FAILED');
        }
    };

    const handleCopy = (text) => {
        navigator.clipboard.writeText(`{${text}}`);
        // Subtle toast could go here
    };

    const categories = ['All', ...new Set(variables.map(v => v.category))];

    const filteredVariables = variables.filter(v => {
        const matchesSearch = v.variable_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            v.variable_value.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory = selectedCategory === 'All' || v.category === selectedCategory;
        return matchesSearch && matchesCategory;
    });

    return (
        <div className="space-y-10 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Tactical Header */}
            <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-8">
                <div>
                    <div className="flex items-center gap-4 mb-2">
                        <div className="p-3 bg-emerald-600 rounded-2xl shadow-lg shadow-emerald-200 text-white animate-pulse">
                            <Database size={24} />
                        </div>
                        <h1 className="text-5xl font-black text-slate-900 tracking-tighter uppercase italic">
                            Protocol <span className="text-emerald-600">Registry</span>
                        </h1>
                    </div>
                    <p className="text-slate-400 text-[10px] font-black tracking-[0.4em] uppercase mt-2 italic flex items-center gap-3 ml-1">
                        <Shield size={12} className="text-emerald-500" /> CENTRAL_DATA_NODE // VERSION_4.0_SECURE
                    </p>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-4 w-full xl:w-auto">
                    <div className="relative flex-1 sm:w-80 group">
                        <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-600 transition-all" size={20} />
                        <input 
                            type="text" 
                            placeholder="SCAN_PROTOCOL_DATABASE..." 
                            className="w-full pl-14 pr-6 py-4.5 bg-white border-2 border-slate-100 rounded-[24px] text-[11px] font-black tracking-widest outline-none focus:border-emerald-500/50 focus:ring-8 focus:ring-emerald-500/5 transition-all shadow-sm"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <Button 
                        onClick={() => { setActiveVar({ variable_name: '', variable_value: '', category: 'General' }); setShowModal(true); }}
                        className="w-full sm:w-auto bg-slate-900 hover:bg-emerald-600 text-white px-10 py-5 rounded-[24px] shadow-2xl shadow-slate-200 flex items-center justify-center gap-3 active:scale-95 transition-all group"
                    >
                        <Plus size={22} className="group-hover:rotate-90 transition-transform duration-300" /> 
                        <span className="font-black text-xs tracking-widest uppercase italic">Initialize Variable</span>
                    </Button>
                </div>
            </div>

            {/* Filter Bar */}
            <div className="flex items-center gap-3 overflow-x-auto pb-2 no-scrollbar">
                <div className="p-2.5 bg-slate-100 text-slate-400 rounded-xl mr-2">
                    <Filter size={18} />
                </div>
                {categories.map(cat => (
                    <button
                        key={cat}
                        onClick={() => setSelectedCategory(cat)}
                        className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap border-2 ${
                            selectedCategory === cat 
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-lg shadow-emerald-100' 
                            : 'bg-white text-slate-400 border-slate-100 hover:border-emerald-200 hover:text-emerald-600'
                        }`}
                    >
                        {cat}
                    </button>
                ))}
            </div>

            {/* Premium Table Card */}
            <Card className="border-none shadow-2xl shadow-slate-200/50 overflow-hidden bg-white/80 backdrop-blur-2xl rounded-[32px]">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-900 border-b border-slate-800">
                                <th className="px-10 py-8 text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] italic">Identifier Mapping</th>
                                <th className="px-10 py-8 text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] italic">Resolved Value</th>
                                <th className="px-10 py-8 text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] italic">Category</th>
                                <th className="px-10 py-8 text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] italic">Status</th>
                                <th className="px-10 py-8 text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] italic text-right">Operational Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr>
                                    <td colSpan="5" className="px-10 py-32 text-center">
                                        <div className="flex flex-col items-center gap-6 animate-pulse">
                                            <div className="w-16 h-16 border-4 border-emerald-100 border-t-emerald-600 rounded-full animate-spin"></div>
                                            <p className="font-black text-[11px] text-slate-400 tracking-[0.5em] uppercase italic">Decrypting Registry Matrix...</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : filteredVariables.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="px-10 py-32 text-center">
                                        <div className="flex flex-col items-center gap-4 opacity-20">
                                            <Layers size={64} className="text-slate-400" />
                                            <p className="font-black text-slate-400 tracking-[0.3em] uppercase italic">No protocols matching your signature.</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : filteredVariables.map((v, idx) => (
                                <motion.tr 
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: idx * 0.05 }}
                                    key={v.variable_id} 
                                    className="hover:bg-emerald-50/30 transition-all group"
                                >
                                    <td className="px-10 py-7">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center font-black shadow-sm group-hover:scale-110 transition-transform">
                                                <Hash size={18} />
                                            </div>
                                            <div>
                                                <p className="text-sm font-black text-emerald-600 italic tracking-tight uppercase">{"{" + v.variable_name + "}"}</p>
                                                <p className="text-[9px] font-bold text-slate-400 mt-1 uppercase">ID: {v.variable_id.slice(0, 8)}...</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-10 py-7">
                                        <div className="max-w-md">
                                            <p className="text-xs font-bold text-slate-600 leading-relaxed line-clamp-2 bg-slate-50/50 p-3 rounded-xl border border-transparent group-hover:border-emerald-100 group-hover:bg-white transition-all">
                                                {v.variable_value}
                                            </p>
                                        </div>
                                    </td>
                                    <td className="px-10 py-7">
                                        <span className="px-4 py-1.5 bg-slate-100 text-slate-500 rounded-full text-[9px] font-black uppercase italic border border-slate-200">
                                            {v.category}
                                        </span>
                                    </td>
                                    <td className="px-10 py-7">
                                        <div className="flex items-center gap-2">
                                            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-lg shadow-emerald-200"></div>
                                            <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest italic">Active</span>
                                        </div>
                                    </td>
                                    <td className="px-10 py-7">
                                        <div className="flex items-center justify-end gap-3 opacity-0 group-hover:opacity-100 transition-all transform translate-x-4 group-hover:translate-x-0">
                                            <button 
                                                onClick={() => handleCopy(v.variable_name)}
                                                className="p-3 bg-white text-slate-400 hover:text-emerald-600 rounded-xl shadow-sm border border-slate-100 hover:border-emerald-200 transition-all" 
                                                title="Copy Placeholder"
                                            >
                                                <Copy size={16} />
                                            </button>
                                            <button 
                                                onClick={() => { setActiveVar(v); setShowModal(true); }}
                                                className="p-3 bg-white text-slate-400 hover:text-blue-600 rounded-xl shadow-sm border border-slate-100 hover:border-blue-200 transition-all" 
                                                title="Modify Protocol"
                                            >
                                                <Edit3 size={16} />
                                            </button>
                                            <button 
                                                onClick={() => handleDelete(v.variable_id)}
                                                className="p-3 bg-white text-slate-400 hover:text-rose-600 rounded-xl shadow-sm border border-slate-100 hover:border-rose-200 transition-all" 
                                                title="Purge Variable"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </motion.tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                
                {/* Tactical Footer */}
                <div className="px-10 py-6 bg-slate-50/50 border-t border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-4">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] italic">
                        TOTAL_RESOLVED_PROTOCOLS: {filteredVariables.length} // SESSION_SECURE
                    </p>
                    <div className="flex items-center gap-3">
                        <button className="flex items-center gap-2 px-4 py-2 bg-white text-slate-500 rounded-xl text-[9px] font-black uppercase border border-slate-200 hover:bg-slate-50 transition-all shadow-sm">
                            <Download size={14} /> Export CSV
                        </button>
                        <button className="flex items-center gap-2 px-4 py-2 bg-white text-slate-500 rounded-xl text-[9px] font-black uppercase border border-slate-200 hover:bg-slate-50 transition-all shadow-sm">
                            <RefreshCw size={14} /> Re-Sync
                        </button>
                    </div>
                </div>
            </Card>

            {/* Modal - Unified Add/Edit */}
            <AnimatePresence>
                {showModal && (
                    <div className="fixed inset-0 z-[500] flex items-center justify-center p-6">
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-slate-900/90 backdrop-blur-xl"
                            onClick={() => setShowModal(false)}
                        />
                        <motion.div 
                            initial={{ scale: 0.9, y: 30, opacity: 0 }}
                            animate={{ scale: 1, y: 0, opacity: 1 }}
                            exit={{ scale: 0.9, y: 30, opacity: 0 }}
                            className="w-full max-w-lg bg-white rounded-[32px] shadow-2xl overflow-hidden relative z-10 mx-auto"
                        >
                            <div className="p-8 bg-slate-900 text-white flex justify-between items-center">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-emerald-600 rounded-2xl shadow-xl shadow-emerald-900/20">
                                        <Database size={20} />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-black uppercase italic tracking-tight">{activeVar.variable_id ? 'Refine' : 'Deploy'} Variable</h3>
                                        <p className="text-[9px] font-black text-emerald-500 uppercase tracking-[0.3em] mt-1">Registry Entry Protocol</p>
                                    </div>
                                </div>
                                <button onClick={() => setShowModal(false)} className="p-2.5 bg-white/5 hover:bg-white/10 rounded-xl text-white/40 hover:text-white transition-all"><X size={20} /></button>
                            </div>

                            <div className="p-8 space-y-6">
                                {status.message && (
                                    <motion.div 
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        className={`p-4 rounded-xl flex items-center gap-3 ${status.type === 'success' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-rose-50 text-rose-600 border border-rose-100'}`}
                                    >
                                        <div className={`p-2 rounded-lg ${status.type === 'success' ? 'bg-emerald-100' : 'bg-rose-100'}`}>
                                            {status.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                                        </div>
                                        <p className="text-[10px] font-black uppercase tracking-wider">{status.message}</p>
                                    </motion.div>
                                )}

                                <div className="space-y-5">
                                    <div className="space-y-2">
                                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1 italic flex items-center gap-2">
                                            <Hash size={10} className="text-emerald-500" /> Variable Identifier
                                        </label>
                                        <div className="relative group">
                                            <span className="absolute left-5 top-1/2 -translate-y-1/2 text-emerald-600 font-black text-lg transition-all group-focus-within:scale-110">{"{"}</span>
                                            <input 
                                                type="text"
                                                placeholder="ENTER_ID (e.g. BANK_IFSC)"
                                                className="w-full pl-10 pr-10 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-sm font-black italic outline-none focus:border-emerald-500/50 focus:bg-white transition-all text-emerald-700 placeholder:text-slate-300"
                                                value={activeVar.variable_name}
                                                onChange={(e) => setActiveVar({...activeVar, variable_name: e.target.value.replace(/\s+/g, '_').toUpperCase()})}
                                                disabled={activeVar.variable_id}
                                            />
                                            <span className="absolute right-5 top-1/2 -translate-y-1/2 text-emerald-600 font-black text-lg transition-all group-focus-within:scale-110">{"}"}</span>
                                        </div>
                                        <p className="text-[8px] text-slate-400 font-bold italic px-1">* IDs are immutable once deployed.</p>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1 italic flex items-center gap-2">
                                            <Type size={10} className="text-emerald-500" /> Core Assigned Value
                                        </label>
                                        <textarea 
                                            rows="3"
                                            placeholder="Input the resolved string value..."
                                            className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-sm font-bold outline-none focus:border-emerald-500/50 focus:bg-white transition-all placeholder:text-slate-300"
                                            value={activeVar.variable_value}
                                            onChange={(e) => setActiveVar({...activeVar, variable_value: e.target.value})}
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1 italic flex items-center gap-2">
                                            <Layers size={10} className="text-emerald-500" /> Sector Classification
                                        </label>
                                        <div className="grid grid-cols-3 gap-2">
                                            {['General', 'Bank', 'Finance', 'Case', 'Legal', 'Tech'].map(cat => (
                                                <button
                                                    key={cat}
                                                    type="button"
                                                    onClick={() => setActiveVar({...activeVar, category: cat})}
                                                    className={`py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all border-2 ${
                                                        activeVar.category === cat 
                                                        ? 'bg-emerald-600 text-white border-emerald-600' 
                                                        : 'bg-white text-slate-400 border-slate-100 hover:border-emerald-200'
                                                    }`}
                                                >
                                                    {cat}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex gap-3 pt-2">
                                    <button 
                                        onClick={() => setShowModal(false)}
                                        className="flex-1 py-4 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all"
                                    >
                                        Abort
                                    </button>
                                    <button 
                                        onClick={handleSave}
                                        disabled={saving}
                                        className="flex-[2] py-4 bg-slate-900 hover:bg-emerald-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] italic shadow-2xl shadow-slate-200 transition-all disabled:opacity-50 flex items-center justify-center gap-3"
                                    >
                                        {saving ? <RefreshCw className="animate-spin" size={14} /> : <Save size={14} />}
                                        {saving ? 'SYNCING...' : (activeVar.variable_id ? 'Update Registry' : 'Commit Registry')}
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <style>{`
                .no-scrollbar::-webkit-scrollbar { display: none; }
                .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
            `}</style>
        </div>
    );
};

export default GlobalVariables;
