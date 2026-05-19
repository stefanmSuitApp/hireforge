import { defineField, defineType } from 'sanity';

export const employerTestimonial = defineType({
  name: 'employerTestimonial',
  title: 'Testimonial',
  type: 'object',
  fields: [
    defineField({
      name: 'quote',
      title: 'Quote',
      type: 'text',
      rows: 4,
      validation: (Rule) => Rule.required().max(2000),
    }),
    defineField({
      name: 'attribution',
      title: 'Name',
      type: 'string',
      validation: (Rule) => Rule.required().max(120),
    }),
    defineField({
      name: 'role',
      title: 'Role / context',
      type: 'string',
      validation: (Rule) => Rule.max(160),
    }),
  ],
  preview: {
    select: { title: 'attribution', subtitle: 'quote' },
    prepare({ title, subtitle }) {
      return {
        title: title ?? 'Testimonial',
        subtitle: subtitle ? String(subtitle).slice(0, 80) : '',
      };
    },
  },
});
