-- Coluna Data Recebido na receita: preenchida quando status vai para Recebida (count_in_balance), limpa quando volta para Pendente.
-- appointment_id: vincula receita ao agendamento para que o repasse use revenue.received_at como "Data do Recebimento".

ALTER TABLE public.revenue
  ADD COLUMN IF NOT EXISTS received_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS appointment_id UUID NULL REFERENCES public.appointments(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.revenue.received_at IS 'Data em que a receita passou para status Recebida (count_in_balance); limpa ao voltar para Pendente.';
COMMENT ON COLUMN public.revenue.appointment_id IS 'Quando preenchido, esta receita é atrelada ao agendamento; usado no repasse para exibir Data do Recebimento.';

CREATE UNIQUE INDEX IF NOT EXISTS idx_revenue_appointment_id_unique
  ON public.revenue (appointment_id) WHERE appointment_id IS NOT NULL;

-- Trigger na tabela REVENUE: ao alterar status da receita, preencher ou limpar received_at conforme count_in_balance.
-- (Função com nome distinto para não sobrescrever set_revenue_received_at_on_status_change da tabela appointments.)
CREATE OR REPLACE FUNCTION public.set_revenue_received_at_on_revenue_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  counts_balance BOOLEAN;
BEGIN
  SELECT f.count_in_balance INTO counts_balance
  FROM public.financial_status_config f
  WHERE f.key = NEW.status AND f.applies_to = 'revenue'
  LIMIT 1;

  IF counts_balance THEN
    NEW.received_at := COALESCE(NEW.received_at, now());
  ELSE
    NEW.received_at := NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_set_revenue_received_at ON public.revenue;
CREATE TRIGGER trigger_set_revenue_received_at
  BEFORE INSERT OR UPDATE OF status ON public.revenue
  FOR EACH ROW
  EXECUTE FUNCTION public.set_revenue_received_at_on_revenue_status_change();

-- Restaurar função da AGENDA (appointments): usada pelo trigger em appointments, não pode ser sobrescrita.
CREATE OR REPLACE FUNCTION public.set_revenue_received_at_on_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status IN ('paid', 'completed') THEN
    NEW.revenue_received_at := COALESCE(NEW.revenue_received_at, now());
  ELSIF NEW.status = 'pending' THEN
    NEW.revenue_received_at := NULL;
  END IF;
  RETURN NEW;
END;
$$;

-- Backfill: receitas que já estão com status "recebida" (count_in_balance) ganham received_at = updated_at
UPDATE public.revenue r
SET received_at = COALESCE(r.received_at, r.updated_at, now())
WHERE EXISTS (
  SELECT 1 FROM public.financial_status_config f
  WHERE f.key = r.status AND f.applies_to = 'revenue' AND f.count_in_balance
) AND r.received_at IS NULL;
