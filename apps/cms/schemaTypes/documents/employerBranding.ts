import { defineArrayMember, defineField, defineType } from 'sanity';

/** Must stay aligned with Postgres `companies.slug` (public company URL). */
const companySlugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const SANITY_API_VERSION = '2024-01-01';

export const employerBranding = defineType({
  name: 'employerBranding',
  title: 'Employer branding',
  type: 'document',
  fields: [
    defineField({
      name: 'companySlug',
      title: 'Company slug',
      description:
        'Same slug as in the transactional app (company public profile URL).',
      type: 'string',
      validation: (Rule) =>
        Rule.required().custom(async (value, context) => {
          if (typeof value !== 'string' || !companySlugPattern.test(value)) {
            return 'Lowercase slug with hyphens only (match Postgres companies.slug)';
          }
          const docId = context.document?._id?.replace(/^drafts\./, '');
          const duplicateCount = await context
            .getClient({ apiVersion: SANITY_API_VERSION })
            .fetch<number>(
              `count(*[
                _type == "employerBranding" &&
                companySlug == $companySlug &&
                !(_id in [$draftId, $publishedId])
              ])`,
              {
                companySlug: value,
                draftId: docId ? `drafts.${docId}` : '',
                publishedId: docId ?? '',
              },
            );
          if (duplicateCount > 0) {
            return 'Another employer branding document already uses this company slug';
          }
          return true;
        }),
    }),
    defineField({
      name: 'heroHeadline',
      title: 'Hero headline',
      type: 'localeString',
    }),
    defineField({
      name: 'heroSubhead',
      title: 'Hero subhead',
      type: 'localeText',
    }),
    {
      name: 'heroImage',
      title: 'Hero image',
      type: 'image',
      options: { hotspot: true },
      fields: [{ name: 'alt', type: 'string', title: 'Alt text' }],
    },
    defineField({
      name: 'story',
      title: 'Culture / story',
      type: 'blockContent',
    }),
    {
      name: 'benefits',
      title: 'Benefits',
      type: 'array',
      of: [defineArrayMember({ type: 'employerBenefitLocalized' })],
      validation: (Rule) => Rule.max(24),
    },
    {
      name: 'testimonials',
      title: 'Testimonials',
      type: 'array',
      of: [defineArrayMember({ type: 'employerTestimonialLocalized' })],
      validation: (Rule) => Rule.max(12),
    },
  ],
  preview: {
    select: { slug: 'companySlug', headline: 'heroHeadline.sr' },
    prepare({ slug, headline }) {
      return {
        title: headline || 'Employer branding',
        subtitle: slug ? `slug: ${slug}` : '',
      };
    },
  },
});
