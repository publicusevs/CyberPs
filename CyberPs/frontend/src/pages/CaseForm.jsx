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
    AtSign
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

    const [formData, setFormData] = useState({
        fir_no: '',
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

    // Accused Module Handlers
    const handleAccusedChange = (index, e) => {
        const { name, value } = e.target;
        const newList = [...accusedList];
        newList[index][name] = value;
        setAccusedList(newList);
    };

    const addAccusedProfile = () => {
        setAccusedList([...accusedList, { name: '', alias: '', mobile: '', whatsapp_no: '', gmail_id: '', facebook_id: '', twitter_id: '', linkedin_id: '', insta_id: '', telegram_id: '', website_url: '', other_social: '' }]);
    };

    useEffect(() => {
        fetchInvestigators();
        if (isEditMode) {
            fetchCaseData();
        }
    }, [id]);

    const fetchCaseData = async () => {
        try {
            const res = await api.get(`/cases/${id}`);
            if (res.data.success) {
                const { case: details, victim, accusedList: loadedAccused } = res.data;
                setFormData({
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
                    whatsapp_no: '', gmail_id: '', facebook_id: '', twitter_id: '', linkedin_id: '', insta_id: '', telegram_id: '', website_url: '', other_social: ''
                });
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

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        const data = new FormData();
        Object.keys(formData).forEach(key => data.append(key, formData[key]));
        if (firFile) data.append('fir_file', firFile);
        data.append('uploadType', 'fir');
        data.append('accusedList', JSON.stringify(accusedList));

        try {
            const res = isEditMode
                ? await api.put(`/cases/${id}/full`, data)
                : await api.post('/cases', data);

            if (res.data.success) {
                navigate(isEditMode ? `/cases/${id}` : '/cases');
            }
        } catch (err) {
            alert(err.response?.data?.message || 'Data sync failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-10 animate-in slide-in-from-bottom duration-500 pb-20">
            {/* Header Section */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate(-1)} className="p-3 bg-white border border-slate-200 rounded-2xl hover:bg-blue-600 hover:text-white transition-all text-slate-400">
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase">{isEditMode ? 'Modify Case Protocol' : 'New Case Protocol'}</h1>
                        <p className="text-slate-400 text-[10px] font-black tracking-widest uppercase mt-1">Initiating secure case registration matrix</p>
                    </div>
                </div>

                {/* Visual Step Indicator */}
                <div className="flex gap-2">
                    {[1, 2, 3].map(i => (
                        <div key={i} className={`h-1.5 w-12 rounded-full transition-all duration-500 bg-slate-200 relative`}>
                            {step >= i && <motion.div layoutId="progress" className="absolute inset-0 bg-blue-600 shadow-md shadow-blue-200"></motion.div>}
                        </div>
                    ))}
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
                                    <h2 className="text-lg font-bold text-slate-900 tracking-tight uppercase">Base Investigation Auth</h2>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <InputField label="FIR Registry Code" name="fir_no" required value={formData.fir_no} onChange={handleInputChange} icon={Fingerprint} placeholder="EX: 0451/2026" />
                                    <InputField label="Portal Reference (ACKN)" name="ackn_no" value={formData.ackn_no} onChange={handleInputChange} icon={Shield} placeholder="REF://CYBER/..." />
                                    <InputField label="Fraud Asset Value (₹)" name="fraud_amount" type="number" required value={formData.fraud_amount} onChange={handleInputChange} icon={Banknote} placeholder="Numerical value only" />
                                    <SelectField
                                        label="Investigating Officer (IO)"
                                        name="assigned_to"
                                        required
                                        icon={ShieldAlert}
                                        value={formData.assigned_to}
                                        onChange={handleInputChange}
                                        options={investigators.map(i => ({ value: i.user_id, label: `${i.name} (${i.role})` }))}
                                        placeholder="Select Assignee"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-slate-400 tracking-widest uppercase ml-1">Mission Briefing / Incident Log</label>
                                    <textarea
                                        name="description"
                                        rows="4"
                                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm outline-none focus:border-blue-600 focus:bg-white transition-all resize-none text-slate-800"
                                        placeholder="Detailed event log..."
                                        value={formData.description}
                                        onChange={handleInputChange}
                                    ></textarea>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-4">
                                    <InputField
                                        label="Assigned Police Station"
                                        icon={Lock}
                                        value="Central Cyber Cell, Headquarters"
                                        disabled
                                    />
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
                                    <User className="text-emerald-600" size={24} />
                                    <h2 className="text-lg font-bold text-slate-900 tracking-tight uppercase">Victim / Asset Holder Profile</h2>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                    <div className="md:col-span-2">
                                        <InputField label="Subject Full Name" name="victim_name" required value={formData.victim_name} onChange={handleInputChange} icon={User} />
                                    </div>
                                    <InputField label="Primary COM Link" name="victim_mobile" required value={formData.victim_mobile} onChange={handleInputChange} icon={Activity} placeholder="+91 XXXX..." />

                                    <InputField label="Target Financial Institute" name="bank_name" value={formData.bank_name} onChange={handleInputChange} icon={Banknote} placeholder="Sovereign Node" />
                                    <div className="md:col-span-2">
                                        <InputField label="Account ID / Number" name="account_no" value={formData.account_no} onChange={handleInputChange} icon={Shield} />
                                    </div>
                                </div>
                                <InputField label="Last Known Geographic Node (Address)" name="victim_address" value={formData.victim_address} onChange={handleInputChange} />

                                {/* Multiple Suspects Array Block */}
                                <div className="mt-12 pt-8 border-t border-slate-100">
                                    <div className="flex items-center justify-between mb-6">
                                        <div className="flex items-center gap-3">
                                            <Globe className="text-rose-500" size={20} />
                                            <h3 className="text-sm font-black text-slate-900 tracking-tight uppercase">Suspect Digital Footprints / Social OSINT</h3>
                                        </div>
                                        <Button variant="outline" type="button" onClick={addAccusedProfile} className="text-[10px] uppercase font-bold tracking-widest text-blue-600 bg-blue-50 border-blue-100 shadow-sm" icon={FilePlus}>
                                            Add Another Accused
                                        </Button>
                                    </div>

                                    <div className="space-y-6">
                                        {accusedList.map((accused, idx) => (
                                            <div key={idx} className="bg-slate-50 border border-slate-100 p-6 rounded-[24px]">
                                                <div className="flex items-center gap-2 mb-4">
                                                    <div className="bg-rose-500 text-white font-black text-[10px] w-6 h-6 flex items-center justify-center rounded-full leading-none">{idx + 1}</div>
                                                    <h4 className="text-[11px] font-black uppercase text-slate-900 tracking-widest">Accused Profile</h4>
                                                </div>
                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                                                    <InputField label="Accused Name" name="name" value={accused.name} onChange={(e) => handleAccusedChange(idx, e)} icon={User} placeholder="John Doe" />
                                                    <InputField label="Alias / Nickname" name="alias" value={accused.alias} onChange={(e) => handleAccusedChange(idx, e)} icon={User} placeholder="Phantom..." />
                                                    <InputField label="Suspect Mobile" name="mobile" value={accused.mobile} onChange={(e) => handleAccusedChange(idx, e)} icon={Activity} placeholder="+91..." />
                                                </div>
                                                <h4 className="text-[10px] font-bold uppercase text-slate-400 tracking-widest mb-4 border-b border-slate-200 pb-2">Acquired Footprints</h4>
                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                                    <InputField label="WhatsApp Number" name="whatsapp_no" value={accused.whatsapp_no} onChange={(e) => handleAccusedChange(idx, e)} icon={MessageCircle} placeholder="+91..." />
                                                    <InputField label="Gmail / Email Link" name="gmail_id" value={accused.gmail_id} onChange={(e) => handleAccusedChange(idx, e)} icon={Mail} placeholder="fraud@gmail.com" />
                                                    <InputField label="Telegram ID" name="telegram_id" value={accused.telegram_id} onChange={(e) => handleAccusedChange(idx, e)} icon={MessageCircle} placeholder="@username" />
                                                    <InputField label="Facebook Profile" name="facebook_id" value={accused.facebook_id} onChange={(e) => handleAccusedChange(idx, e)} icon={Globe} placeholder="fb.com/..." />
                                                    <InputField label="Instagram Handle" name="insta_id" value={accused.insta_id} onChange={(e) => handleAccusedChange(idx, e)} icon={Hash} placeholder="@username" />
                                                    <InputField label="Twitter / X ID" name="twitter_id" value={accused.twitter_id} onChange={(e) => handleAccusedChange(idx, e)} icon={AtSign} placeholder="@username" />
                                                    <InputField label="LinkedIn Profile" name="linkedin_id" value={accused.linkedin_id} onChange={(e) => handleAccusedChange(idx, e)} icon={Globe} placeholder="linkedin.com/in/..." />
                                                    <InputField label="Associated Website" name="website_url" value={accused.website_url} onChange={(e) => handleAccusedChange(idx, e)} icon={Link} placeholder="https://..." />
                                                    <InputField label="Other Social Footprint" name="other_social" value={accused.other_social} onChange={(e) => handleAccusedChange(idx, e)} icon={Globe} placeholder="Snapchat, Discord, etc." />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
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
                                    <Upload className="text-blue-600" size={24} />
                                    <h2 className="text-lg font-bold text-slate-900 tracking-tight uppercase">Secure Artifact Upload</h2>
                                </div>

                                <label className="block border-2 border-dashed border-slate-200 rounded-3xl p-16 text-center hover:border-blue-600 hover:bg-blue-50 transition-all cursor-pointer group">
                                    <input type="file" onChange={handleFileChange} className="hidden" />
                                    <div className="w-20 h-20 bg-slate-50 border border-slate-100 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform shadow-sm">
                                        {preview ? (
                                            <img src={preview} alt="Upload Preview" className="w-full h-full object-cover rounded-full" />
                                        ) : (
                                            <Upload className="text-blue-600" size={32} />
                                        )}
                                    </div>
                                    <p className="text-lg font-bold text-slate-900 mb-2">{firFile ? firFile.name : 'Drop signed FIR artifact here'}</p>
                                    <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest leading-relaxed">Verifiable PDF, JPG or PNG formats only // Limit: 10MB</p>
                                </label>

                                <div className="bg-rose-50 p-6 rounded-2xl border border-rose-100 flex gap-4">
                                    <AlertTriangle className="text-rose-600 flex-shrink-0" size={24} />
                                    <div>
                                        <h4 className="text-xs font-black text-rose-600 uppercase tracking-widest mb-1">Critical Verification Required</h4>
                                        <p className="text-[11px] text-slate-600 leading-relaxed font-medium">
                                            By Finalizing this entry, you acknowledge that all data matches the physical case file. Incorrect entries will initiate a level-2 audit trail.
                                        </p>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <div className="flex justify-between items-center pt-10 mt-10 border-t border-slate-100">
                        {step > 1 ? (
                            <Button variant="outline" type="button" onClick={() => setStep(s => s - 1)}>
                                Previous Phase
                            </Button>
                        ) : <div />}

                        {step < 3 ? (
                            <Button variant="primary" type="button" onClick={() => setStep(s => s + 1)} className="px-10">
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
