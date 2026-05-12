/**
 * asyncHandler — Wraps async Express route handlers to automatically
 * forward errors to the global error middleware via next(err).
 *
 * Eliminates repetitive try/catch blocks in every controller function.
 *
 * Usage:
 *   router.get('/cases', asyncHandler(async (req, res) => {
 *       const data = await caseService.getAll();
 *       res.json({ success: true, data });
 *   }));
 */
const asyncHandler = (fn) => (req, res, next) =>
    Promise.resolve(fn(req, res, next)).catch(next);

module.exports = asyncHandler;
