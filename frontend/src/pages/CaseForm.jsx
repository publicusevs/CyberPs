import React, { useState, useEffect } from 'react';
import api from '../services/api';
import {
    FilePlus,
    User,
    Shield,
    AlertTriangle,
    Upload,
    CheckCircle2,
    ChevronRight,
    ArrowLeft,
    Banknote,
    Fingerprint,
    ShieldAlert,
    Lock,
    Activity,
    MessageCircle,
    Mail,
    Globe,
    Link,
    Hash,
    AtSign,
    Calendar,
    Clock,
    MapPin,
    Bookmark,
    Save,
    Crosshair
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { InputField, SelectField } from '../components/ui/InputField';
import { Button } from '../components/ui/Button';
import { motion, AnimatePresence } from 'framer-motion';

const CaseForm = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const isEditMode = Boolean(id);
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [investigators, setInvestigators] = useState([]);
    const [errors, setErrors] = useState({});

    const [formData, setFormData] = useState({
        // Step 1: FIR Core Details
        district: '',
        police_station: '',
        fir_no: '',
        fir_year: new Date().getFullYear().toString(),
        fir_date: '',
        fir_time: '',
        info_received_date: '',
        info_received_time: '',
        gd_no: '',
        sections: '',

        // Existing / Legacy Fields (for subsequent steps or compatibility)
        ackn_no: '',
        fraud_amount: '',
        description: '',
        assigned_to: '',
        victim_name: '',
        victim_mobile: '',
        victim_email: '',
        victim_address: '',
        bank_name: '',
        account_no: '',
        whatsapp_no: '',
        gmail_id: '',
        facebook_id: '',
        twitter_id: '',
        linkedin_id: '',
        insta_id: '',
        telegram_id: '',
        website_url: '',
        other_social: ''
    });

    const [accusedList, setAccusedList] = useState([{
        name: '',
        alias: '',
        mobile: '',
        whatsapp_no: '',
        gmail_id: '',
        facebook_id: '',
        twitter_id: '',
        linkedin_id: '',
        insta_id: '',
        telegram_id: '',
        website_url: '',
        other_social: ''
    }]);

    const [firFile, setFirFile] = useState(null);
    const [preview, setPreview] = useState(null);

    useEffect(() => {
        fetchInvestigators();
        if (isEditMode) {
            fetchCaseData();
        } else {
            // Load Draft
            const draft = localStorage.getItem('caseFormDraft');
            if (draft) {
                try {
                    const parsed = JSON.parse(draft);
                    if (parsed.formData) setFormData(parsed.formData);
                    if (parsed.accusedList) setAccusedList(parsed.accusedList);
                    if (parsed.step) setStep(parsed.step);
                } catch (e) {
                    console.error("Failed to parse draft", e);
                }
            }
        }
    }, [id, isEditMode]);

    const fetchCaseData = async () => {
        try {
            const res = await api.get(`/cases/${id}`);
            if (res.data.success) {
                const { case: details, victim, accusedList: loadedAccused } = res.data;
                setFormData(prev => ({
                    ...prev,
                    fir_no: details.fir_no || '',
                    ackn_no: details.ackn_no || '',
                    fraud_amount: details.fraud_amount || '',
                    description: details.description || '',
                    assigned_to: details.assigned_to || '',
                    victim_name: victim?.name || '',
                    victim_mobile: victim?.mobile || '',
                    victim_email: victim?.email || '',
                    victim_address: victim?.address || '',
                    bank_name: victim?.bank_name || '',
                    account_no: victim?.account_no || '',
                }));
                if (loadedAccused && loadedAccused.length > 0) {
                    setAccusedList(loadedAccused);
                }
            }
        } catch (err) {
            console.error('Failed to sync case uplink for editing');
        }
    };

    const fetchInvestigators = async () => {
        try {
            const res = await api.get('/users/investigators');
            if (res.data.success) {
                setInvestigators(res.data.data);
            }
        } catch (err) {
            console.error('Failed to sync investigator uplink');
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        // Clear error on typing
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: null }));
        }
    };

    const handleAccusedChange = (index, e) => {
        const { name, value } = e.target;
        const newList = [...accusedList];
        newList[index][name] = value;
        setAccusedList(newList);
    };

    const addAccusedProfile = () => {
        setAccusedList([...accusedList, { name: '', alias: '', mobile: '', whatsapp_no: '', gmail_id: '', facebook_id: '', twitter_id: '', linkedin_id: '', insta_id: '', telegram_id: '', website_url: '', other_social: '' }]);
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        setFirFile(file);
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => setPreview(reader.result);
            reader.readAsDataURL(file);
        }
    };

    const saveDraft = () => {
        localStorage.setItem('caseFormDraft', JSON.stringify({ formData, accusedList, step }));
        alert("Draft securely saved to local storage.");
    };

    const validateStep = (currentStep) => {
        const newErrors = {};
        if (currentStep === 1) {
            if (!formData.district) newErrors.district = "District is required";
            if (!formData.police_station) newErrors.police_station = "Police Station is required";
            if (!formData.fir_no) newErrors.fir_no = "FIR No is required";
            if (!formData.fir_year) newErrors.fir_year = "FIR Year is required";
            if (!formData.fir_date) newErrors.fir_date = "FIR Date is required";
        }
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleNext = () => {
        if (validateStep(step)) {
            setStep(s => s + 1);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        // This is a placeholder for the final phase
        if (!validateStep(step)) return;

        setLoading(true);

        const data = new FormData();
        Object.keys(formData).forEach(key => data.append(key, formData[key]));
        if (firFile) data.append('fir_file', firFile);
        data.append('uploadType', 'fir');
        data.append('accusedList', JSON.stringify(accusedList));

        try {
            // Placeholder: currently disabled backend API execution to prevent errors in this phase as per request.
            // const res = isEditMode
            //    ? await api.put(`/cases/${id}/full`, data)
            //    : await api.post('/cases', data);
            // if (res.data.success) {
            
            // Temporary clear draft and navigate simulation
            localStorage.removeItem('caseFormDraft');
            alert("Success: Case Registration Wizard UI Completed.");
            navigate('/cases');
            
        } catch (err) {
            alert(err.response?.data?.message || 'Data sync failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-5xl mx-auto space-y-10 animate-in slide-in-from-bottom duration-500 pb-20">
            {/* Header Section */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate(-1)} className="p-3 bg-white border border-slate-200 rounded-2xl hover:bg-blue-600 hover:text-white transition-all text-slate-400">
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase">{isEditMode ? 'Modify Case Protocol' : 'New Case Registration'}</h1>
                        <p className="text-slate-400 text-[10px] font-black tracking-widest uppercase mt-1">Initiating secure case registration matrix</p>
                    </div>
                </div>

                {/* Visual Step Indicator (6 steps) */}
                <div className="flex flex-col items-end gap-2">
                    <div className="flex gap-1.5 w-64">
                        {[1, 2, 3, 4, 5, 6].map(i => (
                            <div key={i} className={`h-1.5 flex-1 rounded-full transition-all duration-500 bg-slate-200 relative`}>
                                {step >= i && <motion.div layoutId="progress" className="absolute inset-0 bg-blue-600 shadow-md shadow-blue-200 rounded-full"></motion.div>}
                            </div>
                        ))}
                    </div>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Phase {step} / 6</span>
                </div>
            </div>

            <Card className="p-0 overflow-hidden relative shadow-xl shadow-slate-200/50">
                <form onSubmit={handleSubmit} className="relative z-10 p-10 bg-white">
                    <AnimatePresence mode="wait">
                        {step === 1 && (
                            <motion.div
                                key="step1"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="space-y-8"
                            >
                                <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                                    <Shield className="text-blue-600" size={24} />
                                    <h2 className="text-lg font-bold text-slate-900 tracking-tight uppercase">1. FIR Core Details</h2>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <InputField label="District / Commissionerate" name="district" required value={formData.district} onChange={handleInputChange} error={errors.district} icon={MapPin} placeholder="Enter District" />
                                    <InputField label="Police Station" name="police_station" required value={formData.police_station} onChange={handleInputChange} error={errors.police_station} icon={Shield} placeholder="Enter Police Station" />
                                    
                                    <InputField label="FIR Number" name="fir_no" required value={formData.fir_no} onChange={handleInputChange} error={errors.fir_no} icon={Fingerprint} placeholder="EX: 0451" />
                                    <InputField label="FIR Year" name="fir_year" required value={formData.fir_year} onChange={handleInputChange} error={errors.fir_year} icon={Calendar} placeholder="YYYY" />
                                    
                                    <InputField type="date" label="FIR Date" name="fir_date" required value={formData.fir_date} onChange={handleInputChange} error={errors.fir_date} icon={Calendar} />
                                    <InputField type="time" label="FIR Time" name="fir_time" value={formData.fir_time} onChange={handleInputChange} error={errors.fir_time} icon={Clock} />
                                    
                                    <InputField type="date" label="Info Received Date" name="info_received_date" value={formData.info_received_date} onChange={handleInputChange} error={errors.info_received_date} icon={Calendar} />
                                    <InputField type="time" label="Info Received Time" name="info_received_time" value={formData.info_received_time} onChange={handleInputChange} error={errors.info_received_time} icon={Clock} />
                                    
                                    <InputField label="General Diary (GD) / Entry No" name="gd_no" value={formData.gd_no} onChange={handleInputChange} error={errors.gd_no} icon={Bookmark} placeholder="GD Number" />
                                    <InputField label="Sections / Acts" name="sections" value={formData.sections} onChange={handleInputChange} error={errors.sections} icon={AlertTriangle} placeholder="e.g. 420 IPC, 66D IT Act" />
                                </div>
                            </motion.div>
                        )}

                        {step === 2 && (
                            <motion.div
                                key="step2"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="space-y-8"
                            >
                                <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                                    <Crosshair className="text-blue-600" size={24} />
                                    <h2 className="text-lg font-bold text-slate-900 tracking-tight uppercase">2. Occurrence / Incident Details</h2>
                                </div>
                                <div className="py-16 text-center">
                                    <p className="text-slate-400 font-medium uppercase tracking-widest text-sm">UI Placeholder: Incident Details</p>
                                </div>
                            </motion.div>
                        )}

                        {step === 3 && (
                            <motion.div
                                key="step3"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="space-y-8"
                            >
                                <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                                    <User className="text-blue-600" size={24} />
                                    <h2 className="text-lg font-bold text-slate-900 tracking-tight uppercase">3. Complainant / Victim Details</h2>
                                </div>
                                <div className="py-16 text-center">
                                    <p className="text-slate-400 font-medium uppercase tracking-widest text-sm">UI Placeholder: Victim Details</p>
                                </div>
                            </motion.div>
                        )}

                        {step === 4 && (
                            <motion.div
                                key="step4"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="space-y-8"
                            >
                                <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                                    <Banknote className="text-blue-600" size={24} />
                                    <h2 className="text-lg font-bold text-slate-900 tracking-tight uppercase">4. Fraud / Cyber Crime Details</h2>
                                </div>
                                <div className="py-16 text-center">
                                    <p className="text-slate-400 font-medium uppercase tracking-widest text-sm">UI Placeholder: Cyber Crime Details</p>
                                </div>
                            </motion.div>
                        )}

                        {step === 5 && (
                            <motion.div
                                key="step5"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="space-y-8"
                            >
                                <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                                    <Globe className="text-blue-600" size={24} />
                                    <h2 className="text-lg font-bold text-slate-900 tracking-tight uppercase">5. Accused / Social Footprint Details</h2>
                                </div>
                                <div className="py-16 text-center">
                                    <p className="text-slate-400 font-medium uppercase tracking-widest text-sm">UI Placeholder: Accused Footprints</p>
                                </div>
                            </motion.div>
                        )}

                        {step === 6 && (
                            <motion.div
                                key="step6"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="space-y-8"
                            >
                                <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                                    <CheckCircle2 className="text-blue-600" size={24} />
                                    <h2 className="text-lg font-bold text-slate-900 tracking-tight uppercase">6. Officer Assignment & Review</h2>
                                </div>
                                <div className="py-16 text-center">
                                    <p className="text-slate-400 font-medium uppercase tracking-widest text-sm">UI Placeholder: Final Review</p>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <div className="flex justify-between items-center pt-10 mt-10 border-t border-slate-100">
                        <div className="flex gap-4">
                            {step > 1 ? (
                                <Button variant="outline" type="button" onClick={() => setStep(s => s - 1)}>
                                    Previous Phase
                                </Button>
                            ) : <div></div>}
                            
                            <Button 
                                variant="outline" 
                                type="button" 
                                onClick={saveDraft} 
                                className="border-blue-200 text-blue-700 bg-blue-50 hover:bg-blue-100"
                            >
                                <Save size={16} className="mr-2 inline" /> Save as Draft
                            </Button>
                        </div>

                        {step < 6 ? (
                            <Button variant="primary" type="button" onClick={handleNext} className="px-10">
                                Proceed <ChevronRight size={18} />
                            </Button>
                        ) : (
                            <Button variant="secondary" type="submit" loading={loading} className="px-12">
                                <CheckCircle2 size={18} /> Seal Case Record
                            </Button>
                        )}
                    </div>
                </form>
            </Card>
        </div>
    );
};

export default CaseForm;
