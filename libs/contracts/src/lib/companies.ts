import { z } from 'zod';

// --- Enums ------------------------------------------------------------------

/** Sales-pipeline status for a company. Mirrors the Postgres `sales_status` enum. */
export const salesStatuses = [
  'unassigned',
  'pipeline',
  'closed_won',
  'closed_lost',
] as const;

export type SalesStatus = (typeof salesStatuses)[number];

export const salesStatusSchema = z.enum(salesStatuses);

/** How the company row entered the system. Mirrors the Postgres `company_source` enum. */
export const companySources = [
  'self_signup',
  'moderator_lead',
  'admin_lead',
] as const;

export type CompanySource = (typeof companySources)[number];

export const companySourceSchema = z.enum(companySources);

/**
 * VAT regime per SSOT §5.3.
 *
 * Modelled as `text + CHECK` (not pgEnum) to allow extensions in P2 (SEF /
 * Serbian VAT charging) without `ALTER TYPE ADD VALUE` migrations.
 */
export const vatTreatments = [
  'rs_standard_20',
  'rs_reverse_charge',
  'rs_export_no_vat',
] as const;

export type VatTreatment = (typeof vatTreatments)[number];

export const vatTreatmentSchema = z.enum(vatTreatments);

// --- Country helpers --------------------------------------------------------

/** ISO-3166 alpha-2 country code (uppercased). */
export const countryCodeSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(
    /^[A-Z]{2}$/,
    'Country code must be ISO-3166 alpha-2 (e.g. RS, DE, US)',
  );

/**
 * EU-27 (ISO-3166 alpha-2) used to decide which foreign-company tax identifier
 * is required (`vat_id` for EU members, `tax_id` otherwise).
 *
 * Source of truth lives here; CMS / UI consumers import this constant rather
 * than maintaining their own list.
 */
export const EU_COUNTRY_CODES: ReadonlySet<string> = new Set([
  'AT',
  'BE',
  'BG',
  'CY',
  'CZ',
  'DE',
  'DK',
  'EE',
  'ES',
  'FI',
  'FR',
  'GR',
  'HR',
  'HU',
  'IE',
  'IT',
  'LT',
  'LU',
  'LV',
  'MT',
  'NL',
  'PL',
  'PT',
  'RO',
  'SE',
  'SI',
  'SK',
]);

export function isEUCountry(code: string): boolean {
  return EU_COUNTRY_CODES.has(code.trim().toUpperCase());
}

// --- Field-level schemas ----------------------------------------------------

/** RS PIB: 8 to 9 digits (modern PIB is 9 digits; legacy 8 digits still found). */
export const pibSchema = z
  .string()
  .trim()
  .regex(/^\d{8,9}$/, 'PIB must be 8 or 9 digits');

/** RS MB (matični broj): 8 digits. */
export const mbSchema = z
  .string()
  .trim()
  .regex(/^\d{8}$/, 'MB must be exactly 8 digits');

/** EU VAT ID format: 2-letter country prefix + 8–12 alphanumerics. */
export const vatIdSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(
    /^[A-Z]{2}[A-Z0-9]{8,12}$/,
    'VAT ID must be a country prefix followed by 8–12 alphanumerics',
  );

/** Foreign tax authority identifier. Loose validation (varies per jurisdiction). */
export const taxIdSchema = z.string().trim().min(3).max(40);

/** IBAN (lenient): 15–34 alphanumerics; full check-digit validation lives in P2. */
export const ibanSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(
    /^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/,
    'IBAN must start with a country code, 2 check digits, then 11–30 alphanumerics',
  );

/** SWIFT/BIC: 8 or 11 chars. */
export const swiftBicSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(
    /^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/,
    'SWIFT/BIC must be 8 or 11 alphanumerics',
  );

/** ISO-4217 currency. */
export const currencyCodeSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z]{3}$/, 'Currency code must be ISO-4217 (e.g. RSD, EUR, USD)');

// --- Base company shape -----------------------------------------------------

/**
 * Full company shape — all fields nullable / optional.
 *
 * Use this for moderator-created leads. Self-signup paths layer additional
 * `superRefine` rules via `companyDomesticInputSchema` /
 * `companyForeignInputSchema` below.
 */
