const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isUuidString(value: string): boolean {
  return UUID_RE.test(value);
}

/** Prefer SEO slug when present (`/${locale}/jobs/${segment}/...`). */
export function publicJobUrlSegment(job: {
  slug: string | null;
  id: string;
}): string {
  return job.slug ?? job.id;
}
