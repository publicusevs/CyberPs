import React, { useState } from 'react';
import { 
    Building2, Hash, MapPin, Shield, 
    ChevronRight, Info, Map, CheckCircle2 
} from 'lucide-react';
import api from '../../services/api';
import { motion, AnimatePresence } from 'framer-motion';

const InputGroup = ({ label, icon: Icon, children }) => (
    <div className="space-y-2">
        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
            <Icon size={12} className="text-blue-500" />
            {label}
        </label>
        {children}
    </div>
);

const TextInput = (props) => (
    <input
        {...props}
        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-slate-300"
    />
);

const PoliceStationRegistration = () => {
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(true);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState('');
    const [formData, setFormData] = useState({
        station_name: '',
        station_code: '',
        state: 'Rajasthan',
        district: 'Jaipur',
        city: '',
        address: '',
        is_active: true
    });

    React.useEffect(() => {
        const fetchInitialData = async () => {
            try {
                const res = await api.get('/police-stations/my-station');
                if (res.data.success && res.data.data) {
                    const cleanedData = {};
                    // Only pick the 7 fields we care about
                    const allowedFields = ['station_name', 'station_code', 'state', 'district', 'city', 'address', 'is_active'];
                    allowedFields.forEach(key => {
                        cleanedData[key] = res.data.data[key] === null ? '' : res.data.data[key];
                    });
                    setFormData(prev => ({ ...prev, ...cleanedData }));
                }
            } catch (err) {
                console.log('No existing station mapping found');
            } finally {
                setFetching(false);
            }
        };
        fetchInitialData();
    }, []);

    if (fetching) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
                <div className="w-12 h-12 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin"></div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest animate-pulse">Synchronizing Unit Data...</p>
            </div>
        );
    }

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setSuccess(false);

        try {
            const res = await api.post('/police-stations', formData);
            if (res.data.success) {
                setSuccess(true);
                setTimeout(() => setSuccess(false), 5000);
            }
        } catch (err) {
            const msg = err.response?.data?.message === 'Process failed' 
                ? `${err.response?.data?.message}: ${err.response?.data?.error || ''}`
                : (err.response?.data?.message || 'Registration failed');
            setError(msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-8 pb-20">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2.5 bg-blue-600 rounded-xl shadow-lg shadow-blue-200">
                            <Shield className="text-white" size={24} />
                        </div>
                        <h1 className="text-3xl font-black italic tracking-tighter text-slate-900 uppercase">
                            Station <span className="text-blue-600">Registry</span>
                        </h1>
                    </div>
                    <p className="text-slate-500 font-bold text-sm tracking-tight flex items-center gap-2 text-wrap">
                        POLICE_UNIT // DATABASE_SYNCHRONIZATION_PROTOCOL 
                    </p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* CORE CONFIGURATION */}
                <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm space-y-8 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-[0.03] pointer-events-none">
                        <Info size={120} />
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <InputGroup label="Police Station Name" icon={Building2}>
                            <TextInput name="station_name" value={formData.station_name} onChange={handleChange} placeholder="e.g. Cyber PS Jaipur" required />
                        </InputGroup>
                        <InputGroup label="Station Code" icon={Hash}>
                            <TextInput name="station_code" value={formData.station_code} onChange={handleChange} placeholder="e.g. CYB-JPR-COM-01" required />
                        </InputGroup>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <InputGroup label="State" icon={Map}>
                            <TextInput name="state" value={formData.state} onChange={handleChange} required />
                        </InputGroup>
                        <InputGroup label="District" icon={MapPin}>
                            <TextInput name="district" value={formData.district} onChange={handleChange} required />
                        </InputGroup>
                        <InputGroup label="City" icon={Building2}>
                            <TextInput name="city" value={formData.city} onChange={handleChange} required />
                        </InputGroup>
                    </div>

                    <InputGroup label="Physical Address" icon={MapPin}>
                        <textarea
                            name="address"
                            value={formData.address}
                            onChange={handleChange}
                            rows="4"
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-slate-300"
                            placeholder="Complete street address..."
                            required
                        ></textarea>
                    </InputGroup>

                    <div className="flex items-center justify-between pt-6 border-t border-slate-100">
                        <div className="flex items-center gap-3 group cursor-pointer" onClick={() => setFormData(p => ({ ...p, is_active: !p.is_active }))}>
                            <div className={`w-12 h-6 rounded-full transition-all relative ${formData.is_active ? 'bg-emerald-500 shadow-lg shadow-emerald-100' : 'bg-slate-200'}`}>
                                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all shadow-sm ${formData.is_active ? 'left-7' : 'left-1'}`}></div>
                            </div>
                            <span className={`text-[10px] font-black uppercase tracking-widest ${formData.is_active ? 'text-emerald-600' : 'text-slate-400'}`}>
                                {formData.is_active ? 'STATION_ACTIVE' : 'STATION_INACTIVE'}
                            </span>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className={`flex items-center gap-3 px-12 py-4 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] italic hover:bg-blue-600 transition-all shadow-xl shadow-slate-200 active:scale-95 disabled:opacity-50 disabled:pointer-events-none group`}
                        >
                            {loading ? 'SYNCHRONIZING...' : (
                                <>
                                    UPDATE_STATION
                                    <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </form>

            <AnimatePresence>
                {success && (
                    <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 20 }}
                        className="fixed bottom-10 right-10 bg-emerald-600 text-white p-6 rounded-2xl shadow-2xl flex items-center gap-4 z-[100] border-l-8 border-emerald-400"
                    >
                        <CheckCircle2 size={32} />
                        <div>
                            <p className="font-black uppercase italic tracking-widest text-[10px] opacity-80">Sync Successful</p>
                            <p className="font-bold">Station data correctly committed to database.</p>
                        </div>
                    </motion.div>
                )}
                {error && (
                    <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 20 }}
                        className="fixed bottom-10 right-10 bg-rose-600 text-white p-6 rounded-2xl shadow-2xl flex items-center gap-4 z-[100] border-l-8 border-rose-400"
                    >
                        <div className="w-8 h-8 rounded-full bg-rose-400 flex items-center justify-center font-black">!</div>
                        <div>
                            <p className="font-black uppercase italic tracking-widest text-[10px] opacity-80">Protocol Error</p>
                            <p className="font-bold text-sm">{error}</p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default PoliceStationRegistration;
