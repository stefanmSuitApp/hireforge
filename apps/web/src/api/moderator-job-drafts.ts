import type {
  EmployerJobDraftBody,
  EmployerJobDetailResponse,
  ModeratorCreateJobDraftBody,
  ModeratorJobComposerBootstrapResponse,
  ModeratorJobPatchResponse,
} from 'contracts';

import { webHttp } from '@/lib/http/web-axios';

export async function getModeratorJobComposerBootstrap(
  companyId: string,
): Promise<ModeratorJobComposerBootstrapResponse> {
  const { data } = await webHttp.get<ModeratorJobComposerBootstrapResponse>(
    `/api/moderator/companies/${companyId}/job-composer-bootstrap`,
  );
  return data;
}

export async function getModeratorJobAuthoring(
  jobId: string,
): Promise<EmployerJobDetailResponse> {
  const { data } = await webHttp.get<EmployerJobDetailResponse>(
    `/api/moderator/jobs/${jobId}/authoring`,
  );
  return data;
}

export async function postModeratorJobDraft(
  body: ModeratorCreateJobDraftBody,
): Promise<{ id: string }> {
  const { data } = await webHttp.post<{ id: string }>(
    '/api/moderator/jobs',
    body,
  );
  return data;
}

export async function patchModeratorJobDraft(
  jobId: string,
  body: EmployerJobDraftBody,
): Promise<ModeratorJobPatchResponse> {
  const { data } = await webHttp.patch<ModeratorJobPatchResponse>(
    `/api/moderator/jobs/${jobId}`,
    body,
  );
  return data;
}
