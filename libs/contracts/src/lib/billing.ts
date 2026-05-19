import { z } from 'zod';

import { currencyCodeSchema } from './companies';

// --- Document kinds --------------------------------------------------------

/** Billing document kinds (matches `billing_sequences.kind` CHECK). */
export const documentKinds = ['proforma', 'invoice', 'credit_note'] as const;

export type DocumentKind = (typeof documentKinds)[number];

export const documentKindSchema = z.enum(documentKinds);

/** Per-kind human-facing prefix used in document numbers (SSOT §10.2). */
export const documentNumberPrefix = {
  proforma: 'PR',
  invoice: 'RA',
  credit_note: 'CN',
} as const satisfies Record<DocumentKind, string>;

export type DocumentNumberPrefix =
  (typeof documentNumberPrefix)[keyof typeof documentNumberPrefix];

const PREFIX_TO_KIND = Object.fromEntries(
  Object.entries(documentNumberPrefix).map(([kind, prefix]) => [prefix, kind]),
) as Record<DocumentNumberPrefix, DocumentKind>;

// --- Number format helpers -------------------------------------------------

/** Per-year sequence width (zero-padded). 6 digits = 999_999 docs / kind / year. */
const SEQUENCE_WIDTH = 6;
const NUMBER_PATTERN = /^(PR|RA|CN)-(\d{4})\/(\d{6})$/;

export interface ParsedDocumentNumber {
  kind: DocumentKind;
  year: number;
  sequence: number;
}

/**
 * Format a billing document number per SSOT §10.2.
 *
 *   formatDocumentNumber('proforma', 2026, 42) === 'PR-2026/000042'
 *
 * Throws on out-of-range inputs (year < 1 or sequence < 1 or sequence > 999_999)
 * to surface bugs early; the issuing service provides validated values from the
 * `billing_sequences` row.
 */
export function formatDocumentNumber(
  kind: DocumentKind,
  year: number,
  sequence: number,
): string {
  if (!Number.isInteger(year) || year < 1 || year > 9999) {
    throw new RangeError(`Invalid year ${year}; expected 1..9999`);
  }
  if (
    !Number.isInteger(sequence) ||
    sequence < 1 ||
    sequence > 10 ** SEQUENCE_WIDTH - 1
  ) {
    throw new RangeError(
      `Invalid sequence ${sequence}; expected 1..${10 ** SEQUENCE_WIDTH - 1}`,
    );
  }
  const prefix = documentNumberPrefix[kind];
  return `${prefix}-${year}/${String(sequence).padStart(SEQUENCE_WIDTH, '0')}`;
}

/**
 * Parse a billing document number. Returns `null` on malformed input rather
 * than throwing — callers (e.g. admin search) should treat missing matches as
 * "not a document number".
 */
export function parseDocumentNumber(
  input: string,
): ParsedDocumentNumber | null {
  const match = NUMBER_PATTERN.exec(input);
  if (!match) return null;
  const [, prefix, yearStr, seqStr] = match;
  const kind = PREFIX_TO_KIND[prefix as DocumentNumberPrefix];
  if (!kind) return null;
  return {
    kind,
    year: Number(yearStr),
    sequence: Number(seqStr),
  };
}

// --- NBS rate snapshot -----------------------------------------------------

/**
 * NBS middle-rate snapshot stored on `invoices.nbs_rate` for RS clients.
 * Captured at issue time; never recalculated.
 */
export const nbsRateSchema = z.object({
  /** Decimal as string to avoid float drift (e.g. "117.2456" RSD per EUR). */
  rate: z.string().regex(/^\d+(\.\d+)?$/),
  /** NBS source URL the rate was scraped from (audit trail). */
  source_url: z.url(),
  /** ISO-8601 timestamp the rate was fetched. */
  fetched_at: z.iso.datetime({ offset: true }),
  base_currency: currencyCodeSchema,
  target_currency: currencyCodeSchema,
});

export type NbsRate = z.infer<typeof nbsRateSchema>;

// --- Document shapes -------------------------------------------------------

const moneyMinorSchema = z.number().int().nonnegative();

export const proformaSchema = z.object({
  id: z.uuid(),
  subscriptionId: z.uuid(),
  number: z.string().regex(NUMBER_PATTERN),
  totalMinor: moneyMinorSchema,
  currency: currencyCodeSchema,
  pdfStorageKey: z.string().nullable(),
  issuedAt: z.string(),
  paidAt: z.string().nullable(),
  paidMarkedByUserId: z.uuid().nullable(),
  voidedAt: z.string().nullable(),
});

export type Proforma = z.infer<typeof proformaSchema>;

export const invoiceSchema = z.object({
  id: z.uuid(),
  subscriptionId: z.uuid(),
  proformaId: z.uuid().nullable(),
  number: z.string().regex(NUMBER_PATTERN),
  totalMinor: moneyMinorSchema,
  currency: currencyCodeSchema,
  nbsRate: nbsRateSchema.nullable(),
  pdfStorageKey: z.string().nullable(),
  issuedAt: z.string(),
  voidedAt: z.string().nullable(),
});

export type Invoice = z.infer<typeof invoiceSchema>;

export const creditNoteSchema = z.object({
  id: z.uuid(),
  invoiceId: z.uuid(),
  number: z.string().regex(NUMBER_PATTERN),
  totalMinor: moneyMinorSchema,
  currency: currencyCodeSchema,
  reason: z.string().min(1),
  pdfStorageKey: z.string().nullable(),
  issuedAt: z.string(),
});

export type CreditNote = z.infer<typeof creditNoteSchema>;
