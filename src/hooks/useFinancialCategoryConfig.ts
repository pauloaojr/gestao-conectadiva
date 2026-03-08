import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { recordSystemAuditLog } from '@/services/systemAuditLog';

export type CategoryAppliesTo = 'revenue' | 'expense' | 'both';

export interface FinancialCategoryItem {
  id: string;
  name: string;
  applies_to: CategoryAppliesTo;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export const useFinancialCategoryConfig = () => {
  const [allCategories, setAllCategories] = useState<FinancialCategoryItem[]>([]);
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

  const fetchCategories = useCallback(async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('financial_categories')
        .select('*')
        .order('sort_order', { ascending: true });

      if (error) throw error;
      setAllCategories((data ?? []) as FinancialCategoryItem[]);
    } catch (err: unknown) {
      console.error('Error fetching financial categories:', err);
      toast({
        title: 'Erro ao carregar categorias',
        description: err instanceof Error ? err.message : 'Erro desconhecido',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const getRevenueCategories = useMemo(
    () => () =>
      allCategories.filter((c) => c.applies_to === 'revenue' || c.applies_to === 'both'),
    [allCategories]
  );

  const getExpenseCategories = useMemo(
    () => () =>
      allCategories.filter((c) => c.applies_to === 'expense' || c.applies_to === 'both'),
    [allCategories]
  );

  const getLabel = useCallback(
    (id: string | null, type: 'revenue' | 'expense') => {
      if (!id) return '—';
      const list =
        type === 'revenue'
          ? allCategories.filter((c) => c.applies_to === 'revenue' || c.applies_to === 'both')
          : allCategories.filter((c) => c.applies_to === 'expense' || c.applies_to === 'both');
      return list.find((c) => c.id === id)?.name ?? '—';
    },
    [allCategories]
  );

  const updateCategory = async (
    id: string,
    updates: { name?: string; applies_to?: CategoryAppliesTo }
  ) => {
    try {
      const previous = allCategories.find((item) => item.id === id) ?? null;
      const payload: { name?: string; applies_to?: CategoryAppliesTo } = {};
      if (updates.name !== undefined) payload.name = updates.name.trim();
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
        .from('financial_categories')
        .update(payload)
        .eq('id', id);

      if (error) throw error;
      await fetchCategories();

      await recordSystemAuditLog({
        menuGroup: 'FINANCEIRO',
        menu: 'Configurações',
        screen: 'Configurações Financeiras - Categorias',
        action: 'update',
        entityType: 'financial_category',
        entityId: id,
        message: 'Categoria financeira atualizada.',
        metadata: {
          updatedFields: changedFields,
          changedValues,
        },
      });

      toast({ title: 'Categoria atualizada', description: 'Alterações salvas com sucesso.' });
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

  const addCategory = async (name: string, applies_to: CategoryAppliesTo) => {
    const trimmed = name.trim();
    if (!trimmed) return false;
    const maxOrder = allCategories.length ? Math.max(...allCategories.map((c) => c.sort_order)) : 0;
    try {
      const { data, error } = await supabase
        .from('financial_categories')
        .insert({
          name: trimmed,
          applies_to,
          sort_order: maxOrder + 1,
        })
        .select()
        .single();

      if (error) throw error;
      await fetchCategories();

      await recordSystemAuditLog({
        menuGroup: 'FINANCEIRO',
        menu: 'Configurações',
        screen: 'Configurações Financeiras - Categorias',
        action: 'create',
        entityType: 'financial_category',
        entityId: data.id,
        message: 'Categoria financeira criada.',
        metadata: {
          name: data.name,
          appliesTo: data.applies_to,
          sortOrder: data.sort_order,
        },
      });

      toast({ title: 'Categoria adicionada', description: `"${trimmed}" foi criada.` });
      return true;
    } catch (err: unknown) {
      toast({
        title: 'Erro ao adicionar categoria',
        description: err instanceof Error ? err.message : 'Erro desconhecido',
        variant: 'destructive',
      });
      return false;
    }
  };

  const deleteCategory = async (id: string) => {
    try {
      const previous = allCategories.find((item) => item.id === id) ?? null;
      const { error } = await supabase.from('financial_categories').delete().eq('id', id);

      if (error) throw error;
      await fetchCategories();

      await recordSystemAuditLog({
        menuGroup: 'FINANCEIRO',
        menu: 'Configurações',
        screen: 'Configurações Financeiras - Categorias',
        action: 'delete',
        entityType: 'financial_category',
        entityId: id,
        message: 'Categoria financeira excluída.',
        metadata: {
          name: previous?.name ?? null,
          appliesTo: previous?.applies_to ?? null,
          sortOrder: previous?.sort_order ?? null,
        },
      });

      toast({ title: 'Categoria excluída', description: 'A categoria foi removida.' });
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
    allCategories,
    getRevenueCategories,
    getExpenseCategories,
    getLabel,
    isLoading,
    fetchCategories,
    updateCategory,
    addCategory,
    deleteCategory,
  };
};
