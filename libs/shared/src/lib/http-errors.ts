/**
 * Canonical JSON error shape from Nest (`AllExceptionsFilter`) and future clients.
 */
export type ApiErrorBody = {
  error: {
    code: string;
    message: string;
    requestId: string;
    details?: unknown;
  };
};
