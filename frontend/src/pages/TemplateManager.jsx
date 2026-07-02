import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { 
    Search, 
    FileText, 
    Plus, 
    Edit, 
    Trash2, 
    FileCode, 
    Layout, 
    CheckCircle2, 
    X,
    AlignLeft,
    AlignCenter,
    AlignRight,
    Type,
    Save,
    Bold,
    Italic,
    Palette,
    Type as SizeIcon,
    Calendar,
    PlusCircle,
    Trash,
    FileJson,
    LayoutGrid,
    Table as TableIcon,
    ArrowRight,
    Printer,
    Download,
    Gavel,
    Briefcase,
    User,
    Edit3
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Table, TableRow, TableCell } from '../components/ui/Table';
import { InputField } from '../components/ui/InputField';
import { motion, AnimatePresence } from 'framer-motion';

const RichTextEditor = ({ value, onChange, label, placeholder }) => {
    const editorRef = React.useRef(null);

    const execCommand = (command, val = null) => {
        document.execCommand(command, false, val);
        if (editorRef.current) {
            onChange(editorRef.current.innerHTML);
        }
    };

    return (
        <div className="space-y-2 flex flex-col h-full">
            <label className="text-[10px] font-black text-slate-400 tracking-widest uppercase ml-1">{label}</label>
            <div className="flex-1 flex flex-col border border-slate-200 rounded-[24px] overflow-hidden bg-slate-50 focus-within:border-blue-600 focus-within:bg-white transition-all shadow-inner">
                {/* Tactical Toolbar */}
                <div className="flex items-center gap-1 p-2 border-b border-slate-200 bg-white/50 backdrop-blur-sm sticky top-0 z-10 overflow-x-auto no-scrollbar">
                    <button type="button" onClick={() => execCommand('bold')} className="p-2 hover:bg-slate-100 rounded-lg text-slate-600 transition-all active:scale-95" title="Bold"><Bold size={16} /></button>
                    <button type="button" onClick={() => execCommand('italic')} className="p-2 hover:bg-slate-100 rounded-lg text-slate-600 transition-all active:scale-95" title="Italic"><Italic size={16} /></button>
                    <div className="w-px h-4 bg-slate-200 mx-1"></div>
                    <button type="button" onClick={() => execCommand('justifyLeft')} className="p-2 hover:bg-slate-100 rounded-lg text-slate-600 transition-all active:scale-95" title="Align Left"><AlignLeft size={16} /></button>
                    <button type="button" onClick={() => execCommand('justifyCenter')} className="p-2 hover:bg-slate-100 rounded-lg text-slate-600 transition-all active:scale-95" title="Align Center"><AlignCenter size={16} /></button>
                    <button type="button" onClick={() => execCommand('justifyRight')} className="p-2 hover:bg-slate-100 rounded-lg text-slate-600 transition-all active:scale-95" title="Align Right"><AlignRight size={16} /></button>
                    <div className="w-px h-4 bg-slate-200 mx-1"></div>
                    <select 
                        onChange={(e) => execCommand('fontSize', e.target.value)}
                        className="bg-transparent text-[10px] font-black uppercase outline-none px-2 cursor-pointer hover:text-blue-600 transition-colors"
                    >
                        <option value="3">Normal</option>
                        <option value="1">Small</option>
                        <option value="2">Medium</option>
                        <option value="4">Large</option>
                        <option value="5">X-Large</option>
                        <option value="6">XX-Large</option>
                        <option value="7">Huge</option>
                    </select>
                    <div className="w-px h-4 bg-slate-200 mx-1"></div>
                    <input 
                        type="color" 
                        onChange={(e) => execCommand('foreColor', e.target.value)}
                        className="w-6 h-6 p-0 border-none bg-transparent cursor-pointer rounded overflow-hidden shadow-sm"
                        title="Text Color"
                    />
                </div>
                {/* Canvas */}
                <div 
                    ref={editorRef}
                    contentEditable
                    suppressContentEditableWarning
                    className="flex-1 p-6 text-sm font-medium leading-relaxed text-slate-700 outline-none min-h-[250px] max-h-[400px] overflow-y-auto prose prose-slate prose-sm max-w-none"
                    onInput={(e) => onChange(e.currentTarget.innerHTML)}
                    dangerouslySetInnerHTML={{ __html: value }}
                    placeholder={placeholder}
                />
            </div>
            <style dangerouslySetInnerHTML={{ __html: `
                [contentEditable]:empty:before {
                    content: attr(placeholder);
                    color: #94a3b8;
                    font-style: italic;
                    pointer-events: none;
                    display: block;
                }
                [contentEditable] select {
                    -webkit-appearance: none;
                }
            `}} />
        </div>
    );
};

