-- Serviços que o plano dá direito (N:N entre planos e serviços)
CREATE TABLE public.plan_services (
  plan_id UUID NOT NULL REFERENCES public.plans(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  PRIMARY KEY (plan_id, service_id)
);

COMMENT ON TABLE public.plan_services IS 'Serviços aos quais o plano dá direito.';

CREATE INDEX idx_plan_services_plan_id ON public.plan_services(plan_id);
CREATE INDEX idx_plan_services_service_id ON public.plan_services(service_id);

ALTER TABLE public.plan_services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view plan_services"
  ON public.plan_services FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins and managers can manage plan_services"
  ON public.plan_services FOR ALL TO authenticated
  USING (public.is_admin_or_manager(auth.uid()));
