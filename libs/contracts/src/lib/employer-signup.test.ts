import { describe, expect, it } from 'vitest';

import { employerSelfSignupBodySchema } from './employer-signup';

describe('employerSelfSignupBodySchema', () => {
  it('parses domestic signup', () => {
    const result = employerSelfSignupBodySchema.safeParse({
      email: 'e@example.test',
      password: 'password1',
      companySlug: 'acme',
      company: {
        legalName: 'Acme d.o.o.',
        isForeign: false,
        countryCode: 'RS',
        pib: '123456789',
        mb: '12345678',
        addressLine1: 'Ulica 1',
        addressPostalCode: '11000',
        addressCity: 'Beograd',
        billingEmail: 'bill@example.test',
        billingContactName: 'Ana',
      },
    });
    expect(result.success).toBe(true);
  });

  it('parses foreign EU signup', () => {
    const result = employerSelfSignupBodySchema.safeParse({
      email: 'e@example.test',
      password: 'password1',
      company: {
        legalName: 'GmbH Test',
        isForeign: true,
        countryCode: 'DE',
        vatId: 'DE123456789',
        addressLine1: 'Str 1',
        addressPostalCode: '10115',
        addressCity: 'Berlin',
        bankName: 'Bank',
        iban: 'DE89370400440532013000',
        swiftBic: 'DEUTDEFF',
        bankCountryCode: 'DE',
        accountCurrency: 'EUR',
        billingEmail: 'bill@example.test',
        billingContactName: 'Bob',
      },
    });
    expect(result.success).toBe(true);
  });
});
