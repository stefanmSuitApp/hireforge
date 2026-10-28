import { proxyNestPost } from '@/lib/proxy-nest-post';

export async function POST(req: Request) {
  return proxyNestPost(req, 'auth/password-reset/confirm');
}
