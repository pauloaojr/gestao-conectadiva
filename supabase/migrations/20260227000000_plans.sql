-- Tabela de Planos (para vínculo com cliente e outras entidades)
CREATE TABLE public.plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  value NUMERIC(12, 2) NOT NULL CHECK (value >= 0),
  sessions INTEGER NOT NULL CHECK (sessions > 0),
  observations TEXT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.plans IS 'Planos (ex.: Básico, Premium). Será vinculado a clientes e outras entidades.';
COMMENT ON COLUMN public.plans.name IS 'Nome do plano. Ex.: Básico';
COMMENT ON COLUMN public.plans.value IS 'Valor total do plano (R$) para as sessões contempladas. Ex.: 300,00';
COMMENT ON COLUMN public.plans.sessions IS 'Quantidade de sessões que o plano contempla. Ex.: 5';
COMMENT ON COLUMN public.plans.observations IS 'Observações do plano. Ex.: 5 Sessões com qualquer profissional';

ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view plans"
  ON public.plans FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins and managers can manage plans"
  ON public.plans FOR ALL TO authenticated
  USING (public.is_admin_or_manager(auth.uid()));

CREATE TRIGGER update_plans_updated_at
  BEFORE UPDATE ON public.plans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
