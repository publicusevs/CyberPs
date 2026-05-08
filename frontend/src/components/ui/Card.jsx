import React from 'react';
import { motion } from 'framer-motion';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export const Card = ({ children, className, animate = true }) => {
    const Component = animate ? motion.div : 'div';
    const animationProps = animate ? {
        initial: { opacity: 0, y: 20 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.4 }
    } : {};

    return (
        <Component
            {...animationProps}
            className={twMerge(
                "bg-cyber-card/60 backdrop-blur-xl border border-cyber-border/50 rounded-2xl shadow-2xl relative overflow-hidden",
                className
            )}
        >
            {children}
        </Component>
    );
};

export const CardHeader = ({ title, subtitle, icon: Icon, color = "blue" }) => (
    <div className="flex items-center gap-4 mb-6 border-b border-cyber-border/30 pb-4">
        {Icon && (
            <div className={clsx(
                "p-2.5 rounded-xl border",
                color === "blue" && "bg-blue-500/10 border-blue-500/20 text-blue-500",
                color === "green" && "bg-emerald-500/10 border-emerald-500/20 text-emerald-500",
                color === "red" && "bg-rose-500/10 border-rose-500/20 text-rose-500",
                color === "amber" && "bg-amber-500/10 border-amber-500/20 text-amber-500"
            )}>
                <Icon size={20} />
            </div>
        )}
        <div>
            <h3 className="text-lg font-bold text-white tracking-tight">{title}</h3>
            {subtitle && <p className="text-xs text-cyber-muted font-medium">{subtitle}</p>}
        </div>
    </div>
);
