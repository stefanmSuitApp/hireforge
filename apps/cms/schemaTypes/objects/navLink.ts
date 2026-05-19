import { defineField, defineType } from 'sanity';

export const navLink = defineType({
  name: 'navLink',
  title: 'Navigation link',
  type: 'object',
  fields: [
    defineField({
      name: 'label',
      title: 'Label',
      description: 'Localized label shown in site navigation.',
      type: 'localeString',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'href',
      title: 'Path or URL',
      description:
        'Internal path (e.g. /sr/jobs) or full https URL for external links.',
      type: 'string',
      validation: (Rule) => Rule.required().min(1).max(512),
    }),
    defineField({
      name: 'external',
      title: 'Opens in new tab',
      type: 'boolean',
      initialValue: false,
    }),
  ],
  preview: {
    select: { labelSr: 'label.sr', labelEn: 'label.en', href: 'href' },
    prepare({ labelSr, labelEn, href }) {
      return {
        title: labelSr || labelEn || 'Navigation link',
        subtitle: href,
      };
    },
  },
});
