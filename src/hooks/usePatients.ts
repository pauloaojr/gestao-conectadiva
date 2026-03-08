import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { recordSystemAuditLog } from '@/services/systemAuditLog';

export interface Patient {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  cpf: string | null;
  rg: string | null;
  birth_date: string | null;
  gender: string | null;
  profession: string | null;
  marital_status: string | null;
  status: 'active' | 'inactive' | 'pending';
  notes: string | null;
  photo_url: string | null;
  photo_storage_key: string | null;
  document_url: string | null;
  document_storage_key: string | null;
  plan_id: string | null;
  address_cep: string | null;
  address_street: string | null;
  address_number: string | null;
  address_complement: string | null;
  address_neighborhood: string | null;
  address_city: string | null;
  address_state: string | null;
  created_at: string;
  updated_at: string;
}

export const usePatients = () => {
  const { toast } = useToast();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPatients = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const { data, error: fetchError } = await supabase
        .from('patients')
        .select('*')
        .order('name', { ascending: true });
      
      if (fetchError) throw fetchError;
      
      setPatients(data || []);
    } catch (err: any) {
      console.error('Error fetching patients:', err);
      setError(err.message);
      toast({
        title: "Erro ao carregar pacientes",
        description: err.message,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchPatients();
  }, [fetchPatients]);

  const recordPlanHistory = async (
    patientId: string,
    action: 'added' | 'changed' | 'removed',
    planId: string | null,
    previousPlanId: string | null
  ) => {
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from('patient_plan_history').insert({
      patient_id: patientId,
      plan_id: planId,
      previous_plan_id: previousPlanId,
      action,
      created_by: user?.id ?? null
    });
  };

  const addPatient = async (patientData: Omit<Patient, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error: insertError } = await supabase
        .from('patients')
        .insert([{ ...patientData, created_by: user?.id }])
        .select()
        .single();
      
      if (insertError) throw insertError;
      
      if (patientData.plan_id) {
        await recordPlanHistory(data.id, 'added', patientData.plan_id, null);
      }
      
      setPatients(prev => [...prev, data]);

      await recordSystemAuditLog({
        menuGroup: "NAVEGACAO",
        menu: "Paciente",
        screen: "Pacientes",
        action: "create",
        entityType: "patient",
        entityId: data.id,
        message: "Paciente cadastrado.",
        metadata: {
          patientName: data.name,
          hasEmail: Boolean(data.email),
          hasPhone: Boolean(data.phone),
        },
      });
      
      toast({
        title: "Paciente adicionado",
        description: `${data.name} foi adicionado com sucesso.`,
      });
      
      return data;
    } catch (err: any) {
      console.error('Error adding patient:', err);
      toast({
        title: "Erro ao adicionar paciente",
        description: err.message,
        variant: "destructive"
      });
      throw err;
    }
  };

  const updatePatient = async (id: string, updates: Partial<Patient>) => {
    try {
      const previous = patients.find((p) => p.id === id) || null;
      const previousPlanId = updates.plan_id !== undefined ? (patients.find(p => p.id === id)?.plan_id ?? null) : null;
      const newPlanId = updates.plan_id ?? null;
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

      const { data, error: updateError } = await supabase
        .from('patients')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (updateError) throw updateError;

      if (updates.plan_id !== undefined && (previousPlanId !== newPlanId)) {
        const action: 'added' | 'changed' | 'removed' =
          !previousPlanId && newPlanId ? 'added' : previousPlanId && !newPlanId ? 'removed' : 'changed';
        await recordPlanHistory(id, action, newPlanId, previousPlanId);
      }

      setPatients(prev => prev.map(p => p.id === id ? data : p));

      const statusChanged =
        updates.status !== undefined &&
        previous?.status !== undefined &&
        updates.status !== previous.status;

      const isActivation = statusChanged && updates.status === 'active';
      const isDeactivation = statusChanged && updates.status === 'inactive';

      const actionMessage = isActivation
        ? "Paciente ativado."
        : isDeactivation
          ? "Paciente desativado."
          : "Paciente atualizado.";

      await recordSystemAuditLog({
        menuGroup: "NAVEGACAO",
        menu: "Paciente",
        screen: "Pacientes",
        action: "update",
        entityType: "patient",
        entityId: id,
        message: actionMessage,
        metadata: {
          patientName: data.name,
          updatedFields: changedFields,
          changedValues,
          operationType: isActivation
            ? "activate"
            : isDeactivation
              ? "deactivate"
              : "update",
          previousStatus: previous?.status || null,
          newStatus: data.status || null,
        },
      });

      toast({
        title: "Paciente atualizado",
        description: "As informações foram atualizadas com sucesso.",
      });

      return data;
    } catch (err: any) {
      console.error('Error updating patient:', err);
      toast({
        title: "Erro ao atualizar paciente",
        description: err.message,
        variant: "destructive"
      });
      throw err;
    }
  };

  const deletePatient = async (id: string) => {
    try {
      const previous = patients.find((p) => p.id === id) || null;
      const { error: deleteError } = await supabase
        .from('patients')
        .delete()
        .eq('id', id);
      
      if (deleteError) throw deleteError;
      
      setPatients(prev => prev.filter(p => p.id !== id));

      await recordSystemAuditLog({
        menuGroup: "NAVEGACAO",
        menu: "Paciente",
        screen: "Pacientes",
        action: "delete",
        entityType: "patient",
        entityId: id,
        message: "Paciente removido.",
        metadata: {
          patientName: previous?.name || null,
        },
      });
      
      toast({
        title: "Paciente removido",
        description: "O paciente foi removido do sistema.",
      });
    } catch (err: any) {
      console.error('Error deleting patient:', err);
      toast({
        title: "Erro ao remover paciente",
        description: err.message,
        variant: "destructive"
      });
      throw err;
    }
  };

  return {
    patients,
    isLoading,
    error,
    fetchPatients,
    addPatient,
    updatePatient,
    deletePatient
  };
};
