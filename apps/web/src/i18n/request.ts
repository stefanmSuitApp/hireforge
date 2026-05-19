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
    messages:
      messagesByLocale[locale as keyof typeof messagesByLocale] ?? srMessages,
  };
});
