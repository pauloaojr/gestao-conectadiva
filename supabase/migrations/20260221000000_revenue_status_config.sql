-- Status da receita: tabela separada do status da agenda; configurável (labels e status customizados)
CREATE TABLE public.revenue_status_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  is_system BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.revenue_status_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view revenue status config"
  ON public.revenue_status_config FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins and managers can manage revenue status config"
  ON public.revenue_status_config FOR ALL TO authenticated
  USING (public.is_admin_or_manager(auth.uid()));

CREATE OR REPLACE FUNCTION public.prevent_delete_system_revenue_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.is_system THEN
    RAISE EXCEPTION 'Não é permitido excluir status padrão do sistema (receita).';
  END IF;
  RETURN OLD;
END;
$$;

CREATE TRIGGER prevent_delete_system_revenue_status_trigger
  BEFORE DELETE ON public.revenue_status_config
  FOR EACH ROW EXECUTE FUNCTION public.prevent_delete_system_revenue_status();

CREATE TRIGGER update_revenue_status_config_updated_at
  BEFORE UPDATE ON public.revenue_status_config
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Status padrão: Receita Pendente e Recebida (regra da agenda: pendente→Receita Pendente, pago→Recebida)
INSERT INTO public.revenue_status_config (key, label, is_system, sort_order) VALUES
  ('pending', 'Receita Pendente', true, 1),
  ('received', 'Recebida', true, 2);

COMMENT ON TABLE public.revenue_status_config IS 'Configuração de status da receita (financeiro). Independente da agenda. Status is_system não podem ser excluídos. Regra: agenda Pago/Pendente altera automaticamente o status da receita (com histórico).';
