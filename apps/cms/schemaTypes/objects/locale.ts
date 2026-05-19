import { defineField, defineType } from 'sanity';

export const localeString = defineType({
  name: 'localeString',
  title: 'Localized string',
  type: 'object',
  fields: [
    defineField({ name: 'sr', title: 'Serbian (sr)', type: 'string' }),
    defineField({ name: 'en', title: 'English (en)', type: 'string' }),
  ],
});

export const localeText = defineType({
  name: 'localeText',
  title: 'Localized text',
  type: 'object',
  fields: [
    defineField({ name: 'sr', title: 'Serbian (sr)', type: 'text' }),
    defineField({ name: 'en', title: 'English (en)', type: 'text' }),
  ],
});
