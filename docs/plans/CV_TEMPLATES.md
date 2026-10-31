# CV templates: from three to five

Research and build plan, 2026-10-31. Goal (Stefan): offer at least five
templates in the CV builder, each with a clear purpose, based on popular,
proven designs that fit (or can be fitted to) our builder.

## Where we are today

- **Builder:** `candidate-cv-build-wizard.tsx`, 6 steps: basics (name,
  phone, headline, city) → experience → education → skills → template →
  generate. A live preview uses `PDFViewer`.
- **Data** (`libs/contracts/src/lib/cv-profile.ts`, `candidates.cv_profile`
  jsonb):
  - experience: company, title, dates, `summary` ≤ 500;
  - education: institution, degree, field, dates;
  - skills: names only.
  - Not collected: email, a profile summary, languages, driving licence,
    certificates, links or a photo.
- **Rendering:** `libs/server/cv-templates`, `@react-pdf/renderer` 4.5. The
  same component draws the browser preview and the API's stored PDF
  (`generateResumeFromTemplate`, 20 per hour).
- **Templates:**
  - `klasican`: two columns, header and skills on the left.
  - `moderan`: navy sidebar with skills.
  - `minimalan`: one column.
- **Where the template codes live:** `cvTemplateCodes` in contracts, the
  `resume_assets_template_code_check` DB constraint (0013), the Sanity
  `cvTemplate` code list (name, description, preview image) and
  `Candidate.cvBuilder.templateNames` in the messages.
- **Gaps found on the way** (fix in phase 0, whatever the template set):
  - Section titles ("Experience", "Education", "Skills") and "present" are
    hard-coded in English, so a Serbian user gets an English CV.
  - Dates print raw (`2019-03-01`) instead of "mart 2019." / "Mar 2019".
  - There is no email on the CV at all.
  - The PDF font (Noto Sans) is downloaded from `raw.githubusercontent.com`
    at render time. If GitHub is slow or down, generating a CV stalls or
    falls back to Helvetica, which has no Cyrillic. Bundle the TTFs.
  - No e2e test clicks through the builder; only an API-level rate-limit
    test exists.

## What the research says

- **Layout and ATS.** Single-column layouts are the safe default for
  applicant tracking systems. Parsers read a sidebar row by row and mix it
  into the work history. Vendor tests disagree on how much that matters
  (Enhancv measured two columns as fine, but it sells them). The consensus:
  one column for portals, two columns for CVs a person reads.
- **Format.** Reverse-chronological is the dominant format. For drivers,
  warehouse and other hands-on jobs, guides recommend a hybrid: key skills,
  licences and certificates first, then the work history. Pure "functional"
  CVs hide dates and are disliked; a hybrid is not.
- **Europass is the familiar format here.** Serbia has a national Europass
  centre (Fondacija Tempus), and the Europass editor is in Serbian.
  Europass has fixed sections:
  - personal info and an optional photo;
  - work and education;
  - languages on the CEFR scale (A1–C2), with the mother tongue apart;
  - digital skills;
  - driving licence.
    Private employers often prefer a more modern look.
- **Photo, driving licence and languages.** Photo norms vary by country.
  In much of continental Europe a photo is common and optional; in the UK
  and NL it is left out. A driving licence category goes on when it is
  relevant to the job. Languages are listed with a level: a certificate
  level, or basic / intermediate / advanced.
- **Serbian HR advice** (Telegraf, from an HR person at a job fair): list
  the jobs relevant to the position, not every job ever held.
- **Proven open designs** (references we may legally draw on):
  - **Jake's Resume:** single column, ATS-safe, MIT licence, very widely
    copied on Overleaf.
  - **Awesome-CV:** about 28.8k GitHub stars, LPPL-1.3c. Big name header,
    coloured section titles, dates on the right.
  - **AltaCV:** about 1.6k stars, two columns with a configurable ratio,
    round photo, rating markers.
  - **Reactive Resume:** MIT, 18 templates, filters for one column / two
    columns / ATS-safe, left or right sidebar.
