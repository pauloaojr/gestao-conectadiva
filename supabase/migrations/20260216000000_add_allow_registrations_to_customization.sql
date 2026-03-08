-- Permitir novos cadastros: controlado pela empresa no banco (não depende de localStorage)
ALTER TABLE public.customization
ADD COLUMN IF NOT EXISTS allow_registrations BOOLEAN NOT NULL DEFAULT true;

COMMENT ON COLUMN public.customization.allow_registrations IS 'Se false, a tela de login não exibe a aba de cadastro de novos usuários.';

-- Permitir leitura pública da customization para a tela de login (anon precisa de allow_registrations e logo)
CREATE POLICY "Anyone can view customization (login page)"
ON public.customization
FOR SELECT
TO anon
USING (true);