const FactualReportForm = ({ data, onChange }) => {
    const updateSection = (section, field, value) => {
        onChange({
            ...data,
            [section]: {
                ...data[section],
                [field]: value
            }
        });
    };

    const updateTransaction = (index, field, value) => {
        const newTransactions = [...data.transactions];
        newTransactions[index] = { ...newTransactions[index], [field]: value };
        onChange({ ...data, transactions: newTransactions });
    };

    const addRow = () => {
        onChange({
            ...data,
            transactions: [
                ...data.transactions,
                { sr_no: data.transactions.length + 1, victim_account: '', date: '', utr: '', amount: '', accused_account: '', freeze_amount: '' }
            ]
        });
    };

    const deleteRow = (index) => {
        const newTransactions = data.transactions.filter((_, i) => i !== index);
        // Re-index
        const reindexed = newTransactions.map((t, i) => ({ ...t, sr_no: i + 1 }));
        onChange({ ...data, transactions: reindexed });
    };

    return (
        <div className="space-y-10">
            {/* Basic Details */}
            <div className="space-y-4">
                <h3 className="text-xs font-black uppercase tracking-widest text-blue-600 flex items-center gap-2 italic">
                    <LayoutGrid size={14} /> Basic Identification
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <InputField label="Police Station" value={data.police_details.police_station} onChange={(e) => updateSection('police_details', 'police_station', e.target.value)} />
                    <InputField label="Commissionerate" value={data.police_details.commissionerate} onChange={(e) => updateSection('police_details', 'commissionerate', e.target.value)} />
                    <InputField label="City" value={data.police_details.city} onChange={(e) => updateSection('police_details', 'city', e.target.value)} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <InputField label="Letter Number" value={data.letter_details.letter_number} onChange={(e) => updateSection('letter_details', 'letter_number', e.target.value)} />
                    <InputField label="Letter Date" type="date" value={data.letter_details.letter_date} onChange={(e) => updateSection('letter_details', 'letter_date', e.target.value)} icon={Calendar} />
                </div>
            </div>

            {/* Court Details */}
            <div className="space-y-4">
                <h3 className="text-xs font-black uppercase tracking-widest text-blue-600 flex items-center gap-2 italic">
                    <Gavel size={14} /> Court Jurisdiction
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <InputField label="Court Name" value={data.court_details.court_name} onChange={(e) => updateSection('court_details', 'court_name', e.target.value)} />
                    <InputField label="Court Number" value={data.court_details.court_number} onChange={(e) => updateSection('court_details', 'court_number', e.target.value)} />
                    <InputField label="Court City" value={data.court_details.court_city} onChange={(e) => updateSection('court_details', 'court_city', e.target.value)} />
                </div>
            </div>

            {/* Case Details */}
            <div className="space-y-4">
                <h3 className="text-xs font-black uppercase tracking-widest text-blue-600 flex items-center gap-2 italic">
                    <Briefcase size={14} /> Case Protocol
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <InputField label="FIR Number" value={data.case_details.fir_number} onChange={(e) => updateSection('case_details', 'fir_number', e.target.value)} />
                    <InputField label="FIR Date" type="date" value={data.case_details.fir_date} onChange={(e) => updateSection('case_details', 'fir_date', e.target.value)} icon={Calendar} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <InputField label="Sections" value={data.case_details.sections} onChange={(e) => updateSection('case_details', 'sections', e.target.value)} />
                    <InputField label="Act Name" value={data.case_details.act_name} onChange={(e) => updateSection('case_details', 'act_name', e.target.value)} />
                </div>
                <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 tracking-widest uppercase">Reference Text</label>
                    <textarea 
                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs font-medium outline-none focus:border-blue-600"
                        rows="3"
                        value={data.case_details.reference}
                        onChange={(e) => updateSection('case_details', 'reference', e.target.value)}
                    />
                </div>
            </div>

            {/* Complainant & Financial */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <div className="space-y-4">
                    <h3 className="text-xs font-black uppercase tracking-widest text-blue-600 flex items-center gap-2 italic">
                        <User size={14} /> Complainant Details
                    </h3>
                    <InputField label="Full Name" value={data.complainant_details.name} onChange={(e) => updateSection('complainant_details', 'name', e.target.value)} />
                    <InputField label="Incident Date" type="date" value={data.complainant_details.incident_date} onChange={(e) => updateSection('complainant_details', 'incident_date', e.target.value)} icon={Calendar} />
                    <InputField label="Reporting Officer" value={data.complainant_details.officer_name} onChange={(e) => updateSection('complainant_details', 'officer_name', e.target.value)} />
                </div>
                <div className="space-y-4">
                    <h3 className="text-xs font-black uppercase tracking-widest text-blue-600 flex items-center gap-2 italic">
                        <Palette size={14} /> Financial Audit
                    </h3>
                    <InputField label="Total Amount" value={data.financial_details.total_amount} onChange={(e) => updateSection('financial_details', 'total_amount', e.target.value)} />
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-400 tracking-widest uppercase">Bank Action Details</label>
                        <textarea 
                            className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs font-medium outline-none focus:border-blue-600"
                            rows="2"
                            value={data.financial_details.bank_action}
                            onChange={(e) => updateSection('financial_details', 'bank_action', e.target.value)}
                        />
                    </div>
                </div>
            </div>

            {/* Dynamic Transactions Table */}
            <div className="space-y-4 pt-4">
                <div className="flex items-center justify-between">
                    <h3 className="text-xs font-black uppercase tracking-widest text-blue-600 flex items-center gap-2 italic">
                        <TableIcon size={14} /> Transaction Ledger
                    </h3>
                    <Button variant="outline" size="sm" icon={PlusCircle} onClick={addRow}>Add Row</Button>
                </div>
                <div className="overflow-x-auto border border-slate-200 rounded-2xl shadow-inner">
                    <table className="w-full text-left text-[11px]">
                        <thead className="bg-slate-900 text-slate-400 uppercase font-black tracking-tighter">
                            <tr>
                                <th className="p-3 w-12 text-center">#</th>
                                <th className="p-3 min-w-[150px]">Victim A/C</th>
                                <th className="p-3 min-w-[120px]">Date</th>
                                <th className="p-3 min-w-[150px]">UTR / Ref</th>
                                <th className="p-3 min-w-[100px]">Amount</th>
                                <th className="p-3 min-w-[150px]">Accused A/C</th>
                                <th className="p-3 min-w-[100px]">Freeze</th>
                                <th className="p-3 w-12"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {data.transactions.map((t, idx) => (
                                <tr key={idx} className="bg-white hover:bg-slate-50 transition-colors">
                                    <td className="p-2 text-center font-black text-slate-400">{t.sr_no}</td>
                                    <td className="p-2"><input className="w-full bg-transparent outline-none font-bold" value={t.victim_account} onChange={(e) => updateTransaction(idx, 'victim_account', e.target.value)} /></td>
                                    <td className="p-2"><input className="w-full bg-transparent outline-none" type="date" value={t.date} onChange={(e) => updateTransaction(idx, 'date', e.target.value)} /></td>
                                    <td className="p-2"><input className="w-full bg-transparent outline-none" value={t.utr} onChange={(e) => updateTransaction(idx, 'utr', e.target.value)} /></td>
                                    <td className="p-2"><input className="w-full bg-transparent outline-none font-black text-blue-600" value={t.amount} onChange={(e) => updateTransaction(idx, 'amount', e.target.value)} /></td>
                                    <td className="p-2"><input className="w-full bg-transparent outline-none font-bold" value={t.accused_account} onChange={(e) => updateTransaction(idx, 'accused_account', e.target.value)} /></td>
                                    <td className="p-2"><input className="w-full bg-transparent outline-none font-black text-rose-600" value={t.freeze_amount} onChange={(e) => updateTransaction(idx, 'freeze_amount', e.target.value)} /></td>
                                    <td className="p-2">
                                        <button onClick={() => deleteRow(idx)} className="text-slate-300 hover:text-rose-500 transition-colors"><Trash size={14} /></button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};



const FactualReportPreview = ({ data }) => {
    return (
        <div className="bg-white p-12 shadow-2xl max-w-[800px] mx-auto text-slate-900 font-serif leading-relaxed" id="report-content">
            {/* Header */}
            <div className="text-center border-b-2 border-black pb-4 mb-8">
                <h1 className="text-xl font-black uppercase underline">dk;kZy; {data.police_details.police_station || 'lkbZcj iqfyl Fkkuk'}] {data.police_details.commissionerate || 'iqfyl vk;qDrky;'}] {data.police_details.city || 't;iqj'}</h1>
                <div className="flex justify-between mt-4 font-bold text-sm">
                    <span>Øekad % {data.letter_details.letter_number || '___________'}</span>
                    <span>fnukad % {data.letter_details.letter_date || '___________'}</span>
                </div>
            </div>

            {/* Receiver */}
            <div className="mb-8 space-y-1 font-bold text-sm">
                <p>Jheku {data.court_details.court_name || 'vfrfjDr eq[; egkuxj eftLVªsV'}]</p>
                <p>Øe la[;k%{data.court_details.court_number || '8'}] {data.court_details.court_city || 't;iqj egkuxj izFke'}A</p>
            </div>

            {/* Subject & Reference */}
            <div className="mb-8 text-sm">
                <p className="font-black underline mb-2">fo"k;%&rF;kRed fjiksVZ ,QvkbZvkj uacj {data.case_details.fir_number || '____'} fnukad {data.case_details.fir_date || '____'} /kkjk {data.case_details.sections || '____'} {data.case_details.act_name || 'vkbZVh ,DV'} {data.police_details.police_station || 'lkbZcj iqfyl Fkkuk'} ds lacU/k esaA</p>
                <p className="font-bold italic">izlax%&{data.case_details.reference || 'izkFkhZ }kjk ekuuh; U;k;ky; ds le{k izkFkZuk i= is’k djus ds laca/k esaA'}</p>
            </div>

            <p className="mb-4 font-bold text-sm">egksn;]</p>

            {/* Body Sections */}
            <div className="text-sm text-justify space-y-4 mb-8">
                <p>okD;kr izdj.k bl izdkj gS fd fnukad {data.complainant_details.incident_date || '____'} dks ifjoknh {data.complainant_details.name || '____'} fuoklh {data.complainant_details.address || '____'} us ,d fyf[kr fjiksVZ bl vk’k; dh is’k dh fd muds lkFk foRrh; /kks[kk/kM+h gqbZ gSA</p>
                <p>mDr fjiksVZ ij izdj.k la[;k {data.case_details.fir_number || '____'} ntZ dj vuqla/kku {data.complainant_details.officer_name || '____'} {'}'}kjk fd;k tk jgk gSA</p>
                <p>i=koyh ds voyksdu ls Kkr gqvk fd ifjoknh ds cSad [kkrs ls dqy {data.financial_details.total_amount || '____'} :i;s VªkWLQj करवा लिये गयेA {data.financial_details.bank_action || ''}</p>
            </div>

            <p className="font-black text-sm mb-4 underline uppercase">Fraud Amount Flow Chart Layer - 1</p>

            {/* Table */}
            <div className="border border-black mb-8 overflow-hidden rounded-sm">
                <table className="w-full text-[10px] border-collapse">
                    <thead className="bg-slate-50 border-b border-black">
                        <tr>
                            <th className="border-r border-black p-1 text-center">Sr.</th>
                            <th className="border-r border-black p-1">Victim Account</th>
                            <th className="border-r border-black p-1 text-center">Date</th>
                            <th className="border-r border-black p-1">UTR / Transaction ID</th>
                            <th className="border-r border-black p-1 text-right">Amount</th>
                            <th className="border-r border-black p-1">Accused Account</th>
                            <th className="p-1 text-right">Freeze</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-black">
                        {data.transactions.map((t, i) => (
                            <tr key={i}>
                                <td className="border-r border-black p-1 text-center">{t.sr_no}</td>
                                <td className="border-r border-black p-1">{t.victim_account}</td>
                                <td className="border-r border-black p-1 text-center">{t.date}</td>
                                <td className="border-r border-black p-1">{t.utr}</td>
                                <td className="border-r border-black p-1 text-right font-bold">{t.amount}</td>
                                <td className="border-r border-black p-1">{t.accused_account}</td>
                                <td className="p-1 text-right font-bold text-rose-600">{t.freeze_amount}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="text-sm italic mb-10 text-justify">
                <p><strong>Note: </strong> {data.financial_details.court_order || "fjoVZ vkWMZj ekuuh; U;k;ky; ds vkns'k dh ikyuk esa lafnX/k@vkjksfi;ku ds [kkrksa esa Available Balance ifjoknh ds mijksDr of.kZr [kkrksa esa varfjr djok fn;k x;k gSA"}</p>
            </div>

            {/* Conclusion & Signature */}
            <div className="flex justify-between items-end mt-20">
                <div className="text-xs font-bold italic">
                    <p>Report Generated: {new Date().toLocaleString()}</p>
                    <p>System ID: {data.template_id}</p>
                </div>
                <div className="text-center min-w-[200px]">
                    <div className="border-t border-black pt-2 font-black text-sm uppercase">
                        ({data.complainant_details.officer_name || 'vuqla/kku vf/kdkjh'})
                    </div>
                    <p className="text-[10px] font-bold uppercase tracking-widest">{data.police_details.police_station || 'lkbZcj iqfyl Fkkuk'}</p>
                </div>
            </div>
        </div>
    );
};


const TemplateManager = () => {
    const [templates, setTemplates] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isEdit, setIsEdit] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [templateType, setTemplateType] = useState('Standard'); // Standard or FactualReport
    const [currentTemplate, setCurrentTemplate] = useState({
        template_name: '',
        template_type: 'Standard',
        subject_text: '',
        body_text: '',
        footer_text: '',
        json_data: null
    });
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);
    const [previewData, setPreviewData] = useState(null);

    const handleOpenPreview = (template) => {
        const parsedJson = template.json_data ? (typeof template.json_data === 'string' ? JSON.parse(template.json_data) : template.json_data) : null;
        setPreviewData(parsedJson);
        setIsPreviewOpen(true);
    };

    const handleClosePreview = () => {
        setIsPreviewOpen(false);
        setPreviewData(null);
    };

    const INITIAL_FACTUAL_DATA = {
        template_id: '',
        template_name: '',
        created_at: '',
        police_details: { police_station: '', commissionerate: '', city: '' },
        letter_details: { letter_number: '', letter_date: '' },
        court_details: { court_name: '', court_number: '', court_city: '' },
        case_details: { fir_number: '', fir_date: '', sections: '', act_name: '', reference: '' },
        complainant_details: { name: '', address: '', incident_date: '', officer_name: '' },
        financial_details: { total_amount: '', bank_action: '', court_order: '' },
        transactions: [
            { sr_no: 1, victim_account: '', date: '', utr: '', amount: '', accused_account: '', freeze_amount: '' }
        ]
    };

    useEffect(() => {
        fetchTemplates();
    }, []);

    const fetchTemplates = async () => {
        try {
            const res = await api.get('/templates');
            if (res.data.success) {
                setTemplates(res.data.data);
            }
        } catch (err) {
            console.error('Fetch error');
        } finally {
            setLoading(false);
        }
    };

    const handleOpenModal = (template = null) => {
        if (template) {
            const parsedJson = template.json_data ? (typeof template.json_data === 'string' ? JSON.parse(template.json_data) : template.json_data) : null;
            setCurrentTemplate({
                ...template,
                json_data: parsedJson
            });
            setTemplateType(template.template_type || 'Standard');
            setIsEdit(true);
        } else {
            setCurrentTemplate({
                template_name: '',
                template_type: 'Standard',
                subject_text: '',
                body_text: '',
                footer_text: '',
                json_data: INITIAL_FACTUAL_DATA
            });
            setTemplateType('Standard');
            setIsEdit(false);
        }
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setCurrentTemplate(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const payload = { ...currentTemplate, template_type: templateType };
            
            if (templateType === 'FactualReport') {
                payload.json_data.template_name = payload.template_name;
                if (!payload.json_data.template_id) {
                    payload.json_data.template_id = crypto.randomUUID();
                }
                payload.json_data.created_at = new Date().toISOString();
            }

            if (isEdit) {
                await api.put(`/templates/${currentTemplate.template_id}`, payload);
            } else {
                await api.post('/templates', payload);
            }
            fetchTemplates();
            handleCloseModal();
        } catch (err) {
            alert('Operation failed: ' + (err.response?.data?.message || err.message));
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm('Are you sure you want to delete this template?')) {
            try {
                await api.delete(`/templates/${id}`);
                fetchTemplates();
            } catch (err) {
                alert('Delete failed');
            }
        }
    };

    const filteredTemplates = templates.filter(t => 
        t.template_name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) return <div className="p-20 text-center text-slate-400 font-bold uppercase tracking-widest text-xs">Syncing template repository...</div>;

    return (
        <div className="space-y-10 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <h1 className="text-4xl font-black text-slate-900 tracking-tight uppercase">
                        Template<span className="text-blue-600"> Forge</span>
                    </h1>
                    <div className="flex items-center gap-2 text-slate-400 text-[10px] font-black tracking-[0.2em] mt-1 ml-1 uppercase">
                        <FileCode size={12} className="text-blue-600" />
                        Notice Formats // Tactical Assets
                    </div>
                </div>
                <div className="flex w-full md:w-auto gap-3">
                    <div className="w-full md:w-80">
                        <InputField 
                            icon={Search} 
                            placeholder="Search templates..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <Button variant="primary" icon={Plus} onClick={() => handleOpenModal()}>New Template</Button>
                </div>
            </div>

            <Card className="overflow-hidden border-slate-200 shadow-xl shadow-slate-200/50">
                <Table headers={["Template Name", "Last Updated", "Actions"]}>
                    {filteredTemplates.map((t) => (
                        <TableRow key={t.template_id}>
                            <TableCell>
                                <div className="flex items-center gap-3">
                                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center border ${t.template_type === 'FactualReport' ? 'bg-blue-50 border-blue-100 text-blue-600' : (t.template_type === 'Mail' ? 'bg-indigo-50 border-indigo-100 text-indigo-600' : 'bg-slate-50 border-slate-100 text-slate-400')}`}>
                                        {t.template_type === 'FactualReport' ? <FileJson size={18} /> : (t.template_type === 'Mail' ? <Mail size={18} /> : <Layout size={18} />)}
                                    </div>
                                    <div>
                                        <span className="font-bold text-slate-900 tracking-tight block">{t.template_name}</span>
                                        <span className={`text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded ${t.template_type === 'FactualReport' ? 'bg-blue-600 text-white' : (t.template_type === 'Mail' ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-600')}`}>
                                            {t.template_type || 'Standard'}
                                        </span>
                                    </div>
                                </div>
                            </TableCell>
                            <TableCell className="text-[11px] text-slate-500 font-medium italic">
                                {new Date(t.updated_at).toLocaleString()}
                            </TableCell>
                            <TableCell className="text-right">
                                <div className="flex justify-end gap-2">
                                    <Button variant="ghost" className="p-2 text-blue-600 hover:bg-blue-50" onClick={() => handleOpenModal(t)}>
                                        <Edit3 size={16} />
                                    </Button>
                                    {t.template_type === 'FactualReport' && (
                                        <Button variant="ghost" className="p-2 text-emerald-600 hover:bg-emerald-50" onClick={() => handleOpenPreview(t)}>
                                            <FileText size={16} />
                                        </Button>
                                    )}
                                    <Button variant="ghost" className="p-2 text-rose-500 hover:bg-rose-50" onClick={() => handleDelete(t.template_id)}>
                                        <Trash2 size={16} />
                                    </Button>
                                </div>
                            </TableCell>
                        </TableRow>
                    ))}
                    {filteredTemplates.length === 0 && (
                        <TableRow>
                            <TableCell colSpan={3} className="py-24 text-center">
                                <FileText className="mx-auto text-slate-200 mb-4" size={48} />
                                <p className="text-xs text-slate-400 font-black uppercase tracking-[0.3em]">No templates deployed</p>
                            </TableCell>
                        </TableRow>
                    )}
                </Table>
            </Card>

            {/* Template Form Modal */}
            <AnimatePresence>
                {isModalOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div 
                            initial={{ opacity: 0 }} 
                            animate={{ opacity: 1 }} 
                            exit={{ opacity: 0 }}
                            onClick={handleCloseModal}
                            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
                        />
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="relative w-full max-w-4xl bg-white rounded-[32px] shadow-2xl overflow-hidden"
                        >
                            <div className="p-8 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-[110]">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-blue-600 rounded-2xl text-white shadow-lg shadow-blue-200">
                                        {templateType === 'FactualReport' ? <FileJson size={20} /> : <Save size={20} />}
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">
                                            {isEdit ? 'Refine' : 'Initialize'} {templateType === 'FactualReport' ? 'Factual Report' : (templateType === 'Mail' ? 'Mail Template' : 'Notice Template')}
                                        </h2>
                                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">
                                            {templateType === 'FactualReport' ? 'Cyber Crime Factual Report Engine' : (templateType === 'Mail' ? 'Generic Mail Template' : 'Standard Legal Notice Structure')}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    {!isEdit && (
                                        <div className="flex bg-slate-100 p-1 rounded-xl mr-4">
                                            <button 
                                                type="button"
                                                onClick={() => setTemplateType('Standard')}
                                                className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${templateType === 'Standard' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                                            >
                                                Standard
                                            </button>
                                            <button 
                                                type="button"
                                                onClick={() => setTemplateType('Mail')}
                                                className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${templateType === 'Mail' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                                            >
                                                Mail
                                            </button>
                                            <button 
                                                type="button"
                                                onClick={() => {
                                                    setTemplateType('FactualReport');
                                                    setCurrentTemplate(prev => ({ ...prev, json_data: INITIAL_FACTUAL_DATA }));
                                                }}
                                                className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${templateType === 'FactualReport' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                                            >
                                                Factual Report
                                            </button>
                                        </div>
                                    )}
                                    <button onClick={handleCloseModal} className="p-3 hover:bg-slate-50 rounded-xl transition-all text-slate-400 hover:text-rose-500">
                                        <X size={20} />
                                    </button>
                                </div>
                            </div>

                            <form onSubmit={handleSubmit} className="p-8 overflow-y-auto max-h-[75vh]">
                                <div className="mb-10">
                                    <InputField 
                                        label="Template Identity (Must be Unique)" 
                                        name="template_name" 
                                        required 
                                        value={currentTemplate.template_name} 
                                        onChange={handleInputChange} 
                                        icon={Type}
                                        placeholder="e.g., Factual Report Jaipur West"
                                    />
                                </div>

                                {templateType === 'Standard' || templateType === 'Mail' ? (
                                    <div className="space-y-8">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                            <div className="space-y-6">
                                                <div className="space-y-1.5">
                                                    <label className="text-[10px] font-black text-slate-400 tracking-widest uppercase ml-1">Subject Header</label>
                                                    <textarea 
                                                        name="subject_text"
                                                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs font-bold uppercase tracking-tight text-slate-800 focus:border-blue-600 focus:bg-white transition-all min-h-[100px] outline-none"
                                                        value={currentTemplate.subject_text}
                                                        onChange={handleInputChange}
                                                        placeholder="NOTICE UNDER SECTION..."
                                                    />
                                                </div>
                                                <div className="space-y-1.5">
                                                    <label className="text-[10px] font-black text-slate-400 tracking-widest uppercase ml-1">Instructional Footer</label>
                                                    <textarea 
                                                        name="footer_text"
                                                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-[11px] font-bold tracking-tight text-rose-600 focus:border-blue-600 focus:bg-white transition-all min-h-[100px] outline-none"
                                                        value={currentTemplate.footer_text}
                                                        onChange={handleInputChange}
                                                        placeholder="FURTHER, YOU ARE REQUESTED TO..."
                                                    />
                                                </div>
                                            </div>
                                            <div className="h-full">
                                                <RichTextEditor 
                                                    label="Core Body Text (Rich Format)"
                                                    value={currentTemplate.body_text}
                                                    onChange={(val) => setCurrentTemplate(prev => ({ ...prev, body_text: val }))}
                                                    placeholder="Forge your legal argument here..."
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <FactualReportForm 
                                        data={currentTemplate.json_data} 
                                        onChange={(val) => setCurrentTemplate(prev => ({ ...prev, json_data: val }))} 
                                    />
                                )}

                                <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 mt-8">
                                    <Button variant="outline" type="button" onClick={handleCloseModal}>Discard</Button>
                                    <Button variant="primary" type="submit" icon={CheckCircle2} className="px-8">
                                        {isEdit ? 'Apply Changes' : 'Finalize Template'}
                                    </Button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Preview Modal */}
            <AnimatePresence>
                {isPreviewOpen && previewData && (
                    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 md:p-10">
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={handleClosePreview}
                            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
                        />
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="relative w-full max-w-5xl bg-slate-100 rounded-[32px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
                        >
                            <div className="p-6 bg-white border-b border-slate-200 flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-emerald-600 rounded-2xl text-white shadow-lg shadow-emerald-200">
                                        <FileText size={20} />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">Generated Factual Report</h2>
                                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5 italic">Official Cyber Crime Documentation Protocol</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <Button variant="outline" size="sm" icon={Printer} onClick={() => window.print()}>Print Report</Button>
                                    <Button size="sm" icon={Download} onClick={() => alert('PDF Export Protocol Initialized...')}>Export PDF</Button>
                                    <button onClick={handleClosePreview} className="p-3 hover:bg-slate-50 rounded-xl transition-all text-slate-400 hover:text-rose-500">
                                        <X size={20} />
                                    </button>
                                </div>
                            </div>
                            <div className="flex-1 overflow-y-auto p-10 bg-slate-100 print:bg-white print:p-0">
                                <FactualReportPreview data={previewData} />
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <style dangerouslySetInnerHTML={{ __html: `
                @media print {
                    .no-print { display: none !important; }
                    body { background: white !important; }
                    .print\:bg-white { background: white !important; }
                    .print\:p-0 { padding: 0 !important; }
                    #report-content { box-shadow: none !important; margin: 0 !important; width: 100% !important; max-width: none !important; }
                }
            `}} />
        </div>
    );
};

export default TemplateManager;
