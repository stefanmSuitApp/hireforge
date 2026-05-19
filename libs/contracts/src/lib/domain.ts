import { z } from 'zod';

export const userRoles = [
  'admin',
  'moderator',
  'employer',
  'candidate',
] as const;

export type UserRole = (typeof userRoles)[number];

export const userRoleSchema = z.enum(userRoles);

/** Job lifecycle; matches `job_status`. */
export const jobStatuses = [
  'draft',
  'submitted',
  'published',
  'rejected',
  'archived',
  'expired',
] as const;

export type JobStatus = (typeof jobStatuses)[number];

export const jobStatusSchema = z.enum(jobStatuses);

/**
 * Application pipeline; matches `application_status`. The legacy `reviewed`
 * value is retained for enum-additive Postgres compatibility (Step 5) but is
 * not part of the supported lifecycle. Service code maps it to `viewed` on
 * read; new writes MUST use `viewed` / `shortlisted` instead.
 */
export const applicationStatuses = [
  'submitted',
  'viewed',
  'shortlisted',
  'rejected',
  'withdrawn',
  'hired',
  'reviewed',
] as const;

export type ApplicationStatus = (typeof applicationStatuses)[number];

export const applicationStatusSchema = z.enum(applicationStatuses);

/** Subset of `applicationStatuses` permitted for new writes (excludes legacy `reviewed`). */
export const writableApplicationStatuses = [
  'submitted',
  'viewed',
  'shortlisted',
  'rejected',
  'withdrawn',
  'hired',
] as const;

export type WritableApplicationStatus =
  (typeof writableApplicationStatuses)[number];

export const writableApplicationStatusSchema = z.enum(
  writableApplicationStatuses,
);

export const workModels = ['onsite', 'remote', 'hybrid'] as const;
export type WorkModel = (typeof workModels)[number];
export const workModelSchema = z.enum(workModels);

export const employmentTypes = [
  'full_time',
  'part_time',
  'contract',
  'internship',
  'temporary',
] as const;
export type EmploymentType = (typeof employmentTypes)[number];
export const employmentTypeSchema = z.enum(employmentTypes);

export const seniorityLevels = [
  'intern',
  'junior',
  'mid',
  'senior',
  'lead',
  'executive',
] as const;
export type SeniorityLevel = (typeof seniorityLevels)[number];
export const seniorityLevelSchema = z.enum(seniorityLevels);
