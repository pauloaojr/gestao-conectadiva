-- Histórico de alterações de plano do paciente (para relatórios por paciente, mês e ano)
CREATE TABLE public.patient_plan_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  plan_id UUID NULL REFERENCES public.plans(id) ON DELETE SET NULL,
  previous_plan_id UUID NULL REFERENCES public.plans(id) ON DELETE SET NULL,
  action TEXT NOT NULL CHECK (action IN ('added', 'changed', 'removed')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID NULL REFERENCES auth.users(id) ON DELETE SET NULL
);

COMMENT ON TABLE public.patient_plan_history IS 'Histórico de quando o plano do paciente foi adicionado, alterado ou retirado. Base para relatórios por paciente, mês e ano.';
COMMENT ON COLUMN public.patient_plan_history.action IS 'added = plano vinculado; changed = plano trocado; removed = plano retirado.';
COMMENT ON COLUMN public.patient_plan_history.plan_id IS 'Plano atual após a alteração (null quando action = removed).';
COMMENT ON COLUMN public.patient_plan_history.previous_plan_id IS 'Plano anterior (null quando action = added).';

CREATE INDEX idx_patient_plan_history_patient_id ON public.patient_plan_history(patient_id);
CREATE INDEX idx_patient_plan_history_created_at ON public.patient_plan_history(created_at);
CREATE INDEX idx_patient_plan_history_plan_id ON public.patient_plan_history(plan_id) WHERE plan_id IS NOT NULL;

ALTER TABLE public.patient_plan_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view patient plan history"
  ON public.patient_plan_history FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated can insert patient plan history"
  ON public.patient_plan_history FOR INSERT TO authenticated WITH CHECK (true);
