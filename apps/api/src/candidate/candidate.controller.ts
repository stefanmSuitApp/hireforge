import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
  StreamableFile,
  UnauthorizedException,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  candidateApplyBodySchema,
  candidateGenerateResumeBodySchema,
  candidateProfilePatchSchema,
  candidateSaveJobBodySchema,
  candidateSavedSearchBodySchema,
  candidateWithdrawApplicationBodySchema,
} from 'contracts';
import type { Request } from 'express';
import { memoryStorage } from 'multer';
import { z } from 'zod';

import { AuthenticatedGuard } from '../auth/authenticated.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { codedBadRequest } from '../http/coded-http';
import { CandidateService } from './candidate.service';

const MAX_RESUME_BYTES = 5 * 1024 * 1024;

@Controller('candidate')
@UseGuards(AuthenticatedGuard, RolesGuard)
@Roles('candidate')
export class CandidateController {
  constructor(private readonly candidate: CandidateService) {}

  private userId(req: Request): string {
    const id = req.hireforgeUser?.id;
    if (!id) {
      throw new UnauthorizedException();
    }
    return id;
  }

  @Get('me')
  me(@Req() req: Request) {
    return this.candidate.getMe(this.userId(req));
  }

  @Patch('profile')
  patchProfile(@Req() req: Request, @Body() body: unknown) {
    const parsed = candidateProfilePatchSchema.safeParse(body);
    if (!parsed.success) {
      throw codedBadRequest(
        'VALIDATION_FAILED',
        'Invalid request body',
        z.flattenError(parsed.error),
      );
    }
    return this.candidate.patchProfile(this.userId(req), parsed.data);
  }

  @Get('resumes')
  listResumes(@Req() req: Request) {
    return this.candidate.listResumes(this.userId(req));
  }

  @Post('resumes/generate')
  generateResume(@Req() req: Request, @Body() body: unknown) {
    const parsed = candidateGenerateResumeBodySchema.safeParse(body);
    if (!parsed.success) {
      throw codedBadRequest(
        'VALIDATION_FAILED',
        'Invalid request body',
        z.flattenError(parsed.error),
      );
    }
    return this.candidate.generateResumeFromTemplate(
      this.userId(req),
      parsed.data,
    );
  }

  @Post('resumes')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: MAX_RESUME_BYTES },
    }),
  )
  uploadResume(
    @Req() req: Request,
    @UploadedFile() file: Express.Multer.File | undefined,
  ) {
    if (!file?.buffer) {
      throw codedBadRequest('VALIDATION_FAILED', 'Missing file field "file"');
    }
    return this.candidate.saveResumeUpload({
      userId: this.userId(req),
      buffer: file.buffer,
      originalFilename: file.originalname,
      mimeType: file.mimetype,
    });
  }

  @Get('resumes/:id/download')
  async downloadResume(
    @Req() req: Request,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    const { stream, mimeType, filename } =
      await this.candidate.getResumeDownloadStream(this.userId(req), id);
    return new StreamableFile(stream, {
      type: mimeType,
      disposition: `attachment; filename="${encodeURIComponent(filename)}"`,
    });
  }

  @Delete('resumes/:id')
  deleteResume(
    @Req() req: Request,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.candidate.deleteResume(this.userId(req), id);
  }

  @Patch('applications/:id')
  withdrawApplication(
    @Req() req: Request,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body: unknown,
  ) {
    const parsed = candidateWithdrawApplicationBodySchema.safeParse(body);
    if (!parsed.success) {
      throw codedBadRequest(
        'VALIDATION_FAILED',
        'Invalid request body',
        z.flattenError(parsed.error),
      );
    }
    return this.candidate.withdrawApplication(this.userId(req), id);
  }

  @Post('applications')
  submitApplication(@Req() req: Request, @Body() body: unknown) {
    const parsed = candidateApplyBodySchema.safeParse(body);
    if (!parsed.success) {
      throw codedBadRequest(
        'VALIDATION_FAILED',
        'Invalid request body',
        z.flattenError(parsed.error),
      );
    }
    return this.candidate.submitApplication(this.userId(req), parsed.data);
  }

  @Get('applications')
  listApplications(@Req() req: Request) {
    return this.candidate.listApplications(this.userId(req));
  }

  @Get('saved-jobs')
  listSavedJobs(@Req() req: Request) {
    return this.candidate.listSavedJobs(this.userId(req));
  }

  @Post('saved-jobs')
  saveJob(@Req() req: Request, @Body() body: unknown) {
    const parsed = candidateSaveJobBodySchema.safeParse(body);
    if (!parsed.success) {
      throw codedBadRequest(
        'VALIDATION_FAILED',
        'Invalid request body',
        z.flattenError(parsed.error),
      );
    }
    return this.candidate.saveJob(this.userId(req), parsed.data.jobId);
  }

  @Delete('saved-jobs/:jobId')
  unsaveJob(
    @Req() req: Request,
    @Param('jobId', new ParseUUIDPipe()) jobId: string,
  ) {
    return this.candidate.unsaveJob(this.userId(req), jobId);
  }

  @Post('saved-searches')
  saveSearch(@Req() req: Request, @Body() body: unknown) {
    const parsed = candidateSavedSearchBodySchema.safeParse(body);
    if (!parsed.success) {
      throw codedBadRequest(
        'VALIDATION_FAILED',
        'Invalid request body',
        z.flattenError(parsed.error),
      );
    }
    return this.candidate.saveSearch(this.userId(req), parsed.data);
  }
}
