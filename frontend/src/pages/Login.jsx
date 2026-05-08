import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Shield, Lock, User, Eye, EyeOff, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const Login = () => {
    const [identifier, setIdentifier] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    const [status, setStatus] = useState({ database: false, internet: false });

    React.useEffect(() => {
        const checkStatus = async () => {
            const isOnline = navigator.onLine;
            let dbConnected = false;
            try {
                const res = await fetch('http://localhost:5000/api/auth/status');
                const data = await res.json();
                dbConnected = data.database;
            } catch (e) {
                dbConnected = false;
            }
            setStatus({ database: dbConnected, internet: isOnline });
        };
        checkStatus();
        const interval = setInterval(checkStatus, 10000);
        return () => clearInterval(interval);
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!identifier || !password) {
            setError('Please provide all credentials');
            return;
        }
        setError('');
        setLoading(true);

        try {
            const success = await login(identifier, password);
            if (success) {
                navigate('/');
            } else {
                setError('ACCESS DENIED: Credentials mismatch');
            }
        } catch (err) {
            setError(err.response?.data?.message || 'CRITICAL: Host connection failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen w-full bg-slate-50 flex items-center justify-center p-6 relative overflow-hidden">
            {/* Soft Light Background Elements */}
            <div className="absolute inset-0 z-0">
                <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-500/5 blur-[120px] rounded-full"></div>
                <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-500/5 blur-[120px] rounded-full"></div>
                <div className="absolute inset-0 opacity-[0.4]" style={{ backgroundImage: 'radial-gradient(#e2e8f0 1.5px, transparent 0)', backgroundSize: '30px 30px' }}></div>
            </div>

            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="w-full max-w-md z-10"
            >
                {/* Header */}
                <div className="text-center mb-10">
                    <motion.div 
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="inline-flex p-4 rounded-3xl bg-blue-600 shadow-xl shadow-blue-200 mb-6"
                    >
                        <Shield className="w-10 h-10 text-white" />
                    </motion.div>
                    <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic">
                        Cyber <span className="text-blue-600">OPS</span>
                    </h1>
                    <p className="text-slate-500 text-[10px] font-black tracking-[0.3em] uppercase mt-2">Intelligence Investigation System</p>
                </div>

                {/* Login Card */}
                <div className="bg-white border border-slate-200 rounded-[2.5rem] p-10 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.08)]">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Error Message */}
                        <AnimatePresence>
                            {error && (
                                <motion.div 
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    className="p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-center gap-3 text-rose-600 text-xs font-bold uppercase"
                                >
                                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                                    <span>{error}</span>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Username Field */}
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Secure Identity</label>
                            <div className="relative group">
                                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors" size={20} />
                                <input 
                                    type="text"
                                    placeholder="Username / Email"
                                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 pl-12 pr-4 text-slate-900 placeholder:text-slate-400 outline-none focus:border-blue-500 focus:bg-white transition-all font-medium"
                                    value={identifier}
                                    onChange={(e) => setIdentifier(e.target.value)}
                                />
                            </div>
                        </div>

                        {/* Password Field */}
                        <div className="space-y-2">
                            <div className="flex justify-between items-center px-1">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Protocol Secret</label>
                                <button type="button" className="text-[10px] font-bold text-blue-600 hover:text-blue-700 transition-colors uppercase tracking-tighter">Recover Key?</button>
                            </div>
                            <div className="relative group">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors" size={20} />
                                <input 
                                    type={showPassword ? "text" : "password"}
                                    placeholder="••••••••"
                                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 pl-12 pr-12 text-slate-900 placeholder:text-slate-400 outline-none focus:border-blue-500 focus:bg-white transition-all font-medium"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                />
                                <button 
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                                >
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>

                        {/* Submit Button */}
                        <motion.button
                            whileHover={{ scale: 1.01 }}
                            whileTap={{ scale: 0.99 }}
                            disabled={loading}
                            className="w-full py-4 bg-blue-600 text-white font-black text-sm uppercase italic tracking-[0.2em] rounded-2xl shadow-xl shadow-blue-200 disabled:opacity-50 flex items-center justify-center gap-3 transition-all mt-4"
                        >
                            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Access System"}
                        </motion.button>
                    </form>

                    {/* Status Footer */}
                    <div className="mt-8 pt-6 border-t border-slate-100 space-y-4">
                        <div className="flex justify-center gap-6">
                            <div className="flex items-center gap-1.5">
                                <div className={`w-1.5 h-1.5 rounded-full ${status.internet ? 'bg-emerald-500' : 'bg-rose-500'}`}></div>
                                <span className="text-[9px] font-bold uppercase tracking-tighter text-slate-500">COM_NET: {status.internet ? 'Online' : 'Offline'}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <div className={`w-1.5 h-1.5 rounded-full ${status.database ? 'bg-emerald-500' : 'bg-rose-500'}`}></div>
                                <span className="text-[9px] font-bold uppercase tracking-tighter text-slate-500">DB_NODE: {status.database ? 'Ready' : 'Inaccessible'}</span>
                            </div>
                        </div>
                        <p className="text-[8px] text-slate-400 text-center uppercase tracking-tighter leading-tight font-medium">
                            Central Bureau Cyber Ops // Automated Forensic Audit Active
                        </p>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export default Login;
