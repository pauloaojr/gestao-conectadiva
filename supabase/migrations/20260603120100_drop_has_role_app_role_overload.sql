-- Corrige o erro "operator does not exist: text = app_role" ao acessar user_roles.
-- As políticas RLS dependem de has_role(uuid, app_role). Precisamos:
-- 1) Remover as políticas que usam has_role
-- 2) Dropar a função antiga has_role(uuid, app_role)
-- 3) Recriar as políticas (passarão a usar has_role(uuid, text) que já existe)

-- 1. Remover políticas que dependem de has_role(uuid, app_role)
DROP POLICY IF EXISTS "Admins can manage all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can manage all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can delete patients" ON public.patients;
DROP POLICY IF EXISTS "Admins can delete medical records" ON public.medical_records;
DROP POLICY IF EXISTS "Admins can delete appointments" ON public.appointments;
DROP POLICY IF EXISTS "Admins can manage custom roles" ON public.custom_roles;
DROP POLICY IF EXISTS "Admins can delete prescriptions" ON public.prescriptions;

-- 2. Remover a overload antiga para que apenas has_role(uuid, text) seja usada
DROP FUNCTION IF EXISTS public.has_role(UUID, public.app_role);

-- 3. Recriar as políticas (agora resolvem para has_role(uuid, text))
CREATE POLICY "Admins can manage all roles" ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage all profiles" ON public.profiles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete patients" ON public.patients FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete medical records" ON public.medical_records FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete appointments" ON public.appointments FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage custom roles" ON public.custom_roles FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete prescriptions" ON public.prescriptions FOR DELETE USING (public.has_role(auth.uid(), 'admin'));
