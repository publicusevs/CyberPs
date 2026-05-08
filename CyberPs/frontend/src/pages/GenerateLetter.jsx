import React, { useState, useEffect } from 'react';
import { 
    FileText, Upload, Send, ChevronRight, 
    Download, Eye, Shield, Landmark, 
    Database, AlertCircle, CheckCircle2,
    Settings, Table as TableIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../services/api';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';

const GenerateLetter = () => {
    const [templates, setTemplates] = useState([]);
    const [selectedTemplate, setSelectedTemplate] = useState(null);
    const [inputMethod, setInputMethod] = useState('json'); // 'json' | 'excel'
    const [jsonData, setJsonData] = useState('');
    const [loading, setLoading] = useState(false);
    const [generatedContent, setGeneratedContent] = useState('');
    const [showPreview, setShowPreview] = useState(false);

    useEffect(() => {
        const fetchTemplates = async () => {
            try {
                const res = await api.get('/templates');
                if (res.data.success) {
                    setTemplates(res.data.data);
                }
            } catch (err) {
                console.error('Failed to load templates');
            }
        };
        fetchTemplates();
    }, []);

    const handleGenerate = () => {
        if (!selectedTemplate || !jsonData) {
            alert('VALIDATION_ERROR: Template and Data are required.');
            return;
        }

        try {
            const data = JSON.parse(jsonData);
            let content = selectedTemplate.body_text;

            // Replace single fields
            const tplData = typeof selectedTemplate.json_data === 'string' 
                ? JSON.parse(selectedTemplate.json_data) 
                : selectedTemplate.json_data;

            if (tplData.fields) {
                tplData.fields.forEach(field => {
                    const value = data[field.name] || `[MISSING_${field.name}]`;
                    const regex = new RegExp(`\\{${field.name}\\}`, 'g');
                    content = content.replace(regex, value);
                });
            }

            // Simple table loop placeholder logic (Advanced: would use Handlebars)
            // If the user provided an array for table data, we could loop it.
            // For now, let's just do a basic replacement.
            if (data.table_data && Array.isArray(data.table_data)) {
                // Find where the table placeholders are and repeat them
                // This is a simplified version for the demonstration
                let tableHtml = '<table border="1" style="width:100%; border-collapse: collapse; margin: 20px 0;"><thead><tr style="background:#f1f5f9;">';
                tplData.table_columns.forEach(col => {
                    tableHtml += `<th style="padding:10px; text-align:left; font-size:12px; font-weight:bold;">${col}</th>`;
                });
                tableHtml += '</tr></thead><tbody>';
                
                data.table_data.forEach(row => {
                    tableHtml += '<tr>';
                    tplData.table_columns.forEach(col => {
                        tableHtml += `<td style="padding:10px; font-size:12px;">${row[col] || '-'}</td>`;
                    });
                    tableHtml += '</tr>';
                });
                tableHtml += '</tbody></table>';
                
                // Assuming there's a placeholder {Dynamic_Table} in the template
                content = content.replace(/\{Dynamic_Table\}/g, tableHtml);
            }

            setGeneratedContent(content);
            setShowPreview(true);
        } catch (err) {
            alert('PARSE_ERROR: Invalid JSON data format.');
        }
    };

    const handleDownload = () => {
        const element = document.createElement("a");
        const file = new Blob([generatedContent], {type: 'text/html'});
        element.href = URL.createObjectURL(file);
        element.download = `Generated_${selectedTemplate.template_name}.html`;
        document.body.appendChild(element);
        element.click();
    };

    return (
        <div className="space-y-10 pb-20">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic">
                        Generate <span className="text-blue-600">Letter</span>
                    </h1>
                    <p className="text-slate-400 text-[10px] font-black tracking-widest uppercase mt-2 italic flex items-center gap-2">
                        <Send size={12} className="text-blue-500" /> MISSION_CONTROL // AUTOMATED_DISPATCH
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                {/* Configuration Panel */}
                <div className="lg:col-span-4 space-y-8">
                    <Card className="p-8 border-slate-200 shadow-xl space-y-8">
                        <div className="space-y-4">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 italic">1. Select Template</label>
                            <div className="grid grid-cols-1 gap-3">
                                {templates.map(tpl => (
                                    <button
                                        key={tpl.template_id}
                                        onClick={() => setSelectedTemplate(tpl)}
                                        className={`p-4 rounded-2xl border-2 text-left transition-all flex items-center gap-4 ${selectedTemplate?.template_id === tpl.template_id ? 'border-blue-600 bg-blue-50 ring-4 ring-blue-50' : 'border-slate-100 hover:border-blue-200'}`}
                                    >
                                        <div className={`p-2 rounded-xl ${selectedTemplate?.template_id === tpl.template_id ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
                                            <FileText size={18} />
                                        </div>
                                        <span className="text-[10px] font-black uppercase text-slate-900 italic">{tpl.template_name}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-4">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 italic">2. Input Data Method</label>
                            <div className="flex gap-2">
                                <button 
                                    onClick={() => setInputMethod('json')}
                                    className={`flex-1 py-3 rounded-xl border text-[9px] font-black uppercase tracking-widest transition-all ${inputMethod === 'json' ? 'bg-slate-900 border-slate-900 text-white' : 'bg-white border-slate-200 text-slate-400'}`}
                                >
                                    <Database size={14} className="inline mr-2" /> JSON
                                </button>
                                <button 
                                    onClick={() => setInputMethod('excel')}
                                    className={`flex-1 py-3 rounded-xl border text-[9px] font-black uppercase tracking-widest transition-all ${inputMethod === 'excel' ? 'bg-slate-900 border-slate-900 text-white' : 'bg-white border-slate-200 text-slate-400'}`}
                                >
                                    <Upload size={14} className="inline mr-2" /> Excel
                                </button>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 italic">3. Payload Data</label>
                            {inputMethod === 'json' ? (
                                <textarea 
                                    rows="10"
                                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-6 text-xs font-mono focus:ring-4 focus:ring-blue-500/5 outline-none"
                                    placeholder='{ "Account_No": "12345", "table_data": [...] }'
                                    value={jsonData}
                                    onChange={(e) => setJsonData(e.target.value)}
                                ></textarea>
                            ) : (
                                <div className="p-10 border-2 border-dashed border-slate-200 rounded-3xl flex flex-col items-center justify-center gap-4 bg-slate-50">
                                    <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center text-slate-300 shadow-sm">
                                        <Upload size={24} />
                                    </div>
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Drag & Drop Excel File</p>
                                    <Button className="bg-slate-900 text-white text-[9px] font-black uppercase">Browse Files</Button>
                                </div>
                            )}
                        </div>

                        <Button 
                            onClick={handleGenerate}
                            className="w-full py-5 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black text-xs uppercase tracking-[0.3em] italic shadow-xl shadow-blue-900 transition-all flex items-center justify-center gap-3 active:scale-95"
                        >
                            Execute Engine <ChevronRight size={18} />
                        </Button>
                    </Card>
                </div>

                {/* Preview Panel */}
                <div className="lg:col-span-8">
                    <AnimatePresence mode="wait">
                        {showPreview ? (
                            <motion.div 
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                className="space-y-6"
                            >
                                <div className="flex items-center justify-between px-2">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl"><Eye size={18} /></div>
                                        <h3 className="text-xs font-black uppercase tracking-widest italic">Document Preview</h3>
                                    </div>
                                    <Button onClick={handleDownload} className="bg-slate-900 text-white px-6 py-2.5 rounded-xl text-[9px] font-black uppercase flex items-center gap-2">
                                        <Download size={14} /> Download HTML
                                    </Button>
                                </div>
                                <Card className="bg-white border-slate-200 shadow-2xl p-0 overflow-hidden min-h-[800px]">
                                    <div 
                                        className="p-20 prose prose-slate max-w-none scale-[0.85] origin-top"
                                        dangerouslySetInnerHTML={{ __html: generatedContent }}
                                    />
                                </Card>
                            </motion.div>
                        ) : (
                            <div className="h-full min-h-[800px] border-2 border-dashed border-slate-200 rounded-[40px] flex flex-col items-center justify-center gap-6 bg-white/50">
                                <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center text-slate-200">
                                    <Settings size={40} className="animate-spin-slow" />
                                </div>
                                <div className="text-center">
                                    <p className="text-sm font-black text-slate-400 uppercase tracking-widest">Waiting for Engine Execution</p>
                                    <p className="text-[10px] font-bold text-slate-300 uppercase mt-2">Configure template and payload to generate preview</p>
                                </div>
                            </div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            <style>{`
                .animate-spin-slow { animation: spin 8s linear infinite; }
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                .prose table { border-collapse: collapse; width: 100%; margin-top: 20px; }
                .prose th, .prose td { border: 1px solid #e2e8f0; padding: 12px; text-align: left; }
            `}</style>
        </div>
    );
};

export default GenerateLetter;
