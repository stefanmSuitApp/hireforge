import { describe, expect, it } from 'vitest';

import {
  adminJobPatchPublishBodySchema,
  companyHasIdentifier,
  staffCompanyAccountCreateBodySchema,
  staffCompanyCloseLostBodySchema,
  staffCompanyListQuerySchema,
} from './staff-admin';

describe('staffCompanyListQuerySchema', () => {
  it('parses optional view=my|pool|all', () => {
    expect(
      staffCompanyListQuerySchema.parse({
        view: 'my',
        limit: 10,
        offset: 0,
      }).view,
    ).toBe('my');
    expect(staffCompanyListQuerySchema.parse({ view: 'pool' }).view).toBe(
      'pool',
    );
    expect(staffCompanyListQuerySchema.parse({ view: 'all' }).view).toBe('all');
  });

  it('allows omitting view', () => {
    expect(staffCompanyListQuerySchema.parse({}).view).toBeUndefined();
  });

  it('rejects invalid view', () => {
    expect(() =>
      staffCompanyListQuerySchema.parse({ view: 'bogus' }),
    ).toThrow();
  });
});

describe('adminJobPatchPublishBodySchema', () => {
  it('requires at least one field', () => {
    expect(() => adminJobPatchPublishBodySchema.parse({})).toThrow();
  });

  it('accepts title only', () => {
    expect(
      adminJobPatchPublishBodySchema.parse({ title: '  Senior Dev  ' }),
    ).toEqual({ title: 'Senior Dev' });
  });

  it('accepts descriptionPlain only', () => {
    expect(
      adminJobPatchPublishBodySchema.parse({
        descriptionPlain: 'hello',
      }),
    ).toEqual({ descriptionPlain: 'hello' });
  });
});

describe('staffCompanyCloseLostBodySchema', () => {
  it('accepts empty object', () => {
    expect(staffCompanyCloseLostBodySchema.parse({})).toEqual({});
  });

  it('accepts optional note', () => {
    expect(
      staffCompanyCloseLostBodySchema.parse({ note: '  no budget  ' }),
    ).toEqual({ note: 'no budget' });
  });
});

describe('companyHasIdentifier', () => {
  it('needs PIB or MB for a Serbian company', () => {
    expect(companyHasIdentifier({})).toBe(false);
    expect(companyHasIdentifier({ pib: '  ' })).toBe(false);
    expect(companyHasIdentifier({ pib: '101234567' })).toBe(true);
    expect(companyHasIdentifier({ mb: '12345678' })).toBe(true);
    // A foreign identifier doesn't count for a domestic company.
    expect(companyHasIdentifier({ vatId: 'DE123456789' })).toBe(false);
  });

  it('needs a VAT ID, tax ID or registration number for a foreign one', () => {
    expect(companyHasIdentifier({ isForeign: true, pib: '101234567' })).toBe(
      false,
    );
    expect(
      companyHasIdentifier({ isForeign: true, vatId: 'DE123456789' }),
    ).toBe(true);
    expect(companyHasIdentifier({ isForeign: true, taxId: '12-3456789' })).toBe(
      true,
    );
    expect(
      companyHasIdentifier({ isForeign: true, registrationNumber: 'HRB 1' }),
    ).toBe(true);
  });
});

describe('staffCompanyAccountCreateBodySchema', () => {
  it('takes an email and defaults the invite language to Serbian', () => {
    expect(
      staffCompanyAccountCreateBodySchema.parse({ email: 'a@b.rs' }),
    ).toEqual({ email: 'a@b.rs', locale: 'sr' });
    expect(
      staffCompanyAccountCreateBodySchema.safeParse({ email: 'nope' }).success,
    ).toBe(false);
  });
});
