-- Vincular paciente ao plano
ALTER TABLE public.patients
  ADD COLUMN IF NOT EXISTS plan_id UUID NULL REFERENCES public.plans(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.patients.plan_id IS 'Plano do paciente (opcional).';
