-- Chaves de storage (MinIO) para foto e documento do paciente; permitem remover arquivo anterior ao trocar.
ALTER TABLE public.patients
  ADD COLUMN IF NOT EXISTS photo_storage_key TEXT NULL,
  ADD COLUMN IF NOT EXISTS document_storage_key TEXT NULL;

COMMENT ON COLUMN public.patients.photo_storage_key IS 'Key do objeto no storage (MinIO) da foto; usado para remover ao trocar.';
COMMENT ON COLUMN public.patients.document_storage_key IS 'Key do objeto no storage (MinIO) do documento; usado para remover ao trocar.';
