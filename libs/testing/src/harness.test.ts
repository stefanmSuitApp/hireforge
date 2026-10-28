import { afterEach, describe, expect, it } from 'vitest';
import {
  COMPANY_A,
  COMPANY_B,
  defineFactory,
  fakeSanityClient,
  FIXED_NOW,
  fixedNow,
  nbsMiddleRateHtml,
  startNbsStub,
  startResendStub,
  startStubServer,
  testId,
} from './index';
import { taxonomySeedStatements } from './db/template';
import { useFixedClock } from './vitest';

describe('fixed clock', () => {
  useFixedClock();

  it('freezes Date at the fixed test time', () => {
    expect(new Date().toISOString()).toBe(FIXED_NOW.toISOString());
    expect(Date.now()).toBe(FIXED_NOW.getTime());
  });

  it('E2E_NOW overrides the fixed time, and a bad value fails loudly', () => {
    expect(fixedNow({ E2E_NOW: '2026-03-01T08:30:00Z' }).toISOString()).toBe(
      '2026-03-01T08:30:00.000Z',
    );
    expect(() => fixedNow({ E2E_NOW: 'tomorrow' })).toThrow(
      'E2E_NOW is not a valid ISO date',
    );
  });
});

describe('test ids', () => {
  it('are the same on every run and look like UUIDs', () => {
    expect(testId('company', 1)).toBe(testId('company', 1));
    expect(testId('company', 1)).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
  });

  it('differ by kind and number', () => {
    expect(
      new Set([testId('company', 1), testId('company', 2), testId('user', 1)])
        .size,
    ).toBe(3);
  });
});

describe('factories', () => {
  const jobs = defineFactory((seq) => ({
    title: `Posao ${seq}`,
    city: 'beograd',
  }));
  afterEach(() => jobs.reset());

  it('build valid records from a sequence and apply overrides', () => {
    expect(jobs.build()).toEqual({ title: 'Posao 1', city: 'beograd' });
    expect(jobs.build({ city: 'novi-sad' })).toEqual({
      title: 'Posao 2',
      city: 'novi-sad',
    });
  });

  it('reset restarts the sequence so values never depend on test order', () => {
    expect(jobs.buildMany(2).map((j) => j.title)).toEqual([
      'Posao 1',
      'Posao 2',
    ]);
  });
});

describe('the isolation companies', () => {
  it('are distinct but look alike, so loose matching shows up as a bug', () => {
    expect(COMPANY_A.id).not.toBe(COMPANY_B.id);
    expect(COMPANY_B.slug.startsWith(COMPANY_A.slug)).toBe(true);
    expect(COMPANY_A.pib.slice(0, 8)).toBe(COMPANY_B.pib.slice(0, 8));
    expect(COMPANY_A.mb.slice(0, 7)).toBe(COMPANY_B.mb.slice(0, 7));
    expect(COMPANY_B.legalName).toContain('Gradnja Plus');
  });
});

describe('the template seed', () => {
  it('takes only reference data from the dev seed, never its users or companies', () => {
    const statements = taxonomySeedStatements();
    const tables = new Set(
      statements.map((s) => /^insert\s+into\s+(\w+)/i.exec(s)?.[1]),
    );
    expect([...tables].sort()).toEqual([
      'cities',
      'job_categories',
      'package_entitlements',
      'package_prices',
      'packages',
    ]);
    expect(statements.join('\n')).not.toMatch(/password|@hireforge\.local/);
  });
});

describe('stubs', () => {
  it('a stub server records requests and answers what it is told to', async () => {
    const stub = await startStubServer({ status: 202, body: 'ok' });
    try {
      const res = await fetch(`${stub.url}/anything`, {
        method: 'POST',
        body: 'hello',
      });
      expect(res.status).toBe(202);
      expect(stub.requests).toMatchObject([
        { method: 'POST', path: '/anything', body: 'hello' },
      ]);
      expect(stub.url).toMatch(/^http:\/\/127\.0\.0\.1:\d+$/);
    } finally {
      await stub.close();
    }
  });

  it('the Resend stub stores each email once per idempotency key, like Resend', async () => {
    const resend = await startResendStub();
    try {
      const send = (key: string) =>
        fetch(`${resend.url}/emails`, {
          method: 'POST',
          headers: {
            'idempotency-key': key,
            'content-type': 'application/json',
          },
          body: JSON.stringify({ to: 'ana@example.test', subject: 'Zdravo' }),
        });
      expect((await send('k1')).status).toBe(200);
      expect((await send('k1')).status).toBe(200);
      expect((await send('k2')).status).toBe(200);
      expect(
        resend.to('ana@example.test').map((e) => e.idempotencyKey),
      ).toEqual(['k1', 'k2']);
      expect(resend.env.RESEND_API_URL).toBe(resend.url);
    } finally {
      await resend.close();
    }
  });

  it('the NBS stub serves the EUR middle rate until it is told to fail', async () => {
    const nbs = await startNbsStub('117,5000');
    try {
      const page = await fetch(nbs.pageUrl);
      expect(await page.text()).toBe(nbsMiddleRateHtml('117,5000'));
      nbs.fail();
      expect((await fetch(nbs.pageUrl)).status).toBe(503);
    } finally {
      await nbs.close();
    }
  });

  it('the Sanity stand-in answers by id or by type and records each query', async () => {
    const sanity = fakeSanityClient([
      { _id: 'pkg.sef', _type: 'packageDefinition', code: 'sef' },
      { _id: 'page.home', _type: 'page' },
    ]);
    expect(await sanity.fetch('*[_id == $id][0]', { id: 'pkg.sef' })).toEqual({
      _id: 'pkg.sef',
      _type: 'packageDefinition',
      code: 'sef',
    });
    expect(
      await sanity.fetch<unknown[]>('*[_type == "packageDefinition"]'),
    ).toHaveLength(1);
    expect(sanity.calls).toHaveLength(2);
  });
});
