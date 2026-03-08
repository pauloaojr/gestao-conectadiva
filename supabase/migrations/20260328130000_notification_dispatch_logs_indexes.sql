CREATE INDEX IF NOT EXISTS idx_notification_dispatch_logs_created_at_desc
  ON public.notification_dispatch_logs (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notification_dispatch_logs_status_created_at_desc
  ON public.notification_dispatch_logs (status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notification_dispatch_logs_service_event_created_at_desc
  ON public.notification_dispatch_logs (service, event_key, created_at DESC);
