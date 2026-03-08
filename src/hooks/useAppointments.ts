import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { dispatchNotificationEvent } from '@/services/notificationDispatch';
import { recordSystemAuditLog } from '@/services/systemAuditLog';

export interface Appointment {
  id: string;
  patient_id: string | null;
  patient_name: string;
  attendant_id: string | null;
  attendant_name: string | null;
  service_id: string | null;
  service_name: string | null;
  appointment_date: string;
  appointment_time: string;
  duration_minutes: number | null;
  status: string;
  type: string | null;
  notes: string | null;
  amount: number | null;
  revenue_received_at: string | null;
  created_at: string;
  updated_at: string;
}

export const useAppointments = () => {
  const { toast } = useToast();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAppointments = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const { data, error: fetchError } = await supabase
        .from('appointments')
        .select('*')
        .order('appointment_date', { ascending: true })
        .order('appointment_time', { ascending: true });
      
      if (fetchError) throw fetchError;
      
      setAppointments(data || []);
    } catch (err: any) {
      console.error('Error fetching appointments:', err);
      setError(err.message);
      toast({
        title: "Erro ao carregar agendamentos",
        description: err.message,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  const addAppointment = async (appointmentData: Omit<Appointment, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error: insertError } = await supabase
        .from('appointments')
        .insert([{ ...appointmentData, created_by: user?.id }])
        .select()
        .single();
      
      if (insertError) throw insertError;
      
      setAppointments(prev => [...prev, data].sort((a, b) => {
        const dateCompare = a.appointment_date.localeCompare(b.appointment_date);
        if (dateCompare !== 0) return dateCompare;
        return a.appointment_time.localeCompare(b.appointment_time);
      }));
      
      toast({
        title: "Agendamento criado",
        description: `Consulta agendada para ${appointmentData.patient_name}.`,
      });

      await recordSystemAuditLog({
        menuGroup: "NAVEGACAO",
        menu: "Agenda",
        screen: "Agenda",
        action: "create",
        entityType: "appointment",
        entityId: data.id,
        message: "Agendamento criado.",
        metadata: {
          patientId: data.patient_id,
          patientName: data.patient_name,
          attendantId: data.attendant_id,
          attendantName: data.attendant_name,
          appointmentDate: data.appointment_date,
          appointmentTime: data.appointment_time,
          status: data.status,
        },
      });

      await dispatchNotificationEvent({
        service: "agenda",
        eventKey: "agendamento_criado",
        recipient: {
          patientId: data.patient_id,
          attendantId: data.attendant_id,
        },
        context: {
          paciente_nome: data.patient_name,
          profissional_nome: data.attendant_name,
          servico_nome: data.service_name,
          data_agendamento: data.appointment_date,
          hora_agendamento: data.appointment_time,
        },
        dedupeKey: `agenda:agendamento_criado:${data.id}`,
      });
      
      return data;
    } catch (err: any) {
      console.error('Error adding appointment:', err);
      toast({
        title: "Erro ao criar agendamento",
        description: err.message,
        variant: "destructive"
      });
      throw err;
    }
  };

  const updateAppointment = async (id: string, updates: Partial<Appointment>) => {
    try {
      const previousAppointment = appointments.find((a) => a.id === id);
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
          const previousValue = previousAppointment
            ? (previousAppointment as unknown as Record<string, unknown>)[key]
            : undefined;
          return !isEquivalentForAudit(previousValue, nextValue);
        })
        .map(([key]) => key);
      const changedValues = changedFields.map((field) => {
        const previousValue = previousAppointment
          ? (previousAppointment as unknown as Record<string, unknown>)[field]
          : undefined;
        const nextValue = (updates as unknown as Record<string, unknown>)[field];
        return {
          field,
          before: normalizeForAudit(previousValue),
          after: normalizeForAudit(nextValue),
        };
      });
      const { data, error: updateError } = await supabase
        .from('appointments')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (updateError) throw updateError;
      
      setAppointments(prev => prev.map(a => a.id === id ? data : a));
      
      toast({
        title: "Agendamento atualizado",
        description: "As informações foram atualizadas com sucesso.",
      });

      await recordSystemAuditLog({
        menuGroup: "NAVEGACAO",
        menu: "Agenda",
        screen: "Agenda",
        action: "update",
        entityType: "appointment",
        entityId: id,
        message: "Agendamento atualizado.",
        metadata: {
          patientId: data.patient_id,
          patientName: data.patient_name,
          attendantId: data.attendant_id,
          attendantName: data.attendant_name,
          updatedFields: changedFields,
          changedValues,
          previousStatus: previousAppointment?.status || null,
          newStatus: data.status || null,
        },
      });

      const previousStatus = previousAppointment?.status?.toLowerCase() || "";
      const nextStatus = data.status?.toLowerCase() || "";
      if (previousStatus !== nextStatus) {
        if (nextStatus === "confirmed") {
          await dispatchNotificationEvent({
            service: "agenda",
            eventKey: "agendamento_confirmado",
            recipient: {
              patientId: data.patient_id,
              attendantId: data.attendant_id,
            },
            context: {
              paciente_nome: data.patient_name,
              profissional_nome: data.attendant_name,
              servico_nome: data.service_name,
              data_agendamento: data.appointment_date,
              hora_agendamento: data.appointment_time,
            },
            dedupeKey: `agenda:agendamento_confirmado:${data.id}`,
          });
        } else if (nextStatus === "cancelled") {
          await dispatchNotificationEvent({
            service: "agenda",
            eventKey: "agendamento_cancelado",
            recipient: {
              patientId: data.patient_id,
              attendantId: data.attendant_id,
            },
            context: {
              paciente_nome: data.patient_name,
              profissional_nome: data.attendant_name,
              servico_nome: data.service_name,
              data_agendamento: data.appointment_date,
              hora_agendamento: data.appointment_time,
            },
            dedupeKey: `agenda:agendamento_cancelado:${data.id}`,
          });
        }
      }
      
      return data;
    } catch (err: any) {
      console.error('Error updating appointment:', err);
      toast({
        title: "Erro ao atualizar agendamento",
        description: err.message,
        variant: "destructive"
      });
      throw err;
    }
  };

  const deleteAppointment = async (id: string) => {
    try {
      const previous = appointments.find((a) => a.id === id) || null;
      const { error: deleteError } = await supabase
        .from('appointments')
        .delete()
        .eq('id', id);
      
      if (deleteError) throw deleteError;
      
      setAppointments(prev => prev.filter(a => a.id !== id));
      
      toast({
        title: "Agendamento removido",
        description: "O agendamento foi removido do sistema.",
      });

      await recordSystemAuditLog({
        menuGroup: "NAVEGACAO",
        menu: "Agenda",
        screen: "Agenda",
        action: "delete",
        entityType: "appointment",
        entityId: id,
        message: "Agendamento removido.",
        metadata: {
          patientId: previous?.patient_id || null,
          patientName: previous?.patient_name || null,
          attendantId: previous?.attendant_id || null,
          attendantName: previous?.attendant_name || null,
          appointmentDate: previous?.appointment_date || null,
          appointmentTime: previous?.appointment_time || null,
          status: previous?.status || null,
        },
      });
    } catch (err: any) {
      console.error('Error deleting appointment:', err);
      toast({
        title: "Erro ao remover agendamento",
        description: err.message,
        variant: "destructive"
      });
      throw err;
    }
  };

  return {
    appointments,
    isLoading,
    error,
    fetchAppointments,
    addAppointment,
    updateAppointment,
    deleteAppointment
  };
};
