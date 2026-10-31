import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import {
  publicCompanyParamSchema,
  publicJobBySlugParamSchema,
  publicJobContactBodySchema,
  publicJobDetailParamSchema,
  publicJobExternalClickBodySchema,
  publicJobListQuerySchema,
} from 'contracts';
import type { Request } from 'express';
import { z } from 'zod';

import { PublicJobsService, type PublicViewer } from './public-jobs.service';
import { forwardedClientIp } from '../auth/auth-rate-limit';
import { codedBadRequest } from '../http/coded-http';

/** Any valid access token (candidate, employer or staff) counts as signed in. */
function viewerOf(req: Request): PublicViewer {
  return { signedIn: req.hireforgeUser != null };
}

@Controller('public/jobs')
export class PublicJobsController {
  constructor(private readonly publicJobs: PublicJobsService) {}

  /** City/category options for filter UI (read from taxonomy tables). */
  @Get('filters')
  filters() {
    return this.publicJobs.listJobTaxonomy();
  }

  /** Live job URLs, companies and city/category counts for sitemaps and landing pages. */
  @Get('sitemap')
  sitemap() {
    return this.publicJobs.sitemap();
  }

  /** Compact list rows for home strips (`refs` = comma-separated UUID or slug segments, max 8). */
  @Get('previews')
  previews(@Query('refs') refs: string | undefined) {
    const parts =
      refs
        ?.split(',')
        .map((s) => s.trim())
        .filter(Boolean)
        .slice(0, 8) ?? [];
    return this.publicJobs.batchPreviews(parts);
  }

  @Get()
  list(@Query() raw: Record<string, string | undefined>, @Req() req: Request) {
    const parsed = publicJobListQuerySchema.safeParse({
      page: raw.page ?? '1',
      pageSize: raw.pageSize ?? '20',
      q: raw.q,
      city: raw.city,
      category: raw.category,
      sort: raw.sort ?? 'newest',
      workModel: raw.workModel,
      employmentType: raw.employmentType,
      postedWithin: raw.postedWithin,
      easyApply: raw.easyApply,
    });
    if (!parsed.success) {
      throw new BadRequestException(z.flattenError(parsed.error));
    }
    return this.publicJobs.list(parsed.data, viewerOf(req));
  }

  @Get('company/:slug')
  company(
    @Param() raw: Record<string, string | undefined>,
    @Req() req: Request,
  ) {
    const parsed = publicCompanyParamSchema.safeParse({
      slug: raw.slug,
    });
    if (!parsed.success) {
      throw new BadRequestException(z.flattenError(parsed.error));
    }
    return this.publicJobs.getCompanyBySlug(parsed.data.slug, viewerOf(req));
  }

  @Get('by-slug/:slug')
  detailBySlug(@Param() raw: Record<string, string | undefined>) {
    const parsed = publicJobBySlugParamSchema.safeParse({
      slug: raw.slug,
    });
    if (!parsed.success) {
      throw new BadRequestException(z.flattenError(parsed.error));
    }
    return this.publicJobs.getBySlug(parsed.data.slug);
  }

  /** Phone/Viber/e-mail apply: the link for one tap, counted (WP-A5). */
  @Post(':id/contact')
  @HttpCode(200)
  contact(
    @Param('id', new ParseUUIDPipe()) jobId: string,
    @Body() body: unknown,
    @Req() req: Request,
  ) {
    const parsed = publicJobContactBodySchema.safeParse(body);
    if (!parsed.success) {
      throw codedBadRequest(
        'VALIDATION_FAILED',
        'Invalid request body',
        z.flattenError(parsed.error),
      );
    }
    const ip =
      forwardedClientIp(req) ?? req.ip ?? req.socket.remoteAddress ?? '';
    return this.publicJobs.revealContact(jobId, parsed.data, ip);
  }

  /** External apply click telemetry (rate-limited + idempotent per session key when Redis is configured). */
  @Post(':id/external-click')
  @HttpCode(200)
  externalClick(
    @Param('id', new ParseUUIDPipe()) jobId: string,
    @Body() body: unknown,
    @Req() req: Request,
  ) {
    const parsed = publicJobExternalClickBodySchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(z.flattenError(parsed.error));
    }
    // The BFF forwards exactly one address (the hop Caddy saw).
    const ip =
      forwardedClientIp(req) ?? req.ip ?? req.socket.remoteAddress ?? '';
    return this.publicJobs.recordExternalApplyClick(
      jobId,
      parsed.data.sessionKey,
      ip,
    );
  }

  @Get(':id/similar')
  similar(@Param('id', new ParseUUIDPipe()) id: string, @Req() req: Request) {
    return this.publicJobs.listSimilar(id, viewerOf(req), 6);
  }

  @Get(':id')
  detail(@Param() raw: Record<string, string | undefined>) {
    const parsed = publicJobDetailParamSchema.safeParse({
      id: raw.id,
    });
    if (!parsed.success) {
      throw new BadRequestException(z.flattenError(parsed.error));
    }
    return this.publicJobs.getById(parsed.data.id);
  }
}
