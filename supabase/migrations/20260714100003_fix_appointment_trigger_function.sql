-- Corrige: restaura a função do trigger da AGENDA (appointments) e garante que revenue use sua própria função.
-- A migration 20260714100000 havia sobrescrito set_revenue_received_at_on_status_change com a lógica da tabela revenue;
-- o trigger em appointments continua chamando essa função, que deve atuar em NEW.revenue_received_at (appointments).

-- 1) Função para a tabela REVENUE (received_at)
CREATE OR REPLACE FUNCTION public.set_revenue_received_at_on_revenue_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  counts_balance BOOLEAN;
BEGIN
  SELECT f.count_in_balance INTO counts_balance
  FROM public.financial_status_config f
  WHERE f.key = NEW.status AND f.applies_to = 'revenue'
  LIMIT 1;
  IF counts_balance THEN
    NEW.received_at := COALESCE(NEW.received_at, now());
  ELSE
    NEW.received_at := NULL;
  END IF;
  RETURN NEW;
END;
$$;

-- 2) Trigger em revenue deve usar a função de revenue
DROP TRIGGER IF EXISTS trigger_set_revenue_received_at ON public.revenue;
CREATE TRIGGER trigger_set_revenue_received_at
  BEFORE INSERT OR UPDATE OF status ON public.revenue
  FOR EACH ROW
  EXECUTE FUNCTION public.set_revenue_received_at_on_revenue_status_change();

-- 3) Restaurar função da AGENDA (appointments)
CREATE OR REPLACE FUNCTION public.set_revenue_received_at_on_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status IN ('paid', 'completed') THEN
    NEW.revenue_received_at := COALESCE(NEW.revenue_received_at, now());
  ELSIF NEW.status = 'pending' THEN
    NEW.revenue_received_at := NULL;
  END IF;
  RETURN NEW;
END;
$$;
