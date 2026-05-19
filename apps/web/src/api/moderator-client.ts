import type {
  ModeratorJobDetailResponse,
  ModeratorJobQueueResponse,
  ModeratorRejectBody,
} from 'contracts';

import { webHttp } from '@/lib/http/web-axios';

export async function postModeratorLogin(body: {
  email: string;
  password: string;
}): Promise<{ ok: true }> {
  const { data } = await webHttp.post<{ ok: true }>(
    '/api/moderator/auth/login',
    body,
  );
  return data;
}

export async function postModeratorLogout(): Promise<{ ok: true }> {
  const { data } = await webHttp.post<{ ok: true }>(
    '/api/moderator/auth/logout',
  );
  return data;
}

export async function getModeratorQueue(
  status: string,
): Promise<ModeratorJobQueueResponse> {
  const query = new URLSearchParams();
  if (status.trim()) {
    query.set('status', status.trim());
  }
  const suffix = query.toString() ? `?${query.toString()}` : '';
  const { data } = await webHttp.get<ModeratorJobQueueResponse>(
    `/api/moderator/jobs/queue${suffix}`,
  );
  return data;
}

export async function getModeratorJob(
  jobId: string,
): Promise<ModeratorJobDetailResponse> {
  const { data } = await webHttp.get<ModeratorJobDetailResponse>(
    `/api/moderator/jobs/${jobId}`,
  );
  return data;
}

export async function postModeratorPublish(
  jobId: string,
): Promise<{ ok: true }> {
  const { data } = await webHttp.post<{ ok: true }>(
    `/api/moderator/jobs/${jobId}/publish`,
  );
  return data;
}

export async function postModeratorPublishDirectly(
  jobId: string,
): Promise<{ ok: true }> {
  const { data } = await webHttp.post<{ ok: true }>(
    `/api/moderator/jobs/${jobId}/publish-directly`,
  );
  return data;
}

export async function postModeratorReject(
  jobId: string,
  body: ModeratorRejectBody,
): Promise<{ ok: true }> {
  const { data } = await webHttp.post<{ ok: true }>(
    `/api/moderator/jobs/${jobId}/reject`,
    body,
  );
  return data;
}

export async function postModeratorUnpublish(
  jobId: string,
): Promise<{ ok: true }> {
  const { data } = await webHttp.post<{ ok: true }>(
    `/api/moderator/jobs/${jobId}/unpublish`,
  );
  return data;
}
