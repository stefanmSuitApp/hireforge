export const JOBS_LIST_PAGE_SIZE = 12;

export type JobsSearchParams = {
  page?: string;
  pageSize?: string;
  q?: string;
  city?: string;
  category?: string;
  /** Public job URL segment (UUID or slug) for desktop preview pane. */
  job?: string;
  workModel?: string;
  employmentType?: string;
  postedWithin?: string;
  /** `"1"` when Easy Apply (internal) filter is active. */
  easyApply?: string;
};

export type JobsFilterDefaults = {
  q: string;
  city: string;
  category: string;
  job: string;
  workModel: string;
  employmentType: string;
  postedWithin: string;
  easyApply: boolean;
};

export function buildListQuery(
  sp: JobsSearchParams,
  page: number,
  pageSize: number,
): URLSearchParams {
  const qp = new URLSearchParams();
  qp.set('page', String(page));
  qp.set('pageSize', String(pageSize));
  const q = sp.q?.trim();
  if (q) qp.set('q', q);
  if (sp.city?.trim()) qp.set('city', sp.city.trim());
  if (sp.category?.trim()) qp.set('category', sp.category.trim());
  const job = sp.job?.trim();
  if (job) qp.set('job', job);
  const wm = sp.workModel?.trim();
  if (wm) qp.set('workModel', wm);
  const et = sp.employmentType?.trim();
  if (et) qp.set('employmentType', et);
  const pw = sp.postedWithin?.trim();
  if (pw) qp.set('postedWithin', pw);
  if (sp.easyApply === '1' || sp.easyApply === 'true') {
    qp.set('easyApply', '1');
  }
  return qp;
}

/** Client-side URL merges for jobs discovery (chip bar + preview selection). */
/** Stable signature for “did this list payload come from these filters?”. */
export function jobsListFilterSignature(
  sp: JobsSearchParams,
  pageSize: number,
): string {
  const easy = sp.easyApply === '1' || sp.easyApply === 'true';
  return JSON.stringify({
    pageSize,
    q: (sp.q ?? '').trim(),
    city: (sp.city ?? '').trim(),
    category: (sp.category ?? '').trim(),
    job: (sp.job ?? '').trim(),
    workModel: (sp.workModel ?? '').trim(),
    employmentType: (sp.employmentType ?? '').trim(),
    postedWithin: (sp.postedWithin ?? '').trim(),
    easy,
  });
}

/** Build {@link JobsSearchParams} from the current URL + server defaults (for client list queries). */
export function buildJobsSearchParamsFromUrl(
  sp: URLSearchParams,
  defaults: JobsFilterDefaults,
): JobsSearchParams {
  const easy =
    sp.get('easyApply') === '1' ||
    sp.get('easyApply') === 'true' ||
    defaults.easyApply;
  return {
    q: sp.get('q') ?? defaults.q,
    city: sp.get('city') ?? defaults.city,
    category: sp.get('category') ?? defaults.category,
    job: sp.get('job') ?? defaults.job,
    workModel: sp.get('workModel') ?? defaults.workModel,
    employmentType: sp.get('employmentType') ?? defaults.employmentType,
    postedWithin: sp.get('postedWithin') ?? defaults.postedWithin,
    easyApply: easy ? '1' : undefined,
  };
}

export function mergeJobsSearchParams(
  current: URLSearchParams | string,
  patch: Partial<Record<string, string | undefined>>,
): URLSearchParams {
  const n =
    typeof current === 'string'
      ? new URLSearchParams(current)
      : new URLSearchParams(current.toString());
  for (const [k, v] of Object.entries(patch)) {
    if (v === undefined || v === '') {
      n.delete(k);
    } else {
      n.set(k, v);
    }
  }
  n.set('page', '1');
  if (!n.get('pageSize')) {
    n.set('pageSize', String(JOBS_LIST_PAGE_SIZE));
  }
  return n;
}
