# Šljakam: SEO and reach checklist (for Stefan)

What is left after the SEO work (live since 2026-10-28) that only you can do,
ordered by impact. Step-by-step details for the env values are in
`NEEDS_STEFAN.md` ("SEO branch" and "Values"). Nothing here is done for you;
tick items off as you go.

## 1. Before inviting Google in (do first, ~1 hour)

- [ ] **Archive the seed sample job** "Senior TypeScript developer"
      (DEVLEGION). It is the only live job, public, in the sitemap and marked
      up as a real JobPosting. Google's job-posting rules treat fake or test
      ads as a policy violation, which can cost the whole site its job
      listings in Search.
- [ ] **Confirm `PUBLIC_JOBS` stays on.** Without it, nothing below matters.
- [ ] **Google Search Console**: add `sljakam.com` (a Domain property via DNS
      TXT covers apex and `www` in one go; or the meta tag via
      `GOOGLE_SITE_VERIFICATION`). Submit `https://sljakam.com/sitemap.xml`.
- [ ] **Bing Webmaster Tools**: import the site from Search Console (one
      click), submit the sitemap. Bing's index also feeds DuckDuckGo, Yahoo
      and several AI search tools.
- [ ] **`INDEXNOW_KEY`**: set it and restart `web` + `worker`; Bing and
      Yandex then hear about every published or closed job within ~30 s.
- [ ] **Google Indexing API service account** (`GOOGLE_INDEXING_SA_JSON`),
      added as Owner in Search Console. Google allows this API for job
      pages; it gets new jobs into Google for Jobs much faster than waiting
      for a crawl.
- [ ] Optional: Yandex Webmaster (`YANDEX_SITE_VERIFICATION`).

## 2. The biggest lever: real, complete job ads

Every live **featured** job (Šef/Gazda packages) adds a job page plus city and
category pages to the index. Since 2026-10-28 guests (and crawlers) see only
featured jobs in full; other jobs are sign-in teasers, stay out of the sitemap
and are sent to Google/IndexNow as removed. A city or category page is indexed
only while it has a featured job. With one or zero featured jobs there is
almost nothing for search engines to show.

- [ ] Get the first real employers posting (TODO(Stefan): who and how).
- [ ] Ask employers to fill city, category, employment type and an expiry
      date: these become Google for Jobs fields and filters.
- [ ] **Decide on salary.** Google for Jobs shows a salary on the result card
      when the ad has one. The job form has no salary field yet; say the word
      and it gets added (form, API, `baseSalary` in the markup).
- [ ] Employer profiles: fill the company branding in Sanity (headline,
      benefits). Fuller company pages rank better and convert better.
- [ ] Company logos: none are stored yet. If you want logos on job results,
      that is a small feature (upload + `logo` in the markup).

## 3. Trust and brand signals

- [ ] **Create the social profiles** you want (LinkedIn page, Instagram,
      Facebook) and send the URLs: they go into the site's `sameAs` markup
      and help Google connect "Šljakam" searches to the site.
- [ ] Google Business Profile, only if Šljakam/DEVLEGION has an address you
      want public.
- [ ] Check the About page and legal pages in Sanity are complete (who runs
      the site, contact, company data). Job sites are judged on trust.

## 4. Getting links and traffic (off-site)

- [ ] A launch announcement in the places your audience already reads
      (TODO(Stefan): which Serbian IT/HR communities, media, newsletters).
- [ ] University and faculty career centres and student organisations:
      ask them to link to the jobs page or to a relevant category page.
- [ ] Post each new job on your social profiles, linking to the job page
      (not the home page).
- [ ] Job aggregators: check which ones accept a free XML feed from job
      boards in Serbia (TODO(Stefan): pick the ones worth it). A feed is a
      small dev task once you choose.

## 5. Content (only if you will write it)

- [ ] Editorial pages in Sanity (`/p/...`, already in the sitemap): guides
      such as writing a CV or preparing for an interview in Serbia. These
      attract links and long-tail searches. Don't publish thin or AI-padded
      pages; they hurt more than they help.
- [ ] Decide whether a **Cyrillic** version is worth it. Many Serbian
      searches are in Cyrillic; today the site is Latin (`sr`) and English
      only. Product decision first, then a locale (`sr-Cyrl`) is a bigger
      dev task.

## 6. Measure

- [ ] **Analytics**: pick GA4 (needs the cookie banner) or a cookieless tool
      (Plausible, Umami, Cloudflare Web Analytics). Search Console already
      gives search queries and clicks without cookies.
- [ ] Weekly, the first month: Search Console → Pages (indexed vs not) and
      Enhancements → Job postings (errors and warnings).
- [ ] After each deploy: `pnpm seo:audit https://sljakam.com` (warn-only);
      the `quality report` workflow on `main` runs Lighthouse and visual
      checks.
- [ ] Core Web Vitals in Search Console once there is real traffic.

## Dev tasks ready to pick up on your go

| Task                                                | Why                             |
| --------------------------------------------------- | ------------------------------- |
| Salary fields → `baseSalary`                        | Salary on Google for Jobs cards |
| Company logo upload → `logo` / `hiringOrganization` | Logo on job results             |
| XML job feed for aggregators                        | Extra distribution without ads  |
| `sr-Cyrl` locale                                    | Cyrillic searches               |
| Analytics (after your choice)                       | Know what works                 |
