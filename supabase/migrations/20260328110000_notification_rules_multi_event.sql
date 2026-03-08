ALTER TABLE public.notification_settings
  ADD COLUMN IF NOT EXISTS name TEXT NOT NULL DEFAULT 'Nova regra',
  ADD COLUMN IF NOT EXISTS event_key TEXT NOT NULL DEFAULT 'agendamento_criado',
  ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0;

ALTER TABLE public.notification_settings_history
  ADD COLUMN IF NOT EXISTS name TEXT NOT NULL DEFAULT 'Nova regra',
  ADD COLUMN IF NOT EXISTS event_key TEXT NOT NULL DEFAULT 'agendamento_criado',
  ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0;

UPDATE public.notification_settings
SET event_key = CASE
  WHEN service = 'financeiro' THEN 'conta_criada'
  ELSE 'agendamento_criado'
END
WHERE event_key IS NULL
   OR event_key NOT IN (
    'agendamento_criado',
    'agendamento_confirmado',
    'agendamento_cancelado',
    'lembrete_consulta',
    'conta_criada',
    'conta_vencendo',
    'conta_vencida',
    'pagamento_confirmado'
  );

ALTER TABLE public.notification_settings
  ADD CONSTRAINT notification_settings_service_event_key_check
  CHECK (
    (service = 'agenda' AND event_key IN ('agendamento_criado', 'agendamento_confirmado', 'agendamento_cancelado', 'lembrete_consulta')) OR
    (service = 'financeiro' AND event_key IN ('conta_criada', 'conta_vencendo', 'conta_vencida', 'pagamento_confirmado'))
  );

CREATE OR REPLACE FUNCTION public.log_notification_settings_change()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.notification_settings_history (
      notification_settings_id,
      version,
      name,
      enabled,
      channels,
      service,
      event_key,
      message,
      media_url,
      timing,
      hours,
      sort_order,
      changed_by
    )
    VALUES (
      NEW.id,
      NEW.version,
      NEW.name,
      NEW.enabled,
      NEW.channels,
      NEW.service,
      NEW.event_key,
      NEW.message,
      NEW.media_url,
      NEW.timing,
      NEW.hours,
      NEW.sort_order,
      auth.uid()
    );
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF (
      NEW.name IS DISTINCT FROM OLD.name OR
      NEW.enabled IS DISTINCT FROM OLD.enabled OR
      NEW.channels IS DISTINCT FROM OLD.channels OR
      NEW.service IS DISTINCT FROM OLD.service OR
      NEW.event_key IS DISTINCT FROM OLD.event_key OR
      NEW.message IS DISTINCT FROM OLD.message OR
      NEW.media_url IS DISTINCT FROM OLD.media_url OR
      NEW.timing IS DISTINCT FROM OLD.timing OR
      NEW.hours IS DISTINCT FROM OLD.hours OR
      NEW.sort_order IS DISTINCT FROM OLD.sort_order
    ) THEN
      NEW.version = OLD.version + 1;

      INSERT INTO public.notification_settings_history (
        notification_settings_id,
        version,
        name,
        enabled,
        channels,
        service,
        event_key,
        message,
        media_url,
        timing,
        hours,
        sort_order,
        changed_by
      )
      VALUES (
        NEW.id,
        NEW.version,
        NEW.name,
        NEW.enabled,
        NEW.channels,
        NEW.service,
        NEW.event_key,
        NEW.message,
        NEW.media_url,
        NEW.timing,
        NEW.hours,
        NEW.sort_order,
        auth.uid()
      );
    END IF;

    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$;
