import { defineArrayMember, defineField, defineType } from 'sanity';

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const slugMessage = 'Use lowercase latin letters, numbers, and hyphen (e.g. it, novi-sad)';

export const homeJobsDiscovery = defineType({
  name: 'homeJobsDiscovery',
  title: 'Home — job discovery rails',
  type: 'document',
  fields: [
    defineField({
      name: 'categorySpotlights',
      title: 'Category spotlight tiles (homepage)',
      description:
        'Exactly 10 tiles. Slugs must exist in Postgres `job_categories`. Marketing-only — filters still use the database.',
      type: 'array' as const,
      validation: (Rule) =>
        Rule.required().min(10).max(10).error('Provide exactly 10 category rows'),
      of: [
        defineArrayMember({
          type: 'object',
          name: 'homeDiscoveryCategoryRow',
          fields: [
            defineField({
              name: 'categorySlug',
              title: 'Category slug',
              type: 'string',
              validation: (Rule) =>
                Rule.required()
                  .regex(slugPattern, { name: 'slug', invert: false })
                  .error(slugMessage),
            }),
            defineField({
              name: 'image',
              title: 'Image',
              type: 'image',
              options: { hotspot: true },
              validation: (Rule) => Rule.required(),
            }),
            defineField({
              name: 'label',
              title: 'Display label override (optional)',
              description:
                'If empty, the app uses Serbian/English category names from the API for the current locale.',
              type: 'localeString',
            }),
          ],
          preview: {
            select: { slug: 'categorySlug', media: 'image' },
            prepare({ slug, media }: { slug?: string; media?: unknown }) {
              return {
                title: slug || 'Category',
                subtitle: 'Category tile',
                media: media as never,
              };
            },
          },
        }),
      ],
    }),
    defineField({
      name: 'citySpotlights',
      title: 'City spotlight tiles (homepage)',
      description:
        'Exactly 5 tiles. Slugs must exist in Postgres `cities`. Marketing-only — city dropdowns stay DB-driven.',
      type: 'array' as const,
      validation: (Rule) =>
        Rule.required().min(5).max(5).error('Provide exactly 5 city rows'),
      of: [
        defineArrayMember({
          type: 'object',
          name: 'homeDiscoveryCityRow',
          fields: [
            defineField({
              name: 'citySlug',
              title: 'City slug',
              type: 'string',
              validation: (Rule) =>
                Rule.required()
                  .regex(slugPattern, { name: 'slug', invert: false })
                  .error(slugMessage),
            }),
            defineField({
              name: 'image',
              title: 'Image',
              type: 'image',
              options: { hotspot: true },
              validation: (Rule) => Rule.required(),
            }),
            defineField({
              name: 'label',
              title: 'Display label override (optional)',
              description:
                'If empty, the app uses Serbian/English city names from the API for the current locale.',
              type: 'localeString',
            }),
          ],
          preview: {
            select: { slug: 'citySlug', media: 'image' },
            prepare({
              slug,
              media,
            }: {
              slug?: string;
              media?: unknown;
            }) {
              return {
                title: slug || 'City',
                subtitle: 'City tile',
                media: media as never,
              };
            },
          },
        }),
      ],
    }),
  ],
  preview: {
    prepare() {
      return { title: 'Home job discovery rails' };
    },
  },
});
