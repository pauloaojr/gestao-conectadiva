-- Guardar quando a consulta passou pelo status "pago": receita fica Recebida até o status voltar a Pendente
ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS revenue_received_at TIMESTAMP WITH TIME ZONE NULL;

COMMENT ON COLUMN public.appointments.revenue_received_at IS 'Preenchido quando o agendamento é marcado como Pago; limpo ao voltar para Pendente. Usado em Receitas para manter Recebida mesmo após outros status (ex.: Confirmado, Finalizado).';

CREATE OR REPLACE FUNCTION public.set_revenue_received_at_on_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'paid' THEN
    NEW.revenue_received_at := now();
  ELSIF NEW.status = 'pending' THEN
    NEW.revenue_received_at := NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_set_revenue_received_at ON public.appointments;
CREATE TRIGGER trigger_set_revenue_received_at
  BEFORE INSERT OR UPDATE OF status ON public.appointments
  FOR EACH ROW
  EXECUTE FUNCTION public.set_revenue_received_at_on_status_change();

-- Backfill: agendamentos que já estão como "pago" passam a ter revenue_received_at preenchido
UPDATE public.appointments
SET revenue_received_at = COALESCE(updated_at, now())
WHERE status = 'paid' AND revenue_received_at IS NULL;
