/**
 * Sidebar.jsx — Application navigation sidebar.
 * Extracted from App.jsx (was inline in the Layout component).
 * Logic is IDENTICAL — no changes to behavior.
 */

import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

// SidebarLink is kept here as it's a Sidebar-only primitive
export const SidebarLink = ({ to, icon: Icon, label, active, collapsed, onClick }) => (
    <Link
        to={to}
        onClick={onClick}
        title={collapsed ? label : ''}
        className={`flex items-center px-5 py-4 rounded-2xl transition-all duration-300 group ${active
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-100 border border-blue-500'
                : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900 border border-transparent'
            } ${collapsed ? 'justify-center px-0' : 'justify-between'}`}
    >
        <div className="flex items-center gap-4">
            <Icon size={20} className={`transition-transform duration-300 ${active ? 'scale-110' : 'group-hover:scale-110 text-blue-600'}`} />
            {!collapsed && (
                <span className={`font-black text-[10px] tracking-widest uppercase italic transition-all ${active ? 'translate-x-1' : 'group-hover:translate-x-1'}`}>{label}</span>
            )}
        </div>
        {!collapsed && active && <ChevronRight size={14} className="opacity-50" />}
    </Link>
);
