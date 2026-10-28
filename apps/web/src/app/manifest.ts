import type { MetadataRoute } from 'next';

import { routing } from '@/i18n/routing';

/** Installable web app + icons for browsers and search results. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Šljakam',
    short_name: 'Šljakam',
    start_url: `/${routing.defaultLocale}`,
    scope: '/',
    display: 'standalone',
    // --background / --primary in global.css (see make-icons.mjs).
    background_color: '#fafafa',
    theme_color: '#007767',
    lang: routing.defaultLocale,
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon.png', sizes: '512x512', type: 'image/png' },
      {
        src: '/icon-maskable.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
      { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml' },
    ],
  };
}
