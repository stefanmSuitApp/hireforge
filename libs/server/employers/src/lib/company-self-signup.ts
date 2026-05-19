import type { InferInsertModel, InferSelectModel } from 'drizzle-orm';
import { and, eq } from 'drizzle-orm';

import type { CompanyDomesticInput, CompanyForeignInput } from 'contracts';
import { isEUCountry, normalizeLegalNameForCompanyMatch } from 'contracts';
import { companies } from 'database';
import type { DrizzleDbOrTx } from 'database';

export type SelfSignupCompanyInput = CompanyDomesticInput | CompanyForeignInput;

function normVat(v: string): string {
  return v.trim().toUpperCase();
}

/**
 * SSOT §5.4 — match priority: `vat_id` → `tax_id` → `pib` → `mb` →
 * `(registration_number, country_code)` → normalised `(legal_name, country_code)`.
 */
export async function findExistingCompanyIdForSelfSignup(
  db: DrizzleDbOrTx,
  input: SelfSignupCompanyInput,
): Promise<string | null> {
  if (input.isForeign && isEUCountry(input.countryCode) && input.vatId) {
    const vat = normVat(input.vatId);
    const [r] = await db
      .select({ id: companies.id })
      .from(companies)
      .where(eq(companies.vatId, vat))
      .limit(1);
    if (r) return r.id;
  }

  if (input.isForeign && !isEUCountry(input.countryCode) && input.taxId) {
    const tid = input.taxId.trim();
    const [r] = await db
      .select({ id: companies.id })
      .from(companies)
      .where(eq(companies.taxId, tid))
      .limit(1);
    if (r) return r.id;
  }

  if (input.pib) {
    const pib = input.pib.trim();
    const [r] = await db
      .select({ id: companies.id })
      .from(companies)
      .where(eq(companies.pib, pib))
      .limit(1);
    if (r) return r.id;
  }

  if (input.mb) {
    const mb = input.mb.trim();
    const [r] = await db
      .select({ id: companies.id })
      .from(companies)
      .where(eq(companies.mb, mb))
      .limit(1);
    if (r) return r.id;
  }

  if (input.registrationNumber?.trim()) {
    const reg = input.registrationNumber.trim();
    const [r] = await db
      .select({ id: companies.id })
      .from(companies)
      .where(
        and(
          eq(companies.registrationNumber, reg),
          eq(companies.countryCode, input.countryCode),
        ),
      )
      .limit(1);
    if (r) return r.id;
  }

  const targetNorm = normalizeLegalNameForCompanyMatch(input.legalName);
  const nameCandidates = await db
    .select({ id: companies.id, legalName: companies.legalName })
    .from(companies)
    .where(eq(companies.countryCode, input.countryCode));
  for (const c of nameCandidates) {
    if (normalizeLegalNameForCompanyMatch(c.legalName) === targetNorm) {
      return c.id;
    }
  }
  return null;
}

type CompanyRow = InferSelectModel<typeof companies>;

function isBlank(v: unknown): boolean {
  if (v === null || v === undefined) return true;
  if (typeof v === 'string') return v.trim() === '';
  return false;
}

function fillStr(
  current: string | null | undefined,
  next: string | null | undefined,
): string | undefined {
  if (next === undefined || next === null) return undefined;
  if (typeof next === 'string' && next.trim() === '') return undefined;
  if (isBlank(current)) return next;
  return undefined;
}

