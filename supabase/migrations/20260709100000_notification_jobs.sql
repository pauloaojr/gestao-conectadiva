-- Fila explícita de notificações (notification_jobs).
-- Melhora visibilidade do que está pendente e permite controle ao escalar.

CREATE TABLE public.notification_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_settings_id UUID NOT NULL REFERENCES public.notification_settings(id) ON DELETE CASCADE,
  service TEXT NOT NULL CHECK (service IN ('agenda', 'financeiro', 'aniversario')),
  event_key TEXT NOT NULL,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('appointment', 'revenue', 'patient', 'profile')),
  entity_id UUID,
  recipient_patient_id UUID,
  recipient_attendant_id UUID,
  context_json JSONB NOT NULL DEFAULT '{}',
  run_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  attempts INT NOT NULL DEFAULT 0,
  error_message TEXT,
  dedupe_key TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_notification_jobs_status_run_at
  ON public.notification_jobs (status, run_at)
  WHERE status = 'pending';

CREATE INDEX idx_notification_jobs_dedupe_key
  ON public.notification_jobs (dedupe_key);

ALTER TABLE public.notification_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view notification_jobs"
  ON public.notification_jobs FOR SELECT TO authenticated USING (true);

CREATE POLICY "Service role can manage notification_jobs"
  ON public.notification_jobs FOR ALL TO service_role USING (true);

CREATE TRIGGER update_notification_jobs_updated_at
  BEFORE UPDATE ON public.notification_jobs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

COMMENT ON TABLE public.notification_jobs IS 'Fila explícita de notificações agendadas. O scheduler enfileira e processa jobs.';
