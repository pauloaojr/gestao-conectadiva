-- Dia vencimento: dia do mês que vence o plano (padrão 10)
ALTER TABLE public.plans
  ADD COLUMN IF NOT EXISTS due_day INTEGER NOT NULL DEFAULT 10 CHECK (due_day >= 1 AND due_day <= 31);

-- Vigência: quantidade de meses que o plano fica ativo
ALTER TABLE public.plans
  ADD COLUMN IF NOT EXISTS validity_months INTEGER NULL;

-- Início do ciclo: dia do mês que inicia o ciclo de vigência (padrão 1)
ALTER TABLE public.plans
  ADD COLUMN IF NOT EXISTS cycle_start_day INTEGER NOT NULL DEFAULT 1 CHECK (cycle_start_day >= 1 AND cycle_start_day <= 31);

COMMENT ON COLUMN public.plans.due_day IS 'Dia do mês em que vence o plano. Ex.: 10';
COMMENT ON COLUMN public.plans.validity_months IS 'Quantidade de meses que o plano fica ativo.';
COMMENT ON COLUMN public.plans.cycle_start_day IS 'Dia do mês em que inicia o ciclo de vigência do plano. Ex.: 1';
