import { cookies } from 'next/headers';

import { getCandidateAccessToken } from '@/lib/candidate-access-cookie';
import {
  CANDIDATE_ACCESS_COOKIE,
  CANDIDATE_REFRESH_COOKIE,
} from '@/lib/candidate-session';
import { getEmployerAccessToken } from '@/lib/employer-access-cookie';
import {
  EMPLOYER_ACCESS_COOKIE,
  EMPLOYER_REFRESH_COOKIE,
} from '@/lib/employer-session';
import { fetchCandidateMe } from '@/lib/fetch-candidate-me';
import { fetchEmployerWorkspace } from '@/lib/fetch-employer-workspace';
import { fetchModeratorMe } from '@/lib/fetch-moderator';
import { getStaffAccessToken } from '@/lib/moderator-access-cookie';
import {
  STAFF_ACCESS_COOKIE,
  STAFF_REFRESH_COOKIE,
} from '@/lib/moderator-session';

export type AuthRole = 'candidate' | 'employer' | 'moderator' | 'admin';

export type UnifiedAuthSession = {
  isAuthenticated: boolean;
  role: AuthRole | null;
  displayName: string | null;
  email: string | null;
  dashboardPath: string | null;
  logoutEndpoint: string | null;
};

const UNAUTHENTICATED: UnifiedAuthSession = {
  isAuthenticated: false,
  role: null,
  displayName: null,
  email: null,
  dashboardPath: null,
  logoutEndpoint: null,
};

/**
 * Quick check for any auth cookie presence (no API call).
 * Priority: staff > employer > candidate.
 */
export async function hasAnyAuthSession(): Promise<boolean> {
  const jar = await cookies();
  return (
    jar.has(STAFF_ACCESS_COOKIE) ||
    jar.has(STAFF_REFRESH_COOKIE) ||
    jar.has(EMPLOYER_ACCESS_COOKIE) ||
    jar.has(EMPLOYER_REFRESH_COOKIE) ||
    jar.has(CANDIDATE_ACCESS_COOKIE) ||
    jar.has(CANDIDATE_REFRESH_COOKIE)
  );
}

/**
 * Returns the detected auth role based on cookie presence (no API call).
 * Priority: staff > employer > candidate.
 */
export async function detectAuthRole(): Promise<AuthRole | null> {
  const jar = await cookies();
  if (jar.has(STAFF_ACCESS_COOKIE) || jar.has(STAFF_REFRESH_COOKIE)) {
    return 'moderator'; // actual role (moderator vs admin) requires API call
  }
  if (jar.has(EMPLOYER_ACCESS_COOKIE) || jar.has(EMPLOYER_REFRESH_COOKIE)) {
    return 'employer';
  }
  if (jar.has(CANDIDATE_ACCESS_COOKIE) || jar.has(CANDIDATE_REFRESH_COOKIE)) {
    return 'candidate';
  }
  return null;
}

/**
 * Full auth session with user info (makes API call to /me endpoint).
 * Priority: staff > employer > candidate.
 */
export async function getUnifiedAuthSession(): Promise<UnifiedAuthSession> {
  // Check staff first (moderator/admin)
  const staffToken = await getStaffAccessToken();
  if (staffToken) {
    const result = await fetchModeratorMe(staffToken);
    if (result.ok) {
      const { user } = result.data;
      return {
        isAuthenticated: true,
        role: user.role, // 'moderator' or 'admin'
        displayName: user.email.split('@')[0], // staff don't have displayName
        email: user.email,
        dashboardPath: user.role === 'admin' ? '/admin' : '/moderator',
        logoutEndpoint: '/api/moderator/auth/logout',
      };
    }
  }

  // Check employer next
  const employerToken = await getEmployerAccessToken();
  if (employerToken) {
    const result = await fetchEmployerWorkspace(employerToken);
    if (result.ok) {
      const { user, company } = result.data;
      return {
        isAuthenticated: true,
        role: 'employer',
        displayName: company.legalName,
        email: user.email,
        dashboardPath: '/employer',
        logoutEndpoint: '/api/employer/auth/logout',
      };
    }
  }

  // Check candidate last
  const candidateToken = await getCandidateAccessToken();
  if (candidateToken) {
    const result = await fetchCandidateMe(candidateToken);
    if (result.ok) {
      const { user, candidate } = result.data;
      return {
        isAuthenticated: true,
        role: 'candidate',
        displayName: candidate.fullName ?? user.email.split('@')[0],
        email: user.email,
        dashboardPath: '/candidate',
        logoutEndpoint: '/api/candidate/auth/logout',
      };
    }
  }

  return UNAUTHENTICATED;
}

/**
 * Simple check if user is authenticated (has valid access token).
 * Lighter than getUnifiedAuthSession - only checks cookie presence.
 */
export async function isAuthenticated(): Promise<boolean> {
  return hasAnyAuthSession();
}
