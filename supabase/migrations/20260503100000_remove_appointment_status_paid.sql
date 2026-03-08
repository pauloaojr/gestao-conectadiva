-- Remove o status "Pago" da agenda: migra agendamentos para "Finalizado", atualiza trigger e remove o registro de configuração.

-- 1) Migrar agendamentos com status 'paid' para 'completed' e garantir revenue_received_at
UPDATE public.appointments
SET
  status = 'completed',
  revenue_received_at = COALESCE(revenue_received_at, updated_at, now())
WHERE status = 'paid';

-- 2) Trigger: marcar revenue_received_at também quando status = 'completed' (além de 'paid' por compatibilidade)
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

COMMENT ON COLUMN public.appointments.revenue_received_at IS 'Preenchido quando o agendamento é marcado como Finalizado (ou Pago, legado); limpo ao voltar para Pendente. Usado em Receitas para manter Recebida.';

-- 3) Permitir exclusão do status 'paid': remover is_system e depois excluir
UPDATE public.appointment_status_config
SET is_system = false
WHERE key = 'paid';

DELETE FROM public.appointment_status_config
WHERE key = 'paid';