- **Commercial builders** (Canva, Zety, Novorésumé, Resume Genius's
  "Chicago") show which looks are popular, but their designs are
  proprietary. Use them for the general archetype only, never copy one.
  The same goes for the Europass name and logo: we build "in the European
  format", not "Europass".

## The five templates (recommendation)

Each one serves a different kind of candidate on Šljakam. Our categories
(hospitality, transport, retail, IT, construction, health, production,
admin, beauty, cleaning) span office jobs and hands-on work, and today's
three templates all serve the office side.

| #   | Code (name)                       | Layout                                                                                                                                                                         | Best for                                                                      | Design reference                                                                                        | ATS-safe        | Photo    |
| --- | --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- | --------------- | -------- |
| 1   | `klasican` (Klasičan)             | One column. Name and a contact line on top, uppercase section titles over a thin rule, dates right-aligned, bullets from the description lines, skills as one line. No colour. | IT, admin, finance, any portal application                                    | Jake's Resume (MIT), Harvard-style resume                                                               | yes             | no       |
| 2   | `moderan` (Moderan)               | Coloured sidebar (~30%): photo, contact, skills, languages, licence. Main column: summary, experience, education.                                                              | Retail, hospitality front of house, beauty, sales: a person reads it          | Reactive Resume sidebar templates (MIT), AltaCV (two columns, round photo), the common "sidebar" look   | no (badge says) | optional |
| 3   | `minimalan` (Minimalan)           | One column, lots of white space, big name, coloured section titles, dates in a right column.                                                                                   | Young professionals, marketing, design                                        | Awesome-CV (LPPL; look only, it is LaTeX)                                                               | yes             | no       |
| 4   | `evropski` (Evropski format, new) | Europass structure: a narrow label column (section names, dates) beside content, row by row. Personal info, CEFR language grid, digital skills, driving licence.               | Public sector, health, education, work abroad, candidates used to Europass    | Europass CV (EU, national centre at Fondacija Tempus). No Europass name or logo on the PDF.             | yes             | optional |
| 5   | `prakticni` (Praktičan, new)      | One page, larger type (11 pt). "Ukratko" box first (driving licence categories, certificates, languages, availability), then short experience, then school.                    | Transport, logistics, construction, production, cleaning, kitchens, first job | Hybrid / combination format (skills first, then reverse-chronological) from driver and warehouse guides | yes             | no       |
| 6?  | `upecatljiv` (optional, later)    | Bold coloured header band with photo and name, two-column body.                                                                                                                | Beauty, hospitality, creative                                                 | Popular "creative" archetype                                                                            | no              | yes      |

Why these five:

- **1 and 3** cover the "clean and safe" taste: one plain and strict, one
  with some design.
- **2** is the popular modern look with a photo.
- **4** is the format Serbian candidates and public employers already know.
- **5** is the one no generic builder gives our core audience: what matters
  for a driver or a cook (licence, certificates, start date) sits at the
  top.

Three of the five are ATS-safe, so the default is always a safe choice.
The picker shows a badge on each card:

- "ATS-siguran" ("ATS-safe"), shown on 1, 3, 4 and 5;
- "Sa fotografijom" ("With photo"), shown on 2 and 4 when the candidate
  has a photo.

`klasican` changes look (two columns → one). Already generated PDFs are
stored files and stay as they are. Only new ones get the new look, so the
code can stay.

## Data each template needs

New fields go into the `cv_profile` jsonb, so no new columns are needed.
Every field is optional, and every template must look right with any of
them empty.

