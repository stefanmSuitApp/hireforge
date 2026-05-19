import axios, { AxiosHeaders } from 'axios';

/**
 * Browser-facing HTTP client: same-origin requests (Next routes, future BFF).
 * Use this from client hooks and components — not from Server Components.
 */
export const webHttp = axios.create({
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
  withCredentials: true,
});

/** Let the runtime set multipart boundary (default JSON Content-Type breaks FormData). */
webHttp.interceptors.request.use((config) => {
  if (config.data instanceof FormData && config.headers) {
    if (config.headers instanceof AxiosHeaders) {
      config.headers.delete('Content-Type');
    } else {
      delete (config.headers as Record<string, string>)['Content-Type'];
    }
  }
  return config;
});
