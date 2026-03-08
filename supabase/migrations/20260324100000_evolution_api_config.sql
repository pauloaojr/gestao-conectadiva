-- Configuração da integração Evolution API (WhatsApp) – um registro por ambiente, persistido no banco.
CREATE TABLE public.evolution_api_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enabled BOOLEAN NOT NULL DEFAULT false,
  base_url TEXT NOT NULL DEFAULT '',
  token TEXT NOT NULL DEFAULT '',
  default_sender_name TEXT NOT NULL DEFAULT '',
  default_phone_country_code TEXT NOT NULL DEFAULT '55',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.evolution_api_config ENABLE ROW LEVEL SECURITY;

-- Usuários autenticados podem ler (para uso em outras partes do sistema, ex.: envio de WhatsApp).
CREATE POLICY "Authenticated users can view evolution_api_config"
ON public.evolution_api_config
FOR SELECT
TO authenticated
USING (true);

-- Apenas admins/gestores podem inserir ou atualizar.
CREATE POLICY "Admins and managers can manage evolution_api_config"
ON public.evolution_api_config
FOR ALL
TO authenticated
USING (public.is_admin_or_manager(auth.uid()))
WITH CHECK (public.is_admin_or_manager(auth.uid()));

CREATE TRIGGER update_evolution_api_config_updated_at
BEFORE UPDATE ON public.evolution_api_config
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
