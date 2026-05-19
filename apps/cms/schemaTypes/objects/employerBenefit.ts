import { defineField, defineType } from 'sanity';

export const employerBenefit = defineType({
  name: 'employerBenefit',
  title: 'Benefit',
  type: 'object',
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      validation: (Rule) => Rule.required().max(160),
    }),
    defineField({
      name: 'body',
      title: 'Description',
      type: 'blockContent',
    }),
  ],
  preview: {
    select: { title: 'title' },
  },
});
