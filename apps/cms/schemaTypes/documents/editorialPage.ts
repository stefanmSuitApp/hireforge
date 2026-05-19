import { defineField, defineType } from 'sanity';

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const editorialPage = defineType({
  name: 'editorialPage',
  title: 'Editorial page',
  type: 'document',
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'localeString',
      validation: (Rule) =>
        Rule.custom((value: { sr?: string; en?: string } | undefined) => {
          if (!value?.sr?.trim() || !value?.en?.trim()) {
            return 'Title is required in both Serbian and English';
          }
          return true;
        }),
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      description: 'URL segment (lowercase, hyphens). E.g. about-us',
      type: 'slug',
      options: { source: 'title', maxLength: 96 },
      validation: (Rule) =>
        Rule.required().custom((value: { current?: string } | undefined) => {
          const current = value?.current;
          if (!current || !slugPattern.test(current)) {
            return 'Use lowercase letters, numbers, and single hyphens only';
          }
          return true;
        }),
    }),
    defineField({
      name: 'excerpt',
      title: 'Excerpt',
      type: 'localeText',
    }),
    defineField({
      name: 'body',
      title: 'Body',
      type: 'blockContent',
    }),
    defineField({
      name: 'seoTitle',
      title: 'SEO title override',
      type: 'localeString',
    }),
    defineField({
      name: 'seoDescription',
      title: 'SEO description override',
      type: 'localeText',
    }),
  ],
  preview: {
    select: {
      titleSr: 'title.sr',
      titleEn: 'title.en',
      slug: 'slug.current',
    },
    prepare({ titleSr, titleEn, slug }) {
      return {
        title: titleSr || titleEn || 'Page',
        subtitle: slug ? `/p/${slug}` : '',
      };
    },
  },
});
