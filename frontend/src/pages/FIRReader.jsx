import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    Upload, FileText, CheckCircle, AlertTriangle, ChevronRight, FileSearch, ArrowRight, ShieldCheck, 
    Save, Play, Loader2, ArrowLeft, RefreshCw, Activity
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { InputField } from '../components/ui/InputField';
import { useToast } from '../context/ToastContext';


const FIRReader = () => {
    const navigate = useNavigate();
    const { toast } = useToast();
    const fileInputRef = useRef(null);
    
    const [file, setFile] = useState(null);
    const [status, setStatus] = useState('idle'); // idle, reading, parsing, reviewing
    const [logs, setLogs] = useState([]);
    
    const [extractedData, setExtractedData] = useState({});
    const [confidenceScores, setConfidenceScores] = useState({});
    const [progress, setProgress] = useState(0);

    const addLog = (msg, type = 'info') => {
        setLogs(prev => [...prev, { time: new Date().toLocaleTimeString(), msg, type }]);
    };

    const handleFileChange = (e) => {
        const selectedFile = e.target.files[0];
        if (selectedFile && selectedFile.type === 'application/pdf') {
            setFile(selectedFile);
            setStatus('idle');
            setLogs([]);
            setExtractedData({});
            setProgress(0);
        } else {
            toast.error("Please upload a valid PDF file.", "Invalid Format");
        }
    };

    const processPDF = async () => {
        if (!file) return;
        setStatus('reading');
        addLog(`Sending PDF for structural extraction: ${file.name}`);
        
        try {
            const formData = new FormData();
            formData.append('fir_file', file);
            
            setProgress(30);
            
            const token = localStorage.getItem('token');
            const response = await fetch('http://localhost:5174/api/cases/parse-pdf', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            });
            
            setProgress(70);
            
            const result = await response.json();
            
            if (!response.ok || !result.success) {
                throw new Error(result.message || 'Failed to extract data');
            }
            
            setProgress(100);
            addLog(`PDF parsed successfully.`, 'success');
            
            parseExtractedData(result.data);
            
        } catch (error) {
            console.error(error);
            addLog(`Extraction Error: ${error.message}`, 'error');
            toast.error("Failed to read PDF file.", "Extraction Failed");
            setStatus('idle');
        }
    };

    const parseExtractedData = (data) => {
        setStatus('parsing');
        addLog(`Mapping extracted JSON to form...`);
        
        // Setup default object matching CaseForm state
        const parsed = {
            fir_no: data.fir?.fir_no || '',
            fir_date: data.fir?.fir_date ? data.fir.fir_date.replace(/\//g, '-') : '',
            police_station: data.fir?.police_station_hi || data.fir?.police_station_en || '',
            district: data.fir?.district_hi || data.fir?.district_en || '',
            sections: data.acts_sections?.map(s => s.section).join(', ') || '',
            complainant_name: data.complainant?.name || '',
            complainant_mobile: data.complainant?.mobile || '',
            complainant_email: data.complainant?.email || '',
            complainant_address: data.complainant?.addresses?.[0]?.address || '',
            fraud_amount: '', // Requires custom regex logic if needed, or null
            description: data.brief_facts || '',
        };
        
        const conf = {
            fir_no: parsed.fir_no ? 100 : 0,
            fir_date: parsed.fir_date ? 100 : 0,
            police_station: parsed.police_station ? 100 : 0,
            district: parsed.district ? 100 : 0,
            sections: parsed.sections ? 100 : 0,
            complainant_name: parsed.complainant_name ? 100 : 0,
            complainant_mobile: parsed.complainant_mobile ? 100 : 0,
            complainant_email: parsed.complainant_email ? 100 : 0,
            complainant_address: parsed.complainant_address ? 100 : 0,
            description: parsed.description ? 100 : 0,
        };

        if (data.properties && data.properties.length > 0) {
            parsed.fraud_amount = data.properties[0].value || '';
            conf.fraud_amount = parsed.fraud_amount ? 100 : 0;
        }

        setExtractedData(parsed);
        setConfidenceScores(conf);
        setStatus('reviewing');
        addLog(`Mapping complete. Ready for Review.`, 'success');
    };

    const handleFieldChange = (field, value) => {
        setExtractedData(prev => ({ ...prev, [field]: value }));
        setConfidenceScores(prev => ({ ...prev, [field]: 100 })); // User edited, so 100% confidence
    };

    const handleFillForm = () => {
        // We will create the exact draft structure expected by CaseForm.jsx
        const draft = {
            step: 1,
            formData: {
                district: extractedData.district || '',
                police_station: extractedData.police_station || '',
                fir_no: extractedData.fir_no || '',
                fir_year: new Date().getFullYear().toString(),
                fir_date: extractedData.fir_date || '',
                fir_time: '',
                info_received_date: '',
                info_received_time: '',
                gd_no: '',
                sections: extractedData.sections || '',
                occurrence_date_from: '',
                occurrence_date_to: '',
                occurrence_time_from: '',
                occurrence_time_to: '',
                place_of_incident: '',
                incident_address: '',
                distance_from_ps: '',
                beat_number: '',
                complainant_name: extractedData.complainant_name || '',
                complainant_mobile: extractedData.complainant_mobile || '',
                complainant_email: extractedData.complainant_email || '',
                complainant_address: extractedData.complainant_address || '',
                complainant_aadhaar: '',
                complainant_pan: '',
                is_victim_same: true,
                victim_name: '',
                victim_mobile: '',
                victim_email: '',
                victim_address: '',
                fraud_amount: extractedData.fraud_amount || '',
                bank_name: '',
                account_no: '',
                ackn_no: '',
                description: extractedData.description || '',
                whatsapp_no: '',
                gmail_id: '',
                facebook_id: '',
                twitter_id: '',
                linkedin_id: '',
                insta_id: '',
                telegram_id: '',
                website_url: '',
                other_social: '',
                assigned_to: '',
                sho_details: '',
                priority_id: '3',
                status_id: '1',
                remarks: '',
            },
            accusedList: [{
                name: '', alias: '', mobile: '', whatsapp_no: '', gmail_id: '', facebook_id: '', twitter_id: '', linkedin_id: '', insta_id: '', telegram_id: '', website_url: '', other_social: ''
            }]
        };

        localStorage.setItem('caseFormDraft', JSON.stringify(draft));
        toast.success("Draft securely transported to Case Form.", "Link Established");
        navigate('/cases/new');
    };

    const getConfidenceColor = (score) => {
        if (score >= 90) return 'text-emerald-500 bg-emerald-50 border-emerald-200';
        if (score >= 70) return 'text-amber-500 bg-amber-50 border-amber-200';
        return 'text-rose-500 bg-rose-50 border-rose-200';
    };

    return (
        <div className="max-w-6xl mx-auto space-y-6">
            <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 bg-indigo-100 rounded-2xl flex items-center justify-center border border-indigo-200 shadow-sm">
                    <FileSearch className="text-indigo-600" size={24} />
                </div>
                <div>
                    <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight">FIR AI Reader</h1>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">OCR Neural Extraction Protocol</p>
                </div>
            </div>

            <div className="grid grid-cols-12 gap-6">
                {/* Left Column: Upload & Logs */}
                <div className="col-span-12 lg:col-span-4 space-y-6">
                    <Card className="p-6">
                        <div className="mb-4 flex items-center justify-between">
                            <h2 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                                <Upload size={14} /> Document Upload
                            </h2>
                            {status === 'reading' && <Loader2 size={14} className="animate-spin text-indigo-500" />}
                        </div>

                        <div 
                            className={`border-2 border-dashed rounded-3xl p-8 text-center transition-all ${
                                file ? 'border-emerald-300 bg-emerald-50' : 'border-slate-300 hover:border-indigo-400 hover:bg-indigo-50'
                            }`}
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={(e) => {
                                e.preventDefault();
                                if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                                    handleFileChange({ target: { files: e.dataTransfer.files } });
                                }
                            }}
                        >
                            <input 
                                type="file" 
                                accept="application/pdf"
                                onChange={handleFileChange}
                                className="hidden"
                                ref={fileInputRef}
                            />
                            <div className="flex flex-col items-center">
                                {file ? (
                                    <>
                                        <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mb-4">
                                            <FileText size={32} />
                                        </div>
                                        <p className="text-sm font-black text-slate-800 mb-1">{file.name}</p>
                                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4">
                                            {(file.size / 1024 / 1024).toFixed(2)} MB PDF Document
                                        </p>
                                        <Button variant="outline" onClick={() => fileInputRef.current?.click()} className="text-xs">Change File</Button>
                                    </>
                                ) : (
                                    <>
                                        <div className="w-16 h-16 bg-white border border-slate-200 text-slate-400 rounded-2xl flex items-center justify-center mb-4 shadow-sm transition-all">
                                            <Upload size={32} />
                                        </div>
                                        <p className="text-sm font-black text-slate-800 mb-2">Drag & Drop FIR PDF here</p>
                                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4">
                                            Native PDF & Scanned Support
                                        </p>
                                        <Button variant="primary" onClick={() => fileInputRef.current?.click()} className="shadow-md">Browse PDF</Button>
                                    </>
                                )}
                            </div>
                        </div>

                        {file && status === 'idle' && (
                            <Button 
                                variant="primary" 
                                className="w-full mt-6 py-4 shadow-lg shadow-indigo-200"
                                icon={Play}
                                onClick={processPDF}
                            >
                                Initiate Extraction
                            </Button>
                        )}
                        
                        {status === 'reviewing' && (
                            <Button 
                                variant="outline" 
                                className="w-full mt-6 border-slate-300 text-slate-600 hover:bg-slate-50"
                                icon={RefreshCw}
                                onClick={() => { setFile(null); setStatus('idle'); setLogs([]); }}
                            >
                                Process New File
                            </Button>
                        )}
                    </Card>

                    {/* OCR Logs Panel */}
                    <Card className="p-6 h-[400px] flex flex-col">
                        <h2 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-2 mb-4 border-b border-slate-100 pb-4">
                            <Activity size={14} className="text-indigo-500" /> Extraction Console
                        </h2>
                        <div className="flex-1 overflow-y-auto bg-slate-900 rounded-2xl p-4 space-y-2 font-mono text-[10px] shadow-inner">
                            {logs.length === 0 && (
                                <div className="text-slate-600 h-full flex items-center justify-center italic">
                                    System awaiting input...
                                </div>
                            )}
                            {logs.map((log, idx) => (
                                <div key={idx} className={`flex gap-3 ${log.type === 'error' ? 'text-rose-400' : log.type === 'success' ? 'text-emerald-400' : log.type === 'warning' ? 'text-amber-400' : 'text-slate-300'}`}>
                                    <span className="text-slate-600 opacity-50 select-none">[{log.time}]</span>
                                    <span>{log.msg}</span>
                                </div>
                            ))}
                        </div>
                    </Card>
                </div>

                {/* Right Column: Review Screen */}
                <div className="col-span-12 lg:col-span-8">
                    <Card className="p-6 h-full min-h-[600px] flex flex-col relative overflow-hidden">
                        {status !== 'reviewing' && (
                            <div className="absolute inset-0 bg-slate-50/80 backdrop-blur-sm z-10 flex flex-col items-center justify-center text-center p-10 border border-slate-100/50 rounded-[32px]">
                                {status === 'idle' ? (
                                    <>
                                        <ShieldCheck size={64} className="text-slate-300 mb-6" />
                                        <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight mb-2">Awaiting Document</h3>
                                        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest max-w-sm leading-relaxed">
                                            Upload a PDF and initiate extraction. The neural engine will automatically map fields with confidence metrics.
                                        </p>
                                    </>
                                ) : (
                                    <>
                                        <Loader2 size={48} className="text-indigo-500 animate-spin mb-6" />
                                        <h3 className="text-xl font-black text-indigo-900 uppercase tracking-tight mb-2 animate-pulse">Running Deep Scan</h3>
                                        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-6">
                                            {status === 'reading' ? 'Extracting text and running OCR on image layers...' : 'Applying regex constraints and field mapping...'}
                                        </p>
                                        
                                        {status === 'reading' && (
                                            <div className="w-full max-w-md">
                                                <div className="flex justify-between text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">
                                                    <span>Processing Document</span>
                                                    <span>{progress}%</span>
                                                </div>
                                                <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                                                    <div 
                                                        className="h-full bg-indigo-500 transition-all duration-300 ease-out"
                                                        style={{ width: `${progress}%` }}
                                                    ></div>
                                                </div>
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        )}

                        <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-6">
                            <h2 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                                <CheckCircle size={16} className="text-emerald-500" /> Review Extracted Parameters
                            </h2>
                            <div className="flex gap-2">
                                <div className="flex items-center gap-1.5 px-2 py-1 bg-emerald-50 border border-emerald-100 rounded text-[9px] font-black uppercase text-emerald-600">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> {'>'} 90%
                                </div>
                                <div className="flex items-center gap-1.5 px-2 py-1 bg-amber-50 border border-amber-100 rounded text-[9px] font-black uppercase text-amber-600">
                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span> 70-89%
                                </div>
                                <div className="flex items-center gap-1.5 px-2 py-1 bg-rose-50 border border-rose-100 rounded text-[9px] font-black uppercase text-rose-600">
                                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span> {'<'} 70%
                                </div>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto pr-4 space-y-8">
                            {/* FIR Information */}
                            <section>
                                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                    A. FIR Information
                                </h3>
                                <div className="grid grid-cols-2 gap-4">
                                    {['fir_no', 'fir_date', 'police_station', 'district'].map(field => (
                                        <div key={field} className="relative group">
                                            <InputField 
                                                label={field.replace('_', ' ').toUpperCase()} 
                                                value={extractedData[field] || ''} 
                                                onChange={(e) => handleFieldChange(field, e.target.value)}
                                            />
                                            {confidenceScores[field] !== undefined && (
                                                <div className={`absolute top-0 right-0 px-2 py-0.5 text-[9px] font-black rounded-bl-lg rounded-tr-lg border-b border-l ${getConfidenceColor(confidenceScores[field])}`}>
                                                    {confidenceScores[field]}% CONF
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </section>

                            {/* Complainant Information */}
                            <section>
                                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                    B. Complainant Information
                                </h3>
                                <div className="grid grid-cols-2 gap-4">
                                    {['complainant_name', 'complainant_mobile', 'complainant_email'].map(field => (
                                        <div key={field} className="relative group">
                                            <InputField 
                                                label={field.replace('complainant_', '').toUpperCase()} 
                                                value={extractedData[field] || ''} 
                                                onChange={(e) => handleFieldChange(field, e.target.value)}
                                            />
                                            {confidenceScores[field] !== undefined && (
                                                <div className={`absolute top-0 right-0 px-2 py-0.5 text-[9px] font-black rounded-bl-lg rounded-tr-lg border-b border-l ${getConfidenceColor(confidenceScores[field])}`}>
                                                    {confidenceScores[field]}% CONF
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </section>

                            {/* Additional Information */}
                            <section>
                                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                    C. Additional Details
                                </h3>
                                <div className="grid grid-cols-2 gap-4">
                                    {['fraud_amount', 'sections'].map(field => (
                                        <div key={field} className="relative group">
                                            <InputField 
                                                label={field.replace('_', ' ').toUpperCase()} 
                                                value={extractedData[field] || ''} 
                                                onChange={(e) => handleFieldChange(field, e.target.value)}
                                            />
                                            {confidenceScores[field] !== undefined && (
                                                <div className={`absolute top-0 right-0 px-2 py-0.5 text-[9px] font-black rounded-bl-lg rounded-tr-lg border-b border-l ${getConfidenceColor(confidenceScores[field])}`}>
                                                    {confidenceScores[field]}% CONF
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                                <div className="mt-4 relative group">
                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Complaint Description / Narrative</label>
                                    <textarea 
                                        className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-sm font-semibold rounded-2xl px-4 py-3 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all resize-y min-h-[120px]"
                                        value={extractedData.description || ''}
                                        onChange={(e) => handleFieldChange('description', e.target.value)}
                                    />
                                    {confidenceScores['description'] !== undefined && (
                                        <div className={`absolute top-0 right-0 px-2 py-0.5 text-[9px] font-black rounded-bl-lg rounded-tr-lg border-b border-l ${getConfidenceColor(confidenceScores['description'])}`}>
                                            RAW TEXT EXTRACT
                                        </div>
                                    )}
                                </div>
                            </section>
                        </div>

                        <div className="mt-6 pt-6 border-t border-slate-100 flex items-center justify-between">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                <AlertTriangle size={12} className="inline mr-1 -mt-0.5 text-amber-500" /> Ensure low-confidence fields are verified
                            </p>
                            <Button 
                                variant="primary" 
                                className="px-8 bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-200"
                                icon={ArrowRight}
                                onClick={handleFillForm}
                            >
                                Fill Existing FIR Form
                            </Button>
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
};

export default FIRReader;
