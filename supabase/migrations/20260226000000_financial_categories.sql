-- Categorias de Receita e Despesa (configurável)
CREATE TABLE public.financial_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  applies_to TEXT NOT NULL CHECK (applies_to IN ('revenue', 'expense', 'both')),
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.financial_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view financial_categories"
  ON public.financial_categories FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins and managers can manage financial_categories"
  ON public.financial_categories FOR ALL TO authenticated
  USING (public.is_admin_or_manager(auth.uid()));

CREATE TRIGGER update_financial_categories_updated_at
  BEFORE UPDATE ON public.financial_categories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

COMMENT ON TABLE public.financial_categories IS 'Categorias para Receita e/ou Despesa. applies_to: revenue, expense ou both.';

-- Categoria na receita (opcional)
ALTER TABLE public.revenue
  ADD COLUMN IF NOT EXISTS category_id UUID NULL REFERENCES public.financial_categories(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.revenue.category_id IS 'Categoria da receita (opcional).';

-- Categoria na despesa (opcional)
ALTER TABLE public.expenses
  ADD COLUMN IF NOT EXISTS category_id UUID NULL REFERENCES public.financial_categories(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.expenses.category_id IS 'Categoria da despesa (opcional).';
