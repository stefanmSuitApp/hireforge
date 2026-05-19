/**
 * Billing domain services land here in Step 9 (numbering, proforma / invoice
 * issuance, NBS rates). PDF rendering lives in `server-pdf`; this package
 * re-exports the stub renderer until those services call it directly.
 */
export const SERVER_BILLING_VERSION = '0.0.1' as const;
