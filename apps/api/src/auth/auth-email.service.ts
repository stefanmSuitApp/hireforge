import { Injectable, Logger } from '@nestjs/common';
import { eq, sql } from 'drizzle-orm';
import { users } from 'database';
import {
  accountInviteMessage,
  appPublicOrigin,
  type EmailLocale,
  type RenderedEmail,
  passwordResetMessage,
  sendEmail,
  verifyEmailMessage,
} from 'server-email';

import { codedBadRequest, codedServiceUnavailable } from '../http/coded-http';
import { getDb } from '../database';
import {
  type AuthTokenPurpose,
  consumeAuthToken,
  issueAuthToken,
} from './auth-tokens';
import { hashPassword } from './password';

/**
 * Verification + password-reset email flows. Sent directly from the API
 * (not the outbox) so raw tokens are never persisted anywhere but the email.
 */
@Injectable()
export class AuthEmailService {
  private readonly logger = new Logger(AuthEmailService.name);

  private requireDb() {
    const database = getDb();
    if (!database) {
      throw codedServiceUnavailable(
        'DATABASE_UNAVAILABLE',
        'Database is not configured (DATABASE_URL)',
      );
    }
    return database;
  }

  private link(locale: EmailLocale, path: string, token: string): string {
    return `${appPublicOrigin()}/${locale}/${path}?token=${encodeURIComponent(token)}`;
  }

  /** Returns false when the email could not be delivered (not configured or Resend error). */
  private async deliver(
    to: string,
    message: RenderedEmail,
    link: string,
  ): Promise<boolean> {
    const result = await sendEmail({ to, ...message });
    if (result.status === 'skipped') {
      if (process.env.NODE_ENV === 'production') {
        this.logger.error('RESEND_API_KEY is not set; auth email not sent');
      } else {
        this.logger.warn(`[dev] auth email to ${to} not sent; link: ${link}`);
      }
      return false;
    }
    return true;
  }

  /** Issues a verification link and emails it. Errors are surfaced to the caller. */
  async sendVerification(
    userId: string,
    email: string,
    locale: EmailLocale,
  ): Promise<boolean> {
    const { db } = this.requireDb();
    const token = await issueAuthToken(db, userId, 'email_verify');
    const link = this.link(locale, 'verify-email', token);
    return this.deliver(email, verifyEmailMessage(locale, link), link);
  }

  /** Signup path: a failed send must not fail registration (user can resend). */
  async sendVerificationAfterSignup(
    userId: string,
    email: string,
    locale: EmailLocale,
  ): Promise<void> {
    try {
      await this.sendVerification(userId, email, locale);
    } catch (error) {
      this.logger.error(
        `verification email failed for user ${userId}: ${
          error instanceof Error ? error.message : 'unknown error'
        }`,
      );
    }
  }

  async resendVerification(
    userId: string,
    locale: EmailLocale,
  ): Promise<{ ok: true; alreadyVerified: boolean }> {
    const { db } = this.requireDb();
    const [user] = await db
      .select({ email: users.email, verifiedAt: users.emailVerifiedAt })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    if (!user) {
      throw codedBadRequest('AUTH_TOKEN_INVALID', 'Unknown user');
    }
    if (user.verifiedAt) {
      return { ok: true, alreadyVerified: true };
    }
    let delivered = false;
    try {
      delivered = await this.sendVerification(userId, user.email, locale);
    } catch (error) {
      this.logger.error(
        `verification resend failed for user ${userId}: ${
          error instanceof Error ? error.message : 'unknown error'
        }`,
      );
    }
    if (!delivered && process.env.NODE_ENV === 'production') {
      throw codedServiceUnavailable(
        'AUTH_EMAIL_SEND_FAILED',
        'Could not send the email right now',
      );
    }
    return { ok: true, alreadyVerified: false };
  }

