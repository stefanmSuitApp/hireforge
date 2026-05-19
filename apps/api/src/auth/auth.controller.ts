import { Body, Controller, Post } from '@nestjs/common';
import { employerSelfSignupBodySchema } from 'contracts';
import { z } from 'zod';

import { codedBadRequest } from '../http/coded-http';
import { AuthService } from './auth.service';

const registerSchema = employerSelfSignupBodySchema;

const loginSchema = z.object({
  email: z.email().max(320),
  password: z.string().min(1).max(128),
});

const candidateRegisterSchema = z.object({
  email: z.email().max(320),
  password: z.string().min(8).max(128),
  fullName: z.string().min(1).max(120).optional(),
});

const refreshSchema = z.object({
  refreshToken: z.string().min(10).max(4096),
});

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('employer/register')
  async registerEmployer(@Body() body: unknown) {
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
  async registerCandidate(@Body() body: unknown) {
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
  async loginCandidate(@Body() body: unknown) {
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
      throw codedBadRequest(
        'VALIDATION_FAILED',
        'Invalid request body',
        z.flattenError(parsed.error),
      );
    }
    return this.auth.loginCandidate(parsed.data);
  }

  @Post('employer/login')
  async loginEmployer(@Body() body: unknown) {
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
      throw codedBadRequest(
        'VALIDATION_FAILED',
        'Invalid request body',
        z.flattenError(parsed.error),
      );
    }
    return this.auth.loginEmployer(parsed.data);
  }

  @Post('staff/login')
  async loginStaff(@Body() body: unknown) {
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
      throw codedBadRequest(
        'VALIDATION_FAILED',
        'Invalid request body',
        z.flattenError(parsed.error),
      );
    }
    return this.auth.loginStaff(parsed.data);
  }

  @Post('refresh')
  async refresh(@Body() body: unknown) {
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
}
