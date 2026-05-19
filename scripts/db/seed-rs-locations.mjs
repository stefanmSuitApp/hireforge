#!/usr/bin/env node
/**
 * Upserts curated Serbian districts + cities/municipalities from
 * `scripts/db/data/rs-municipalities.json` (no external API).
 *
 * Usage: pnpm db:seed:rs
 */
import { readFileSync } from 'node:fs';
import { config } from 'dotenv';
import pg from 'pg';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
config({ path: join(root, '.env') });

const dataPath = join(
  dirname(fileURLToPath(import.meta.url)),
  'data',
  'rs-municipalities.json',
);

function slugify(s) {
  return String(s ?? '')
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/** English district names (official Serbian `district` string → EN). */
const DISTRICT_NAME_EN = {
  'Grad Beograd': 'City of Belgrade',
  'Severnobački okrug': 'North Bačka District',
  'Severnobanatski okrug': 'North Banat District',
  'Zapadnobački okrug': 'West Bačka District',
  'Južnobački okrug': 'South Bačka District',
  'Srednjobanatski okrug': 'Central Banat District',
  'Južnobanatski okrug': 'South Banat District',
  'Sremski okrug': 'Srem District',
  'Mačvanski okrug': 'Mačva District',
  'Kolubarski okrug': 'Kolubara District',
  'Podunavski okrug': 'Podunavlje District',
  'Braničevski okrug': 'Braničevo District',
  'Šumadijski okrug': 'Šumadija District',
  'Pomoravski okrug': 'Pomoravlje District',
  'Borski okrug': 'Bor District',
  'Zaječarski okrug': 'Zaječar District',
  'Zlatiborski okrug': 'Zlatibor District',
  'Moravički okrug': 'Moravica District',
  'Raški okrug': 'Raška District',
  'Rasinski okrug': 'Rasina District',
  'Nišavski okrug': 'Nišava District',
  'Toplički okrug': 'Toplica District',
  'Pirotski okrug': 'Pirot District',
  'Jablanički okrug': 'Jablanica District',
  'Pčinjski okrug': 'Pčinja District',
};

function districtNameEn(nameSr) {
  const en = DISTRICT_NAME_EN[nameSr];
  if (en == null) {
    console.warn(
      `[hireforge] Missing English name for district "${nameSr}" — set name_en to null.`,
    );
  }
  return en ?? null;
}

/** English city/municipality label: same as Serbian except the capital. */
function cityNameEn(nameSr) {
  return nameSr === 'Beograd' ? 'Belgrade' : nameSr;
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (!databaseUrl) {
    console.error('[hireforge] DATABASE_URL is not set.');
    process.exit(1);
  }

  const raw = readFileSync(dataPath, 'utf8');
  const rows = JSON.parse(raw);
  if (!Array.isArray(rows)) {
    throw new Error('rs-municipalities.json must be a JSON array');
  }

  const client = new pg.Client({ connectionString: databaseUrl });
  await client.connect();

  try {
    await client.query('BEGIN');

    const districtNames = new Map();
    for (const r of rows) {
      const dslug = slugify(r.district);
      if (!dslug) throw new Error(`Bad district for ${JSON.stringify(r)}`);
      if (!districtNames.has(dslug)) {
        districtNames.set(dslug, r.district);
      }
    }

    for (const [slug, nameSr] of districtNames) {
      await client.query(
        `INSERT INTO districts (slug, name_sr, name_en)
         VALUES ($1, $2, $3)
         ON CONFLICT (slug) DO UPDATE SET
           name_sr = EXCLUDED.name_sr,
           name_en = EXCLUDED.name_en`,
        [slug, nameSr, districtNameEn(nameSr)],
      );
    }

    const { rows: existingCities } = await client.query(
      `SELECT slug, name_sr, district_slug FROM cities WHERE country_code = $1`,
      ['RS'],
    );
    const usedSlugs = new Set(existingCities.map((c) => c.slug));
    const slugByNameDistrict = new Map();
    for (const c of existingCities) {
      const d = c.district_slug ?? '';
      slugByNameDistrict.set(`${c.name_sr}\0${d}`, c.slug);
    }

    function allocateCitySlug(name) {
      let base = slugify(name);
      if (!base) base = 'lokacija';
      let s = base;
      let n = 0;
      while (usedSlugs.has(s)) {
        n += 1;
        s = `${base}-${n}`;
      }
      usedSlugs.add(s);
      return s;
    }

    for (const r of rows) {
      const districtSlug = slugify(r.district);
      const mapKey = `${r.name}\0${districtSlug}`;
      let citySlug = slugByNameDistrict.get(mapKey);
      if (!citySlug) {
        const legacyKey = `${r.name}\0`;
        citySlug = slugByNameDistrict.get(legacyKey);
        if (citySlug) {
          slugByNameDistrict.set(mapKey, citySlug);
        }
      }
      if (!citySlug) {
        citySlug = allocateCitySlug(r.name);
        slugByNameDistrict.set(mapKey, citySlug);
      }

      const postal =
        typeof r.postalCode === 'string' && r.postalCode.trim()
          ? r.postalCode.trim()
          : null;

      await client.query(
        `INSERT INTO cities (slug, country_code, name_sr, name_en, district_slug, is_city, postal_code)
         VALUES ($1, 'RS', $2, $3, $4, $5, $6)
         ON CONFLICT (slug, country_code) DO UPDATE SET
           name_sr = EXCLUDED.name_sr,
           name_en = EXCLUDED.name_en,
           district_slug = EXCLUDED.district_slug,
           is_city = EXCLUDED.is_city,
           postal_code = EXCLUDED.postal_code`,
        [
          citySlug,
          r.name,
          cityNameEn(r.name),
          districtSlug,
          r.isCity === true,
          postal,
        ],
      );
    }

    await client.query('COMMIT');
    console.log(
      `[hireforge] Upserted ${districtNames.size} districts and ${rows.length} locations.`,
    );
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
