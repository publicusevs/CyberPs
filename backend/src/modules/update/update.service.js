'use strict';

/**
 * update.service.js
 * Handles all update logic: version comparison, GitHub Releases fetch,
 * download with progress, SHA256 verification.
 * All errors are silent (logged only) — never crashes the app.
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const logger = require('../../utils/logger');
const { isPkg, backendRoot } = require('../../utils/appPaths');

// ── Version Utilities ─────────────────────────────────────────────────────────

/**
 * Parse semver string into numeric array for correct comparison.
 * "1.0.10" → [1, 0, 10]  (avoids string comparison bug: "1.0.9" > "1.0.10")
 */
function parseSemver(versionStr) {
    if (!versionStr) return [0, 0, 0];
    const clean = versionStr.replace(/^v/i, '').trim();
    const parts = clean.split('.').map(Number);
    while (parts.length < 3) parts.push(0);
    return parts;
}

/**
 * Compare two semver arrays.
 * Returns: 1 if a > b, -1 if a < b, 0 if equal.
 */
function compareSemver(a, b) {
    for (let i = 0; i < 3; i++) {
        if (a[i] > b[i]) return 1;
        if (a[i] < b[i]) return -1;
    }
    return 0;
}

// ── Config Loader ─────────────────────────────────────────────────────────────

let _versionConfig = null;

function getVersionConfig() {
    if (_versionConfig) return _versionConfig;
    try {
        const versionPath = isPkg
            ? path.join(backendRoot, '..', 'version.json')
            : path.join(backendRoot, '..', 'version.json'); // backendRoot is ../CyberPs/backend in dev mode
        _versionConfig = JSON.parse(fs.readFileSync(versionPath, 'utf8'));
    } catch (err) {
        logger.warn('[UPDATE] Could not read version.json, using defaults.');
        _versionConfig = {
            version: '1.0.0',
            github_owner: 'AkshayDadhich',
            github_repo: 'CyberPSWebsite',
            update_channel: 'stable',
        };
    }
    return _versionConfig;
}

// ── HTTP Helper ───────────────────────────────────────────────────────────────

function httpsGet(url, options = {}) {
    return new Promise((resolve, reject) => {
        const timeout = options.timeout || 10000;
        const lib = url.startsWith('https') ? https : http;
        const req = lib.get(url, {
            headers: {
                'User-Agent': 'CyberPS-Updater/1.0',
                'Accept': 'application/vnd.github+json',
                ...options.headers,
            },
        }, (res) => {
            if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                return httpsGet(res.headers.location, options).then(resolve).catch(reject);
            }
            let data = '';
            res.on('data', chunk => { data += chunk; });
            res.on('end', () => resolve({ status: res.statusCode, body: data, headers: res.headers }));
        });
        req.setTimeout(timeout, () => {
            req.destroy();
            reject(new Error('Request timed out'));
        });
        req.on('error', reject);
    });
}

// ── GitHub Releases API ───────────────────────────────────────────────────────

/**
 * Fetch the latest release from GitHub Releases API.
 * Returns null on any error (network, rate limit, 404, etc.)
 */
async function fetchLatestRelease(owner, repo) {
    const url = `https://api.github.com/repos/${owner}/${repo}/releases/latest`;
    try {
        const res = await httpsGet(url, { timeout: 8000 });
        if (res.status !== 200) {
            logger.warn(`[UPDATE] GitHub API returned ${res.status}`);
            return null;
        }
        return JSON.parse(res.body);
    } catch (err) {
        logger.warn(`[UPDATE] Failed to fetch release info: ${err.message}`);
        return null;
    }
}

/**
 * Build a normalized update manifest from a GitHub release object.
 * Looks for an asset matching CyberPS_Setup_vX.Y.Z.exe
 * Also looks for update_manifest.json asset for SHA256.
 */
function buildManifestFromRelease(release) {
    if (!release) return null;

    const version = (release.tag_name || '').replace(/^v/i, '');
    if (!version) return null;

    // Find the setup exe asset
    const assets = release.assets || [];
    const exeAsset = assets.find(a =>
        /CyberPS_Setup_v[\d.]+\.exe$/i.test(a.name)
    );
    const manifestAsset = assets.find(a => a.name === 'update_manifest.json');

    return {
        version,
        download_url: exeAsset ? exeAsset.browser_download_url : null,
        file_size: exeAsset ? exeAsset.size : null,
        file_name: exeAsset ? exeAsset.name : null,
        sha256: null,               // Filled from update_manifest.json if present
        manifest_url: manifestAsset ? manifestAsset.browser_download_url : null,
        mandatory: false,           // Can be set in release body via "mandatory: true"
        release_notes: release.body || '',
        published_at: release.published_at || null,
        minimum_supported_version: null,
    };
}

/**
 * Attempt to fetch SHA256 from the update_manifest.json release asset.
 */
async function fetchSha256FromManifest(manifestUrl) {
    if (!manifestUrl) return null;
    try {
        const res = await httpsGet(manifestUrl, { timeout: 5000 });
        if (res.status === 200) {
            const data = JSON.parse(res.body);
            return data.sha256 || null;
        }
    } catch (_) { /* ignore */ }
    return null;
}

// ── Core Update Check ─────────────────────────────────────────────────────────

