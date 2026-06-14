import React, { createContext, useContext, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

const ToastContext = createContext();

export const ToastProvider = ({ children }) => {
    const [toasts, setToasts] = useState([]);

    const removeToast = useCallback((id) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    }, []);

    const showToast = useCallback((message, type = 'info', title = '', duration = 4000) => {
        const id = Math.random().toString(36).substring(2, 9);
        const newToast = { id, message, type, title, duration };
        setToasts((prev) => [...prev, newToast]);

        if (duration > 0) {
            setTimeout(() => {
                removeToast(id);
            }, duration);
        }
    }, [removeToast]);

    const toast = {
        success: (message, title = 'Sync Successful', duration = 4000) => showToast(message, 'success', title, duration),
        error: (message, title = 'Protocol Error', duration = 4000) => showToast(message, 'error', title, duration),
        info: (message, title = 'Intelligence Report', duration = 4000) => showToast(message, 'info', title, duration),
    };

    return (
        <ToastContext.Provider value={{ toast }}>
            {children}
            <div className="fixed bottom-10 right-10 z-[9999] flex flex-col gap-4 max-w-md w-full pointer-events-none">
                <AnimatePresence>
                    {toasts.map((t) => {
                        const isSuccess = t.type === 'success';
                        const isError = t.type === 'error';
                        
                        let bgClass = "bg-slate-900 border border-slate-800 text-white border-l-8 border-blue-500 shadow-2xl";
                        let icon = <Info size={24} className="text-blue-500" />;
                        
                        if (isSuccess) {
                            bgClass = "bg-emerald-600 border border-emerald-500 text-white border-l-8 border-emerald-400 shadow-2xl shadow-emerald-900/10";
                            icon = <CheckCircle2 size={24} className="text-white flex-shrink-0" />;
                        } else if (isError) {
                            bgClass = "bg-rose-600 border border-rose-500 text-white border-l-8 border-rose-400 shadow-2xl shadow-rose-900/10";
                            icon = <div className="w-6 h-6 rounded-full bg-rose-400 flex items-center justify-center font-black text-sm text-white flex-shrink-0">!</div>;
                        }

                        return (
                            <motion.div
                                key={t.id}
                                layout
                                initial={{ opacity: 0, y: 50, scale: 0.9 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.8, y: -20, transition: { duration: 0.2 } }}
                                className={`p-6 rounded-2xl flex items-center gap-4 pointer-events-auto relative overflow-hidden group ${bgClass}`}
                            >
                                {icon}
                                <div className="flex-1">
                                    {t.title && (
                                        <p className="font-black uppercase italic tracking-widest text-[10px] opacity-80 mb-0.5">{t.title}</p>
                                    )}
                                    <p className="font-bold text-sm leading-snug">{t.message}</p>
                                </div>
                                <button 
                                    onClick={() => removeToast(t.id)} 
                                    className="p-1 hover:bg-white/10 rounded-lg text-white/50 hover:text-white transition-all flex-shrink-0"
                                >
                                    <X size={16} />
                                </button>
                            </motion.div>
                        );
                    })}
                </AnimatePresence>
            </div>
        </ToastContext.Provider>
    );
};

export const useToast = () => {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return context;
};
