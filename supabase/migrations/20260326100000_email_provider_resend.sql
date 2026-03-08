-- Permitir envio por Resend (API) além de SMTP
ALTER TABLE public.email_smtp_config
  ADD COLUMN IF NOT EXISTS provider TEXT NOT NULL DEFAULT 'smtp',
  ADD COLUMN IF NOT EXISTS resend_api_key TEXT;

COMMENT ON COLUMN public.email_smtp_config.provider IS 'smtp = usar servidor SMTP (requer backend próprio); resend = usar Resend API (funciona na Edge Function)';
COMMENT ON COLUMN public.email_smtp_config.resend_api_key IS 'API Key do Resend (resend.com) quando provider = resend';
