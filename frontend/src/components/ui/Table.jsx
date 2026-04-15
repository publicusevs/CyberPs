import React from 'react';
import { twMerge } from 'tailwind-merge';

export const Badge = ({ children, variant = "default", className }) => {
    const variants = {
        default: "bg-cyber-primary/10 border-cyber-primary/30 text-cyber-primary",
        success: "bg-emerald-500/10 border-emerald-500/30 text-emerald-500",
        warning: "bg-amber-500/10 border-amber-500/30 text-amber-500",
        danger: "bg-rose-500/10 border-rose-500/30 text-rose-500",
        muted: "bg-cyber-muted/10 border-cyber-muted/30 text-cyber-muted"
    };

    return (
        <span className={twMerge(
            "px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider",
            variants[variant],
            className
        )}>
            {children}
        </span>
    );
};

export const Table = ({ headers, children, className }) => {
    return (
        <div className={twMerge("overflow-x-auto", className)}>
            <table className="w-full text-left">
                <thead className="bg-white/[0.02] border-b border-cyber-border/30 text-cyber-muted text-[10px] uppercase font-bold tracking-widest">
                    <tr>
                        {headers.map((h, i) => (
                            <th key={i} className="py-4 px-6">{h}</th>
                        ))}
                    </tr>
                </thead>
                <tbody className="divide-y divide-cyber-border/20">
                    {children}
                </tbody>
            </table>
        </div>
    );
};

export const TableRow = ({ children, className, onClick }) => (
    <tr 
        onClick={onClick}
        className={twMerge(
            "hover:bg-white/[0.03] transition-colors group",
            onClick && "cursor-pointer",
            className
        )}
    >
        {children}
    </tr>
);

export const TableCell = ({ children, className }) => (
    <td className={twMerge("py-5 px-6 text-sm", className)}>
        {children}
    </td>
);
