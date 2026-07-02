import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, X, RefreshCw, AlertCircle, CheckCircle, Clock, ChevronDown, ChevronUp, Zap } from 'lucide-react';
import {
    startDownload,
    getDownloadProgress,
    installUpdate,
    setSkippedVersion,
    formatBytes,
    formatDate,
} from '../services/updateService';

/**
 * UpdateDialog.jsx
 * Modal dialog shown when a newer version is available.
 * Handles full download → verify → install flow with progress UI.
 */
const UpdateDialog = ({ updateInfo, onClose, onSkip }) => {
    const { currentVersion, manifest } = updateInfo;
    const isMandatory = manifest?.mandatory === true;

    const [phase, setPhase] = useState('idle'); // idle | downloading | verifying | ready | error | installing
    const [progress, setProgress] = useState({ percent: 0, downloaded: 0, total: 0 });
    const [downloadId, setDownloadId] = useState(null);
    const [errorMsg, setErrorMsg] = useState('');
    const [showNotes, setShowNotes] = useState(false);
    const pollRef = useRef(null);

    // ── Download flow ─────────────────────────────────────────────────────────

    const handleDownload = useCallback(async () => {
        setPhase('downloading');
        setErrorMsg('');

        const dlId = await startDownload(manifest);
        if (!dlId) {
            setPhase('error');
            setErrorMsg('Could not start download. Please check your internet connection.');
            return;
        }
        setDownloadId(dlId);

        // Poll progress every 800ms
        pollRef.current = setInterval(async () => {
            const prog = await getDownloadProgress(dlId);
            if (!prog) return;

            if (prog.status === 'downloading') {
                setProgress({ percent: prog.percent, downloaded: prog.downloaded, total: prog.total });
            } else if (prog.status === 'ready') {
                clearInterval(pollRef.current);
                setProgress({ percent: 100, downloaded: prog.total, total: prog.total });
                setPhase('ready');
            } else if (prog.status === 'error') {
                clearInterval(pollRef.current);
                setPhase('error');
                setErrorMsg(prog.error || 'Download failed. Please try again.');
            }
        }, 800);
    }, [manifest]);

    const handleInstall = useCallback(async () => {
        setPhase('installing');
        const result = await installUpdate(downloadId);
        if (!result?.success) {
            setPhase('error');
            setErrorMsg('Failed to launch installer. Please install manually.');
        }
        // App will restart — nothing more needed
    }, [downloadId]);

    const handleSkip = useCallback(() => {
        setSkippedVersion(manifest?.version);
        if (onSkip) onSkip();
        onClose();
    }, [manifest, onClose, onSkip]);

    const handleRemindLater = useCallback(() => {
        if (!isMandatory) onClose();
    }, [isMandatory, onClose]);

    // Cleanup on unmount
    useEffect(() => {
        return () => { if (pollRef.current) clearInterval(pollRef.current); };
    }, []);

    // ── Speed / ETA calculation ───────────────────────────────────────────────
    const startTimeRef = useRef(null);
    const [speed, setSpeed] = useState(0);
    const [eta, setEta] = useState(null);
    const lastDownloadedRef = useRef(0);

    useEffect(() => {
        if (phase === 'downloading') {
            if (!startTimeRef.current) startTimeRef.current = Date.now();
            const elapsed = (Date.now() - startTimeRef.current) / 1000;
            if (elapsed > 0.5) {
                const spd = progress.downloaded / elapsed;
                setSpeed(spd);
                const remaining = progress.total - progress.downloaded;
                setEta(spd > 0 ? Math.ceil(remaining / spd) : null);
            }
            lastDownloadedRef.current = progress.downloaded;
        }
    }, [progress, phase]);

    // ── Render ────────────────────────────────────────────────────────────────

    const phaseConfig = {
        idle: { icon: Download, iconColor: 'text-blue-600', iconBg: 'bg-blue-50' },
        downloading: { icon: RefreshCw, iconColor: 'text-indigo-600', iconBg: 'bg-indigo-50' },
        verifying: { icon: RefreshCw, iconColor: 'text-amber-600', iconBg: 'bg-amber-50' },
        ready: { icon: CheckCircle, iconColor: 'text-emerald-600', iconBg: 'bg-emerald-50' },
        error: { icon: AlertCircle, iconColor: 'text-red-600', iconBg: 'bg-red-50' },
        installing: { icon: Zap, iconColor: 'text-violet-600', iconBg: 'bg-violet-50' },
    };
    const { icon: PhaseIcon, iconColor, iconBg } = phaseConfig[phase] || phaseConfig.idle;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
                {/* Backdrop */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
                    onClick={isMandatory ? undefined : onClose}
                />

                {/* Dialog */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 16 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 16 }}
                    transition={{ duration: 0.2, ease: 'easeOut' }}
                    className="relative bg-white rounded-2xl shadow-2xl w-full max-w-[480px] overflow-hidden"
                >
                    {/* Header */}
                    <div className="relative bg-gradient-to-br from-blue-600 to-indigo-700 px-6 pt-6 pb-8">
                        <div className="flex items-start gap-4">
                            <div className={`w-12 h-12 rounded-xl ${iconBg} flex items-center justify-center flex-shrink-0`}>
                                <PhaseIcon size={22} className={`${iconColor} ${phase === 'downloading' || phase === 'installing' ? 'animate-spin' : ''}`} />
                            </div>
                            <div className="flex-1 text-white">
                                <h2 className="text-xl font-bold leading-tight">
                                    {phase === 'idle' && 'Update Available'}
                                    {phase === 'downloading' && 'Downloading Update…'}
                                    {phase === 'verifying' && 'Verifying…'}
                                    {phase === 'ready' && 'Ready to Install'}
                                    {phase === 'error' && 'Update Failed'}
                                    {phase === 'installing' && 'Installing…'}
                                </h2>
                                <p className="text-blue-100 text-sm mt-0.5">CyberPS Investigation Hunter</p>
                            </div>
                            {!isMandatory && phase === 'idle' && (
                                <button onClick={onClose} className="text-white/60 hover:text-white transition-colors">
                                    <X size={18} />
                                </button>
                            )}
                        </div>

                        {/* Version badges */}
                        <div className="flex items-center gap-3 mt-4">
                            <span className="bg-white/20 text-white text-xs font-mono px-3 py-1.5 rounded-full">
                                Current: v{currentVersion}
                            </span>
                            <span className="text-white/60 text-sm">→</span>
                            <span className="bg-white text-blue-700 text-xs font-mono font-bold px-3 py-1.5 rounded-full">
                                Latest: v{manifest?.version}
                            </span>
                            {isMandatory && (
                                <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wide">
                                    Required
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Body */}
                    <div className="px-6 py-5 space-y-4">

                        {/* Meta info */}
                        {phase === 'idle' && (
                            <div className="grid grid-cols-2 gap-3 text-sm">
                                {manifest?.file_size && (
                                    <div className="bg-slate-50 rounded-lg p-3">
                                        <div className="text-slate-400 text-xs font-medium uppercase tracking-wide mb-1">Size</div>
                                        <div className="text-slate-800 font-semibold">{formatBytes(manifest.file_size)}</div>
                                    </div>
                                )}
                                {manifest?.published_at && (
                                    <div className="bg-slate-50 rounded-lg p-3">
                                        <div className="text-slate-400 text-xs font-medium uppercase tracking-wide mb-1">Published</div>
                                        <div className="text-slate-800 font-semibold">{formatDate(manifest.published_at)}</div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Download progress */}
                        {(phase === 'downloading' || phase === 'verifying') && (
                            <div className="space-y-3">
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-600">
                                        {formatBytes(progress.downloaded)} / {formatBytes(progress.total)}
                                    </span>
                                    <span className="text-slate-800 font-semibold">{progress.percent}%</span>
                                </div>
                                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                    <motion.div
                                        className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full"
                                        animate={{ width: `${progress.percent}%` }}
                                        transition={{ duration: 0.3 }}
                                    />
                                </div>
                                <div className="flex justify-between text-xs text-slate-400">
                                    {speed > 0 && <span>{formatBytes(speed)}/s</span>}
                                    {eta !== null && <span className="flex items-center gap-1"><Clock size={11} />{eta}s remaining</span>}
                                </div>
                            </div>
                        )}

                        {/* Ready state */}
                        {phase === 'ready' && (
                            <div className="flex items-center gap-3 bg-emerald-50 text-emerald-800 rounded-xl p-4">
                                <CheckCircle size={20} className="text-emerald-600 flex-shrink-0" />
                                <div>
                                    <div className="font-semibold text-sm">Download complete &amp; verified</div>
                                    <div className="text-xs text-emerald-600 mt-0.5">Click "Install Now" to update and restart</div>
                                </div>
                            </div>
                        )}

                        {/* Error state */}
                        {phase === 'error' && (
                            <div className="flex items-start gap-3 bg-red-50 text-red-800 rounded-xl p-4">
                                <AlertCircle size={20} className="text-red-600 flex-shrink-0 mt-0.5" />
                                <div>
                                    <div className="font-semibold text-sm">Update failed</div>
                                    <div className="text-xs text-red-600 mt-0.5">{errorMsg}</div>
                                </div>
                            </div>
                        )}

                        {/* Installing */}
                        {phase === 'installing' && (
                            <div className="flex items-center gap-3 bg-violet-50 text-violet-800 rounded-xl p-4">
                                <Zap size={20} className="text-violet-600 flex-shrink-0 animate-pulse" />
                                <div>
                                    <div className="font-semibold text-sm">Launching installer…</div>
                                    <div className="text-xs text-violet-600 mt-0.5">Application will restart automatically</div>
                                </div>
                            </div>
                        )}

                        {/* Release Notes (collapsible) */}
                        {manifest?.release_notes && (
                            <div className="border border-slate-100 rounded-xl overflow-hidden">
                                <button
                                    onClick={() => setShowNotes(v => !v)}
                                    className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                                >
                                    <span>Release Notes</span>
                                    {showNotes ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                </button>
                                <AnimatePresence>
                                    {showNotes && (
                                        <motion.div
                                            initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }}
                                            className="overflow-hidden"
                                        >
                                            <div className="px-4 pb-4 max-h-[160px] overflow-y-auto text-xs text-slate-600 leading-relaxed whitespace-pre-wrap border-t border-slate-100 pt-3">
                                                {manifest.release_notes}
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        )}
                    </div>

                    {/* Footer Buttons */}
                    <div className="px-6 pb-6 flex gap-3">
                        {phase === 'idle' && (
                            <>
                                <button
                                    onClick={handleDownload}
                                    className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm py-2.5 rounded-xl transition-colors shadow-lg shadow-blue-200"
                                >
                                    <Download size={16} />
                                    Download Update
                                </button>
                                {!isMandatory && (
                                    <>
                                        <button
                                            onClick={handleRemindLater}
                                            className="px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                                        >
                                            Later
                                        </button>
                                        <button
                                            onClick={handleSkip}
                                            className="px-4 py-2.5 text-sm font-medium text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                                        >
                                            Skip
                                        </button>
                                    </>
                                )}
                            </>
                        )}

                        {phase === 'ready' && (
                            <>
                                <button
                                    onClick={handleInstall}
                                    className="flex-1 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm py-2.5 rounded-xl transition-colors shadow-lg shadow-emerald-200"
                                >
                                    <Zap size={16} />
                                    Install Now &amp; Restart
                                </button>
                                {!isMandatory && (
                                    <button onClick={handleRemindLater} className="px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">
                                        Later
                                    </button>
                                )}
                            </>
                        )}

                        {phase === 'error' && (
                            <>
                                <button
                                    onClick={() => { setPhase('idle'); setErrorMsg(''); }}
                                    className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm py-2.5 rounded-xl transition-colors"
                                >
                                    <RefreshCw size={16} />
                                    Retry
                                </button>
                                {!isMandatory && (
                                    <button onClick={handleRemindLater} className="px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">
                                        Cancel
                                    </button>
                                )}
                            </>
                        )}
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

export default UpdateDialog;
