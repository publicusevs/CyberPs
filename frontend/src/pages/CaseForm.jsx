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
import { useToast } from '../context/ToastContext';

const CaseForm = () => {
    const navigate = useNavigate();
    const { toast } = useToast();
    const { id } = useParams();
    const isEditMode = Boolean(id);
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [investigators, setInvestigators] = useState([]);
    const [districts, setDistricts] = useState([]);
    const [allStations, setAllStations] = useState([]);
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

        // Step 2: Occurrence / Incident Details
        occurrence_date_from: '',
        occurrence_date_to: '',
        occurrence_time_from: '',
        occurrence_time_to: '',
        place_of_incident: '',
        incident_address: '',
        distance_from_ps: '',
        beat_number: '',

        // Step 3: Complainant / Victim Details
        complainant_name: '',
        complainant_mobile: '',
        complainant_email: '',
        complainant_address: '',
        complainant_aadhaar: '',
        complainant_pan: '',
        is_victim_same: false,
        victim_name: '',
        victim_mobile: '',
        victim_email: '',
        victim_address: '',

        // Step 4: Fraud / Cyber Crime Details
        fraud_amount: '',
        bank_name: '',
        account_no: '',
        ackn_no: '',
        description: '',

        // Step 5: Accused Social Footprint (legacy single-accused fields)
        whatsapp_no: '',
        gmail_id: '',
        facebook_id: '',
        twitter_id: '',
        linkedin_id: '',
        insta_id: '',
        telegram_id: '',
        website_url: '',
        other_social: '',

        // Step 6: Officer Assignment & Review
        assigned_to: '',
        sho_details: '',
        priority_id: '3',
        status_id: '1',
        remarks: '',
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
        fetchDistricts();
        fetchStations();
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
                const { case: details, victim, complainant, transactions, accusedList: loadedAccused } = res.data;
                
                const formatDate = (dt) => dt ? dt.split('T')[0] : '';
                const formatTime = (dt) => {
                    if (!dt) return '';
                    const parts = dt.split('T');
                    return parts[1] ? parts[1].substring(0, 5) : '';
                };

                const comp = complainant || {};
                const trans = transactions || [];
                const firstTrans = trans[0] || {};

                setFormData({
                    // Step 1: FIR Core Details
                    district: details.district_id || '',
                    police_station: details.police_station_id || '',
                    fir_no: details.fir_no || '',
                    fir_year: (details.fir_year || '').toString(),
                    fir_date: formatDate(details.fir_datetime),
                    fir_time: formatTime(details.fir_datetime),
                    info_received_date: formatDate(details.info_received_datetime),
                    info_received_time: formatTime(details.info_received_datetime),
                    gd_no: details.gd_entry_no || '',
                    sections: details.sections || '',

                    // Step 2: Occurrence / Incident Details
                    occurrence_date_from: formatDate(details.occurrence_from_datetime),
                    occurrence_date_to: formatDate(details.occurrence_to_datetime),
                    occurrence_time_from: formatTime(details.occurrence_from_datetime),
                    occurrence_time_to: formatTime(details.occurrence_to_datetime),
                    place_of_incident: details.place_of_occurrence || '',
                    incident_address: details.incident_address || '',
                    distance_from_ps: details.distance_from_ps || '',
                    beat_number: details.beat_number || '',

                    // Step 3: Complainant / Victim Details
                    complainant_name: comp.name || '',
                    complainant_mobile: comp.mobile || '',
                    complainant_email: comp.email || '',
                    complainant_address: comp.address || '',
                    complainant_aadhaar: comp.aadhar_no || '',
                    complainant_pan: comp.pan_no || '',
                    is_victim_same: Boolean(details.is_victim_same_as_complainant),
                    victim_name: victim?.name || '',
                    victim_mobile: victim?.mobile || '',
                    victim_email: victim?.email || '',
                    victim_address: victim?.address || '',

                    // Step 4: Fraud / Cyber Crime Details
                    fraud_amount: details.fraud_amount || '',
                    bank_name: victim?.bank_name || firstTrans.receiver_bank || details.target_financial_institute || '',
                    account_no: victim?.account_no || firstTrans.receiver_acc || details.account_number || '',
                    ackn_no: details.ackn_no || '',
                    description: details.fir_narrative || details.description || '',

                    // Step 5: Accused Social Footprint (legacy single-accused fields)
                    whatsapp_no: details.whatsapp_no || '',
                    gmail_id: details.gmail_id || '',
                    facebook_id: details.facebook_id || '',
                    twitter_id: details.twitter_id || '',
                    linkedin_id: details.linkedin_id || '',
                    insta_id: details.insta_id || '',
                    telegram_id: details.telegram_id || '',
                    website_url: details.website_url || '',
                    other_social: details.other_social || '',

                    // Step 6: Officer Assignment & Review
                    assigned_to: details.assigned_to || '',
                    sho_details: details.sho_name || '',
                    priority_id: (details.priority_id || '3').toString(),
                    remarks: details.remarks || '',
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

    const fetchDistricts = async () => {
        try {
            const res = await api.get('/police-stations/districts');
            if (res.data.success) {
                setDistricts(res.data.data);
            }
        } catch (err) {
            console.error('Failed to fetch districts');
        }
    };

    const fetchStations = async () => {
        try {
            const res = await api.get('/police-stations');
            if (res.data.success) {
                setAllStations(res.data.data);
            }
        } catch (err) {
            console.error('Failed to fetch stations');
        }
    };

    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        const val = type === 'checkbox' ? checked : value;
        setFormData(prev => {
            const updated = { ...prev, [name]: val };
            if (name === 'district') {
                updated.police_station = '';
            }
            return updated;
        });
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

    const handleAutoFillPdf = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setFirFile(file);
        const reader = new FileReader();
        reader.onloadend = () => setPreview(reader.result);
        reader.readAsDataURL(file);

        const data = new FormData();
        data.append('fir_file', file);
        
        setLoading(true);
        try {
            const res = await api.post('/cases/parse-pdf', data, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            
            if (res.data.success && res.data.data) {
                const extracted = res.data.data;
                setFormData(prev => {
                    const mapped = { ...prev };
                    
                    const formatDt = (dStr) => {
                        if (!dStr) return '';
                        const parts = dStr.split('/');
                        return parts.length === 3 ? `${parts[2]}-${parts[1]}-${parts[0]}` : dStr;
                    };
                    
                    // Step 1: Core FIR Details
                    if (extracted.fir?.fir_no) mapped.fir_no = extracted.fir.fir_no;
                    if (extracted.fir?.year) mapped.fir_year = extracted.fir.year;
                    if (extracted.fir?.fir_date) mapped.fir_date = formatDt(extracted.fir.fir_date);
                    if (extracted.fir?.fir_time) mapped.fir_time = extracted.fir.fir_time;
                    if (extracted.fir?.gd_entry_no) mapped.gd_no = extracted.fir.gd_entry_no;
                    
                    if (extracted.occurrence?.information_received_date) mapped.info_received_date = formatDt(extracted.occurrence.information_received_date);
                    if (extracted.occurrence?.information_received_time) mapped.info_received_time = extracted.occurrence.information_received_time;
                    
                    // Sections / Acts formatting
                    if (extracted.acts_sections && extracted.acts_sections.length > 0) {
                        const sectionsList = extracted.acts_sections.map(a => {
                            const match = a.section ? a.section.match(/\d+[a-zA-Z]?(?:-[a-zA-Z]+)?(?:\([a-zA-Z]+\))?/g) : null;
                            return match ? match.join(', ') : '';
                        }).filter(Boolean).join(', ');
                        mapped.sections = sectionsList;
                    }
                    
                    // Match District and Police Station by Name
                    if (extracted.fir?.district_hi && districts.length > 0) {
                        const searchDist = String(extracted.fir.district_hi).toLowerCase();
                        const matchDist = districts.find(d => d && d.name && searchDist.includes(String(d.name).toLowerCase()));
                        if (matchDist) mapped.district = matchDist.id;
                    }
                    
                    if (extracted.fir?.police_station_hi && allStations.length > 0) {
                        const searchPs = String(extracted.fir.police_station_hi).toLowerCase();
                        const matchPs = allStations.find(ps => ps && ps.name && searchPs.includes(String(ps.name).toLowerCase()));
                        if (matchPs) mapped.police_station = matchPs.id;
                    }

                    // Step 2: Occurrence Details
                    if (extracted.occurrence?.date_from) mapped.occurrence_date_from = formatDt(extracted.occurrence.date_from);
                    if (extracted.occurrence?.date_to) mapped.occurrence_date_to = formatDt(extracted.occurrence.date_to);
                    if (extracted.occurrence?.time_from) mapped.occurrence_time_from = extracted.occurrence.time_from;
                    if (extracted.occurrence?.time_to) mapped.occurrence_time_to = extracted.occurrence.time_to;
                    
                    // Place of Occurrence
                    if (extracted.place_of_occurrence?.address) mapped.incident_address = extracted.place_of_occurrence.address;
                    if (extracted.place_of_occurrence?.direction_from_ps) mapped.distance_from_ps = extracted.place_of_occurrence.direction_from_ps;
                    if (extracted.place_of_occurrence?.beat_no) mapped.beat_number = extracted.place_of_occurrence.beat_no;
                    
                    // Step 3: Complainant Details
                    if (extracted.complainant?.name) mapped.complainant_name = extracted.complainant.name;
                    if (extracted.complainant?.mobile) mapped.complainant_mobile = extracted.complainant.mobile;
                    if (extracted.complainant?.uid) mapped.complainant_aadhaar = extracted.complainant.uid;
                    if (extracted.complainant?.address) mapped.complainant_address = extracted.complainant.address;
                    
                    // Step 4: Narrative
                    if (extracted.brief_facts) mapped.description = extracted.brief_facts;

                    // Step 6: IO Mapping
                    if (extracted.officer) mapped.sho_details = extracted.officer;
                    
                    if (extracted.officer && investigators && investigators.length > 0) {
                        const searchName = extracted.officer.toLowerCase();
                        const match = investigators.find(i => i.name.toLowerCase().includes(searchName));
                        if (match) {
                            mapped.assigned_to = match.user_id;
                        }
                    }
                    return mapped;
                });
                toast.success("Document analyzed and fields populated successfully.", "Extraction Complete");
            }
        } catch (err) {
            console.error('Extraction Error:', err);
            toast.error("Failed to extract data from the provided PDF.", "Extraction Error");
        } finally {
            setLoading(false);
        }
    };

    const saveDraft = () => {
        localStorage.setItem('caseFormDraft', JSON.stringify({ formData, accusedList, step }));
        toast.success("Draft securely saved to local storage.", "Draft Saved");
    };

    const validateStep = (currentStep) => {
        const newErrors = {};

        // Regex Patterns
        const mobileRegex = /^[6-9]\d{9}$/;
        const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
        const aadhaarRegex = /^\d{12}$/;
        const today = new Date().toISOString().split('T')[0];

        if (currentStep === 1) {
            if (formData.fir_date && formData.fir_date > today) newErrors.fir_date = "FIR Date cannot be in the future";
            if (formData.info_received_date && formData.info_received_date > today) newErrors.info_received_date = "Date cannot be in the future";
        } else if (currentStep === 2) {
            if (formData.occurrence_date_from && formData.occurrence_date_from > today) newErrors.occurrence_date_from = "Date cannot be in the future";
            if (formData.occurrence_date_to && formData.occurrence_date_to > today) newErrors.occurrence_date_to = "Date cannot be in the future";
        } else if (currentStep === 3) {
            const cleanCompMobile = formData.complainant_mobile ? formData.complainant_mobile.replace(/\D/g, '').slice(-10) : '';
            const cleanPan = formData.complainant_pan ? formData.complainant_pan.replace(/[^A-Za-z0-9]/g, '').trim().toUpperCase() : '';
            const cleanAadhaar = formData.complainant_aadhaar ? formData.complainant_aadhaar.replace(/\D/g, '').trim() : '';

            if (formData.complainant_mobile && !mobileRegex.test(cleanCompMobile)) {
                newErrors.complainant_mobile = "Invalid 10-digit mobile number";
            }

            if (formData.complainant_pan && !panRegex.test(cleanPan)) {
                newErrors.complainant_pan = "Invalid PAN format (e.g. ABCDE1234F)";
            }

            if (formData.complainant_aadhaar && !aadhaarRegex.test(cleanAadhaar)) {
                newErrors.complainant_aadhaar = "Invalid 12-digit Aadhaar number";
            }

            if (!formData.is_victim_same && formData.victim_mobile) {
                const cleanVictimMobile = formData.victim_mobile.replace(/\D/g, '').slice(-10);
                if (!mobileRegex.test(cleanVictimMobile)) {
                    newErrors.victim_mobile = "Invalid 10-digit mobile number";
                }
            }
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleNext = () => {
        if (validateStep(step)) {
            setStep(s => s + 1);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA' && e.target.type !== 'submit' && e.target.tagName !== 'BUTTON') {
            e.preventDefault();
        }
    };

    const handleSubmit = async (e) => {
        if (e && e.preventDefault) {
            e.preventDefault();
        }

        if (!validateStep(6)) return;

        setLoading(true);

        const data = new FormData();

        // Append all form fields
        Object.keys(formData).forEach(key => {
            if (formData[key] !== null && formData[key] !== undefined) {
                data.append(key, formData[key]);
            }
        });

        // Append file
        if (firFile) {
            data.append('fir_file', firFile);
        }

        // Append Accused List as JSON string
        data.append('accusedList', JSON.stringify(accusedList));

        try {
            const url = isEditMode ? `/cases/${id}/full` : '/cases/register';
            const method = isEditMode ? 'put' : 'post';
            const res = await api[method](url, data, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            });

            if (res.data.success) {
                localStorage.removeItem('caseFormDraft');
                toast.success(res.data.message || (isEditMode ? "Case updated successfully" : "Case Registered Successfully"), "Sync Successful");
                navigate('/cases');
            } else {
                toast.error(res.data.message || (isEditMode ? "Case Update Failed" : "Case Registration Failed"), "Protocol Error");
            }

        } catch (err) {
            const errorMsg = err.response?.data?.message || err.response?.data?.error_message || 'Enterprise Data Sync Failed';
            toast.error(errorMsg, "Protocol Error");

            // If duplicate FIR error (check message content)
            if (errorMsg.toLowerCase().includes('duplicate') || errorMsg.toLowerCase().includes('exists')) {
                setStep(1); // Take user back to Phase 1 to check FIR No
                setErrors(prev => ({ ...prev, fir_no: "Potential Duplicate FIR Number detected" }));
            }
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
                            <div
                                key={i}
                                onClick={() => setStep(i)}
                                className={`h-1.5 flex-1 rounded-full transition-all duration-500 bg-slate-200 relative cursor-pointer`}
                            >
                                {step >= i && <motion.div layoutId="progress" className="absolute inset-0 bg-blue-600 shadow-md shadow-blue-200 rounded-full"></motion.div>}
                            </div>
                        ))}
                    </div>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Phase {step} / 6</span>
                </div>
            </div>

            <Card className="p-0 overflow-hidden relative shadow-xl shadow-slate-200/50">
                <form onSubmit={(e) => e.preventDefault()} onKeyDown={handleKeyDown} className="relative z-10 p-10 bg-white">
                    <AnimatePresence mode="wait">
                        {step === 1 && (
                            <motion.div
                                key="step1"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="space-y-8"
                            >
                                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                                    <div className="flex items-center gap-3">
                                        <Shield className="text-blue-600" size={24} />
                                        <h2 className="text-lg font-black text-black opacity-100 tracking-tight uppercase">1. FIR Core Details</h2>
                                    </div>
                                    <div>
                                        <label className="flex items-center gap-2 cursor-pointer bg-blue-50 text-blue-700 px-4 py-2 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-blue-100 transition-colors border border-blue-200">
                                            <Upload size={14} /> Auto-Fill via PDF
                                            <input type="file" className="hidden" accept=".pdf" onChange={handleAutoFillPdf} />
                                        </label>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <SelectField
                                        label="District / Commissionerate"
                                        name="district"
                                        value={formData.district}
                                        onChange={handleInputChange}
                                        error={errors.district}
                                        icon={MapPin}
                                        options={districts.map(d => ({ value: d.district_id, label: d.district_name }))}
                                        placeholder="Select District"
                                        className="!border-black !placeholder:text-black !placeholder:opacity-100 !text-black !font-black"
                                        labelClassName="!text-black !font-black !opacity-100"
                                    />
                                    <SelectField
                                        label="Police Station"
                                        name="police_station"
                                        value={formData.police_station}
                                        onChange={handleInputChange}
                                        error={errors.police_station}
                                        icon={Shield}
                                        options={allStations
                                            .filter(s => !formData.district || s.district_id === parseInt(formData.district))
                                            .map(s => ({ value: s.police_station_id, label: s.station_name }))
                                        }
                                        placeholder="Select Police Station"
                                        className="!border-black !placeholder:text-black !placeholder:opacity-100 !text-black !font-black"
                                        labelClassName="!text-black !font-black !opacity-100"
                                    />

                                    <InputField label="FIR Number" name="fir_no" value={formData.fir_no} onChange={handleInputChange} error={errors.fir_no} icon={Fingerprint} placeholder="EX: 0451" className="!border-black !placeholder:text-black !placeholder:opacity-100 !text-black !font-black" labelClassName="!text-black !font-black !opacity-100" />
                                    <InputField label="FIR Year" name="fir_year" value={formData.fir_year} onChange={handleInputChange} error={errors.fir_year} icon={Calendar} placeholder="YYYY" className="!border-black !placeholder:text-black !placeholder:opacity-100 !text-black !font-black" labelClassName="!text-black !font-black !opacity-100" />

                                    <InputField type="date" label="FIR Date" name="fir_date" value={formData.fir_date} onChange={handleInputChange} error={errors.fir_date} icon={Calendar} className="!border-black !placeholder:text-black !placeholder:opacity-100 !text-black !font-black" labelClassName="!text-black !font-black !opacity-100" />
                                    <InputField type="time" label="FIR Time" name="fir_time" value={formData.fir_time} onChange={handleInputChange} error={errors.fir_time} icon={Clock} className="!border-black !placeholder:text-black !placeholder:opacity-100 !text-black !font-black" labelClassName="!text-black !font-black !opacity-100" />

                                    <InputField type="date" label="Info Received Date" name="info_received_date" value={formData.info_received_date} onChange={handleInputChange} error={errors.info_received_date} icon={Calendar} className="!border-black !placeholder:text-black !placeholder:opacity-100 !text-black !font-black" labelClassName="!text-black !font-black !opacity-100" />
                                    <InputField type="time" label="Info Received Time" name="info_received_time" value={formData.info_received_time} onChange={handleInputChange} error={errors.info_received_time} icon={Clock} className="!border-black !placeholder:text-black !placeholder:opacity-100 !text-black !font-black" labelClassName="!text-black !font-black !opacity-100" />

                                    <InputField label="General Diary (GD) / Entry No" name="gd_no" value={formData.gd_no} onChange={handleInputChange} error={errors.gd_no} icon={Bookmark} placeholder="GD Number" className="!border-black !placeholder:text-black !placeholder:opacity-100 !text-black !font-black" labelClassName="!text-black !font-black !opacity-100" />
                                    <InputField label="Sections / Acts" name="sections" value={formData.sections} onChange={handleInputChange} error={errors.sections} icon={AlertTriangle} placeholder="e.g. 420 IPC, 66D IT Act" className="!border-black !placeholder:text-black !placeholder:opacity-100 !text-black !font-black" labelClassName="!text-black !font-black !opacity-100" />
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
                                    <h2 className="text-lg font-black text-black opacity-100 tracking-tight uppercase">2. Occurrence / Incident Details</h2>
                                </div>
                                 <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <InputField type="date" label="Occurrence Date (From)" name="occurrence_date_from" value={formData.occurrence_date_from} onChange={handleInputChange} error={errors.occurrence_date_from} icon={Calendar} className="!border-black !placeholder:text-black !placeholder:opacity-100 !text-black !font-black" labelClassName="!text-black !font-black !opacity-100" />
                                    <InputField type="date" label="Occurrence Date (To)" name="occurrence_date_to" value={formData.occurrence_date_to} onChange={handleInputChange} error={errors.occurrence_date_to} icon={Calendar} className="!border-black !placeholder:text-black !placeholder:opacity-100 !text-black !font-black" labelClassName="!text-black !font-black !opacity-100" />

                                    <InputField type="time" label="Occurrence Time (From)" name="occurrence_time_from" value={formData.occurrence_time_from} onChange={handleInputChange} icon={Clock} className="!border-black !placeholder:text-black !placeholder:opacity-100 !text-black !font-black" labelClassName="!text-black !font-black !opacity-100" />
                                    <InputField type="time" label="Occurrence Time (To)" name="occurrence_time_to" value={formData.occurrence_time_to} onChange={handleInputChange} icon={Clock} className="!border-black !placeholder:text-black !placeholder:opacity-100 !text-black !font-black" labelClassName="!text-black !font-black !opacity-100" />

                                    <InputField label="Place of Incident" name="place_of_incident" value={formData.place_of_incident} onChange={handleInputChange} icon={MapPin} placeholder="e.g. Internet, WhatsApp" className="!border-black !placeholder:text-black !placeholder:opacity-100 !text-black !font-black" labelClassName="!text-black !font-black !opacity-100" />
                                    <InputField label="Distance from PS" name="distance_from_ps" value={formData.distance_from_ps} onChange={handleInputChange} icon={MapPin} placeholder="e.g. 5 KM East" className="!border-black !placeholder:text-black !placeholder:opacity-100 !text-black !font-black" labelClassName="!text-black !font-black !opacity-100" />

                                    <div className="md:col-span-2">
                                        <InputField label="Incident Address" name="incident_address" value={formData.incident_address} onChange={handleInputChange} icon={MapPin} placeholder="Full address if applicable" className="!border-black !placeholder:text-black !placeholder:opacity-100 !text-black !font-black" labelClassName="!text-black !font-black !opacity-100" />
                                    </div>
                                    <InputField label="Beat Number" name="beat_number" value={formData.beat_number} onChange={handleInputChange} icon={Bookmark} placeholder="Enter Beat Number" className="!border-black !placeholder:text-black !placeholder:opacity-100 !text-black !font-black" labelClassName="!text-black !font-black !opacity-100" />
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
                                    <h2 className="text-lg font-black text-black opacity-100 tracking-tight uppercase">3. Complainant / Victim Details</h2>
                                </div>

                                <h3 className="text-sm font-black text-black opacity-100 tracking-widest uppercase">Complainant Profile</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <InputField label="Complainant Name" name="complainant_name" value={formData.complainant_name} onChange={handleInputChange} error={errors.complainant_name} icon={User} placeholder="Full Name" className="!border-black !placeholder:text-black !placeholder:opacity-100 !text-black !font-black" labelClassName="!text-black !font-black !opacity-100" />
                                    <InputField label="Mobile Number" name="complainant_mobile" value={formData.complainant_mobile} onChange={handleInputChange} error={errors.complainant_mobile} icon={Activity} placeholder="+91..." className="!border-black !placeholder:text-black !placeholder:opacity-100 !text-black !font-black" labelClassName="!text-black !font-black !opacity-100" />
                                    <InputField label="Email Address" name="complainant_email" value={formData.complainant_email} onChange={handleInputChange} error={errors.complainant_email} icon={Mail} placeholder="email@example.com" className="!border-black !placeholder:text-black !placeholder:opacity-100 !text-black !font-black" labelClassName="!text-black !font-black !opacity-100" />
                                    <InputField label="Aadhaar Number" name="complainant_aadhaar" value={formData.complainant_aadhaar} onChange={handleInputChange} error={errors.complainant_aadhaar} icon={Fingerprint} placeholder="XXXX XXXX XXXX" className="!border-black !placeholder:text-black !placeholder:opacity-100 !text-black !font-black" labelClassName="!text-black !font-black !opacity-100" />
                                    <InputField label="PAN Number" name="complainant_pan" value={formData.complainant_pan} onChange={handleInputChange} error={errors.complainant_pan} icon={FilePlus} placeholder="ABCDE1234F" className="!border-black !placeholder:text-black !placeholder:opacity-100 !text-black !font-black" labelClassName="!text-black !font-black !opacity-100" />
                                    <div className="md:col-span-2">
                                        <InputField label="Residential Address" name="complainant_address" value={formData.complainant_address} onChange={handleInputChange} icon={MapPin} placeholder="Full Address" className="!border-black !placeholder:text-black !placeholder:opacity-100 !text-black !font-black" labelClassName="!text-black !font-black !opacity-100" />
                                    </div>
                                </div>

                                <div className="pt-6 border-t border-slate-100">
                                    <label className="flex items-center gap-3 cursor-pointer group">
                                        <input type="checkbox" name="is_victim_same" checked={formData.is_victim_same} onChange={handleInputChange} className="w-5 h-5 text-blue-600 rounded border-black focus:ring-blue-500" />
                                        <span className="text-sm font-black text-black group-hover:text-blue-600 transition-colors">Victim is same as Complainant</span>
                                    </label>
                                </div>

                                {!formData.is_victim_same && (
                                    <div className="space-y-8 pt-4">
                                        <h3 className="text-sm font-black text-black opacity-100 tracking-widest uppercase">Victim Profile</h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                            <InputField label="Victim Name" name="victim_name" value={formData.victim_name} onChange={handleInputChange} error={errors.victim_name} icon={User} placeholder="Full Name" className="!border-black !placeholder:text-black !placeholder:opacity-100 !text-black !font-black" labelClassName="!text-black !font-black !opacity-100" />
                                            <InputField label="Mobile Number" name="victim_mobile" value={formData.victim_mobile} onChange={handleInputChange} error={errors.victim_mobile} icon={Activity} placeholder="+91..." className="!border-black !placeholder:text-black !placeholder:opacity-100 !text-black !font-black" labelClassName="!text-black !font-black !opacity-100" />
                                            <InputField label="Email Address" name="victim_email" value={formData.victim_email} onChange={handleInputChange} error={errors.victim_email} icon={Mail} placeholder="email@example.com" className="!border-black !placeholder:text-black !placeholder:opacity-100 !text-black !font-black" labelClassName="!text-black !font-black !opacity-100" />
                                            <div className="md:col-span-2">
                                                <InputField label="Residential Address" name="victim_address" value={formData.victim_address} onChange={handleInputChange} icon={MapPin} placeholder="Full Address" className="!border-black !placeholder:text-black !placeholder:opacity-100 !text-black !font-black" labelClassName="!text-black !font-black !opacity-100" />
                                            </div>
                                        </div>
                                    </div>
                                )}
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
                                    <h2 className="text-lg font-black text-black opacity-100 tracking-tight uppercase">4. Fraud / Cyber Crime Details</h2>
                                </div>
                                 <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <InputField label="Fraud Asset Value (₹)" name="fraud_amount" type="number" value={formData.fraud_amount} onChange={handleInputChange} error={errors.fraud_amount} icon={Banknote} placeholder="Numerical value only" className="!border-black !placeholder:text-black !placeholder:opacity-100 !text-black !font-black" labelClassName="!text-black !font-black !opacity-100" />
                                    <InputField label="Target Financial Institute" name="bank_name" value={formData.bank_name} onChange={handleInputChange} error={errors.bank_name} icon={Banknote} placeholder="Bank/Wallet Name" className="!border-black !placeholder:text-black !placeholder:opacity-100 !text-black !font-black" labelClassName="!text-black !font-black !opacity-100" />
                                    <InputField label="Account ID / Number" name="account_no" value={formData.account_no} onChange={handleInputChange} error={errors.account_no} icon={Shield} placeholder="Target Account" className="!border-black !placeholder:text-black !placeholder:opacity-100 !text-black !font-black" labelClassName="!text-black !font-black !opacity-100" />
                                    <InputField label="Portal Reference (ACKN)" name="ackn_no" value={formData.ackn_no} onChange={handleInputChange} error={errors.ackn_no} icon={Shield} placeholder="REF://CYBER/..." className="!border-black !placeholder:text-black !placeholder:opacity-100 !text-black !font-black" labelClassName="!text-black !font-black !opacity-100" />
                                </div>
                                <div className="space-y-1.5 mt-6">
                                    <label className="text-[10px] font-black text-black opacity-100 tracking-widest uppercase ml-1">FIR Narrative / Event Log</label>
                                    <textarea
                                        name="description"
                                        rows="6"
                                        className={`w-full bg-slate-50 border ${errors.description ? 'border-rose-500' : '!border-black'} rounded-2xl p-4 text-sm outline-none focus:border-blue-600 focus:bg-white transition-all resize-none !text-black !font-black placeholder:text-black placeholder:opacity-100`}
                                        placeholder="Detailed event log..."
                                        value={formData.description}
                                        onChange={handleInputChange}
                                    ></textarea>
                                    {errors.description && <p className="text-[10px] text-rose-500 font-bold ml-1 uppercase">{errors.description}</p>}
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
                                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                                    <div className="flex items-center gap-3">
                                        <Globe className="text-blue-600" size={24} />
                                        <h2 className="text-lg font-black text-black opacity-100 tracking-tight uppercase">5. Accused / Social Footprint Details</h2>
                                    </div>
                                    <Button variant="outline" type="button" onClick={addAccusedProfile} className="text-[10px] uppercase font-bold tracking-widest text-blue-600 bg-blue-50 border-blue-100 shadow-sm py-2 h-auto" icon={FilePlus}>
                                        Add Accused
                                    </Button>
                                </div>
                                <div className="space-y-6">
                                    {accusedList.map((accused, idx) => (
                                        <div key={idx} className="bg-slate-50 border border-slate-100 p-6 rounded-[24px]">
                                            <div className="flex items-center gap-2 mb-4">
                                                <div className="bg-rose-500 text-white font-black text-[10px] w-6 h-6 flex items-center justify-center rounded-full leading-none">{idx + 1}</div>
                                                <h4 className="text-[11px] font-black uppercase text-black opacity-100 tracking-widest">Accused Profile</h4>
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                                                <InputField label="Accused Name" name="name" value={accused.name} onChange={(e) => handleAccusedChange(idx, e)} icon={User} placeholder="John Doe" className="!border-black !placeholder:text-black !placeholder:opacity-100 !text-black !font-black" labelClassName="!text-black !font-black !opacity-100" />
                                                <InputField label="Alias / Nickname" name="alias" value={accused.alias} onChange={(e) => handleAccusedChange(idx, e)} icon={User} placeholder="Phantom..." className="!border-black !placeholder:text-black !placeholder:opacity-100 !text-black !font-black" labelClassName="!text-black !font-black !opacity-100" />
                                                <InputField label="Suspect Mobile" name="mobile" value={accused.mobile} onChange={(e) => handleAccusedChange(idx, e)} icon={Activity} placeholder="+91..." className="!border-black !placeholder:text-black !placeholder:opacity-100 !text-black !font-black" labelClassName="!text-black !font-black !opacity-100" />
                                            </div>
                                            <h4 className="text-[10px] font-black uppercase text-black opacity-100 tracking-widest mb-4 border-b border-black pb-2">Acquired Footprints</h4>
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                                <InputField label="WhatsApp Number" name="whatsapp_no" value={accused.whatsapp_no} onChange={(e) => handleAccusedChange(idx, e)} icon={MessageCircle} placeholder="+91..." className="!border-black !placeholder:text-black !placeholder:opacity-100 !text-black !font-black" labelClassName="!text-black !font-black !opacity-100" />
                                                <InputField label="Gmail / Email Link" name="gmail_id" value={accused.gmail_id} onChange={(e) => handleAccusedChange(idx, e)} icon={Mail} placeholder="fraud@gmail.com" className="!border-black !placeholder:text-black !placeholder:opacity-100 !text-black !font-black" labelClassName="!text-black !font-black !opacity-100" />
                                                <InputField label="Telegram ID" name="telegram_id" value={accused.telegram_id} onChange={(e) => handleAccusedChange(idx, e)} icon={MessageCircle} placeholder="@username" className="!border-black !placeholder:text-black !placeholder:opacity-100 !text-black !font-black" labelClassName="!text-black !font-black !opacity-100" />
                                                <InputField label="Facebook Profile" name="facebook_id" value={accused.facebook_id} onChange={(e) => handleAccusedChange(idx, e)} icon={Globe} placeholder="fb.com/..." className="!border-black !placeholder:text-black !placeholder:opacity-100 !text-black !font-black" labelClassName="!text-black !font-black !opacity-100" />
                                                <InputField label="Instagram Handle" name="insta_id" value={accused.insta_id} onChange={(e) => handleAccusedChange(idx, e)} icon={Hash} placeholder="@username" className="!border-black !placeholder:text-black !placeholder:opacity-100 !text-black !font-black" labelClassName="!text-black !font-black !opacity-100" />
                                                <InputField label="Twitter / X ID" name="twitter_id" value={accused.twitter_id} onChange={(e) => handleAccusedChange(idx, e)} icon={AtSign} placeholder="@username" className="!border-black !placeholder:text-black !placeholder:opacity-100 !text-black !font-black" labelClassName="!text-black !font-black !opacity-100" />
                                                <InputField label="LinkedIn Profile" name="linkedin_id" value={accused.linkedin_id} onChange={(e) => handleAccusedChange(idx, e)} icon={Globe} placeholder="linkedin.com/in/..." className="!border-black !placeholder:text-black !placeholder:opacity-100 !text-black !font-black" labelClassName="!text-black !font-black !opacity-100" />
                                                <InputField label="Associated Website" name="website_url" value={accused.website_url} onChange={(e) => handleAccusedChange(idx, e)} icon={Link} placeholder="https://..." className="!border-black !placeholder:text-black !placeholder:opacity-100 !text-black !font-black" labelClassName="!text-black !font-black !opacity-100" />
                                                <InputField label="Other Social Footprint" name="other_social" value={accused.other_social} onChange={(e) => handleAccusedChange(idx, e)} icon={Globe} placeholder="Snapchat, Discord, etc." className="!border-black !placeholder:text-black !placeholder:opacity-100 !text-black !font-black" labelClassName="!text-black !font-black !opacity-100" />
                                            </div>
                                        </div>
                                    ))}
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
                                    <h2 className="text-lg font-black text-black opacity-100 tracking-tight uppercase">6. Officer Assignment & Review</h2>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <SelectField
                                        label="Investigating Officer (IO)"
                                        name="assigned_to"
                                        icon={ShieldAlert}
                                        value={formData.assigned_to}
                                        onChange={handleInputChange}
                                        error={errors.assigned_to}
                                        options={investigators.map(i => ({ value: i.user_id, label: `${i.name} (${i.role})` }))}
                                        placeholder="Select Assignee"
                                        className="!border-black !placeholder:text-black !placeholder:opacity-100 !text-black !font-black"
                                        labelClassName="!text-black !font-black !opacity-100"
                                    />
                                    <InputField label="SHO Details" name="sho_details" value={formData.sho_details} onChange={handleInputChange} icon={Shield} placeholder="Enter SHO Info" className="!border-black !placeholder:text-black !placeholder:opacity-100 !text-black !font-black" labelClassName="!text-black !font-black !opacity-100" />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <SelectField
                                        label="Case Priority"
                                        name="priority_id"
                                        icon={AlertTriangle}
                                        value={formData.priority_id}
                                        onChange={handleInputChange}
                                        options={[
                                            { value: '1', label: 'Low' },
                                            { value: '2', label: 'Medium' },
                                            { value: '3', label: 'High' },
                                            { value: '4', label: 'Critical' }
                                        ]}
                                        className="!border-black !placeholder:text-black !placeholder:opacity-100 !text-black !font-black"
                                        labelClassName="!text-black !font-black !opacity-100"
                                    />
                                    <SelectField
                                        label="Initial Case Status"
                                        name="status_id"
                                        icon={Activity}
                                        value={formData.status_id}
                                        onChange={handleInputChange}
                                        options={[
                                            { value: '1', label: 'Active' },
                                            { value: '2', label: 'Pending' },
                                            { value: '3', label: 'Under Investigation' }
                                        ]}
                                        className="!border-black !placeholder:text-black !placeholder:opacity-100 !text-black !font-black"
                                        labelClassName="!text-black !font-black !opacity-100"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-black text-black opacity-100 tracking-widest uppercase ml-1">Investigation Remarks / Notes</label>
                                    <textarea
                                        name="remarks"
                                        value={formData.remarks}
                                        onChange={handleInputChange}
                                        className="w-full bg-slate-50 border !border-black rounded-3xl py-6 px-8 !text-black !font-black placeholder:text-black placeholder:opacity-100 focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-600 transition-all min-h-[120px]"
                                        placeholder="Enter any initial investigative remarks or administrative notes..."
                                    />
                                </div>

                                <div className="mt-8">
                                    <h3 className="text-sm font-black text-black opacity-100 tracking-widest uppercase mb-4">Secure Artifact Upload</h3>
                                    <label className="block border-2 border-dashed !border-black rounded-3xl p-16 text-center hover:border-blue-600 hover:bg-blue-50 transition-all cursor-pointer group">
                                        <input type="file" onChange={handleFileChange} className="hidden" />
                                        <div className="w-20 h-20 bg-slate-50 border border-black rounded-full flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform shadow-sm">
                                            {preview ? (
                                                <img src={preview} alt="Upload Preview" className="w-full h-full object-cover rounded-full" />
                                            ) : (
                                                <Upload className="text-blue-600" size={32} />
                                            )}
                                        </div>
                                        <p className="text-lg font-black text-black mb-2">{firFile ? firFile.name : 'Drop signed FIR artifact here'}</p>
                                        <p className="text-black text-[10px] font-black uppercase tracking-widest leading-relaxed">Verifiable PDF, JPG or PNG formats only // Limit: 10MB</p>
                                    </label>
                                </div>

                                <div className="bg-rose-50 p-6 rounded-2xl border border-rose-100 flex gap-4 mt-8">
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
                            <Button variant="secondary" type="button" onClick={handleSubmit} loading={loading} className="px-12">
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
