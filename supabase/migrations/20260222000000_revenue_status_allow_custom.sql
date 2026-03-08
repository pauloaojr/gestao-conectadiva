-- Permitir status personalizados na receita (keys da revenue_status_config)
-- Remove o CHECK que restringia a 'pending' e 'received'
ALTER TABLE public.revenue
  DROP CONSTRAINT IF EXISTS revenue_status_check;
