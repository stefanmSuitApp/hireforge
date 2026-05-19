# Step 15 — Public jobs URL contract

## Job list (`/{locale}/jobs`)

### Selection (desktop preview)

- **Query param:** `job`
- **Value:** exactly the **public job URL segment** used in `/jobs/[jobRef]` — either:
  - a **UUID** (`[0-9a-f-]{36}`), or
  - a **published slug** (`publicJobUrlSegment` — SEO slug when set, else UUID).

Examples:

- `/sr/jobs?job=a1b2c3d4-e5f6-7890-abcd-ef1234567890`
- `/sr/jobs?q=react&city=beograd&job=senior-developer-beograd-a3f`

### Behaviour

1. **Desktop (`md+`):** Updating `job` selects the right-hand preview pane without navigating away from the list. Pagination and filters preserve `job` when built via shared query helpers.
2. **Mobile (`<md`):** Row taps navigate to `/{locale}/jobs/{segment}` (full detail). The list page may still parse `job` for SSR prefetch, but the primary mobile UX is the detail route.
3. **Shareability:** Copying the list URL including `job` reproduces the same selection on desktop after reload.

### Filter params (single source of truth)

All filters live in the query string (aligned with §15.3):

| Param | Meaning |
|-------|---------|
| `page`, `pageSize` | Pagination |
| `q` | Full-text search |
| `city`, `category` | Slug filters |
| `workModel` | `onsite` \| `remote` \| `hybrid` |
| `employmentType` | `full_time` \| `part_time` \| `contract` \| `internship` \| `temporary` |
| `postedWithin` | `1d` \| `7d` \| `30d` — `published_at` lower bound |
| `easyApply` | `1` when set — only `apply_mode = internal` |

Empty / omitted params mean “no constraint” for that dimension.

### Implementation hooks

- Web: [`apps/web/src/features/jobs/lib/jobs-list-query.ts`](../../apps/web/src/features/jobs/lib/jobs-list-query.ts) (`JobsSearchParams`, `buildListQuery`).
- API: [`libs/contracts/src/lib/public-jobs.ts`](../../libs/contracts/src/lib/public-jobs.ts) (`publicJobListQuerySchema`) — must stay in sync with the web builder.
