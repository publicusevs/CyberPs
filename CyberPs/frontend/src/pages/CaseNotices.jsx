import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
    Building2, Globe, Phone, CreditCard, Shield, 
    ChevronRight, ArrowLeft, FileSignature, Landmark,
    Gavel, Mail, MessageCircle, Share2, Search
} from 'lucide-react';
import { motion } from 'framer-motion';
import { Card } from '../components/ui/Card';

const NoticeCategoryCard = ({ icon: Icon, title, description, badge, onClick, color = "blue" }) => (
    <motion.div
        whileHover={{ scale: 1.02, y: -5 }}
        whileTap={{ scale: 0.98 }}
        onClick={onClick}
        className="cursor-pointer group"
    >
        <Card className="h-full border-slate-200 hover:border-blue-500 transition-all p-8 relative overflow-hidden bg-white hover:shadow-2xl hover:shadow-blue-50">
            <div className={`absolute top-0 right-0 p-6 opacity-[0.03] transition-opacity group-hover:opacity-[0.08]`}>
                <Icon size={120} />
            </div>
            
            <div className="flex flex-col h-full relative z-10">
                <div className={`w-14 h-14 rounded-2xl bg-${color}-50 text-${color}-600 flex items-center justify-center mb-6 shadow-sm group-hover:bg-blue-600 group-hover:text-white transition-all duration-300`}>
                    <Icon size={28} />
                </div>
                
                <div className="flex items-center gap-2 mb-2">
                    <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest italic">{badge}</span>
                    <div className="h-px flex-1 bg-slate-100"></div>
                </div>
                
                <h3 className="text-xl font-black text-slate-900 uppercase italic tracking-tighter mb-3 group-hover:text-blue-600 transition-colors">{title}</h3>
                <p className="text-slate-500 text-xs font-bold leading-relaxed mb-8 flex-1">
                    {description}
                </p>
                
                <div className="flex items-center justify-between pt-6 border-t border-slate-50">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Deploy Protocol</span>
                    <div className="w-8 h-8 rounded-full bg-slate-50 group-hover:bg-blue-600 flex items-center justify-center text-slate-400 group-hover:text-white transition-all">
                        <ChevronRight size={16} />
                    </div>
                </div>
            </div>
        </Card>
    </motion.div>
);

const CaseNotices = () => {
    const { id } = useParams();
    const navigate = useNavigate();

    const categories = [
        {
            id: 'bank',
            title: 'Banking Institutions',
            description: 'Generate 91 CrPC notices for transaction logs, KYC details, and frozen fund reversals.',
            icon: Landmark,
            badge: 'Financial_Node',
            color: 'emerald'
        },
        {
            id: 'social',
            title: 'Intermediaries',
            description: 'Notices for Facebook, Instagram, Google, and Telegram to extract digital identifiers.',
            icon: Share2,
            badge: 'Digital_Footprint',
            color: 'blue'
        },
        {
            id: 'telecom',
            title: 'Telecom / ISP',
            description: 'Request CDR (Call Detail Records) and IPDR from network service providers.',
            icon: Phone,
            badge: 'Comm_Matrix',
            color: 'orange'
        },
        {
            id: 'payment',
            title: 'Payment Gateways',
            description: 'Trace transaction flow through Razorpay, Cashfree, and merchant nodes.',
            icon: CreditCard,
            badge: 'Value_Transfer',
            color: 'rose'
        },
        {
            id: 'domain',
            title: 'Domain/Cloud',
            description: 'Registrar data and hosting logs for suspicious URLs or phishing infrastructure.',
            icon: Globe,
            badge: 'Host_Identity',
            color: 'indigo'
        },
        {
            id: 'ecom',
            title: 'E-Commerce',
            description: 'Purchase history and delivery address investigation for marketplaces.',
            icon: Search,
            badge: 'Logistics_Chain',
            color: 'violet'
        }
    ];

    return (
        <div className="space-y-10 pb-20">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div className="flex items-center gap-5">
                    <button onClick={() => navigate(-1)} className="p-3 bg-white border border-slate-200 rounded-2xl hover:bg-blue-600 hover:text-white transition-all text-slate-400">
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase">
                                Legal <span className="text-blue-600">Notice Deck</span>
                            </h1>
                            <div className="px-2 py-0.5 rounded-md text-[9px] font-black bg-blue-50 text-blue-600 border border-blue-100 uppercase tracking-tighter italic">
                                SEC_PROTOCOL_v4.2
                            </div>
                        </div>
                        <p className="text-slate-400 text-[10px] font-black tracking-widest uppercase mt-1 italic">
                            Select target entity for evidence orchestration // CASE_ID: #{id}
                        </p>
                    </div>
                </div>
            </div>

            {/* Selection Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {categories.map((cat, idx) => (
                    <NoticeCategoryCard
                        key={cat.id}
                        {...cat}
                        onClick={() => {
                            if (cat.id === 'social' || cat.id === 'bank') {
                                navigate(`/cases/${id}/notices/config`);
                            } else {
                                console.log(`Generating ${cat.id} notice for case ${id}`);
                            }
                        }}
                    />
                ))}
            </div>

            {/* Footer Status */}
            <Card className="p-6 bg-slate-900 border-none relative overflow-hidden">
                <div className="flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-white/10 rounded-xl text-blue-400">
                            <Shield size={24} />
                        </div>
                        <div>
                            <p className="text-white font-black text-xs uppercase tracking-widest">Legal Artifact Integrity</p>
                            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-tight italic">All notices are generated with official 91 CrPC digital watermarks.</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-8">
                        <div className="text-right">
                            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Authenticated Units</p>
                            <div className="flex -space-x-2">
                                {[1, 2, 3].map(i => (
                                    <div key={i} className="w-8 h-8 rounded-full border-2 border-slate-900 bg-slate-800 flex items-center justify-center text-[10px] font-black text-blue-400">P{i}</div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
                <div className="absolute top-0 right-0 w-64 h-full bg-gradient-to-l from-blue-600/20 to-transparent pointer-events-none"></div>
            </Card>
        </div>
    );
};

export default CaseNotices;
