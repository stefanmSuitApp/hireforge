// Same images as docker-compose.yml and the CI e2e services, so tests run on
// the Postgres/Redis versions we ship.
export const POSTGRES_IMAGE = 'postgres:16-alpine';
export const REDIS_IMAGE = 'redis:7-alpine';
