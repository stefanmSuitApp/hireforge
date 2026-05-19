import { defineField, defineType } from 'sanity';

export const navigation = defineType({
  name: 'navigation',
  title: 'Main navigation',
  type: 'document',
  fields: [
    defineField({
      name: 'items',
      title: 'Links',
      type: 'array',
      of: [{ type: 'navLink' }],
      validation: (Rule) => Rule.max(20),
    }),
  ],
  preview: {
    select: { count: 'items' },
    prepare({ count }) {
      const n = Array.isArray(count) ? count.length : 0;
      return { title: 'Main navigation', subtitle: `${n} link(s)` };
    },
  },
});
