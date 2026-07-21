'use strict';

/**
 * update.controller.js
 * Thin HTTP controller layer — delegates all logic to update.service.
 */

const updateService = require('./update.service');
const logger = require('../../utils/logger');

// Track active download progress per-request (simple in-memory store)
const downloadProgress = new Map();

/**
 * GET /api/update/check
 * Silent update check — never throws, always returns JSON.
 */
async function checkUpdate(req, res) {
    try {
        const result = await updateService.checkForUpdates();
        return res.json({
            success: true,
            ...result,
        });
    } catch (err) {
        logger.error('[UPDATE] checkUpdate controller error:', err);
        return res.json({
            success: false,
            hasUpdate: false,
            currentVersion: updateService.getVersionConfig().version,
            error: 'Update check failed',
        });
    }
}

/**
 * GET /api/update/version
 * Returns just the current installed version.
 */
function getVersion(req, res) {
    const config = updateService.getVersionConfig();
    return res.json({
        success: true,
        version: config.version,
        app_name: config.app_name,
        update_channel: config.update_channel,
    });
}

/**
 * POST /api/update/download
 * Body: { manifest: { version, download_url, sha256, file_name, ... } }
 * Streams download progress via polling key returned in response.
 */
async function downloadUpdate(req, res) {
    const { manifest } = req.body;
    if (!manifest || !manifest.download_url) {
        return res.status(400).json({ success: false, error: 'manifest.download_url is required' });
    }

    const downloadId = `dl_${Date.now()}`;
    downloadProgress.set(downloadId, { percent: 0, downloaded: 0, total: 0, status: 'downloading' });

    // Respond immediately with the download ID so frontend can poll progress
    res.json({ success: true, downloadId });

    // Run download asynchronously
    try {
        const localPath = await updateService.downloadUpdate(manifest, (downloaded, total) => {
            const percent = total > 0 ? Math.round((downloaded / total) * 100) : 0;
            downloadProgress.set(downloadId, { percent, downloaded, total, status: 'downloading' });
        });

        downloadProgress.set(downloadId, {
            percent: 100, status: 'ready', localPath,
            version: manifest.version,
        });
        logger.info(`[UPDATE] Download ready at ${localPath}`);

    } catch (err) {
        logger.error(`[UPDATE] Download failed: ${err.message}`);
        downloadProgress.set(downloadId, { status: 'error', error: err.message });
    }
}

/**
 * GET /api/update/progress/:downloadId
 * Poll endpoint for download progress.
 */
function getProgress(req, res) {
    const { downloadId } = req.params;
    const progress = downloadProgress.get(downloadId);
    if (!progress) {
        return res.status(404).json({ success: false, error: 'Download ID not found' });
    }

    // Clean up completed/failed entries after they are read as done
    if (progress.status === 'ready' || progress.status === 'error') {
        setTimeout(() => downloadProgress.delete(downloadId), 60000);
    }

    return res.json({ success: true, ...progress });
}

/**
 * POST /api/update/install
 * Body: { downloadId }
 * Launches the updater.exe with the downloaded installer path.
 * The backend will then exit so the updater can replace files.
 */
async function installUpdate(req, res) {
    const { downloadId } = req.body;
    const progress = downloadProgress.get(downloadId);

    if (!progress || progress.status !== 'ready' || !progress.localPath) {
        return res.status(400).json({ success: false, error: 'Download not ready or not found' });
    }

    // Respond before launching the process (browser needs the response)
    res.json({ success: true, message: 'Installing update. Application will restart.' });

    // Small delay to ensure response is sent
    setTimeout(async () => {
        try {
            const { spawn } = require('child_process');
            const path = require('path');
            const isPkg = typeof process.pkg !== 'undefined';

            const installDir = isPkg
                ? path.dirname(process.execPath)
                : path.join(__dirname, '../../../..');

            const updaterPath = path.join(installDir, '..', 'updater.exe');
            const appDir = path.join(installDir, '..');
            const backupDir = path.join(appDir, 'Backup', 'PreviousVersion');

            logger.info(`[UPDATE] Launching updater: ${updaterPath}`);
            logger.info(`[UPDATE] Installer: ${progress.localPath}`);

            spawn(updaterPath, [
                '--installer-path', progress.localPath,
                '--install-dir', appDir,
                '--backup-dir', backupDir,
                '--launcher', path.join(appDir, 'CyberPS.exe'),
            ], {
                detached: true,
                stdio: 'ignore',
            }).unref();

            // Exit so the updater can replace our files
            setTimeout(() => process.exit(0), 2000);

        } catch (err) {
            logger.error(`[UPDATE] Install launch failed: ${err.message}`);
        }
    }, 500);
}

/**
 * POST /api/update/open-folder
 * Opens the local update downloads directory in Windows Explorer.
 */
async function openDownloadFolder(req, res) {
    try {
        const path = require('path');
        const fs = require('fs');
        const { uploadsRoot } = require('../../utils/appPaths');
        const folder = path.join(uploadsRoot, '..', 'Temp', 'Updates');
        if (!fs.existsSync(folder)) {
            fs.mkdirSync(folder, { recursive: true });
        }
        const { exec } = require('child_process');
        exec(`explorer "${folder}"`);
        return res.json({ success: true, message: 'Folder opened' });
    } catch (err) {
        logger.error('[UPDATE] Failed to open download folder:', err);
        return res.status(500).json({ success: false, error: err.message });
    }
}

/**
 * GET /api/update/log/:logType
 * Reads the content of installer.log or updater.log.
 */
async function viewLog(req, res) {
    const { logType } = req.params;
    try {
        const path = require('path');
        const fs = require('fs');
        const { isPkg, backendRoot } = require('../../utils/appPaths');
        const logsDir = isPkg 
            ? path.join(path.dirname(process.execPath), '..', 'logs') 
            : path.join(backendRoot, '..', 'logs');

        const logFile = logType === 'installer' ? 'installer.log' : 'updater.log';
        const logPath = path.join(logsDir, logFile);

        if (!fs.existsSync(logPath)) {
            return res.json({ success: true, content: 'Log file is empty or not yet generated.' });
        }

        const content = fs.readFileSync(logPath, 'utf8');
        return res.json({ success: true, content });
    } catch (err) {
        logger.error('[UPDATE] Failed to read log:', err);
        return res.status(500).json({ success: false, error: err.message });
    }
}

module.exports = {
    checkUpdate,
    getVersion,
    downloadUpdate,
    getProgress,
    installUpdate,
    openDownloadFolder,
    viewLog,
};
