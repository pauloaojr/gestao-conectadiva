import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export type PlanHistoryAction = 'added' | 'changed' | 'removed';

export interface PatientPlanHistoryEntry {
  id: string;
  patient_id: string;
  plan_id: string | null;
  previous_plan_id: string | null;
  action: PlanHistoryAction;
  created_at: string;
  created_by: string | null;
  patient?: { id: string; name: string };
  plan?: { id: string; name: string } | null;
  previous_plan?: { id: string; name: string } | null;
}

export interface UsePatientPlanHistoryFilters {
  patientId?: string;
  year?: number;
  month?: number;
}

/**
 * Histórico de alterações de plano do paciente.
 * Use para relatórios por paciente, por mês e por ano.
 */
export const usePatientPlanHistory = (filters: UsePatientPlanHistoryFilters = {}) => {
  const { toast } = useToast();
  const [history, setHistory] = useState<PatientPlanHistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHistory = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      let query = supabase
        .from('patient_plan_history')
        .select(`
          id,
          patient_id,
          plan_id,
          previous_plan_id,
          action,
          created_at,
          created_by,
          patient:patients(id, name)
        `)
        .order('created_at', { ascending: false });

      if (filters.patientId) {
        query = query.eq('patient_id', filters.patientId);
      }

      if (filters.year !== undefined) {
        const start = filters.month !== undefined
          ? new Date(filters.year, filters.month - 1, 1)
          : new Date(filters.year, 0, 1);
        const end = filters.month !== undefined
          ? new Date(filters.year, filters.month, 0, 23, 59, 59, 999)
          : new Date(filters.year, 11, 31, 23, 59, 59, 999);
        query = query
          .gte('created_at', start.toISOString())
          .lte('created_at', end.toISOString());
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      setHistory((data || []) as PatientPlanHistoryEntry[]);
    } catch (err: any) {
      console.error('Error fetching patient plan history:', err);
      setError(err.message);
      toast({
        title: 'Erro ao carregar histórico de planos',
        description: err.message,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast, filters.patientId, filters.year, filters.month]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  return { history, isLoading, error, refetch: fetchHistory };
};
