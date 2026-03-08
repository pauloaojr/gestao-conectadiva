import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Prescription, Medication } from '@/types/prescription';
import { Json } from '@/integrations/supabase/types';
import { recordSystemAuditLog } from '@/services/systemAuditLog';

export const usePrescriptions = () => {
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchPrescriptions = useCallback(async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('prescriptions')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Parse medications from JSONB
      const parsedData = (data || []).map(item => ({
        ...item,
        medications: (item.medications as unknown as Medication[]) || []
      }));

      setPrescriptions(parsedData);
      setError(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao carregar receitas';
      setError(errorMessage);
      toast({
        title: "Erro",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchPrescriptions();
  }, [fetchPrescriptions]);

  const addPrescription = async (prescriptionData: Omit<Prescription, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('prescriptions')
        .insert([{
          ...prescriptionData,
          medications: prescriptionData.medications as unknown as Json,
          created_by: user?.id
        }])
        .select()
        .single();

      if (error) throw error;

      const newPrescription = {
        ...data,
        medications: (data.medications as unknown as Medication[]) || []
      };

      setPrescriptions(prev => [newPrescription, ...prev]);

      await recordSystemAuditLog({
        menuGroup: "NAVEGACAO",
        menu: "Receituário",
        screen: "Receituário",
        action: "create",
        entityType: "prescription",
        entityId: newPrescription.id,
        message: "Receita criada.",
        metadata: {
          patientId: newPrescription.patient_id,
          patientName: newPrescription.patient_name,
          attendantId: newPrescription.attendant_id,
          attendantName: newPrescription.attendant_name,
          diagnosis: newPrescription.diagnosis,
          medicationsCount: newPrescription.medications.length,
        },
      });

      toast({
        title: "Sucesso",
        description: "Receita criada com sucesso!",
      });
      return newPrescription;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao criar receita';
      toast({
        title: "Erro",
        description: errorMessage,
        variant: "destructive",
      });
      throw err;
    }
  };

  const updatePrescription = async (id: string, updates: Partial<Prescription>) => {
    try {
      const previous = prescriptions.find((p) => p.id === id) || null;
      const normalizeForAudit = (value: unknown): unknown => {
        if (value === undefined || value === null) return null;
        if (typeof value === 'string') {
          const trimmed = value.trim();
          return trimmed === '' ? null : trimmed;
        }
        return value;
      };
      const isEquivalentForAudit = (a: unknown, b: unknown): boolean => {
        const normalizedA = normalizeForAudit(a);
        const normalizedB = normalizeForAudit(b);
        return JSON.stringify(normalizedA) === JSON.stringify(normalizedB);
      };

      const updateData = {
        ...updates,
        medications: updates.medications ? (updates.medications as unknown as Json) : undefined
      };

      const changedFields = Object.entries(updates)
        .filter(([key, nextValue]) => {
          const previousValue = previous ? (previous as unknown as Record<string, unknown>)[key] : undefined;
          return !isEquivalentForAudit(previousValue, nextValue);
        })
        .map(([key]) => key);

      const changedValues = changedFields.map((field) => {
        const previousValue = previous ? (previous as unknown as Record<string, unknown>)[field] : undefined;
        const nextValue = (updates as unknown as Record<string, unknown>)[field];
        return {
          field,
          before: normalizeForAudit(previousValue),
          after: normalizeForAudit(nextValue),
        };
      });

      const { data, error } = await supabase
        .from('prescriptions')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      const updatedPrescription = {
        ...data,
        medications: (data.medications as unknown as Medication[]) || []
      };

      setPrescriptions(prev => 
        prev.map(p => p.id === id ? updatedPrescription : p)
      );

      await recordSystemAuditLog({
        menuGroup: "NAVEGACAO",
        menu: "Receituário",
        screen: "Receituário",
        action: "update",
        entityType: "prescription",
        entityId: id,
        message: "Receita atualizada.",
        metadata: {
          patientId: updatedPrescription.patient_id,
          patientName: updatedPrescription.patient_name,
          attendantId: updatedPrescription.attendant_id,
          attendantName: updatedPrescription.attendant_name,
          updatedFields: changedFields,
          changedValues,
        },
      });

      toast({
        title: "Sucesso",
        description: "Receita atualizada com sucesso!",
      });
      return updatedPrescription;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao atualizar receita';
      toast({
        title: "Erro",
        description: errorMessage,
        variant: "destructive",
      });
      throw err;
    }
  };

  const deletePrescription = async (id: string) => {
    try {
      const previous = prescriptions.find((p) => p.id === id) || null;
      const { error } = await supabase
        .from('prescriptions')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setPrescriptions(prev => prev.filter(p => p.id !== id));

      await recordSystemAuditLog({
        menuGroup: "NAVEGACAO",
        menu: "Receituário",
        screen: "Receituário",
        action: "delete",
        entityType: "prescription",
        entityId: id,
        message: "Receita excluída.",
        metadata: {
          patientId: previous?.patient_id || null,
          patientName: previous?.patient_name || null,
          attendantId: previous?.attendant_id || null,
          attendantName: previous?.attendant_name || null,
          diagnosis: previous?.diagnosis || null,
          medicationsCount: previous?.medications?.length || 0,
        },
      });

      toast({
        title: "Sucesso",
        description: "Receita excluída com sucesso!",
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao excluir receita';
      toast({
        title: "Erro",
        description: errorMessage,
        variant: "destructive",
      });
      throw err;
    }
  };

  return {
    prescriptions,
    isLoading,
    error,
    fetchPrescriptions,
    addPrescription,
    updatePrescription,
    deletePrescription
  };
};