export const companyBaseSchema = z.object({
  legalName: z.string().trim().min(1).max(500),
  isForeign: z.boolean().default(false),
  countryCode: countryCodeSchema.default('RS'),
  pib: pibSchema.optional().nullable(),
  mb: mbSchema.optional().nullable(),
  vatId: vatIdSchema.optional().nullable(),
  taxId: taxIdSchema.optional().nullable(),
  registrationNumber: z.string().trim().max(80).optional().nullable(),
  addressLine1: z.string().trim().max(300).optional().nullable(),
  addressLine2: z.string().trim().max(300).optional().nullable(),
  addressPostalCode: z.string().trim().max(40).optional().nullable(),
  addressCity: z.string().trim().max(200).optional().nullable(),
  addressStateRegion: z.string().trim().max(200).optional().nullable(),
  bankName: z.string().trim().max(300).optional().nullable(),
  iban: ibanSchema.optional().nullable(),
  swiftBic: swiftBicSchema.optional().nullable(),
  bankCountryCode: countryCodeSchema.optional().nullable(),
  accountCurrency: currencyCodeSchema.optional().nullable(),
  invoiceCurrency: currencyCodeSchema.default('EUR'),
  invoiceLanguage: z.enum(['sr', 'en']).default('sr'),
  vatTreatment: vatTreatmentSchema.default('rs_standard_20'),
  billingEmail: z.email().max(320).optional().nullable(),
  billingPhone: z.string().trim().max(40).optional().nullable(),
  billingContactName: z.string().trim().max(200).optional().nullable(),
  responsiblePerson: z.string().trim().max(200).optional().nullable(),
  responsiblePosition: z.string().trim().max(200).optional().nullable(),
});

export type CompanyBase = z.infer<typeof companyBaseSchema>;

// --- Refined input shapes (self-signup) -------------------------------------

/**
 * Domestic (RS) self-signup company input.
 *
 * Required at the application layer (per SSOT §5.3): legal name, country = RS,
 * PIB, MB, full address, billing contact. Bank details and `responsible_person`
 * remain recommended but optional in MVP.
 */
export const companyDomesticInputSchema = companyBaseSchema
  .extend({
    isForeign: z.literal(false),
    countryCode: z.literal('RS'),
    pib: pibSchema,
    mb: mbSchema,
    addressLine1: z.string().trim().min(1).max(300),
    addressPostalCode: z.string().trim().min(1).max(40),
    addressCity: z.string().trim().min(1).max(200),
    billingEmail: z.email().max(320),
    billingContactName: z.string().trim().min(1).max(200),
    invoiceCurrency: currencyCodeSchema.default('RSD'),
    invoiceLanguage: z.literal('sr').default('sr'),
  })
  .strict();

export type CompanyDomesticInput = z.infer<typeof companyDomesticInputSchema>;

/**
 * Foreign self-signup company input.
 *
 * Application-layer rules (per SSOT §5.3): EU country ⇒ `vat_id` required;
 * non-EU ⇒ `tax_id` required. Address and bank details required for
 * international invoicing.
 */
export const companyForeignInputSchema = companyBaseSchema
  .extend({
    isForeign: z.literal(true),
    countryCode: countryCodeSchema,
    vatId: vatIdSchema.optional().nullable(),
    taxId: taxIdSchema.optional().nullable(),
    addressLine1: z.string().trim().min(1).max(300),
    addressPostalCode: z.string().trim().min(1).max(40),
    addressCity: z.string().trim().min(1).max(200),
    bankName: z.string().trim().min(1).max(300),
    iban: ibanSchema,
    swiftBic: swiftBicSchema,
    bankCountryCode: countryCodeSchema,
    accountCurrency: currencyCodeSchema,
    billingEmail: z.email().max(320),
    billingContactName: z.string().trim().min(1).max(200),
  })
  .strict()
  .superRefine((data, ctx) => {
    if (data.countryCode === 'RS') {
      ctx.addIssue({
        code: 'custom',
        path: ['countryCode'],
        message: 'Foreign company cannot have country_code = RS',
      });
      return;
    }
    if (isEUCountry(data.countryCode)) {
      if (!data.vatId) {
        ctx.addIssue({
          code: 'custom',
          path: ['vatId'],
          message: 'EU companies require a VAT ID',
        });
      }
    } else if (!data.taxId) {
      ctx.addIssue({
        code: 'custom',
        path: ['taxId'],
        message: 'Non-EU companies require a Tax ID',
      });
    }
  })
  .transform((data) => ({
    ...data,
    vatTreatment: isEUCountry(data.countryCode)
      ? ('rs_reverse_charge' as const)
      : ('rs_export_no_vat' as const),
  }));

export type CompanyForeignInput = z.infer<typeof companyForeignInputSchema>;

/** Normalise legal name for self-signup dedup (SSOT §5.4 step 6). */
export function normalizeLegalNameForCompanyMatch(name: string): string {
  let s = name.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().trim();
  s = s.replace(/\s+/g, ' ');
  s = s.replace(
    /\b(d\.?o\.?o\.?|doo|a\.?d\.?|a\.d\.|ltd\.?|gmbh|s\.?r\.?l\.?|inc\.?|llc)\b\.?$/gi,
    '',
  );
  s = s.trim();
  s = s.replace(/[\p{P}\p{S}]+/gu, '');
  s = s.replace(/\s+/g, ' ').trim();
  return s;
}
