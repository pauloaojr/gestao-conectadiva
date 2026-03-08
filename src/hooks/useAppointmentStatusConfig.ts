import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { recordSystemAuditLog } from '@/services/systemAuditLog';

export interface AppointmentStatusConfigItem {
  id: string;
  key: string;
  label: string;
  is_system: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export const useAppointmentStatusConfig = () => {
  const [statuses, setStatuses] = useState<AppointmentStatusConfigItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchStatuses = useCallback(async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('appointment_status_config')
        .select('*')
        .order('sort_order', { ascending: true });

      if (error) throw error;
      // Status "Pago" removido do fluxo da agenda
      setStatuses((data ?? []).filter((s) => s.key !== 'paid'));
    } catch (err: any) {
      console.error('Error fetching appointment status config:', err);
      toast({
        title: 'Erro ao carregar status',
        description: err.message,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchStatuses();
  }, [fetchStatuses]);

  const updateLabel = async (id: string, label: string) => {
    try {
      const previous = statuses.find((s) => s.id === id) ?? null;
      const { error } = await supabase
        .from('appointment_status_config')
        .update({ label: label.trim() })
        .eq('id', id);

      if (error) throw error;
      await fetchStatuses();

      await recordSystemAuditLog({
        menuGroup: 'SISTEMA',
        menu: 'Configurações',
        screen: 'Configurações - Status Agenda',
        action: 'update',
        entityType: 'appointment_status',
        entityId: id,
        message: 'Status da agenda atualizado.',
        metadata: {
          statusKey: previous?.key ?? null,
          updatedFields: ['label'],
          changedValues: [
            {
              field: 'label',
              before: previous?.label ?? null,
              after: label.trim(),
            },
          ],
        },
      });

      toast({ title: 'Status atualizado', description: 'Nome do status salvo com sucesso.' });
      return true;
    } catch (err: any) {
      toast({
        title: 'Erro ao atualizar',
        description: err.message,
        variant: 'destructive',
      });
      return false;
    }
  };

  const addStatus = async (label: string) => {
    const trimmed = label.trim();
    if (!trimmed) return false;
    const key = `custom_${Date.now()}`;
    const maxOrder = statuses.length ? Math.max(...statuses.map((s) => s.sort_order)) : 0;
    try {
      const { data, error } = await supabase
        .from('appointment_status_config')
        .insert({
          key,
          label: trimmed,
          is_system: false,
          sort_order: maxOrder + 1,
        })
        .select()
        .single();

      if (error) throw error;
      await fetchStatuses();

      await recordSystemAuditLog({
        menuGroup: 'SISTEMA',
        menu: 'Configurações',
        screen: 'Configurações - Status Agenda',
        action: 'create',
        entityType: 'appointment_status',
        entityId: data?.id ?? null,
        message: 'Status da agenda criado.',
        metadata: {
          statusKey: data?.key ?? key,
          label: data?.label ?? trimmed,
          isSystem: false,
        },
      });

      toast({ title: 'Status adicionado', description: `"${trimmed}" foi criado.` });
      return true;
    } catch (err: any) {
      toast({
        title: 'Erro ao adicionar status',
        description: err.message,
        variant: 'destructive',
      });
      return false;
    }
  };

  const deleteStatus = async (id: string) => {
    const item = statuses.find((s) => s.id === id);
    if (item?.is_system) {
      toast({
        title: 'Não permitido',
        description: 'Status padrão não pode ser excluído.',
        variant: 'destructive',
      });
      return false;
    }
    try {
      const { error } = await supabase.from('appointment_status_config').delete().eq('id', id);

      if (error) throw error;
      await fetchStatuses();

      await recordSystemAuditLog({
        menuGroup: 'SISTEMA',
        menu: 'Configurações',
        screen: 'Configurações - Status Agenda',
        action: 'delete',
        entityType: 'appointment_status',
        entityId: id,
        message: 'Status da agenda excluído.',
        metadata: {
          statusKey: item?.key ?? null,
          label: item?.label ?? null,
          isSystem: item?.is_system ?? null,
        },
      });

      toast({ title: 'Status excluído', description: 'O status foi removido.' });
      return true;
    } catch (err: any) {
      toast({
        title: 'Erro ao excluir',
        description: err.message,
        variant: 'destructive',
      });
      return false;
    }
  };

  const getLabel = useCallback(
    (key: string) => statuses.find((s) => s.key === key)?.label ?? key,
    [statuses]
  );

  /** Atualiza a ordem de exibição dos status (ids na ordem desejada). */
  const updateOrder = useCallback(
    async (orderedIds: string[]) => {
      if (orderedIds.length === 0) return true;
      try {
        for (let i = 0; i < orderedIds.length; i++) {
          const { error } = await supabase
            .from('appointment_status_config')
            .update({ sort_order: i })
            .eq('id', orderedIds[i]);
          if (error) throw error;
        }
        await fetchStatuses();

        await recordSystemAuditLog({
          menuGroup: 'SISTEMA',
          menu: 'Configurações',
          screen: 'Configurações - Status Agenda',
          action: 'update',
          entityType: 'appointment_status',
          entityId: null,
          message: 'Ordem dos status da agenda alterada.',
          metadata: { orderedIds },
        });

        toast({ title: 'Ordem atualizada', description: 'A ordem dos status foi salva.' });
        return true;
      } catch (err: any) {
        toast({
          title: 'Erro ao reordenar',
          description: err.message,
          variant: 'destructive',
        });
        return false;
      }
    },
    [fetchStatuses, toast]
  );

  return {
    statuses,
    isLoading,
    fetchStatuses,
    getLabel,
    updateLabel,
    addStatus,
    deleteStatus,
    updateOrder,
  };
};
