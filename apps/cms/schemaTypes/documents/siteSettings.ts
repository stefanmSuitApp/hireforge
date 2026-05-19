import { defineField, defineType } from 'sanity';

export const siteSettings = defineType({
  name: 'siteSettings',
  title: 'Site settings',
  type: 'document',
  fields: [
    defineField({
      name: 'siteName',
      title: 'Public site name',
      type: 'localeString',
      validation: (Rule) =>
        Rule.custom((value: { sr?: string; en?: string } | undefined) => {
          if (!value?.sr?.trim() || !value?.en?.trim()) {
            return 'Site name is required in both Serbian and English';
          }
          return true;
        }),
    }),
    defineField({
      name: 'defaultSeoTitle',
      title: 'Default SEO title suffix',
      description: 'Appended or used when a page has no specific title.',
      type: 'string',
      validation: (Rule) => Rule.max(70),
    }),
    defineField({
      name: 'defaultSeoDescription',
      title: 'Default meta description',
      type: 'localeText',
      validation: (Rule) =>
        Rule.custom((value: { sr?: string; en?: string } | undefined) => {
          const sr = value?.sr?.trim();
          const en = value?.en?.trim();
          if (!sr && !en) {
            return true;
          }
          if (!sr || !en) {
            return 'Provide both SR and EN, or leave both empty';
          }
          return true;
        }),
    }),
    defineField({
      name: 'footerTagline',
      title: 'Footer tagline',
      type: 'localeText',
      validation: (Rule) =>
        Rule.custom((value: { sr?: string; en?: string } | undefined) => {
          const sr = value?.sr?.trim();
          const en = value?.en?.trim();
          if (!sr && !en) {
            return true;
          }
          if (!sr || !en) {
            return 'Provide both SR and EN, or leave both empty';
          }
          return true;
        }),
    }),
    defineField({
      name: 'jobDescriptionLinkHostBlocklist',
      title: 'Job description hyperlink host blocklist',
      description:
        'Comma-separated hosts blocked in employer job description links (e.g. bit.ly,tinyurl.com). Always merged with server env EDITOR_LINK_HOST_BLOCKLIST.',
      type: 'string',
      validation: (Rule) => Rule.max(2000),
    }),
    {
      name: 'supportContact',
      title: 'Support contact',
      type: 'object',
      fields: [
        defineField({
          name: 'email',
          title: 'Email',
          type: 'string',
          validation: (Rule) =>
            Rule.custom((email) => {
              if (!email) {
                return true;
              }
              return (
                /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email)) ||
                'Enter a valid email'
              );
            }),
        }),
        defineField({
          name: 'label',
          title: 'Display label',
          type: 'localeString',
        }),
      ],
    },
    {
      name: 'wireTransfer',
      title: 'Wire transfer (billing)',
      description:
        'Shown on proforma page, PDFs, and payment emails. IBAN/SWIFT are typically ASCII-only.',
      type: 'object',
      fields: [
        defineField({
          name: 'accountHolderSr',
          title: 'Account holder (SR)',
          type: 'string',
          validation: (Rule) => Rule.max(200),
        }),
        defineField({
          name: 'accountHolderEn',
          title: 'Account holder (EN)',
          type: 'string',
          validation: (Rule) => Rule.max(200),
        }),
        defineField({
          name: 'bankNameSr',
          title: 'Bank name (SR)',
          type: 'string',
          validation: (Rule) => Rule.max(200),
        }),
        defineField({
          name: 'bankNameEn',
          title: 'Bank name (EN)',
          type: 'string',
          validation: (Rule) => Rule.max(200),
        }),
        defineField({
          name: 'iban',
          title: 'IBAN',
          type: 'string',
          validation: (Rule) => Rule.max(64),
        }),
        defineField({
          name: 'swiftBic',
          title: 'SWIFT / BIC',
          type: 'string',
          validation: (Rule) => Rule.max(32),
        }),
        defineField({
          name: 'paymentReferenceHintSr',
          title: 'Payment reference hint (SR)',
          type: 'text',
        }),
        defineField({
          name: 'paymentReferenceHintEn',
          title: 'Payment reference hint (EN)',
          type: 'text',
        }),
      ],
    },
  ],
  preview: {
    prepare() {
      return { title: 'Site settings' };
    },
  },
});
