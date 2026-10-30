#!/usr/bin/env node
/**
 * Fills a LOCAL database with many realistic published jobs, for UI and
 * design work. Demo companies all have a `demo-` slug; every run deletes
 * them first (jobs, applications and saves cascade), so re-running is safe.
 * Needs the baseline seed (`pnpm db:seed`) for the employer user and cities.
 *
 * Usage:
 *   pnpm db:seed:demo-jobs                 # 300 live jobs + a few ended
 *   pnpm db:seed:demo-jobs -- --count 800
 *   pnpm db:seed:demo-jobs -- --remove     # delete demo data only
 */
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { config } from 'dotenv';
import pg from 'pg';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
config({ path: join(root, '.env') });

const args = process.argv.slice(2);
const remove = args.includes('--remove');
const countArg = args.indexOf('--count');
const COUNT = countArg >= 0 ? Number(args[countArg + 1]) : 300;
const ENDED = Math.max(5, Math.round(COUNT * 0.04));

// Deterministic, so screenshots before/after a redesign show the same data.
let seed = 20261029;
function rand() {
  seed = (seed * 1664525 + 1013904223) % 4294967296;
  return seed / 4294967296;
}
const pick = (list) => list[Math.floor(rand() * list.length)];
const chance = (p) => rand() < p;
function pickSome(list, min, max) {
  const n = min + Math.floor(rand() * (max - min + 1));
  return [...list].sort(() => rand() - 0.5).slice(0, n);
}

const CATEGORIES = [
  ['it', 'IT', 'IT'],
  ['marketing', 'Marketing', 'Marketing'],
  ['ugostiteljstvo', 'Ugostiteljstvo', 'Hospitality'],
  ['trgovina', 'Trgovina i prodaja', 'Retail and sales'],
  ['gradjevina', 'Građevina', 'Construction'],
  ['transport', 'Transport i logistika', 'Transport and logistics'],
  ['proizvodnja', 'Proizvodnja', 'Manufacturing'],
  ['zdravstvo', 'Zdravstvo i nega', 'Healthcare'],
  ['administracija', 'Administracija', 'Administration'],
  ['zanati', 'Zanati i servis', 'Trades and repair'],
];

/** [title, category slug, typical seniority, typical work model] */
const ROLES = [
  ['Konobar / konobarica', 'ugostiteljstvo', 'junior', 'onsite'],
  ['Kuvar', 'ugostiteljstvo', 'mid', 'onsite'],
  ['Pomoćni kuvar', 'ugostiteljstvo', 'junior', 'onsite'],
  ['Šanker', 'ugostiteljstvo', 'junior', 'onsite'],
  ['Pekar', 'ugostiteljstvo', 'mid', 'onsite'],
  ['Picajolo', 'ugostiteljstvo', 'mid', 'onsite'],
  ['Recepcioner u hotelu', 'ugostiteljstvo', 'junior', 'onsite'],
  ['Sobarica', 'ugostiteljstvo', 'junior', 'onsite'],
  ['Prodavac u maloprodaji', 'trgovina', 'junior', 'onsite'],
  ['Kasir', 'trgovina', 'junior', 'onsite'],
  ['Komercijalista na terenu', 'trgovina', 'mid', 'hybrid'],
  ['Mesar', 'trgovina', 'mid', 'onsite'],
  ['Poslovođa prodavnice', 'trgovina', 'senior', 'onsite'],
  ['Zidar', 'gradjevina', 'mid', 'onsite'],
  ['Armirač', 'gradjevina', 'mid', 'onsite'],
  ['Moler / farbar', 'gradjevina', 'mid', 'onsite'],
  ['Rukovalac građevinskom mašinom', 'gradjevina', 'senior', 'onsite'],
  ['Pomoćni radnik na gradilištu', 'gradjevina', 'intern', 'onsite'],
  ['Vozač C kategorije', 'transport', 'mid', 'onsite'],
  [
    'Vozač kamiona CE kategorije – međunarodni transport',
    'transport',
    'senior',
    'onsite',
  ],
  ['Dostavljač', 'transport', 'junior', 'onsite'],
  ['Magacioner', 'transport', 'junior', 'onsite'],
  ['Viljuškarista', 'transport', 'mid', 'onsite'],
  ['Dispečer', 'transport', 'mid', 'hybrid'],
  ['Operater na CNC mašini', 'proizvodnja', 'mid', 'onsite'],
  ['Radnik u proizvodnji', 'proizvodnja', 'junior', 'onsite'],
  ['Varilac', 'proizvodnja', 'mid', 'onsite'],
  ['Kontrolor kvaliteta', 'proizvodnja', 'mid', 'onsite'],
  ['Pakovač', 'proizvodnja', 'intern', 'onsite'],
  ['Medicinska sestra', 'zdravstvo', 'mid', 'onsite'],
  ['Negovatelj / negovateljica starih lica', 'zdravstvo', 'junior', 'onsite'],
  ['Farmaceutski tehničar', 'zdravstvo', 'mid', 'onsite'],
  ['Stomatološka sestra', 'zdravstvo', 'junior', 'onsite'],
  ['Administrativni radnik', 'administracija', 'junior', 'hybrid'],
  ['Knjigovođa', 'administracija', 'mid', 'hybrid'],
  ['Referent nabavke', 'administracija', 'mid', 'onsite'],
  ['Operater u korisničkom servisu', 'administracija', 'junior', 'remote'],
  ['Električar', 'zanati', 'mid', 'onsite'],
  ['Vodoinstalater', 'zanati', 'mid', 'onsite'],
  ['Automehaničar', 'zanati', 'mid', 'onsite'],
  ['Bravar', 'zanati', 'mid', 'onsite'],
  ['Serviser klima uređaja', 'zanati', 'mid', 'onsite'],
  ['Frontend developer (React)', 'it', 'mid', 'hybrid'],
  ['Backend developer (Node.js)', 'it', 'senior', 'remote'],
  ['QA tester', 'it', 'junior', 'hybrid'],
  ['IT podrška / helpdesk', 'it', 'junior', 'onsite'],
  ['DevOps inženjer', 'it', 'senior', 'remote'],
  ['Menadžer društvenih mreža', 'marketing', 'mid', 'hybrid'],
  ['Grafički dizajner', 'marketing', 'mid', 'hybrid'],
  ['Copywriter', 'marketing', 'junior', 'remote'],
];

