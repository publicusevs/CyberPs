import React from 'react';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { twMerge } from 'tailwind-merge';

export const Button = ({ children, variant = "primary", loading, icon: Icon, className, ...props }) => {
    const variants = {
        primary: "bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-200/50 border border-blue-500",
        secondary: "bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-200/50 border border-emerald-500",
        outline: "bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-700 hover:text-slate-900 shadow-sm",
        danger: "bg-rose-50 border border-rose-100 text-rose-600 hover:bg-rose-600 hover:text-white",
        ghost: "bg-transparent text-slate-400 hover:text-slate-900 hover:bg-slate-50"
    };

    return (
        <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            disabled={loading || props.disabled}
            className={twMerge(
                "px-5 py-2.5 rounded-xl font-black text-[11px] uppercase tracking-widest flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed",
                variants[variant],
                className
            )}
            {...props}
        >
            {loading ? (
                <Loader2 size={18} className="animate-spin" />
            ) : (
                <>
                    {Icon && <Icon size={18} className="transition-transform group-hover:scale-110" />}
                    {children}
                </>
            )}
        </motion.button>
    );
};
