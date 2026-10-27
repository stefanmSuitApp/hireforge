import { z } from 'zod';

/** Lifecycle of an employer signup that matched an existing company. */
export const companyJoinRequestStatusSchema = z.enum([
  'pending',
  'approved',
  'rejected',
]);
export type CompanyJoinRequestStatus = z.infer<
  typeof companyJoinRequestStatusSchema
>;

/** `GET employer/join-request` — the caller's latest request (shown on the pending screen). */
export const employerJoinRequestResponseSchema = z.object({
  status: companyJoinRequestStatusSchema,
  companyLegalName: z.string(),
  createdAt: z.string(),
  decidedAt: z.string().nullable(),
});
export type EmployerJoinRequestResponse = z.infer<
  typeof employerJoinRequestResponseSchema
>;

/** `GET moderator/company-join-requests` — pending queue scoped like company detail. */
export type StaffCompanyJoinRequestItem = {
  id: string;
  userEmail: string;
  companyId: string;
  companyLegalName: string;
  companyPib: string | null;
  assignedModeratorEmail: string | null;
  createdAt: string;
};

export type StaffCompanyJoinRequestListResponse = {
  items: StaffCompanyJoinRequestItem[];
};
