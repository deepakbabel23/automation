-- 0003_webhook_events.sql — idempotency log for payment webhooks.
-- Each Razorpay webhook event is recorded once; duplicates are ignored.
create table if not exists webhook_events (
  event_id    text primary key,
  kind        text,
  received_at timestamptz not null default now()
);
