// T5.2 the company a self sign-up creates (when nothing matched).
import { describe, expect, it } from 'vitest';
import { normalizeLegalNameForCompanyMatch } from 'contracts';
import {
  newCompanyValuesFromSelfSignup,
  type SelfSignupCompanyInput,
} from './company-self-signup';

const DOMESTIC = {
  isForeign: false,
  countryCode: 'RS',
  legalName: '  Nova Firma d.o.o. ',
  pib: ' 107000001 ',
  mb: ' 21700001 ',
  addressLine1: ' Ulica 1 ',
  addressPostalCode: ' 11000 ',
  addressCity: ' Beograd ',
  billingEmail: ' Racuni@Firma.RS ',
  billingContactName: ' Ana ',
  invoiceCurrency: 'RSD',
  invoiceLanguage: 'sr',
  iban: ' rs35 1600 ',
} as unknown as SelfSignupCompanyInput;

const FOREIGN = (countryCode: string, extra: Record<string, unknown> = {}) =>
  ({
    isForeign: true,
    countryCode,
    legalName: 'Foreign GmbH',
    vatId: ' de123456789 ',
    taxId: ' 12-345 ',
    addressLine1: 'Str 1',
    addressPostalCode: '10115',
    addressCity: 'Berlin',
    bankName: ' Bank ',
    iban: ' de89 3704 ',
    swiftBic: ' cobadeff ',
    bankCountryCode: 'DE',
    accountCurrency: 'EUR',
    billingEmail: 'billing@foreign.example',
    billingContactName: 'Hans',
    invoiceCurrency: 'EUR',
    invoiceLanguage: 'en',
    ...extra,
  }) as unknown as SelfSignupCompanyInput;

describe('a new company from self sign-up', () => {
  it('a domestic company is trimmed, self_signup, unassigned, standard VAT, with PIB and MB', () => {
    expect(
      newCompanyValuesFromSelfSignup(DOMESTIC, 'nova-firma'),
    ).toMatchObject({
      slug: 'nova-firma',
      legalName: 'Nova Firma d.o.o.',
      source: 'self_signup',
      salesStatus: 'unassigned',
      pib: '107000001',
      mb: '21700001',
      vatTreatment: 'rs_standard_20',
      billingEmail: 'racuni@firma.rs',
      iban: 'RS35 1600',
      vatId: null,
      taxId: null,
      bankName: null,
    });
  });

  it('an EU company is reverse charge with an upper-case VAT id', () => {
    expect(
      newCompanyValuesFromSelfSignup(FOREIGN('DE'), 'foreign'),
    ).toMatchObject({
      isForeign: true,
      vatTreatment: 'rs_reverse_charge',
      vatId: 'DE123456789',
      swiftBic: 'COBADEFF',
      iban: 'DE89 3704',
    });
  });

  it('a non-EU company is an export without VAT, and blank ids become null', () => {
    expect(
      newCompanyValuesFromSelfSignup(
        FOREIGN('US', { vatId: '  ', taxId: '  ' }),
        'us-co',
      ),
    ).toMatchObject({
      vatTreatment: 'rs_export_no_vat',
      vatId: null,
      taxId: null,
      pib: null,
      mb: null,
    });
  });
});

describe('legal name matching', () => {
  it.each([
    ['Gradnja Plus d.o.o.', 'gradnja plus'],
    ['GRADNJA PLUS DOO', 'gradnja plus'],
    ['Gradnja  Plus, d.o.o', 'gradnja plus'],
    ['Šljakam a.d.', 'sljakam'],
    ['Foreign GmbH', 'foreign'],
  ])('%j normalises to %j', (raw, expected) => {
    expect(normalizeLegalNameForCompanyMatch(raw)).toBe(expected);
  });

  it('look-alike names that differ by a word do not match', () => {
    expect(normalizeLegalNameForCompanyMatch('Gradnja Plus 1 d.o.o.')).not.toBe(
      normalizeLegalNameForCompanyMatch('Gradnja Plus d.o.o.'),
    );
  });
});