const EN_ROLES = [
  ['Senior Full-Stack Engineer (TypeScript)', 'it', 'senior', 'remote'],
  [
    'Customer Support Specialist (English)',
    'administracija',
    'junior',
    'remote',
  ],
  ['Performance Marketing Manager', 'marketing', 'senior', 'hybrid'],
  ['Site Reliability Engineer', 'it', 'lead', 'remote'],
];

const COMPANY_NAMES = [
  'Pekara Zlatni klas',
  'Restoran Stara kafana',
  'Hotel Panorama',
  'Gradnja Plus',
  'Morava Transport',
  'Lanac Market',
  'Metalac Proizvodnja',
  'Dom zdravlja Medika',
  'Apoteka Kamilica',
  'Auto servis Točak',
  'Elektro Mont',
  'Vodomont Instalacije',
  'Picerija Napoli',
  'Kafe bar Centar',
  'Logistika Dunav',
  'Kurirska služba Brzo',
  'Fabrika nameštaja Hrast',
  'Prerada mesa Zlatibor',
  'Klima Servis Sever',
  'Računovodstvo Bilans',
  'Pixel Studio',
  'Kodlab Softver',
  'Digitalna agencija Talas',
  'Stomatološka ordinacija Osmeh',
  'Dom za stare Spokoj',
  'Supermarket Komšija',
  'Mlin Vojvodina',
  'Betonjerka Kamen',
  'Bravarija Čelik',
  'Moleraj Boja',
  'Kontakt centar Glas',
  'Pogon Plastika Niš',
  'Vinarija Fruška',
  'Turistička agencija Sunce',
  'Hostel Kalemegdan',
  'Print centar Slovo',
  'Pakovanje Kutija',
  'Rent-a-car Put',
  'Vulkanizer Guma',
  'Cloudline Systems',
];

const PERKS = [
  'redovna i uvek na vreme isplaćena plata',
  'prijava od prvog dana',
  'topli obrok ili naknada za ishranu',
  'plaćen prevoz',
  'obuka uz iskusnog kolegu',
  'bonusi prema rezultatima',
  'slobodne nedelje',
  'rad u smenama po dogovoru',
  'smeštaj za radnike iz drugih gradova',
  'privatno zdravstveno osiguranje',
  'mogućnost napredovanja',
];

