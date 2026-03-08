-- Add Aniversário service and send_time for "hora do envio" (HH:mm)
ALTER TABLE public.notification_settings
  ADD COLUMN IF NOT EXISTS send_time TEXT;

ALTER TABLE public.notification_settings_history
  ADD COLUMN IF NOT EXISTS send_time TEXT;

-- Allow service 'aniversario' and event_key 'aniversario'
ALTER TABLE public.notification_settings
  DROP CONSTRAINT IF EXISTS notification_settings_service_event_key_check;

ALTER TABLE public.notification_settings
  ADD CONSTRAINT notification_settings_service_event_key_check
  CHECK (
    (service = 'agenda' AND event_key IN ('agendamento_criado', 'agendamento_confirmado', 'agendamento_cancelado', 'lembrete_consulta')) OR
    (service = 'financeiro' AND event_key IN ('conta_criada', 'conta_vencendo', 'conta_vencida', 'pagamento_confirmado')) OR
    (service = 'aniversario' AND event_key = 'aniversario')
  );

-- Extend service check to allow 'aniversario'
ALTER TABLE public.notification_settings
  DROP CONSTRAINT IF EXISTS notification_settings_service_check;

ALTER TABLE public.notification_settings
  ADD CONSTRAINT notification_settings_service_check
  CHECK (service IN ('agenda', 'financeiro', 'aniversario'));

-- Trigger: include send_time in history and version bump when send_time changes
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
      recipient_target,
      event_key,
      message,
      media_url,
      timing,
      hours,
      sort_order,
      send_time,
      changed_by
    )
    VALUES (
      NEW.id,
      NEW.version,
      NEW.name,
      NEW.enabled,
      NEW.channels,
      NEW.service,
      NEW.recipient_target,
      NEW.event_key,
      NEW.message,
      NEW.media_url,
      NEW.timing,
      NEW.hours,
      NEW.sort_order,
      NEW.send_time,
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
      NEW.recipient_target IS DISTINCT FROM OLD.recipient_target OR
      NEW.event_key IS DISTINCT FROM OLD.event_key OR
      NEW.message IS DISTINCT FROM OLD.message OR
      NEW.media_url IS DISTINCT FROM OLD.media_url OR
      NEW.timing IS DISTINCT FROM OLD.timing OR
      NEW.hours IS DISTINCT FROM OLD.hours OR
      NEW.sort_order IS DISTINCT FROM OLD.sort_order OR
      NEW.send_time IS DISTINCT FROM OLD.send_time
    ) THEN
      IF (
        NEW.name IS DISTINCT FROM OLD.name OR
        NEW.channels IS DISTINCT FROM OLD.channels OR
        NEW.service IS DISTINCT FROM OLD.service OR
        NEW.recipient_target IS DISTINCT FROM OLD.recipient_target OR
        NEW.event_key IS DISTINCT FROM OLD.event_key OR
        NEW.message IS DISTINCT FROM OLD.message OR
        NEW.media_url IS DISTINCT FROM OLD.media_url OR
        NEW.timing IS DISTINCT FROM OLD.timing OR
        NEW.hours IS DISTINCT FROM OLD.hours OR
        NEW.sort_order IS DISTINCT FROM OLD.sort_order OR
        NEW.send_time IS DISTINCT FROM OLD.send_time
      ) THEN
        NEW.version = OLD.version + 1;
      END IF;

      INSERT INTO public.notification_settings_history (
        notification_settings_id,
        version,
        name,
        enabled,
        channels,
        service,
        recipient_target,
        event_key,
        message,
        media_url,
        timing,
        hours,
        sort_order,
        send_time,
        changed_by
      )
      VALUES (
        NEW.id,
        NEW.version,
        NEW.name,
        NEW.enabled,
        NEW.channels,
        NEW.service,
        NEW.recipient_target,
        NEW.event_key,
        NEW.message,
        NEW.media_url,
        NEW.timing,
        NEW.hours,
        NEW.sort_order,
        NEW.send_time,
        auth.uid()
      );
    END IF;

    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$;
