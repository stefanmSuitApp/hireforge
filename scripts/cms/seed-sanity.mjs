#!/usr/bin/env node
/**
 * Seeds baseline Sanity CMS content used by `apps/web`:
 * - singleton `siteSettings` (`_id: siteSettings`)
 * - singleton `navigation` (`_id: navigation`)
 * - sample `employerBranding` docs keyed by company slug
 * - optional sample `editorialPage`
 * - `campaignCalendar` document for homepage promo slots
 * - `cvTemplate` docs for the CV builder picker (`klasican`, `moderan`, `minimalan`)
 *
 * Usage: pnpm cms:seed
 */
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { createClient } from '@sanity/client';
import { config } from 'dotenv';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
config({ path: join(root, '.env') });

function requiredEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`[hireforge] Missing required env: ${name}`);
  }
  return value;
}

async function main() {
  const projectId =
    process.env.SANITY_PROJECT_ID?.trim() ||
    process.env.NEXT_PUBLIC_SANITY_PROJECT_ID?.trim() ||
    '';
  const dataset =
    process.env.SANITY_DATASET?.trim() ||
    process.env.NEXT_PUBLIC_SANITY_DATASET?.trim() ||
    '';
  const token = requiredEnv('SANITY_API_WRITE_TOKEN');

  if (!projectId || !dataset) {
    throw new Error(
      '[hireforge] Missing SANITY_PROJECT_ID / SANITY_DATASET (or NEXT_PUBLIC_SANITY_*).',
    );
  }

  const client = createClient({
    projectId,
    dataset,
    apiVersion: '2024-01-01',
    token,
    useCdn: false,
  });

  const tx = client.transaction();

  tx.createOrReplace({
    _id: 'siteSettings',
    _type: 'siteSettings',
    siteName: { _type: 'localeString', sr: 'Hireforge', en: 'Hireforge' },
    defaultSeoTitle: 'Hireforge',
    defaultSeoDescription: {
      _type: 'localeText',
      sr: 'Moderno zapošljavanje u Srbiji: transparentni oglasi i provereni poslodavci.',
      en: 'Modern hiring in Serbia: transparent listings and verified employers.',
    },
    footerTagline: {
      _type: 'localeText',
      sr: 'Platforma za zapošljavanje zasnovana na poverenju i jasnoći.',
      en: 'Trusted hiring platform for candidates and employers across Serbia.',
    },
    supportContact: {
      email: 'support@hireforge.example',
      label: {
        _type: 'localeString',
        sr: 'Kontakt podrške',
        en: 'Support contact',
      },
    },
  });

  tx.createOrReplace({
    _id: 'navigation',
    _type: 'navigation',
    items: [
      {
        _type: 'navLink',
        label: { _type: 'localeString', sr: 'Početna', en: 'Home' },
        href: '/',
      },
      {
        _type: 'navLink',
        label: { _type: 'localeString', sr: 'Poslovi', en: 'Jobs' },
        href: '/jobs',
      },
      {
        _type: 'navLink',
        label: { _type: 'localeString', sr: 'Poslodavci', en: 'Employers' },
        href: '/employers',
      },
      {
        _type: 'navLink',
        label: { _type: 'localeString', sr: 'O platformi', en: 'About' },
        href: '/about',
      },
    ],
  });

  tx.createOrReplace({
    _id: 'campaign-calendar',
    _type: 'campaignCalendar',
    internalName: 'Default',
    notes: 'Homepage promo slots (Step 14 — Nedelja besplatnih oglasa).',
    slots: [
      {
        _key: 'slot-home-default',
        promoCode: 'NEDELJA-FREE',
        categorySlug: '',
        bannerSr: 'Nedelja besplatnih oglasa — pogledajte aktuelne ponude.',
        bannerEn: 'Free listings week — explore open roles.',
        linkPath: '/jobs',
        startsAt: '2026-01-01T00:00:00.000Z',
        endsAt: '2030-12-31T23:59:59.999Z',
      },
    ],
  });

  tx.createOrReplace({
    _id: 'editorial-page-about-hireforge',
    _type: 'editorialPage',
    title: {
      _type: 'localeString',
      sr: 'O Hireforge-u',
      en: 'About Hireforge',
    },
    slug: { _type: 'slug', current: 'about-hireforge' },
    excerpt: {
      _type: 'localeText',
      sr: 'Zašto Hireforge postoji i na šta ciljamo.',
      en: 'Why Hireforge exists and what we optimize for.',
    },
    seoTitle: {
      _type: 'localeString',
      sr: 'O Hireforge-u',
      en: 'About Hireforge',
    },
    seoDescription: {
      _type: 'localeText',
      sr: 'Kako Hireforge pristupa pouzdanom i transparentnom zapošljavanju.',
      en: 'Learn how Hireforge approaches trustworthy and transparent hiring.',
    },
    body: [
      {
        _type: 'block',
        style: 'normal',
        markDefs: [],
        children: [
          {
            _type: 'span',
            marks: [],
            text: 'Hireforge focuses on clear job listings, faster hiring workflows, and trusted employer profiles.',
          },
        ],
      },
    ],
  });

  tx.createOrReplace({
    _id: 'employer-branding-devlegion',
    _type: 'employerBranding',
    companySlug: 'devlegion',
    heroHeadline: {
      _type: 'localeString',
      sr: 'Gradimo proizvode koji rešavaju realne probleme',
      en: 'Build products that matter',
    },
    heroSubhead: {
      _type: 'localeText',
      sr: 'Distribuirani tim koji razvija praktičan softver za modernizaciju zapošljavanja i operacija.',
      en: 'We are a distributed team building practical software for modern hiring and operations.',
    },
    benefits: [
      {
        _type: 'employerBenefitLocalized',
        title: {
          _type: 'localeString',
          sr: 'Fleksibilna saradnja u remote-first modelu',
          en: 'Flexible remote-first collaboration',
        },
      },
      {
        _type: 'employerBenefitLocalized',
        title: {
          _type: 'localeString',
          sr: 'Ownership i brzi iterativni ciklusi',
          en: 'Ownership and fast iteration cycles',
        },
      },
    ],
    testimonials: [
      {
        _type: 'employerTestimonialLocalized',
        quote: {
          _type: 'localeText',
          sr: 'Velika autonomija tima i direktan feedback loop sa proizvodom.',
          en: 'Great team autonomy and very direct product feedback loops.',
        },
        attribution: {
          _type: 'localeString',
          sr: 'Član inženjerskog tima',
          en: 'Engineering teammate',
        },
        role: { _type: 'localeString', sr: 'Backend', en: 'Backend' },
      },
    ],
  });

  tx.createOrReplace({
    _id: 'package-tezga',
    _type: 'packageDefinition',
    code: 'tezga',
    isActive: true,
    isEnterprise: false,
    displayOrder: 1,
    prices: [
      {
        _type: 'packagePriceRow',
        durationDays: 15,
        amountMinor: 3000,
        currency: 'EUR',
      },
      {
        _type: 'packagePriceRow',
        durationDays: 30,
        amountMinor: 3700,
        currency: 'EUR',
      },
    ],
    entitlements: {
      _type: 'packageEntitlements',
      maxActiveJobs: 1,
      maxCitiesUnlimited: false,
      maxCitiesCount: 1,
      maxCharacters: 400,
      featuredListing: false,
      pngCreative: false,
      socialPublish: false,
      paidSocialAds: false,
      crossborderVisible: false,
      hyperlinksMaxCount: 1,
      editor: {
        _type: 'packageEditorCapabilities',
        bold: false,
        italic: false,
        underline: false,
        headings: false,
        lists: false,
        blockquote: false,
        inline_code: false,
        code_block: false,
        text_align: false,
        image_upload: false,
        embed: false,
        hyperlinks: true,
      },
    },
  });

  tx.createOrReplace({
    _id: 'package-sljaka',
    _type: 'packageDefinition',
    code: 'sljaka',
    isActive: true,
    isEnterprise: false,
    displayOrder: 2,
    prices: [
      {
        _type: 'packagePriceRow',
        durationDays: 15,
        amountMinor: 4000,
        currency: 'EUR',
      },
      {
        _type: 'packagePriceRow',
        durationDays: 30,
        amountMinor: 4700,
        currency: 'EUR',
      },
    ],
    entitlements: {
      _type: 'packageEntitlements',
      maxActiveJobs: 1,
      maxCitiesUnlimited: false,
      maxCitiesCount: 3,
      maxCharacters: 4000,
      featuredListing: false,
      pngCreative: false,
      socialPublish: true,
      paidSocialAds: false,
      crossborderVisible: false,
      hyperlinksMaxCount: 3,
      editor: {
        _type: 'packageEditorCapabilities',
        bold: true,
        italic: true,
        underline: true,
        headings: true,
        lists: true,
        blockquote: false,
        inline_code: false,
        code_block: false,
        text_align: false,
        image_upload: false,
        embed: false,
        hyperlinks: true,
      },
    },
  });

  tx.createOrReplace({
    _id: 'package-sef',
    _type: 'packageDefinition',
    code: 'sef',
    isActive: true,
    isEnterprise: false,
    displayOrder: 3,
    titleSr: 'ŠEF',
    titleEn: 'ŠEF',
    marketingDescriptionSr:
      'Više istovremenih oglasa, istaknut prikaz, kreativni PNG i plaćeno oglašavanje na društvenim mrežama.',
    marketingDescriptionEn:
      'Multiple concurrent listings, featured placement, PNG creative, and paid social distribution.',
    prices: [
      {
        _type: 'packagePriceRow',
        durationDays: 30,
        amountMinor: 5500,
        currency: 'EUR',
      },
    ],
    entitlements: {
      _type: 'packageEntitlements',
      maxActiveJobs: 3,
      maxCitiesUnlimited: true,
      maxCharacters: 8000,
      featuredListing: true,
      pngCreative: true,
      socialPublish: true,
      paidSocialAds: true,
      crossborderVisible: true,
      hyperlinksMaxCount: 5,
      editor: {
        _type: 'packageEditorCapabilities',
        bold: true,
        italic: true,
        underline: true,
        headings: true,
        lists: true,
        blockquote: true,
        inline_code: true,
        code_block: true,
        text_align: true,
        image_upload: true,
        embed: false,
        hyperlinks: true,
      },
    },
  });

  tx.createOrReplace({
    _id: 'package-gazda',
    _type: 'packageDefinition',
    code: 'gazda',
    isActive: true,
    isEnterprise: true,
    displayOrder: 4,
    prices: [],
    entitlements: {
      _type: 'packageEntitlements',
      maxActiveJobs: 10,
      maxCitiesUnlimited: true,
      maxCharacters: 20000,
      featuredListing: true,
      pngCreative: true,
      socialPublish: true,
      paidSocialAds: true,
      crossborderVisible: true,
      hyperlinksMaxCount: 10,
      editor: {
        _type: 'packageEditorCapabilities',
        bold: true,
        italic: true,
        underline: true,
        headings: true,
        lists: true,
        blockquote: true,
        inline_code: true,
        code_block: true,
        text_align: true,
        image_upload: true,
        embed: true,
        hyperlinks: true,
      },
    },
  });

  // Home jobs discovery rails (category + city spotlights)
  tx.createOrReplace({
    _id: 'homeJobsDiscovery',
    _type: 'homeJobsDiscovery',
    categorySpotlights: [
      { _key: 'cat-1', categorySlug: 'it', label: { _type: 'localeString', sr: 'IT', en: 'IT' } },
      { _key: 'cat-2', categorySlug: 'marketing', label: { _type: 'localeString', sr: 'Marketing', en: 'Marketing' } },
      { _key: 'cat-3', categorySlug: 'finansije', label: { _type: 'localeString', sr: 'Finansije', en: 'Finance' } },
      { _key: 'cat-4', categorySlug: 'pravo', label: { _type: 'localeString', sr: 'Pravo', en: 'Law' } },
      { _key: 'cat-5', categorySlug: 'administracija', label: { _type: 'localeString', sr: 'Administracija', en: 'Administration' } },
      { _key: 'cat-6', categorySlug: 'inzenjerstvo', label: { _type: 'localeString', sr: 'Inženjerstvo', en: 'Engineering' } },
      { _key: 'cat-7', categorySlug: 'prodaja', label: { _type: 'localeString', sr: 'Prodaja', en: 'Sales' } },
      { _key: 'cat-8', categorySlug: 'dizajn', label: { _type: 'localeString', sr: 'Dizajn', en: 'Design' } },
      { _key: 'cat-9', categorySlug: 'zdravstvo', label: { _type: 'localeString', sr: 'Zdravstvo', en: 'Healthcare' } },
      { _key: 'cat-10', categorySlug: 'ugostiteljstvo', label: { _type: 'localeString', sr: 'Ugostiteljstvo', en: 'Hospitality' } },
    ],
    citySpotlights: [
      { _key: 'city-1', citySlug: 'beograd', label: { _type: 'localeString', sr: 'Beograd', en: 'Belgrade' } },
      { _key: 'city-2', citySlug: 'novi-sad', label: { _type: 'localeString', sr: 'Novi Sad', en: 'Novi Sad' } },
      { _key: 'city-3', citySlug: 'nis', label: { _type: 'localeString', sr: 'Niš', en: 'Niš' } },
      { _key: 'city-4', citySlug: 'kragujevac', label: { _type: 'localeString', sr: 'Kragujevac', en: 'Kragujevac' } },
      { _key: 'city-5', citySlug: 'subotica', label: { _type: 'localeString', sr: 'Subotica', en: 'Subotica' } },
    ],
  });

  tx.createOrReplace({
    _id: 'refundPolicy',
    _type: 'refundPolicy',
    title: {
      _type: 'localeString',
      sr: 'Politika povraćaja',
      en: 'Refund policy',
    },
    summary: {
      _type: 'localeText',
      sr: 'Stub teksta — zameni pravnim sadržajem pre produkcije.',
      en: 'Stub copy — replace with legal content before launch.',
    },
  });

  tx.createOrReplace({
    _id: 'campaignCalendar',
    _type: 'campaignCalendar',
    internalName: 'Nedelja besplatnih oglasa (stub)',
    notes:
      'Start / end dates and verticals land here once ops defines the calendar.',
  });

  tx.createOrReplace({
    _id: 'cvTemplate-klasican',
    _type: 'cvTemplate',
    code: 'klasican',
    name: {
      _type: 'localeString',
      sr: 'Klasičan',
      en: 'Classic',
    },
    description: {
      _type: 'localeText',
      sr: 'Tradicionalni raspored sa jasnim sekcijama.',
      en: 'Traditional layout with clear sections.',
    },
  });

  tx.createOrReplace({
    _id: 'cvTemplate-moderan',
    _type: 'cvTemplate',
    code: 'moderan',
    name: {
      _type: 'localeString',
      sr: 'Moderan',
      en: 'Modern',
    },
    description: {
      _type: 'localeText',
      sr: 'Bočna traka za veštine i naglašen vizuelni ritam.',
      en: 'Sidebar for skills and a stronger visual rhythm.',
    },
  });

  tx.createOrReplace({
    _id: 'cvTemplate-minimalan',
    _type: 'cvTemplate',
    code: 'minimalan',
    name: {
      _type: 'localeString',
      sr: 'Minimalan',
      en: 'Minimal',
    },
    description: {
      _type: 'localeText',
      sr: 'Čist tipografski fokus, malo dekoracije.',
      en: 'Clean typography with minimal decoration.',
    },
  });

  await tx.commit();
  console.log('[hireforge] Seeded Sanity CMS baseline documents');
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
