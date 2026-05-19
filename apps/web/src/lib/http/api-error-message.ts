import axios from 'axios';
import type { ApiErrorBody } from 'shared';

type NestStyleBody = {
  message?: string | string[];
  formErrors?: string[];
  fieldErrors?: Record<string, string[]>;
};

function messageFromNestedApiError(
  data: unknown,
  maxLen: number,
): string | null {
  if (data == null || typeof data !== 'object' || !('error' in data)) {
    return null;
  }
  const err = (data as ApiErrorBody).error;
  if (typeof err?.message === 'string' && err.message.trim()) {
    return err.message.trim().slice(0, maxLen);
  }
  return null;
}

function messageFromBody(data: unknown, maxLen: number): string | null {
  const nested = messageFromNestedApiError(data, maxLen);
  if (nested) {
    return nested;
  }
  if (typeof data === 'string' && data.trim()) {
    return data.trim().slice(0, maxLen);
  }
  if (typeof data !== 'object' || data === null) {
    return null;
  }
  const o = data as NestStyleBody;
  if (typeof o.message === 'string' && o.message.trim()) {
    return o.message.trim().slice(0, maxLen);
  }
  if (Array.isArray(o.message) && o.message.length) {
    return o.message.filter(Boolean).join(', ').slice(0, maxLen);
  }
  if (Array.isArray(o.formErrors) && o.formErrors.length) {
    return o.formErrors.filter(Boolean).join(', ').slice(0, maxLen);
  }
  if (o.fieldErrors && typeof o.fieldErrors === 'object') {
    const parts = Object.values(o.fieldErrors)
      .flat()
      .filter((s): s is string => typeof s === 'string' && s.length > 0);
    if (parts.length) {
      return parts.join(', ').slice(0, maxLen);
    }
  }
  return null;
}

/** Reads `error.code` from a Hireforge API JSON error body (see `AllExceptionsFilter`). */
export function extractApiErrorCode(error: unknown): string | undefined {
  if (!axios.isAxiosError(error)) {
    return undefined;
  }
  const data = error.response?.data;
  if (data && typeof data === 'object' && 'error' in data) {
    const c = (data as ApiErrorBody).error?.code;
    if (typeof c === 'string' && c.length > 0) {
      return c;
    }
  }
  return undefined;
}

/** Pass `useTranslations('Errors')` with this cast (strict key typing vs dynamic `error.code`). */
export type ErrorsTranslator = (key: string) => string;

/**
 * Map API errors to localized copy via `next-intl` `useTranslations('Errors')`.
 * Falls back to English `error.message` from the API, then `generic`.
 */
export function getTranslatedApiErrorMessage(
  error: unknown,
  t: ErrorsTranslator,
  fallbackKey = 'generic',
): string {
  const code = extractApiErrorCode(error);
  if (code) {
    return t(code);
  }
  if (axios.isAxiosError(error)) {
    const fromData = messageFromBody(error.response?.data, 400);
    if (fromData) {
      return fromData;
    }
    if (typeof error.message === 'string' && error.message) {
      return error.message.slice(0, 400);
    }
  }
  if (error instanceof Error && error.message) {
    return error.message.slice(0, 400);
  }
  return t(fallbackKey);
}

/** Human-readable message from an API error response or Axios error (legacy / non-coded). */
export function getApiErrorMessage(
  error: unknown,
  fallback: string,
  maxLen = 400,
): string {
  if (axios.isAxiosError(error)) {
    const fromData = messageFromBody(error.response?.data, maxLen);
    if (fromData) {
      return fromData;
    }
    if (typeof error.message === 'string' && error.message) {
      return error.message.slice(0, maxLen);
    }
  }
  if (error instanceof Error && error.message) {
    return error.message.slice(0, maxLen);
  }
  return fallback;
}
