import type { Metadata } from 'next';

import {
  buildLegalPageMetadata,
  LegalPageRoute,
} from '@/features/legal/legal-page-route';

type Props = { params: Promise<{ locale: string }> };

export function generateMetadata({ params }: Props): Promise<Metadata> {
  return buildLegalPageMetadata('privacy', params);
}

export default function Page({ params }: Props) {
  return <LegalPageRoute kind="privacy" params={params} />;
}
