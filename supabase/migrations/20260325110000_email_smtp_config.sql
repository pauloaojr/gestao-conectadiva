CREATE TABLE public.email_smtp_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enabled BOOLEAN NOT NULL DEFAULT false,
  host TEXT NOT NULL DEFAULT '',
  port INTEGER NOT NULL DEFAULT 587,
  use_tls BOOLEAN NOT NULL DEFAULT true,
  username TEXT NOT NULL DEFAULT '',
  password TEXT NOT NULL DEFAULT '',
  from_name TEXT NOT NULL DEFAULT '',
  from_email TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.email_smtp_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view email_smtp_config"
  ON public.email_smtp_config
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins and managers can manage email_smtp_config"
  ON public.email_smtp_config
  FOR ALL
  TO authenticated
  USING (public.is_admin_or_manager(auth.uid()))
  WITH CHECK (public.is_admin_or_manager(auth.uid()));

CREATE TRIGGER update_email_smtp_config_updated_at
  BEFORE UPDATE ON public.email_smtp_config
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

