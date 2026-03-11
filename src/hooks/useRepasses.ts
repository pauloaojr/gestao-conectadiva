import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { recordSystemAuditLog } from "@/services/systemAuditLog";
import type { CommissionRule } from "@/hooks/useCommissionRules";

export type RepasseStatus = "pendente" | "pagar" | "pago";

export interface RepasseRow {
  appointmentId: string;
  /** Data da consulta (appointment_date) */
  date: string;
  /** Data do recebimento (revenue_received_at), formato YYYY-MM-DD ou null */
  revenueReceivedAt: string | null;
  patientId: string | null;
  patientName: string;
  attendantId: string;
  attendantName: string;
  amount: number;
  status: RepasseStatus;
  paidAt: string | null;
}

interface AppointmentForRepasse {
  id: string;
  appointment_date: string;
  appointment_time: string;
  patient_id: string | null;
  patient_name: string;
  attendant_id: string | null;
  attendant_name: string | null;
  service_id: string | null;
  amount: number | null;
  status: string;
  revenue_received_at: string | null;
}

const STATUS_COMPAREceu = "completed";

function computeRepasseAmount(
  revenueAmount: number,
  rules: CommissionRule[],
  attendantId: string,
  attendantProfileId: string | null,
  patientId: string | null,
  serviceId: string | null
): number {
  const matchesRule = (r: CommissionRule) => {
    if (!r.enabled) return false;
    const attendantOk =
      !r.recipient_attendant_ids?.length ||
      (attendantProfileId && r.recipient_attendant_ids.includes(attendantProfileId));
    const patientOk =
      !r.recipient_patient_ids?.length ||
      (patientId && r.recipient_patient_ids.includes(patientId));
    const serviceOk = !r.service_id || r.service_id === serviceId;
    if (r.target_type === "professional") {
      return attendantOk && patientOk && serviceOk;
    }
    if (r.target_type === "patient") {
      return patientOk && attendantOk && serviceOk;
    }
    return false;
  };
  const applicable = rules.filter(matchesRule);
  if (applicable.length === 0) return 0;
  const rule = applicable[0];
  if (rule.value_type === "percent") return (revenueAmount * Number(rule.value)) / 100;
  return Number(rule.value);
}