| Field                                                                   | 1   | 2   | 3   | 4      | 5     |
| ----------------------------------------------------------------------- | --- | --- | --- | ------ | ----- |
| name, headline, phone, city (exists)                                    | ✓   | ✓   | ✓   | ✓      | ✓     |
| email (from the account, with a "show on CV" switch, default on)        | ✓   | ✓   | ✓   | ✓      | ✓     |
| summary "O meni" (new, ≤ 600)                                           | ✓   | ✓   | ✓   | ✓      | ✓     |
| experience, education, skills (exist)                                   | ✓   | ✓   | ✓   | ✓      | ✓     |
| languages `{name, level: A1–C2 \| native}` (new, ≤ 8)                   | ✓   | ✓   | ✓   | ✓ grid | ✓ top |
| driving licence categories (new, multi-select)                          | ✓   | ✓   | ✓   | ✓      | ✓ top |
| certificates `{name, issuer?, year?}` (new, ≤ 15; e.g. forklift, HACCP) | ✓   | ✓   | ✓   | ✓      | ✓ top |
| links `{label, url}` (new, ≤ 3; LinkedIn, portfolio)                    | ✓   | ✓   | ✓   | ✓      | ·     |
| availability (new, short text: "odmah", "smene", "od 1. 12.")           | ·   | ·   | ·   | ·      | ✓ top |
| photo (new, optional)                                                   | ·   | ✓   | ·   | ✓      | ·     |

✓ = shown, · = left out on purpose, "top" = shown in the first block.

- **Language levels.** The picker shows Serbian words over the CEFR codes:
  osnovni (basic, A1–A2), srednji (intermediate, B1–B2), napredni
  (advanced, C1–C2) and maternji (native).
- **Description bullets.** A description line that starts with "-" or "•"
  becomes a bullet. No schema change is needed.
- **Never asked:** JMBG, marital status, home address, date of birth.
  Older Serbian CVs often include them; we leave them out on purpose
  (privacy, and they invite discrimination).

## How to build them: options

**A. Stay on `@react-pdf/renderer` (recommended).**

- **Fits what we have:** one component draws the live preview and the
  stored PDF, with no new service and fonts already set up.
- **Approach:** split the current file into shared parts:
  - `theme.ts`: sizes and accent colours;
  - `sections/*`: one part each for summary, experience, education,
    skills, languages, licences, certificates and contact;
  - `templates/*.tsx`: each template is a layout made of those sections.
- **Registry:** a `templates` registry
  (`{ code, columns, atsSafe, supportsPhoto }`) feeds the picker badges.
- **Cost:** CSS is limited (flexbox, no grid) but enough for all five.

**B. HTML/CSS templates rendered by headless Chromium (Gotenberg or
Puppeteer).**

- **For:** pixel-perfect web designs, and HTML templates are easy to port.
- **Against:** a Chromium container needs hundreds of MB of RAM on a
  3.8 GB VM that already fell over once from memory, and it adds a new
  service.
- **Verdict:** not now.

**C. Port Reactive Resume's templates (MIT).**

- **Against:** they render with Forme and use their own data model, so
  porting costs about as much as writing them, and we would carry a
  foreign structure.
- **Verdict:** use them as visual reference only. Credit them in
  `THIRD_PARTY` if any code is copied.

## Decisions (Stefan, 2026-10-31)

Stefan agreed with every recommendation:

- A photo is optional, on `moderan` and `evropski` only, and off by
  default.
- `klasican` becomes the strict one-column template; the five codes stay.
- The sixth template (`upecatljiv`) comes later, after phase 3 and only if
  wanted.
- Driving licence categories: AM, A1, A2, A, B1, B, BE, C1, C1E, C, CE,
  D1, D1E, D, DE, F, M.
- Cyrillic CV text comes later, not in this plan.
- Build on `@react-pdf/renderer` (option A).
- Visual reference for the five templates:
  https://claude.ai/artifact/T5ESPQYedJpRgqxPTyXvtR (HTML sketches at A4,
  same sample candidate).

## Build plan

Six PRs, in order. Each one is a branch off the latest `main`. Before it
merges:

- `pnpm verify` and `E2E_WEB=start pnpm e2e` pass, plus
  `pnpm test:integration` when the API or DB changes and `pnpm e2e:visual`
  when the UI changes;
- every new behaviour has a test that was shown failing without the change.

After merging: staging green → next PR. Production stays Stefan's manual
deploy.

### PR 1 — `fix/cv-pdf-foundation`: CVs in Serbian, email, bundled font

Today's three templates keep their look but come out right.

