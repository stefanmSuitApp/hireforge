import type { EmployerSelfSignupBody } from 'contracts';

import { webHttp } from '@/lib/http/web-axios';

export type EmployerLoginBody = {
  email: string;
  password: string;
};

export type EmployerRegisterBody = EmployerSelfSignupBody;

export type EmployerAuthOkResponse = { ok: true };

export async function postEmployerLogin(
  body: EmployerLoginBody,
): Promise<EmployerAuthOkResponse> {
  const { data } = await webHttp.post<EmployerAuthOkResponse>(
    '/api/employer/auth/login',
    body,
  );
  return data;
}

export async function postEmployerRegister(
  body: EmployerRegisterBody,
): Promise<EmployerAuthOkResponse> {
  const { data } = await webHttp.post<EmployerAuthOkResponse>(
    '/api/employer/auth/register',
    body,
  );
  return data;
}

export async function postEmployerLogout(): Promise<EmployerAuthOkResponse> {
  const { data } = await webHttp.post<EmployerAuthOkResponse>(
    '/api/employer/auth/logout',
  );
  return data;
}