const TASKS = [
  'svakodnevni rad u timu od 4–10 ljudi',
  'poštovanje higijenskih i bezbednosnih standarda',
  'komunikacija sa kupcima i klijentima',
  'vođenje osnovne evidencije o radu',
  'održavanje opreme i radnog prostora',
  'pomoć kolegama u periodima veće gužve',
  'rad prema dnevnom planu koji dobijaš od nadređenog',
];

const NEEDS = [
  'odgovornost i tačnost',
  'iskustvo na sličnim poslovima je prednost, ali nije uslov',
  'spremnost na rad u smenama',
  'vozačka dozvola B kategorije',
  'osnovno poznavanje rada na računaru',
  'komunikativnost i timski duh',
  'fizička spremnost',
  'znanje engleskog jezika je plus',
];

function escapeHtml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function srDescription(title, company, city, long) {
  const intro = `${company} traži osobu za poziciju ${title.toLowerCase()} u mestu ${city}. Ako tražiš stabilan posao i dobar kolektiv, javi nam se.`;
  if (!long) {
    return { html: `<p>${escapeHtml(intro)}</p>`, plain: intro };
  }
  const sections = [
    ['Šta ćeš raditi', pickSome(TASKS, 3, 5)],
    ['Šta tražimo', pickSome(NEEDS, 2, 4)],
    ['Šta nudimo', pickSome(PERKS, 3, 5)],
  ];
  const html = [
    `<p>${escapeHtml(intro)}</p>`,
    ...sections.map(
      ([h, items]) =>
        `<h3>${h}</h3><ul>${items.map((i) => `<li>${escapeHtml(i)}</li>`).join('')}</ul>`,
    ),
    '<p>Prijavi se preko Šljakama, javljamo se svima u roku od nekoliko dana.</p>',
  ].join('');
  const plain = [
    intro,
    ...sections.map(
      ([h, items]) => `${h}\n${items.map((i) => `- ${i}`).join('\n')}`,
    ),
    'Prijavi se preko Šljakama, javljamo se svima u roku od nekoliko dana.',
  ].join('\n\n');
  return { html, plain };
}

function enDescription(title, company, city) {
  const plain = `${company} is hiring a ${title} to work with an international team, based in ${city} or remotely. You get a competitive salary, flexible hours and a yearly learning budget. English is the working language.`;
  return { html: `<p>${escapeHtml(plain)}</p>`, plain };
}

