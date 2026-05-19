import { defineField, defineType } from 'sanity';

export const refundPolicy = defineType({
  name: 'refundPolicy',
  title: 'Refund policy',
  type: 'document',
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'localeString',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'summary',
      title: 'Summary',
      type: 'localeText',
    }),
  ],
  preview: {
    prepare() {
      return { title: 'Refund policy' };
    },
  },
});