/**
 * Main update check function.
 * Returns: { hasUpdate, currentVersion, manifest, error }
 */
async function checkForUpdates() {
    const config = getVersionConfig();
    const currentVersion = config.version;

    try {
        const release = await fetchLatestRelease(config.github_owner, config.github_repo);
        if (!release) {
            return { hasUpdate: false, currentVersion, manifest: null, error: 'Could not reach update server' };
        }

        const manifest = buildManifestFromRelease(release);
        if (!manifest) {
            return { hasUpdate: false, currentVersion, manifest: null, error: 'Invalid release data' };
        }

        // Fetch SHA256 if a manifest.json asset exists
        if (manifest.manifest_url) {
            manifest.sha256 = await fetchSha256FromManifest(manifest.manifest_url);
        }

        // Parse and compare mandatory flag from release body (format: "mandatory: true")
        if (release.body && /mandatory:\s*true/i.test(release.body)) {
            manifest.mandatory = true;
        }

        const current = parseSemver(currentVersion);
        const latest = parseSemver(manifest.version);
        const hasUpdate = compareSemver(latest, current) > 0;

        logger.info(`[UPDATE] Current: ${currentVersion} | Latest: ${manifest.version} | Update available: ${hasUpdate}`);

        return { hasUpdate, currentVersion, manifest };

    } catch (err) {
        logger.error(`[UPDATE] Check failed: ${err.message}`);
        return { hasUpdate: false, currentVersion, manifest: null, error: err.message };
    }
}

// ── Downloader ────────────────────────────────────────────────────────────────

/**
 * Get the temp directory for storing downloaded updates.
 */
function getUpdateTempDir() {
    const baseDir = path.join(uploadsRoot, '..', 'Temp', 'Updates'); // Next to uploads
    if (!fs.existsSync(baseDir)) {
        fs.mkdirSync(baseDir, { recursive: true });
    }
    return baseDir;
}

/**
 * Download a file from url to destPath.
 * Calls progressCallback(downloaded, total) during download.
 */
function downloadFile(url, destPath, progressCallback) {
    return new Promise((resolve, reject) => {
        const lib = url.startsWith('https') ? https : http;
        const file = fs.createWriteStream(destPath);

        const request = (requestUrl) => {
            lib.get(requestUrl, { headers: { 'User-Agent': 'CyberPS-Updater/1.0' } }, (res) => {
                // Follow redirects (GitHub uses CDN redirects)
                if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                    return request(res.headers.location);
                }
                if (res.statusCode !== 200) {
                    file.close();
                    fs.unlink(destPath, () => {});
                    return reject(new Error(`Download failed with HTTP ${res.statusCode}`));
                }

                const total = parseInt(res.headers['content-length'] || '0', 10);
                let downloaded = 0;

                res.on('data', (chunk) => {
                    downloaded += chunk.length;
                    if (progressCallback) progressCallback(downloaded, total);
                });

                res.pipe(file);
                file.on('finish', () => {
                    file.close(() => resolve(destPath));
                });
                res.on('error', (err) => {
                    file.close();
                    fs.unlink(destPath, () => {});
                    reject(err);
                });
            }).on('error', (err) => {
                file.close();
                fs.unlink(destPath, () => {});
                reject(err);
            });
        };

        request(url);
        file.on('error', (err) => {
            fs.unlink(destPath, () => {});
            reject(err);
        });
    });
}

/**
 * Calculate SHA256 hash of a file.
 */
function computeSha256(filePath) {
    return new Promise((resolve, reject) => {
        const hash = crypto.createHash('sha256');
        const stream = fs.createReadStream(filePath);
        stream.on('data', chunk => hash.update(chunk));
        stream.on('end', () => resolve(hash.digest('hex')));
        stream.on('error', reject);
    });
}

/**
 * Download the update installer, verify SHA256 if available.
 * Returns the local path to the downloaded file.
 */
async function downloadUpdate(manifest, progressCallback) {
    if (!manifest || !manifest.download_url) {
        throw new Error('No download URL in update manifest');
    }

    const tempDir = getUpdateTempDir();
    const fileName = manifest.file_name || `CyberPS_Setup_v${manifest.version}.exe`;
    const destPath = path.join(tempDir, fileName);

    logger.info(`[UPDATE] Downloading ${manifest.version} from ${manifest.download_url}`);
    logger.info(`[UPDATE] Saving to ${destPath}`);

    await downloadFile(manifest.download_url, destPath, progressCallback);

    logger.info(`[UPDATE] Download complete. Verifying integrity...`);

    // Verify SHA256 if provided
    if (manifest.sha256) {
        const computedHash = await computeSha256(destPath);
        if (computedHash.toLowerCase() !== manifest.sha256.toLowerCase()) {
            fs.unlinkSync(destPath);
            throw new Error(`SHA256 mismatch! Expected: ${manifest.sha256}, Got: ${computedHash}`);
        }
        logger.info(`[UPDATE] SHA256 verified OK`);
    } else {
        logger.warn(`[UPDATE] No SHA256 in manifest — skipping integrity check`);
    }

    return destPath;
}

module.exports = {
    checkForUpdates,
    downloadUpdate,
    getVersionConfig,
    parseSemver,
    compareSemver,
};
