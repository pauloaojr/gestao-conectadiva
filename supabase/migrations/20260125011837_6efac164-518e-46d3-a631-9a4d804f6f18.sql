
-- Fix security warnings by adding proper search_path to functions
-- and adjusting overly permissive policies

-- 1. Fix handle_new_user function search_path
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
    -- Create profile for new user
    INSERT INTO public.profiles (user_id, name, email)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
        NEW.email
    );
    
    -- Assign default 'user' role
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'user');
    
    RETURN NEW;
END;
$$;

-- Recreate trigger
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 2. Fix update_updated_at_column function
DROP FUNCTION IF EXISTS public.update_updated_at_column() CASCADE;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

-- Recreate triggers
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_establishments_updated_at BEFORE UPDATE ON public.establishments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_patients_updated_at BEFORE UPDATE ON public.patients FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_medical_records_updated_at BEFORE UPDATE ON public.medical_records FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_services_updated_at BEFORE UPDATE ON public.services FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_time_slots_updated_at BEFORE UPDATE ON public.time_slots FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_appointments_updated_at BEFORE UPDATE ON public.appointments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Drop and recreate overly permissive policies with proper checks

-- Patients: require created_by for inserts
DROP POLICY IF EXISTS "Authenticated users can insert patients" ON public.patients;
CREATE POLICY "Authenticated users can insert patients" ON public.patients 
FOR INSERT TO authenticated 
WITH CHECK (created_by = auth.uid());

-- Medical records: require created_by for inserts, creator or admin can update
DROP POLICY IF EXISTS "Authenticated users can insert medical records" ON public.medical_records;
CREATE POLICY "Authenticated users can insert medical records" ON public.medical_records 
FOR INSERT TO authenticated 
WITH CHECK (created_by = auth.uid());

DROP POLICY IF EXISTS "Authenticated users can update medical records" ON public.medical_records;
CREATE POLICY "Users can update own medical records or admin" ON public.medical_records 
FOR UPDATE TO authenticated 
USING (created_by = auth.uid() OR public.is_admin_or_manager(auth.uid()));

-- Appointments: require created_by for inserts
DROP POLICY IF EXISTS "Authenticated users can insert appointments" ON public.appointments;
CREATE POLICY "Authenticated users can insert appointments" ON public.appointments 
FOR INSERT TO authenticated 
WITH CHECK (created_by = auth.uid());

DROP POLICY IF EXISTS "Authenticated users can update appointments" ON public.appointments;
CREATE POLICY "Users can update own appointments or admin" ON public.appointments 
FOR UPDATE TO authenticated 
USING (created_by = auth.uid() OR public.is_admin_or_manager(auth.uid()));
