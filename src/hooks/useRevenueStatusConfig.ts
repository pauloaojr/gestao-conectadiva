import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface RevenueStatusConfigItem {
  id: string;
  key: string;
  label: string;
  is_system: boolean;
  sort_order: number;
  count_in_balance: boolean;
  created_at: string;
  updated_at: string;
}

export const useRevenueStatusConfig = () => {
  const [statuses, setStatuses] = useState<RevenueStatusConfigItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchStatuses = useCallback(async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('revenue_status_config')
        .select('*')
        .order('sort_order', { ascending: true });

      if (error) throw error;
      setStatuses(data ?? []);
    } catch (err: any) {
      console.error('Error fetching revenue status config:', err);
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
      const { error } = await supabase
        .from('revenue_status_config')
        .update({ label: label.trim() })
        .eq('id', id);

      if (error) throw error;
      await fetchStatuses();
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

  const updateStatus = async (id: string, updates: { label?: string; count_in_balance?: boolean }) => {
    try {
      const payload: { label?: string; count_in_balance?: boolean } = {};
      if (updates.label !== undefined) payload.label = updates.label.trim();
      if (updates.count_in_balance !== undefined) payload.count_in_balance = updates.count_in_balance;
      if (Object.keys(payload).length === 0) return true;
      const { error } = await supabase
        .from('revenue_status_config')
        .update(payload)
        .eq('id', id);

      if (error) throw error;
      await fetchStatuses();
      toast({ title: 'Status atualizado', description: 'Alterações salvas com sucesso.' });
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

  const addStatus = async (label: string, count_in_balance = false) => {
    const trimmed = label.trim();
    if (!trimmed) return false;
    const key = `custom_${Date.now()}`;
    const maxOrder = statuses.length ? Math.max(...statuses.map((s) => s.sort_order)) : 0;
    try {
      const { error } = await supabase.from('revenue_status_config').insert({
        key,
        label: trimmed,
        is_system: false,
        sort_order: maxOrder + 1,
        count_in_balance,
      });

      if (error) throw error;
      await fetchStatuses();
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
      const { error } = await supabase.from('revenue_status_config').delete().eq('id', id);

      if (error) throw error;
      await fetchStatuses();
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

  return {
    statuses,
    isLoading,
    fetchStatuses,
    getLabel,
    updateLabel,
    updateStatus,
    addStatus,
    deleteStatus,
  };
};
