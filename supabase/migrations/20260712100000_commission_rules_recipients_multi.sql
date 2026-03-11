-- Permite múltiplos pacientes ou profissionais por regra.
-- Arrays vazios = Todos. Arrays com IDs = apenas os selecionados.
ALTER TABLE public.commission_rules
  ADD COLUMN IF NOT EXISTS recipient_patient_ids UUID[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS recipient_attendant_ids UUID[] NOT NULL DEFAULT '{}';

-- Migra dados das colunas antigas (se existirem)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'commission_rules' AND column_name = 'recipient_patient_id'
  ) THEN
    UPDATE public.commission_rules
    SET recipient_patient_ids = ARRAY[recipient_patient_id]
    WHERE recipient_patient_id IS NOT NULL;
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'commission_rules' AND column_name = 'recipient_attendant_id'
  ) THEN
    UPDATE public.commission_rules
    SET recipient_attendant_ids = ARRAY[recipient_attendant_id]
    WHERE recipient_attendant_id IS NOT NULL;
  END IF;
END $$;

ALTER TABLE public.commission_rules
  DROP COLUMN IF EXISTS recipient_patient_id,
  DROP COLUMN IF EXISTS recipient_attendant_id;

COMMENT ON COLUMN public.commission_rules.recipient_patient_ids IS 'IDs de pacientes; array vazio = todos.';
COMMENT ON COLUMN public.commission_rules.recipient_attendant_ids IS 'IDs de profissionais; array vazio = todos.';
