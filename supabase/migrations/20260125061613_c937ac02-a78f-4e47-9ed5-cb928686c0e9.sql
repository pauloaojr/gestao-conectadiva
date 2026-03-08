-- Criar tabela de personalização
CREATE TABLE public.customization (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  app_name TEXT NOT NULL DEFAULT 'Clinica Pro',
  app_subtitle TEXT DEFAULT 'Sistema de Gestão Médica',
  logo_url TEXT,
  primary_color TEXT DEFAULT '#3B82F6',
  sidebar_style TEXT DEFAULT 'default',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.customization ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Authenticated users can view customization"
ON public.customization
FOR SELECT
USING (true);

CREATE POLICY "Admins and managers can manage customization"
ON public.customization
FOR ALL
USING (is_admin_or_manager(auth.uid()));

-- Trigger para updated_at
CREATE TRIGGER update_customization_updated_at
BEFORE UPDATE ON public.customization
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Inserir registro padrão
INSERT INTO public.customization (app_name, app_subtitle)
VALUES ('Clinica Pro - Gestão Profissional', 'Sistema de Gestão Médica');