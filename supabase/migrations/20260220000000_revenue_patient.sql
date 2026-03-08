-- Cliente na receita: para receita manual, opcional; para receita automática já vem do agendamento (exibido na coluna)
ALTER TABLE public.revenue
  ADD COLUMN IF NOT EXISTS patient_id UUID NULL REFERENCES public.patients(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS patient_name TEXT NULL;

COMMENT ON COLUMN public.revenue.patient_id IS 'Paciente/cliente associado à receita manual (opcional).';
COMMENT ON COLUMN public.revenue.patient_name IS 'Nome do paciente para exibição (denormalizado).';
