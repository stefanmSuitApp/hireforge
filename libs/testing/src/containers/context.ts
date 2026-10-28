/** What the global setup hands every test worker (through Vitest provide/inject). */
export interface IntegrationContext {
  postgres: {
    host: string;
    port: number;
    user: string;
    password: string;
    /** Migrated and seeded once per run; every test file gets a copy of it. */
    template: string;
  };
  redis: { host: string; port: number; password: string };
}

declare module 'vitest' {
  export interface ProvidedContext {
    integration: IntegrationContext;
  }
}

export const TEMPLATE_DB = 'hf_template';

export function pgUrl(
  ctx: IntegrationContext['postgres'],
  database: string,
): string {
  return `postgres://${ctx.user}:${ctx.password}@${ctx.host}:${ctx.port}/${database}`;
}

export function redisUrl(ctx: IntegrationContext['redis'], db: number): string {
  return `redis://:${ctx.password}@${ctx.host}:${ctx.port}/${db}`;
}
