ALTER TABLE public.minio_storage_config
  ADD COLUMN IF NOT EXISTS last_test_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_test_result TEXT,
  ADD COLUMN IF NOT EXISTS last_test_message TEXT;
