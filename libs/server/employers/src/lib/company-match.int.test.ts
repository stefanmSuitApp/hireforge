// T5.2 / Phase A: which existing company a self sign-up matches, in SSOT §5.4
// order (VAT → tax id → PIB → MB → registration number → legal name), on real
// Postgres. A match never links the signer; it becomes a join request.
import { afterAll, describe, expect, it } from 'vitest';
import { createDb } from 'database';
import { COMPANY_A, COMPANY_B } from 'testing';
import { insertCompany, testDb } from 'testing/db';
import {
  findExistingCompanyIdForSelfSignup,
  type SelfSignupCompanyInput,
} from './company-self-signup';

const { db, pool } = createDb(testDb().url);
afterAll(() => pool.end());
const q = (sql: string, params: unknown[] = []) =>
  testDb().pool.query(sql, params);

const domestic = (over: Record<string, unknown>) =>
  ({
    isForeign: false,
    countryCode: 'RS',
    legalName: 'Niko Nepoznat d.o.o.',
    pib: '199999999',
    mb: '29999999',
    ...over,
  }) as unknown as SelfSignupCompanyInput;
const foreign = (countryCode: string, over: Record<string, unknown>) =>
  ({
    isForeign: true,
    countryCode,
    legalName: 'Unknown Ltd',
    ...over,
  }) as unknown as SelfSignupCompanyInput;

const match = (input: SelfSignupCompanyInput) =>
  findExistingCompanyIdForSelfSignup(db, input);

describe('matching a sign-up to an existing company', () => {
  it('nothing matches a brand-new company', async () => {
    expect(await match(domestic({}))).toBeNull();
  });

  it('PIB matches, even with surrounding spaces', async () => {
    const a = await insertCompany({ company: COMPANY_A });
    expect(await match(domestic({ pib: ` ${COMPANY_A.pib} ` }))).toBe(a.id);
  });

  it('MB matches when PIB does not', async () => {
    const b = await insertCompany({ company: COMPANY_B });
    expect(await match(domestic({ mb: COMPANY_B.mb }))).toBe(b.id);
  });

  it('a look-alike PIB or MB of company A never matches company B', async () => {
    expect(
      await match(domestic({ pib: COMPANY_A.pib.slice(0, 8) + '9' })),
    ).toBeNull();
  });

  it('PIB wins over MB when they point at different companies', async () => {
    const byPib = await insertCompany({
      company: { pib: '180000001', mb: '28000001' },
    });
    await insertCompany({ company: { pib: '180000002', mb: '28000002' } });
    expect(await match(domestic({ pib: '180000001', mb: '28000002' }))).toBe(
      byPib.id,
    );
  });

  it('an EU sign-up matches by VAT id, case-insensitively', async () => {
    const c = await insertCompany();
    await q(
      `update companies set vat_id = 'DE811111111', country_code = 'DE', is_foreign = true where id = $1`,
      [c.id],
    );
    expect(await match(foreign('DE', { vatId: 'de811111111' }))).toBe(c.id);
  });

  it('a non-EU sign-up matches by tax id; an EU one does not use tax id', async () => {
    const c = await insertCompany();
    await q(
      `update companies set tax_id = 'US-55', country_code = 'US', is_foreign = true where id = $1`,
      [c.id],
    );
    expect(await match(foreign('US', { taxId: 'US-55' }))).toBe(c.id);
    expect(await match(foreign('DE', { taxId: 'US-55' }))).toBeNull();
  });

  it('a registration number matches only in the same country', async () => {
    const c = await insertCompany();
    await q(
      `update companies set registration_number = 'HRB 123', country_code = 'AT' where id = $1`,
      [c.id],
    );
    expect(
      await match(foreign('AT', { registrationNumber: ' HRB 123 ' })),
    ).toBe(c.id);
    expect(
      await match(foreign('CH', { registrationNumber: 'HRB 123' })),
    ).toBeNull();
  });

  it('the legal name matches after normalising case, punctuation and the legal form, in the same country', async () => {
    const c = await insertCompany({
      company: { legalName: 'Zidari Srbije d.o.o.' },
    });
    expect(await match(domestic({ legalName: 'ZIDARI SRBIJE DOO' }))).toBe(
      c.id,
    );
    expect(
      await match(foreign('ME', { legalName: 'Zidari Srbije d.o.o.' })),
    ).toBeNull();
  });

  it("company B's look-alike name does not match company A", async () => {
    expect(
      await match(domestic({ legalName: 'Gradnja Plus 2 d.o.o.' })),
    ).toBeNull();
  });
});
