-- Receitas: entradas manuais e automáticas (agenda)
-- Coluna amount em appointments: valor da consulta (quando null, usar preço do serviço na tela de receitas)
ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS amount NUMERIC(12,2) NULL;

COMMENT ON COLUMN public.appointments.amount IS 'Valor da consulta. Se null, receitas da agenda usam o preço do serviço.';

-- Tabela de receitas manuais (não atreladas à agenda)
CREATE TABLE public.revenue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  amount NUMERIC(12,2) NOT NULL CHECK (amount >= 0),
  description TEXT NOT NULL DEFAULT '',
  revenue_date DATE NOT NULL DEFAULT (CURRENT_DATE),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'received')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.revenue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view revenue"
  ON public.revenue FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins and managers can manage revenue"
  ON public.revenue FOR ALL TO authenticated
  USING (public.is_admin_or_manager(auth.uid()));

CREATE TRIGGER update_revenue_updated_at
  BEFORE UPDATE ON public.revenue
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

COMMENT ON TABLE public.revenue IS 'Receitas manuais. Receitas da agenda são derivadas dos agendamentos (status pending/paid).';
