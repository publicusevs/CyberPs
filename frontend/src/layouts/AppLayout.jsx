/**
 * AppLayout.jsx — Main application shell (sidebar + navbar + content area).
 * Extracted from App.jsx (was inline Layout component).
 * Logic is IDENTICAL — no changes to behavior or routing logic.
 */

import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { AnimatePresence, motion } from 'framer-motion';
import {
    LayoutDashboard, Briefcase, Search, ShieldCheck, Settings,
    Settings2, FileText, Network, Database,
    Scan, Mail
} from 'lucide-react';
import { SidebarLink } from './SidebarLink';
import Navbar from './Navbar';
import ProfileModal from '../components/ProfileModal';

const AppLayout = ({ children }) => {
    const { user } = useAuth();
    const location = useLocation();
    const [collapsed, setCollapsed] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);
    const [showProfile, setShowProfile] = useState(false);

    // Close mobile menu on path change
    useEffect(() => {
        setMobileOpen(false);
    }, [location.pathname]);

    if (location.pathname === '/login') return children;
    if (location.pathname === '/trail' || location.pathname.endsWith('/trail')) return children;
    if (/\/cases\/\d+\/trail/.test(location.pathname)) return children;

    const toggleSidebar = () => {
        if (window.innerWidth < 1024) {
            setMobileOpen(!mobileOpen);
        } else {
            setCollapsed(!collapsed);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 flex selection:bg-blue-600 selection:text-white">
            {/* Mobile Backdrop */}
            <AnimatePresence>
                {mobileOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setMobileOpen(false)}
                        className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[80] lg:hidden"
                    />
                )}
            </AnimatePresence>

            {/* Global Background Particles */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden z-0 opacity-40">
                <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/5 blur-[120px] rounded-full"></div>
                <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-500/5 blur-[120px] rounded-full"></div>
            </div>

            {/* Unified Sidebar Container */}
            <aside
                className={`border-r border-slate-200 bg-white flex flex-col p-6 fixed h-full z-[100] transition-all duration-500 ease-in-out shadow-2xl lg:shadow-none
                ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
                ${collapsed ? 'lg:w-[96px]' : 'lg:w-[288px]'} w-[280px]`}
            >
                <div className={`flex items-center gap-4 py-8 mb-10 border-b border-slate-100 overflow-hidden ${collapsed ? 'lg:justify-center' : ''}`}>
                    <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-200 flex-shrink-0">
                        <ShieldCheck size={22} className="text-white" />
                    </div>
                    {(!collapsed || mobileOpen) && (
                        <div className="flex flex-col whitespace-nowrap overflow-hidden">
                            <span className="text-[17px] font-black text-slate-900 tracking-tighter uppercase leading-none italic">
                                Investigation <span className="text-blue-600">Hunter</span>
                            </span>
                            <span className="text-[8px] font-bold text-slate-400 tracking-[0.4em] uppercase mt-1.5 ml-0.5">Tactical Command OS</span>
                        </div>
                    )}
                    {mobileOpen && (
                        <button onClick={() => setMobileOpen(false)} className="ml-auto lg:hidden p-2 text-slate-400 hover:text-rose-500">
                            <X size={20} />
                        </button>
                    )}
                </div>

                <nav className="flex-1 space-y-3 overflow-y-auto no-scrollbar">
                    {(!collapsed || mobileOpen) && <div className="text-[9px] font-black text-slate-400 px-4 mb-3 tracking-[0.3em] uppercase opacity-70">Intelligence Hub</div>}
                    <SidebarLink to="/" icon={LayoutDashboard} label="Command Deck" active={location.pathname === '/'} collapsed={collapsed && !mobileOpen} />
                    <SidebarLink to="/cases" icon={Briefcase} label="Evidence Vault" active={location.pathname.startsWith('/cases') && !location.pathname.includes('/trail')} collapsed={collapsed && !mobileOpen} />
                    <SidebarLink to="/search" icon={Search} label="Global Intel" active={location.pathname === '/search'} collapsed={collapsed && !mobileOpen} />
                    <SidebarLink to="/trail" icon={Network} label="Trail Analyzer" active={location.pathname === '/trail'} collapsed={collapsed && !mobileOpen} />
                    <SidebarLink to="/fir-read" icon={Scan} label="FIR Read" active={location.pathname === '/fir-read'} collapsed={collapsed && !mobileOpen} />

                    {user?.role === 'Admin' && (
                        <>
                            {(!collapsed || mobileOpen) && <div className="text-[9px] font-black text-slate-400 px-4 mt-6 mb-3 tracking-[0.3em] uppercase opacity-70">Administration</div>}
                            <SidebarLink to="/templates-config" icon={Settings2} label="Templates Config" active={location.pathname === '/templates-config'} collapsed={collapsed && !mobileOpen} />
                            <SidebarLink to="/generate-letter" icon={FileText} label="Generate Letter" active={location.pathname === '/generate-letter'} collapsed={collapsed && !mobileOpen} />
                            <SidebarLink to="/admin/police-stations" icon={ShieldCheck} label="Unit Registry" active={location.pathname === '/admin/police-stations'} collapsed={collapsed && !mobileOpen} />
                            <SidebarLink to="/global-variables" icon={Database} label="Protocol Registry" active={location.pathname === '/global-variables'} collapsed={collapsed && !mobileOpen} />
                            <SidebarLink to="/settings/mail" icon={Mail} label="Mail Settings" active={location.pathname === '/settings/mail'} collapsed={collapsed && !mobileOpen} />
                        </>
                    )}

                    <div className="pt-6 border-t border-slate-100 space-y-3">
                        <SidebarLink to="/settings" icon={Settings} label="Protocols" active={location.pathname === '/settings'} collapsed={collapsed && !mobileOpen} />
                        {(!collapsed || mobileOpen) && <p className="text-[8px] text-center text-slate-300 font-bold tracking-widest uppercase mt-4 italic">v2.4.0 secure_node</p>}
                    </div>
                </nav>
            </aside>

            {/* Main Content Area */}
            <main className={`flex-1 flex flex-col min-w-0 transition-all duration-500 ease-in-out
                ${collapsed ? 'lg:ml-[96px]' : 'lg:ml-[288px]'} ml-0`}>
                <Navbar onToggleSidebar={toggleSidebar} onProfileClick={() => setShowProfile(true)} isSidebarCollapsed={collapsed} />
                <ProfileModal isOpen={showProfile} onClose={() => setShowProfile(false)} />
                <div className="p-4 md:p-8 lg:p-12 xl:p-16 max-w-[1700px] mx-auto w-full">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={location.pathname}
                            initial={{ opacity: 0, scale: 0.99 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.99 }}
                            transition={{ duration: 0.25 }}
                        >
                            {children}
                        </motion.div>
                    </AnimatePresence>
                </div>
            </main>
        </div>
    );
};

export default AppLayout;
