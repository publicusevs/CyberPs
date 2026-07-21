import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    RefreshCw, CheckCircle, Download, Clock, Shield,
    ToggleLeft, ToggleRight, AlertCircle, Loader2,
    FileText, FolderOpen, RotateCcw, HelpCircle, X, ExternalLink
} from 'lucide-react';
import {
    getUpdateSettings, saveUpdateSettings,
    getSkippedVersion, setSkippedVersion,
    getLastChecked, getInstalledVersion, checkForUpdates, formatDate,
    startDownload, getDownloadProgress, installUpdate, formatBytes,
    openDownloadFolder, fetchUpdateLog
} from '../services/updateService';

/**
 * UpdateSettings.jsx — Premium Enterprise Update Command Deck
 */
const UpdateSettings = () => {
    const [settings, setSettings] = useState(getUpdateSettings());
    const [version, setVersion] = useState('—');
    const [lastChecked, setLastChecked] = useState(getLastChecked());
    const [checking, setChecking] = useState(false);
    const [checkResult, setCheckResult] = useState(null); // null | 'uptodate' | 'available' | 'error'
    const [updateInfo, setUpdateInfo] = useState(null);
    
    // Download and install state tracking
    const [downloadPhase, setDownloadPhase] = useState('idle'); // idle | downloading | ready | error
    const [downloadId, setDownloadId] = useState(null);
    const [downloadProgressVal, setDownloadProgressVal] = useState({ percent: 0, downloaded: 0, total: 0 });
    const [errorMessage, setErrorMessage] = useState('');
    const pollIntervalRef = useRef(null);

    // Logs viewer state
    const [viewingLog, setViewingLog] = useState(null); // null | 'installer' | 'updater'
    const [logContent, setLogContent] = useState('');
    const [loadingLog, setLoadingLog] = useState(false);

    useEffect(() => {
        getInstalledVersion().then(v => { if (v) setVersion(v); });
        return () => {
            if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
        };
    }, []);

    const handleToggle = useCallback((key) => {
        const updated = { ...settings, [key]: !settings[key] };
        setSettings(updated);
        saveUpdateSettings(updated);
    }, [settings]);

    const handleCheckNow = useCallback(async () => {
        setChecking(true);
        setCheckResult(null);
        setDownloadPhase('idle');
        setUpdateInfo(null);

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

    const handleDownload = useCallback(async () => {
        if (!updateInfo?.manifest) return;
        setDownloadPhase('downloading');
        setErrorMessage('');

        const dlId = await startDownload(updateInfo.manifest);
        if (!dlId) {
            setDownloadPhase('error');
            setErrorMessage('Failed to trigger background download. Check internet.');
            return;
        }
        setDownloadId(dlId);

        pollIntervalRef.current = setInterval(async () => {
            const prog = await getDownloadProgress(dlId);
            if (!prog) return;

            if (prog.status === 'downloading') {
                setDownloadProgressVal({ percent: prog.percent, downloaded: prog.downloaded, total: prog.total });
            } else if (prog.status === 'ready') {
                clearInterval(pollIntervalRef.current);
                setDownloadProgressVal({ percent: 100, downloaded: prog.total, total: prog.total });
                setDownloadPhase('ready');
            } else if (prog.status === 'error') {
                clearInterval(pollIntervalRef.current);
                setDownloadPhase('error');
                setErrorMessage(prog.error || 'Download interrupted.');
            }
        }, 1000);
    }, [updateInfo]);

    const handleInstall = useCallback(async () => {
        if (!downloadId) return;
        setDownloadPhase('installing');
        const res = await installUpdate(downloadId);
        if (!res?.success) {
            setDownloadPhase('error');
            setErrorMessage('Unable to initiate silent installer script.');
        }
    }, [downloadId]);

    const handleOpenFolder = useCallback(async () => {
        await openDownloadFolder();
    }, []);

    const handleOpenLog = useCallback(async (type) => {
        setViewingLog(type);
        setLoadingLog(true);
        setLogContent('Loading logs...');
        const content = await fetchUpdateLog(type);
        setLogContent(content);
        setLoadingLog(false);
    }, []);

    return (
        <div className="max-w-4xl mx-auto space-y-8 pb-16">
            {/* Page Header with logo */}
            <motion.div
                initial={{ opacity: 0, y: -12 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-5 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm"
            >
                <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-200">
                    <Shield size={32} className="text-white animate-pulse" />
                </div>
                <div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase italic leading-none">
                        CyberPS <span className="text-blue-600">Update Deck</span>
                    </h1>
                    <p className="text-slate-500 text-xs mt-1.5 uppercase font-bold tracking-widest">Enterprise Software Management & Integrity Console</p>
                </div>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Left side: Version Status Info & Actions */}
                <div className="md:col-span-2 space-y-6">
                    {/* Status Overview Card */}
                    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex justify-between items-center">
                            <h2 className="font-extrabold text-slate-800 text-xs uppercase tracking-wider">Status Console</h2>
                            <span className="text-[10px] bg-blue-50 text-blue-700 font-mono font-bold px-2 py-0.5 rounded-full uppercase">Stable Channel</span>
                        </div>
                        <div className="p-6 space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Current Version</div>
                                    <div className="text-2xl font-black text-slate-900 font-mono">v{version}</div>
                                    <div className="text-[9px] text-slate-400 mt-0.5">Build #0942-PROD</div>
                                </div>
                                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Latest Version</div>
                                    <div className="text-2xl font-black text-blue-600 font-mono">
                                        {updateInfo?.manifest?.version ? `v${updateInfo.manifest.version}` : 'v' + version}
                                    </div>
                                    <div className="text-[9px] text-slate-400 mt-0.5">
                                        {updateInfo?.manifest?.published_at ? `Published ${formatDate(updateInfo.manifest.published_at)}` : 'Up to date'}
                                    </div>
                                </div>
                            </div>

                            {/* Check Updates Manual Button */}
                            <div className="flex items-center justify-between pt-2">
                                <div className="text-xs text-slate-500">
                                    Last checked: <span className="font-bold text-slate-700">{lastChecked ? formatDate(lastChecked) : 'Never'}</span>
                                    {lastChecked && ` at ${new Date(lastChecked).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`}
                                </div>
                                <button
                                    onClick={handleCheckNow}
                                    disabled={checking}
                                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all shadow-md shadow-blue-100 uppercase"
                                >
                                    {checking ? (
                                        <><Loader2 size={13} className="animate-spin" />Checking…</>
                                    ) : (
                                        <><RefreshCw size={13} />Check For Updates</>
                                    )}
                                </button>
                            </div>

                            {/* Dynamic Check & Progress Console */}
                            <AnimatePresence mode="wait">
                                {checkResult === 'uptodate' && (
                                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3 bg-emerald-50 border border-emerald-100 text-emerald-800 rounded-2xl p-4">
                                        <CheckCircle size={18} className="text-emerald-600 flex-shrink-0" />
                                        <span className="text-xs font-semibold">Your workstation is running the latest secure system version. No updates needed.</span>
                                    </motion.div>
                                )}

                                {checkResult === 'error' && (
                                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3 bg-amber-50 border border-amber-100 text-amber-800 rounded-2xl p-4">
                                        <AlertCircle size={18} className="text-amber-600 flex-shrink-0" />
                                        <span className="text-xs font-semibold">GitHub update repository could not be contacted. Verify connection protocol.</span>
                                    </motion.div>
                                )}

                                {checkResult === 'available' && updateInfo && downloadPhase === 'idle' && (
                                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-blue-50 border border-blue-100 rounded-2xl p-5 space-y-4">
                                        <div className="flex items-start gap-3">
                                            <Download size={20} className="text-blue-600 flex-shrink-0 mt-0.5" />
                                            <div>
                                                <div className="font-extrabold text-blue-900 text-sm">System Update Available (v{updateInfo.manifest.version})</div>
                                                <div className="text-xs text-blue-700 mt-1">A newer distribution package is ready for download. File size: {formatBytes(updateInfo.manifest.file_size)}</div>
                                            </div>
                                        </div>
                                        <div className="flex gap-3 justify-end">
                                            {updateInfo.manifest.release_notes && (
                                                <a
                                                    href={`https://github.com/publicusevs/CyberPs/releases/tag/v${updateInfo.manifest.version}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 font-bold underline"
                                                >
                                                    Open Release Notes <ExternalLink size={12} />
                                                </a>
                                            )}
                                            <button
                                                onClick={handleDownload}
                                                className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 py-2 rounded-xl transition-all shadow-sm"
                                            >
                                                Download Update
                                            </button>
                                        </div>
                                    </motion.div>
                                )}

                                {downloadPhase === 'downloading' && (
                                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-3">
                                        <div className="flex justify-between text-xs font-bold text-slate-700">
                                            <span>Downloading distribution package…</span>
                                            <span>{downloadProgressVal.percent}%</span>
                                        </div>
                                        <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                                            <div className="h-full bg-blue-600 rounded-full transition-all duration-300" style={{ width: `${downloadProgressVal.percent}%` }}></div>
                                        </div>
                                        <div className="text-[10px] text-slate-400 flex justify-between">
                                            <span>{formatBytes(downloadProgressVal.downloaded)} / {formatBytes(downloadProgressVal.total)}</span>
                                            <span>Keep application active</span>
                                        </div>
                                    </motion.div>
                                )}

                                {downloadPhase === 'ready' && (
                                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-emerald-50 border border-emerald-100 rounded-2xl p-5 space-y-4">
                                        <div className="flex items-center gap-3">
                                            <CheckCircle size={20} className="text-emerald-600 flex-shrink-0" />
                                            <div>
                                                <div className="font-extrabold text-emerald-950 text-sm">Download Verified &amp; Ready</div>
                                                <div className="text-xs text-emerald-700 mt-0.5">Integrity check checksum matches. Install to apply changes.</div>
                                            </div>
                                        </div>
                                        <div className="flex justify-end gap-3">
                                            <button
                                                onClick={handleOpenFolder}
                                                className="flex items-center gap-1 text-xs text-slate-600 hover:text-slate-800 font-bold border border-slate-200 px-3.5 py-2 rounded-xl bg-white"
                                            >
                                                <FolderOpen size={13} /> Open Download Folder
                                            </button>
                                            <button
                                                onClick={handleInstall}
                                                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2 rounded-xl transition-all shadow-sm"
                                            >
                                                Install &amp; Restart
                                            </button>
                                        </div>
                                    </motion.div>
                                )}

                                {downloadPhase === 'installing' && (
                                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-indigo-50 border border-indigo-100 rounded-2xl p-5 text-center space-y-3">
                                        <Loader2 size={24} className="text-indigo-600 animate-spin mx-auto" />
                                        <div className="font-bold text-indigo-900 text-sm">Launching Installer Module…</div>
                                        <div className="text-xs text-indigo-700">CyberPS will shutdown momentarily. Updater process will silently replace source binaries. Do not close this terminal.</div>
                                    </motion.div>
                                )}

                                {downloadPhase === 'error' && (
                                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-rose-50 border border-rose-100 text-rose-800 rounded-2xl p-4 space-y-2">
                                        <div className="flex items-center gap-2">
                                            <AlertCircle size={18} className="text-rose-600 flex-shrink-0" />
                                            <span className="text-xs font-bold">Package Transfer Aborted</span>
                                        </div>
                                        <p className="text-xs text-rose-600">{errorMessage}</p>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>

                    {/* Release Notes Card */}
                    {updateInfo?.manifest?.release_notes && (
                        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                            <div className="bg-slate-50 px-6 py-4 border-b border-slate-100">
                                <h2 className="font-extrabold text-slate-800 text-xs uppercase tracking-wider">Release Notes</h2>
                            </div>
                            <div className="p-6">
                                <pre className="text-xs text-slate-600 font-mono whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                    {updateInfo.manifest.release_notes}
                                </pre>
                            </div>
                        </div>
                    )}
                </div>

                {/* Right side: Preferences & Diagnostics */}
                <div className="space-y-6">
                    {/* Auto Update Preferences */}
                    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="bg-slate-50 px-6 py-4 border-b border-slate-100">
                            <h2 className="font-extrabold text-slate-800 text-xs uppercase tracking-wider">Preferences</h2>
                        </div>
                        <div className="divide-y divide-slate-100">
                            <div className="p-4 flex items-center justify-between hover:bg-slate-50/50 cursor-pointer" onClick={() => handleToggle('autoCheck')}>
                                <div>
                                    <div className="text-xs font-bold text-slate-800">Auto check on boot</div>
                                    <div className="text-[10px] text-slate-400 mt-0.5">Check for updates silently at startup</div>
                                </div>
                                <div className={settings.autoCheck ? 'text-blue-600' : 'text-slate-300'}>
                                    {settings.autoCheck ? <ToggleRight size={26} /> : <ToggleLeft size={26} />}
                                </div>
                            </div>
                            <div className="p-4 flex items-center justify-between hover:bg-slate-50/50 cursor-pointer" onClick={() => handleToggle('notifyBeforeInstall')}>
                                <div>
                                    <div className="text-xs font-bold text-slate-800">Confirm before install</div>
                                    <div className="text-[10px] text-slate-400 mt-0.5">Prompt before closing app to install</div>
                                </div>
                                <div className={settings.notifyBeforeInstall ? 'text-blue-600' : 'text-slate-300'}>
                                    {settings.notifyBeforeInstall ? <ToggleRight size={26} /> : <ToggleLeft size={26} />}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Resiliency & Rollback Info Card */}
                    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden p-6 space-y-4">
                        <div className="flex items-center gap-2 text-blue-600">
                            <RotateCcw size={16} />
                            <h3 className="text-xs font-black uppercase tracking-wider">System Resiliency</h3>
                        </div>
                        <p className="text-[11px] text-slate-500 leading-relaxed">
                            This application supports **Automatic Rollback Fail-safe**. Prior to executing any software update, the system automatically duplicates all database schema credentials, templates, and active user case directories into the backup partition. If the installer encounters file lock or integrity issues, the previous version is instantly restored.
                        </p>
                    </div>

                    {/* Diagnostics & Logs Actions */}
                    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden p-6 space-y-3">
                        <div className="flex items-center gap-2 text-slate-700 mb-1">
                            <FileText size={16} />
                            <h3 className="text-xs font-black uppercase tracking-wider">Log &amp; Diagnostics</h3>
                        </div>
                        <button
                            onClick={() => handleOpenLog('updater')}
                            className="w-full text-left flex items-center justify-between text-xs text-slate-600 hover:text-slate-900 py-2 border-b border-slate-100 font-semibold"
                        >
                            <span>View Update Engine Log</span>
                            <span className="text-[9px] bg-slate-100 px-2 py-0.5 rounded text-slate-400">updater.log</span>
                        </button>
                        <button
                            onClick={() => handleOpenLog('installer')}
                            className="w-full text-left flex items-center justify-between text-xs text-slate-600 hover:text-slate-900 py-2 border-b border-slate-100 font-semibold"
                        >
                            <span>View Setup Installer Log</span>
                            <span className="text-[9px] bg-slate-100 px-2 py-0.5 rounded text-slate-400">installer.log</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Log Viewer Dialog */}
            <AnimatePresence>
                {viewingLog && (
                    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-6 bg-slate-950/60 backdrop-blur-sm">
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-slate-900 text-slate-200 w-full max-w-4xl h-[70vh] rounded-3xl border border-slate-700 shadow-2xl flex flex-col overflow-hidden"
                        >
                            <div className="bg-slate-800 px-6 py-4 flex justify-between items-center border-b border-slate-700">
                                <div className="flex items-center gap-2">
                                    <FileText size={18} className="text-blue-400" />
                                    <span className="text-sm font-bold capitalize text-white">{viewingLog} Log Viewer</span>
                                </div>
                                <button onClick={() => setViewingLog(null)} className="text-slate-400 hover:text-white transition-colors">
                                    <X size={20} />
                                </button>
                            </div>
                            <div className="flex-1 p-6 overflow-auto font-mono text-xs leading-relaxed bg-slate-950 text-emerald-400 whitespace-pre">
                                {loadingLog ? 'Loading log content…' : logContent}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default UpdateSettings;
