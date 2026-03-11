-- Regras de comissão (repasse). Base pode ser por Paciente ou por Profissional.
CREATE TABLE public.commission_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT true,
  target_type TEXT NOT NULL CHECK (target_type IN ('patient', 'professional')),
  value_type TEXT NOT NULL CHECK (value_type IN ('percent', 'fixed')),
  value NUMERIC(12, 4) NOT NULL CHECK (value >= 0),
  service_id UUID REFERENCES public.services(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_commission_rules_enabled ON public.commission_rules (enabled);
CREATE INDEX idx_commission_rules_target_type ON public.commission_rules (target_type);
CREATE INDEX idx_commission_rules_service_id ON public.commission_rules (service_id);

ALTER TABLE public.commission_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view commission_rules"
  ON public.commission_rules FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins and managers can manage commission_rules"
  ON public.commission_rules FOR ALL TO authenticated
  USING (public.is_admin_or_manager(auth.uid()))
  WITH CHECK (public.is_admin_or_manager(auth.uid()));

CREATE TRIGGER update_commission_rules_updated_at
  BEFORE UPDATE ON public.commission_rules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

COMMENT ON TABLE public.commission_rules IS 'Regras de comissão para repasse. target_type: patient (por paciente) ou professional (por profissional).';
