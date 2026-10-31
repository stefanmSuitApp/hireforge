# Go-to-market review and launch plan (2026-10-31)

Independent review of Šljakam's launch strategy (business, legal, tax,
market) and a comparison with what this repo actually implements, followed
by a work plan. Written in a Claude Code session on 2026-10-31 from
Stefan's handoff document (`sljakam_ai_handoff.md`), web research and a read
of this repo. **This is not legal or tax advice**; the items marked
"official opinion" must go to the ministry, a lawyer or the accountant.

Labels used below:

- **[V]** verified: read in the primary source (law text on paragraf.rs,
  Google docs, the competitor's own page) on 2026-10-31.
- **[U]** unverified: secondary source, snippet or inference.
- **TODO(Stefan)**: only Stefan knows or decides.

---

## 0. How to use this file (for the next agent, Cursor or Claude)

1. Read `AGENTS.md`, `PROGRESS.md`, `NEEDS_STEFAN.md` first, as usual.
2. §6 lists **decisions Stefan has not made yet**. Do not implement a work
   package that depends on an open decision; ask, or take the recommended
   option only if Stefan has said to keep going without him (then record it
   in `PROGRESS.md`).
3. §7 is the work plan: work packages (WP-…) with goal, files, approach,
   tests and done criteria, ordered by phase. Each WP is meant to be one
   branch and one PR, following the Definition of done in `AGENTS.md`.
4. Nothing in this file overrides `AGENTS.md`. Prices, legal wording and
   names that are not confirmed stay `TODO(Stefan)`.
5. When a WP ships, tick it here and log it in `PROGRESS.md`.

### Status (autonomous run from 2026-10-31)

Stefan asked Claude to work through this plan without stopping, one PR per
work package, waiting for staging after each merge. Decisions taken under
"keep going without me" (recommended options only, recorded here and in
`PROGRESS.md`):

- **D2** taken: `paid_social_ads` comes off the package cards.
- **D3** taken: package copy says one city until WP-C3.
- **Left for Stefan:** D1 (prices; production Sanity is shared, so no price
  is changed), D4 (reverses the October guest-access decision), D5, D7, D8,
  D9. No production deploy.

Order: A1 → A4 → A5 → A6 → A2 → A3 (D2/D3 part only) → B4 → B3. Ticks
below in §7 as each one merges.

---

## 1. Executive summary

1. **The repo is strong engineering, aimed at the wrong first problem.**
   HireForge is built as "a better Infostud" for all of Serbia with
   paid-from-the-first-ad packages. The launch bottleneck is different:
   **no candidates and no employers yet**. The audience, not the job
   inventory, is the asset to build first.
2. **Do not scrape or copy other boards' ads.** Database rights and EU case
   law make it the riskiest option. Google for Jobs (the usual reason to
   aggregate) **does not run in Serbia** [V]. Instead use the
   **concierge model**: find a public ad anywhere, call the employer,
   publish it for free **with their consent**, applications go straight to
   them (phone, Viber, email or their link).
3. **Paušal is fine for the test, with one real tax risk.** "Reklamiranje i
   istraživanje tržišta" is excluded from paušal (ZPDG čl. 40 st. 2) [V].
   Remove **paid social campaigns** from packages (also undelivered in
   code) and ask the accountant first (Stefan, 2026-10-31: no ministry
   letters for now; see §8).
4. **Payments: bank transfer + IPS QR, no cards.** Stripe does not serve
   Serbia, Paddle explicitly bans job boards, Lemon Squeezy bans advertising
   [V]. The repo already does proforma + transfer; add IPS QR and the
   seller block on the PDF.
5. **Start with one city (Niš, where the business is registered) and mass
   market verticals**: hospitality, student and part-time work, local retail
   and logistics. Not Belgrade, not IT.
6. **Launch blockers in code** (§5.3): employers cannot download CVs or
   change application status; invoice PDF does not name the seller;
   packages promise "3 cities" and "paid social ads" that the code does not
   deliver; no salary fields; no per-job stats to show employers.
7. **Pricing: free basic ad, paid visibility** (§2.7, §4.3). TEZGA free,
   ŠLJAKA 1.990 RSD and ŠEF 4.990 RSD for 30 days, with featured placement
   as the paid feature (already built). A founding code and a "30 days
   free" guarantee use the existing promo codes.

---

## 2. Research findings

### 2.1 Competitor pricing (checked 2026-10-31)

| Site                                                   | Product: price / duration                                                                                                                                                          | VAT   |                       |
| ------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- | --------------------- |
| Infostud (price list at hrlab.rs/cene-oglasa-za-posao) | Mini 3.300/15d, 4.600/30d (300 chars, 1 city); Start 7.200/9.600; Standard 16.800/23.800; Progresiv 34.200/48.600; Premium 57.700/81.200. IT bundle with HelloWorld from 9.000/15d | excl. | [V]                   |
| Halo oglasi                                            | Standardni 2.700/15d, 3.900/30d; Top 4.800/6.600; Premium 8.100/10.200                                                                                                             | incl. | [V]                   |
| oglasi.rs                                              | Standardni 990/7d, 1.980/14d, 3.960/month; Top 2.200/7d                                                                                                                            | incl. | [V]                   |
| rad.rs                                                 | Osnovni 3.900, Standard 5.900, Premium 9.900, all 60 days (handoff said 3.000: wrong)                                                                                              | excl. | [V]                   |
| sbu-poslovi.rs                                         | 2.500/10d; 3.500/20d; 4.500/30d (higher tiers pinned in 2 FB groups)                                                                                                               | n/a   | [V]                   |
| Lako do posla                                          | **Free tier** (3 ads, 180 chars, 15d); Kratki 1.700/15d; Osnovni 3.500/15d, 5.000/30d; up to 25.000                                                                                | n/a   | [V]                   |
| rsoglasi.rs                                            | **Free** 5 business activations/30d; extra ad 999                                                                                                                                  | incl. | [V]                   |
| poslovi.dispeceri.rs                                   | Osnovni 8.900/15d, 12.500/30d …                                                                                                                                                    | excl. | [V]                   |
| gdesiposao.com                                         | Just oglas 6.500                                                                                                                                                                   | excl. | [V]                   |
| Joberty (IT)                                           | **Free**; Standard €200; Premium €300 / 30d                                                                                                                                        | excl. | [V]                   |
| KupujemProdajem                                        | 452 job ads (waiters, cooks, couriers, warehouse); posting fee for the Poslovi group unclear                                                                                       | —     | [V] count / [U] price |
| NSZ                                                    | Employers publish via nsz.gov.rs/company; NSZ also republishes Infostud and Lako do posla ads                                                                                      | free? | [V]/[U]               |
| "Poslovi Naissus" (in handoff)                         | not found                                                                                                                                                                          | —     | —                     |

**Takeaways.** A free basic ad already exists in the market (Lako do posla,
rsoglasi, Joberty, Facebook groups, KP). Free is table stakes, not a
differentiator. The current repo prices (TEZGA €30/15d ≈ 3.500 RSD) cost
about the same as Infostud Mini, with no audience. Šljakam is outside VAT,
so its price is the final price; Infostud Mini with VAT is 3.960 RSD.

### 2.2 Market data (Infostud press releases) [V]

- H1 2026: 32.713 ads (+3% y/y). Trade 6.570; Production 3.389; Services
  and crafts 2.962; Hospitality and tourism 2.429 (**+13%**); Construction
  2.232 (**+15%**); IT 1.633 (**−32%**). Youth and student ads 4.868
  (**+24%**, ~15% of all ads).
- Specialised roles: on average **82 applications per ad** in H1 2026, so
  professional roles do not lack candidates. Blue-collar shortage is the
  opposite problem [U, inference from the deficit-occupation lists].
- Live counts on Poslovi Infostud, 2026-10-31: Beograd 1.861, Novi Sad 464,
  **Niš 223**, Kragujevac 200, Subotica 173. Single platform, not official
  statistics.
- No dedicated local job portal found for Niš or Kragujevac [V, search].
- Seasonal peaks (Kopaonik, December retail): no hard evidence [U].

### 2.3 Google for Jobs and JobPosting [V]

- Google's JobPosting page (updated 2026-09-08) lists supported countries;
  **Serbia is not among them**. JobPosting markup gives no job rich result
  here. Ordinary SEO still applies, but it is slow for a new domain.
- Policy points that matter if Serbia is added later: one job per page;
  must be able to apply; no expired jobs (use `validThrough`, 404/410 or
  remove markup); **"job postings on behalf of an organization without
  authorization" are a violation**; only employers may set `baseSalary`.
- Consequence for the repo: JobPosting and the Indexing API are already
  built; keep them, but the Indexing API service account (NEEDS_STEFAN) is
  low priority.

### 2.4 Legal risk register

| Category                      | Item                                                                                                             | Basis                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Forbidden / high risk**     | Systematic copying of other boards' ads                                                                          | Zakon o autorskom i srodnim pravima čl. 137–138 [V]: database maker's right, including **systematic extraction of insubstantial parts** (čl. 138 st. 5). CJEU **C-762/19 CV-Online Latvia v Melons** (2021): a job-ad aggregator infringes when it harms the maker's investment. Persuasive in Serbia (same directive).                                                                                                                                                                                                                                                                                                                   |
| **Forbidden**                 | Collecting CVs for ads of employers who did not agree                                                            | ZZPL (purpose, legal basis), misleading candidates, and referral is part of "posredovanje" (Zakon o zapošljavanju čl. 44) [V]: licence needed; fine for an unlicensed agency-preduzetnik 50.000–400.000 RSD (čl. 103) [V]                                                                                                                                                                                                                                                                                                                                                                                                                 |
| **Forbidden**                 | Charging candidates anything                                                                                     | Zakon o zapošljavanju čl. 5, 31: services are free for the unemployed [V]                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| **Allowed with conditions**   | Facts-only entries (title, company, city) linking to the **employer's own careers page**, never to another board | Facts are not copyright works [U]; one company site is not a "substantial investment" database [U]. Own wording, no logo, label "Prijava na sajtu poslodavca", no JobPosting markup, ≤ ~30% of inventory                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| **Allowed with conditions**   | Ads we write with the employer's consent                                                                         | We are the author, so the hosting exemption (Zakon o elektronskoj trgovini čl. 18) [V] **does not** cover that text. Keep the consent in writing (SMS, Viber, email)                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| **Allowed with conditions**   | Cold calls to employers                                                                                          | Calls are fine. **Cold e-mail is ambiguous**: ZET čl. 8 requires prior consent with no B2B exception (fixed fine 20.000 RSD for a preduzetnik) [V]; Zakon o oglašavanju čl. 63 st. 4 exempts business communication [V]. Call first, e-mail after a verbal yes                                                                                                                                                                                                                                                                                                                                                                            |
| **Allowed with conditions**   | Moderation of discriminatory ads                                                                                 | Zakon o radu čl. 18–20; Zakon o zabrani diskriminacije; Zakon o rodnoj ravnopravnosti čl. 44 [V]. In 2021 the Commissioner found "students up to 26" discriminatory [V]. "Devojke do 30" is common in hospitality, so a keyword warning and a report button are needed                                                                                                                                                                                                                                                                                                                                                                    |
| **Unclear: official opinion** | Is Šljakam an "agencija za zapošljavanje"?                                                                       | čl. 6 counts "informing about employment opportunities" among employment services; čl. 44 defines posredovanje as matching, preliminary selection and referral [V]. A passive board is probably not posredovanje [U]. Infostud's homepage names no licence [V]. **Stay a strictly passive board; do not build CV-database search, matching or "recommended candidates" without a lawyer's opinion (and, through the lawyer, MINRZS's) first.** Stefan decided not to write to MINRZS himself for now (2026-10-31). Licence: Ministry permit, ≥1 employee with a degree, exam (čl. 21) [V]; a preduzetnik can hold one (čl. 103 st. 3) [V] |
| **Clean model**               | Employer posts, or consents; applications go straight to them                                                    | No CV stored by Šljakam for that ad, so ZZPL risk is minimal; ZET čl. 18 covers user-posted ads                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |

**ZZPL details [V]:** a processor needs a written contract (čl. 45); records
of processing are mandatory for continuous processing even under 250
employees (čl. 47); a DPO is probably not mandatory at launch (čl. 56);
fines for a preduzetnik 20.000–500.000 RSD (čl. 95). Roles [U]: Šljakam is
the controller for candidate accounts; the employer becomes a separate
controller once it receives an application.

**Trademark [V, zis.gov.rs]:** word mark, classes 35 + 42: about
63.000 RSD filed electronically (application + registration +
certificate); +~10.700 RSD for a figurative mark. Check the fee calculator:
fees were indexed on 2026-07-01.

### 2.5 Tax, invoicing and payments

- **Paušal exclusions (ZPDG čl. 40 st. 2) [V]:** advertising and market
  research; trade; hospitality; finance; real estate; businesses with
  investors; turnover above **6.000.000 RSD** in the previous year; VAT
  payers. 63.12 is not on the list [V]. No Ministry of Finance opinion
  found on a paušalac selling ads on its own portal [V, search].
  - Selling a job-ad slot on our own portal is closer to 63.12.
  - **Running paid Meta campaigns for clients is closer to advertising.**
- **The 6M limit covers the whole business** [V], including any other
  revenue the agency earns. Current annual turnover: TODO(Stefan).
- **VAT:** mandatory above 8.000.000 RSD in any 12 months (Zakon o PDV čl. 33) [V]; the paušal limit binds first. Reverse-charge VAT on foreign
  services (hosting, ads) may apply [U]; ask the accountant.
- **New activity codes from 2027-01-01 (KD 2025)** [V]: APR remaps codes
  automatically; where one old code maps to several, there are 30 days to
  pick. In NACE 2.1, 63.12 is split [V for the EU; U for Serbia's table].
  Ask the accountant which code applies.
- **Paušal deadline:** the 2027 application was due 31 Oct (late until 31
  Dec) [V]. As an existing paušalac it probably continues automatically
  [U]: confirm.
- **SEF e-invoices:** a non-VAT paušalac is **not** obliged for B2B; it is
  for the public sector (voluntary registration first) [V].
- **Fiscal receipts:** sales to individuals always need one; B2B paid by
  transfer from a site aimed at businesses is most likely not retail [U].
  Card payments through the site may be [U]. **So: B2B only, by transfer.**
- **Currency (Zakon o deviznom poslovanju čl. 34) [V]:** residents pay in
  RSD; EUR-denominated quotes are allowed if paid in RSD (the repo already
  prints an RSD line at the NBS rate).
- **Cards:** Stripe not available in Serbia [V]; Paddle bans "job boards"
  [V]; Lemon Squeezy bans advertising [V]. Later option: a bank acquiring
  contract + local gateway (Banca Intesa, Halkbank, ProCredit; quotes
  needed) [U]. **NBS IPS QR** (ips.nbs.rs) is the cheap instant option for
  proformas now.
- **DOO later (ZPD čl. 92) [V]:** the preduzetnik continues as a DOO; minimum
  capital 100 RSD (čl. 145) [V]; accounting about €100–250/month [U]. The
  preduzetnik answers with all personal assets [V]. Triggers: turnover near
  ~4.5–5M RSD, a partner or investor, employees, or a large CV database.
  Do not put the project into the existing shared DOO.

### 2.6 Acquisition channels

- Facebook groups ("Posao Niš", "Posao Novi Sad", …) are where small
  businesses hire today [U, member counts need a login]. sbu-poslovi sells
  pinning in its own groups [V].
- Meta CPM in Serbia possibly ~$2 outside December [V chart, weak source].
- **TikTok self-serve ads are not available for Serbia** [V]: organic only.
- Aggregators that accept feeds: Jooble (PPC partner model), Careerjet [U].
  NSZ republishes partner boards' ads [V], so ask NSZ to take ours.
- ATS public endpoints (Greenhouse, Lever, Workable) exist [V] but grant no
  republishing licence: use only with the employer's opt-in.

### 2.7 How other boards priced their way up from zero (researched 2026-10-31)

| Business                    | What they did                                                                                                                                               | Lesson                                                                             | Label |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- | ----- |
| Indeed (2004)               | Free job posts; paid "sponsored" jobs sit above free ones. Free posts slowly drop as new jobs arrive. Indeed claims up to 5× more clicks for sponsored jobs | Charge for being seen, not for being listed; free ads sinking is the reason to pay | [U]   |
| LinkedIn Jobs               | One free job open at a time; promoted jobs paid with a daily budget                                                                                         | Limit free ads per company, don't cripple them                                     | [U]   |
| Craigslist                  | Free everywhere; from August 2004, $25 per job post only in New York and Los Angeles, later more cities. Paid job ads became its main revenue               | Charge where and when the audience exists                                          | [V]   |
| OLX Romania (2017)          | Entered jobs at €3.3–3.7 a month against eJobs at €119+; later added premium packages for employers; 6M+ applications in 2023                               | A far-below-incumbent price can take a market, but OLX already had the audience    | [U]   |
| Lako do posla, Joberty (RS) | Free tier plus paid packages (§2.1)                                                                                                                         | Free is normal in Serbia; charging for the basic ad loses to them                  | [V]   |
| Remote OK                   | High prices from day one                                                                                                                                    | Works only with an audience the founder already had                                | [U]   |
| Facebook Jobs               | Entirely free; shut down outside the US and Canada in 2022 (no reason given)                                                                                | Free with nothing to buy is not a business                                         | [U]   |

**Proven:** the structure (free basic ad, paid visibility, prices that rise
with the audience). **Not proven:** any exact price for Serbia. No source
gives one, so §4.3's numbers must be tested.

Sources: [Indeed – Wikipedia](https://en.wikipedia.org/wiki/Indeed),
[Indeed business model – ProductMint](https://productmint.com/the-indeed-business-model-how-does-indeed-work-make-money/),
[LinkedIn Hiring Pro pricing](https://business.linkedin.com/hire/hiring-pro/pricing),
[Craigslist – Wikipedia](https://en.wikipedia.org/wiki/Craigslist),
[NBC News on Craigslist fees](https://www.nbcnews.com/id/wbna11169134),
[Romania Insider on OLX jobs](https://www.romania-insider.com/ad-platform-olx-enters-online-recruitment-segment-romania),
[Capital.ro on OLX premium](https://www.capital.ro/olx-adauga-un-serviciu-premium-dedicat-angajatorilor.html),
[Bursa on OLX applications 2023](https://www.bursa.ro/peste-6-milioane-de-aplicari-la-anunturile-de-angajare-publicate-pe-platforma-olx-in-2023-04031255),
[Remote OK – Latka](https://getlatka.com/companies/remote-ok),
[Element on Facebook Jobs](https://elementapp.ai/blog/facebook-jobs-shutting-down-what-changes/),
[Cavuno on job board pricing](https://cavuno.com/blog/job-board-pricing-models).

---

## 3. Critique of the original launch plan

| Original assumption                                 | What the evidence says                                                                                                    |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Candidates will find copied ads via Google          | Google for Jobs does not run in Serbia [V]; a new domain with duplicate ads gets near-zero organic traffic for months [U] |
| Copied ads fill the site                            | Visually yes, but value leaks to the source: the candidate clicks out                                                     |
| "Your ad had 48 clicks" sells                       | Weak: the employer cannot see or attribute those candidates                                                               |
| Candidates apply through Šljakam to non-partner ads | **Reject.** CVs with no legal basis to forward them (ZZPL), misled candidates, and referral is posredovanje               |
| Supply is the bottleneck                            | For blue-collar roles, **candidates** are scarce; the local candidate audience is what an employer buys                   |

**What stays:** active outbound sales from day one, and real measured
interest as the sales argument.

---

## 4. Recommended strategy

### 4.1 Concierge supply (consent-based aggregation)

1. Every morning collect ~30 current ads for the target city (KP, Facebook
   groups, Infostud, "potreban radnik" signs). These are **sales leads, not
   content**.
2. Call or visit: "I saw you're hiring a waiter. I can publish the ad free
   on Šljakam and our Niš Instagram. Candidates call you directly, and in
   two weeks I'll send you how many got in touch."
3. Confirm consent by Viber, SMS or e-mail and record it (WP-B1). Write the
   ad ourselves from the facts the employer gives.
4. After 14 days send the stats report (WP-A6) and offer ŠLJAKA with the
   guarantee.
5. In weeks 4–6, approach 2–3 student cooperatives (high ad volume; watch
   age wording).

The repo's moderator/AE lead pipeline (staff create company leads and
publish on the employer's behalf) already supports this flow; it lacks
provenance and consent fields.

### 4.2 Segment, city, channels

- **Verticals in order:** (1) hospitality, (2) student and part-time,
  (3) local retail, delivery and warehouse. Large retail chains: facts-only
  entries linking to their careers pages.
- **Defer:** IT, administration, construction.
- **City:** Niš (registered seat of the business, 223 Infostud ads, no local
  job portal found). Alternative: Novi Sad. Not Belgrade. TODO(Stefan):
  confirm.
- **Candidate channels:**
  - IG/FB page "Šljakam Niš" with daily job cards that show salary.
  - Viber community and e-mail alerts.
  - Existing FB groups (by their rules, or a deal with the admins).
  - QR posters at faculties and dorms.
  - Meta ads €100–150/month, optimised for alert sign-ups, not clicks.
  - Organic TikTok.
  - XML feed to Jooble and Careerjet.
  - Ask NSZ to republish.

### 4.3 Packages and pricing (recommended; decision D1)

The packages follow what worked for other job boards (§2.7) and promise only
what the code delivers today (§4.4). **The prices are proposals to test,
not proven numbers.** Changing them later is a CMS edit, not code.

**Model: a free basic ad plus paid visibility.** The free ad is complete
and usable. Payment buys position and reach, never the right to post. This
is the Indeed and LinkedIn pattern. Charging for the basic ad itself
(today's €30 TEZGA) is the model none of the boards in §2.7 grew from zero
with, in a market where free alternatives exist.

|                               | **TEZGA**                                | **ŠLJAKA**                                                                                                                                    | **ŠEF**                                    | **GAZDA**             |
| ----------------------------- | ---------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------ | --------------------- |
| Price (final; outside VAT)    | **0 RSD**                                | **1.990 RSD / 30 days**                                                                                                                       | **4.990 RSD / 30 days**                    | on request, not shown |
| Active ads                    | 1 per company                            | 1                                                                                                                                             | 3 (ops can raise: slot override)           | 10+                   |
| Text                          | 2.000 chars; bold, italic, lists; 1 link | 4.000 chars; + headings; 3 links                                                                                                              | 8.000 chars; full editor + images; 5 links | as now                |
| Salary, phone/Viber apply     | yes (WP-A4, WP-A5)                       | yes                                                                                                                                           | yes                                        | yes                   |
| Position                      | newest first; sinks as new ads arrive    | **featured for 30 days:** above every non-featured ad in lists, search, city and category pages; gold ribbon; home "featured" strip (6 slots) | same, for each ad                          | same                  |
| Own image (PNG creative)      | —                                        | yes                                                                                                                                           | yes                                        | yes                   |
| Šljakam social posts (manual) | —                                        | 1 post + story, only if D8 says someone posts                                                                                                 | 2 per ad, same condition                   | agreed                |
| E-mail per application        | yes                                      | yes                                                                                                                                           | yes                                        | yes                   |
| Stats                         | application count                        | + views and contact clicks (WP-A6)                                                                                                            | same                                       | same                  |
| Cities                        | 1                                        | 1 (until WP-C3)                                                                                                                               | 1 (until WP-C3)                            | 1                     |
| Paid ad campaigns             | no                                       | no                                                                                                                                            | **no** (removed: tax and margin)           | no                    |

**Why these prices** (competitor prices from §2.1):

- **ŠLJAKA 1.990 RSD** is about 43% of Infostud Mini for 30 days (4.600
  RSD + VAT), half of oglasi.rs for a month (3.960) and close to Lako do
  posla Kratki (1.700 for 15 days). Cheap enough to buy without asking
  anyone, and not so cheap that it looks like a classified (oglasi.rs is
  990 for 7 days). About €17.
- **ŠEF 4.990 RSD** is 1.663 per ad and about half of Infostud Start for 30
  days (9.600 + VAT). For restaurants, chains and cooperatives that hire all
  the time. About €43.
- **The step from free to paid is visibility only.** Vendor guides put
  featured listings 50–100% above a standard listing [U]. Here the base is
  free, so the whole price is the feature.
- **One duration (30 days):** drop the 15-day price rows, so there is one
  less choice at checkout [U: assumption, not tested].
- **Show prices in RSD:** the segment thinks in dinars, and competitors
  price in RSD.

**Launch mechanics** (everything below is built unless marked):

1. **Concierge ads** go up as TEZGA, published by staff through the existing
   moderator/AE lead pipeline (§4.1).
2. **Founding employers:** one private promo code, `full_free`, valid only
   for ŠLJAKA and ŠEF, `maxRedemptions` **15**, once per company. The pitch:
   "the first 15 employers in Niš get their first featured ad free". After
   that, list price. Capped at 15, not 30: with ~60 active ads at day 30,
   30 free featured ads would make featuring worthless (point 7). A zero total activates with no proforma or invoice;
   the accountant still has to confirm that (PROGRESS, open item 2).
3. **One price, no split test, days 31–60:** about 30 offers split in two
   groups cannot show a 2× difference, and employers in one city talk to
   each other. Keep 1.990 for everyone for 60 days, then decide with the
   day-60 numbers (§9): under 3 of 30 offers paid → try 990–1.490; most
   offers paid without pushback → 2.490.
4. **Guarantee without refunds:** "no application in 14 days, and the next
   30 days are free", issued as a single-use `full_free` code. No money
   goes back, so no credit note is needed (WP-C4 not built). **Offer it
   only after WP-A5 and WP-A6 ship**: most concierge ads take calls, and
   until contact clicks are counted almost every ad would qualify.
5. **Public campaigns:** at most one at launch (the launch week in the
   city). Recurring free weeks teach employers to wait [U].
6. **Price increases, the Craigslist rule:** keep the list prices until paid
   ads in the city get a median of ≥10 applications or contacts for two
   months running. Then ŠLJAKA goes to 2.990 and ŠEF to 6.990, in the CMS.
   Prices are national in the code (no per-city prices). When a second city
   opens, give it a launch code or campaign rather than lower list prices.
7. **Crowding:** featured is a yes/no flag for the whole period. Once a city
   has more than ~15 featured ads (guests see page 1 = 20 ads), build
   time-limited featuring plus a "bump" (WP-C6), or cap featured slots.
8. **Later:** credit packs for cooperatives and chains (WP-C2), price
   TODO(Stefan).

**Economics [U]:** €150 a month of cash costs is covered by about 9 ŠLJAKA
sales. Revenue in the first 90 days will be small; the goal is learning.

GAZDA (enterprise, admin-activated) stays as it is, minus `paid_social_ads`.
It is not offered publicly and costs nothing until a large customer appears.

### 4.4 What the packages can rely on today (checked in code, 2026-10-31)

| Capability                                         | What the code does                                                                                                                                                                                                                                                                     | Use in §4.3                           |
| -------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------- |
| `max_active_jobs`                                  | Enforced; ŠEF and GAZDA allow an ops override (`effectiveMaxActiveJobs`, `libs/contracts/src/lib/packages.ts`)                                                                                                                                                                         | Yes                                   |
| `max_characters`, `editor`, `hyperlinks_max_count` | Enforced when the draft is saved (`libs/server/jobs/src/lib/entitlements-draft.ts`)                                                                                                                                                                                                    | Yes                                   |
| `featured_listing`                                 | Allows `jobs.featured`. Public lists sort `featured desc, published_at desc` (`apps/api/src/public-jobs/public-jobs.service.ts` ~677, ~823); gold ribbon (`public-job-teaser-card.tsx`); home strip, 6 slots (`app/[locale]/page.tsx:122`). Lasts the whole period; no expiry, no bump | **The main paid feature**             |
| `png_creative`                                     | The employer's https image is shown on the ad (`job-listing-preview.tsx`)                                                                                                                                                                                                              | Yes                                   |
| `crossborder_visible`                              | Only a badge on the ad                                                                                                                                                                                                                                                                 | Keep on ŠEF, do not market it         |
| `max_cities`                                       | Entitlement exists, but a job has one `city_id`                                                                                                                                                                                                                                        | Show 1 city                           |
| `social_publish`                                   | Flag only                                                                                                                                                                                                                                                                              | Manual posting only (D8)              |
| `paid_social_ads`                                  | Flag only                                                                                                                                                                                                                                                                              | Remove                                |
| E-mail to the employer per application             | Worker event `application_submitted` (`apps/worker/src/notification-email.ts`)                                                                                                                                                                                                         | Yes                                   |
| Promo codes and campaigns                          | `percent`, `fixed`, `full_free`; package filter; `maxRedemptions`; per-company cap; public campaigns with a home banner (`libs/contracts/src/lib/promo-codes.ts`, `promo-campaigns.ts`)                                                                                                | Founding offer, price test, guarantee |
| Newest-first ordering                              | Free ads sink as new ads arrive                                                                                                                                                                                                                                                        | The reason to pay                     |
| **Not built**                                      | View stats (WP-A6), time-limited featuring and bump (WP-C6), multi-city (WP-C3), credit packs (WP-C2), card payments (WP-C1)                                                                                                                                                           | Promise none of these                 |
| Currency                                           | Packages are seeded in EUR; the schema accepts RSD                                                                                                                                                                                                                                     | Verify RSD end to end (WP-A3)         |

---

## 5. HireForge versus the strategy

### 5.1 Already aligned

- Mass-market positioning (`PRODUCT_SSOT_SLJAKAM.md` §1, lines ~82–91).
- No scraping: terms forbid it (`docs/legal/terms.sr.md:50`); no CV-database
  search (`docs/legal/README.md`).
- Proforma → transfer → moderator marks paid → invoice; no auto-renew; RSD
  line at the NBS rate (`apps/api/src/billing/`,
  `libs/server/pdf/src/lib/billing-form-document.tsx`).
- Moderator/AE lead pipeline with staff publishing (good base for the
  concierge flow).
- Terms state "Šljakam nije poslodavac ni agencija za zapošljavanje".
- Public promo campaigns (free weekend / X days) and private promo codes
  exist (`docs/plans/EMPTY_SITE_AND_CAMPAIGNS.md`): a promo period needs no
  new code.
- Auto-expiry (worker), 3-day expiry warning, JobPosting with `validThrough`,
  sitemaps, city and category landing pages, consent banner, legal pages.

### 5.2 Conflicts

| Topic                                              | Repo today                                                                                                                | Recommendation                                                                                |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| Prices                                             | TEZGA €30/15d, €37/30d; ŠLJAKA €40/€47; ŠEF €55/30d (Sanity seed `scripts/cms/seed-sanity.mjs`, synced to Postgres)       | §4.3. **CMS change, not code** (WP-A3)                                                        |
| `paid_social_ads` (ŠEF, GAZDA)                     | Flag only, shown on package cards, nothing delivers it                                                                    | Remove (WP-A3)                                                                                |
| `social_publish` (ŠLJAKA+)                         | Flag only; no social profiles exist                                                                                       | Keep only if Stefan posts by hand; otherwise hide                                             |
| `featured_listing`                                 | Only ŠEF and GAZDA; ŠLJAKA has none, so its only gain over TEZGA is text length                                           | Turn it on for ŠLJAKA: it is the paid feature (§4.3, WP-A3)                                   |
| Durations                                          | 15 and 30 days for TEZGA and ŠLJAKA, 30 for ŠEF                                                                           | 30 days only (WP-A3)                                                                          |
| "3 cities" / "unlimited cities"                    | **One `cityId` per job**; multi-city deferred (`docs/refactor/MULTI_CITY_JOBS.md`)                                        | Packages promise something that does not exist: change the copy (WP-A3) or build it (WP-C3)   |
| TEZGA 400 chars, 1 link, formatting locked by tier | `libs/contracts/src/lib/packages.ts`, `entitlements-draft.ts`                                                             | 2.000 chars and lists on the free tier (§4.3)                                                 |
| Salary                                             | **No salary fields** although salary transparency is the headline promise                                                 | Add (WP-A4)                                                                                   |
| Apply modes                                        | `internal` or https `external` only                                                                                       | Add phone, Viber, e-mail with click tracking (WP-A5)                                          |
| Apply friction                                     | Account + verified e-mail before the first application                                                                    | The SSOT target "first apply < 90 s" is hard to meet; phone/Viber ads need no account (WP-A5) |
| Guest limits                                       | Page 1 (20 jobs) only; filters and page 2+ need an account (`GUEST_ACCESS_B.md`)                                          | Every gate shrinks an audience that does not exist yet; at least free filters (decision D4)   |
| Go-to-market docs                                  | National, 5 cities. `PROJECT_SSOT.md` (~lines 41–50) still says "Belgrade + IT"; the SEO checklist targets IT communities | One city, mass market; clean the stale text (WP-A8)                                           |
| Google for Jobs / Indexing API                     | Built; Indexing API waits on a service account                                                                            | Not available in Serbia; low priority                                                         |
| Next phase in `PROGRESS.md`                        | CV templates 3 → 5 (shipped 2026-10-31)                                                                                   | Phase G0 next                                                                                 |
| Supply plan                                        | "TODO(Stefan): who and how" (`docs/plans/SEO_REACH_CHECKLIST.md:38`)                                                      | §4.1 concierge model                                                                          |

### 5.3 Launch blockers (checked in code)

1. **Employers cannot download CVs or change application status.**
   `apps/api/src/employer/employer.controller.ts` has only
   `GET jobs/:id/applications` (email, CV file name, cover letter). The
   status enum (submitted, viewed, shortlisted, rejected, withdrawn, hired)
   is only changed by the candidate's withdraw. → WP-A1.
2. **Invoice/proforma PDF names no seller**: no legal name, PIB or MB, no
   buyer PIB/MB, no VAT-status note (`billing-form-document.tsx`; plan item
   C3 in `docs/plans/LEGAL_AND_INVOICES.md`). → WP-A2.
3. **No per-job stats**: only `externalApplyClicks`, shown to nobody. →
   WP-A6.
4. **No account deletion and no retention sweeper** (C2, C5). Needed before
   collecting candidates at scale. → WP-B5.

---

## 6. Decisions needed from Stefan

- [ ] **D1 Packages and pricing:** adopt §4.3: TEZGA 0, ŠLJAKA 1.990 RSD,
      ŠEF 4.990 RSD, all 30 days, prices in RSD, featured placement moved
      into ŠLJAKA? (Recommended: yes. An earlier draft of this file said
      990 / 2.490; §2.7 research raised it.)
- [ ] **D2 Paid social ads:** remove `paid_social_ads` from ŠEF and GAZDA
      until the accountant (or, through them, the Ministry of Finance) confirms
      it fits paušal? (Recommended: yes.)
- [ ] **D3 Multi-city:** change package copy to one city now (cheap), or
      build multi-city jobs (WP-C3)? (Recommended: copy now, build later.)
- [ ] **D4 Guest gating:** open filters and page 2+ to guests until traffic
      exists? (Recommended: yes; keep the soft sign-up prompts.)
- [ ] **D5 Launch city:** Niš? (Recommended: Niš, or wherever Stefan can
      visit employers in person.)
- [x] **D6 Next phase:** moot. CV templates 3 → 5 shipped on 2026-10-31
      (#77–#87); Phase G0 is next.
- [ ] **D7 Launch mechanics** (§4.3): founding code (first featured ad
      free, first 15 employers), one price for 60 days, and the "no
      application in 14 days, next 30 days free" guarantee instead of cash
      refunds?
- [ ] **D8 Social:** create IG/FB "Šljakam Niš" (or "Šljakam") profiles and
      a Viber community; who posts?
- [ ] **D9 Facts-only entries** for big employers' careers pages (§2.4): yes
      or no?
- [ ] Current agency turnover and hours per week available: TODO(Stefan).

---

## 7. Work plan

Each WP = one branch + one PR, following `AGENTS.md` (options first when it
touches more than ~3 files, a failing test first, `pnpm verify`,
`E2E_WEB=start pnpm e2e`, `pnpm test:integration` for API/DB changes, UI at
375 and 1440 px, `PROGRESS.md` updated).

### Phase G0: before the first employer call (target: 3–4 weeks)

Each of A1, A4, A5 and A6 needs a migration or a new API plus the full
Definition of done, so two weeks is optimistic. The **anonymous alert
sign-up** in WP-B2 is the main way to keep candidates who apply by phone
(WP-A5 stores nothing about them), so start WP-B2 right after G0 rather
than late in G1.

#### WP-A1 Employer applications workflow (blocker)

- **Goal:** the employer can open, download and decide on applications.
- **Files:** `apps/api/src/employer/employer.controller.ts`,
  `employer.service.ts` (applications ~1594–1650), `libs/server/applications`,
  `libs/contracts` (status transitions, error codes),
  `apps/web/src/app/api/employer/...` (BFF), the employer applications UI,
  `messages/{sr,en}.json`.
- **Approach:**
  - Secure CV download (uploaded file or CV-builder PDF), only for that
    company's employers, through the BFF.
  - Transitions: viewed (automatic on first open), shortlisted, rejected,
    hired. Lock the row in the same transaction, emit an outbox event, and
    optionally notify the candidate through the worker.
- **Tests:**
  - Integration: company isolation (another company gets 403/404), illegal
    transitions are rejected.
  - E2E: an employer opens an application, downloads the CV, shortlists.
- **Done:** an employer can handle a real applicant end to end.

#### WP-A2 Invoice seller block (blocker for any paid sale) = LEGAL C3

- **Goal:** proforma and invoice carry the seller's legal name, address, MB,
  PIB and account; the buyer's PIB/MB; and the VAT-status note.
- **Files:** `libs/server/pdf/src/lib/billing-form-document.tsx`,
  `libs/server/pdf/.../billing-pdf.service.ts`,
  `apps/api/src/billing/billing-content.service.ts` (operator data from
  Sanity `siteSettings` or env, per `LEGAL_AND_INVOICES.md`).
- **Approach:** operator data must be configurable (paušal now, DOO later).
  The **note wording is not confirmed** (`LEGAL_AND_INVOICES.md` suggests
  "Obveznik nije u sistemu PDV-a (član 33. Zakona o PDV-u)"): keep it
  configurable and leave TODO(Stefan) for the accountant.
- **Tests:** unit tests on the PDF data model (seller and buyer fields
  present, note rendered); a snapshot of the text.
- **Alternative if delayed:** no paid sales for the first 60 days (free
  launch campaign), which removes the blocker in time.

#### WP-A3 Package config: prices, promises, limits (depends on D1–D3)

- **Goal:** packages only promise what the code delivers, at the decided
  prices.
- **Files:**
  - Sanity package documents, or `scripts/cms/seed-sanity.mjs` and
    `scripts/db/seed-domain-baseline.sql` for the seeds.
  - `libs/contracts/src/lib/packages.ts` (entitlement schema),
    `apps/web/src/features/employer/lib/package-card-upgrade-features.ts`
    (card copy).
  - `messages/{sr,en}.json`.
- **Approach** (values from §4.3, once D1–D3 are answered):

  | Package | Price rows                                      | `max_active_jobs` | `max_characters` | `featured_listing` | `png_creative`   | `social_publish` | `paid_social_ads` | editor changes            | `hyperlinks_max_count` |
  | ------- | ----------------------------------------------- | ----------------- | ---------------- | ------------------ | ---------------- | ---------------- | ----------------- | ------------------------- | ---------------------- |
  | TEZGA   | 30 d: 0 RSD (drop 15 d)                         | 1                 | 400 → **2.000**  | false              | false            | false            | false             | + bold, italic, **lists** | 1                      |
  | ŠLJAKA  | 30 d: `199000` RSD minor = 1.990,00 (drop 15 d) | 1                 | 4.000            | false → **true**   | false → **true** | per D8           | false             | unchanged                 | 3                      |
  | ŠEF     | 30 d: `499000` RSD minor = 4.990,00             | 3                 | 8.000            | true               | true             | per D8           | true → **false**  | unchanged                 | 5                      |
  | GAZDA   | none (admin)                                    | 10                | 20.000           | true               | true             | per D8           | true → **false**  | unchanged                 | 10                     |
  - Cities: set `maxCitiesCount` 1 everywhere and drop the "unlimited
    cities" card copy until WP-C3 (D3).
  - **Currency:** switch the price rows to RSD. First verify RSD end to end:
    checkout, proforma and invoice PDF (the NBS-rate line must not show for
    RSD), fixed-amount promo codes (they carry a currency, migration 0029)
    and the packages page. If RSD breaks something, fix it in this WP or
    fall back to EUR (≈ €17 / €43) with an RSD line, and say which.
  - **0 price:** check that a 0 RSD TEZGA row works end to end. A `full_free`
    promo total already activates without a proforma; reuse that path if a
    0 price row breaks the proforma flow.
  - Remove `paid_social_ads` from the cards (keep the flag in the schema to
    avoid a migration). Hide `social_publish` on the cards unless D8 names
    who posts.
  - Card copy (`package-card-upgrade-features.ts`, messages): ŠLJAKA leads
    with "Istaknut oglas 30 dana: iznad ostalih oglasa i na početnoj".
    Rename "Period naplate"/"Pretplati se" if they appear anywhere.
  - Existing subscriptions keep their entitlement snapshot; nothing to
    migrate.

- **Tests:**
  - Unit: entitlement validation for the new limits (TEZGA lists allowed,
    TEZGA featured still forbidden, ŠLJAKA featured allowed).
  - E2E: a TEZGA employer publishes an ad with lists; a ŠLJAKA ad shows
    above a newer TEZGA ad in `/jobs` with the featured ribbon.
  - Show both failing before the CMS/seed change.
- **Note:** production prices live in Sanity. Change them in the Studio (or
  re-run the CMS sync) and verify on sljakam.com.

#### WP-A4 Salary fields

- **Goal:** optional salary on every ad (min, max, currency RSD, period
  month/hour, net/gross) and a "Plata istaknuta" badge.
- **Files:** `drizzle/NNNN_job_salary.sql` (header with rollback, journal
  entry), `libs/database/src/schema.ts`, contracts, the job draft API and
  editor, the public job card/detail, `apps/web/src/lib/seo/json-ld.ts`
  (`baseSalary` only when the employer entered it: Google policy),
  search filter later.
- **Tests:** migration up/down; contract validation (min ≤ max); e2e: the
  employer enters a salary and the public card shows it.

#### WP-A5 Apply by phone, Viber, e-mail + click tracking

- **Goal:** hospitality and retail employers get calls; the candidate needs
  no account for those ads.
- **Files:**
  - `schema.ts` (`apply_mode` CHECK gets `phone|viber|email`; new
    `apply_phone`, `apply_email` columns) plus a migration.
  - `libs/server/jobs/src/lib/external-apply-url.ts` (validation pattern),
    contracts, the job editor.
  - Public job detail CTA (`tel:`, `viber://chat?number=`, `mailto:`).
  - A generic event endpoint modelled on
    `apps/web/src/app/api/public/jobs/[jobId]/external-click/route.ts`.
- **Approach:**
  - Count each contact type (see WP-A6).
  - Rate-limit counting per IP to keep the numbers honest.
  - The phone number must never be in the HTML for bots: render it on
    click to reduce scraping.
- **Tests:** unit tests on validation; e2e: a guest taps "Pozovi" and the
  counter increments.

#### WP-A6 Per-job stats + shareable report

- **Goal:** "Your ad: X views, Y calls, Z applications" for each employer.
- **Files:**
  - New `job_daily_stats(job_id, day, views, contacts_by_type,
applications)` table, or counters on `jobs`. A daily table is
    recommended for 14-day reports.
  - View counting in `apps/api/src/public-jobs/public-jobs.service.ts`
    (detail fetch; exclude bots and staff).
  - Employer overview (`employer-overview-stats.tsx`).
  - A signed, unguessable report link for the 14-day message.
- **Tests:** integration: counts per company only; the report link expires
  or can be revoked.

#### WP-A7 Guest gating (depends on D4)

- **Files:** `apps/web/src/middleware/auth-gate.ts`, jobs list route,
  `docs/plans/GUEST_ACCESS_B.md`, product decisions memory.
- **Approach:** open filters and page 2+; keep the third-job soft prompt
  and the sign-up sheet for internal apply.
- **Tests:** update guest e2e expectations.

#### WP-A8 Docs cleanup (small)

- Remove or mark obsolete the "Belgrade + IT" go-to-market text in
  `PROJECT_SSOT.md`.
- Align `SEO_REACH_CHECKLIST.md` with §4.
- Add the paušal "reklamiranje" question to `LEGAL_AND_INVOICES.md`.
- Point `PROGRESS.md` "next" at Phase G0 (after D6).

### Phase G1: first 30–60 days

#### WP-B1 Job provenance and publication consent (concierge)

- New columns on `jobs`:
  - `source_type` (`direct | concierge | official_link`);
  - `source_url` (the employer's own page for `official_link`);
  - `publication_consent` (channel, contact person, timestamp, scope,
    proof note);
  - `last_verified_at`.
- Staff UI to record consent when publishing on the employer's behalf.
- Public label for `official_link`: "Prijava na sajtu poslodavca"; no
  JSON-LD for those.
- Expiry or re-verification for `official_link` entries after N days.
- Tests: staff cannot publish a `concierge` ad without consent data;
  `official_link` pages carry no JobPosting markup.

#### WP-B2 Job alerts (e-mail)

- Saved searches already exist (capped at 50; no list/delete endpoints and
  no sender).
- Add list/delete endpoints, a daily (or instant) digest worker job using
  the outbox/BullMQ pattern, a Resend template, and one-click unsubscribe.
- Also an **anonymous alert sign-up** (e-mail + city + category, double
  opt-in) on job and landing pages: this is the main audience-capture tool.
- Tests: the worker sends a digest only for new matching jobs; unsubscribe
  works without login.

#### WP-B3 Social card / OG image generator

- Next `opengraph-image` per job (title, company, city, salary, Šljakam
  brand), currently missing (`apps/web/src/i18n/metadata.ts` uses `summary`
  with no image).
- A staff "download IG card" (1080×1350 PNG) button for manual posting.
  This is the internal version of the old "PNG creative" feature and the
  biggest time saver for daily posting.
- Tests: the route renders for a job with and without salary; e2e smoke.

#### WP-B4 Moderation: discrimination warning + report button

- A keyword warning in the editor and in the moderation queue: age limits
  ("do 30 godina"), gender ("devojke", "ženske osobe", "muškarac"), "rad od
  kuće + uplata", foreign jobs with fees.
- A warning, not a block: the moderator decides.
- A public "Prijavi oglas" button that creates a moderation item.
- Tests: unit tests on the matcher (Latin and Cyrillic, diacritics); e2e
  report flow.

#### WP-B5 GDPR: account deletion and retention (LEGAL C2 + C5)

- Self-service account deletion (with the 30-day grace already in the SSOT).
- A worker sweeper: anonymise applications after 24 months, purge closed
  accounts after 30 days, keep invoicing data for 10 years.
- Back up candidate CV files (PROGRESS notes they are not backed up).
- Tests: integration on the sweeper with a fake clock.

#### WP-B6 IPS QR on the proforma

- Generate an NBS IPS QR (payee, account, amount in RSD, reference = proforma
  number) on the PDF and on the employer's proforma page.
- Validate against the NBS IPS spec; no dependency unless justified.
- Tests: unit test on the payload string against an NBS example.

#### WP-B7 XML feed for aggregators

- `/feeds/jobs.xml` with direct and concierge ads only (never
  `official_link`), in the format Jooble/Careerjet accept.
- Ask each aggregator for its spec first.
- Tests: the feed validates; expired jobs are absent.

### Phase G2: later, or only when triggered

- WP-C1 Card payments via a local bank gateway (when transfers become a
  sales problem). Check fiscal-receipt duties first.
- WP-C2 Credit packs (5 and 10 ads, 6 months) for cooperatives and chains.
- WP-C3 Multi-city jobs (`docs/refactor/MULTI_CITY_JOBS.md`).
- WP-C4 Credit notes (LEGAL C4), when the first refund happens.
- WP-C5 GAZDA admin creation, cross-border visibility.
- WP-C6 Time-limited featuring and "bump" (`featured_until`, a one-off
  refresh to the top). Trigger: more than ~15 featured ads in one city
  (§4.3 point 7). Lets ŠLJAKA become "featured 7 days + 1 bump" and frees
  room for more paid ads.
- **Only after a lawyer's opinion (and MINRZS's, asked through the
  lawyer):** CV-database search, matching,
  "recommended candidates".
- **Never:** scraping other boards; collecting CVs for non-consented ads;
  charging candidates.

---

## 8. Non-code tasks

| When      | Task                                                                                                                                                                                                                                                       | Cost [U]    |
| --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| Week 1    | Accountant: does selling job-ad slots on our own site fit paušal and 63.12 (and KD 2025 from 2027); invoice note wording; zero-value activations without an invoice; fiscal receipts for B2B transfer; reverse-charge VAT on foreign services; 6M headroom | €50–100     |
| If needed | Only if the accountant is unsure: the accountant or a lawyer asks the Ministry of Finance in their own name, describing the case in general terms. **Stefan does not write to ministries himself for now** (decided 2026-10-31)                            | low         |
| Later     | Mailbox on the domain to replace the Gmail contact in the legal pages. **Deferred by Stefan (2026-10-31)**; Gmail stays for now                                                                                                                            | low         |
| Week 1–2  | IG + FB page, Viber community, profile URLs into `SOCIAL_PROFILES` (`apps/web/src/lib/seo/json-ld.ts`)                                                                                                                                                     | free        |
| Week 1–2  | Free trademark search in the ZIS database                                                                                                                                                                                                                  | free        |
| Day 30–60 | File the word mark "Šljakam", classes 35 + 42 (check the fee calculator)                                                                                                                                                                                   | ~63.000 RSD |
| Day 30–60 | Ask NSZ and Jooble/Careerjet about feeds                                                                                                                                                                                                                   | free        |
| Day 60–90 | Lawyer review of terms and privacy (`docs/legal/`), plus the "agency licence" question; MINRZS only through the lawyer and only before CV search or matching                                                                                               | €300–800    |
| Ongoing   | Outbound: ~15 calls or visits a day; phone first, e-mail after a yes                                                                                                                                                                                       | time        |

---

## 9. 30 / 60 / 90 days

Targets are **hypotheses to test**, not forecasts.

### Days 1–30: permissions and supply

- Phase G0 shipped; the non-code week-1 tasks done.
- Outbound to ~15 employers a day; social profiles and posters live.
- **KPIs:**
  - ≥200 employers contacted;
  - ≥40 concierge ads and ≥60 active ads in Niš;
  - ≥300 audience (followers + alert subscribers + Viber);
  - ≥50% of concierge ads with ≥1 candidate contact.

### Days 31–60: audience and the first payment test

- Phase G1 mostly shipped (B1–B4 first).
- Meta ads €100–150/month optimised for alert sign-ups.
- 14-day reports to employers + ŠLJAKA offer with the guarantee.
- Feeds to aggregators; trademark filed.
- **KPIs:**
  - ≥100 active ads, ≥60% direct or concierge;
  - ≥1.500 audience;
  - median ≥5 candidate contacts per ad in 30 days;
  - ≥30% of employers post again;
  - ≥5 of 30 offers convert to a paid ŠLJAKA.

### Days 61–90: monetisation and decision

- ŠEF and credit packs for cooperatives and chains; 3–5 testimonials.
- **KPIs:**
  - ≥150 active ads;
  - ≥3.000 audience;
  - ≥20 paid transactions in total;
  - ≥3 employers report a hire through Šljakam.

**Cash cost for 90 days:** ~€1.000–1.800 [U] + Stefan's time.

**Decision on day 90:**

- **Go, second city:** median ≥5 contacts per ad **and** (≥10% of active
  employers paid **or** ≥30% repeat).
- **Pivot:** candidates come but employers will not pay. Monetise through
  cooperatives, volume packs or FB-group partnerships.
- **Stop or rethink:** median <2 contacts per ad despite €150/month of ads
  and daily posting. The problem is distribution, not price.

---

## 10. Risks

1. **Stefan's time:** daily sales and posting take hours.
2. **Fake and scam ads:** PIB checks, moderation, WP-B4.
3. **Unfavourable paušal opinion:** move to a DOO earlier.
4. **"Agency" interpretation:** stay a strictly passive board; no
   matching or CV search.
5. **FB groups and KP as free alternatives forever:** compete on audience,
   salary transparency and speed, not price.
6. **Facts-only entries drifting into copying:** cap at ~30% of inventory,
   only employers' own sites, auto-expire.

---

## 11. Suggested first prompts for Cursor / Claude

- "Read `docs/plans/GO_TO_MARKET_REVIEW.md` §5.3 and §7 WP-A1. Propose
  options for the employer applications workflow (CV download + status
  transitions), then implement the one I pick, following AGENTS.md."
- "Implement WP-A2 (LEGAL C3 invoice seller block). Leave the VAT note
  wording as TODO(Stefan) in NEEDS_STEFAN.md."
- After Stefan answers D1–D3: "Implement WP-A3 from the table in §7
  WP-A3 and the decisions in §6. Verify RSD end to end first and show the
  failing tests before the CMS/seed change."
- After D7: "Set up the launch promo codes from §4.3 points 2–4 in the
  admin (founding, price test, guarantee) and list them in PROGRESS.md."
