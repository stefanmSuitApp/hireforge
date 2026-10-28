import type { Pool, PoolClient } from 'pg';

export interface PlanNode {
  'Node Type': string;
  'Index Name'?: string;
  'Relation Name'?: string;
  Plans?: PlanNode[];
  [key: string]: unknown;
}

/** The executed plan for a query, so tests can state which index it must use. */
export async function explain(
  db: Pool | PoolClient,
  sql: string,
  params: unknown[] = [],
): Promise<PlanNode> {
  const { rows } = await db.query<{ 'QUERY PLAN': [{ Plan: PlanNode }] }>(
    `explain (analyze, format json) ${sql}`,
    params,
  );
  const plan = rows[0]?.['QUERY PLAN'][0]?.Plan;
  if (!plan) throw new Error('EXPLAIN returned no plan');
  return plan;
}

export function planNodes(plan: PlanNode): PlanNode[] {
  return [plan, ...(plan.Plans ?? []).flatMap(planNodes)];
}

export function usesIndex(plan: PlanNode, indexName: string): boolean {
  return planNodes(plan).some((node) => node['Index Name'] === indexName);
}

/** True when the plan reads `table` row by row (no index at all). */
export function seqScans(plan: PlanNode, table: string): boolean {
  return planNodes(plan).some(
    (node) =>
      node['Node Type'] === 'Seq Scan' && node['Relation Name'] === table,
  );
}
