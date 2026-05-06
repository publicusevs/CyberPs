import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
    ChevronLeft, ChevronRight, Shield, Building2, 
    Gavel, User, Globe, Hash, CheckCircle2, 
    Info, Info as InfoIcon, Landmark, AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../services/api';
import { Card } from '../components/ui/Card';

const PLATFORM_DIRECTORY = {
    'Gmail': {
        name: 'Google India Pvt Ltd',
        address: 'Unitech Signature Tower-II, Tower-B, Sector-15, Part-II, Village Silokhera, Gurgaon, Haryana-122001',
        email: 'legal-support@google.com',
        color: 'rose'
    },
    'Google': {
        name: 'Google India Pvt Ltd',
        address: 'Unitech Signature Tower-II, Tower-B, Sector-15, Part-II, Village Silokhera, Gurgaon, Haryana-122001',
        email: 'india-nodal@google.com',
        color: 'blue'
    },
    'Facebook': {
        name: 'Meta Platforms (India) Pvt Ltd',
        address: '216A, Som Datt Chamber II, 9 Bhikaji Cama Place, New Delhi - 110066',
        email: 'records@facebook.com',
        color: 'sky'
    },
    'Twitter': {
        name: 'Twitter Communications India Pvt. Ltd.',
        address: 'Level 9, Tower C, Epitome, Building No. 5, DLF Cyber City, Phase III, Gurgaon, Haryana-122002',
        email: 'lawenforcement@twitter.com',
        color: 'slate'
    },
    'WhatsApp': {
        name: 'WhatsApp LLC',
        address: '1601 Willow Road, Menlo Park, California 94025, USA (India Nodal: Mumbai)',
        email: 'records@whatsapp.com',
        color: 'emerald'
    },
    'Telegram': {
        name: 'Telegram FZ-LLC',
        address: 'Business Central Towers, Tower A, Office 1003, P.O. Box 501919, Dubai, UAE',
        email: 'legal@telegram.org',
        color: 'cyan'
    },
    'LinkedIn': {
        name: 'LinkedIn Ireland Unlimited Company',
        address: 'Wilton Plaza, Wilton Place, Dublin 2, Ireland',
        email: 'lert@linkedin.com',
        color: 'indigo'
    }
};

const DATA_POINTS = [
    { id: 'reg', label: 'Account registration details' },
    { id: 'ip', label: 'IP logs (Registration & Last Login)' },
    { id: 'hist', label: 'Login history (Last 6 months)' },
    { id: 'dev', label: 'Device information (IMEI/MAC/OS)' },
    { id: 'kyc', label: 'KYC documents / ID Proofs' },
    { id: 'linked', label: 'Linked recovery accounts' },
    { id: 'trans', label: 'Transaction / Payment details' },
    { id: 'comm', label: 'Communication metadata' }
];

const BNS_SECTIONS = [
    { id: '94', label: 'BNS 94', desc: 'Summons to produce document' },
    { id: '95', label: 'BNS 95', desc: 'Letters and telegrams' },
    { id: '65', label: 'BNS 65', desc: 'Electronic evidence' },
    { id: '66', label: 'BNS 66', desc: 'Intermediary production' }
];

