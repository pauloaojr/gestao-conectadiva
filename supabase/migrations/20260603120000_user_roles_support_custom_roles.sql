-- Permitir que user_roles.role armazene 'admin'|'manager'|'user' OU o UUID de custom_roles (função personalizada)
-- Assim as funções cadastradas na aba Funções podem ser atribuídas na aba Usuários.

-- 1. Alterar coluna role de app_role para TEXT (mantém valores atuais como 'admin', 'manager', 'user')
ALTER TABLE public.user_roles
  ALTER COLUMN role TYPE TEXT USING role::text;

-- 2. Garantir default para novos registros
ALTER TABLE public.user_roles
  ALTER COLUMN role SET DEFAULT 'user';

-- 3. Remover a função antiga has_role(uuid, app_role) para evitar "operator does not exist: text = app_role"
--    (em PostgreSQL, CREATE OR REPLACE com assinatura diferente cria overload; a política RLS pode chamar a versão antiga)
DROP FUNCTION IF EXISTS public.has_role(UUID, public.app_role);

-- 4. Criar has_role para aceitar TEXT (compatível com RLS: has_role(uid, 'admin'))
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- 5. is_admin_or_manager continua funcionando (role IN ('admin', 'manager') com texto)
-- Nenhuma alteração necessária na função.
