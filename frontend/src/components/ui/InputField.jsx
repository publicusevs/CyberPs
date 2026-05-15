import React from 'react';
import { twMerge } from 'tailwind-merge';

export const InputField = ({ label, icon: Icon, error, labelClassName, className, ...props }) => {
    return (
        <div className="space-y-1.5 w-full">
            {label && (
                <label className={twMerge("text-[10px] font-black text-slate-400 tracking-widest uppercase ml-1", labelClassName)}>
                    {label}
                </label>
            )}
            <div className="relative group">
                {Icon && (
                    <Icon 
                        className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors" 
                        size={18} 
                    />
                )}
                <input
                    {...props}
                    className={twMerge(
                        "w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-4 outline-none transition-all",
                        "focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/5",
                        "placeholder:text-slate-300 text-sm font-medium text-slate-900 font-body",
                        Icon && "pl-11",
                        error && "border-rose-500/50 focus:border-rose-500 focus:ring-rose-500/5",
                        className
                    )}
                />
            </div>
            {error && <p className="text-[10px] text-rose-500 font-bold ml-1 uppercase">{error}</p>}
        </div>
    );
};

export const SelectField = ({ label, icon: Icon, options = [], error, labelClassName, className, ...props }) => {
    return (
        <div className="space-y-1.5 w-full">
            {label && (
                <label className={twMerge("text-[10px] font-black text-slate-400 tracking-widest uppercase ml-1", labelClassName)}>
                    {label}
                </label>
            )}
            <div className="relative group">
                {Icon && (
                    <Icon 
                        className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors pointer-events-none" 
                        size={18} 
                    />
                )}
                <select
                    {...props}
                    className={twMerge(
                        "w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-4 outline-none transition-all appearance-none font-body",
                        "focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/5",
                        "text-sm font-medium text-slate-900",
                        Icon && "pl-11",
                        error && "border-rose-500/50 focus:border-rose-500",
                        className
                    )}
                >
                    {props.placeholder && <option value="" disabled>{props.placeholder}</option>}
                    {options.map((opt, idx) => (
                        <option key={idx} value={opt.value}>{opt.label}</option>
                    ))}
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                </div>
            </div>
            {error && <p className="text-[10px] text-rose-500 font-bold ml-1 uppercase">{error}</p>}
        </div>
    );
};
