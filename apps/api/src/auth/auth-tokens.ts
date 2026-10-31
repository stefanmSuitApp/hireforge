import { createHash, randomBytes } from 'node:crypto';

import { and, eq, isNull } from 'drizzle-orm';
import { authTokens, type DrizzleDb, type DrizzleTransaction } from 'database';

export type AuthTokenPurpose =
  | 'email_verify'
  | 'password_reset'
  | 'account_invite';

export const AUTH_TOKEN_TTL_MS: Record<AuthTokenPurpose, number> = {
  email_verify: 48 * 60 * 60 * 1000,
  password_reset: 60 * 60 * 1000,
  // Staff send it to a company they're talking to; an hour is too short.
  account_invite: 7 * 24 * 60 * 60 * 1000,
};

export function hashAuthToken(raw: string): string {
  return createHash('sha256').update(raw).digest('hex');
}

/**
 * Creates a single-use token and voids earlier unused ones of the same purpose
 * (only the newest emailed link works). Returns the raw token for the email.
 */
export async function issueAuthToken(
  db: DrizzleDb,
  userId: string,
  purpose: AuthTokenPurpose,
  now = new Date(),
): Promise<string> {
  const raw = randomBytes(32).toString('base64url');
  await db.transaction(async (tx) => {
    await tx
      .update(authTokens)
      .set({ usedAt: now })
      .where(
        and(
          eq(authTokens.userId, userId),
          eq(authTokens.purpose, purpose),
          isNull(authTokens.usedAt),
        ),
      );
    await tx.insert(authTokens).values({
      userId,
      purpose,
      tokenHash: hashAuthToken(raw),
      expiresAt: new Date(now.getTime() + AUTH_TOKEN_TTL_MS[purpose]),
    });
  });
  return raw;
}

/**
 * Marks the token used and returns its user, or null when unknown, expired,
 * already used, or for another purpose. Row-locked so it works exactly once.
 */
export async function consumeAuthToken(
  tx: DrizzleTransaction,
  raw: string,
  purpose: AuthTokenPurpose,
  now = new Date(),
): Promise<string | null> {
  const [row] = await tx
    .select({
      id: authTokens.id,
      userId: authTokens.userId,
      purpose: authTokens.purpose,
      expiresAt: authTokens.expiresAt,
      usedAt: authTokens.usedAt,
    })
    .from(authTokens)
    .where(eq(authTokens.tokenHash, hashAuthToken(raw)))
    .for('update')
    .limit(1);
  if (
    !row ||
    row.purpose !== purpose ||
    row.usedAt !== null ||
    row.expiresAt.getTime() <= now.getTime()
  ) {
    return null;
  }
  await tx
    .update(authTokens)
    .set({ usedAt: now })
    .where(eq(authTokens.id, row.id));
  return row.userId;
}
