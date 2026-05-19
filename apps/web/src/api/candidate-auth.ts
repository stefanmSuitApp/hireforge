import { webHttp } from '@/lib/http/web-axios';
import type { CandidateApplicationListItem } from 'contracts';

export type CandidateLoginBody = {
  email: string;
  password: string;
};

export type CandidateRegisterBody = {
  email: string;
  password: string;
  fullName?: string;
};

export type CandidateAuthOkResponse = { ok: true };

export async function postCandidateLogin(
  body: CandidateLoginBody,
): Promise<CandidateAuthOkResponse> {
  const { data } = await webHttp.post<CandidateAuthOkResponse>(
    '/api/candidate/auth/login',
    body,
  );
  return data;
}

export async function postCandidateRegister(
  body: CandidateRegisterBody,
): Promise<CandidateAuthOkResponse> {
  const { data } = await webHttp.post<CandidateAuthOkResponse>(
    '/api/candidate/auth/register',
    body,
  );
  return data;
}

export async function patchCandidateApplicationWithdraw(
  applicationId: string,
): Promise<{ ok: true }> {
  const { data } = await webHttp.patch<{ ok: true }>(
    `/api/candidate/applications/${applicationId}`,
    { status: 'withdrawn' },
  );
  return data;
}

export async function postCandidateLogout(): Promise<CandidateAuthOkResponse> {
  const { data } = await webHttp.post<CandidateAuthOkResponse>(
    '/api/candidate/auth/logout',
  );
  return data;
}

export async function getCandidateApplications(): Promise<
  CandidateApplicationListItem[]
> {
  const { data } = await webHttp.get<CandidateApplicationListItem[]>(
    '/api/candidate/applications',
  );
  return data;
}
