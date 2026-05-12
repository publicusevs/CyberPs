/**
 * Navbar.jsx — Top application navigation bar.
 * Extracted from App.jsx (was inline Navbar component).
 * Logic is IDENTICAL — no changes to behavior.
 */

import React from 'react';
import { Bell, LogOut, Menu, Search as SearchIcon } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Badge = ({ children, className }) => (
    <span className={`px-2 py-0.5 rounded-md text-[9px] font-black bg-blue-50 text-blue-600 border border-blue-100 uppercase tracking-tighter italic ${className}`}>
        {children}
    </span>
);

const Navbar = ({ onToggleSidebar, onProfileClick, isSidebarCollapsed }) => {
    const { logout, user } = useAuth();
    return (
        <header className="h-20 border-b border-slate-200 bg-white/80 backdrop-blur-2xl flex items-center justify-between px-6 md:px-10 sticky top-0 z-[60]">
            <div className="flex items-center gap-4 md:gap-6">
                <button onClick={onToggleSidebar} className="p-3 bg-slate-50 border border-slate-200 rounded-xl hover:bg-white hover:text-blue-600 transition-all text-slate-400">
                    <Menu size={20} />
                </button>
                <div className="hidden lg:flex items-center gap-3 bg-slate-50 px-4 py-2.5 rounded-xl border border-slate-200 group focus-within:border-blue-500/50 transition-all">
                    <SearchIcon size={16} className="text-slate-400 group-focus-within:text-blue-600" />
                    <input type="text" placeholder="GLOBAL_DATA_SEARCH..." className="bg-transparent outline-none text-[10px] font-bold tracking-widest text-slate-900 placeholder:text-slate-400 w-48 xl:w-64" />
                </div>
            </div>

            <div className="flex items-center gap-4 md:gap-8">
                <div className="relative group cursor-pointer p-2.5 bg-slate-50 rounded-xl border border-slate-200 hover:border-blue-500 transition-all hidden sm:block">
                    <div className="absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full shadow-lg shadow-rose-200"></div>
                    <Bell size={20} className="text-slate-500 group-hover:text-blue-600 transition-colors" />
                </div>

                <div className="h-10 w-px bg-slate-200 hidden sm:block"></div>

                <div className="flex items-center gap-3 md:gap-4">
                    <div className="text-right hidden sm:block">
                        <p className="text-[10px] font-black text-slate-900 uppercase tracking-tighter mb-0.5 italic">{user?.name}</p>
                        <Badge className="text-[8px] px-1.5 py-0 font-black">UNIT: {user?.role}</Badge>
                    </div>
                    <div
                        onClick={onProfileClick}
                        className="w-10 h-10 md:w-11 md:h-11 bg-white rounded-full border-2 border-slate-100 flex items-center justify-center font-black text-blue-600 shadow-sm text-sm cursor-pointer hover:border-blue-500 transition-all"
                    >
                        {user?.name?.[0]}
                    </div>
                    <button onClick={logout} className="p-3 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-100 rounded-xl transition-all group">
                        <LogOut size={20} className="group-hover:-translate-x-1 transition-transform" />
                    </button>
                </div>
            </div>
        </header>
    );
};

export default Navbar;
