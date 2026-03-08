CREATE TABLE public.notification_dispatch_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_settings_id UUID REFERENCES public.notification_settings(id) ON DELETE SET NULL,
  service TEXT NOT NULL,
  event_key TEXT NOT NULL,
  channel TEXT NOT NULL,
  recipient TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('success', 'failed')),
  error_message TEXT,
  payload_json JSONB,
  provider_response_json JSONB,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.notification_dispatch_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view notification_dispatch_logs"
  ON public.notification_dispatch_logs
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert notification_dispatch_logs"
  ON public.notification_dispatch_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (true);
