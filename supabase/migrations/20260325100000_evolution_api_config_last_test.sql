-- Persistir resultado do último teste de conexão da Evolution API para manter status após refresh.
ALTER TABLE public.evolution_api_config
  ADD COLUMN IF NOT EXISTS last_test_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_test_result TEXT,
  ADD COLUMN IF NOT EXISTS last_test_message TEXT;
