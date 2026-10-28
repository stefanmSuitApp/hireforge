import type { UserRole } from 'contracts';
import { userRoles } from 'contracts';
import * as jose from 'jose';

function isUserRole(value: unknown): value is UserRole {
  return (
    typeof value === 'string' &&
    (userRoles as readonly string[]).includes(value)
  );
}

const DEV_FALLBACK = 'dev-insecure-auth-jwt-secret-min-32-chars!!';

function getSecretKey(): Uint8Array {
  const raw = process.env.AUTH_JWT_SECRET?.trim();
  if (raw && raw.length >= 32) {
    return new TextEncoder().encode(raw);
  }
  if (process.env.NODE_ENV === 'production') {
    throw new Error('AUTH_JWT_SECRET must be set (min 32 chars) in production');
  }
  return new TextEncoder().encode(DEV_FALLBACK);
}

export async function signAccessToken(
  userId: string,
  role: UserRole,
): Promise<string> {
  return new jose.SignJWT({ role, typ: 'access' })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime('15m')
    .sign(getSecretKey());
}

/** `tokenVersion` must match `users.token_version` when the token is used. */
export async function signRefreshToken(
  userId: string,
  tokenVersion = 0,
): Promise<string> {
  return new jose.SignJWT({ typ: 'refresh', tv: tokenVersion })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime('14d')
    .sign(getSecretKey());
}

export type AccessJwtPayload = { sub: string; role: UserRole; typ: 'access' };

export async function verifyAccessToken(
  token: string,
): Promise<AccessJwtPayload> {
  const { payload } = await jose.jwtVerify(token, getSecretKey(), {
    algorithms: ['HS256'],
  });
  if (payload.typ !== 'access' || !isUserRole(payload.role)) {
    throw new Error('Malformed access token');
  }
  return {
    sub: String(payload.sub),
    role: payload.role,
    typ: 'access',
  };
}

export async function verifyRefreshToken(
  token: string,
): Promise<{ sub: string; tokenVersion: number }> {
  const { payload } = await jose.jwtVerify(token, getSecretKey(), {
    algorithms: ['HS256'],
  });
  if (payload.typ !== 'refresh') {
    throw new Error('Invalid refresh token');
  }
  // Tokens issued before versioning carry no `tv`: treat as version 0.
  const tokenVersion = typeof payload['tv'] === 'number' ? payload['tv'] : 0;
  return { sub: String(payload.sub), tokenVersion };
}
