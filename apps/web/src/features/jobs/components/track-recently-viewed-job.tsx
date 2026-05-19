'use client';

import * as React from 'react';

import { pushRecentJobRef } from '@/lib/recently-viewed-jobs';

export function TrackRecentlyViewedJob({ segment }: { segment: string }) {
  React.useEffect(() => {
    pushRecentJobRef(segment);
  }, [segment]);
  return null;
}