const NoticeConfigForm = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [caseData, setCaseData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [generating, setGenerating] = useState(false);

    const [form, setForm] = useState({
        platform: '',
        bns_sections: [],
        issued_by: 'Investigation Officer (IO)',
        receiver_name: '',
        receiver_address: '',
        receiver_email: '',
        required_data: [],
        additional_notes: '',
        notice_body: '',
        selectedSuspectIds: []
    });

    const [accusedList, setAccusedList] = useState([]);

    useEffect(() => {
        const fetchCaseData = async () => {
            try {
                const res = await api.get(`/cases/${id}`);
                if (res.data.success) {
                    setCaseData(res.data);
                    const suspects = res.data.accusedList || [];
                    setAccusedList(suspects);
                    setForm(prev => ({ 
                        ...prev, 
                        notice_body: `An investigation is being carried out by this unit regarding a cyber crime complaint (Ref: ${res.data.case?.ackn_no || 'N/A'}). During the course of investigation, it has been observed that the following account/identifier is associated with the alleged offense:`,
                        ...(suspects.length > 0 ? { selectedSuspectIds: suspects.map(s => s.accused_id.toString()) } : {})
                    }));
                    setError(null);
                } else {
                    setError('ACCESS_DENIED: Case protocol not found or permission insufficient.');
                }
            } catch (err) {
                console.error('Case uplink failed');
                setError('LINK_FAILURE: Server communication interrupted.');
            } finally {
                setLoading(false);
            }
        };
        fetchCaseData();
    }, [id]);

    const handlePlatformSelect = (plt) => {
        const info = PLATFORM_DIRECTORY[plt] || { name: '', address: '', email: '' };
        setForm(prev => ({
            ...prev,
            platform: plt,
            receiver_name: info.name,
            receiver_address: info.address,
            receiver_email: info.email
        }));
    };

    const toggleSuspect = (suspectId) => {
        setForm(prev => ({
            ...prev,
            selectedSuspectIds: prev.selectedSuspectIds.includes(suspectId)
                ? prev.selectedSuspectIds.filter(id => id !== suspectId)
                : [...prev.selectedSuspectIds, suspectId]
        }));
    };

    const toggleAllSuspects = () => {
        setForm(prev => ({
            ...prev,
            selectedSuspectIds: prev.selectedSuspectIds.length === accusedList.length
                ? []
                : accusedList.map(a => a.accused_id.toString())
        }));
    };

    const getAggregatedData = () => {
        if (form.selectedSuspectIds.length === 0) return { identifier: '', mobile: '' };
        
        const selectedAccused = accusedList.filter(a => form.selectedSuspectIds.includes(a.accused_id.toString()));
        
        const identifiers = selectedAccused.map(suspect => {
            let id = '';
            switch (form.platform) {
                case 'Gmail': case 'Google': id = suspect.gmail_id; break;
                case 'Facebook': id = suspect.facebook_id; break;
                case 'Twitter': id = suspect.twitter_id; break;
                case 'WhatsApp': id = suspect.whatsapp_no || suspect.mobile; break;
                case 'Telegram': id = suspect.telegram_id; break;
                case 'LinkedIn': id = suspect.linkedin_id; break;
                default: id = '';
            }
            return id;
        }).filter(Boolean);

        const mobiles = selectedAccused.map(s => s.mobile || s.whatsapp_no).filter(Boolean);

        return {
            identifier: identifiers.join(', '),
            mobile: mobiles.join(', ')
        };
    };

    const toggleBNS = (sec) => {
        setForm(prev => ({
            ...prev,
            bns_sections: prev.bns_sections.includes(sec)
                ? prev.bns_sections.filter(s => s !== sec)
                : [...prev.bns_sections, sec]
        }));
    };

    const toggleDataPoint = (dp) => {
        setForm(prev => ({
            ...prev,
            required_data: prev.required_data.includes(dp)
                ? prev.required_data.filter(d => d !== dp)
                : [...prev.required_data, dp]
        }));
    };

    const handleGenerate = async () => {
        if (!form.platform || form.bns_sections.length === 0 || form.required_data.length === 0) {
            alert('PROTOCOL_ERROR: Minimum configuration required (Platform, BNS, Data Points)');
            return;
        }

        if (form.selectedSuspectIds.length === 0) {
            alert('PROTOCOL_ERROR: No suspects selected.');
            return;
        }

        setGenerating(true);
        try {
            const sectionsText = form.bns_sections.join(' & ');
            const dataText = form.required_data.map(d => `• ${DATA_POINTS.find(dp => dp.id === d).label}`).join('<br/>');
            const { identifier, mobile } = getAggregatedData();
            
            let content = '';

            if (form.bns_sections.includes('94')) {
                const selectedAccused = accusedList.filter(a => form.selectedSuspectIds.includes(a.accused_id.toString()));
                const accusedNames = selectedAccused.map(a => a.name).join(', ');
                const accusedAliases = selectedAccused.map(a => a.alias || 'N/A').join(', ');

                content = `
                    <div style="font-family: 'Inter', sans-serif; padding: 40px; color: #1e293b; line-height: 1.6; max-width: 800px; margin: auto; border: 1px solid #e2e8f0; background: white;">
                        <div style="text-align: center; border-bottom: 3px double #000; padding-bottom: 20px; margin-bottom: 30px;">
                            <h1 style="margin: 0; font-size: 20px; font-weight: 900; text-transform: uppercase;">NOTICE UNDER SECTION 94 BNS</h1>
                            <p style="margin: 10px 0 0 0; font-size: 14px; font-weight: 800;">Office of: ${caseData?.case?.station_name || 'Cyber Crime Police Station'}</p>
                            <p style="margin: 5px 0 0 0; font-size: 13px; font-weight: 700;">District: ${caseData?.case?.district || 'Jaipur'}</p>
                        </div>

                        <div style="display: flex; justify-content: space-between; margin-bottom: 30px; font-weight: 800; font-size: 13px;">
                            <div>Notice No.: ${new Date().getFullYear()}/CCPS/${id || 'NA'}</div>
                            <div>Date: ${new Date().toLocaleDateString()}</div>
                        </div>

                        <div style="margin-bottom: 30px;">
                            <p style="font-weight: 900; text-transform: uppercase; border-bottom: 1px solid #000; width: fit-content; margin-bottom: 15px;">TO,</p>
                            <div style="padding-left: 20px; line-height: 2;">
                                <p style="margin: 0;"><strong>Name(s):</strong> ${accusedNames || '__________________________'}</p>
                                <p style="margin: 0;"><strong>Alias / Father’s Name:</strong> ${accusedAliases || '__________________________'}</p>
                                <p style="margin: 0;"><strong>Handle/ID:</strong> ${identifier || '__________________________'}</p>
                                <p style="margin: 0;"><strong>Address:</strong> __________________________________________________</p>
                            </div>
                        </div>

                        <div style="margin-bottom: 30px; text-align: center;">
                            <h2 style="font-size: 16px; font-weight: 900; text-decoration: underline; text-transform: uppercase;">Subject: Notice for Appearance in Investigation</h2>
                        </div>

                        <div style="margin-bottom: 30px; text-align: justify;">
                            <p>Sir/Madam,</p>
                            <p>Whereas, a case bearing <strong>FIR No. ${caseData?.case?.fir_no || '____________'}</strong> dated <strong>${new Date(caseData?.case?.created_at).toLocaleDateString()}</strong> under Sections <strong>BNS ${sectionsText}</strong> is under investigation at this Police Station.</p>
                            <p>During the course of investigation, it appears that you are acquainted with the facts and circumstances of the case / or you are required to produce certain documents or evidence relevant to the investigation.</p>
                            <p>Therefore, you are hereby directed under <strong>Section 94 of the Bharatiya Nyaya Sanhita, 2023</strong>, to appear before the undersigned at <strong>${caseData?.case?.station_name || 'Cyber Crime Police Station'}</strong> on <strong>____ / ____ / ______</strong> at <strong>______ AM/PM</strong>.</p>
                            <p>You are also directed to bring along any relevant documents/evidence in your possession pertaining to the said case.</p>
                        </div>

                        <div style="background: #f8fafc; padding: 20px; border: 1px dashed #cbd5e1; border-radius: 8px; margin-bottom: 40px; font-size: 13px;">
                            <h3 style="margin: 0 0 10px 0; font-size: 14px; font-weight: 900; display: flex; align-items: center; gap: 8px;">⚠️ IMPORTANT INSTRUCTIONS</h3>
                            <ul style="margin: 0; padding-left: 20px;">
                                <li>Your attendance is mandatory.</li>
                                <li>Failure to comply with this notice without sufficient cause may attract legal action as per law.</li>
                            </ul>
                        </div>

                        <div style="display: flex; justify-content: flex-end; margin-bottom: 50px;">
                            <div style="text-align: center; min-width: 250px;">
                                <p style="margin: 0; font-weight: 900; text-transform: uppercase;">(${caseData?.case?.io_name || 'IO Cyber Cell'})</p>
                                <p style="margin: 0; font-weight: 700;">${form.issued_by}</p>
                                <p style="margin: 0; font-weight: 700;">Contact: ___________________</p>
                                <div style="margin-top: 20px; height: 100px; display: flex; align-items: flex-end; justify-content: center; gap: 40px;">
                                    <div style="font-size: 10px; font-weight: 800; border-top: 1px solid #000; padding-top: 5px;">SIGNATURE</div>
                                    <div style="font-size: 10px; font-weight: 800; border-top: 1px solid #000; padding-top: 5px;">OFFICIAL SEAL</div>
                                </div>
                            </div>
                        </div>

                        <div style="border-top: 2px dashed #000; margin-top: 50px; padding-top: 30px;">
                            <h3 style="text-align: center; font-size: 15px; font-weight: 900; text-decoration: underline; text-transform: uppercase;">ACKNOWLEDGEMENT</h3>
                            <p style="margin-top: 20px;">I, __________________________, hereby acknowledge the receipt of this notice issued under Section 94 BNS.</p>
                            <div style="display: flex; justify-content: space-between; margin-top: 40px; font-weight: 800;">
                                <div>Date: ____ / ____ / ______</div>
                                <div>Signature: ______________________</div>
                            </div>
                        </div>
                    </div>
                `;
            } else {
                content = `
                    <div style="font-family: 'Inter', sans-serif; padding: 40px; color: #1e293b; line-height: 1.6;">
                        <div style="text-align: center; border-bottom: 2px solid #3b82f6; padding-bottom: 20px; margin-bottom: 30px;">
                            <h1 style="margin: 0; font-size: 24px; font-weight: 900; text-transform: uppercase;">POLICE STATION ${caseData?.case?.station_name || 'CYBER CELL'}</h1>
                            <p style="margin: 5px 0; font-size: 12px; font-weight: 700; color: #64748b;">${caseData?.case?.station_address || ''}</p>
                        </div>
                        <div style="display: flex; justify-content: space-between; margin-bottom: 40px;">
                            <div>
                                <p style="margin: 0; font-weight: 800;">To,</p>
                                <p style="margin: 0; font-weight: 800;">The Nodal Officer,</p>
                                <p style="margin: 0; font-weight: 900; color: #2563eb;">${form.receiver_name}</p>
                                <p style="margin: 0; max-width: 300px;">${form.receiver_address}</p>
                                <p style="margin: 10px 0 0 0; font-weight: 700; color: #3b82f6;">Email: ${form.receiver_email}</p>
                            </div>
                            <div style="text-align: right;">
                                <p style="margin: 0; font-weight: 800;">Date: ${new Date().toLocaleDateString()}</p>
                                <p style="margin: 0; font-weight: 800;">Place: ${caseData?.case?.city || 'Jaipur'}</p>
                            </div>
                        </div>
                        <div style="margin-bottom: 30px; border-left: 4px solid #3b82f6; padding-left: 20px;">
                            <p style="margin: 0; font-weight: 900; text-transform: uppercase; font-size: 16px;">
                                SUBJECT: NOTICE UNDER SECTION ${sectionsText} OF BHARATIYA NYAYA SANHITA (BNS)
                            </p>
                            <p style="margin: 5px 0 0 0; font-weight: 700; color: #64748b;">
                                REF: Case FIR No. ${caseData?.case?.fir_no || 'N/A'} (Ack: ${caseData?.case?.ackn_no || 'N/A'})
                            </p>
                        </div>
                        <div style="margin-bottom: 30px;">
                            <p>Respected Sir/Madam,</p>
                            <p>${form.notice_body}</p>
                            <div style="background: #f8fafc; padding: 20px; border-radius: 12px; border: 1px solid #e2e8f0; margin: 20px 0;">
                                <p style="margin: 0 0 10px 0; font-weight: 800; text-transform: uppercase; font-size: 12px; color: #3b82f6;">Target Identification Details</p>
                                <p style="margin: 5px 0;"><strong>Identifier/URL:</strong> ${identifier || 'N/A'}</p>
                                ${mobile ? `<p style="margin: 5px 0;"><strong>Associated Mobile:</strong> ${mobile}</p>` : ''}
                            </div>
                            <p>Under the powers vested in the undersigned under Section ${sectionsText} of BNS, you are hereby requested to provide the following information in digital format:</p>
                            <div style="margin: 20px 0; padding-left: 20px;">
                                ${dataText}
                            </div>
                            ${form.additional_notes ? `<p><strong>Additional Context:</strong> ${form.additional_notes}</p>` : ''}
                        </div>
                        <div style="margin-top: 50px; text-align: right;">
                            <div style="display: inline-block; text-align: center;">
                                <div style="width: 150px; height: 60px; border-bottom: 1px dashed #cbd5e1; margin-bottom: 10px;"></div>
                                <p style="margin: 0; font-weight: 900; text-transform: uppercase;">(${caseData?.case?.io_name || 'IO Cyber Cell'})</p>
                                <p style="margin: 0; font-weight: 700; color: #64748b;">${form.issued_by}</p>
                                <p style="margin: 0; font-weight: 700; color: #64748b;">Cyber Police Station, ${caseData?.case?.district}</p>
                            </div>
                        </div>
                    </div>
                `;
            }

            const res = await api.post('/notices', {
                case_id: id,
                platform_name: form.platform,
                legal_sections: form.bns_sections,
                issued_by: form.issued_by,
                receiver_name: form.receiver_name,
                receiver_address: form.receiver_address,
                receiver_email: form.receiver_email,
                target_account_details: { identifier, mobile },
                requested_data_points: form.required_data,
                notice_content: content,
                status: 'Draft'
            });

            if (res.data.success) {
                navigate(`/cases/${id}/notices/editor`);
            }
        } catch (err) {
            alert('GENERATION_FAILED: Communication bridge error');
        } finally {
            setGenerating(false);
        }
    };

    if (loading) return <div className="p-20 text-center animate-pulse font-black uppercase tracking-[0.5em] text-slate-400">Loading Configuration...</div>;

    if (error || !caseData) return (
        <div className="p-20 text-center space-y-6">
            <div className="text-rose-500 font-black uppercase tracking-widest text-xl italic">{error || 'UNKNOWN_PROTOCOL_ERROR'}</div>
            <button onClick={() => navigate(-1)} className="px-8 py-3 bg-slate-900 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-blue-600 transition-all">
                Return to Command Deck
            </button>
        </div>
    );

    return (
        <div className="max-w-6xl mx-auto space-y-10 pb-20">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-5">
                    <button onClick={() => navigate(-1)} className="p-3 bg-white border border-slate-200 rounded-2xl hover:bg-blue-600 hover:text-white transition-all text-slate-400 shadow-sm">
                        <ChevronLeft size={20} />
                    </button>
                    <div>
                        <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase italic underline decoration-blue-500 underline-offset-8">
                            Notice <span className="text-blue-600">Configurator</span>
                        </h1>
                        <p className="text-slate-400 text-[10px] font-black tracking-widest uppercase mt-2 italic flex items-center gap-2">
                            <Shield size={12} className="text-blue-500" /> SYSTEM_ROLE: SENIOR_ARCHITECT // BNS_COMPLIANCE: ACTIVE
                        </p>
                    </div>
                </div>
                <div className="hidden md:flex items-center gap-4 bg-blue-50 px-6 py-4 rounded-3xl border border-blue-100">
                    <div className="text-right">
                        <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Case Target</p>
                        <p className="text-sm font-black text-slate-900 italic">#{caseData?.case?.fir_no || caseData?.case?.ackn_no}</p>
                    </div>
                    <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-100">
                        <Gavel size={20} />
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                <div className="lg:col-span-8 space-y-10">
                    <Card className="p-10 border-slate-200 shadow-xl shadow-slate-100">
                        <div className="flex items-center gap-3 mb-8">
                            <div className="p-2.5 bg-rose-50 text-rose-600 rounded-xl"><Globe size={20} /></div>
                            <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest italic">Intermediary Selection & Legal Framework</h2>
                        </div>
                        <div className="space-y-8">
                            <div className="grid grid-cols-4 md:grid-cols-7 gap-4">
                                {Object.keys(PLATFORM_DIRECTORY).map(plt => (
                                    <button
                                        key={plt}
                                        onClick={() => handlePlatformSelect(plt)}
                                        className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 ${form.platform === plt ? 'border-blue-600 bg-blue-50 ring-4 ring-blue-50' : 'border-slate-100 hover:border-blue-200'}`}
                                    >
                                        <div className={`p-2 rounded-lg bg-${PLATFORM_DIRECTORY[plt].color}-50 text-${PLATFORM_DIRECTORY[plt].color}-600`}>
                                            <Shield size={16} />
                                        </div>
                                        <span className="text-[9px] font-black uppercase text-slate-900 italic">{plt}</span>
                                    </button>
                                ))}
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-8 border-t border-slate-50">
                                <div className="space-y-4">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 italic">
                                        <Gavel size={12} className="text-blue-500" /> BNS Section Framework
                                    </label>
                                    <div className="grid grid-cols-2 gap-3">
                                        {BNS_SECTIONS.map(sec => (
                                            <button
                                                key={sec.id}
                                                onClick={() => toggleBNS(sec.id)}
                                                className={`p-4 rounded-xl border text-left transition-all ${form.bns_sections.includes(sec.id) ? 'bg-slate-900 border-slate-900 text-white shadow-lg shadow-slate-200' : 'bg-white border-slate-200 text-slate-600 hover:border-blue-400'}`}
                                            >
                                                <p className="text-[10px] font-black tracking-widest italic">{sec.label}</p>
                                                <p className={`text-[8px] font-bold uppercase mt-1 opacity-60`}>{sec.desc}</p>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 italic">
                                        <User size={12} className="text-blue-500" /> Authorized Signing Authority
                                    </label>
                                    <select 
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 focus:ring-2 focus:ring-blue-500/20"
                                        value={form.issued_by}
                                        onChange={(e) => setForm(p => ({ ...p, issued_by: e.target.value }))}
                                    >
                                        {['Investigation Officer (IO)', 'Dy. SP', 'Addl. SP', 'SP', 'Cyber Cell'].map(r => (
                                            <option key={r} value={r}>{r}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>
                    </Card>

                    <Card className="p-10 border-slate-200">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                            <div className="space-y-6">
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl"><Building2 size={20} /></div>
                                    <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest italic text-nowrap">Notice Receiver (Auto)</h2>
                                </div>
                                <div className="space-y-4">
                                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 italic">
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Company Detail</p>
                                        <p className="text-xs font-black text-slate-900">{form.receiver_name || 'Select Platform Above'}</p>
                                        <p className="text-[10px] text-slate-500 mt-2 leading-relaxed">{form.receiver_address || '--'}</p>
                                        <p className="text-[10px] text-blue-600 font-bold mt-2">{form.receiver_email || '--'}</p>
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-6">
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl"><Hash size={20} /></div>
                                    <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest italic text-nowrap">Target Intelligence</h2>
                                </div>
                                <div className="space-y-4">
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between px-1">
                                            <label className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Target Suspects</label>
                                            <button 
                                                onClick={toggleAllSuspects}
                                                className="text-[9px] font-black text-slate-400 hover:text-blue-600 uppercase tracking-widest bg-slate-50 px-2 py-1 rounded-md border border-slate-100"
                                            >
                                                {form.selectedSuspectIds.length === accusedList.length ? 'Clear All' : 'Select All'}
                                            </button>
                                        </div>
                                        <div className="max-h-[150px] overflow-y-auto space-y-2 p-3 bg-blue-50/30 rounded-2xl border border-blue-50 custom-scrollbar">
                                            {accusedList.length > 0 ? accusedList.map(acc => (
                                                <div 
                                                    key={acc.accused_id} 
                                                    onClick={() => toggleSuspect(acc.accused_id.toString())}
                                                    className={`flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer ${form.selectedSuspectIds.includes(acc.accused_id.toString()) ? 'bg-white border-blue-200 shadow-sm' : 'hover:bg-white/50 border-transparent'}`}
                                                >
                                                    <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all ${form.selectedSuspectIds.includes(acc.accused_id.toString()) ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-300'}`}>
                                                        {form.selectedSuspectIds.includes(acc.accused_id.toString()) && <CheckCircle2 size={10} />}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="text-xs font-black text-slate-900 truncate">{acc.name}</p>
                                                        <p className="text-[9px] font-bold text-slate-400 uppercase">{acc.alias || 'No Alias'}</p>
                                                    </div>
                                                </div>
                                            )) : <p className="p-4 text-[10px] font-bold text-slate-400 uppercase text-center italic">No suspects found</p>}
                                        </div>
                                    </div>
                                    <div className="h-px bg-slate-100 my-2"></div>
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Aggregated Data Summary</label>
                                        <div className="p-4 bg-slate-900 rounded-2xl space-y-3">
                                            <div>
                                                <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Combined Identifiers</p>
                                                <p className="text-[11px] font-black text-blue-400 break-all leading-tight italic">
                                                    {getAggregatedData().identifier || 'PENDING_SELECTION'}
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Mobile Stream</p>
                                                <p className="text-[11px] font-black text-emerald-400 italic">
                                                    {getAggregatedData().mobile || 'N/A'}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </Card>

                    <Card className="p-10 border-slate-200">
                        <div className="flex items-center gap-3 mb-8">
                            <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl"><CheckCircle2 size={20} /></div>
                            <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest italic">Data Points Retrieval List</h2>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-4">
                            {DATA_POINTS.map(dp => (
                                <div key={dp.id} onClick={() => toggleDataPoint(dp.id)} className="flex items-center gap-4 cursor-pointer group">
                                    <div className={`w-5 h-5 rounded-md border-2 transition-all flex items-center justify-center ${form.required_data.includes(dp.id) ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-200 group-hover:border-blue-400'}`}>
                                        {form.required_data.includes(dp.id) && <CheckCircle2 size={12} />}
                                    </div>
                                    <span className={`text-xs font-bold uppercase tracking-tight ${form.required_data.includes(dp.id) ? 'text-slate-900' : 'text-slate-500'}`}>{dp.label}</span>
                                </div>
                            ))}
                        </div>
                    </Card>

                    <Card className="p-10 border-slate-200 space-y-8">
                        <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-4 italic">
                                <InfoIcon size={12} className="text-blue-500" /> Notice Body / Subject Context
                            </label>
                            <textarea 
                                rows="3" 
                                className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-6 text-sm font-medium focus:ring-4 focus:ring-blue-500/5 outline-none"
                                placeholder="An investigation is being carried out..."
                                value={form.notice_body}
                                onChange={(e) => setForm(p => ({ ...p, notice_body: e.target.value }))}
                            ></textarea>
                        </div>
                        <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-4 italic">
                                <InfoIcon size={12} className="text-blue-500" /> Tactical Remarks / Investigation Briefing
                            </label>
                            <textarea 
                                rows="3" 
                                className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-6 text-sm font-medium focus:ring-4 focus:ring-blue-500/5 outline-none"
                                placeholder="Add specific incident context here..."
                                value={form.additional_notes}
                                onChange={(e) => setForm(p => ({ ...p, additional_notes: e.target.value }))}
                            ></textarea>
                        </div>
                    </Card>
                </div>

                <div className="lg:col-span-4 space-y-8">
                    <Card className="p-8 bg-slate-900 border-none text-white sticky top-32">
                        <h3 className="text-xs font-black uppercase tracking-[0.2em] mb-6 italic border-b border-white/10 pb-4">Configuration Summary</h3>
                        <div className="space-y-6">
                            <div className="flex items-start gap-4">
                                <Landmark size={16} className="text-blue-400 mt-1" />
                                <div>
                                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Platform Target</p>
                                    <p className="text-sm font-black italic">{form.platform || 'NOT_SELECTED'}</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-4">
                                <Gavel size={16} className="text-blue-400 mt-1" />
                                <div>
                                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Legal Umbrella</p>
                                    <div className="flex flex-wrap gap-1 mt-1">
                                        {form.bns_sections.length > 0 ? form.bns_sections.map(s => (
                                            <span key={s} className="bg-blue-600 px-2 py-0.5 rounded text-[8px] font-black">BNS_{s}</span>
                                        )) : <span className="text-rose-400 text-[10px] font-black">PENDING_SELECTION</span>}
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-start gap-4">
                                <Info size={16} className="text-blue-400 mt-1" />
                                <div>
                                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Retrieval Nodes</p>
                                    <p className="text-xs font-bold text-slate-300 italic">{form.required_data.length} Data Points Identified</p>
                                </div>
                            </div>
                        </div>
                        <div className="mt-12 space-y-4">
                            <div className="p-4 bg-white/5 rounded-2xl border border-white/10 flex items-center gap-3">
                                <AlertCircle size={16} className="text-amber-500" />
                                <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed">System will automatically generate a high-precision 91 CrPC legal draft.</p>
                            </div>
                            <button 
                                onClick={handleGenerate}
                                disabled={generating}
                                className="w-full py-5 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black text-xs uppercase tracking-[0.3em] italic shadow-xl shadow-blue-900 transition-all flex items-center justify-center gap-3 active:scale-95 disabled:opacity-50"
                            >
                                {generating ? 'PROCESSING...' : (
                                    <>
                                        COMPILE_NOTICE
                                        <ChevronRight size={18} />
                                    </>
                                )}
                            </button>
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
};

export default NoticeConfigForm;
