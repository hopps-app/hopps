/**
 * Query key of the first-use setup progress. Mutations that can complete a setup step (bank import, receipt upload,
 * category groups) invalidate it, because the sidebar entry stays mounted and would otherwise keep a stale count.
 */
export const SETUP_PROGRESS_KEY = ['dashboard', 'setup-progress'] as const;
