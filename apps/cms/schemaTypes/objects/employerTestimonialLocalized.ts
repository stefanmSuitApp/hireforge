import { defineField, defineType } from 'sanity';

export const employerTestimonialLocalized = defineType({
  name: 'employerTestimonialLocalized',
  title: 'Testimonial (localized)',
  type: 'object',
  fields: [
    defineField({
      name: 'quote',
      title: 'Quote',
      type: 'localeText',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'attribution',
      title: 'Name',
      type: 'localeString',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'role',
      title: 'Role / context',
      type: 'localeString',
    }),
  ],
  preview: {
    select: { title: 'attribution.sr' },
  },
});
