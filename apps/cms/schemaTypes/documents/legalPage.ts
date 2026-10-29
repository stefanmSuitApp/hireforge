import { defineField, defineType } from 'sanity';

export const LEGAL_PAGE_KINDS = [
  { title: 'Privacy policy', value: 'privacy' },
  { title: 'Terms of use', value: 'terms' },
  { title: 'Refund policy', value: 'refunds' },
] as const;

type Localized = { sr?: unknown; en?: unknown } | undefined;

const hasText = (v: unknown) =>
  typeof v === 'string' ? v.trim().length > 0 : Array.isArray(v) && v.length;

/** Legal copy must exist in both languages before it can be published. */
const bothLanguages = (label: string) => (value: Localized) =>
  hasText(value?.sr) && hasText(value?.en)
    ? true
    : `${label} is required in both Serbian and English`;

/**
 * Privacy policy, terms of use and refund policy. One document per kind,
 * identified by its fixed id `legal-<kind>` (see deskStructure). The site
 * shows only published documents, so a draft stays private until published.
 */
export const legalPage = defineType({
  name: 'legalPage',
  title: 'Legal page',
  type: 'document',
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'localeString',
      validation: (Rule) => Rule.custom(bothLanguages('Title')),
    }),
    defineField({
      name: 'effectiveFrom',
      title: 'Effective from',
      description:
        'Shown as "last updated" and recorded as the accepted version at sign-up. Change it whenever the text changes.',
      type: 'date',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'summary',
      title: 'Short summary',
      description:
        'Refund policy only: printed in the proforma footer and shown on the proforma page.',
      type: 'localeText',
    }),
    defineField({
      name: 'body',
      title: 'Text',
      type: 'localeBlockContent',
      validation: (Rule) => Rule.custom(bothLanguages('Text')),
    }),
  ],
  preview: {
    select: { title: 'title.sr', id: '_id', date: 'effectiveFrom' },
    prepare({ title, id, date }) {
      const path = `/${String(id).replace(/^(drafts\.)?legal-/, '')}`;
      return {
        title: title || 'Legal page',
        subtitle: date ? `${path} · ${date}` : path,
      };
    },
  },
});
