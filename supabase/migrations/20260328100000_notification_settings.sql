CREATE TABLE public.notification_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enabled BOOLEAN NOT NULL DEFAULT true,
  channels TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  service TEXT NOT NULL DEFAULT 'agenda' CHECK (service IN ('agenda', 'financeiro')),
  message TEXT NOT NULL DEFAULT '',
  media_url TEXT,
  timing TEXT NOT NULL DEFAULT 'before' CHECK (timing IN ('before', 'after')),
  hours INTEGER NOT NULL DEFAULT 1 CHECK (hours >= 0),
  version INTEGER NOT NULL DEFAULT 1,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.notification_settings_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_settings_id UUID NOT NULL REFERENCES public.notification_settings(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  enabled BOOLEAN NOT NULL,
  channels TEXT[] NOT NULL,
  service TEXT NOT NULL,
  message TEXT NOT NULL,
  media_url TEXT,
  timing TEXT NOT NULL,
  hours INTEGER NOT NULL,
  changed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.notification_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_settings_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view notification_settings"
  ON public.notification_settings
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins and managers can manage notification_settings"
  ON public.notification_settings
  FOR ALL
  TO authenticated
  USING (public.is_admin_or_manager(auth.uid()))
  WITH CHECK (public.is_admin_or_manager(auth.uid()));

CREATE POLICY "Authenticated users can view notification_settings_history"
  ON public.notification_settings_history
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins and managers can insert notification_settings_history"
  ON public.notification_settings_history
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin_or_manager(auth.uid()));

CREATE OR REPLACE FUNCTION public.log_notification_settings_change()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.notification_settings_history (
      notification_settings_id,
      version,
      enabled,
      channels,
      service,
      message,
      media_url,
      timing,
      hours,
      changed_by
    )
    VALUES (
      NEW.id,
      NEW.version,
      NEW.enabled,
      NEW.channels,
      NEW.service,
      NEW.message,
      NEW.media_url,
      NEW.timing,
      NEW.hours,
      auth.uid()
    );
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF (
      NEW.enabled IS DISTINCT FROM OLD.enabled OR
      NEW.channels IS DISTINCT FROM OLD.channels OR
      NEW.service IS DISTINCT FROM OLD.service OR
      NEW.message IS DISTINCT FROM OLD.message OR
      NEW.media_url IS DISTINCT FROM OLD.media_url OR
      NEW.timing IS DISTINCT FROM OLD.timing OR
      NEW.hours IS DISTINCT FROM OLD.hours
    ) THEN
      NEW.version = OLD.version + 1;

      INSERT INTO public.notification_settings_history (
        notification_settings_id,
        version,
        enabled,
        channels,
        service,
        message,
        media_url,
        timing,
        hours,
        changed_by
      )
      VALUES (
        NEW.id,
        NEW.version,
        NEW.enabled,
        NEW.channels,
        NEW.service,
        NEW.message,
        NEW.media_url,
        NEW.timing,
        NEW.hours,
        auth.uid()
      );
    END IF;

    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER update_notification_settings_updated_at
  BEFORE UPDATE ON public.notification_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER log_notification_settings_insert
  AFTER INSERT ON public.notification_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.log_notification_settings_change();

CREATE TRIGGER log_notification_settings_update
  BEFORE UPDATE ON public.notification_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.log_notification_settings_change();
