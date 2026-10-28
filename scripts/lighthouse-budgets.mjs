/**
 * The budgets one Lighthouse run is held to (scripts/perf-budgets.json).
 * `null` = not set yet (reported, never warned). Performance was set to 0.9
 * from the first live run (2026-10-28, PROGRESS.md). On CI (`CI` set) each
 * budget loosens by the margin in `ci`: shared runners measure the same page
 * slower and noisier than a quiet machine (from autofind-platform).
 */
export function heldBudgets(budgets, { onCi = false } = {}) {
  const ci = onCi ? (budgets.ci ?? {}) : {};
  const categories = { ...budgets.categories };
  for (const [id, margin] of Object.entries(ci.categories ?? {})) {
    if (typeof categories[id] === 'number') {
      categories[id] = Math.round((categories[id] - margin) * 100) / 100;
    }
  }
  const metricsMs = { ...budgets.metricsMs };
  for (const [id, margin] of Object.entries(ci.metricsMs ?? {})) {
    if (typeof metricsMs[id] === 'number') metricsMs[id] += margin;
  }
  return { categories, metricsMs, metrics: { ...budgets.metrics } };
}
