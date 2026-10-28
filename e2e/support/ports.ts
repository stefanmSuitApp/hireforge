/**
 * Where the e2e stack listens. scripts/e2e/run.mjs passes the ports (from
 * `.env`, so two checkouts on one machine don't collide); defaults match it.
 */
export const API_ORIGIN = `http://127.0.0.1:${process.env['E2E_API_PORT'] ?? 4100}`;
export const WEB_ORIGIN = `http://127.0.0.1:${process.env['E2E_WEB_PORT'] ?? 3100}`;
export const MAIL_ORIGIN = `http://127.0.0.1:${process.env['E2E_MAIL_PORT'] ?? 4300}`;
