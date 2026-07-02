/**
 * App.jsx — Application root: providers + routing only.
 * Layout (Sidebar, Navbar) lives in src/layouts/AppLayout.jsx
 */

import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import ProtectedRoute from './routes/ProtectedRoute';
import AppLayout from './layouts/AppLayout';

// Pages
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import CaseForm from './pages/CaseForm';
import CaseList from './pages/CaseList';
import CaseDetails from './pages/CaseDetails';
import LetterPreview from './pages/LetterPreview';
import FileManager from './pages/FileManager';
import FIRReader from './pages/FIRReader';
import PoliceStationRegistration from './pages/admin/PoliceStationRegistration';
import CaseNotices from './pages/CaseNotices';
import NoticeConfigForm from './pages/NoticeConfigForm';
import NoticeEditor from './pages/NoticeEditor';
import TemplatesConfig from './pages/TemplatesConfig';
import GlobalVariables from './pages/GlobalVariables';
import GenerateLetter from './pages/GenerateLetter';
import MoneyTrailStandalone, { CaseMoneyTrail } from './pages/MoneyTrailAnalyzer';
import EmailTest from './pages/EmailTest';
import MailSettings from './pages/MailSettings';
import UpdateSettings from './pages/UpdateSettings';
import UpdateDialog from './components/UpdateDialog';
import { checkForUpdates, getUpdateSettings, getSkippedVersion } from './services/updateService';
import { Navigate } from 'react-router-dom';

function App() {
    const [updateInfo, setUpdateInfo] = useState(null);

    // Silent background update check — fires once on mount, after 3s delay
    useEffect(() => {
        const settings = getUpdateSettings();
        if (!settings.autoCheck) return;

        const timer = setTimeout(async () => {
            try {
                const result = await checkForUpdates();
                if (!result?.hasUpdate) return;
                const skipped = getSkippedVersion();
                if (skipped && skipped === result.manifest?.version) return;
                setUpdateInfo(result);
            } catch { /* silent — never block app */ }
        }, 3000);

        return () => clearTimeout(timer);
    }, []);
    return (
        <AuthProvider>
            <ToastProvider>
                <BrowserRouter>
                    <AppLayout>
                        <Routes>
                            <Route path="/login" element={<Login />} />
                            <Route element={<ProtectedRoute />}>
                                <Route path="/" element={<Dashboard />} />
                                <Route path="/cases" element={<CaseList />} />
                                <Route path="/search" element={<Navigate to="/cases" replace />} />
                                <Route path="/cases/new" element={<CaseForm />} />
                                <Route path="/cases/edit/:id" element={<CaseForm />} />
                                <Route path="/cases/:id" element={<CaseDetails />} />
                                <Route path="/cases/:id/process" element={<LetterPreview />} />
                                <Route path="/cases/:id/files" element={<FileManager />} />
                                <Route path="/fir-read" element={<FIRReader />} />
                                <Route path="/cases/:id/notices" element={<CaseNotices />} />
                                <Route path="/cases/:id/notices/config" element={<NoticeConfigForm />} />
                                <Route path="/cases/:id/notices/editor" element={<NoticeEditor />} />
                                <Route path="/templates-config" element={<TemplatesConfig />} />
                                <Route path="/global-variables" element={<GlobalVariables />} />
                                <Route path="/settings/mail" element={<MailSettings />} />
                                <Route path="/generate-letter" element={<GenerateLetter />} />
                                <Route path="/reports" element={<div className="p-20 text-center font-black uppercase text-slate-400 italic">Reports Module Coming Soon</div>} />
                                <Route path="/admin/police-stations" element={<PoliceStationRegistration />} />
                                <Route path="/cases/:id/trail" element={<CaseMoneyTrail />} />
                                <Route path="/trail" element={<MoneyTrailStandalone />} />
                                <Route path="/email-test" element={<EmailTest />} />
                                <Route path="/settings/updates" element={<UpdateSettings />} />
                            </Route>
                        </Routes>
                    </AppLayout>
                </BrowserRouter>
            </ToastProvider>
            {/* Global update dialog — rendered outside router so it's always available */}
            {updateInfo && (
                <UpdateDialog
                    updateInfo={updateInfo}
                    onClose={() => setUpdateInfo(null)}
                    onSkip={() => setUpdateInfo(null)}
                />
            )}
        </AuthProvider>
    );
}

export default App;