export function useRepasses() {
  const [rows, setRows] = useState<RepasseRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchData = useCallback(
    async (params: {
      periodFrom: string;
      periodTo: string;
      periodBy?: "appointment_date" | "revenue_received_at";
      patientId: string | null;
      attendantId: string | null;
      statusFilter: RepasseStatus | "";
      rules: CommissionRule[];
      attendantIdToProfileId: Map<string, string>;
    }) => {
      const { periodFrom, periodTo, periodBy = "appointment_date", patientId, attendantId, statusFilter, rules, attendantIdToProfileId } = params;
      try {
        setIsLoading(true);
        const byReceipt = periodBy === "revenue_received_at";
        const fromTs = `${periodFrom.slice(0, 10)}T00:00:00`;
        const toTs = `${periodTo.slice(0, 10)}T23:59:59.999`;
        let appointmentsQuery = supabase
          .from("appointments")
          .select("id, appointment_date, appointment_time, patient_id, patient_name, attendant_id, attendant_name, service_id, amount, status, revenue_received_at")
          .not("revenue_received_at", "is", null)
          .not("attendant_id", "is", null);
        if (byReceipt) {
          appointmentsQuery = appointmentsQuery.gte("revenue_received_at", fromTs).lte("revenue_received_at", toTs);
        } else {
          appointmentsQuery = appointmentsQuery.gte("appointment_date", periodFrom.slice(0, 10)).lte("appointment_date", periodTo.slice(0, 10));
        }
        const [appointmentsRes, repassePaidRes, servicesRes, patientsRes, plansRes] = await Promise.all([
          appointmentsQuery,
          supabase.from("repasse_paid").select("appointment_id, paid_at"),
          supabase.from("services").select("id, price"),
          supabase.from("patients").select("id, plan_id"),
          supabase.from("plans").select("id, value, sessions"),
        ]);

        if (appointmentsRes.error) throw appointmentsRes.error;
        if (repassePaidRes.error) throw repassePaidRes.error;
        if (servicesRes.error) throw servicesRes.error;
        if (patientsRes.error) throw patientsRes.error;
        if (plansRes.error) throw plansRes.error;

        const appointments = (appointmentsRes.data ?? []) as AppointmentForRepasse[];
        const appointmentIds = appointments.map((a) => a.id);
        let revenueReceivedAtByAppointmentId = new Map<string, string>();
        if (appointmentIds.length > 0) {
          const revenueRes = await supabase
            .from("revenue")
            .select("appointment_id, received_at")
            .in("appointment_id", appointmentIds);
          if (!revenueRes.error && revenueRes.data?.length) {
            revenueReceivedAtByAppointmentId = new Map(
              (revenueRes.data as { appointment_id: string; received_at: string | null }[])
                .filter((r) => r.received_at)
                .map((r) => [r.appointment_id, String(r.received_at).slice(0, 10)])
            );
          }
        }
        const paidSet = new Set((repassePaidRes.data ?? []).map((r: { appointment_id: string }) => r.appointment_id));
        const paidAtMap = new Map(
          (repassePaidRes.data ?? []).map((r: { appointment_id: string; paid_at: string }) => [r.appointment_id, r.paid_at])
        );
        const servicePriceById = new Map<string, number>(
          (servicesRes.data ?? []).map((s: { id: string; price: number }) => [s.id, Number(s.price) || 0])
        );

        const plansById = new Map<string, { value: number; sessions: number }>(
          (plansRes.data ?? []).map((p: { id: string; value: number; sessions: number }) => [
            p.id,
            { value: Number(p.value) || 0, sessions: Math.max(1, Number(p.sessions) || 1) },
          ])
        );
        const patientPlanId = new Map<string, string>(
          (patientsRes.data ?? [])
            .filter((pt: { plan_id: string | null }) => pt.plan_id)
            .map((pt: { id: string; plan_id: string }) => [pt.id, pt.plan_id])
        );
        const valuePerSessionByPatientId = new Map<string, number>();
        patientPlanId.forEach((planId, patientId) => {
          const plan = plansById.get(planId);
          if (plan && plan.sessions > 0) {
            valuePerSessionByPatientId.set(patientId, plan.value / plan.sessions);
          }
        });

        let list: RepasseRow[] = appointments.map((apt) => {
          const aid = apt.attendant_id!;
          const profileId = attendantIdToProfileId.get(aid) ?? null;
          let revenueAmount: number;
          const planValuePerSession = apt.patient_id ? valuePerSessionByPatientId.get(apt.patient_id) : undefined;
          if (planValuePerSession !== undefined && planValuePerSession > 0) {
            revenueAmount = planValuePerSession;
          } else {
            revenueAmount = Number(apt.amount) || 0;
            if (revenueAmount <= 0 && apt.service_id) {
              revenueAmount = servicePriceById.get(apt.service_id) ?? 0;
            }
          }
          const amount = computeRepasseAmount(
            revenueAmount,
            rules,
            aid,
            profileId,
            apt.patient_id,
            apt.service_id
          );
          let status: RepasseStatus = "pendente";
          if (paidSet.has(apt.id)) status = "pago";
          else if (apt.status === STATUS_COMPAREceu) status = "pagar";

          let patientName = (apt.patient_name || "").trim();
          if (!patientName) patientName = "—";
          const attendantName = (apt.attendant_name || "").trim() || "—";

          const revAt =
            revenueReceivedAtByAppointmentId.get(apt.id) ??
            (apt.revenue_received_at ? String(apt.revenue_received_at).slice(0, 10) : null) ??
            null;
          return {
            appointmentId: apt.id,
            date: apt.appointment_date,
            revenueReceivedAt: revAt,
            patientId: apt.patient_id,
            patientName,
            attendantId: aid,
            attendantName,
            amount,
            status,
            paidAt: paidAtMap.get(apt.id) ?? null,
          };
        });

        if (patientId) list = list.filter((r) => r.patientId === patientId);
        if (attendantId) list = list.filter((r) => r.attendantId === attendantId);
        if (statusFilter) list = list.filter((r) => r.status === statusFilter);

        list.sort((a, b) => b.date.localeCompare(a.date));
        setRows(list);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Erro ao carregar repasses.";
        toast({ title: "Erro", description: msg, variant: "destructive" });
        setRows([]);
      } finally {
        setIsLoading(false);
      }
    },
    [toast]
  );

  const setRepassePago = useCallback(
    async (
      appointmentId: string,
      asPago: boolean,
      context?: { patientName?: string; attendantName?: string; amount?: number }
    ): Promise<boolean> => {
      try {
        if (asPago) {
          const { error } = await supabase.from("repasse_paid").upsert(
            { appointment_id: appointmentId },
            { onConflict: "appointment_id" }
          );
          if (error) throw error;
          await recordSystemAuditLog({
            menuGroup: "RELATORIOS",
            menu: "Repasses",
            screen: "Relatório Repasses",
            action: "update",
            entityType: "repasse",
            entityId: appointmentId,
            message: "Repasse marcado como Pago.",
            metadata: {
              appointmentId,
              patientName: context?.patientName ?? null,
              attendantName: context?.attendantName ?? null,
              amount: context?.amount ?? null,
              previousStatus: "pagar",
              newStatus: "pago",
            },
          });
          toast({ title: "Repasse marcado como Pago." });
        } else {
          const { error } = await supabase.from("repasse_paid").delete().eq("appointment_id", appointmentId);
          if (error) throw error;
          await recordSystemAuditLog({
            menuGroup: "RELATORIOS",
            menu: "Repasses",
            screen: "Relatório Repasses",
            action: "update",
            entityType: "repasse",
            entityId: appointmentId,
            message: "Repasse voltou para Pagar.",
            metadata: {
              appointmentId,
              patientName: context?.patientName ?? null,
              attendantName: context?.attendantName ?? null,
              amount: context?.amount ?? null,
              previousStatus: "pago",
              newStatus: "pagar",
            },
          });
          toast({ title: "Repasse voltou para Pagar." });
        }
        return true;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Erro ao atualizar.";
        toast({ title: "Erro", description: msg, variant: "destructive" });
        return false;
      }
    },
    [toast]
  );

  return { rows, isLoading, fetchData, setRepassePago };
}
