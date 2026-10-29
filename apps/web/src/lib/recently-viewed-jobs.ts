const STORAGE_KEY = 'hf:recentJobRefs:v1';
const MAX_ITEMS = 8;
/** Fired on `window` after a job view is recorded. */
export const RECENT_JOBS_EVENT = 'hf:recent-jobs';

export function pushRecentJobRef(segment: string): void {
  const key = segment.trim();
  if (!key || typeof globalThis.localStorage === 'undefined') {
    return;
  }
  try {
    const raw = globalThis.localStorage.getItem(STORAGE_KEY);
    const prev = raw ? (JSON.parse(raw) as string[]) : [];
    const next = [key, ...prev.filter((x) => x !== key)].slice(0, MAX_ITEMS);
    globalThis.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    globalThis.dispatchEvent?.(new Event(RECENT_JOBS_EVENT));
  } catch {
    /* ignore quota / private mode */
  }
}

export function readRecentJobRefs(): string[] {
  if (typeof globalThis.localStorage === 'undefined') {
    return [];
  }
  try {
    const raw = globalThis.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}
