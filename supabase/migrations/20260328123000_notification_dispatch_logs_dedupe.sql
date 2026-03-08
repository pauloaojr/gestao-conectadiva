ALTER TABLE public.notification_dispatch_logs
  ADD COLUMN IF NOT EXISTS dedupe_key TEXT;

CREATE INDEX IF NOT EXISTS idx_notification_dispatch_logs_dedupe_key
  ON public.notification_dispatch_logs (dedupe_key);
