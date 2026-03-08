import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { recordSystemAuditLog } from '@/services/systemAuditLog';

export interface MedicalRecord {
  id: string;
  patient_id: string;
  diagnosis: string;
  notes: string | null;
  status: 'starting' | 'in_treatment' | 'completed' | 'paused';
  sessions: number;
  next_appointment: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  // Joined patient data
  patient?: {
    name: string;
    id: string;
  };
}

export const useMedicalRecords = () => {
  const { toast } = useToast();
  const [medicalRecords, setMedicalRecords] = useState<MedicalRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMedicalRecords = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const { data, error: fetchError } = await supabase
        .from('medical_records')
        .select(`
          *,
          patient:patients(id, name)
        `)
        .order('updated_at', { ascending: false });
      
      if (fetchError) throw fetchError;
      
      setMedicalRecords(data || []);
    } catch (err: any) {
      console.error('Error fetching medical records:', err);
      setError(err.message);
      toast({
        title: "Erro ao carregar prontuários",
        description: err.message,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchMedicalRecords();
  }, [fetchMedicalRecords]);

  const addMedicalRecord = async (recordData: Omit<MedicalRecord, 'id' | 'created_at' | 'updated_at' | 'patient'>) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error: insertError } = await supabase
        .from('medical_records')
        .insert([{ ...recordData, created_by: user?.id }])
        .select(`
          *,
          patient:patients(id, name)
        `)
        .single();
      
      if (insertError) throw insertError;
      
      setMedicalRecords(prev => [data, ...prev]);

      await recordSystemAuditLog({
        menuGroup: "NAVEGACAO",
        menu: "Prontuário",
        screen: "Prontuários",
        action: "create",
        entityType: "medical_record",
        entityId: data.id,
        message: "Prontuário criado.",
        metadata: {
          patientId: data.patient_id,
          patientName: data.patient?.name || null,
          status: data.status,
        },
      });
      
      toast({
        title: "Prontuário criado",
        description: "O prontuário foi criado com sucesso.",
      });
      
      return data;
    } catch (err: any) {
      console.error('Error adding medical record:', err);
      toast({
        title: "Erro ao criar prontuário",
        description: err.message,
        variant: "destructive"
      });
      throw err;
    }
  };

  const updateMedicalRecord = async (id: string, updates: Partial<MedicalRecord>) => {
    try {
      const previous = medicalRecords.find((r) => r.id === id) || null;
      // Remove patient from updates as it's a joined field
      const { patient, ...updateData } = updates;
      
      const { data, error: updateError } = await supabase
        .from('medical_records')
        .update(updateData)
        .eq('id', id)
        .select(`
          *,
          patient:patients(id, name)
        `)
        .single();
      
      if (updateError) throw updateError;
      
      setMedicalRecords(prev => prev.map(r => r.id === id ? data : r));

      await recordSystemAuditLog({
        menuGroup: "NAVEGACAO",
        menu: "Prontuário",
        screen: "Prontuários",
        action: "update",
        entityType: "medical_record",
        entityId: id,
        message: "Prontuário atualizado.",
        metadata: {
          patientId: data.patient_id,
          patientName: data.patient?.name || previous?.patient?.name || null,
          updatedFields: Object.keys(updateData),
          previousStatus: previous?.status || null,
          newStatus: data.status,
        },
      });
      
      toast({
        title: "Prontuário atualizado",
        description: "As informações foram atualizadas com sucesso.",
      });
      
      return data;
    } catch (err: any) {
      console.error('Error updating medical record:', err);
      toast({
        title: "Erro ao atualizar prontuário",
        description: err.message,
        variant: "destructive"
      });
      throw err;
    }
  };

  const deleteMedicalRecord = async (id: string) => {
    try {
      const previous = medicalRecords.find((r) => r.id === id) || null;
      const { error: deleteError } = await supabase
        .from('medical_records')
        .delete()
        .eq('id', id);
      
      if (deleteError) throw deleteError;
      
      setMedicalRecords(prev => prev.filter(r => r.id !== id));

      await recordSystemAuditLog({
        menuGroup: "NAVEGACAO",
        menu: "Prontuário",
        screen: "Prontuários",
        action: "delete",
        entityType: "medical_record",
        entityId: id,
        message: "Prontuário removido.",
        metadata: {
          patientId: previous?.patient_id || null,
          patientName: previous?.patient?.name || null,
          status: previous?.status || null,
        },
      });
      
      toast({
        title: "Prontuário removido",
        description: "O prontuário foi removido do sistema.",
      });
    } catch (err: any) {
      console.error('Error deleting medical record:', err);
      toast({
        title: "Erro ao remover prontuário",
        description: err.message,
        variant: "destructive"
      });
      throw err;
    }
  };

  return {
    medicalRecords,
    isLoading,
    error,
    fetchMedicalRecords,
    addMedicalRecord,
    updateMedicalRecord,
    deleteMedicalRecord
  };
};
