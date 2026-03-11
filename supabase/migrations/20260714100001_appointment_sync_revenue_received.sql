-- Sincroniza agendamento com tabela revenue: ao marcar Compareceu (revenue_received_at preenchido), cria/atualiza receita com appointment_id e received_at.
-- Assim o repasse pode exibir "Data do Recebimento" a partir de revenue.received_at.

CREATE OR REPLACE FUNCTION public.sync_revenue_on_appointment_received()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  received_status_key TEXT;
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.revenue_received_at IS NOT DISTINCT FROM NEW.revenue_received_at THEN
    RETURN NEW;
  END IF;
  IF NEW.revenue_received_at IS NOT NULL THEN
    -- Obter um status "recebida" (count_in_balance) para receita
    SELECT key INTO received_status_key
    FROM public.financial_status_config
    WHERE applies_to = 'revenue' AND count_in_balance
    ORDER BY sort_order
    LIMIT 1;
    IF received_status_key IS NULL THEN
      received_status_key := 'received';
    END IF;

    INSERT INTO public.revenue (
      appointment_id,
      amount,
      description,
      revenue_date,
      status,
      patient_id,
      patient_name,
      received_at
    ) VALUES (
      NEW.id,
      COALESCE(NEW.amount, 0),
      COALESCE('Consulta - ' || NEW.patient_name, 'Consulta'),
      (NEW.appointment_date)::date,
      received_status_key,
      NEW.patient_id,
      NEW.patient_name,
      NEW.revenue_received_at
    )
    ON CONFLICT (appointment_id) WHERE (appointment_id IS NOT NULL)
    DO UPDATE SET
      status = EXCLUDED.status,
      received_at = EXCLUDED.received_at,
      updated_at = now();
  ELSE
    UPDATE public.revenue
    SET status = 'pending',
        received_at = NULL,
        updated_at = now()
    WHERE appointment_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

-- ON CONFLICT exige UNIQUE; já temos idx_revenue_appointment_id_unique como UNIQUE
-- Mas INSERT ... ON CONFLICT (appointment_id) precisa de um constraint UNIQUE nomeado ou o índice único.
-- O índice idx_revenue_appointment_id_unique é UNIQUE, então ON CONFLICT (appointment_id) funciona.

DROP TRIGGER IF EXISTS trigger_sync_revenue_on_appointment_received ON public.appointments;
CREATE TRIGGER trigger_sync_revenue_on_appointment_received
  AFTER INSERT OR UPDATE OF revenue_received_at ON public.appointments
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_revenue_on_appointment_received();

-- Backfill: criar receitas para agendamentos que já têm revenue_received_at mas ainda não têm linha em revenue
INSERT INTO public.revenue (
  appointment_id,
  amount,
  description,
  revenue_date,
  status,
  patient_id,
  patient_name,
  received_at
)
SELECT
  a.id,
  COALESCE(a.amount, 0),
  COALESCE('Consulta - ' || a.patient_name, 'Consulta'),
  (a.appointment_date)::date,
  COALESCE(
    (SELECT f.key FROM public.financial_status_config f WHERE f.applies_to = 'revenue' AND f.count_in_balance ORDER BY f.sort_order LIMIT 1),
    'received'
  ),
  a.patient_id,
  a.patient_name,
  a.revenue_received_at
FROM public.appointments a
WHERE a.revenue_received_at IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM public.revenue r WHERE r.appointment_id = a.id);
