//@ts-check

const path = require('path');
const fs = require('fs');
const { composePlugins, withNx } = require('@nx/next');
const createNextIntlPlugin = require('next-intl/plugin');
/** Set `OPEN_ANALYZER=false` for headless/CI (skips opening browser tabs). */
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
  openAnalyzer: process.env.OPEN_ANALYZER !== 'false',
});

// next-intl resolves this path against process.cwd(); Nx may load this file from
// the repo root while `next build` may run with cwd = apps/web — compute once.
const i18nRequestAbs = ['ts', 'tsx', 'js', 'jsx']
  .map((ext) => path.join(__dirname, 'src', 'i18n', `request.${ext}`))
  .find((p) => fs.existsSync(p));
if (!i18nRequestAbs) {
  throw new Error(
    `Missing i18n request config next to ${__dirname}/src/i18n/request.{ts,tsx,js,jsx}`,
  );
}
let nextIntlRequestPath = path
  .relative(process.cwd(), i18nRequestAbs)
  .replace(/\\/g, '/');
if (!nextIntlRequestPath.startsWith('.')) {
  nextIntlRequestPath = `./${nextIntlRequestPath}`;
}
const withNextIntl = createNextIntlPlugin(nextIntlRequestPath);

/**
 * @type {import('@nx/next/plugins/with-nx').WithNxOptions}
 **/
const nextConfig = {
  // Use this to set Nx-specific options
  // See: https://nx.dev/recipes/next/next-config-setup
  nx: {},
  /**
   * Docker sets `NEXT_OUTPUT=standalone`: the build then copies only the files
   * the server needs (traced from the monorepo root) into `.next/standalone`,
   * instead of the image carrying the whole workspace `node_modules`. Local
   * `next start` (e2e) keeps the default output.
   */
  ...(process.env.NEXT_OUTPUT === 'standalone'
    ? {
        output: 'standalone',
        outputFileTracingRoot: path.join(__dirname, '../..'),
      }
    : {}),
  turbopack: {
    resolveAlias: {
      'next-intl/config': nextIntlRequestPath,
    },
  },
  /**
   * IndexNow key file at `/<INDEXNOW_KEY>.txt`. The key is runtime env, so any
   * key-shaped `.txt` goes to the handler, which 404s unless it matches.
   * (`afterFiles`: robots.txt / llms.txt routes win first.)
   */
  async rewrites() {
    return [
      {
        source: '/:key([A-Za-z0-9-]{8,128}).txt',
        destination: '/api/indexnow-key/:key',
      },
    ];
  },
};

const plugins = [withNx, withNextIntl];

// `composePlugins` returns a phase-aware function; bundle analyzer must wrap the *base* object.
module.exports = composePlugins(...plugins)(withBundleAnalyzer(nextConfig));
