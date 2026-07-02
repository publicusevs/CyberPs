'use strict';

/**
 * appPaths.js — Resolves runtime filesystem paths correctly for both
 * development mode (node app.js) and packaged/portable mode (backend.exe via pkg).
 *
 * PROBLEM this solves:
 *   When packaged with `pkg`, the Node.js process runs from inside a virtual
 *   read-only snapshot (C:\snapshot\...). Any `relative` or `__dirname`-based
 *   path for WRITES (uploads, logs, temp files) crash with EROFS / ENOENT because
 *   that virtual filesystem is read-only.
 *
 *   Solution: In pkg mode, all writable paths are resolved relative to the
 *   REAL directory where backend.exe lives on disk (process.execPath).
 *   In dev mode, they are resolved relative to the project root as before.
 */

const path = require('path');
const fs = require('fs');

/** True when running as a compiled backend.exe (pkg portable build) */
const isPkg = typeof process.pkg !== 'undefined';

/**
 * Root directory of the installation.
 * - Dev:  …/CyberPs/backend/
 * - Pkg:  …/CyberPS/backend/          (real disk dir where backend.exe sits)
 */
const backendRoot = isPkg
    ? path.dirname(process.execPath)          // Real dir of backend.exe on disk
    : path.join(__dirname, '..', '..');       // …/CyberPs/backend  (src/utils → backend)

/**
 * Writable uploads root.
 * - Dev:  …/CyberPs/backend/uploads/
 * - Pkg:  …/CyberPS/uploads/          (one level above backend.exe, writable)
 */
const uploadsRoot = isPkg
    ? path.join(backendRoot, '..', 'uploads')
    : path.join(backendRoot, 'uploads');

/**
 * Returns the absolute path to an uploads subdirectory.
 * Creates the directory if it doesn't exist.
 *
 * @param {...string} segments  e.g. ('fir'), ('excels', caseId), ('notices', '5', 'Bank')
 * @returns {string} Absolute path, guaranteed to exist.
 */
function getUploadsDir(...segments) {
    const dir = path.join(uploadsRoot, ...segments.map(String));
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    return dir;
}

/**
 * Returns the absolute path to a file inside the uploads directory.
 * Does NOT create anything.
 *
 * @param {...string} segments
 * @returns {string}
 */
function getUploadsPath(...segments) {
    return path.join(uploadsRoot, ...segments.map(String));
}

module.exports = { isPkg, backendRoot, uploadsRoot, getUploadsDir, getUploadsPath };
