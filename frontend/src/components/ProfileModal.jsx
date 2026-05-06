import React, { useEffect, useState } from 'react';
import { 
    X, Building2, MapPin, Shield, 
    CheckCircle2, Info, ArrowUpRight, Map 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../services/api';

const ProfileModal = ({ isOpen, onClose }) => {
    const [station, setStation] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (isOpen) {
            fetchStationDetails();
        }
    }, [isOpen]);

    const fetchStationDetails = async () => {
        try {
            setLoading(true);
            const res = await api.get('/police-stations/my-station');
            if (res.data.success) {
                setStation(res.data.data);
            }
        } catch (err) {
            console.error('Failed to fetch station profile', err);
        } finally {
            setLoading(false);
        }
    };

    const DetailItem = ({ icon: Icon, label, value, color = "blue" }) => (
        <div className="flex items-start gap-4 group">
            <div className={`p-2.5 rounded-xl bg-${color}-50 text-${color}-600 border border-${color}-100 transition-all group-hover:scale-110`}>
                <Icon size={18} />
            </div>
            <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-0.5">{label}</p>
                <p className="text-sm font-bold text-slate-900 leading-tight">
                    {value || 'N/A'}
                </p>
            </div>
        </div>
    );

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div 
                        initial={{ opacity: 0 }} 
                        animate={{ opacity: 1 }} 
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[110]"
                        onClick={onClose}
                    />

                    {/* Modal Content */}
                    <motion.div
                        initial={{ opacity: 0, x: 100 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 100 }}
                        className="fixed top-0 right-0 h-full w-full max-w-lg bg-white shadow-2xl z-[120] overflow-hidden flex flex-col"
                    >
                        {/* Header */}
                        <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0 z-10">
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <Shield size={16} className="text-blue-600" />
                                    <span className="text-[10px] font-black text-blue-600 uppercase tracking-[0.3em] italic">Unit Verified</span>
                                </div>
                                <h2 className="text-2xl font-black text-slate-900 uppercase italic tracking-tighter">Station <span className="text-blue-600">Profile</span></h2>
                            </div>
                            <button onClick={onClose} className="p-3 hover:bg-slate-100 rounded-xl transition-all text-slate-400 hover:text-rose-500">
                                <X size={24} />
                            </button>
                        </div>

                        {/* Body */}
                        <div className="flex-1 overflow-y-auto p-8 space-y-10 custom-scrollbar">
                            {loading ? (
                                <div className="flex flex-col items-center justify-center h-40 space-y-4">
                                    <div className="w-10 h-10 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin"></div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest animate-pulse">Retrieving Station Intelligence...</p>
                                </div>
                            ) : station ? (
                                <>
                                    {/* Summary Card */}
                                    <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-3xl p-8 text-white relative overflow-hidden shadow-xl shadow-blue-100">
                                        <div className="relative z-10">
                                            <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-80 mb-2">Primary Unit Name</p>
                                            <h3 className="text-2xl font-black italic uppercase leading-none mb-6">{station.station_name}</h3>
                                            
                                            <div className="flex items-center gap-10">
                                                <div>
                                                    <p className="text-[9px] font-black uppercase tracking-widest opacity-60 mb-0.5">Unit Code</p>
                                                    <p className="text-lg font-black tracking-tighter italic">{station.station_code}</p>
                                                </div>
                                                <div>
                                                    <p className="text-[9px] font-black uppercase tracking-widest opacity-60 mb-0.5">District</p>
                                                    <p className="text-lg font-black tracking-tighter italic">{station.district}</p>
                                                </div>
                                            </div>
                                        </div>
                                        <Building2 className="absolute top-1/2 right-0 translate-x-1/4 -translate-y-1/2 opacity-10" size={200} />
                                    </div>

                                    {/* Sections */}
                                    <div className="space-y-8">
                                        <div className="grid grid-cols-2 gap-8">
                                            <DetailItem icon={Map} label="State" value={station.state} />
                                            <DetailItem icon={CheckCircle2} label="Status" value={station.is_active ? 'ACTIVE' : 'INACTIVE'} color={station.is_active ? "emerald" : "rose"} />
                                        </div>

                                        <div className="h-px bg-slate-100 italic flex items-center justify-center">
                                            <span className="bg-white px-4 text-[8px] font-black text-slate-300 uppercase tracking-[0.5em]">Geospatial Data</span>
                                        </div>

                                        <div className="space-y-6">
                                            <DetailItem icon={Building2} label="City" value={station.city} color="emerald" />
                                            <DetailItem icon={MapPin} label="Physical Address" value={station.address} />
                                        </div>
                                    </div>

                                    {/* Action Footer */}
                                    <div className="pt-10 pb-4">
                                        <button className="w-full py-4 bg-slate-100 hover:bg-slate-200 text-slate-900 rounded-2xl font-black text-[10px] uppercase tracking-[0.3em] italic flex items-center justify-center gap-3 transition-all active:scale-95 group">
                                            Request Data Correction
                                            <ArrowUpRight size={14} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                                        </button>
                                    </div>
                                </>
                            ) : (
                                <div className="p-8 text-center text-slate-400 font-bold italic">
                                    PROTOCOL_ERROR // UNABLE_TO_FETCH_UNIT_CORE_DATA
                                </div>
                            )}
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};

export default ProfileModal;
