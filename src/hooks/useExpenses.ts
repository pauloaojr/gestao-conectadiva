import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useExpenseStatusConfigContext } from '@/contexts/ExpenseStatusConfigContext';
import { recordSystemAuditLog } from '@/services/systemAuditLog';
import { storageProvider } from '@/lib/storage/storageProvider';

export interface ExpenseItem {
  id: string;
  amount: number;
  description: string;
  date: string;
  status: string;
  patientId?: string | null;
  patientName?: string;
  categoryId?: string | null;
}

export interface ExpenseAttachmentRow {
  id: string;
  expense_id: string;
  storage_key: string;
  file_url: string;
  file_name: string;
  sort_order: number;
  created_at: string;
}

export const useExpenses = () => {
  const { toast } = useToast();
  const { statuses: expenseStatuses } = useExpenseStatusConfigContext();
  const [expenses, setExpenses] = useState<ExpenseItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

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

  const fetchExpenses = useCallback(async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .order('expense_date', { ascending: false });
      if (error) throw error;
      setExpenses(
        (data ?? []).map((e: any) => ({
          id: e.id,
          amount: Number(e.amount),
          description: e.description || '',
          date: e.expense_date,
          status: e.status,
          patientId: e.patient_id ?? undefined,
          patientName: e.patient_name ?? undefined,
          categoryId: e.category_id ?? undefined,
        }))
      );
    } catch (err: any) {
      console.error('Error fetching expenses:', err);
      toast({
        title: 'Erro ao carregar despesas',
        description: err.message,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchExpenses();
  }, [fetchExpenses]);

  const countsAsPaid = (statusKey: string) =>
    expenseStatuses.find((s) => s.key === statusKey)?.count_in_balance ?? false;

  const totalPaid = expenses.filter((e) => countsAsPaid(e.status)).reduce((s, e) => s + e.amount, 0);
  const totalPending = expenses.filter((e) => !countsAsPaid(e.status)).reduce((s, e) => s + e.amount, 0);
  const total = totalPaid + totalPending;

  const addExpense = async (payload: {
    amount: number;
    description: string;
    expense_date: string;
    status?: string;
    patient_id?: string | null;
    patient_name?: string | null;
    category_id?: string | null;
    attachments?: { storage_key: string; file_url: string; file_name: string }[];
  }) => {
    try {
      const row: Record<string, unknown> = {
        amount: payload.amount,
        description: payload.description.trim() || '',
        expense_date: payload.expense_date,
        status: payload.status ?? 'pending',
        patient_id: payload.patient_id ?? null,
        patient_name: payload.patient_name ?? null,
      };
      if (payload.category_id != null) row.category_id = payload.category_id;
      const { data, error } = await supabase.from('expenses').insert(row).select().single();
      if (error) throw error;

      const attachments = payload.attachments ?? [];
      if (attachments.length > 0) {
        const rows = attachments
          .filter((a) => a.storage_key && a.file_url)
          .map((a, i) => ({
            expense_id: data.id,
            storage_key: a.storage_key,
            file_url: a.file_url,
            file_name: a.file_name,
            sort_order: i,
          }));
        if (rows.length > 0) {
          const { error: attError } = await supabase.from('expense_attachments').insert(rows);
          if (attError) console.error('Error inserting expense attachments:', attError);
        }
      }

      await fetchExpenses();

      await recordSystemAuditLog({
        menuGroup: 'FINANCEIRO',
        menu: 'Despesas',
        screen: 'Despesas',
        action: 'create',
        entityType: 'expense',
        entityId: data.id,
        message: 'Despesa criada.',
        metadata: {
          amount: data.amount,
          description: data.description,
          expenseDate: data.expense_date,
          status: data.status,
          patientId: data.patient_id,
          patientName: data.patient_name,
          categoryId: data.category_id ?? null,
        },
      });

      toast({ title: 'Despesa adicionada', description: 'A despesa foi registrada.' });
    } catch (err: any) {
      toast({
        title: 'Erro ao adicionar despesa',
        description: err.message,
        variant: 'destructive',
      });
      throw err;
    }
  };

  const updateExpense = async (
    id: string,
    payload: {
      amount: number;
      description: string;
      expense_date: string;
      status: string;
      patient_id?: string | null;
      patient_name?: string | null;
      category_id?: string | null;
    }
  ) => {
    try {
      const previous = expenses.find((item) => item.id === id) ?? null;
      const comparablePrevious: Record<string, unknown> = {
        amount: previous?.amount ?? null,
        description: previous?.description ?? null,
        expense_date: previous?.date ?? null,
        status: previous?.status ?? null,
        patient_id: previous?.patientId ?? null,
        patient_name: previous?.patientName ?? null,
        category_id: previous?.categoryId ?? null,
      };

      const changedFields = Object.entries(payload)
        .filter(([key, nextValue]) => {
          const previousValue = comparablePrevious[key];
          return !isEquivalentForAudit(previousValue, nextValue);
        })
        .map(([key]) => key);

      const changedValues = changedFields.map((field) => {
        const previousValue = comparablePrevious[field];
        const nextValue = (payload as unknown as Record<string, unknown>)[field];
        return {
          field,
          before: normalizeForAudit(previousValue),
          after: normalizeForAudit(nextValue),
        };
      });

      const row: Record<string, unknown> = {
        amount: payload.amount,
        description: payload.description.trim() || '',
        expense_date: payload.expense_date,
        status: payload.status,
        patient_id: payload.patient_id ?? null,
        patient_name: payload.patient_name ?? null,
      };
      if (payload.category_id !== undefined) row.category_id = payload.category_id;
      const { error } = await supabase
        .from('expenses')
        .update(row)
        .eq('id', id);
      if (error) throw error;
      await fetchExpenses();

      await recordSystemAuditLog({
        menuGroup: 'FINANCEIRO',
        menu: 'Despesas',
        screen: 'Despesas',
        action: 'update',
        entityType: 'expense',
        entityId: id,
        message: 'Despesa atualizada.',
        metadata: {
          patientId: payload.patient_id ?? null,
          patientName: payload.patient_name ?? null,
          updatedFields: changedFields,
          changedValues,
        },
      });

      toast({ title: 'Despesa atualizada', description: 'As alterações foram salvas.' });
    } catch (err: any) {
      toast({
        title: 'Erro ao atualizar despesa',
        description: err.message,
        variant: 'destructive',
      });
      throw err;
    }
  };

  const updateExpenseStatus = async (id: string, status: string) => {
    try {
      const previous = expenses.find((item) => item.id === id) ?? null;
      const { error } = await supabase.from('expenses').update({ status }).eq('id', id);
      if (error) throw error;
      await fetchExpenses();

      await recordSystemAuditLog({
        menuGroup: 'FINANCEIRO',
        menu: 'Despesas',
        screen: 'Despesas',
        action: 'update',
        entityType: 'expense',
        entityId: id,
        message: status === 'paid' ? 'Despesa marcada como paga.' : 'Despesa marcada como pendente.',
        metadata: {
          patientId: previous?.patientId ?? null,
          patientName: previous?.patientName ?? null,
          previousStatus: previous?.status ?? null,
          newStatus: status,
          updatedFields: ['status'],
          changedValues: [
            {
              field: 'status',
              before: normalizeForAudit(previous?.status),
              after: normalizeForAudit(status),
            },
          ],
        },
      });

      toast({ title: 'Despesa atualizada', description: 'Status alterado.' });
    } catch (err: any) {
      toast({
        title: 'Erro ao atualizar',
        description: err.message,
        variant: 'destructive',
      });
      throw err;
    }
  };

  const fetchExpenseAttachments = useCallback(
    async (expenseId: string): Promise<ExpenseAttachmentRow[]> => {
      const { data, error } = await supabase
        .from('expense_attachments')
        .select('*')
        .eq('expense_id', expenseId)
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return (data as ExpenseAttachmentRow[]) ?? [];
    },
    []
  );

  const addExpenseAttachments = async (
    expenseId: string,
    attachments: { storage_key: string; file_url: string; file_name: string }[]
  ) => {
    const rows = attachments
      .filter((a) => a.storage_key && a.file_url)
      .map((a, i) => ({
        expense_id: expenseId,
        storage_key: a.storage_key,
        file_url: a.file_url,
        file_name: a.file_name,
        sort_order: i,
      }));
    if (rows.length === 0) return;
    const { error } = await supabase.from('expense_attachments').insert(rows);
    if (error) throw error;
  };

  const deleteExpenseAttachment = async (attachmentId: string) => {
    const { data: row, error: fetchErr } = await supabase
      .from('expense_attachments')
      .select('storage_key')
      .eq('id', attachmentId)
      .single();
    if (fetchErr || !row) throw fetchErr ?? new Error('Anexo não encontrado');
    const key = String(row.storage_key ?? '').trim();
    if (key && !key.startsWith('data:')) {
      try {
        await storageProvider.remove(key);
      } catch (e) {
        console.warn('Falha ao remover anexo do storage:', e);
      }
    }
    const { error: delErr } = await supabase
      .from('expense_attachments')
      .delete()
      .eq('id', attachmentId);
    if (delErr) throw delErr;
  };

  const deleteExpense = async (id: string) => {
    try {
      const previous = expenses.find((item) => item.id === id) ?? null;
      const attachments = await fetchExpenseAttachments(id);
      for (const a of attachments) {
        if (a.storage_key && !a.storage_key.startsWith('data:')) {
          try {
            await storageProvider.remove(a.storage_key);
          } catch (e) {
            console.warn('Falha ao remover anexo do storage:', e);
          }
        }
      }
      const { error } = await supabase.from('expenses').delete().eq('id', id);
      if (error) throw error;
      await fetchExpenses();

      await recordSystemAuditLog({
        menuGroup: 'FINANCEIRO',
        menu: 'Despesas',
        screen: 'Despesas',
        action: 'delete',
        entityType: 'expense',
        entityId: id,
        message: 'Despesa excluída.',
        metadata: {
          amount: previous?.amount ?? null,
          description: previous?.description ?? null,
          expenseDate: previous?.date ?? null,
          status: previous?.status ?? null,
          patientId: previous?.patientId ?? null,
          patientName: previous?.patientName ?? null,
          categoryId: previous?.categoryId ?? null,
        },
      });

      toast({ title: 'Despesa excluída', description: 'A despesa foi removida.' });
    } catch (err: any) {
      toast({
        title: 'Erro ao excluir',
        description: err.message,
        variant: 'destructive',
      });
      throw err;
    }
  };

  return {
    expenses,
    totalPaid,
    totalPending,
    total,
    isLoading,
    refresh: fetchExpenses,
    addExpense,
    updateExpense,
    updateExpenseStatus,
    deleteExpense,
    fetchExpenseAttachments,
    addExpenseAttachments,
    deleteExpenseAttachment,
  };
};
