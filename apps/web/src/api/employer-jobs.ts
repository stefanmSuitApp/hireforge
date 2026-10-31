import type {
  EmployerApplicationStatusTarget,
  EmployerJobApplicationItem,
  EmployerJobDetailResponse,
  EmployerJobDraftBody,
  EmployerJobDraftPatchResponse,
  EmployerJobListItem,
} from 'contracts';

import { webHttp } from '@/lib/http/web-axios';

export async function getEmployerJobsList(): Promise<EmployerJobListItem[]> {
  const { data } =
    await webHttp.get<EmployerJobListItem[]>('/api/employer/jobs');
  return data;
}

export async function getEmployerJob(
  jobId: string,
): Promise<EmployerJobDetailResponse> {
  const { data } = await webHttp.get<EmployerJobDetailResponse>(
    `/api/employer/jobs/${jobId}`,
  );
  return data;
}

export async function postEmployerJobDraft(
  body: EmployerJobDraftBody,
): Promise<{ id: string }> {
  const { data } = await webHttp.post<{ id: string }>(
    '/api/employer/jobs',
    body,
  );
  return data;
}

export async function patchEmployerJobDraft(
  jobId: string,
  body: EmployerJobDraftBody,
): Promise<EmployerJobDraftPatchResponse> {
  const { data } = await webHttp.patch<EmployerJobDraftPatchResponse>(
    `/api/employer/jobs/${jobId}`,
    body,
  );
  return data;
}

export async function postEmployerJobSubmit(jobId: string): Promise<{
  ok: true;
  status: 'submitted';
  submittedAt: string;
}> {
  const { data } = await webHttp.post<{
    ok: true;
    status: 'submitted';
    submittedAt: string;
  }>(`/api/employer/jobs/${jobId}/submit`);
  return data;
}

export async function getEmployerJobApplications(
  jobId: string,
): Promise<EmployerJobApplicationItem[]> {
  const { data } = await webHttp.get<EmployerJobApplicationItem[]>(
    `/api/employer/jobs/${jobId}/applications`,
  );
  return data;
}

export async function patchEmployerApplicationStatus(
  applicationId: string,
  status: EmployerApplicationStatusTarget,
): Promise<{ id: string; status: EmployerApplicationStatusTarget }> {
  const { data } = await webHttp.patch<{
    id: string;
    status: EmployerApplicationStatusTarget;
  }>(`/api/employer/applications/${applicationId}`, { status });
  return data;
}

/** Same-origin BFF URL; the browser downloads it as an attachment. */
export function employerApplicationCvUrl(applicationId: string): string {
  return `/api/employer/applications/${applicationId}/cv`;
}
