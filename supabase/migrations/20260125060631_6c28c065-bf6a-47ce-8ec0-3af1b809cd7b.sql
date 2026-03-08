-- Create custom_roles table for storing custom role definitions
CREATE TABLE public.custom_roles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL UNIQUE,
    description text,
    permissions jsonb NOT NULL DEFAULT '{
        "dashboard": false,
        "patients": false,
        "medicalRecords": false,
        "schedule": false,
        "reports": false,
        "settings": false,
        "userManagement": false,
        "scheduleManagement": false,
        "serviceManagement": false
    }'::jsonb,
    is_system boolean NOT NULL DEFAULT false,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.custom_roles ENABLE ROW LEVEL SECURITY;

-- Only admins can manage custom roles
CREATE POLICY "Admins can manage custom roles"
ON public.custom_roles
FOR ALL
USING (has_role(auth.uid(), 'admin'));

-- All authenticated users can view custom roles
CREATE POLICY "Authenticated users can view custom roles"
ON public.custom_roles
FOR SELECT
USING (true);

-- Create trigger for updated_at
CREATE TRIGGER update_custom_roles_updated_at
BEFORE UPDATE ON public.custom_roles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default system roles (cannot be deleted)
INSERT INTO public.custom_roles (name, description, permissions, is_system) VALUES
('Administrador', 'Acesso total ao sistema', '{
    "dashboard": true,
    "patients": true,
    "medicalRecords": true,
    "schedule": true,
    "reports": true,
    "settings": true,
    "userManagement": true,
    "scheduleManagement": true,
    "serviceManagement": true
}'::jsonb, true),
('Gerente', 'Acesso operacional sem configurações do sistema', '{
    "dashboard": true,
    "patients": true,
    "medicalRecords": true,
    "schedule": true,
    "reports": true,
    "settings": false,
    "userManagement": false,
    "scheduleManagement": true,
    "serviceManagement": true
}'::jsonb, true),
('Usuário', 'Acesso básico ao sistema', '{
    "dashboard": true,
    "patients": true,
    "medicalRecords": false,
    "schedule": true,
    "reports": false,
    "settings": false,
    "userManagement": false,
    "scheduleManagement": false,
    "serviceManagement": false
}'::jsonb, true);