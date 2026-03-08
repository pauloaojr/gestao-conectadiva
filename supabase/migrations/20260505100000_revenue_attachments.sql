-- Anexos de receita: múltiplos por receita, armazenados no storage (MinIO); storage_key usado para remover ao trocar/excluir.
CREATE TABLE IF NOT EXISTS public.revenue_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  revenue_id UUID NOT NULL REFERENCES public.revenue(id) ON DELETE CASCADE,
  storage_key TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_revenue_attachments_revenue_id ON public.revenue_attachments(revenue_id);

ALTER TABLE public.revenue_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view revenue_attachments"
  ON public.revenue_attachments FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated can insert revenue_attachments"
  ON public.revenue_attachments FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated can update revenue_attachments"
  ON public.revenue_attachments FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated can delete revenue_attachments"
  ON public.revenue_attachments FOR DELETE TO authenticated USING (true);

COMMENT ON TABLE public.revenue_attachments IS 'Anexos (arquivos) vinculados a uma receita; arquivos no storage (MinIO).';