function slugify(s) {
  return s
    .replace(/Đ/g, 'Dj')
    .replace(/đ/g, 'dj')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const usedShortIds = new Set();
function shortId() {
  const alphabet = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let id;
  do {
    id = Array.from({ length: 4 }, () => pick([...alphabet])).join('');
  } while (usedShortIds.has(id));
  usedShortIds.add(id);
  return id;
}

/** Big cities get most of the ads, like the real market. */
const CITY_WEIGHTS = [
  ['beograd', 30],
  ['novi-sad', 12],
  ['nis', 8],
  ['kragujevac', 5],
  ['subotica', 4],
  ['cacak', 3],
  ['kraljevo', 3],
  ['zrenjanin', 3],
  ['pancevo', 3],
  ['smederevo', 2],
  ['valjevo', 2],
  ['uzice', 2],
  ['leskovac', 2],
  ['sabac', 2],
  ['sombor', 2],
  ['novi-pazar', 2],
  ['vranje', 1],
  ['pirot', 1],
  ['zajecar', 1],
  ['jagodina', 1],
];
function pickCitySlug() {
  const total = CITY_WEIGHTS.reduce((s, [, w]) => s + w, 0);
  let r = rand() * total;
  for (const [slug, w] of CITY_WEIGHTS) {
    r -= w;
    if (r <= 0) return slug;
  }
  return 'beograd';
}

function assertLocal(url) {
  const host = new URL(url).hostname;
  if (!['localhost', '127.0.0.1', '::1', 'postgres'].includes(host)) {
    console.error(
      `[hireforge] Refusing to seed demo jobs into ${host}: local databases only.`,
    );
    process.exit(1);
  }
}

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error('[hireforge] DATABASE_URL is not set (check .env).');
    process.exit(1);
  }
  assertLocal(url);
  if (!Number.isInteger(COUNT) || COUNT < 1) {
    console.error('[hireforge] --count must be a positive whole number.');
    process.exit(1);
  }

  const client = new pg.Client({ connectionString: url });
  await client.connect();
  try {
    await client.query('BEGIN');
    const removed = await client.query(
      "DELETE FROM companies WHERE slug LIKE 'demo-%'",
    );
    if (remove) {
      await client.query('COMMIT');
      console.log(
        `[hireforge] Removed ${removed.rowCount} demo companies and their jobs.`,
      );
      return;
    }

    const {
      rows: [creator],
    } = await client.query(
      "SELECT id FROM users WHERE email = 'employer@hireforge.local'",
    );
    if (!creator) {
      throw new Error(
        'employer@hireforge.local is missing: run `pnpm db:seed` first.',
      );
    }

    for (const [slug, sr, en] of CATEGORIES) {
      await client.query(
        `INSERT INTO job_categories (slug, name_sr, name_en) VALUES ($1, $2, $3)
         ON CONFLICT (slug) DO NOTHING`,
        [slug, sr, en],
      );
    }
    const categoryIds = Object.fromEntries(
      (await client.query('SELECT slug, id FROM job_categories')).rows.map(
        (r) => [r.slug, r.id],
      ),
    );
    const cities = Object.fromEntries(
      (
        await client.query(
          "SELECT slug, id, name_sr FROM cities WHERE country_code = 'RS'",
        )
      ).rows.map((r) => [r.slug, r]),
    );
    if (!cities.beograd) {
      throw new Error('Cities are missing: run `pnpm db:seed:rs` first.');
    }

    const companies = [];
    for (const name of COMPANY_NAMES) {
      const {
        rows: [row],
      } = await client.query(
        `INSERT INTO companies (slug, legal_name, source, country_code, verified_at)
         VALUES ($1, $2, 'admin_lead', 'RS', $3) RETURNING id`,
        [`demo-${slugify(name)}`, name, chance(0.6) ? new Date() : null],
      );
      companies.push({ id: row.id, name });
    }

    const now = Date.now();
    const day = 24 * 60 * 60 * 1000;
    const employmentTypes = [
      'full_time',
      'full_time',
      'full_time',
      'part_time',
      'contract',
      'temporary',
      'internship',
    ];
    const workModels = ['onsite', 'hybrid', 'remote'];

    for (let i = 0; i < COUNT + ENDED; i++) {
      const ended = i >= COUNT;
      const english = chance(0.05);
      const [title, categorySlug, seniority, workModel] = pick(
        english ? EN_ROLES : ROLES,
      );
      const company = pick(companies);
      const city = cities[pickCitySlug()] ?? cities.beograd;
      const long = chance(0.75);
      const { html, plain } = english
        ? enDescription(title, company.name, city.name_sr)
        : srDescription(title, company.name, city.name_sr, long);
      const id = shortId();
      // Live ads were published in the last 28 days and run 30; ended ones ran out last week.
      const publishedAt = ended
        ? new Date(now - (35 + rand() * 20) * day)
        : new Date(now - rand() * 28 * day);
      const expiresAt = ended
        ? new Date(now - (1 + rand() * 6) * day)
        : new Date(publishedAt.getTime() + 30 * day);
      const external = chance(0.1);

      await client.query(
        `INSERT INTO jobs (
           company_id, created_by_user_id, title, description, description_html,
           description_plain, status, city_id, category_id, work_model,
           employment_type, seniority, submitted_at, published_at, expires_at,
           primary_language, slug, short_id, apply_mode, external_apply_url,
           featured, created_at, updated_at
         ) VALUES (
           $1, $2, $3, $4, $5, $6, $7::job_status, $8, $9, $10::work_model,
           $11::employment_type, $12::seniority_level, $13, $13, $14, $15, $16,
           $17, $18, $19, $20, $13, $13
         )`,
        [
          company.id,
          creator.id,
          title,
          plain,
          html,
          plain,
          ended ? 'expired' : 'published',
          // A few ads without a city or category, to see how the UI copes.
          chance(0.03) ? null : city.id,
          chance(0.03) ? null : categoryIds[categorySlug],
          chance(0.7) ? workModel : pick(workModels),
          pick(employmentTypes),
          chance(0.7) ? seniority : pick(['junior', 'mid', 'senior']),
          publishedAt,
          expiresAt,
          english ? 'en' : 'sr',
          `${slugify(`${title} ${city.name_sr}`).slice(0, 55).replace(/-+$/, '')}-${id}`,
          id,
          external ? 'external' : 'internal',
          external ? 'https://example.com/karijera' : null,
          !ended && chance(0.1),
        ],
      );
    }

    await client.query('COMMIT');
    console.log(
      `[hireforge] Seeded ${COUNT} live and ${ENDED} ended demo jobs across ${companies.length} demo companies.`,
    );
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
