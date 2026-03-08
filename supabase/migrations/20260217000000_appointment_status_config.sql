-- Tabela de configuração de status da agenda (labels editáveis e status customizados)
CREATE TABLE public.appointment_status_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  is_system BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.appointment_status_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view appointment status config"
  ON public.appointment_status_config FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins and managers can manage appointment status config"
  ON public.appointment_status_config FOR ALL TO authenticated
  USING (public.is_admin_or_manager(auth.uid()));

-- Impedir exclusão de status do sistema
CREATE OR REPLACE FUNCTION public.prevent_delete_system_appointment_status()
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

CREATE TRIGGER prevent_delete_system_appointment_status_trigger
  BEFORE DELETE ON public.appointment_status_config
  FOR EACH ROW EXECUTE FUNCTION public.prevent_delete_system_appointment_status();

-- Trigger updated_at
CREATE TRIGGER update_appointment_status_config_updated_at
  BEFORE UPDATE ON public.appointment_status_config
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Status padrão (ordem: Pendentes, Pagos, Confirmados, Finalizados, Cancelados)
INSERT INTO public.appointment_status_config (key, label, is_system, sort_order) VALUES
  ('pending', 'Pendente', true, 1),
  ('paid', 'Pago', true, 2),
  ('confirmed', 'Confirmado', true, 3),
  ('completed', 'Finalizado', true, 4),
  ('cancelled', 'Cancelado', true, 5);

-- Alterar coluna status em appointments de enum para TEXT (permite status customizados)
ALTER TABLE public.appointments ADD COLUMN status_text TEXT NOT NULL DEFAULT 'pending';
UPDATE public.appointments SET status_text = status::text;
ALTER TABLE public.appointments DROP COLUMN status;
ALTER TABLE public.appointments RENAME COLUMN status_text TO status;
ALTER TABLE public.appointments ALTER COLUMN status SET DEFAULT 'pending';

COMMENT ON TABLE public.appointment_status_config IS 'Configuração de status da agenda: labels editáveis e status customizados. Status is_system não podem ser excluídos.';
