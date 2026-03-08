import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { recordSystemAuditLog } from '@/services/systemAuditLog';

export type AppliesTo = 'revenue' | 'expense' | 'both';

export interface FinancialStatusConfigItem {
  id: string;
  key: string;
  label: string;
  is_system: boolean;
  sort_order: number;
  count_in_balance: boolean;
  applies_to: AppliesTo;
  created_at: string;
  updated_at: string;
}

export const useFinancialStatusConfig = () => {
  const [allStatuses, setAllStatuses] = useState<FinancialStatusConfigItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

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

  const fetchStatuses = useCallback(async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('financial_status_config')
        .select('*')
        .order('sort_order', { ascending: true });

      if (error) throw error;
      setAllStatuses((data ?? []) as FinancialStatusConfigItem[]);
    } catch (err: unknown) {
      console.error('Error fetching financial status config:', err);
      toast({
        title: 'Erro ao carregar status',
        description: err instanceof Error ? err.message : 'Erro desconhecido',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchStatuses();
  }, [fetchStatuses]);

  const getRevenueStatuses = useMemo(
    () => () =>
      allStatuses.filter((s) => s.applies_to === 'revenue' || s.applies_to === 'both'),
    [allStatuses]
  );

  const getExpenseStatuses = useMemo(
    () => () =>
      allStatuses.filter((s) => s.applies_to === 'expense' || s.applies_to === 'both'),
    [allStatuses]
  );

  const getLabel = useCallback(
    (key: string, type: 'revenue' | 'expense') => {
      const list =
        type === 'revenue'
          ? allStatuses.filter((s) => s.applies_to === 'revenue' || s.applies_to === 'both')
          : allStatuses.filter((s) => s.applies_to === 'expense' || s.applies_to === 'both');
      return list.find((s) => s.key === key)?.label ?? key;
    },
    [allStatuses]
  );

  const updateStatus = async (
    id: string,
    updates: { label?: string; count_in_balance?: boolean; applies_to?: AppliesTo }
  ) => {
    try {
      const previous = allStatuses.find((item) => item.id === id) ?? null;
      const payload: { label?: string; count_in_balance?: boolean; applies_to?: AppliesTo } = {};
      if (updates.label !== undefined) payload.label = updates.label.trim();
      if (updates.count_in_balance !== undefined) payload.count_in_balance = updates.count_in_balance;
      if (updates.applies_to !== undefined) payload.applies_to = updates.applies_to;
      if (Object.keys(payload).length === 0) return true;

      const changedFields = Object.entries(payload)
        .filter(([key, nextValue]) => {
          const previousValue = previous ? (previous as unknown as Record<string, unknown>)[key] : undefined;
          return !isEquivalentForAudit(previousValue, nextValue);
        })
        .map(([key]) => key);

      const changedValues = changedFields.map((field) => {
        const previousValue = previous ? (previous as unknown as Record<string, unknown>)[field] : undefined;
        const nextValue = (payload as unknown as Record<string, unknown>)[field];
        return {
          field,
          before: normalizeForAudit(previousValue),
          after: normalizeForAudit(nextValue),
        };
      });

      const { error } = await supabase
        .from('financial_status_config')
        .update(payload)
        .eq('id', id);

      if (error) throw error;
      await fetchStatuses();

      await recordSystemAuditLog({
        menuGroup: 'FINANCEIRO',
        menu: 'Configurações',
        screen: 'Configurações Financeiras - Status',
        action: 'update',
        entityType: 'financial_status',
        entityId: id,
        message: 'Status financeiro atualizado.',
        metadata: {
          key: previous?.key ?? null,
          updatedFields: changedFields,
          changedValues,
        },
      });

      toast({ title: 'Status atualizado', description: 'Alterações salvas com sucesso.' });
      return true;
    } catch (err: unknown) {
      toast({
        title: 'Erro ao atualizar',
        description: err instanceof Error ? err.message : 'Erro desconhecido',
        variant: 'destructive',
      });
      return false;
    }
  };

  const addStatus = async (
    label: string,
    applies_to: AppliesTo,
    count_in_balance = false
  ) => {
    const trimmed = label.trim();
    if (!trimmed) return false;
    const key = `custom_${Date.now()}`;
    const maxOrder = allStatuses.length ? Math.max(...allStatuses.map((s) => s.sort_order)) : 0;
    try {
      const { data, error } = await supabase
        .from('financial_status_config')
        .insert({
          key,
          label: trimmed,
          is_system: false,
          sort_order: maxOrder + 1,
          count_in_balance,
          applies_to,
        })
        .select()
        .single();

      if (error) throw error;
      await fetchStatuses();

      await recordSystemAuditLog({
        menuGroup: 'FINANCEIRO',
        menu: 'Configurações',
        screen: 'Configurações Financeiras - Status',
        action: 'create',
        entityType: 'financial_status',
        entityId: data.id,
        message: 'Status financeiro criado.',
        metadata: {
          key: data.key,
          label: data.label,
          appliesTo: data.applies_to,
          countInBalance: data.count_in_balance,
          isSystem: data.is_system,
          sortOrder: data.sort_order,
        },
      });

      toast({ title: 'Status adicionado', description: `"${trimmed}" foi criado.` });
      return true;
    } catch (err: unknown) {
      toast({
        title: 'Erro ao adicionar status',
        description: err instanceof Error ? err.message : 'Erro desconhecido',
        variant: 'destructive',
      });
      return false;
    }
  };

  const deleteStatus = async (id: string) => {
    const item = allStatuses.find((s) => s.id === id);
    if (item?.is_system) {
      toast({
        title: 'Não permitido',
        description: 'Status padrão não pode ser excluído.',
        variant: 'destructive',
      });
      return false;
    }
    try {
      const { error } = await supabase.from('financial_status_config').delete().eq('id', id);

      if (error) throw error;
      await fetchStatuses();

      await recordSystemAuditLog({
        menuGroup: 'FINANCEIRO',
        menu: 'Configurações',
        screen: 'Configurações Financeiras - Status',
        action: 'delete',
        entityType: 'financial_status',
        entityId: id,
        message: 'Status financeiro excluído.',
        metadata: {
          key: item?.key ?? null,
          label: item?.label ?? null,
          appliesTo: item?.applies_to ?? null,
          countInBalance: item?.count_in_balance ?? null,
          isSystem: item?.is_system ?? null,
        },
      });

      toast({ title: 'Status excluído', description: 'O status foi removido.' });
      return true;
    } catch (err: unknown) {
      toast({
        title: 'Erro ao excluir',
        description: err instanceof Error ? err.message : 'Erro desconhecido',
        variant: 'destructive',
      });
      return false;
    }
  };

  return {
    allStatuses,
    getRevenueStatuses,
    getExpenseStatuses,
    getLabel,
    isLoading,
    fetchStatuses,
    updateStatus,
    addStatus,
    deleteStatus,
  };
};