- **Language:**
  - `libs/server/cv-templates/src/lib/cv-labels.ts`: sr/en section titles,
    "danas"/"present", month names.
  - `formatCvDate('2019-03-01', 'sr')` → `mar 2019.`, and `Mar 2019` in
    English.
  - Remove the hard-coded English strings.
- **Layout input** (`CvPdfLayoutInput` in contracts):
  - gains `locale: 'sr' | 'en'` and `email: string | null`;
  - `candidateGenerateResumeBodySchema` gains `locale` (default `sr`).
- **API** (`generateResumeFromTemplate`): select `users.email` and pass
  `locale` from the body.
- **Web:**
  - the build page passes the session email and `locale` to the wizard;
  - the live preview uses the same layout input as the server, so the two
    can't drift.
- **Font:**
  - copy Noto Sans Regular and Bold (OFL) into
    `libs/server/pdf/src/fonts/` and register them from the file;
  - no network at render time;
  - add the OFL licence file next to the fonts.
- **Structure:**
  - split `cv-pdf-document.tsx` into `theme.ts`, `sections/` (header,
    contact, summary, experience, education, skills) and `templates/`
    (one file per code);
  - add `templates/registry.ts`:
    `{ code, columns: 1 | 2, atsSafe, supportsPhoto }`.
- **Tests:**
  - `cv-pdf-text.spec.tsx`: with locale `sr` the text has "Radno
    iskustvo", "mar 2019." and "danas", and no "Experience" or
    "present" (red today); the email appears; English titles with `en`.
  - **First e2e through the builder,** `e2e/cv-builder.spec.ts`:
    - a candidate fills in the basics;
    - adds a job;
    - picks Klasičan;
    - generates;
    - sees the new CV as primary in the list.
- **Checks:** verify, e2e, integration (API change).

### PR 2 — `feat/cv-profile-fields`: the new data

- **Contracts** (`cv-profile.ts`), all optional with defaults:
  - `summary` ≤ 600;
  - `languages: { name ≤ 60, level: 'A1'…'C2' | 'native' }[] ≤ 8`;
  - `drivingLicences: enum[]` (the list above, unique);
  - `certificates: { name ≤ 120, issuer? ≤ 120, year? 1950–this year }[] ≤ 15`;
  - `links: { label ≤ 40, url: https only }[] ≤ 3`;
  - `digitalSkills` ≤ 200 (one line, e.g. "MS Excel, tahograf");
  - `availability` ≤ 120;
  - `showEmail: boolean` (default true).
  - `sanitizeCvProfileForPersist` drops empty rows like it does today.
  - Stored in the existing `cv_profile` jsonb, so no migration. Old
    profiles parse unchanged (defaults).
- **Wizard:**
  - basics step: summary (textarea with a counter), links, "Prikaži e-adresu
    na CV-u" switch;
  - a new step after skills, "Jezici, dozvole i sertifikati":
    - language rows (name + level select: Maternji / Osnovni A1–A2 /
      Srednji B1–B2 / Napredni C1–C2, showing the exact code);
    - licence categories as toggle chips;
    - certificate rows;
    - a digital skills line;
    - availability.
  - The step counter goes from 6 to 7.
  - Description lines that start with "-" or "•" render as bullets (hint
    text says so).
- **Rendering:** the three current templates show the new sections
  (summary, languages, licences, certificates, links), each section
  hidden when empty.
- **Messages:** sr/en keys under `Candidate.cvBuilder` (parity test).
- **Tests:**
  - contract unit tests: defaults, limits, sanitising, an old profile
    still parses;
  - wizard unit test: the new step adds and removes rows;
  - PDF text test: new sections appear, empty ones don't;
  - e2e: add English B1 and licence C, generate, and the preview text has
    both.
- **Checks:** verify, e2e, integration (the profile PATCH validates the
  new fields).

### PR 3 — `feat/cv-templates-restyle`: Klasičan, Moderan, Minimalan

Match the sketches.

- **`klasican`:**
  - one column, Noto Serif for the name and section titles (bundle the
    Serif TTFs, OFL);
  - contact line, dates right-aligned, bullets.
