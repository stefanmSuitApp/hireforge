import { describe, expect, it } from 'vitest';

import {
  adminJobPatchPublishBodySchema,
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
