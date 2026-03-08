ALTER TABLE public.notification_settings
  ADD COLUMN IF NOT EXISTS recipient_target TEXT NOT NULL DEFAULT 'patient';

ALTER TABLE public.notification_settings_history
  ADD COLUMN IF NOT EXISTS recipient_target TEXT NOT NULL DEFAULT 'patient';

UPDATE public.notification_settings
SET recipient_target = 'patient'
WHERE recipient_target IS NULL
   OR recipient_target NOT IN ('patient', 'professional');

UPDATE public.notification_settings_history
SET recipient_target = 'patient'
WHERE recipient_target IS NULL
   OR recipient_target NOT IN ('patient', 'professional');

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'notification_settings_recipient_target_check'
  ) THEN
    ALTER TABLE public.notification_settings
      ADD CONSTRAINT notification_settings_recipient_target_check
      CHECK (recipient_target IN ('patient', 'professional'));
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'notification_settings_history_recipient_target_check'
  ) THEN
    ALTER TABLE public.notification_settings_history
      ADD CONSTRAINT notification_settings_history_recipient_target_check
      CHECK (recipient_target IN ('patient', 'professional'));
  END IF;
END
$$;

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
        recipient_target,
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
        NEW.recipient_target,
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
