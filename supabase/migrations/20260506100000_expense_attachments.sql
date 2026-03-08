-- Anexos de despesa: múltiplos por despesa, armazenados no storage (MinIO); storage_key usado para remover ao trocar/excluir.
CREATE TABLE IF NOT EXISTS public.expense_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_id UUID NOT NULL REFERENCES public.expenses(id) ON DELETE CASCADE,
  storage_key TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_expense_attachments_expense_id ON public.expense_attachments(expense_id);

ALTER TABLE public.expense_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view expense_attachments"
  ON public.expense_attachments FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated can insert expense_attachments"
  ON public.expense_attachments FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated can update expense_attachments"
  ON public.expense_attachments FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated can delete expense_attachments"
  ON public.expense_attachments FOR DELETE TO authenticated USING (true);

COMMENT ON TABLE public.expense_attachments IS 'Anexos (arquivos) vinculados a uma despesa; arquivos no storage (MinIO).';
