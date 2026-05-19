const STORAGE_KEY = 'hf:recentJobRefs:v1';
const MAX_ITEMS = 8;

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
