CREATE TABLE public.minio_storage_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enabled BOOLEAN NOT NULL DEFAULT false,
  endpoint TEXT NOT NULL DEFAULT '',
  port INTEGER NOT NULL DEFAULT 9000,
  use_ssl BOOLEAN NOT NULL DEFAULT false,
  access_key TEXT NOT NULL DEFAULT '',
  secret_key TEXT NOT NULL DEFAULT '',
  bucket TEXT NOT NULL DEFAULT '',
  region TEXT NOT NULL DEFAULT 'us-east-1',
  base_path TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.minio_storage_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view minio_storage_config"
  ON public.minio_storage_config
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins and managers can manage minio_storage_config"
  ON public.minio_storage_config
  FOR ALL
  TO authenticated
  USING (public.is_admin_or_manager(auth.uid()))
  WITH CHECK (public.is_admin_or_manager(auth.uid()));

CREATE TRIGGER update_minio_storage_config_updated_at
  BEFORE UPDATE ON public.minio_storage_config
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
