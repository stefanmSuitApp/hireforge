import { Injectable } from '@nestjs/common';
import type { EmployerApplicationStatusTarget } from 'contracts';
import { canEmployerMoveApplication } from 'contracts';
import { and, eq, ne } from 'drizzle-orm';
import { applications, jobs, resumeAssets } from 'database';

import { getDb } from '../database';
import {
  codedConflict,
  codedNotFound,
  codedServiceUnavailable,
} from '../http/coded-http';
import { UploadStorageService } from '../storage/upload-storage.service';
import { EmployerService } from './employer.service';

type Db = NonNullable<ReturnType<typeof getDb>>['db'];

const MIME_BY_EXTENSION: Record<string, string> = {
  pdf: 'application/pdf',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
};

/** The employer's side of an application: its CV and the status decisions. */
@Injectable()
export class EmployerApplicationsService {
  constructor(
    private readonly employer: EmployerService,
    private readonly storage: UploadStorageService,
  ) {}

  private db(): Db {
    const database = getDb();
    if (!database) {
      throw codedServiceUnavailable(
        'DATABASE_UNAVAILABLE',
        'Database is not configured (DATABASE_URL)',
      );
    }
    return database.db;
  }

  /**
   * The application if it belongs to the employer's company. Another
   * company's id and a withdrawn application get the same 404.
   */
  private async ownApplication(userId: string, applicationId: string) {
    const { company } = await this.employer.getWorkspace(userId);
    const [row] = await this.db()
      .select({
        id: applications.id,
        status: applications.status,
        resumeFilename: applications.resumeFilename,
        resumeStorageKey: applications.resumeStorageKey,
        mimeType: resumeAssets.mimeType,
      })
      .from(applications)
      .innerJoin(jobs, eq(applications.jobId, jobs.id))
      .leftJoin(resumeAssets, eq(applications.resumeAssetId, resumeAssets.id))
      .where(
        and(
          eq(applications.id, applicationId),
          eq(jobs.companyId, company.id),
          ne(applications.status, 'withdrawn'),
        ),
      )
      .limit(1);
    if (!row) {
      throw codedNotFound('APPLICATION_NOT_FOUND', 'Application not found');
    }
    return row;
  }

  /** The CV snapshot sent with the application; opening it marks it viewed. */
  async getCvDownload(
    userId: string,
    applicationId: string,
  ): Promise<{ buffer: Buffer; mimeType: string; filename: string }> {
    const row = await this.ownApplication(userId, applicationId);
    const buffer = row.resumeStorageKey
      ? await this.storage.get('cv', row.resumeStorageKey)
      : null;
    if (!buffer) {
      throw codedNotFound('RESUME_NOT_FOUND', 'Resume file is missing');
    }
    await this.db()
      .update(applications)
      .set({ status: 'viewed', updatedAt: new Date() })
      .where(
        and(
          eq(applications.id, applicationId),
          eq(applications.status, 'submitted'),
        ),
      );
    const filename = row.resumeFilename ?? 'cv.pdf';
    const extension = filename.split('.').pop()?.toLowerCase() ?? '';
    return {
      buffer,
      mimeType:
        row.mimeType ??
        MIME_BY_EXTENSION[extension] ??
        'application/octet-stream',
      filename,
    };
  }

  async setStatus(
    userId: string,
    applicationId: string,
    status: EmployerApplicationStatusTarget,
  ): Promise<{ id: string; status: EmployerApplicationStatusTarget }> {
    await this.ownApplication(userId, applicationId);
    return this.db().transaction(async (tx) => {
      // Locked: a candidate's withdraw or a second tab can't interleave.
      const [current] = await tx
        .select({ status: applications.status })
        .from(applications)
        .where(eq(applications.id, applicationId))
        .for('update');
      if (!current || current.status === 'withdrawn') {
        throw codedNotFound('APPLICATION_NOT_FOUND', 'Application not found');
      }
      if (!canEmployerMoveApplication(current.status, status)) {
        throw codedConflict(
          'APPLICATION_TRANSITION_FORBIDDEN',
          `An application that is ${current.status} cannot become ${status}`,
        );
      }
      await tx
        .update(applications)
        .set({ status, updatedAt: new Date() })
        .where(eq(applications.id, applicationId));
      return { id: applicationId, status };
    });
  }
}
