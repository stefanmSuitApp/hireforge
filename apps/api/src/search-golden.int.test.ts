// T5.2 search quality: a golden list of queries → the jobs they must (and
// must not) find, through the real public API and Postgres full-text search.
// Folding (sr_search_fold, migration 0033) and word forms (sr_search_query,
// migration 0036) are checked here.
import type { INestApplication } from '@nestjs/common';
import { insertCompany, insertEmployer, insertJob } from 'testing/db';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { http, startApp, stopApp } from './__harness__/test-app';

const CORPUS = {
  driverC: {
    title: 'Vozač C kategorije',
    description: 'Međunarodni transport, ture po Evropi.',
  },
  driverB: {
    title: 'Vozač B kategorije za dostavu',
    description: 'Dostava paketa po Beogradu.',
  },
  baker: {
    title: 'Pekar za noćnu smenu',
    description: 'Pekara u centru grada, iskustvo poželjno.',
  },
  accountant: {
    title: 'Računovođa',
    description: 'Knjigovodstvo za mala preduzeća.',
  },
  welder: {
    title: 'Zavarivač MIG/MAG',
    description: 'Rad u metalskoj industriji.',
  },
  dev: {
    title: 'Senior TypeScript developer',
    description: 'NestJS, PostgreSQL i React.',
  },
  cook: {
    title: 'Kuvar',
    description: 'Restoran domaće kuhinje traži kuvara.',
  },
  waiter: {
    title: 'Konobar / konobarica',
    description: 'Rad u smenama, vikendom slobodno.',
  },
} as const;
type Key = keyof typeof CORPUS;

let app: INestApplication;
const ids = {} as Record<Key, string>;

beforeAll(async () => {
  app = await startApp();
  const company = await insertCompany();
  const author = await insertEmployer(company.id);
  for (const [key, job] of Object.entries(CORPUS) as Array<
    [Key, (typeof CORPUS)[Key]]
  >) {
    ids[key] = (
      await insertJob(company.id, author.id, { status: 'published', ...job })
    ).id;
  }
});
afterAll(() => stopApp(app));

async function search(q: string): Promise<Key[]> {
  const res = await http(app)
    .get(`/api/public/jobs?pageSize=50&q=${encodeURIComponent(q)}`)
    .expect(200);
  const text = JSON.stringify(res.body);
  return (Object.keys(ids) as Key[])
    .filter((k) => text.includes(ids[k]))
    .sort();
}

const GOLDEN: Array<[string, Key[]]> = [
  ['vozač', ['driverB', 'driverC']],
  ['VOZAČ', ['driverB', 'driverC']],
  ['vozač dostava', ['driverB']],
  ['"C kategorije"', ['driverC']],
  ['vozač -dostava', ['driverC']],
  ['pekar or kuvar', ['baker', 'cook']],
  ['typescript', ['dev']],
  ['postgresql', ['dev']],
  ['metalskoj', ['welder']],
  ['Računovođa', ['accountant']],
  ['kosmonaut', []],
];

describe('golden queries', () => {
  for (const [q, expected] of GOLDEN) {
    it(`"${q}" finds ${expected.length ? expected.join(', ') : 'nothing'}`, async () => {
      expect(await search(q)).toEqual(expected);
    });
  }

  it('a query of only punctuation finds nothing and does not fail', async () => {
    expect(await search('!!! ???')).toEqual([]);
  });
});

describe('folding', () => {
  it('without diacritics: "vozac" finds the drivers', async () => {
    expect(await search('vozac')).toEqual(['driverB', 'driverC']);
  });

  it('dj for đ: "racunovodja" finds the accountant', async () => {
    expect(await search('racunovodja')).toEqual(['accountant']);
  });

  it('Cyrillic: "возач" finds the drivers', async () => {
    expect(await search('возач')).toEqual(['driverB', 'driverC']);
  });

  it('word forms: "kuvari" (plural) finds the cook', async () => {
    expect(await search('kuvari')).toEqual(['cook']);
  });

  it('word forms: "kuvarima", "vozači", "pekara" find their jobs', async () => {
    expect(await search('kuvarima')).toEqual(['cook']);
    expect(await search('vozači')).toEqual(['driverB', 'driverC']);
    expect(await search('pekara')).toEqual(['baker']);
  });

  it('short words stay exact: "pek" is not a prefix of "pekar"', async () => {
    expect(await search('pek')).toEqual([]);
  });
});
