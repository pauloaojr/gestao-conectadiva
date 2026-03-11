-- Controle de repasses marcados como Pago (por agendamento pago).
-- Pendente = receita paga, agenda sem status compareceu.
-- Pagar = receita paga e agenda com status compareceu (completed).
-- Pago = usuário marcou como pago; pode voltar para Pagar.
CREATE TABLE IF NOT EXISTS public.repasse_paid (
  appointment_id UUID PRIMARY KEY REFERENCES public.appointments(id) ON DELETE CASCADE,
  paid_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_repasse_paid_paid_at ON public.repasse_paid (paid_at);

ALTER TABLE public.repasse_paid ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated can view repasse_paid" ON public.repasse_paid;
CREATE POLICY "Authenticated can view repasse_paid"
  ON public.repasse_paid FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Admins and managers can manage repasse_paid" ON public.repasse_paid;
CREATE POLICY "Admins and managers can manage repasse_paid"
  ON public.repasse_paid FOR ALL TO authenticated
  USING (public.is_admin_or_manager(auth.uid()))
  WITH CHECK (public.is_admin_or_manager(auth.uid()));

COMMENT ON TABLE public.repasse_paid IS 'Repasses marcados como Pago. appointment_id = agendamento cujo repasse foi pago ao profissional.';
