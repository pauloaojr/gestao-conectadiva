-- Adiciona seleção de profissional ou paciente específico em regras de comissão.
-- NULL = Todos (padrão).
ALTER TABLE public.commission_rules
  ADD COLUMN IF NOT EXISTS recipient_patient_id UUID REFERENCES public.patients(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS recipient_attendant_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.commission_rules.recipient_patient_id IS 'Paciente específico; NULL = todos os pacientes.';
COMMENT ON COLUMN public.commission_rules.recipient_attendant_id IS 'Profissional específico; NULL = todos os profissionais.';
