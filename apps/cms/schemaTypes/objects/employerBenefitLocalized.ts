import { defineField, defineType } from 'sanity';

export const employerBenefitLocalized = defineType({
  name: 'employerBenefitLocalized',
  title: 'Benefit (localized)',
  type: 'object',
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'localeString',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'body',
      title: 'Description',
      type: 'localeText',
    }),
  ],
  preview: {
    select: { title: 'title.sr' },
  },
});
