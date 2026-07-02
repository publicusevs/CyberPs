/**
 * updateService.js
 * Frontend service for all update-related API calls and local settings.
 * All functions are silent on error — never throw to caller.
 */

const API_BASE = '/api/update';
const SETTINGS_KEY = 'cyberps_update_settings';
const SKIPPED_KEY = 'cyberps_update_skipped';
const LAST_CHECK_KEY = 'cyberps_update_last_check';

// ── Settings ──────────────────────────────────────────────────────────────────

export function getUpdateSettings() {
    try {
        const raw = localStorage.getItem(SETTINGS_KEY);
        const saved = raw ? JSON.parse(raw) : {};
        return {
            autoCheck: saved.autoCheck !== false,      // default: true
            notifyBeforeInstall: saved.notifyBeforeInstall !== false,  // default: true
            ...saved,
        };
    } catch {
        return { autoCheck: true, notifyBeforeInstall: true };
    }
}

export function saveUpdateSettings(settings) {
    try {
        const current = getUpdateSettings();
        localStorage.setItem(SETTINGS_KEY, JSON.stringify({ ...current, ...settings }));
    } catch { /* ignore */ }
}

export function getSkippedVersion() {
    try { return localStorage.getItem(SKIPPED_KEY) || null; } catch { return null; }
}

export function setSkippedVersion(version) {
    try { localStorage.setItem(SKIPPED_KEY, version); } catch { /* ignore */ }
}

export function getLastChecked() {
    try { return localStorage.getItem(LAST_CHECK_KEY) || null; } catch { return null; }
}

function setLastChecked() {
    try { localStorage.setItem(LAST_CHECK_KEY, new Date().toISOString()); } catch { /* ignore */ }
}

// ── API Calls ─────────────────────────────────────────────────────────────────

/**
 * Get the current installed version from the backend.
 */
export async function getInstalledVersion() {
    try {
        const res = await fetch(`${API_BASE}/version`);
        if (!res.ok) return null;
        const data = await res.json();
        return data.version || null;
    } catch {
        return null;
    }
}

/**
 * Check GitHub for a newer version.
 * Returns { hasUpdate, currentVersion, manifest, error } or null on network failure.
 */
export async function checkForUpdates() {
    try {
        const res = await fetch(`${API_BASE}/check`, {
            signal: AbortSignal.timeout ? AbortSignal.timeout(15000) : undefined,
        });
        if (!res.ok) return null;
        const data = await res.json();
        setLastChecked();
        return data;
    } catch {
        return null;
    }
}

/**
 * Start downloading the update in the backend.
 * Returns a downloadId for progress polling, or null on error.
 */
export async function startDownload(manifest) {
    try {
        const res = await fetch(`${API_BASE}/download`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ manifest }),
        });
        if (!res.ok) return null;
        const data = await res.json();
        return data.downloadId || null;
    } catch {
        return null;
    }
}

/**
 * Poll download progress.
 * Returns { percent, downloaded, total, status, localPath?, error? }
 */
export async function getDownloadProgress(downloadId) {
    try {
        const res = await fetch(`${API_BASE}/progress/${downloadId}`);
        if (!res.ok) return null;
        return await res.json();
    } catch {
        return null;
    }
}

/**
 * Trigger installation of a downloaded update.
 */
export async function installUpdate(downloadId) {
    try {
        const res = await fetch(`${API_BASE}/install`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ downloadId }),
        });
        if (!res.ok) return { success: false };
        return await res.json();
    } catch {
        return { success: false };
    }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

export function formatBytes(bytes, decimals = 1) {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

export function formatDate(isoString) {
    if (!isoString) return '—';
    try {
        return new Date(isoString).toLocaleDateString('en-IN', {
            day: '2-digit', month: 'short', year: 'numeric',
        });
    } catch {
        return isoString;
    }
}
