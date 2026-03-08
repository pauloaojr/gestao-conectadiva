import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useRevenueStatusConfigContext } from '@/contexts/RevenueStatusConfigContext';
import { dispatchNotificationEvent } from '@/services/notificationDispatch';
import { recordSystemAuditLog } from '@/services/systemAuditLog';
import { storageProvider } from '@/lib/storage/storageProvider';

export type RevenueStatus = 'pending' | 'received';

export interface RevenueItem {
  id: string;
  amount: number;
  description: string;
  date: string;
  status: string;
  source: 'appointment' | 'manual';
  appointmentId?: string;
  patientId?: string | null;
  patientName?: string;
  serviceName?: string;
  appointmentDate?: string;
  appointmentTime?: string;
  categoryId?: string | null;
}

export interface ManualRevenueRow {
  id: string;
  amount: number;
  description: string;
  revenue_date: string;
  status: string;
  patient_id: string | null;
  patient_name: string | null;
  category_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface RevenueAttachmentRow {
  id: string;
  revenue_id: string;
  storage_key: string;
  file_url: string;
  file_name: string;
  sort_order: number;
  created_at: string;
}

export const useRevenue = () => {
  const { toast } = useToast();
  const { statuses: revenueStatuses } = useRevenueStatusConfigContext();
  const [manualRevenue, setManualRevenue] = useState<ManualRevenueRow[]>([]);
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

  const enqueueNotificationDispatch = useCallback(
    (input: Parameters<typeof dispatchNotificationEvent>[0]) => {
      window.setTimeout(() => {
        void dispatchNotificationEvent(input).catch((error) => {
          console.error('Background notification dispatch error:', error);
        });
      }, 0);
    },
    []
  );

  const fetchManualRevenue = useCallback(async () => {
    const { data, error } = await supabase
      .from('revenue')
      .select('*')
      .order('revenue_date', { ascending: false });
    if (error) throw error;
    setManualRevenue((data as ManualRevenueRow[]) ?? []);
  }, []);

  const fetchAll = useCallback(async () => {
    try {
      setIsLoading(true);
      await fetchManualRevenue();
    } catch (err: any) {
      console.error('Error fetching revenue:', err);
      toast({
        title: 'Erro ao carregar receitas',
        description: err.message,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [fetchManualRevenue, toast]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const allRevenue: RevenueItem[] = manualRevenue
    .map((r) => ({
      id: r.id,
      amount: Number(r.amount),
      description: r.description || 'Receita manual',
      date: r.revenue_date,
      status: r.status,
      source: 'manual' as const,
      patientId: r.patient_id ?? undefined,
      patientName: r.patient_name ?? undefined,
      categoryId: r.category_id ?? undefined,
    }))
    .sort((a, b) => b.date.localeCompare(a.date));

  const countsAsReceived = (statusKey: string) =>
    revenueStatuses.find((s) => s.key === statusKey)?.count_in_balance ?? false;

  const totalReceived = allRevenue
    .filter((r) => countsAsReceived(r.status))
    .reduce((s, r) => s + r.amount, 0);
  const totalPending = allRevenue
    .filter((r) => !countsAsReceived(r.status))
    .reduce((s, r) => s + r.amount, 0);

  const addManualRevenue = async (payload: {
    amount: number;
    description: string;
    revenue_date: string;
    status?: string;
    patient_id?: string | null;
    patient_name?: string | null;
    category_id?: string | null;
    attachments?: { storage_key: string; file_url: string; file_name: string }[];
  }) => {
    try {
      const { data, error } = await supabase
        .from('revenue')
        .insert({
          amount: payload.amount,
          description: payload.description.trim() || 'Receita manual',
          revenue_date: payload.revenue_date,
          status: payload.status ?? 'pending',
          patient_id: payload.patient_id ?? null,
          patient_name: payload.patient_name ?? null,
          category_id: payload.category_id ?? null,
        })
        .select()
        .single();
      if (error) throw error;

      const attachments = payload.attachments ?? [];
      if (attachments.length > 0) {
        const rows = attachments
          .filter((a) => a.storage_key && a.file_url)
          .map((a, i) => ({
            revenue_id: data.id,
            storage_key: a.storage_key,
            file_url: a.file_url,
            file_name: a.file_name,
            sort_order: i,
          }));
        if (rows.length > 0) {
          const { error: attError } = await supabase.from('revenue_attachments').insert(rows);
          if (attError) console.error('Error inserting revenue attachments:', attError);
        }
      }

      await fetchManualRevenue();

      await recordSystemAuditLog({
        menuGroup: 'FINANCEIRO',
        menu: 'Receitas',
        screen: 'Receitas',
        action: 'create',
        entityType: 'revenue',
        entityId: data.id,
        message: 'Receita criada.',
        metadata: {
          source: 'manual',
          amount: data.amount,
          description: data.description,
          revenueDate: data.revenue_date,
          status: data.status,
          patientId: data.patient_id,
          patientName: data.patient_name,
          categoryId: data.category_id,
        },
      });

      toast({ title: 'Receita adicionada', description: 'A receita manual foi registrada.' });

      enqueueNotificationDispatch({
        service: "financeiro",
        eventKey: "conta_criada",
        recipient: {
          patientId: payload.patient_id ?? null,
        },
        context: {
          paciente_nome: payload.patient_name ?? '',
          descricao_conta: payload.description,
          valor: payload.amount,
          data_vencimento: payload.revenue_date,
          status_pagamento: payload.status ?? 'pending',
        },
        dedupeKey: `financeiro:conta_criada:${data.id}`,
      });

      return data as ManualRevenueRow;
    } catch (err: any) {
      toast({
        title: 'Erro ao adicionar receita',
        description: err.message,
        variant: 'destructive',
      });
      throw err;
    }
  };

  const updateManualRevenue = async (
    id: string,
    payload: {
      amount: number;
      description: string;
      revenue_date: string;
      status: string;
      patient_id?: string | null;
      patient_name?: string | null;
      category_id?: string | null;
    }
  ) => {
    try {
      const previous = manualRevenue.find((item) => item.id === id) ?? null;

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
        .from('revenue')
        .update({
          amount: payload.amount,
          description: payload.description.trim() || '',
          revenue_date: payload.revenue_date,
          status: payload.status,
          patient_id: payload.patient_id ?? null,
          patient_name: payload.patient_name ?? null,
          category_id: payload.category_id ?? null,
        })
        .eq('id', id);
      if (error) throw error;
      await fetchManualRevenue();

      await recordSystemAuditLog({
        menuGroup: 'FINANCEIRO',
        menu: 'Receitas',
        screen: 'Receitas',
        action: 'update',
        entityType: 'revenue',
        entityId: id,
        message: 'Receita atualizada.',
        metadata: {
          source: 'manual',
          patientId: payload.patient_id ?? null,
          patientName: payload.patient_name ?? null,
          updatedFields: changedFields,
          changedValues,
        },
      });

      toast({ title: 'Receita atualizada', description: 'As alterações foram salvas.' });
    } catch (err: any) {
      toast({
        title: 'Erro ao atualizar receita',
        description: err.message,
        variant: 'destructive',
      });
      throw err;
    }
  };

  const updateManualRevenueStatus = async (id: string, status: string) => {
    try {
      const previousRow = manualRevenue.find((item) => item.id === id);
      const { error } = await supabase.from('revenue').update({ status }).eq('id', id);
      if (error) throw error;
      await fetchManualRevenue();

      await recordSystemAuditLog({
        menuGroup: 'FINANCEIRO',
        menu: 'Receitas',
        screen: 'Receitas',
        action: 'update',
        entityType: 'revenue',
        entityId: id,
        message: status === 'received' ? 'Receita marcada como recebida.' : 'Receita marcada como pendente.',
        metadata: {
          source: 'manual',
          patientId: previousRow?.patient_id ?? null,
          patientName: previousRow?.patient_name ?? null,
          previousStatus: previousRow?.status ?? null,
          newStatus: status,
          updatedFields: ['status'],
          changedValues: [
            {
              field: 'status',
              before: normalizeForAudit(previousRow?.status),
              after: normalizeForAudit(status),
            },
          ],
        },
      });

      toast({ title: 'Receita atualizada', description: status === 'received' ? 'Marcada como recebida.' : 'Marcada como pendente.' });

      const shouldDispatchPaymentNotification =
        status === 'received' || status === 'paid' || countsAsReceived(status);

      if (shouldDispatchPaymentNotification) {
        if (!previousRow?.patient_id) {
          toast({
            title: 'Sem destinatário para notificação',
            description:
              'Esta receita não possui paciente vinculado. Vincule um paciente com e-mail para enviar notificação.',
          });
          return;
        }

        const { data: patientRow, error: patientLookupError } = await supabase
          .from('patients')
          .select('email')
          .eq('id', previousRow.patient_id)
          .maybeSingle();

        if (patientLookupError) {
          console.error('Error checking patient email for notification:', patientLookupError);
        }

        if (!patientRow?.email?.trim()) {
          toast({
            title: 'Paciente sem e-mail',
            description:
              'Não foi possível enviar notificação: o paciente vinculado não possui e-mail cadastrado.',
          });
          return;
        }

        const { data: hasRule, error: ruleLookupError } = await supabase
          .from('notification_settings')
          .select('id')
          .eq('enabled', true)
          .eq('service', 'financeiro')
          .eq('event_key', 'pagamento_confirmado')
          .limit(1)
          .maybeSingle();

        if (ruleLookupError) {
          console.error('Error checking pagamento_confirmado rules:', ruleLookupError);
        }

        if (!hasRule) {
          toast({
            title: 'Sem regra ativa para baixa',
            description:
              'Não existe regra ativa de notificação para o evento "Pagamento confirmado" no Financeiro.',
          });
          return;
        }

        enqueueNotificationDispatch({
          service: "financeiro",
          eventKey: "pagamento_confirmado",
          recipient: {
            patientId: previousRow?.patient_id ?? null,
            email: patientRow?.email ?? null,
          },
          context: {
            paciente_nome: previousRow?.patient_name ?? '',
            descricao_conta: previousRow?.description ?? '',
            valor: previousRow?.amount ?? 0,
            data_vencimento: previousRow?.revenue_date ?? '',
            status_pagamento: status,
          },
          dedupeKey: `financeiro:pagamento_confirmado:${id}:${status}`,
        });

        toast({
          title: 'Notificação disparada',
          description: 'A notificação de pagamento confirmado foi enviada para processamento.',
        });
      }
    } catch (err: any) {
      toast({
        title: 'Erro ao atualizar',
        description: err.message,
        variant: 'destructive',
      });
      throw err;
    }
  };

  const fetchRevenueAttachments = useCallback(async (revenueId: string): Promise<RevenueAttachmentRow[]> => {
    const { data, error } = await supabase
      .from('revenue_attachments')
      .select('*')
      .eq('revenue_id', revenueId)
      .order('sort_order', { ascending: true });
    if (error) throw error;
    return (data as RevenueAttachmentRow[]) ?? [];
  }, []);

  const addRevenueAttachments = async (
    revenueId: string,
    attachments: { storage_key: string; file_url: string; file_name: string }[]
  ) => {
    const rows = attachments
      .filter((a) => a.storage_key && a.file_url)
      .map((a, i) => ({
        revenue_id: revenueId,
        storage_key: a.storage_key,
        file_url: a.file_url,
        file_name: a.file_name,
        sort_order: i,
      }));
    if (rows.length === 0) return;
    const { error } = await supabase.from('revenue_attachments').insert(rows);
    if (error) throw error;
  };

  const deleteRevenueAttachment = async (attachmentId: string) => {
    const { data: row, error: fetchErr } = await supabase
      .from('revenue_attachments')
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
    const { error: delErr } = await supabase.from('revenue_attachments').delete().eq('id', attachmentId);
    if (delErr) throw delErr;
  };

  const deleteManualRevenue = async (id: string) => {
    try {
      const previousRow = manualRevenue.find((item) => item.id === id);
      const attachments = await fetchRevenueAttachments(id);
      for (const a of attachments) {
        if (a.storage_key && !a.storage_key.startsWith('data:')) {
          try {
            await storageProvider.remove(a.storage_key);
          } catch (e) {
            console.warn('Falha ao remover anexo do storage:', e);
          }
        }
      }
      const { error } = await supabase.from('revenue').delete().eq('id', id);
      if (error) throw error;
      await fetchManualRevenue();

      await recordSystemAuditLog({
        menuGroup: 'FINANCEIRO',
        menu: 'Receitas',
        screen: 'Receitas',
        action: 'delete',
        entityType: 'revenue',
        entityId: id,
        message: 'Receita excluída.',
        metadata: {
          source: 'manual',
          amount: previousRow?.amount ?? null,
          description: previousRow?.description ?? null,
          revenueDate: previousRow?.revenue_date ?? null,
          status: previousRow?.status ?? null,
          patientId: previousRow?.patient_id ?? null,
          patientName: previousRow?.patient_name ?? null,
          categoryId: previousRow?.category_id ?? null,
        },
      });

      toast({ title: 'Receita excluída', description: 'A receita manual foi removida.' });
    } catch (err: any) {
      toast({
        title: 'Erro ao excluir',
        description: err.message,
        variant: 'destructive',
      });
      throw err;
    }
  };

  /** Cria uma ou várias receitas conforme o plano do paciente (vigência e dia vencimento). */
  const addPlanRevenues = async (params: {
    patientId: string;
    patientName: string;
    planId: string;
    planName: string;
    planValue: number;
    validityMonths: number | null;
    dueDay: number;
    defaultStatus: string;
    categoryId?: string | null;
    attachments?: { storage_key: string; file_url: string; file_name: string }[];
  }) => {
    const {
      patientId,
      patientName,
      planId,
      planName,
      planValue,
      validityMonths,
      dueDay,
      defaultStatus,
      categoryId = null,
      attachments: planAttachments = [],
    } = params;
    const count = validityMonths != null && validityMonths > 1 ? validityMonths : 1;
    const descriptionBase = `Plano ${planName} - ${patientName}`;

    try {
      const { addMonths, setDate, format } = await import('date-fns');
      const today = new Date();
      const payloads: { revenue_date: string; amount: number; description: string }[] = [];
      const createdIds: string[] = [];

      if (count === 1) {
        payloads.push({
          revenue_date: format(today, 'yyyy-MM-dd'),
          amount: planValue,
          description: descriptionBase,
        });
      } else {
        payloads.push({
          revenue_date: format(today, 'yyyy-MM-dd'),
          amount: planValue,
          description: `${descriptionBase} (1/${count})`,
        });
        for (let i = 1; i < count; i++) {
          const nextMonth = addMonths(today, i);
          const lastDay = new Date(nextMonth.getFullYear(), nextMonth.getMonth() + 1, 0).getDate();
          const safeDay = Math.min(dueDay, lastDay);
          const dateWithDue = setDate(nextMonth, safeDay);
          payloads.push({
            revenue_date: format(dateWithDue, 'yyyy-MM-dd'),
            amount: planValue,
            description: `${descriptionBase} (${i + 1}/${count})`,
          });
        }
      }

      for (const p of payloads) {
        const { data: createdRevenue, error } = await supabase
          .from('revenue')
          .insert({
            amount: p.amount,
            description: p.description,
            revenue_date: p.revenue_date,
            status: defaultStatus,
            patient_id: patientId,
            patient_name: patientName,
            category_id: categoryId,
          })
          .select('id')
          .single();
        if (error) throw error;
        if (createdRevenue?.id) createdIds.push(createdRevenue.id);

        await recordSystemAuditLog({
          menuGroup: 'FINANCEIRO',
          menu: 'Receitas',
          screen: 'Receitas',
          action: 'create',
          entityType: 'revenue',
          entityId: createdRevenue?.id ?? null,
          message: 'Receita criada por plano.',
          metadata: {
            source: 'plan',
            patientId,
            patientName,
            planId,
            planName,
            amount: p.amount,
            description: p.description,
            revenueDate: p.revenue_date,
            status: defaultStatus,
            categoryId,
          },
        });

        const dedupeKey = createdRevenue?.id
          ? `financeiro:conta_criada:${createdRevenue.id}`
          : `financeiro:conta_criada:plano:${patientId}:${p.revenue_date}:${p.description}`;

        enqueueNotificationDispatch({
          service: "financeiro",
          eventKey: "conta_criada",
          recipient: {
            patientId,
          },
          context: {
            paciente_nome: patientName,
            descricao_conta: p.description,
            valor: p.amount,
            data_vencimento: p.revenue_date,
            status_pagamento: defaultStatus,
          },
          dedupeKey,
        });
      }

      for (const revId of createdIds) {
        try {
          await addRevenueAttachments(revId, planAttachments);
        } catch (e) {
          console.warn('Falha ao anexar arquivos à receita do plano:', revId, e);
        }
      }

      await fetchManualRevenue();
      toast({
        title: 'Receitas criadas',
        description: count === 1 ? 'Uma receita foi registrada.' : `${count} receitas foram criadas conforme o plano.`,
      });
    } catch (err: any) {
      toast({
        title: 'Erro ao criar receitas do plano',
        description: err.message,
        variant: 'destructive',
      });
      throw err;
    }
  };

  return {
    allRevenue,
    totalReceived,
    totalPending,
    total: totalReceived + totalPending,
    isLoading,
    refresh: fetchAll,
    addManualRevenue,
    addPlanRevenues,
    updateManualRevenue,
    updateManualRevenueStatus,
    deleteManualRevenue,
    fetchRevenueAttachments,
    addRevenueAttachments,
    deleteRevenueAttachment,
  };
};
