export interface Medication {
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions?: string;
}

export interface Prescription {
  id: string;
  patient_id: string;
  patient_name: string;
  attendant_id: string;
  attendant_name: string;
  medications: Medication[];
  notes: string | null;
  diagnosis: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}
