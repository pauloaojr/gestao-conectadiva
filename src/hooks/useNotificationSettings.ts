import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { recordSystemAuditLog } from "@/services/systemAuditLog";

export type NotificationChannel = "whatsapp" | "email";
export type NotificationService = "agenda" | "financeiro" | "aniversario";
export type NotificationTiming = "before" | "after";
export type NotificationRecipientTarget = "patient" | "professional";
export type NotificationEventKey =
  | "agendamento_criado"
  | "agendamento_confirmado"
  | "agendamento_cancelado"
  | "lembrete_consulta"
  | "conta_criada"
  | "conta_vencendo"
  | "conta_vencida"
  | "pagamento_confirmado"
  | "aniversario";

export type NotificationRule = {
  id?: string;
  name: string;
  enabled: boolean;
  channels: NotificationChannel[];
  service: NotificationService;
  recipientTarget: NotificationRecipientTarget;
  eventKey: NotificationEventKey;
  message: string;
  mediaUrl: string;
  timing: NotificationTiming;
  hours: number;
  /** Hora do envio no dia (HH:mm), usado quando service === "aniversario" */
  sendTime: string;
  sortOrder: number;
  version: number;
  updatedAt: string | null;
};

export const DEFAULT_NOTIFICATION_RULE: NotificationRule = {
  name: "Nova regra",
  enabled: true,
  channels: [],
  service: "agenda",
  recipientTarget: "patient",
  eventKey: "agendamento_criado",
  message: "",
  mediaUrl: "",
  timing: "before",
  hours: 1,
  sendTime: "09:00",
  sortOrder: 0,
  version: 1,
  updatedAt: null,
};

function normalizeEventByService(
  service: NotificationService,
  eventKey: string
): NotificationEventKey {
  const agendaEvents: NotificationEventKey[] = [
    "agendamento_criado",
    "agendamento_confirmado",
    "agendamento_cancelado",
    "lembrete_consulta",
  ];
  const financeiroEvents: NotificationEventKey[] = [
    "conta_criada",
    "conta_vencendo",
    "conta_vencida",
    "pagamento_confirmado",
  ];
  const aniversarioEvents: NotificationEventKey[] = ["aniversario"];
  const allowed =
    service === "agenda"
      ? agendaEvents
      : service === "financeiro"
      ? financeiroEvents
      : aniversarioEvents;
  return allowed.includes(eventKey as NotificationEventKey)
    ? (eventKey as NotificationEventKey)
    : allowed[0];
}

function rowToRule(row: {
  id: string;
  name: string;
  enabled: boolean;
  channels: string[];
  service: string;
  event_key: string;
  recipient_target: string;
  message: string;
  media_url: string | null;
  timing: string;
  hours: number;
  sort_order: number;
  version: number;
  updated_at: string;
  send_time?: string | null;
}): NotificationRule {
  const channels = (row.channels || []).filter(
    (channel): channel is NotificationChannel => channel === "whatsapp" || channel === "email"
  );
  const service: NotificationService =
    row.service === "financeiro"
      ? "financeiro"
      : row.service === "aniversario"
      ? "aniversario"
      : "agenda";

  const sendTime =
    service === "aniversario" && row.send_time && /^\d{1,2}:\d{2}$/.test(row.send_time.trim())
      ? row.send_time.trim()
      : "09:00";

  return {
    id: row.id,
    name: row.name || "Nova regra",
    enabled: row.enabled,
    channels,
    service,
    recipientTarget:
      row.recipient_target === "professional" ? "professional" : "patient",
    eventKey: normalizeEventByService(service, row.event_key),
    message: row.message ?? "",
    mediaUrl: row.media_url ?? "",
    timing: row.timing === "after" ? "after" : "before",
    hours: Number.isFinite(row.hours) ? row.hours : 1,
    sendTime,
    sortOrder: Number.isFinite(row.sort_order) ? row.sort_order : 0,
    version: Number.isFinite(row.version) ? row.version : 1,
    updatedAt: row.updated_at ?? null,
  };
}

