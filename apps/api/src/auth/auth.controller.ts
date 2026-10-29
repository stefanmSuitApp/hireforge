import {
  Body,
  Controller,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import {
  candidateRegisterBodySchema,
  employerSelfSignupBodySchema,
} from 'contracts';
import type { Request } from 'express';
import { z } from 'zod';

import { codedBadRequest } from '../http/coded-http';
import { AuthEmailService } from './auth-email.service';
import {
  assertEmailLinkRateLimit,
  assertLoginRateLimit,
  assertPasswordResetRequestRateLimit,
  assertRefreshRateLimit,
  assertRegisterRateLimit,
  assertResendVerificationRateLimit,
} from './auth-rate-limit';
import { AuthService } from './auth.service';
import { AuthenticatedGuard } from './authenticated.guard';

const registerSchema = employerSelfSignupBodySchema;

const loginSchema = z.object({
  email: z.email().max(320),
  password: z.string().min(1).max(128),
});

const localeSchema = z.enum(['sr', 'en']).optional();

const candidateRegisterSchema = candidateRegisterBodySchema.extend({
  locale: localeSchema,
});

const tokenSchema = z.object({ token: z.string().min(16).max(256) });

const resetRequestSchema = z.object({
  email: z.email().max(320),
  locale: localeSchema,
});

const resetConfirmSchema = z.object({
  token: z.string().min(16).max(256),
  password: z.string().min(8).max(128),
});

function parseOrThrow<T extends z.ZodType>(
  schema: T,
  body: unknown,
): z.infer<T> {
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    throw codedBadRequest(
      'VALIDATION_FAILED',
      'Invalid request body',
      z.flattenError(parsed.error),
    );
  }
  return parsed.data;
}

const refreshSchema = z.object({
  refreshToken: z.string().min(10).max(4096),
});

@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly authEmail: AuthEmailService,
  ) {}

  @Post('employer/register')
  async registerEmployer(@Body() body: unknown, @Req() req: Request) {
    await assertRegisterRateLimit(req);
    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) {
      throw codedBadRequest(
        'VALIDATION_FAILED',
        'Invalid request body',
        z.flattenError(parsed.error),
      );
    }
    return this.auth.registerEmployer(parsed.data);
  }

  @Post('candidate/register')
  async registerCandidate(@Body() body: unknown, @Req() req: Request) {
    await assertRegisterRateLimit(req);
    const parsed = candidateRegisterSchema.safeParse(body);
    if (!parsed.success) {
      throw codedBadRequest(
        'VALIDATION_FAILED',
        'Invalid request body',
        z.flattenError(parsed.error),
      );
    }
    return this.auth.registerCandidate(parsed.data);
  }

  @Post('candidate/login')
  async loginCandidate(@Body() body: unknown, @Req() req: Request) {
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
      throw codedBadRequest(
        'VALIDATION_FAILED',
        'Invalid request body',
        z.flattenError(parsed.error),
      );
    }
    await assertLoginRateLimit(req, 'candidate', parsed.data.email);
    return this.auth.loginCandidate(parsed.data);
  }

  @Post('employer/login')
  async loginEmployer(@Body() body: unknown, @Req() req: Request) {
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
      throw codedBadRequest(
        'VALIDATION_FAILED',
        'Invalid request body',
        z.flattenError(parsed.error),
      );
    }
    await assertLoginRateLimit(req, 'employer', parsed.data.email);
    return this.auth.loginEmployer(parsed.data);
  }

  @Post('staff/login')
  async loginStaff(@Body() body: unknown, @Req() req: Request) {
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
      throw codedBadRequest(
        'VALIDATION_FAILED',
        'Invalid request body',
        z.flattenError(parsed.error),
      );
    }
    await assertLoginRateLimit(req, 'staff', parsed.data.email);
    return this.auth.loginStaff(parsed.data);
  }

  @Post('refresh')
  async refresh(@Body() body: unknown, @Req() req: Request) {
    await assertRefreshRateLimit(req);
    const parsed = refreshSchema.safeParse(body);
    if (!parsed.success) {
      throw codedBadRequest(
        'VALIDATION_FAILED',
        'Invalid request body',
        z.flattenError(parsed.error),
      );
    }
    return this.auth.refreshTokens(parsed.data.refreshToken);
  }

  @Post('verify-email')
  async verifyEmail(@Body() body: unknown, @Req() req: Request) {
    await assertEmailLinkRateLimit(req);
    const { token } = parseOrThrow(tokenSchema, body);
    return this.authEmail.verifyEmail(token);
  }

  @Post('verify-email/resend')
  @UseGuards(AuthenticatedGuard)
  async resendVerification(@Body() body: unknown, @Req() req: Request) {
    const userId = req.hireforgeUser?.id;
    if (!userId) {
      throw new UnauthorizedException();
    }
    const { locale } = parseOrThrow(
      z.object({ locale: localeSchema }),
      body ?? {},
    );
    await assertResendVerificationRateLimit(userId);
    return this.authEmail.resendVerification(userId, locale ?? 'sr');
  }

  @Post('password-reset/request')
  async requestPasswordReset(@Body() body: unknown, @Req() req: Request) {
    const { email, locale } = parseOrThrow(resetRequestSchema, body);
    await assertPasswordResetRequestRateLimit(req, email);
    return this.authEmail.requestPasswordReset(email, locale ?? 'sr');
  }

  @Post('password-reset/confirm')
  async confirmPasswordReset(@Body() body: unknown, @Req() req: Request) {
    await assertEmailLinkRateLimit(req);
    const { token, password } = parseOrThrow(resetConfirmSchema, body);
    return this.authEmail.resetPassword(token, password);
  }
}
