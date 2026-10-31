import { NextResponse } from 'next/server';

import { isUuidString } from '@/lib/job-public-segment';
import { getStaffAccessToken } from '@/lib/moderator-access-cookie';
import { proxyNestPost } from '@/lib/proxy-nest-post';

type Ctx = { params: Promise<{ companyId: string }> };

/** `POST /api/moderator/companies/:id/accounts` → Nest (staff add an employer account). */
export async function POST(req: Request, ctx: Ctx) {
  const access = await getStaffAccessToken();
  if (!access) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { companyId } = await ctx.params;
  // Params are URL-decoded: validate before building the upstream path.
  if (!isUuidString(companyId)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  return proxyNestPost(
    req,
    `moderator/companies/${companyId}/accounts`,
    access,
  );
}
