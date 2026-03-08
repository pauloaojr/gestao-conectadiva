import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { recordSystemAuditLog } from '@/services/systemAuditLog';

export interface TimeSlot {
  id: string;
  time: string;
  days: string[];
  is_available: boolean;
  created_at: string;
  updated_at: string;
}

export interface ScheduleAssignment {
  id: string;
  time_slot_id: string;
  attendant_id: string;
  attendant_name: string;
  assigned_at: string;
}

export const useSupabaseSchedule = () => {
  const { toast } = useToast();
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [assignments, setAssignments] = useState<ScheduleAssignment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const normalizeForAudit = useCallback((value: unknown): unknown => {
    if (value === undefined || value === null) return null;
    if (typeof value === 'string') {
      const trimmed = value.trim();
      return trimmed === '' ? null : trimmed;
    }
    return value;
  }, []);

  const isEquivalentForAudit = useCallback(
    (a: unknown, b: unknown): boolean =>
      JSON.stringify(normalizeForAudit(a)) === JSON.stringify(normalizeForAudit(b)),
    [normalizeForAudit]
  );

  const fetchSchedule = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const [slotsResult, assignmentsResult] = await Promise.all([
        supabase.from('time_slots').select('*').order('time', { ascending: true }),
        supabase.from('schedule_assignments').select('*')
      ]);
      
      if (slotsResult.error) throw slotsResult.error;
      if (assignmentsResult.error) throw assignmentsResult.error;
      
      setTimeSlots(slotsResult.data || []);
      setAssignments(assignmentsResult.data || []);
    } catch (err: any) {
      console.error('Error fetching schedule:', err);
      setError(err.message);
      toast({
        title: "Erro ao carregar horários",
        description: err.message,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchSchedule();
  }, [fetchSchedule]);

  const addTimeSlot = async (slotData: Omit<TimeSlot, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const { data, error: insertError } = await supabase
        .from('time_slots')
        .insert([slotData])
        .select()
        .single();
      
      if (insertError) throw insertError;
      
      setTimeSlots(prev => [...prev, data].sort((a, b) => a.time.localeCompare(b.time)));

      await recordSystemAuditLog({
        menuGroup: 'GESTAO_TECNICA',
        menu: 'Horários',
        screen: 'Horários',
        action: 'create',
        entityType: 'time_slot',
        entityId: data.id,
        message: 'Horário criado.',
        metadata: {
          time: data.time,
          days: data.days,
          isAvailable: data.is_available,
        },
      });
      
      toast({
        title: "Horário adicionado",
        description: `Horário ${data.time} foi adicionado com sucesso.`,
      });
      
      return data;
    } catch (err: any) {
      console.error('Error adding time slot:', err);
      toast({
        title: "Erro ao adicionar horário",
        description: err.message,
        variant: "destructive"
      });
      throw err;
    }
  };

  const updateTimeSlot = async (id: string, updates: Partial<TimeSlot>) => {
    try {
      const previous = timeSlots.find((slot) => slot.id === id) ?? null;
      const changedFields = Object.entries(updates)
        .filter(([key, nextValue]) => {
          if (nextValue === undefined) return false;
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
        .from('time_slots')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (updateError) throw updateError;
      
      setTimeSlots(prev => prev.map(s => s.id === id ? data : s));

      await recordSystemAuditLog({
        menuGroup: 'GESTAO_TECNICA',
        menu: 'Horários',
        screen: 'Horários',
        action: 'update',
        entityType: 'time_slot',
        entityId: id,
        message: 'Horário atualizado.',
        metadata: {
          time: data.time,
          updatedFields: changedFields,
          changedValues,
        },
      });
      
      toast({
        title: "Horário atualizado",
        description: "As informações foram atualizadas com sucesso.",
      });
      
      return data;
    } catch (err: any) {
      console.error('Error updating time slot:', err);
      toast({
        title: "Erro ao atualizar horário",
        description: err.message,
        variant: "destructive"
      });
      throw err;
    }
  };

  const deleteTimeSlot = async (id: string) => {
    try {
      const previous = timeSlots.find((slot) => slot.id === id) ?? null;
      const { error: deleteError } = await supabase
        .from('time_slots')
        .delete()
        .eq('id', id);
      
      if (deleteError) throw deleteError;
      
      setTimeSlots(prev => prev.filter(s => s.id !== id));

      await recordSystemAuditLog({
        menuGroup: 'GESTAO_TECNICA',
        menu: 'Horários',
        screen: 'Horários',
        action: 'delete',
        entityType: 'time_slot',
        entityId: id,
        message: 'Horário excluído.',
        metadata: {
          time: previous?.time ?? null,
          days: previous?.days ?? [],
          isAvailable: previous?.is_available ?? null,
        },
      });
      
      toast({
        title: "Horário removido",
        description: "O horário foi removido do sistema.",
      });
    } catch (err: any) {
      console.error('Error deleting time slot:', err);
      toast({
        title: "Erro ao remover horário",
        description: err.message,
        variant: "destructive"
      });
      throw err;
    }
  };

  const assignTimeSlot = async (slotId: string, attendantId: string, attendantName: string) => {
    try {
      const slot = timeSlots.find((item) => item.id === slotId) ?? null;
      const { data, error: insertError } = await supabase
        .from('schedule_assignments')
        .insert([{ time_slot_id: slotId, attendant_id: attendantId, attendant_name: attendantName }])
        .select()
        .single();
      
      if (insertError) throw insertError;
      
      setAssignments(prev => [...prev, data]);

      await recordSystemAuditLog({
        menuGroup: 'GESTAO_TECNICA',
        menu: 'Horários',
        screen: 'Horários',
        action: 'create',
        entityType: 'schedule_assignment',
        entityId: data.id,
        message: 'Horário atribuído ao atendente.',
        metadata: {
          attendantId,
          attendantName,
          timeSlotId: slotId,
          time: slot?.time ?? null,
          days: slot?.days ?? [],
        },
      });
      
      toast({
        title: "Horário atribuído",
        description: `Horário atribuído a ${attendantName}.`,
      });
      
      return data;
    } catch (err: any) {
      console.error('Error assigning time slot:', err);
      toast({
        title: "Erro ao atribuir horário",
        description: err.message,
        variant: "destructive"
      });
      throw err;
    }
  };

  const removeAssignment = async (assignmentId: string) => {
    try {
      const previous = assignments.find((item) => item.id === assignmentId) ?? null;
      const slot = previous
        ? timeSlots.find((item) => item.id === previous.time_slot_id) ?? null
        : null;
      const { error: deleteError } = await supabase
        .from('schedule_assignments')
        .delete()
        .eq('id', assignmentId);
      
      if (deleteError) throw deleteError;
      
      setAssignments(prev => prev.filter(a => a.id !== assignmentId));

      await recordSystemAuditLog({
        menuGroup: 'GESTAO_TECNICA',
        menu: 'Horários',
        screen: 'Horários',
        action: 'delete',
        entityType: 'schedule_assignment',
        entityId: assignmentId,
        message: 'Atribuição de horário removida.',
        metadata: {
          attendantId: previous?.attendant_id ?? null,
          attendantName: previous?.attendant_name ?? null,
          timeSlotId: previous?.time_slot_id ?? null,
          time: slot?.time ?? null,
          days: slot?.days ?? [],
        },
      });
      
      toast({
        title: "Atribuição removida",
        description: "A atribuição foi removida com sucesso.",
      });
    } catch (err: any) {
      console.error('Error removing assignment:', err);
      toast({
        title: "Erro ao remover atribuição",
        description: err.message,
        variant: "destructive"
      });
      throw err;
    }
  };

  return {
    timeSlots,
    assignments,
    isLoading,
    error,
    fetchSchedule,
    addTimeSlot,
    updateTimeSlot,
    deleteTimeSlot,
    assignTimeSlot,
    removeAssignment
  };
};
