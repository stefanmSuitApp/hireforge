/** Normalized Levenshtein ratio: `distance / max(|a|, |b|, 1)`. */
export function levenshteinDistance(a: string, b: string): number {
  if (a === b) {
    return 0;
  }
  const m = a.length;
  const n = b.length;
  if (m === 0) {
    return n;
  }
  if (n === 0) {
    return m;
  }

  const dp = new Uint32Array(n + 1);
  for (let j = 0; j <= n; j++) {
    dp[j] = j;
  }
  for (let i = 1; i <= m; i++) {
    let prev = dp[0];
    dp[0] = i;
    const aCode = a.charCodeAt(i - 1);
    for (let j = 1; j <= n; j++) {
      const tmp = dp[j];
      const cost = aCode === b.charCodeAt(j - 1) ? 0 : 1;
      dp[j] = Math.min(dp[j] + 1, dp[j - 1] + 1, prev + cost);
      prev = tmp;
    }
  }
  return dp[n];
}

export function normalizedLevenshteinRatio(a: string, b: string): number {
  const d = levenshteinDistance(a, b);
  const denom = Math.max(a.length, b.length, 1);
  return d / denom;
}

/** SSOT §7.4 — max ~5 % normalized edit distance per field. */
export const JOB_TRIVIAL_PATCH_MAX_RATIO = 0.05;

export function isWithinTrivialPatchRatio(a: string, b: string): boolean {
  return (
    normalizedLevenshteinRatio(a, b) <= JOB_TRIVIAL_PATCH_MAX_RATIO + 1e-12
  );
}
