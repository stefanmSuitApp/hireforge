import { defineField, defineType } from 'sanity';

const TEMPLATE_CODES = [
  { title: 'Klasičan', value: 'klasican' },
  { title: 'Moderan', value: 'moderan' },
  { title: 'Minimalan', value: 'minimalan' },
] as const;

export const cvTemplate = defineType({
  name: 'cvTemplate',
  title: 'CV template',
  type: 'document',
  fields: [
    defineField({
      name: 'code',
      title: 'Template code',
      type: 'string',
      options: {
        list: [...TEMPLATE_CODES],
        layout: 'radio',
      },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'name',
      title: 'Name',
      type: 'localeString',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'description',
      title: 'Description',
      type: 'localeText',
    }),
    defineField({
      name: 'previewImage',
      title: 'Preview image',
      type: 'image',
      options: { hotspot: true },
    }),
  ],
  preview: {
    select: {
      title: 'name.sr',
      subtitle: 'code',
      media: 'previewImage',
    },
    prepare({ title, subtitle, media }) {
      return {
        title: title || 'CV template',
        subtitle: subtitle ? String(subtitle) : undefined,
        media,
      };
    },
  },
});
