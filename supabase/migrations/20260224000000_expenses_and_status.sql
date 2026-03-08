-- Módulo de Despesas
CREATE TABLE public.expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  amount NUMERIC(12,2) NOT NULL CHECK (amount >= 0),
  description TEXT NOT NULL DEFAULT '',
  expense_date DATE NOT NULL DEFAULT (CURRENT_DATE),
  status TEXT NOT NULL DEFAULT 'pending',
  patient_id UUID NULL REFERENCES public.patients(id) ON DELETE SET NULL,
  patient_name TEXT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view expenses"
  ON public.expenses FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins and managers can manage expenses"
  ON public.expenses FOR ALL TO authenticated
  USING (public.is_admin_or_manager(auth.uid()));

CREATE TRIGGER update_expenses_updated_at
  BEFORE UPDATE ON public.expenses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

COMMENT ON TABLE public.expenses IS 'Despesas do financeiro.';

-- Status da despesa (configurável; Soma Saldo = entra no total pago)
CREATE TABLE public.expense_status_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  is_system BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  count_in_balance BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.expense_status_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view expense status config"
  ON public.expense_status_config FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins and managers can manage expense status config"
  ON public.expense_status_config FOR ALL TO authenticated
  USING (public.is_admin_or_manager(auth.uid()));

CREATE OR REPLACE FUNCTION public.prevent_delete_system_expense_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.is_system THEN
    RAISE EXCEPTION 'Não é permitido excluir status padrão do sistema (despesa).';
  END IF;
  RETURN OLD;
END;
$$;

CREATE TRIGGER prevent_delete_system_expense_status_trigger
  BEFORE DELETE ON public.expense_status_config
  FOR EACH ROW EXECUTE FUNCTION public.prevent_delete_system_expense_status();

CREATE TRIGGER update_expense_status_config_updated_at
  BEFORE UPDATE ON public.expense_status_config
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.expense_status_config (key, label, is_system, sort_order, count_in_balance) VALUES
  ('pending', 'Despesa Pendente', true, 1, false),
  ('paid', 'Paga', true, 2, true);

COMMENT ON TABLE public.expense_status_config IS 'Configuração de status da despesa. count_in_balance: entra na soma de despesas pagas.';