- **`moderan`:** a 34% sidebar on `accent` with contact, skills,
  languages and licence chips; the main column has the name, headline,
  summary, experience, education and certificates.
- **`minimalan`:** light first name, bold last name, section titles in a
  left column, dates on the right.
- **Theme:** `theme.ts` holds `accent` (default Šljakam teal `#0B6E65`)
  and sizes, so phase 5 only has to pass a different accent.
- **Tests per template:**
  - renders a full profile on one A4 page and an empty profile without
    crashing;
  - the text extraction comes out in reading order for the one-column
    templates (name → summary → experience → education);
  - the sidebar template is allowed a sidebar-first order.
- **Picker thumbnails:**
  - add `scripts/cv/previews.mjs`: renders each template with the sample
    candidate from the sketch page, turns page 1 into a PNG with
    `pdfjs-dist` (new dev dependency, only for this script) in Playwright,
    and writes `apps/web/public/cv-templates/<code>.png`;
  - the picker shows it when Sanity has no `previewImage`.
- **Checks:** verify, e2e, `e2e:visual` (picker step).

### PR 4 — `feat/cv-templates-new`: Evropski and Praktičan

- **`evropski`:**
  - label column 13.5em, sections in Europass order, CEFR table (one level
    per language);
  - "Digitalne veštine" from the `digitalSkills` line (PR 2); hidden when
    empty.
  - Photo slot ready (hidden until PR 5).
  - No Europass name or logo.
- **`prakticni`:**
  - larger type;
  - header with a big phone number;
  - the "Ukratko" box (licence chips, availability, certificates,
    languages) leaves out empty cells and disappears when all are empty;
  - then experience, school and skill chips.
- **Codes everywhere:**
  - `cvTemplateCodes` gains `evropski` and `prakticni`;
  - migration `NNNN_cv_template_codes.sql` drops and re-adds
    `resume_assets_template_code_check` with five codes (header with the
    rollback: the old three-code constraint, which fails while any row
    uses a new code; documented);
  - journal entry;
  - Sanity `cvTemplate` code list;
  - `templateNames` messages;
  - registry entries;
  - thumbnails via the script.
- **Picker:** badges from the registry, "ATS-siguran" ("ATS-safe") and
  "Sa fotografijom" ("With photo"), the latter shown once PR 5 lands.
  Five cards, in the order 1–5.
- **Tests:**
  - per-template render tests as in PR 3;
  - integration: an insert with `evropski` passes and an unknown code is
    rejected by the DB;
  - e2e: the picker shows five cards, generate with `prakticni`, and the
    CV is in the list with the right template name;
  - visual baseline for the picker.
- **Checks:** verify, e2e, integration, visual.

### PR 5 — `feat/cv-photo-and-accent`: photo and accent colour

Depends on the storage work. Before starting, read the merged storage
change and use its upload and serve path. Today candidate files live under
`CANDIDATE_UPLOAD_DIR` on the VM.

- **Photo:**
  - `POST /candidate/photo` (Nest) with the BFF route: JPEG or PNG ≤ 5 MB,
    re-encoded to a 600×600 square JPEG with metadata stripped;
  - stored as one file per candidate;
  - column `candidates.photo_storage_key` (migration);
  - `DELETE` removes it;
  - `GET` through the BFF for the preview.
  - Ask before adding an image library if the API has none; check first,
    and `sharp` is the usual choice.
- **Using the photo:**
  - in the wizard, the basics step gets an upload with a round crop
    preview and "Ukloni" (Remove), plus "Prikaži fotografiju na CV-u"
    ("Show photo on the CV", default off);
  - `moderan` and `evropski` draw it;
  - the server render reads the file and passes a buffer;
  - the browser preview uses the BFF URL.
- **Accent:**
  - `candidateGenerateResumeBodySchema.accent`: one of five named swatches
    (teal, navy, plum, burgundy, graphite);
  - stored on `resume_assets.accent` (migration, nullable) so a
    regenerate keeps it;
  - `klasican` ignores it.
  - Every swatch passes `pnpm check:contrast` for white text on the
    accent (sidebar) and accent text on white.
