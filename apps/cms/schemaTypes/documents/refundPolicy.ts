import { defineField, defineType } from 'sanity';

export const refundPolicy = defineType({
  name: 'refundPolicy',
  title: 'Refund policy (old)',
  description:
    'Replaced by Legal pages → Refund policy; its summary is used only while that page is unpublished.',
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
