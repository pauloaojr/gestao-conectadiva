-- Flag "Soma Saldo": define se receitas nesse status entram na soma de receitas pagas (total recebido)
ALTER TABLE public.revenue_status_config
  ADD COLUMN IF NOT EXISTS count_in_balance BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.revenue_status_config.count_in_balance IS 'Se true, receitas com este status entram na soma de receitas pagas (Total recebido).';

-- Padrão: Recebida soma no saldo; Receita Pendente não
UPDATE public.revenue_status_config
SET count_in_balance = true
WHERE key = 'received';
