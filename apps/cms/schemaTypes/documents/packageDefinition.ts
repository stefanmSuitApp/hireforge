import { defineArrayMember, defineField, defineType } from 'sanity';

const PACKAGE_CODES = [
  { title: 'TEZGA', value: 'tezga' },
  { title: 'Šljaka', value: 'sljaka' },
  { title: 'Sef', value: 'sef' },
  { title: 'Gazda', value: 'gazda' },
] as const;

/** Shown on package cards when this tier does not include the feature. */
const UPGRADE_FEATURE_KEYS = [
  { title: 'Featured listing', value: 'featured_listing' },
  { title: 'PNG creative URL', value: 'png_creative' },
  { title: 'Cross-border visibility', value: 'crossborder_visible' },
  { title: 'Social publish', value: 'social_publish' },
  { title: 'Paid social ads', value: 'paid_social_ads' },
  { title: 'Rich text / editor', value: 'editor_rich' },
  { title: 'Image in job description', value: 'image_upload' },
  { title: 'Hyperlinks in description', value: 'hyperlinks' },
] as const;

export const packageUpgradeMessageRow = defineType({
  name: 'packageUpgradeMessageRow',
  title: 'Upgrade message',
  type: 'object',
  fields: [
    defineField({
      name: 'featureKey',
      title: 'Feature',
      type: 'string',
      options: { list: [...UPGRADE_FEATURE_KEYS], layout: 'dropdown' },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'messageSr',
      title: 'Message (SR)',
      type: 'text',
      validation: (Rule) => Rule.required().max(2000),
    }),
    defineField({
      name: 'messageEn',
      title: 'Message (EN)',
      type: 'text',
      validation: (Rule) => Rule.required().max(2000),
    }),
  ],
});

export const packagePriceRow = defineType({
  name: 'packagePriceRow',
  title: 'Price tier',
  type: 'object',
  fields: [
    defineField({
      name: 'durationDays',
      title: 'Duration (days)',
      type: 'number',
      validation: (Rule) => Rule.required().integer().positive(),
    }),
    defineField({
      name: 'amountMinor',
      title: 'Amount (minor units, e.g. cents)',
      type: 'number',
      validation: (Rule) => Rule.required().integer().min(0),
    }),
    defineField({
      name: 'currency',
      title: 'ISO 4217',
      type: 'string',
      initialValue: 'EUR',
      validation: (Rule) => Rule.required().length(3).uppercase(),
    }),
  ],
});

export const packageEditorCapabilities = defineType({
  name: 'packageEditorCapabilities',
  title: 'Editor capabilities',
  type: 'object',
  fields: [
    defineField({ name: 'bold', type: 'boolean', initialValue: false }),
    defineField({ name: 'italic', type: 'boolean', initialValue: false }),
    defineField({ name: 'underline', type: 'boolean', initialValue: false }),
    defineField({ name: 'headings', type: 'boolean', initialValue: false }),
    defineField({ name: 'lists', type: 'boolean', initialValue: false }),
    defineField({ name: 'blockquote', type: 'boolean', initialValue: false }),
    defineField({ name: 'inline_code', type: 'boolean', initialValue: false }),
    defineField({ name: 'code_block', type: 'boolean', initialValue: false }),
    defineField({ name: 'text_align', type: 'boolean', initialValue: false }),
    defineField({ name: 'image_upload', type: 'boolean', initialValue: false }),
    defineField({ name: 'embed', type: 'boolean', initialValue: false }),
    defineField({ name: 'hyperlinks', type: 'boolean', initialValue: false }),
  ],
});

