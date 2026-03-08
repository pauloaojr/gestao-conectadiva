ALTER TABLE public.minio_storage_audit_logs
  ADD COLUMN IF NOT EXISTS correlation_id TEXT;

CREATE INDEX IF NOT EXISTS idx_minio_storage_audit_logs_correlation
  ON public.minio_storage_audit_logs (correlation_id);

CREATE INDEX IF NOT EXISTS idx_minio_storage_audit_logs_actor_user
  ON public.minio_storage_audit_logs (actor_user_id);

CREATE OR REPLACE FUNCTION public.prune_minio_storage_audit_logs(
  p_retention_days INTEGER DEFAULT 180
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_deleted_count INTEGER := 0;
BEGIN
  DELETE FROM public.minio_storage_audit_logs
  WHERE created_at < now() - (GREATEST(p_retention_days, 1) || ' days')::interval;

  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  RETURN v_deleted_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_prune_minio_storage_audit_logs()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Retenção automática leve: executa em cada insert.
  PERFORM public.prune_minio_storage_audit_logs(180);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_minio_storage_audit_logs_prune ON public.minio_storage_audit_logs;

CREATE TRIGGER trg_minio_storage_audit_logs_prune
AFTER INSERT ON public.minio_storage_audit_logs
FOR EACH ROW
EXECUTE FUNCTION public.trg_prune_minio_storage_audit_logs();