/** Patch only empty columns; preserves sales ownership, slug, source, country, `is_foreign`. */
export function mergeCompanyRowFromSelfSignup(
  existing: CompanyRow,
  input: SelfSignupCompanyInput,
): Partial<CompanyRow> {
  const patch: Partial<CompanyRow> = {};

  const legal = fillStr(existing.legalName, input.legalName);
  if (legal !== undefined) patch.legalName = legal;

  if (!input.isForeign) {
    const pib = fillStr(existing.pib, input.pib);
    if (pib !== undefined) patch.pib = pib;
    const mb = fillStr(existing.mb, input.mb);
    if (mb !== undefined) patch.mb = mb;
  } else {
    if (input.vatId) {
      const v = fillStr(existing.vatId, normVat(input.vatId));
      if (v !== undefined) patch.vatId = v;
    }
    const tax = fillStr(existing.taxId, input.taxId ?? undefined);
    if (tax !== undefined) patch.taxId = tax;
    const pib = fillStr(existing.pib, input.pib ?? undefined);
    if (pib !== undefined) patch.pib = pib;
    const mb = fillStr(existing.mb, input.mb ?? undefined);
    if (mb !== undefined) patch.mb = mb;
  }

  const reg = fillStr(
    existing.registrationNumber,
    input.registrationNumber ?? undefined,
  );
  if (reg !== undefined) patch.registrationNumber = reg;

  const a1 = fillStr(existing.addressLine1, input.addressLine1);
  if (a1 !== undefined) patch.addressLine1 = a1;
  const a2 = fillStr(existing.addressLine2, input.addressLine2 ?? undefined);
  if (a2 !== undefined) patch.addressLine2 = a2;
  const pc = fillStr(existing.addressPostalCode, input.addressPostalCode);
  if (pc !== undefined) patch.addressPostalCode = pc;
  const city = fillStr(existing.addressCity, input.addressCity);
  if (city !== undefined) patch.addressCity = city;
  const st = fillStr(
    existing.addressStateRegion,
    input.addressStateRegion ?? undefined,
  );
  if (st !== undefined) patch.addressStateRegion = st;

  const bankName = fillStr(existing.bankName, input.bankName ?? undefined);
  if (bankName !== undefined) patch.bankName = bankName;
  const iban = fillStr(
    existing.iban,
    input.iban ? input.iban.trim().toUpperCase() : undefined,
  );
  if (iban !== undefined) patch.iban = iban;
  const swift = fillStr(
    existing.swiftBic,
    input.swiftBic ? input.swiftBic.trim().toUpperCase() : undefined,
  );
  if (swift !== undefined) patch.swiftBic = swift;
  const bcc = fillStr(
    existing.bankCountryCode,
    input.bankCountryCode ?? undefined,
  );
  if (bcc !== undefined) patch.bankCountryCode = bcc;
  const acc = fillStr(
    existing.accountCurrency,
    input.accountCurrency ?? undefined,
  );
  if (acc !== undefined) patch.accountCurrency = acc;

  const ic = fillStr(existing.invoiceCurrency, input.invoiceCurrency);
  if (ic !== undefined) patch.invoiceCurrency = ic;
  const il = fillStr(existing.invoiceLanguage, input.invoiceLanguage);
  if (il !== undefined) {
    patch.invoiceLanguage = il as CompanyRow['invoiceLanguage'];
  }
  const vt = fillStr(existing.vatTreatment, input.vatTreatment);
  if (vt !== undefined) {
    patch.vatTreatment = vt as CompanyRow['vatTreatment'];
  }

  const be = fillStr(
    existing.billingEmail,
    input.billingEmail.trim().toLowerCase(),
  );
  if (be !== undefined) patch.billingEmail = be;
  const bp = fillStr(existing.billingPhone, input.billingPhone ?? undefined);
  if (bp !== undefined) patch.billingPhone = bp;
  const bn = fillStr(existing.billingContactName, input.billingContactName);
  if (bn !== undefined) patch.billingContactName = bn;
  const rp = fillStr(
    existing.responsiblePerson,
    input.responsiblePerson ?? undefined,
  );
  if (rp !== undefined) patch.responsiblePerson = rp;
  const rpos = fillStr(
    existing.responsiblePosition,
    input.responsiblePosition ?? undefined,
  );
  if (rpos !== undefined) patch.responsiblePosition = rpos;

  return patch;
}

export function newCompanyValuesFromSelfSignup(
  input: SelfSignupCompanyInput,
  slug: string,
): Omit<InferInsertModel<typeof companies>, 'id' | 'createdAt' | 'updatedAt'> {
  const base = {
    slug,
    legalName: input.legalName.trim(),
    isForeign: input.isForeign,
    countryCode: input.countryCode,
    source: 'self_signup' as const,
    salesStatus: 'unassigned' as const,
    addressLine1: input.addressLine1.trim(),
    addressPostalCode: input.addressPostalCode.trim(),
    addressCity: input.addressCity.trim(),
    billingEmail: input.billingEmail.trim().toLowerCase(),
    billingContactName: input.billingContactName.trim(),
    invoiceCurrency: input.invoiceCurrency,
    invoiceLanguage: input.invoiceLanguage,
  };

  if (!input.isForeign) {
    return {
      ...base,
      pib: input.pib.trim(),
      mb: input.mb.trim(),
      vatTreatment: 'rs_standard_20',
      addressLine2: input.addressLine2?.trim() || null,
      addressStateRegion: input.addressStateRegion?.trim() || null,
      bankName: input.bankName?.trim() || null,
      iban: input.iban?.trim().toUpperCase() || null,
      swiftBic: input.swiftBic?.trim().toUpperCase() || null,
      bankCountryCode: input.bankCountryCode ?? null,
      accountCurrency: input.accountCurrency ?? null,
      billingPhone: input.billingPhone?.trim() || null,
      responsiblePerson: input.responsiblePerson?.trim() || null,
      responsiblePosition: input.responsiblePosition?.trim() || null,
      registrationNumber: input.registrationNumber?.trim() || null,
      taxId: null,
      vatId: null,
    };
  }

  const vatTreatment = isEUCountry(input.countryCode)
    ? ('rs_reverse_charge' as const)
    : ('rs_export_no_vat' as const);
  return {
    ...base,
    vatId: input.vatId?.trim() ? normVat(input.vatId) : null,
    taxId: input.taxId?.trim() || null,
    pib: input.pib?.trim() || null,
    mb: input.mb?.trim() || null,
    registrationNumber: input.registrationNumber?.trim() || null,
    addressLine2: input.addressLine2?.trim() || null,
    addressStateRegion: input.addressStateRegion?.trim() || null,
    bankName: input.bankName.trim(),
    iban: input.iban.trim().toUpperCase(),
    swiftBic: input.swiftBic.trim().toUpperCase(),
    bankCountryCode: input.bankCountryCode,
    accountCurrency: input.accountCurrency,
    billingPhone: input.billingPhone?.trim() || null,
    responsiblePerson: input.responsiblePerson?.trim() || null,
    responsiblePosition: input.responsiblePosition?.trim() || null,
    vatTreatment,
  };
}