  async verifyEmail(token: string): Promise<{ ok: true }> {
    const { db } = this.requireDb();
    const verified = await db.transaction(async (tx) => {
      const userId = await consumeAuthToken(tx, token, 'email_verify');
      if (!userId) {
        return false;
      }
      const [user] = await tx
        .select({ verifiedAt: users.emailVerifiedAt })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);
      if (user && !user.verifiedAt) {
        await tx
          .update(users)
          .set({ emailVerifiedAt: new Date(), updatedAt: new Date() })
          .where(eq(users.id, userId));
      }
      return true;
    });
    if (!verified) {
      throw codedBadRequest(
        'AUTH_TOKEN_INVALID',
        'This link is invalid or has expired',
      );
    }
    return { ok: true };
  }

  /** Always resolves the same way so the response does not reveal whether the email exists. */
  async requestPasswordReset(
    email: string,
    locale: EmailLocale,
  ): Promise<{ ok: true }> {
    const { db } = this.requireDb();
    const normalized = email.trim().toLowerCase();
    const [user] = await db
      .select({ id: users.id, email: users.email })
      .from(users)
      .where(eq(users.email, normalized))
      .limit(1);
    if (user) {
      try {
        const token = await issueAuthToken(db, user.id, 'password_reset');
        const link = this.link(locale, 'reset-password', token);
        await this.deliver(
          user.email,
          passwordResetMessage(locale, link),
          link,
        );
      } catch (error) {
        this.logger.error(
          `password reset email failed for user ${user.id}: ${
            error instanceof Error ? error.message : 'unknown error'
          }`,
        );
      }
    }
    return { ok: true };
  }

  async resetPassword(token: string, password: string): Promise<{ ok: true }> {
    return this.setPasswordFromLink(token, 'password_reset', password);
  }

  /**
   * Staff-created account (no password yet): issues an invite link and emails
   * it. The link is returned too, so staff can pass it on another way; a
   * failed send must not lose the account that was just created.
   */
  async sendAccountInvite(input: {
    userId: string;
    email: string;
    companyName: string;
    locale: EmailLocale;
  }): Promise<{ inviteUrl: string; emailSent: boolean }> {
    const { db } = this.requireDb();
    const token = await issueAuthToken(db, input.userId, 'account_invite');
    const inviteUrl = this.link(input.locale, 'accept-invite', token);
    let emailSent = false;
    try {
      emailSent = await this.deliver(
        input.email,
        accountInviteMessage(input.locale, inviteUrl, input.companyName),
        inviteUrl,
      );
    } catch (error) {
      this.logger.error(
        `account invite email failed for user ${input.userId}: ${
          error instanceof Error ? error.message : 'unknown error'
        }`,
      );
    }
    return { inviteUrl, emailSent };
  }

  /** The invited person never saw a sign-up form, so the terms are accepted here. */
  async acceptInvite(
    token: string,
    password: string,
    acceptedTermsVersion: string | undefined,
  ): Promise<{ ok: true }> {
    return this.setPasswordFromLink(
      token,
      'account_invite',
      password,
      acceptedTermsVersion
        ? { termsVersion: acceptedTermsVersion, termsAcceptedAt: new Date() }
        : {},
    );
  }

  private async setPasswordFromLink(
    token: string,
    purpose: Extract<AuthTokenPurpose, 'password_reset' | 'account_invite'>,
    password: string,
    extra: Partial<typeof users.$inferInsert> = {},
  ): Promise<{ ok: true }> {
    const { db } = this.requireDb();
    const passwordHash = await hashPassword(password);
    const done = await db.transaction(async (tx) => {
      const userId = await consumeAuthToken(tx, token, purpose);
      if (!userId) {
        return false;
      }
      const [user] = await tx
        .select({ verifiedAt: users.emailVerifiedAt })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);
      await tx
        .update(users)
        .set({
          ...extra,
          passwordHash,
          updatedAt: new Date(),
          // Sign out every existing session (someone may know the old password).
          tokenVersion: sql`${users.tokenVersion} + 1`,
          // Following the emailed link proves the mailbox, so verify too.
          ...(user && !user.verifiedAt ? { emailVerifiedAt: new Date() } : {}),
        })
        .where(eq(users.id, userId));
      return true;
    });
    if (!done) {
      throw codedBadRequest(
        'AUTH_TOKEN_INVALID',
        'This link is invalid or has expired',
      );
    }
    return { ok: true };
  }
}
