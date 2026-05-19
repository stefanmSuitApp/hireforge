import { describe, expect, it } from 'vitest';

import {
  EU_COUNTRY_CODES,
  companyDomesticInputSchema,
  companyForeignInputSchema,
  isEUCountry,
  normalizeLegalNameForCompanyMatch,
  salesStatusSchema,
  vatTreatmentSchema,
} from './companies';

const baseDomestic = {
  legalName: 'Šljakam Test d.o.o.',
  isForeign: false as const,
  countryCode: 'RS' as const,
  pib: '123456789',
  mb: '12345678',
  addressLine1: 'Bulevar Mihajla Pupina 1',
  addressPostalCode: '11000',
  addressCity: 'Beograd',
  billingEmail: 'fakture@example.test',
  billingContactName: 'Petar Petrović',
};

const baseForeignEU = {
  legalName: 'Acme GmbH',
  isForeign: true as const,
  countryCode: 'DE',
  vatId: 'DE123456789',
  addressLine1: 'Musterstraße 1',
  addressPostalCode: '10115',
  addressCity: 'Berlin',
  bankName: 'Deutsche Bank',
  iban: 'DE89370400440532013000',
  swiftBic: 'DEUTDEFF',
  bankCountryCode: 'DE',
  accountCurrency: 'EUR',
  billingEmail: 'billing@acme.de',
  billingContactName: 'Anna Müller',
};

const baseForeignNonEU = {
  ...baseForeignEU,
  legalName: 'Acme Corp',
  countryCode: 'US',
  vatId: undefined,
  taxId: '12-3456789',
  iban: 'US12ABCDEFGHIJKLMNOPQR',
  swiftBic: 'CHASUS33',
  bankCountryCode: 'US',
  accountCurrency: 'USD',
};

describe('companyDomesticInputSchema', () => {
  it('accepts a valid RS company', () => {
    const result = companyDomesticInputSchema.safeParse(baseDomestic);
    expect(result.success).toBe(true);
  });

  it('rejects when PIB is missing', () => {
    const result = companyDomesticInputSchema.safeParse({
      ...baseDomestic,
      pib: undefined,
    });
    expect(result.success).toBe(false);
  });

  it('rejects when MB is missing', () => {
    const result = companyDomesticInputSchema.safeParse({
      ...baseDomestic,
      mb: undefined,
    });
    expect(result.success).toBe(false);
  });

  it('rejects malformed PIB', () => {
    const result = companyDomesticInputSchema.safeParse({
      ...baseDomestic,
      pib: '123',
    });
    expect(result.success).toBe(false);
  });

  it('rejects malformed MB', () => {
    const result = companyDomesticInputSchema.safeParse({
      ...baseDomestic,
      mb: '1234',
    });
    expect(result.success).toBe(false);
  });

  it('rejects non-RS country code', () => {
    const result = companyDomesticInputSchema.safeParse({
      ...baseDomestic,
      countryCode: 'DE',
    });
    expect(result.success).toBe(false);
  });
});

describe('companyForeignInputSchema', () => {
  it('accepts a valid EU company with VAT ID', () => {
    const result = companyForeignInputSchema.safeParse(baseForeignEU);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.vatTreatment).toBe('rs_reverse_charge');
    }
  });

  it('accepts a valid non-EU company with Tax ID', () => {
    const result = companyForeignInputSchema.safeParse(baseForeignNonEU);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.vatTreatment).toBe('rs_export_no_vat');
    }
  });

  it('rejects EU company without VAT ID', () => {
    const result = companyForeignInputSchema.safeParse({
      ...baseForeignEU,
      vatId: undefined,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const messages = result.error.issues.map((i) => i.message);
      expect(messages.some((m) => m.includes('VAT ID'))).toBe(true);
    }
  });

  it('rejects non-EU company without Tax ID', () => {
    const result = companyForeignInputSchema.safeParse({
      ...baseForeignNonEU,
      taxId: undefined,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const messages = result.error.issues.map((i) => i.message);
      expect(messages.some((m) => m.includes('Tax ID'))).toBe(true);
    }
  });

  it('rejects countryCode = RS on the foreign schema', () => {
    const result = companyForeignInputSchema.safeParse({
      ...baseForeignEU,
      countryCode: 'RS',
    });
    expect(result.success).toBe(false);
  });

  it('rejects missing IBAN on the foreign schema', () => {
    const result = companyForeignInputSchema.safeParse({
      ...baseForeignEU,
      iban: undefined,
    });
    expect(result.success).toBe(false);
  });
});

describe('normalizeLegalNameForCompanyMatch', () => {
  it('strips noise and lowercases', () => {
    expect(normalizeLegalNameForCompanyMatch('  ACME d.o.o. ')).toBe('acme');
    expect(normalizeLegalNameForCompanyMatch('Foo–Bar Ltd.')).toBe('foobar');
  });
});

describe('EU country helpers', () => {
  it('classifies EU members correctly', () => {
    expect(isEUCountry('DE')).toBe(true);
    expect(isEUCountry('FR')).toBe(true);
    expect(isEUCountry('SI')).toBe(true);
    expect(isEUCountry('si')).toBe(true);
  });

  it('classifies non-EU correctly', () => {
    expect(isEUCountry('US')).toBe(false);
    expect(isEUCountry('CH')).toBe(false);
    expect(isEUCountry('UK')).toBe(false);
    expect(isEUCountry('RS')).toBe(false);
  });

  it('exposes the EU set as readonly', () => {
    expect(EU_COUNTRY_CODES.size).toBe(27);
  });
});

describe('domain enum schemas', () => {
  it('parses sales statuses', () => {
    expect(salesStatusSchema.parse('unassigned')).toBe('unassigned');
    expect(salesStatusSchema.parse('closed_won')).toBe('closed_won');
    expect(() => salesStatusSchema.parse('rejected')).toThrow();
  });

  it('parses vat treatments', () => {
    expect(vatTreatmentSchema.parse('rs_standard_20')).toBe('rs_standard_20');
    expect(vatTreatmentSchema.parse('rs_export_no_vat')).toBe(
      'rs_export_no_vat',
    );
    expect(() => vatTreatmentSchema.parse('eu_standard_19')).toThrow();
  });
});