- **Tests:**
  - API integration: upload, replace, delete, and a too-large or wrong
    type is rejected;
  - the PDF text or a render test shows the photo is drawn only when
    present and switched on;
  - e2e: upload a photo, pick Moderan, generate, then remove the photo;
  - accent: generate with plum, and the stored row has `plum`.
- **Checks:** verify, e2e, integration, visual.

### PR 6 — `feat/cv-picker-content`: picker polish and Sanity copy

- **Picker:**
  - large thumbnail cards with badges and a one-line "Za koga" ("Who it's
    for") from Sanity, falling back to messages;
  - preselect the recommended template:
    - `prakticni` if the candidate added licences or certificates and has
      no links;
    - `klasican` otherwise.
  - The live preview stays below the picker.
- **Sanity:**
  - five `cvTemplate` documents with sr/en names and descriptions
    (`TODO(Stefan)`: final copy; drafts from this plan);
  - the Studio deploy is Stefan's (NEEDS_STEFAN).
- **Docs:** `PROGRESS.md`, and NEEDS_STEFAN for the Studio deploy and
  copy.
- **Tests:**
  - e2e: a candidate with a licence sees Praktičan preselected;
  - visual baseline for the picker at 375 and 1440 px.

### Order, size and risks

- **Order:**
  - PR 1 → 2 → 3 → 4 in a row (about 5 working days);
  - PR 5 waits for the storage change and is about 1.5 days;
  - PR 6 is half a day.
- **Risks:**
  - **The browser preview bundle grows** with more templates and fonts.
    Keep fonts as static files fetched by URL in the browser, not
    imported, and check the wizard page's JS size in PR 3.
  - **One-page fit:** long profiles (15 jobs) must flow onto page 2
    cleanly. Render tests use a maximum profile too, and entries never
    split mid-way (`wrap={false}`, already used).
  - **Old CVs:** stored PDFs never change. A candidate who regenerates
    with `klasican` gets the new look, which is expected.
  - **Concurrent work:** the CMS `cvTemplate` schema and messages files
    are touched by other sessions too. Rebase right before each merge.

## Sources

- Two-column vs one-column parsing:
  [Enhancv test](https://enhancv.com/blog/two-column-resume-ats-test/),
  [ATS Verification benchmark](https://atsverification.com/blog/ats-parsing-benchmark-2026/),
  [techinterview.org](https://www.techinterview.org/post/3233474603/ats-friendly-resume-formatting-engineers/)
- Reverse-chronological as the dominant format:
  [Rezi](https://www.rezi.ai/posts/best-resume-templates)
- Hybrid format for drivers and warehouse work:
  [LiveCareer](https://livecareer.com/resume-examples/driver-warehouse-orders),
  [CVowl](https://www.cvowl.com/resume-format/warehouse-driver),
  [Resume Genius](https://resumegenius.com/resume-examples/warehouse-worker-resume-example)
- Europass:
  [national centre in Serbia](https://erasmusplus.rs/networks-and-initiatives/europass/),
  [Serbian editor (EPALE)](https://epale.ec.europa.eu/en/resource-centre/content/europass-cv-line-editor-serbian),
  [sections and CEFR](https://www.biurokarier.umk.pl/en/europass-cv),
  [Novorésumé, European CV and photos](https://novoresume.com/career-blog/european-cv-format)
- Serbian HR advice:
  [Telegraf](https://www.telegraf.rs/zivot-i-stil/know-how/3050080-razgovor-za-posao-cv-pisanje-biografije-greske),
  [Univerzitet u Beogradu, CV guide (languages)](https://bio.bg.ac.rs/wp-content/uploads/2026/02/cv_uputstvo.pdf)
- Designs:
  [Jake's Resume](https://latextemplates.com/template/jakes-resume/),
  [Awesome-CV](https://github.com/posquit0/Awesome-CV),
  [AltaCV](https://github.com/liantze/AltaCV),
  [Reactive Resume](https://github.com/AmruthPillai/Reactive-Resume),
  [Resume Genius designs](https://resumegenius.com/resume/resume-design)
