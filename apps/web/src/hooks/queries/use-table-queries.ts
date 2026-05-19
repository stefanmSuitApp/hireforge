'use client';

import { useQuery } from '@tanstack/react-query';

import {
  getAdminAuditList,
  getAdminUserList,
  getStaffCompanyList,
  getStaffEmployerList,
} from '@/api/staff-client';
import {
  getEmployerJob,
  getEmployerJobApplications,
  getEmployerJobsList,
} from '@/api/employer-jobs';
import { getCandidateApplications } from '@/api/candidate-auth';

import { tableQueryKeys } from './table-query-keys';

export function useStaffCompaniesQuery(query = 'limit=200&offset=0') {
  return useQuery({
    queryKey: tableQueryKeys.staffCompanies(query),
    queryFn: () => getStaffCompanyList(query),
  });
}

export function useStaffEmployersQuery(query = 'limit=100&offset=0') {
  return useQuery({
    queryKey: tableQueryKeys.staffEmployers(query),
    queryFn: () => getStaffEmployerList(query),
  });
}

export function useAdminUsersQuery(query = 'limit=100&offset=0') {
  return useQuery({
    queryKey: tableQueryKeys.adminUsers(query),
    queryFn: () => getAdminUserList(query),
  });
}

export function useAdminAuditQuery(query = 'limit=100&offset=0') {
  return useQuery({
    queryKey: tableQueryKeys.adminAudit(query),
    queryFn: () => getAdminAuditList(query),
  });
}

export function useEmployerJobsQuery() {
  return useQuery({
    queryKey: tableQueryKeys.employerJobs(),
    queryFn: getEmployerJobsList,
  });
}

export function useEmployerJobQuery(jobId: string) {
  return useQuery({
    queryKey: tableQueryKeys.employerJob(jobId),
    queryFn: () => getEmployerJob(jobId),
  });
}

export function useEmployerJobApplicationsQuery(jobId: string) {
  return useQuery({
    queryKey: tableQueryKeys.employerJobApplications(jobId),
    queryFn: () => getEmployerJobApplications(jobId),
  });
}

export function useCandidateApplicationsQuery() {
  return useQuery({
    queryKey: tableQueryKeys.candidateApplications(),
    queryFn: getCandidateApplications,
  });
}
