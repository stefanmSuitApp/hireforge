'use client';

import type {
  ContactChannel,
  PublicJobContactResponse,
  PublicJobDetailResponse,
} from 'contracts';
import { Mail, MessageCircle, Phone } from 'lucide-react';
import { useTranslations } from 'next-intl';
import * as React from 'react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const ICON = { call: Phone, viber: MessageCircle, email: Mail } as const;
const LABEL = {
  call: 'contactCall',
  viber: 'contactViber',
  email: 'contactEmail',
} as const;

/**
 * Phone, Viber or e-mail apply. The number or address is fetched on tap (so
 * it isn't in the page for bots) and also shown, since a desktop can't dial.
 */
export function ContactApplyCta({
  job,
  className,
}: {
  job: Pick<PublicJobDetailResponse, 'id' | 'contactChannels'>;
  className?: string;
}) {
  const t = useTranslations('JobDetail');
  const [revealed, setRevealed] = React.useState<string | null>(null);
  const [failed, setFailed] = React.useState(false);
  const [pending, setPending] = React.useState<ContactChannel | null>(null);
  const sessionKey = React.useMemo(
    () =>
      typeof globalThis.crypto?.randomUUID === 'function'
        ? globalThis.crypto.randomUUID()
        : `s-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    [],
  );

  async function open(channel: ContactChannel) {
    setPending(channel);
    setFailed(false);
    try {
      const res = await fetch(`/api/public/jobs/${job.id}/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channel, sessionKey }),
      });
      if (!res.ok) throw new Error(String(res.status));
      const contact = (await res.json()) as PublicJobContactResponse;
      setRevealed(contact.display);
      window.location.assign(contact.href);
    } catch {
      setFailed(true);
    } finally {
      setPending(null);
    }
  }

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <div className="flex gap-2">
        {job.contactChannels.map((channel) => {
          const Icon = ICON[channel];
          return (
            <Button
              key={channel}
              type="button"
              size="lg"
              variant={channel === 'viber' ? 'outline' : 'default'}
              className="min-h-12 flex-1 rounded-2xl font-bold"
              disabled={pending !== null}
              onClick={() => void open(channel)}
            >
              <Icon className="size-4" aria-hidden />
              {t(LABEL[channel])}
            </Button>
          );
        })}
      </div>
      {revealed ? (
        <p
          className="m-0 text-center text-base font-bold text-foreground"
          data-testid="contact-revealed"
        >
          {revealed}
        </p>
      ) : null}
      {failed ? (
        <p className="m-0 text-center text-sm text-destructive" role="alert">
          {t('contactError')}
        </p>
      ) : null}
    </div>
  );
}
