# Redesign — direction A ("Topao i ljudski")

Stefan picked direction A on 2026-10-29. Concepts (homepage in three
directions, then every main page in A, light and dark, shared header and
footer): https://claude.ai/artifact/TwJpGaQHuiJBXbd7H3cRhU

## Rules (Stefan)

- **Same functionality and order** on every page; only the look changes.
  Signed-in users keep the full job filters (chips; behind "Filteri" on
  phones); guests keep one locked "Više filtera" button.
- **Existing endpoints first.** Every element maps to data the API or Sanity
  already returns (table below). What has no data is designed around, not
  added to the backend.
- **One theme.** Every colour is a role token in
  `apps/web/src/app/global.css` (light and dark values for the same names);
  no raw colours in components.
- **Shared components.** Header (with the promo bar, language and theme
  switches), footer (same content as today, more compact), job card,
  section heading, category tile, city accordion, CTA cards: built once,
  used by every public page.
- **Fast first, then lively.** CSS-only motion on `transform` / `opacity`
  (no animation library); scroll reveals with CSS scroll-driven animations
  where supported (elsewhere content is simply shown); a light bounce
  (`--ease-bounce`); the LCP content (hero title and search) does not
  animate; everything stops under `prefers-reduced-motion`. Budgets stay:
  Lighthouse performance ≥ 0.9, LCP ≤ 2.5 s, CLS ≤ 0.1
  (`scripts/perf-budgets.json`).
- **No invented facts.** Photos, logos and counts come from real data or
  stay clearly marked placeholders for Stefan.

## Data map (no backend change unless marked)

| Design element                               | Source                                                                   |
| -------------------------------------------- | ------------------------------------------------------------------------ |
| Featured / popular / recent jobs, badges     | public job list                                                          |
| Total open positions (Poslovi, landings)     | `total` of the job list                                                  |
| 10 categories, 5 cities with photos          | taxonomy + CMS spotlight images (today's city rail)                      |
| Promo bar + promo in "Za poslodavce"         | admin-started campaigns (#57) only (Stefan, 2026-10-29)                  |
| Footer tagline, links, cities, categories    | CMS site settings + taxonomy                                             |
| Job page incl. promo image                   | job detail (`pngCreativeUrl`)                                            |
| Company "Zašto kod nas", "Utisci zaposlenih" | CMS employer branding (benefits, testimonials)                           |
| Employers list with job counts               | employers directory (`publishedJobCount`)                                |
| City hero photo                              | CMS spotlight city images                                                |
| About page                                   | `Editorial.about*` copy + CMS body                                       |
| Per-city / per-category counts on tiles      | **none** → not shown                                                     |
| Company logo, cover photo                    | Sanity Employer branding → Logo (step 6), else initials; cover: gradient |
| Homepage hero photo                          | a static image Stefan chooses → placeholder until then                   |

## Steps

Each step: tests that fail without the change, `pnpm verify`, e2e, visual
baselines re-rendered and reviewed, Lighthouse, 375 + 1440 px, PR, staging,
Stefan approves production.

1. **Foundation**: A's palette in the existing tokens (light + dark), new
   roles (`--placeholder`, `--footer`, `--featured-soft`), motion tokens and
   utilities (`hf-reveal`, `hf-lift`, `hf-press`), site-wide promo bar in
   the header, compact footer restyle.
2. **Homepage**: hero, featured jobs, 10 categories, city accordion, how it
   works, candidate / employer cards with promo; SEO title + description
   (2–3 options for Stefan).
3. **Poslovi + Oglas**: search card, guest button / signed-in chips, list +
   preview, job page with apply box and similar jobs.
4. **Poslodavci, Profil kompanije, grad/kategorija** pages.
5. **O platformi**: the new editorial page (photo collage, card deck,
   timeline).
6. **Logos** via a Sanity field on employer branding, shown everywhere with
   initials as the fallback.
