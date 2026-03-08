-- Create prescriptions table for medical prescriptions
CREATE TABLE public.prescriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID NOT NULL,
  patient_name TEXT NOT NULL,
  attendant_id UUID NOT NULL,
  attendant_name TEXT NOT NULL,
  medications JSONB NOT NULL DEFAULT '[]'::jsonb,
  notes TEXT,
  diagnosis TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.prescriptions ENABLE ROW LEVEL SECURITY;

-- Create policies for prescriptions
CREATE POLICY "Authenticated users can view prescriptions" 
ON public.prescriptions 
FOR SELECT 
USING (true);

CREATE POLICY "Authenticated users can insert prescriptions" 
ON public.prescriptions 
FOR INSERT 
WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can update own prescriptions or admin" 
ON public.prescriptions 
FOR UPDATE 
USING ((created_by = auth.uid()) OR is_admin_or_manager(auth.uid()));

CREATE POLICY "Admins can delete prescriptions" 
ON public.prescriptions 
FOR DELETE 
USING (has_role(auth.uid(), 'admin'));

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_prescriptions_updated_at
BEFORE UPDATE ON public.prescriptions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();