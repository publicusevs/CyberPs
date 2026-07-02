import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
    RefreshCw, CheckCircle, Download, Clock, Shield,
    ToggleLeft, ToggleRight, AlertCircle, Loader2
} from 'lucide-react';
import {
    getUpdateSettings, saveUpdateSettings,
    getSkippedVersion, setSkippedVersion,
    getLastChecked, getInstalledVersion, checkForUpdates, formatDate
} from '../services/updateService';
import UpdateDialog from '../components/UpdateDialog';

/**
 * UpdateSettings.jsx — /settings/updates
 * Settings page for update preferences + manual check.
 */
const UpdateSettings = () => {
    const [settings, setSettings] = useState(getUpdateSettings());
    const [version, setVersion] = useState('—');
    const [lastChecked, setLastChecked] = useState(getLastChecked());
    const [skippedVersion, setSkippedVersionState] = useState(getSkippedVersion());
    const [checking, setChecking] = useState(false);
    const [checkResult, setCheckResult] = useState(null); // null | 'uptodate' | 'available' | 'error'
    const [updateInfo, setUpdateInfo] = useState(null);
    const [showDialog, setShowDialog] = useState(false);

    useEffect(() => {
        getInstalledVersion().then(v => { if (v) setVersion(v); });
    }, []);

    const handleToggle = useCallback((key) => {
        const updated = { ...settings, [key]: !settings[key] };
        setSettings(updated);
        saveUpdateSettings(updated);
    }, [settings]);

    const handleCheckNow = useCallback(async () => {
        setChecking(true);
        setCheckResult(null);

        const result = await checkForUpdates();
        setLastChecked(new Date().toISOString());

        if (!result) {
            setCheckResult('error');
        } else if (!result.hasUpdate) {
            setCheckResult('uptodate');
        } else {
            setCheckResult('available');
            setUpdateInfo(result);
        }

        setChecking(false);
    }, []);

    const handleClearSkipped = useCallback(() => {
        setSkippedVersion(null);
        setSkippedVersionState(null);
    }, []);

    const handleUpdateDialogClose = useCallback(() => {
        setShowDialog(false);
    }, []);

    const statusMap = {
        uptodate: { icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-100', text: 'You are up to date!' },
        available: { icon: Download, color: 'text-blue-600', bg: 'bg-blue-50 border-blue-100', text: 'Update available! Click "View Update" to install.' },
        error: { icon: AlertCircle, color: 'text-amber-600', bg: 'bg-amber-50 border-amber-100', text: 'Could not connect to update server. Check your internet connection.' },
    };

    const status = checkResult ? statusMap[checkResult] : null;
    const StatusIcon = status?.icon;

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            {/* Page Header */}
            <motion.div
                initial={{ opacity: 0, y: -12 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-4"
            >
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-200">
                    <Shield size={22} className="text-white" />
                </div>
                <div>
                    <h1 className="text-2xl font-black text-slate-900 tracking-tight">Software Updates</h1>
                    <p className="text-slate-500 text-sm">Keep CyberPS up to date with the latest features and fixes</p>
                </div>
            </motion.div>

            {/* Current Version Card */}
            <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 }}
                className="bg-white rounded-2xl border border-slate-200 overflow-hidden"
            >
                <div className="bg-gradient-to-r from-slate-50 to-blue-50 px-6 py-4 border-b border-slate-100">
                    <h2 className="font-bold text-slate-800 text-sm uppercase tracking-wider">Current Installation</h2>
                </div>
                <div className="px-6 py-5 grid grid-cols-2 gap-6">
                    <div>
                        <div className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1.5">Installed Version</div>
                        <div className="text-2xl font-black text-slate-900 font-mono">v{version}</div>
                    </div>
                    <div>
                        <div className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1.5">Last Checked</div>
                        <div className="text-sm font-semibold text-slate-700">
                            {lastChecked ? formatDate(lastChecked) : 'Never'}
                        </div>
                        {lastChecked && (
                            <div className="text-xs text-slate-400 mt-0.5">
                                {new Date(lastChecked).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                            </div>
                        )}
                    </div>
                    {skippedVersion && (
                        <div className="col-span-2 flex items-center justify-between bg-amber-50 border border-amber-100 rounded-xl px-4 py-3">
                            <div>
                                <div className="text-xs font-medium text-amber-700 uppercase tracking-wide">Skipped Version</div>
                                <div className="text-sm font-bold text-amber-900 font-mono">v{skippedVersion}</div>
                            </div>
                            <button
                                onClick={handleClearSkipped}
                                className="text-xs text-amber-600 hover:text-amber-800 font-medium underline underline-offset-2"
                            >
                                Clear
                            </button>
                        </div>
                    )}
                </div>
            </motion.div>

            {/* Check Now Button + Status */}
            <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-white rounded-2xl border border-slate-200 px-6 py-5 space-y-4"
            >
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="font-bold text-slate-800">Check for Updates</h3>
                        <p className="text-sm text-slate-500 mt-0.5">Manually check GitHub for a newer version</p>
                    </div>
                    <button
                        onClick={handleCheckNow}
                        disabled={checking}
                        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors shadow-md shadow-blue-200"
                    >
                        {checking ? (
                            <><Loader2 size={15} className="animate-spin" />Checking…</>
                        ) : (
                            <><RefreshCw size={15} />Check Now</>
                        )}
                    </button>
                </div>

                {/* Status message */}
                {status && (
                    <motion.div
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`flex items-center justify-between gap-3 border rounded-xl px-4 py-3 ${status.bg}`}
                    >
                        <div className="flex items-center gap-3">
                            <StatusIcon size={18} className={`${status.color} flex-shrink-0`} />
                            <span className={`text-sm font-medium ${status.color}`}>{status.text}</span>
                        </div>
                        {checkResult === 'available' && (
                            <button
                                onClick={() => setShowDialog(true)}
                                className="text-sm font-bold text-blue-600 hover:text-blue-800 underline underline-offset-2 flex-shrink-0"
                            >
                                View Update
                            </button>
                        )}
                    </motion.div>
                )}
            </motion.div>

            {/* Settings Toggles */}
            <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="bg-white rounded-2xl border border-slate-200 overflow-hidden divide-y divide-slate-100"
            >
                <div className="px-6 py-4 border-b border-slate-100 bg-slate-50">
                    <h2 className="font-bold text-slate-800 text-sm uppercase tracking-wider">Preferences</h2>
                </div>

                {[
                    {
                        key: 'autoCheck',
                        title: 'Automatically check for updates',
                        desc: 'Check GitHub for new versions silently when the app starts',
                    },
                    {
                        key: 'notifyBeforeInstall',
                        title: 'Ask before installing',
                        desc: 'Show a confirmation dialog before starting installation',
                    },
                ].map(({ key, title, desc }) => (
                    <div key={key} className="flex items-center justify-between px-6 py-4 hover:bg-slate-50 transition-colors cursor-pointer" onClick={() => handleToggle(key)}>
                        <div>
                            <div className="font-semibold text-slate-800 text-sm">{title}</div>
                            <div className="text-slate-500 text-xs mt-0.5">{desc}</div>
                        </div>
                        <div className={`transition-colors ${settings[key] ? 'text-blue-600' : 'text-slate-300'}`}>
                            {settings[key] ? <ToggleRight size={32} /> : <ToggleLeft size={32} />}
                        </div>
                    </div>
                ))}
            </motion.div>

            {/* Info note */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="flex items-start gap-3 text-sm text-slate-400 px-1"
            >
                <Clock size={14} className="mt-0.5 flex-shrink-0" />
                <p>Updates are fetched from the official GitHub repository. An internet connection is required. If unavailable, the app continues normally.</p>
            </motion.div>

            {/* Update dialog */}
            {showDialog && updateInfo && (
                <UpdateDialog
                    updateInfo={updateInfo}
                    onClose={handleUpdateDialogClose}
                    onSkip={handleUpdateDialogClose}
                />
            )}
        </div>
    );
};

export default UpdateSettings;
