import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './routes/ProtectedRoute';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import CaseForm from './pages/CaseForm';
import CaseList from './pages/CaseList';
import CaseDetails from './pages/CaseDetails';
import LetterPreview from './pages/LetterPreview';
import FileManager from './pages/FileManager';
import PoliceStationRegistration from './pages/admin/PoliceStationRegistration';
import ProfileModal from './components/ProfileModal';
import CaseNotices from './pages/CaseNotices';
import NoticeConfigForm from './pages/NoticeConfigForm';
import NoticeEditor from './pages/NoticeEditor';
import TemplatesConfig from './pages/TemplatesConfig';
import GlobalVariables from './pages/GlobalVariables';
import GenerateLetter from './pages/GenerateLetter';
import MoneyTrailStandalone, { CaseMoneyTrail } from './pages/MoneyTrailAnalyzer';
import {
    LayoutDashboard,
    Briefcase,
    Search,
    Bell,
    LogOut,
    Settings,
    ShieldCheck,
    Menu,
    ChevronRight,
    ChevronLeft,
    Search as SearchIcon,
    X,
    FileText,
    Upload,
    BarChart3,
    Settings2,
    Network,
    Database
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Defined early to avoid hosting issues
const Badge = ({ children, className }) => (
    <span className={`px-2 py-0.5 rounded-md text-[9px] font-black bg-blue-50 text-blue-600 border border-blue-100 uppercase tracking-tighter italic ${className}`}>
        {children}
    </span>
);

const SidebarLink = ({ to, icon: Icon, label, active, collapsed, onClick }) => (
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

const Layout = ({ children }) => {
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
                        <div className="whitespace-nowrap overflow-hidden">
                            <span className="text-2xl font-black italic tracking-tighter text-slate-900 uppercase">Investigation <span className="text-blue-600">Hunter</span></span>
                            <p className="text-[8px] font-bold text-slate-400 tracking-[0.4em] uppercase -mt-1 ml-0.5">Tactical Terminal</p>
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
                    
                    {user?.role === 'Admin' && (
                        <>
                            {(!collapsed || mobileOpen) && <div className="text-[9px] font-black text-slate-400 px-4 mt-6 mb-3 tracking-[0.3em] uppercase opacity-70">Administration</div>}
                            <SidebarLink to="/templates-config" icon={Settings2} label="Templates Config" active={location.pathname === '/templates-config'} collapsed={collapsed && !mobileOpen} />
                            <SidebarLink to="/generate-letter" icon={FileText} label="Generate Letter" active={location.pathname === '/generate-letter'} collapsed={collapsed && !mobileOpen} />
                            <SidebarLink to="/admin/police-stations" icon={ShieldCheck} label="Unit Registry" active={location.pathname === '/admin/police-stations'} collapsed={collapsed && !mobileOpen} />
                            <SidebarLink to="/global-variables" icon={Database} label="Protocol Registry" active={location.pathname === '/global-variables'} collapsed={collapsed && !mobileOpen} />
                        </>
                    )}

                    <div className="pt-6 border-t border-slate-100 space-y-3">
                        <SidebarLink to="/settings" icon={Settings} label="Protocols" active={location.pathname === '/settings'} collapsed={collapsed && !mobileOpen} />
                        {(!collapsed || mobileOpen) && <p className="text-[8px] text-center text-slate-300 font-bold tracking-widest uppercase mt-4 italic">v2.4.0 secure_node</p>}
                    </div>
                </nav>
            </aside>

            {/* Main Content Area */}
            <main className={`flex-1 flex flex-col min-w-0 z-10 transition-all duration-500 ease-in-out
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

function App() {
    return (
        <AuthProvider>
            <BrowserRouter>
                <Layout>
                    <Routes>
                        <Route path="/login" element={<Login />} />
                        <Route element={<ProtectedRoute />}>
                            <Route path="/" element={<Dashboard />} />
                            <Route path="/cases" element={<CaseList />} />
                            <Route path="/cases/new" element={<CaseForm />} />
                            <Route path="/cases/edit/:id" element={<CaseForm />} />
                            <Route path="/cases/:id" element={<CaseDetails />} />
                            <Route path="/cases/:id/process" element={<LetterPreview />} />
                            <Route path="/cases/:id/files" element={<FileManager />} />
                            <Route path="/cases/:id/notices" element={<CaseNotices />} />
                            <Route path="/cases/:id/notices/config" element={<NoticeConfigForm />} />
                            <Route path="/cases/:id/notices/editor" element={<NoticeEditor />} />
                            <Route path="/templates-config" element={<TemplatesConfig />} />
                            <Route path="/global-variables" element={<GlobalVariables />} />
                            <Route path="/generate-letter" element={<GenerateLetter />} />
                            <Route path="/reports" element={<div className="p-20 text-center font-black uppercase text-slate-400 italic">Reports Module Coming Soon</div>} />
                            <Route path="/admin/police-stations" element={<PoliceStationRegistration />} />
                            <Route path="/cases/:id/trail" element={<CaseMoneyTrail />} />
                            <Route path="/trail" element={<MoneyTrailStandalone />} />
                        </Route>
                    </Routes>
                </Layout>
            </BrowserRouter>
        </AuthProvider>
    )
}

export default App;
