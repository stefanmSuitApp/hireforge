CREATE TABLE IF NOT EXISTS "outbox_dead_letters" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"outbox_event_id" integer NOT NULL,
	"bullmq_job_id" text NOT NULL,
	"event_type" text,
	"payload_snapshot" jsonb,
	"error_message" text NOT NULL,
	"attempts_made" integer NOT NULL,
	"stacktrace" text,
	"created_at" timestamptz DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "outbox_dead_letters_outbox_event_id_unique" ON "outbox_dead_letters" ("outbox_event_id");
