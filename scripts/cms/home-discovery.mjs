/**
 * Home tiles (categories + cities) for `homeJobsDiscovery`, in Stefan's order
 * (2026-10-29). Slugs match drizzle/0038 (categories) and the cities table.
 * `explore` is the whole button text, declined ("Istraži Suboticu").
 * Images: home-images/categories/<slug>.png (generate-category-images.mjs)
 * and home-images/cities/<slug>.jpg; a missing file leaves the tile without
 * an image.
 */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const imagesDir = join(dirname(fileURLToPath(import.meta.url)), 'home-images');

export const HOME_CATEGORIES = [
  {
    slug: 'trgovina-i-prodaja',
    sr: 'Trgovina i prodaja',
    en: 'Retail & Sales',
    exploreSr: 'Istraži trgovinu i prodaju',
    exploreEn: 'Explore Retail & Sales',
    introSr:
      'Oglasi za prodavce, kasire, komercijaliste i poslovođe u radnjama, marketima i salonima.',
    introEn:
      'Jobs for shop assistants, cashiers, sales reps and store managers in shops, supermarkets and showrooms.',
  },
  {
    slug: 'proizvodnja',
    sr: 'Proizvodnja',
    en: 'Manufacturing',
    exploreSr: 'Istraži proizvodnju',
    exploreEn: 'Explore Manufacturing',
    introSr:
      'Poslovi u fabrikama i pogonima: operateri mašina, radnici na liniji, kontrola kvaliteta i održavanje.',
    introEn:
      'Factory and plant jobs: machine operators, line workers, quality control and maintenance.',
  },
  {
    slug: 'usluge-i-zanati',
    sr: 'Usluge i zanati',
    en: 'Services & Skilled Trades',
    exploreSr: 'Istraži usluge i zanate',
    exploreEn: 'Explore Services & Skilled Trades',
    introSr:
      'Električari, vodoinstalateri, automehaničari, frizeri i drugi majstori i uslužni poslovi.',
    introEn:
      'Electricians, plumbers, mechanics, hairdressers and other skilled trades and service jobs.',
  },
  {
    slug: 'ugostiteljstvo-i-turizam',
    sr: 'Ugostiteljstvo i turizam',
    en: 'Hospitality & Tourism',
    exploreSr: 'Istraži ugostiteljstvo i turizam',
    exploreEn: 'Explore Hospitality & Tourism',
    introSr:
      'Kuvari, konobari, šankeri, recepcioneri i poslovi u hotelima, restoranima i turističkim agencijama.',
    introEn:
      'Cooks, waiters, bartenders, receptionists and jobs in hotels, restaurants and travel agencies.',
  },
  {
    slug: 'gradjevinarstvo-i-arhitektura',
    sr: 'Građevinarstvo i arhitektura',
    en: 'Construction & Architecture',
    exploreSr: 'Istraži građevinarstvo i arhitekturu',
    exploreEn: 'Explore Construction & Architecture',
    introSr:
      'Poslovi na gradilištima i u projektnim biroima: zidari, tesari, armirači, inženjeri i arhitekte.',
    introEn:
      'Jobs on building sites and in design offices: bricklayers, carpenters, steel fixers, engineers and architects.',
  },
  {
    slug: 'transport-i-logistika',
    sr: 'Transport i logistika',
    en: 'Transportation & Logistics',
    exploreSr: 'Istraži transport i logistiku',
    exploreEn: 'Explore Transportation & Logistics',
    introSr:
      'Vozači, dostavljači, magacioneri, viljuškaristi i dispečeri u transportu i skladištima.',
    introEn:
      'Drivers, couriers, warehouse workers, forklift operators and dispatchers in transport and warehousing.',
  },
  {
    slug: 'informacione-tehnologije',
    sr: 'Informacione tehnologije',
    en: 'Information Technology (IT)',
    exploreSr: 'Istraži informacione tehnologije',
    exploreEn: 'Explore Information Technology',
    introSr:
      'Programeri, testeri, sistem administratori, podrška korisnicima i drugi poslovi u IT-u.',
    introEn:
      'Developers, testers, system administrators, user support and other IT jobs.',
  },
  {
    slug: 'administracija',
    sr: 'Administracija',
    en: 'Administration & Office Support',
    exploreSr: 'Istraži administraciju',
    exploreEn: 'Explore Administration & Office Support',
    introSr:
      'Administrativni radnici, poslovni sekretari, recepcija i podrška u kancelariji.',
    introEn:
      'Administrative assistants, office secretaries, front desk and office support.',
  },
  {
    slug: 'zdravstvo-i-socijalna-zastita',
    sr: 'Zdravstvo i socijalna zaštita',
    en: 'Healthcare & Social Care',
    exploreSr: 'Istraži zdravstvo i socijalnu zaštitu',
    exploreEn: 'Explore Healthcare & Social Care',
    introSr:
      'Medicinske sestre, negovatelji, farmaceuti, lekari i poslovi u socijalnoj zaštiti.',
    introEn:
      'Nurses, caregivers, pharmacists, doctors and jobs in social care.',
  },
  {
    slug: 'finansije-i-racunovodstvo',
    sr: 'Finansije i računovodstvo',
    en: 'Finance & Accounting',
    exploreSr: 'Istraži finansije i računovodstvo',
    exploreEn: 'Explore Finance & Accounting',
    introSr:
      'Knjigovođe, računovođe, finansijski analitičari i poslovi u bankama i osiguranju.',
    introEn:
      'Bookkeepers, accountants, financial analysts and jobs in banking and insurance.',
  },
];