export const useNotificationSettings = () => {
  const { toast } = useToast();
  const [rules, setRules] = useState<NotificationRule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const normalizeForAudit = (value: unknown): unknown => {
    if (value === undefined || value === null) return null;
    if (typeof value === "string") {
      const trimmed = value.trim();
      return trimmed === "" ? null : trimmed;
    }
    return value;
  };

  const isEquivalentForAudit = (a: unknown, b: unknown): boolean =>
    JSON.stringify(normalizeForAudit(a)) === JSON.stringify(normalizeForAudit(b));

  const fetchRules = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from("notification_settings")
        .select(
          "id, name, enabled, channels, service, recipient_target, event_key, message, media_url, timing, hours, sort_order, version, updated_at, send_time"
        )
        .order("sort_order", { ascending: true })
        .order("updated_at", { ascending: false });

      if (fetchError) throw fetchError;

      setRules((data || []).map(rowToRule));
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Erro ao carregar configurações de notificações.";
      console.error("Error fetching notification_settings:", err);
      setError(message);
      setRules([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRules();
  }, [fetchRules]);

  const saveRule = useCallback(
    async (
      payload: NotificationRule,
      options?: {
        successTitle?: string;
        successDescription?: string;
      }
    ) => {
      try {
        const previous = payload.id
          ? rules.find((rule) => rule.id === payload.id) ?? null
          : null;

        const row = {
          name: payload.name.trim() || "Nova regra",
          enabled: payload.enabled,
          channels: payload.channels,
          service: payload.service,
          recipient_target: payload.recipientTarget,
          event_key: payload.eventKey,
          message: payload.message,
          media_url: payload.mediaUrl || null,
          timing: payload.timing,
          hours: payload.hours,
          sort_order: payload.sortOrder,
          send_time:
            payload.service === "aniversario" && payload.sendTime
              ? payload.sendTime.trim()
              : null,
        };

        const selectFields =
          "id, name, enabled, channels, service, recipient_target, event_key, message, media_url, timing, hours, sort_order, version, updated_at, send_time";

        if (payload.id) {
          const changedFields = Object.entries(row)
            .filter(([key, nextValue]) => {
              const previousValue = previous
                ? (previous as unknown as Record<string, unknown>)[
                    key === "recipient_target"
                      ? "recipientTarget"
                      : key === "event_key"
                      ? "eventKey"
                      : key === "media_url"
                      ? "mediaUrl"
                      : key === "send_time"
                      ? "sendTime"
                      : key
                  ]
                : undefined;
              return !isEquivalentForAudit(previousValue, nextValue);
            })
            .map(([key]) => key);

          const changedValues = changedFields.map((field) => {
            const previousKey =
              field === "recipient_target"
                ? "recipientTarget"
                : field === "event_key"
                ? "eventKey"
                : field === "media_url"
                ? "mediaUrl"
                : field === "send_time"
                ? "sendTime"
                : field;
            const previousValue = previous
              ? (previous as unknown as Record<string, unknown>)[previousKey]
              : undefined;
            const nextValue = (row as unknown as Record<string, unknown>)[field];
            return {
              field,
              before: normalizeForAudit(previousValue),
              after: normalizeForAudit(nextValue),
            };
          });

          const { data, error: updateError } = await supabase
            .from("notification_settings")
            .update(row)
            .eq("id", payload.id)
            .select(selectFields)
            .single();

          if (updateError) throw updateError;
          if (data) {
            const updated = rowToRule(data);
            setRules((prev) =>
              prev
                .map((item) => (item.id === updated.id ? updated : item))
                .sort((a, b) => a.sortOrder - b.sortOrder)
            );

            await recordSystemAuditLog({
              menuGroup: "SISTEMA",
              menu: "Configurações",
              screen: "Configurações - Notificações",
              action: "update",
              entityType: "notification_rule",
              entityId: updated.id ?? null,
              message: "Regra de notificação atualizada.",
              metadata: {
                ruleName: updated.name,
                service: updated.service,
                eventKey: updated.eventKey,
                updatedFields: changedFields,
                changedValues,
              },
            });
          }
        } else {
          const { data, error: insertError } = await supabase
            .from("notification_settings")
            .insert(row)
            .select(selectFields)
            .single();

          if (insertError) throw insertError;
          if (data) {
            const created = rowToRule(data);
            setRules((prev) =>
              [...prev, created].sort((a, b) => a.sortOrder - b.sortOrder)
            );

            await recordSystemAuditLog({
              menuGroup: "SISTEMA",
              menu: "Configurações",
              screen: "Configurações - Notificações",
              action: "create",
              entityType: "notification_rule",
              entityId: created.id ?? null,
              message: "Regra de notificação criada.",
              metadata: {
                ruleName: created.name,
                service: created.service,
                eventKey: created.eventKey,
                enabled: created.enabled,
                channels: created.channels,
                timing: created.timing,
                hours: created.hours,
              },
            });
          }
        }

        toast({
          title: options?.successTitle ?? "Notificações salvas",
          description:
            options?.successDescription ??
            "A regra de notificação foi salva no banco com versionamento.",
        });
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : "Não foi possível salvar as configurações de notificação.";
        toast({
          title: "Erro ao salvar",
          description: message,
          variant: "destructive",
        });
        throw err;
      }
    },
    [toast]
  );

  const deleteRule = useCallback(
    async (id: string) => {
      const previous = rules.find((item) => item.id === id) ?? null;
      const { error: deleteError } = await supabase
        .from("notification_settings")
        .delete()
        .eq("id", id);

      if (deleteError) throw deleteError;
      setRules((prev) => prev.filter((item) => item.id !== id));

      await recordSystemAuditLog({
        menuGroup: "SISTEMA",
        menu: "Configurações",
        screen: "Configurações - Notificações",
        action: "delete",
        entityType: "notification_rule",
        entityId: id,
        message: "Regra de notificação excluída.",
        metadata: {
          ruleName: previous?.name ?? null,
          service: previous?.service ?? null,
          eventKey: previous?.eventKey ?? null,
        },
      });
      toast({
        title: "Regra removida",
        description: "A regra foi excluída com sucesso.",
      });
    },
    [toast]
  );

  const getNextSortOrder = useCallback(() => {
    if (rules.length === 0) return 1;
    return Math.max(...rules.map((item) => item.sortOrder || 0)) + 1;
  }, [rules]);

  const createEmptyRule = useCallback(
    (service: NotificationService = "agenda"): NotificationRule => ({
      ...DEFAULT_NOTIFICATION_RULE,
      service,
      eventKey:
        service === "agenda"
          ? "agendamento_criado"
          : service === "financeiro"
          ? "conta_criada"
          : "aniversario",
      sortOrder: getNextSortOrder(),
    }),
    [getNextSortOrder]
  );

  // API estável do hook para reduzir efeitos colaterais em componentes consumidores.
  const api = useMemo(
    () => ({
      rules,
      isLoading,
      error,
      fetchRules,
      saveRule,
      deleteRule,
      getNextSortOrder,
      createEmptyRule,
    }),
    [
      rules,
      isLoading,
      error,
      fetchRules,
      saveRule,
      deleteRule,
      getNextSortOrder,
      createEmptyRule,
    ]
  );

  return api;
};
