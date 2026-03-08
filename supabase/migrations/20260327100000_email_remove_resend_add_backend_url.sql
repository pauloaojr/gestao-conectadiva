-- Remover Resend e adicionar URL do backend SMTP
ALTER TABLE public.email_smtp_config
  DROP COLUMN IF EXISTS provider,
  DROP COLUMN IF EXISTS resend_api_key;

ALTER TABLE public.email_smtp_config
  ADD COLUMN IF NOT EXISTS backend_url TEXT;

COMMENT ON COLUMN public.email_smtp_config.backend_url IS 'URL base do backend de e-mail para testar e enviar via SMTP';
