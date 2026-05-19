import { defineField, defineType } from 'sanity';

/** Homepage banner slot (embedded on `campaignCalendar`). */
export const campaignSlot = defineType({
  name: 'campaignSlot',
  title: 'Campaign slot',
  type: 'object',
  fields: [
    defineField({
      name: 'promoCode',
      title: 'Promo code',
      type: 'string',
      description: 'Marketing reference only (optional for editors).',
    }),
    defineField({
      name: 'categorySlug',
      title: 'Jobs category slug',
      type: 'string',
      description:
        'When set and link path empty, links to /jobs?category=<slug>.',
    }),
    defineField({
      name: 'bannerSr',
      title: 'Banner text (SR)',
      type: 'string',
      validation: (Rule) => Rule.required().max(400),
    }),
    defineField({
      name: 'bannerEn',
      title: 'Banner text (EN)',
      type: 'string',
      validation: (Rule) => Rule.required().max(400),
    }),
    defineField({
      name: 'linkPath',
      title: 'Custom link path',
      type: 'string',
      description:
        'Optional site-relative path (e.g. /jobs or /jobs?category=foo).',
    }),
    defineField({
      name: 'startsAt',
      title: 'Starts at',
      type: 'datetime',
    }),
    defineField({
      name: 'endsAt',
      title: 'Ends at',
      type: 'datetime',
    }),
  ],
});
