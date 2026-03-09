-- Cron para executar o notification-scheduler a cada 15 minutos.
-- Usa pg_cron + pg_net para chamar a Edge Function.
--
-- PRÉ-REQUISITO: Crie os secrets no Vault antes de aplicar esta migration:
--
--   SELECT vault.create_secret(
--     'https://SEU_PROJECT_REF.supabase.co',
--     'notification_scheduler_base_url'
--   );
--
--   SELECT vault.create_secret(
--     'SEU_CRON_SCHEDULER_TOKEN',
--     'cron_scheduler_token'
--   );
--
-- O CRON_SCHEDULER_TOKEN deve ser o mesmo valor definido nos secrets
-- da Edge Function notification-scheduler (CRON_SCHEDULER_TOKEN).

-- Garantir extensões necessárias (já habilitadas no Supabase por padrão)
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Remover job existente (para migração idempotente)
DO $$
BEGIN
  PERFORM cron.unschedule('notification-scheduler-every-15min');
EXCEPTION
  WHEN OTHERS THEN NULL; -- ignora se job não existir
END
$$;

-- Agendar execução a cada 15 minutos
SELECT cron.schedule(
  'notification-scheduler-every-15min',
  '*/15 * * * *',
  $$
  SELECT net.http_post(
    url := (
      SELECT decrypted_secret
      FROM vault.decrypted_secrets
      WHERE name = 'notification_scheduler_base_url'
      LIMIT 1
    ) || '/functions/v1/notification-scheduler',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-scheduler-token', (
        SELECT decrypted_secret
        FROM vault.decrypted_secrets
        WHERE name = 'cron_scheduler_token'
        LIMIT 1
      )
    ),
    body := '{}'::jsonb
  ) AS request_id;
  $$
);