export const HOME_CITIES = [
  {
    slug: 'beograd',
    sr: 'Beograd',
    en: 'Belgrade',
    exploreSr: 'Istraži Beograd',
    exploreEn: 'Explore Belgrade',
    introSr: 'Svi aktuelni oglasi za posao u Beogradu, na jednom mestu.',
    introEn: 'Every current job opening in Belgrade, in one place.',
  },
  {
    slug: 'novi-sad',
    sr: 'Novi Sad',
    en: 'Novi Sad',
    exploreSr: 'Istraži Novi Sad',
    exploreEn: 'Explore Novi Sad',
    introSr: 'Svi aktuelni oglasi za posao u Novom Sadu, na jednom mestu.',
    introEn: 'Every current job opening in Novi Sad, in one place.',
  },
  {
    slug: 'nis',
    sr: 'Niš',
    en: 'Niš',
    exploreSr: 'Istraži Niš',
    exploreEn: 'Explore Niš',
    introSr: 'Svi aktuelni oglasi za posao u Nišu, na jednom mestu.',
    introEn: 'Every current job opening in Niš, in one place.',
  },
  {
    slug: 'kragujevac',
    sr: 'Kragujevac',
    en: 'Kragujevac',
    exploreSr: 'Istraži Kragujevac',
    exploreEn: 'Explore Kragujevac',
    introSr: 'Svi aktuelni oglasi za posao u Kragujevcu, na jednom mestu.',
    introEn: 'Every current job opening in Kragujevac, in one place.',
  },
  {
    slug: 'subotica',
    sr: 'Subotica',
    en: 'Subotica',
    exploreSr: 'Istraži Suboticu',
    exploreEn: 'Explore Subotica',
    introSr: 'Svi aktuelni oglasi za posao u Subotici, na jednom mestu.',
    introEn: 'Every current job opening in Subotica, in one place.',
  },
];

/** Uploads a tile image (Sanity dedupes identical files) or returns null. */
async function uploadImage(client, file) {
  if (!existsSync(file)) return null;
  const asset = await client.assets.upload('image', readFileSync(file), {
    filename: file.split('/').pop(),
  });
  return { _type: 'image', asset: { _type: 'reference', _ref: asset._id } };
}

function row(kind, item, i, image) {
  return {
    _key: `${kind}-${i + 1}`,
    [kind === 'cat' ? 'categorySlug' : 'citySlug']: item.slug,
    label: { _type: 'localeString', sr: item.sr, en: item.en },
    exploreLabel: {
      _type: 'localeString',
      sr: item.exploreSr,
      en: item.exploreEn,
    },
    intro: { _type: 'localeText', sr: item.introSr, en: item.introEn },
    ...(image ? { image } : {}),
  };
}

export async function homeDiscoveryDocument(client) {
  const categorySpotlights = [];
  for (const [i, c] of HOME_CATEGORIES.entries()) {
    const image = await uploadImage(
      client,
      join(imagesDir, 'categories', `${c.slug}.png`),
    );
    categorySpotlights.push(row('cat', c, i, image));
  }
  const citySpotlights = [];
  for (const [i, c] of HOME_CITIES.entries()) {
    const image = await uploadImage(
      client,
      join(imagesDir, 'cities', `${c.slug}.jpg`),
    );
    citySpotlights.push(row('city', c, i, image));
  }
  return {
    _id: 'homeJobsDiscovery',
    _type: 'homeJobsDiscovery',
    categorySpotlights,
    citySpotlights,
  };
}
