ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS avatar_storage_key TEXT,
  ADD COLUMN IF NOT EXISTS professional_document_storage_key TEXT,
  ADD COLUMN IF NOT EXISTS contract_document_storage_key TEXT;
