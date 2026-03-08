import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { recordSystemAuditLog } from "@/services/systemAuditLog";

export interface PlanItem {
  id: string;
  name: string;
  value: number;
  sessions: number;
  observations: string | null;
  due_day?: number;
  validity_months?: number | null;
  cycle_start_day?: number;
  service_ids: string[];
  created_at: string;
  updated_at: string;
}

export const usePlans = () => {
  const [plans, setPlans] = useState<PlanItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const normalizeForAudit = useCallback((value: unknown): unknown => {
    if (value === undefined || value === null) return null;
    if (typeof value === "string") {
      const trimmed = value.trim();
      return trimmed === "" ? null : trimmed;
    }
    return value;
  }, []);

  const isEquivalentForAudit = useCallback(
    (a: unknown, b: unknown): boolean =>
      JSON.stringify(normalizeForAudit(a)) === JSON.stringify(normalizeForAudit(b)),
    [normalizeForAudit]
  );

  const fetchPlans = useCallback(async () => {
    try {
      setIsLoading(true);
      const [plansRes, planServicesRes] = await Promise.all([
        supabase.from("plans").select("*").order("name", { ascending: true }),
        supabase.from("plan_services").select("plan_id, service_id"),
      ]);
      if (plansRes.error) throw plansRes.error;
      const planServices = (planServicesRes.data ?? []) as { plan_id: string; service_id: string }[];
      const serviceIdsByPlanId: Record<string, string[]> = {};
      for (const ps of planServices) {
        if (!serviceIdsByPlanId[ps.plan_id]) serviceIdsByPlanId[ps.plan_id] = [];
        serviceIdsByPlanId[ps.plan_id].push(ps.service_id);
      }
      setPlans(
        (plansRes.data ?? []).map((p: Record<string, unknown>) => ({
          id: p.id as string,
          name: p.name as string,
          value: Number(p.value),
          sessions: Number(p.sessions),
          observations: (p.observations as string) ?? null,
          due_day: Number(p.due_day ?? 10),
          validity_months: p.validity_months != null ? Number(p.validity_months) : null,
          cycle_start_day: Number(p.cycle_start_day ?? 1),
          service_ids: serviceIdsByPlanId[p.id as string] ?? [],
          created_at: p.created_at as string,
          updated_at: p.updated_at as string,
        }))
      );
    } catch (err: unknown) {
      console.error("Error fetching plans:", err);
      toast({
        title: "Erro ao carregar planos",
        description: err instanceof Error ? err.message : "Erro desconhecido",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  const addPlan = async (payload: {
    name: string;
    value: number;
    sessions: number;
    observations?: string | null;
    due_day?: number;
    validity_months?: number | null;
    cycle_start_day?: number;
    service_ids?: string[];
  }) => {
    try {
      const { data: newPlan, error } = await supabase
        .from("plans")
        .insert({
          name: payload.name.trim(),
          value: payload.value,
          sessions: payload.sessions,
          observations: payload.observations?.trim() || null,
          due_day: payload.due_day ?? 10,
          validity_months: payload.validity_months ?? null,
          cycle_start_day: payload.cycle_start_day ?? 1,
        })
        .select("id")
        .single();
      if (error) throw error;
      const planId = newPlan?.id as string;
      if (planId && payload.service_ids?.length) {
        await supabase.from("plan_services").insert(
          payload.service_ids.map((service_id) => ({ plan_id: planId, service_id }))
        );
      }
      await fetchPlans();

      await recordSystemAuditLog({
        menuGroup: "SISTEMA",
        menu: "Configurações",
        screen: "Configurações - Plano",
        action: "create",
        entityType: "plan",
        entityId: planId,
        message: "Plano criado.",
        metadata: {
          name: payload.name,
          value: payload.value,
          sessions: payload.sessions,
          dueDay: payload.due_day ?? 10,
          validityMonths: payload.validity_months ?? null,
          cycleStartDay: payload.cycle_start_day ?? 1,
          serviceIds: payload.service_ids ?? [],
        },
      });

      toast({ title: "Plano criado", description: "O plano foi adicionado com sucesso." });
      return true;
    } catch (err: unknown) {
      toast({
        title: "Erro ao criar plano",
        description: err instanceof Error ? err.message : "Erro desconhecido",
        variant: "destructive",
      });
      return false;
    }
  };

  const updatePlan = async (
    id: string,
    payload: {
      name?: string;
      value?: number;
      sessions?: number;
      observations?: string | null;
      due_day?: number;
      validity_months?: number | null;
      cycle_start_day?: number;
      service_ids?: string[];
    }
  ) => {
    try {
      const previous = plans.find((plan) => plan.id === id) ?? null;
      const updates: Record<string, unknown> = {};
      if (payload.name !== undefined) updates.name = payload.name.trim();
      if (payload.value !== undefined) updates.value = payload.value;
      if (payload.sessions !== undefined) updates.sessions = payload.sessions;
      if (payload.observations !== undefined) updates.observations = payload.observations?.trim() || null;
      if (payload.due_day !== undefined) updates.due_day = payload.due_day;
      if (payload.validity_months !== undefined) updates.validity_months = payload.validity_months;
      if (payload.cycle_start_day !== undefined) updates.cycle_start_day = payload.cycle_start_day;

      const comparablePrevious: Record<string, unknown> = {
        name: previous?.name ?? null,
        value: previous?.value ?? null,
        sessions: previous?.sessions ?? null,
        observations: previous?.observations ?? null,
        due_day: previous?.due_day ?? 10,
        validity_months: previous?.validity_months ?? null,
        cycle_start_day: previous?.cycle_start_day ?? 1,
      };

      const changedFields = Object.entries(updates)
        .filter(([key, nextValue]) => !isEquivalentForAudit(comparablePrevious[key], nextValue))
        .map(([key]) => key);

      const changedValues = changedFields.map((field) => ({
        field,
        before: normalizeForAudit(comparablePrevious[field]),
        after: normalizeForAudit((updates as Record<string, unknown>)[field]),
      }));

      if (Object.keys(updates).length > 0) {
        const { error } = await supabase.from("plans").update(updates).eq("id", id);
        if (error) throw error;
      }
      if (payload.service_ids !== undefined) {
        await supabase.from("plan_services").delete().eq("plan_id", id);
        if (payload.service_ids.length > 0) {
          await supabase.from("plan_services").insert(
            payload.service_ids.map((service_id) => ({ plan_id: id, service_id }))
          );
        }

        if (!isEquivalentForAudit(previous?.service_ids ?? [], payload.service_ids)) {
          changedFields.push("service_ids");
          changedValues.push({
            field: "service_ids",
            before: normalizeForAudit(previous?.service_ids ?? []),
            after: normalizeForAudit(payload.service_ids),
          });
        }
      }
      await fetchPlans();

      await recordSystemAuditLog({
        menuGroup: "SISTEMA",
        menu: "Configurações",
        screen: "Configurações - Plano",
        action: "update",
        entityType: "plan",
        entityId: id,
        message: "Plano atualizado.",
        metadata: {
          planName: payload.name ?? previous?.name ?? null,
          updatedFields: changedFields,
          changedValues,
        },
      });

      toast({ title: "Plano atualizado", description: "As alterações foram salvas." });
      return true;
    } catch (err: unknown) {
      toast({
        title: "Erro ao atualizar plano",
        description: err instanceof Error ? err.message : "Erro desconhecido",
        variant: "destructive",
      });
      return false;
    }
  };

  const deletePlan = async (id: string) => {
    try {
      const previous = plans.find((plan) => plan.id === id) ?? null;
      const { error } = await supabase.from("plans").delete().eq("id", id);
      if (error) throw error;
      await fetchPlans();

      await recordSystemAuditLog({
        menuGroup: "SISTEMA",
        menu: "Configurações",
        screen: "Configurações - Plano",
        action: "delete",
        entityType: "plan",
        entityId: id,
        message: "Plano excluído.",
        metadata: {
          name: previous?.name ?? null,
          value: previous?.value ?? null,
          sessions: previous?.sessions ?? null,
          serviceIds: previous?.service_ids ?? [],
        },
      });

      toast({ title: "Plano excluído", description: "O plano foi removido." });
      return true;
    } catch (err: unknown) {
      toast({
        title: "Erro ao excluir plano",
        description: err instanceof Error ? err.message : "Erro desconhecido",
        variant: "destructive",
      });
      return false;
    }
  };

  return {
    plans,
    isLoading,
    refresh: fetchPlans,
    addPlan,
    updatePlan,
    deletePlan,
  };
};
