CREATE TABLE IF NOT EXISTS public.system_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id UUID NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  menu_group TEXT NOT NULL,
  menu TEXT NOT NULL,
  screen TEXT NOT NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NULL,
  message TEXT NULL,
  metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT system_audit_logs_action_check CHECK (
    action IN ('create', 'update', 'delete', 'view', 'other')
  )
);

CREATE INDEX IF NOT EXISTS idx_system_audit_logs_created_at
  ON public.system_audit_logs (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_system_audit_logs_menu_screen_action
  ON public.system_audit_logs (menu, screen, action);

CREATE INDEX IF NOT EXISTS idx_system_audit_logs_actor_user
  ON public.system_audit_logs (actor_user_id);

ALTER TABLE public.system_audit_logs ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'system_audit_logs'
      AND policyname = 'Authenticated users can read system audit logs'
  ) THEN
    CREATE POLICY "Authenticated users can read system audit logs"
      ON public.system_audit_logs
      FOR SELECT
      TO authenticated
      USING (true);
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'system_audit_logs'
      AND policyname = 'Authenticated users can insert system audit logs'
  ) THEN
    CREATE POLICY "Authenticated users can insert system audit logs"
      ON public.system_audit_logs
      FOR INSERT
      TO authenticated
      WITH CHECK (true);
  END IF;
END
$$;
