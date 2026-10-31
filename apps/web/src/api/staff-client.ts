import type {
  AdminAuditListResponse,
  AdminCompanyAssignmentHistoryResponse,
  AdminCompanyReassignBody,
  AdminJobCategoryCreateBody,
  AdminJobCategoryPatchBody,
  AdminJobPatchPublishBody,
  AdminCampaignsListResponse,
  AdminPromoCodesListResponse,
  CampaignCreateBody,
  CampaignPatchBody,
  CampaignResponse,
  AdminUserListResponse,
  AdminUserPatchBody,
  PromoCodeCreateBody,
  PromoCodePatchBody,
  PromoCodeResponse,
  StaffAccountInviteResponse,
  StaffCompanyAccountCreateBody,
  StaffCompanyCreateBody,
  StaffCompanyJoinRequestListResponse,
  StaffCompanyListResponse,
  StaffCompanyPatchBody,
  StaffEmployerListResponse,
  StaffEmployerPatchBody,
} from 'contracts';

import { webHttp } from '@/lib/http/web-axios';

export async function patchStaffCompany(
  companyId: string,
  body: StaffCompanyPatchBody,
): Promise<{ ok: true }> {
  const { data } = await webHttp.patch<{ ok: true }>(
    `/api/moderator/companies/${companyId}`,
    body,
  );
  return data;
}

export async function getStaffCompanyList(
  query = 'limit=200&offset=0',
): Promise<StaffCompanyListResponse> {
  const { data } = await webHttp.get<StaffCompanyListResponse>(
    `/api/moderator/companies?${query}`,
  );
  return data;
}

export async function postStaffCompanyPickup(
  companyId: string,
): Promise<{ ok: true }> {
  const { data } = await webHttp.post<{ ok: true }>(
    `/api/moderator/companies/${companyId}/pickup`,
  );
  return data;
}

export async function postStaffCompanyCloseWon(
  companyId: string,
): Promise<{ ok: true }> {
  const { data } = await webHttp.post<{ ok: true }>(
    `/api/moderator/companies/${companyId}/close-won`,
  );
  return data;
}

export async function postStaffCompanyCloseLost(
  companyId: string,
  body: { note?: string },
): Promise<{ ok: true }> {
  const { data } = await webHttp.post<{ ok: true }>(
    `/api/moderator/companies/${companyId}/close-lost`,
    body,
  );
  return data;
}

export async function postStaffCompany(
  body: StaffCompanyCreateBody,
): Promise<{ id: string }> {
  const { data } = await webHttp.post<{ id: string }>(
    '/api/moderator/companies',
    body,
  );
  return data;
}

export async function postStaffCompanyAccount(
  companyId: string,
  body: StaffCompanyAccountCreateBody,
): Promise<StaffAccountInviteResponse> {
  const { data } = await webHttp.post<StaffAccountInviteResponse>(
    `/api/moderator/companies/${encodeURIComponent(companyId)}/accounts`,
    body,
  );
  return data;
}

export async function postStaffResendInvite(
  companyId: string,
  userId: string,
  locale: 'sr' | 'en',
): Promise<StaffAccountInviteResponse> {
  const { data } = await webHttp.post<StaffAccountInviteResponse>(
    `/api/moderator/companies/${encodeURIComponent(companyId)}/accounts/${encodeURIComponent(userId)}/invite`,
    { locale },
  );
  return data;
}

export async function patchStaffEmployer(
  employerId: string,
  body: StaffEmployerPatchBody,
): Promise<{ ok: true }> {
  const { data } = await webHttp.patch<{ ok: true }>(
    `/api/moderator/employers/${employerId}`,
    body,
  );
  return data;
}

export async function getStaffEmployerList(
  query = 'limit=100&offset=0',
): Promise<StaffEmployerListResponse> {
  const { data } = await webHttp.get<StaffEmployerListResponse>(
    `/api/moderator/employers?${query}`,
  );
  return data;
}

export async function getAdminCampaigns(): Promise<AdminCampaignsListResponse> {
  const { data } = await webHttp.get<AdminCampaignsListResponse>(
    '/api/admin/campaigns',
  );
  return data;
}

export async function postAdminCampaign(
  body: CampaignCreateBody,
): Promise<CampaignResponse> {
  const { data } = await webHttp.post<CampaignResponse>(
    '/api/admin/campaigns',
    body,
  );
  return data;
}

export async function patchAdminCampaign(
  id: string,
  body: CampaignPatchBody,
): Promise<CampaignResponse> {
  const { data } = await webHttp.patch<CampaignResponse>(
    `/api/admin/campaigns/${id}`,
    body,
  );
  return data;
}

