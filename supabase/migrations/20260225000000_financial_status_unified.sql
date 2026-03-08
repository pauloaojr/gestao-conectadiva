-- Unificar status em uma tabela com applies_to (Receita, Despesa ou Ambos)
CREATE TABLE public.financial_status_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL,
  label TEXT NOT NULL,
  is_system BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  count_in_balance BOOLEAN NOT NULL DEFAULT false,
  applies_to TEXT NOT NULL CHECK (applies_to IN ('revenue', 'expense', 'both')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(key, applies_to)
);

COMMENT ON TABLE public.financial_status_config IS 'Status do financeiro: Receita, Despesa ou Ambos. applies_to: revenue, expense ou both.';

ALTER TABLE public.financial_status_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view financial status config"
  ON public.financial_status_config FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins and managers can manage financial status config"
  ON public.financial_status_config FOR ALL TO authenticated
  USING (public.is_admin_or_manager(auth.uid()));

CREATE OR REPLACE FUNCTION public.prevent_delete_system_financial_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.is_system THEN
    RAISE EXCEPTION 'Não é permitido excluir status padrão do sistema.';
  END IF;
  RETURN OLD;
END;
$$;

CREATE TRIGGER prevent_delete_system_financial_status_trigger
  BEFORE DELETE ON public.financial_status_config
  FOR EACH ROW EXECUTE FUNCTION public.prevent_delete_system_financial_status();

CREATE TRIGGER update_financial_status_config_updated_at
  BEFORE UPDATE ON public.financial_status_config
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Migrar receita: applies_to = 'revenue'
INSERT INTO public.financial_status_config (key, label, is_system, sort_order, count_in_balance, applies_to)
SELECT key, label, is_system, sort_order, count_in_balance, 'revenue'::text
FROM public.revenue_status_config;

-- Migrar despesa: applies_to = 'expense'
INSERT INTO public.financial_status_config (key, label, is_system, sort_order, count_in_balance, applies_to)
SELECT key, label, is_system, sort_order, count_in_balance, 'expense'::text
FROM public.expense_status_config;

-- Remover tabelas antigas
DROP TRIGGER IF EXISTS prevent_delete_system_revenue_status_trigger ON public.revenue_status_config;
DROP TRIGGER IF EXISTS update_revenue_status_config_updated_at ON public.revenue_status_config;
DROP TABLE IF EXISTS public.revenue_status_config;

DROP TRIGGER IF EXISTS prevent_delete_system_expense_status_trigger ON public.expense_status_config;
DROP TRIGGER IF EXISTS update_expense_status_config_updated_at ON public.expense_status_config;
DROP TABLE IF EXISTS public.expense_status_config;
