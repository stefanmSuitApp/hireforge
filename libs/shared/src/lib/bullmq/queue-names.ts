/**
 * Single platform queue for outbox, indexing, email, and operational pings.
 */
export const PLATFORM_QUEUE_NAME = 'platform' as const;

export type PlatformQueueName = typeof PLATFORM_QUEUE_NAME;
