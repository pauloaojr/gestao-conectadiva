-- Receita não depende da agenda: remover trigger que criava/atualizava revenue a partir do agendamento.
-- A coluna Data Recebido em Receitas é preenchida apenas quando o usuário clica em "Marcar como recebida" na tela Receitas.
-- A agenda continua com a lógica atual (Compareceu, revenue_received_at); apenas não sincroniza mais com a tabela revenue.

DROP TRIGGER IF EXISTS trigger_sync_revenue_on_appointment_received ON public.appointments;
DROP FUNCTION IF EXISTS public.sync_revenue_on_appointment_received();

-- Opcional: receitas que vieram do backfill (appointment_id preenchido) deixam de ter data atrelada à agenda
-- Ficam pendentes; o usuário pode marcar como recebida em Receitas quando quiser
UPDATE public.revenue
SET status = 'pending', received_at = NULL, updated_at = now()
WHERE appointment_id IS NOT NULL;