export async function getAdminPromoCodesList(
  query = 'limit=100&offset=0',
): Promise<AdminPromoCodesListResponse> {
  const { data } = await webHttp.get<AdminPromoCodesListResponse>(
    `/api/admin/promo-codes?${query}`,
  );
  return data;
}

export async function postAdminPromoCode(
  body: PromoCodeCreateBody,
): Promise<PromoCodeResponse> {
  const { data } = await webHttp.post<PromoCodeResponse>(
    '/api/admin/promo-codes',
    body,
  );
  return data;
}

export async function patchAdminPromoCode(
  id: string,
  body: PromoCodePatchBody,
): Promise<PromoCodeResponse> {
  const { data } = await webHttp.patch<PromoCodeResponse>(
    `/api/admin/promo-codes/${id}`,
    body,
  );
  return data;
}

export async function patchAdminUser(
  userId: string,
  body: AdminUserPatchBody,
): Promise<{ ok: true }> {
  const { data } = await webHttp.patch<{ ok: true }>(
    `/api/admin/users/${userId}`,
    body,
  );
  return data;
}

export async function getAdminUserList(
  query = 'limit=100&offset=0',
): Promise<AdminUserListResponse> {
  const { data } = await webHttp.get<AdminUserListResponse>(
    `/api/admin/users?${query}`,
  );
  return data;
}

export async function getAdminAuditList(
  query = 'limit=100&offset=0',
): Promise<AdminAuditListResponse> {
  const { data } = await webHttp.get<AdminAuditListResponse>(
    `/api/admin/audit?${query}`,
  );
  return data;
}

export async function postAdminJobCategory(
  body: AdminJobCategoryCreateBody,
): Promise<{ id: string }> {
  const { data } = await webHttp.post<{ id: string }>(
    '/api/admin/job-categories',
    body,
  );
  return data;
}

export async function patchAdminJobCategory(
  categoryId: string,
  body: AdminJobCategoryPatchBody,
): Promise<{ ok: true }> {
  const { data } = await webHttp.patch<{ ok: true }>(
    `/api/admin/job-categories/${categoryId}`,
    body,
  );
  return data;
}

export async function deleteAdminJobCategory(
  categoryId: string,
): Promise<{ ok: true }> {
  const { data } = await webHttp.delete<{ ok: true }>(
    `/api/admin/job-categories/${categoryId}`,
  );
  return data;
}

export async function postAdminForceArchive(
  jobId: string,
): Promise<{ ok: true }> {
  const { data } = await webHttp.post<{ ok: true }>(
    `/api/admin/jobs/${jobId}/force-archive`,
  );
  return data;
}

export async function postAdminPublishJobDirectlyEnterprise(
  jobId: string,
): Promise<{ ok: true }> {
  const { data } = await webHttp.post<{ ok: true }>(
    `/api/admin/jobs/${jobId}/publish-directly`,
  );
  return data;
}

export async function postAdminPatchPublishJob(
  jobId: string,
  body: AdminJobPatchPublishBody,
): Promise<{ ok: true }> {
  const { data } = await webHttp.post<{ ok: true }>(
    `/api/admin/jobs/${jobId}/patch-publish`,
    body,
  );
  return data;
}

export async function getAdminCompanyAssignmentHistory(
  companyId: string,
): Promise<AdminCompanyAssignmentHistoryResponse> {
  const { data } = await webHttp.get<AdminCompanyAssignmentHistoryResponse>(
    `/api/admin/companies/${companyId}/assignment-history`,
  );
  return data;
}

export async function postAdminCompanyReassign(
  companyId: string,
  body: AdminCompanyReassignBody,
): Promise<{ ok: true }> {
  const { data } = await webHttp.post<{ ok: true }>(
    `/api/admin/companies/${companyId}/reassign`,
    body,
  );
  return data;
}

export async function getStaffJoinRequests(): Promise<StaffCompanyJoinRequestListResponse> {
  const { data } = await webHttp.get<StaffCompanyJoinRequestListResponse>(
    '/api/moderator/company-join-requests',
  );
  return data;
}

export async function postStaffJoinRequestDecision(
  requestId: string,
  decision: 'approve' | 'reject',
): Promise<{ id: string; status: 'approved' | 'rejected' }> {
  const { data } = await webHttp.post<{
    id: string;
    status: 'approved' | 'rejected';
  }>(`/api/moderator/company-join-requests/${requestId}/${decision}`);
  return data;
}
