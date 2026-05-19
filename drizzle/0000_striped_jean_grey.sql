-- Safe when `db:push` already created this table (same shape as generated migration).
CREATE TABLE IF NOT EXISTS "outbox" (
	"id" serial PRIMARY KEY NOT NULL,
	"event_type" text NOT NULL,
	"payload" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"processed_at" timestamp with time zone
);
