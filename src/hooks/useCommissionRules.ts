import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { recordSystemAuditLog } from "@/services/systemAuditLog";

export type CommissionTargetType = "patient" | "professional";
export type CommissionValueType = "percent" | "fixed";

export interface CommissionRule {
  id: string;
  name: string;
  enabled: boolean;
  target_type: CommissionTargetType;
  value_type: CommissionValueType;
  value: number;
  service_id: string | null;
  recipient_patient_ids: string[];
  recipient_attendant_ids: string[];
  created_at: string;
  updated_at: string;
}

export interface CommissionRuleInsert {
  name: string;
  enabled?: boolean;
  target_type: CommissionTargetType;
  value_type: CommissionValueType;
  value: number;
  service_id?: string | null;
  recipient_patient_ids?: string[];
  recipient_attendant_ids?: string[];
}

export const useCommissionRules = () => {
  const [rules, setRules] = useState<CommissionRule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchRules = useCallback(async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from("commission_rules")
        .select("*")
        .order("created_at", { ascending: true });

      if (error) throw error;
      setRules((data ?? []) as CommissionRule[]);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao carregar regras.";
      toast({
        title: "Erro ao carregar",
        description: msg,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchRules();
  }, [fetchRules]);

  const saveRule = async (payload: CommissionRuleInsert): Promise<string | null> => {
    try {
      const { data, error } = await supabase
        .from("commission_rules")
        .insert({
          name: payload.name.trim(),
          enabled: payload.enabled ?? true,
          target_type: payload.target_type,
          value_type: payload.value_type,
          value: Number(payload.value),
          service_id: payload.service_id || null,
          recipient_patient_ids: payload.recipient_patient_ids ?? [],
          recipient_attendant_ids: payload.recipient_attendant_ids ?? [],
        })
        .select("id")
        .single();

      if (error) throw error;
      await fetchRules();

      await recordSystemAuditLog({
        menuGroup: "SISTEMA",
        menu: "Configurações",
        screen: "Configurações - Repasse",
        action: "create",
        entityType: "commission_rule",
        entityId: data?.id ?? null,
        message: "Regra de comissão criada.",
        metadata: { name: payload.name, target_type: payload.target_type },
      });

      toast({ title: "Regra criada", description: `"${payload.name}" foi adicionada.` });
      return data?.id ?? null;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao salvar.";
      toast({ title: "Erro ao salvar", description: msg, variant: "destructive" });
      return null;
    }
  };

  const updateRule = async (
    id: string,
    payload: Partial<CommissionRuleInsert>
  ): Promise<boolean> => {
    try {
      const updates: Record<string, unknown> = {};
      if (payload.name !== undefined) updates.name = payload.name.trim();
      if (payload.enabled !== undefined) updates.enabled = payload.enabled;
      if (payload.target_type !== undefined) updates.target_type = payload.target_type;
      if (payload.value_type !== undefined) updates.value_type = payload.value_type;
      if (payload.value !== undefined) updates.value = Number(payload.value);
      if (payload.service_id !== undefined) updates.service_id = payload.service_id || null;
      if (payload.recipient_patient_ids !== undefined) updates.recipient_patient_ids = payload.recipient_patient_ids ?? [];
      if (payload.recipient_attendant_ids !== undefined) updates.recipient_attendant_ids = payload.recipient_attendant_ids ?? [];

      const { error } = await supabase
        .from("commission_rules")
        .update(updates)
        .eq("id", id);

      if (error) throw error;
      await fetchRules();

      await recordSystemAuditLog({
        menuGroup: "SISTEMA",
        menu: "Configurações",
        screen: "Configurações - Repasse",
        action: "update",
        entityType: "commission_rule",
        entityId: id,
        message: "Regra de comissão atualizada.",
        metadata: updates,
      });

      toast({ title: "Regra atualizada", description: "As alterações foram salvas." });
      return true;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao atualizar.";
      toast({ title: "Erro ao atualizar", description: msg, variant: "destructive" });
      return false;
    }
  };

  const deleteRule = async (id: string): Promise<boolean> => {
    const item = rules.find((r) => r.id === id);
    try {
      const { error } = await supabase.from("commission_rules").delete().eq("id", id);
      if (error) throw error;
      await fetchRules();

      await recordSystemAuditLog({
        menuGroup: "SISTEMA",
        menu: "Configurações",
        screen: "Configurações - Repasse",
        action: "delete",
        entityType: "commission_rule",
        entityId: id,
        message: "Regra de comissão excluída.",
        metadata: { name: item?.name ?? null },
      });

      toast({ title: "Regra excluída", description: "A regra foi removida." });
      return true;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao excluir.";
      toast({ title: "Erro ao excluir", description: msg, variant: "destructive" });
      return false;
    }
  };

  const toggleEnabled = async (id: string, enabled: boolean): Promise<boolean> => {
    return updateRule(id, { enabled });
  };

  return {
    rules,
    isLoading,
    fetchRules,
    saveRule,
    updateRule,
    deleteRule,
    toggleEnabled,
  };
};
