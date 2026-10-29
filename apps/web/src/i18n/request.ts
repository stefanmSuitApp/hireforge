import { hasLocale } from 'next-intl';
import { getRequestConfig } from 'next-intl/server';

import enMessages from '../messages/en.json';
import srMessages from '../messages/sr.json';

import { routing } from './routing';

const messagesByLocale = {
  sr: srMessages,
  en: enMessages,
} as const;

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested)
    ? requested
    : routing.defaultLocale;

  return {
    locale,
    // Without it the server formats dates in its own zone (UTC) and the
    // browser in the visitor's: near midnight they disagree on the day.
    timeZone: 'Europe/Belgrade',
    messages:
      messagesByLocale[locale as keyof typeof messagesByLocale] ?? srMessages,
  };
});