export const packageEntitlements = defineType({
  name: 'packageEntitlements',
  title: 'Entitlements',
  type: 'object',
  fields: [
    defineField({
      name: 'maxActiveJobs',
      title: 'Max active job ads',
      type: 'number',
      validation: (Rule) => Rule.required().integer().positive(),
    }),
    defineField({
      name: 'maxCitiesUnlimited',
      title: 'Unlimited cities',
      type: 'boolean',
      initialValue: false,
    }),
    defineField({
      name: 'maxCitiesCount',
      title: 'Max cities (when not unlimited)',
      type: 'number',
      validation: (Rule) => Rule.min(0).integer(),
    }),
    defineField({
      name: 'maxCharacters',
      title: 'Max body characters',
      type: 'number',
      validation: (Rule) => Rule.required().integer().positive(),
    }),
    defineField({
      name: 'featuredListing',
      type: 'boolean',
      initialValue: false,
    }),
    defineField({
      name: 'pngCreative',
      type: 'boolean',
      initialValue: false,
    }),
    defineField({
      name: 'socialPublish',
      type: 'boolean',
      initialValue: false,
    }),
    defineField({
      name: 'paidSocialAds',
      type: 'boolean',
      initialValue: false,
    }),
    defineField({
      name: 'crossborderVisible',
      type: 'boolean',
      initialValue: false,
    }),
    defineField({
      name: 'hyperlinksMaxCount',
      type: 'number',
      validation: (Rule) => Rule.required().integer().min(0),
    }),
    defineField({
      name: 'editor',
      type: 'packageEditorCapabilities',
      validation: (Rule) => Rule.required(),
    }),
  ],
  validation: (Rule) =>
    Rule.custom((value) => {
      const v = value as {
        maxCitiesUnlimited?: boolean;
        maxCitiesCount?: number;
      } | null;
      if (!v) {
        return true;
      }
      if (
        !v.maxCitiesUnlimited &&
        (v.maxCitiesCount === undefined || v.maxCitiesCount === null)
      ) {
        return 'Max cities count is required when cities are not unlimited';
      }
      return true;
    }),
});

export const packageDefinition = defineType({
  name: 'packageDefinition',
  title: 'Job ad package',
  type: 'document',
  fields: [
    defineField({
      name: 'code',
      title: 'Stable code',
      type: 'string',
      options: { list: [...PACKAGE_CODES], layout: 'radio' },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'isActive',
      title: 'Active (sellable)',
      type: 'boolean',
      initialValue: true,
    }),
    defineField({
      name: 'isEnterprise',
      title: 'Enterprise package',
      type: 'boolean',
      initialValue: false,
    }),
    defineField({
      name: 'displayOrder',
      title: 'Display order',
      type: 'number',
      validation: (Rule) => Rule.integer(),
    }),
    defineField({
      name: 'titleSr',
      title: 'Display title (SR)',
      description: 'Checkout / employer UI; falls back to app i18n if empty.',
      type: 'string',
      validation: (Rule) => Rule.max(200),
    }),
    defineField({
      name: 'titleEn',
      title: 'Display title (EN)',
      type: 'string',
      validation: (Rule) => Rule.max(200),
    }),
    defineField({
      name: 'marketingDescriptionSr',
      title: 'Short description (SR)',
      type: 'text',
      validation: (Rule) => Rule.max(4000),
    }),
    defineField({
      name: 'marketingDescriptionEn',
      title: 'Short description (EN)',
      type: 'text',
      validation: (Rule) => Rule.max(4000),
    }),
    {
      name: 'prices',
      title: 'Public price tiers',
      type: 'array',
      of: [defineArrayMember({ type: 'packagePriceRow' })],
    },
    defineField({
      name: 'entitlements',
      type: 'packageEntitlements',
      validation: (Rule) => Rule.required(),
    }),
    {
      name: 'upgradeMessages',
      title: 'Upgrade hints (when feature not in this package)',
      description:
        'Optional copy per feature code; employer checkout shows rows for features this package omits.',
      type: 'array',
      of: [defineArrayMember({ type: 'packageUpgradeMessageRow' })],
    },
  ],
  validation: (Rule) =>
    Rule.custom((fields) => {
      const f = fields as {
        titleSr?: string;
        titleEn?: string;
        marketingDescriptionSr?: string;
        marketingDescriptionEn?: string;
      };
      if (!f.titleSr?.trim() || !f.titleEn?.trim()) {
        return 'Display titles are required in both SR and EN';
      }
      const ms = f.marketingDescriptionSr?.trim();
      const me = f.marketingDescriptionEn?.trim();
      if (!ms || !me) {
        return 'Short descriptions are required in both SR and EN';
      }
      return true;
    }),
  preview: {
    select: { code: 'code', isEnterprise: 'isEnterprise' },
    prepare({ code, isEnterprise }) {
      return {
        title: code ? String(code).toUpperCase() : 'Package',
        subtitle: isEnterprise ? 'Enterprise' : 'Self-serve',
      };
    },
  },
});
