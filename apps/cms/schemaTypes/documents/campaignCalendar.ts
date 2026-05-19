import { defineField, defineType } from 'sanity';

export const campaignCalendar = defineType({
  name: 'campaignCalendar',
  title: 'Campaign calendar',
  type: 'document',
  fields: [
    defineField({
      name: 'internalName',
      title: 'Internal name',
      type: 'string',
      validation: (Rule) => Rule.max(120),
    }),
    defineField({
      name: 'notes',
      title: 'Notes',
      type: 'text',
    }),
    {
      name: 'slots',
      title: 'Homepage banner slots',
      type: 'array',
      description:
        'Queued homepage promos. First matching slot by array order wins when multiple are active.',
      of: [{ type: 'campaignSlot' }],
    },
  ],
  preview: {
    select: { name: 'internalName' },
    prepare({ name }) {
      return { title: name || 'Campaign calendar' };
    },
  },
});
