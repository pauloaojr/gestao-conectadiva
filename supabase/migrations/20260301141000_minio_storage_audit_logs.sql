CREATE TABLE IF NOT EXISTS public.minio_storage_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id UUID NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  status TEXT NOT NULL,
  module TEXT NULL,
  storage_key TEXT NULL,
  bucket TEXT NULL,
  prefix TEXT NULL,
  message TEXT NULL,
  error_message TEXT NULL,
  metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT minio_storage_audit_logs_action_check CHECK (
    action IN ('upload', 'remove', 'cleanup', 'test', 'other')
  ),
  CONSTRAINT minio_storage_audit_logs_status_check CHECK (
    status IN ('success', 'error', 'info')
  )
);

CREATE INDEX IF NOT EXISTS idx_minio_storage_audit_logs_created_at
  ON public.minio_storage_audit_logs (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_minio_storage_audit_logs_action_status
  ON public.minio_storage_audit_logs (action, status);

ALTER TABLE public.minio_storage_audit_logs ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'minio_storage_audit_logs'
      AND policyname = 'Authenticated users can read minio storage audit logs'
  ) THEN
    CREATE POLICY "Authenticated users can read minio storage audit logs"
      ON public.minio_storage_audit_logs
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
      AND tablename = 'minio_storage_audit_logs'
      AND policyname = 'Authenticated users can insert minio storage audit logs'
  ) THEN
    CREATE POLICY "Authenticated users can insert minio storage audit logs"
      ON public.minio_storage_audit_logs
      FOR INSERT
      TO authenticated
      WITH CHECK (true);
  END IF;
END
$$;
