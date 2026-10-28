#!/usr/bin/env node
/**
 * SEO audit of a running site. WARN-ONLY: prints findings (`::warning::` on
 * CI) and always exits 0; it never gates a commit, push or deploy.
 *
 *   pnpm seo:audit https://sljakam.com [--sample 5]
 *
 * Checks: robots.txt (allow + sitemap line), the sitemap index and every
 * child sitemap, then a sample of URLs from each child: 200 without redirect,
 * self canonical, hreflang sr/en/x-default (and that alternates link back),
 * no accidental noindex, title / description length, JSON-LD parses (job
 * pages: a JobPosting with Google's required fields). On a production apex
 * host it also checks that www redirects to it with a 301.
 */
const args = process.argv.slice(2);
const base = (args.find((a) => /^https?:\/\//.test(a)) ?? '').replace(
  /\/$/,
  '',
);
const sampleArg = args.indexOf('--sample');
const SAMPLE = sampleArg >= 0 ? Number(args[sampleArg + 1]) || 5 : 5;
const onCi = Boolean(process.env.CI);

if (!base) {
  console.error('usage: pnpm seo:audit <baseUrl> [--sample N]');
  process.exit(0);
}

const warnings = [];
const notes = [];
const warn = (where, msg) => {
  warnings.push(`${where}: ${msg}`);
  console.log(
    onCi
      ? `::warning title=seo:audit::${where}: ${msg}`
      : `  ✗ ${where}: ${msg}`,
  );
};
const ok = (msg) => console.log(`  ✓ ${msg}`);

async function get(url, opts = {}) {
  try {
    return await fetch(url, {
      redirect: 'manual',
      headers: { 'user-agent': 'sljakam-seo-audit/1.0' },
      signal: AbortSignal.timeout(20_000),
      ...opts,
    });
  } catch (e) {
    warn(url, `request failed: ${e.message}`);
    return null;
  }
}

const locs = (xml) =>
  [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => decode(m[1]));
const decode = (s) =>
  s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"');

/** <link>/<meta> attributes from <head>, good enough for server-rendered pages. */
function headTags(html, tag) {
  const head = html.split(/<\/head>/i)[0] ?? html;
  return [...head.matchAll(new RegExp(`<${tag}\\b([^>]*)>`, 'gi'))].map((m) => {
    const attrs = {};
    for (const a of m[1].matchAll(/([a-zA-Z:-]+)="([^"]*)"/g))
      attrs[a[1].toLowerCase()] = decode(a[2]);
    return attrs;
  });
}

function pageFacts(html) {
  const links = headTags(html, 'link');
  const metas = headTags(html, 'meta');
  return {
    title: decode(/<title[^>]*>([^<]*)<\/title>/i.exec(html)?.[1] ?? '').trim(),
    description: metas.find((m) => m.name === 'description')?.content ?? '',
    robots: metas
      .filter((m) => m.name === 'robots')
      .map((m) => m.content)
      .join(','),
    canonical: links.find((l) => l.rel === 'canonical')?.href ?? null,
    alternates: Object.fromEntries(
      links
        .filter((l) => l.rel === 'alternate' && l.hreflang)
        .map((l) => [l.hreflang, l.href]),
    ),
    jsonLd: [
      ...html.matchAll(
        /<script type="application\/ld\+json">([\s\S]*?)<\/script>/g,
      ),
    ].map((m) => m[1]),
  };
}

const JOB_REQUIRED = [
  'title',
  'description',
  'datePosted',
  'hiringOrganization',
];

async function auditPage(url) {
  const res = await get(url);
  if (!res) return null;
  if (res.status !== 200) {
    warn(
      url,
      `status ${res.status}${res.headers.get('location') ? ` → ${res.headers.get('location')}` : ''} (sitemap URLs must answer 200 directly)`,
    );
    return null;
  }
  const f = pageFacts(await res.text());
  if (f.canonical !== url)
    warn(url, `canonical is ${f.canonical ?? 'missing'}`);
  if (/noindex/i.test(f.robots))
    warn(url, `robots meta "${f.robots}" on a sitemap URL`);
  for (const lang of ['sr', 'en', 'x-default']) {
    if (!f.alternates[lang]) warn(url, `hreflang ${lang} missing`);
  }
  if (f.title.length < 10 || f.title.length > 70)
    warn(url, `title is ${f.title.length} chars ("${f.title}"; aim 10–70)`);
  if (f.description.length < 50 || f.description.length > 170) {
    warn(url, `description is ${f.description.length} chars (aim 50–170)`);
  }
  const blocks = [];
  for (const raw of f.jsonLd) {
    try {
      blocks.push(JSON.parse(raw));
    } catch {
      warn(url, 'JSON-LD does not parse');
    }
  }
  if (/\/jobs\/[^/]+-[a-z0-9]{4}$/.test(new URL(url).pathname)) {
    const posting = blocks.find((b) => b['@type'] === 'JobPosting');
    if (!posting) warn(url, 'job page without JobPosting');
    else {
      const missing = JOB_REQUIRED.filter((k) => !posting[k]);
      if (!posting.jobLocation && posting.jobLocationType !== 'TELECOMMUTE')
        missing.push('jobLocation');
      if (missing.length) warn(url, `JobPosting missing ${missing.join(', ')}`);
    }
  }
  return f;
}

async function main() {
  console.log(`seo:audit ${base}`);

  const robotsRes = await get(`${base}/robots.txt`);
  const robots = robotsRes?.status === 200 ? await robotsRes.text() : '';
  if (!robots) warn('robots.txt', `status ${robotsRes?.status ?? 'n/a'}`);
  else {
    if (/^Disallow:\s*\/\s*$/m.test(robots))
      warn('robots.txt', 'disallows everything');
    if (!robots.includes(`Sitemap: ${base}/sitemap.xml`))
      warn('robots.txt', 'no Sitemap line for this host');
    else ok('robots.txt allows crawling and points at the sitemap');
  }

  const indexRes = await get(`${base}/sitemap.xml`);
  const index = indexRes?.status === 200 ? await indexRes.text() : '';
  if (!index.includes('<sitemapindex')) {
    warn(
      'sitemap.xml',
      `not a sitemap index (status ${indexRes?.status ?? 'n/a'})`,
    );
    return;
  }
  const children = locs(index);
  ok(`sitemap index lists ${children.length} files`);

  let total = 0;
  const checked = [];
  for (const child of children) {
    const res = await get(child);
    const xml = res?.status === 200 ? await res.text() : '';
    if (!xml.includes('<urlset')) {
      warn(child, `not a urlset (status ${res?.status ?? 'n/a'})`);
      continue;
    }
    const urls = locs(xml);
    total += urls.length;
    if (urls.length > 50_000) warn(child, `${urls.length} URLs (limit 50 000)`);
    for (const u of urls.filter((x) => x.includes('/sign-in')))
      warn(child, `lists ${u}`);
    const pick = urls
      .filter((_, i) => i % Math.max(1, Math.floor(urls.length / SAMPLE)) === 0)
      .slice(0, SAMPLE);
    for (const url of pick) {
      const facts = await auditPage(url);
      if (facts) checked.push({ url, facts });
    }
  }
  ok(`${total} sitemap URLs; ${checked.length} sampled pages fetched`);

  // hreflang must be reciprocal: the alternate page links back.
  for (const { url, facts } of checked.slice(0, 6)) {
    for (const [lang, href] of Object.entries(facts.alternates)) {
      if (lang === 'x-default' || href === url) continue;
      const res = await get(href);
      if (res?.status !== 200) {
        warn(url, `hreflang ${lang} → ${href} answers ${res?.status ?? 'n/a'}`);
        continue;
      }
      const back = pageFacts(await res.text()).alternates;
      if (!Object.values(back).includes(url))
        warn(url, `hreflang ${lang} page does not link back`);
    }
  }

  const host = new URL(base).hostname;
  if (!/^(localhost|127\.|www\.)/.test(host) && host.split('.').length === 2) {
    const www = await get(`${new URL(base).protocol}//www.${host}/sr/jobs?x=1`);
    const loc = www?.headers.get('location') ?? '';
    if (www?.status !== 301 || !loc.startsWith(`${base}/sr/jobs`)) {
      warn(
        `www.${host}`,
        `expected 301 to ${base}/… (keeping the path), got ${www?.status ?? 'n/a'} ${loc}`,
      );
    } else ok(`www.${host} → 301 → ${loc}`);
  } else notes.push('www → apex not checked (not a production apex host)');

  for (const n of notes) console.log(`  · ${n}`);
  console.log(
    warnings.length
      ? `seo:audit — ${warnings.length} warning(s) (report only)`
      : 'seo:audit — no warnings',
  );
}

await main().catch((e) =>
  console.log(`seo:audit — aborted: ${e.message} (report only)`),
);
process.exit(0);
