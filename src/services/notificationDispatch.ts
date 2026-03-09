import { supabase } from "@/integrations/supabase/client";
import {
  NotificationEventKey,
  NotificationService,
  NotificationRule,
} from "@/hooks/useNotificationSettings";
import {
  normalizeTimezoneConfig,
  parseDateTimeInTimezone,
  withRuntimePlaceholders,
} from "@/lib/notificationRuntimePlaceholders";
import {
  parseNotificationMediaUrl,
  getFirstMediaItem,
  getEvolutionMediaType,
  normalizeMediaForEvolutionApi,
} from "@/lib/notificationMedia";
import { normalizeFinancialContextPlaceholders } from "@/lib/financialNotificationPlaceholders";
import { addHours, differenceInMinutes } from "date-fns";

type DispatchRecipient = {
  patientId?: string | null;
  attendantId?: string | null;
  email?: string | null;
  phone?: string | null;
};

type DispatchContext = Record<string, string | number | null | undefined>;

type DispatchInput = {
  service: NotificationService;
  eventKey: NotificationEventKey;
  recipient: DispatchRecipient;
  context: DispatchContext;
  dedupeKey?: string;
};

type EvolutionConfigRow = {
  enabled: boolean;
  base_url: string;
  token: string;
  default_phone_country_code: string;
};

type EmailConfigRow = {
  enabled: boolean;
  host: string;
  port: number;
  use_tls: boolean;
  username: string;
  password: string;
  from_name: string;
  from_email: string;
  backend_url: string | null;
};

const CHANNELS = ["email", "whatsapp"] as const;
const MAX_RETRY_ATTEMPTS = 3;
const RETRY_BACKOFF_MS = [800, 1600];
const ESTABLISHMENT_TIMEZONE_CACHE_TTL_MS = 5 * 60 * 1000;
const FINANCIAL_STATUS_LABEL_CACHE_TTL_MS = 5 * 60 * 1000;
let establishmentTimezoneCache: { value: string | null; expiresAt: number } | null =
  null;
const financialStatusLabelCache = new Map<
  string,
  { value: string; expiresAt: number }
>();

function toTemplateValue(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  return String(value);
}

function applyTemplate(
  template: string,
  context: DispatchContext,
  timezone?: string | null
): string {
  const resolvedContext = withRuntimePlaceholders(context, { timezone }) as DispatchContext;
  return template.replace(/\{\{([a-zA-Z0-9_]+)\}\}/g, (_, key: string) =>
    toTemplateValue(resolvedContext[key])
  );
}

async function loadEstablishmentTimezone(): Promise<string | null> {
  const now = Date.now();
  if (establishmentTimezoneCache && establishmentTimezoneCache.expiresAt > now) {
    return establishmentTimezoneCache.value;
  }

  const { data, error } = await supabase
    .from("establishments")
    .select("timezone")
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("loadEstablishmentTimezone error:", error);
    return null;
  }

  const value = data?.timezone?.trim() || null;
  establishmentTimezoneCache = {
    value,
    expiresAt: now + ESTABLISHMENT_TIMEZONE_CACHE_TTL_MS,
  };
  return value;
}

async function resolveFinancialStatusLabel(statusKey: string): Promise<string> {
  const key = statusKey.trim();
  if (!key) return "";

  const now = Date.now();
  const cached = financialStatusLabelCache.get(key);
  if (cached && cached.expiresAt > now) return cached.value;

  const { data, error } = await supabase
    .from("financial_status_config")
    .select("label")
    .eq("key", key)
    .in("applies_to", ["revenue", "both"])
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("resolveFinancialStatusLabel error:", error);
    return key;
  }

  const label = data?.label?.trim() || key;
  financialStatusLabelCache.set(key, {
    value: label,
    expiresAt: now + FINANCIAL_STATUS_LABEL_CACHE_TTL_MS,
  });
  return label;
}

async function normalizeBusinessContext(
  service: NotificationService,
  context: DispatchContext
): Promise<DispatchContext> {
  if (service !== "financeiro") return context;

  const statusLabel = await resolveFinancialStatusLabel(
    String(context.status_pagamento ?? "")
  );

  return {
    ...normalizeFinancialContextPlaceholders(context, statusLabel),
  };
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error || "Erro desconhecido");
}

function isTransientErrorMessage(message: string): boolean {
  const msg = message.toLowerCase();
  return (
    msg.includes("timeout") ||
    msg.includes("timed out") ||
    msg.includes("network") ||
    msg.includes("fetch") ||
    msg.includes("tempor") ||
    msg.includes("too many requests") ||
    msg.includes("http 429") ||
    msg.includes("http 500") ||
    msg.includes("http 502") ||
    msg.includes("http 503") ||
    msg.includes("http 504")
  );
}

async function executeWithRetry(
  sendFn: () => Promise<unknown>
): Promise<{ response: unknown; attempts: number; retried: boolean }> {
  let attempts = 0;
  let lastError: unknown;

  while (attempts < MAX_RETRY_ATTEMPTS) {
    attempts += 1;
    try {
      const response = await sendFn();
      return {
        response,
        attempts,
        retried: attempts > 1,
      };
    } catch (error) {
      lastError = error;
      const message = getErrorMessage(error);
      const transient = isTransientErrorMessage(message);
      if (!transient || attempts >= MAX_RETRY_ATTEMPTS) {
        const finalError = error instanceof Error ? error : new Error(message);
        (finalError as Error & { attempts?: number }).attempts = attempts;
        throw finalError;
      }
      const backoff =
        RETRY_BACKOFF_MS[Math.min(attempts - 1, RETRY_BACKOFF_MS.length - 1)];
      await sleep(backoff);
    }
  }

  const exhausted =
    lastError instanceof Error
      ? lastError
      : new Error(getErrorMessage(lastError));
  (exhausted as Error & { attempts?: number }).attempts = MAX_RETRY_ATTEMPTS;
  throw exhausted;
}

async function resolveRecipient(
  recipient: DispatchRecipient,
  target: "patient" | "professional"
): Promise<{ email: string; phone: string }> {
  const currentEmail = recipient.email?.trim() || "";
  const currentPhone = recipient.phone?.trim() || "";

  if (!currentEmail || !currentPhone) {
    if (target === "professional" && recipient.attendantId) {
      const { data } = await supabase
        .from("profiles")
        .select("email, phone")
        .or(`user_id.eq.${recipient.attendantId},id.eq.${recipient.attendantId}`)
        .limit(1)
        .maybeSingle();

      return {
        email: currentEmail || data?.email?.trim() || "",
        phone: currentPhone || data?.phone?.trim() || "",
      };
    }

    if (target === "patient" && recipient.patientId) {
      const { data } = await supabase
        .from("patients")
        .select("email, phone")
        .eq("id", recipient.patientId)
        .maybeSingle();

      return {
        email: currentEmail || data?.email?.trim() || "",
        phone: currentPhone || data?.phone?.trim() || "",
      };
    }
  }

  return { email: currentEmail, phone: currentPhone };
}

function normalizePhone(rawPhone: string, defaultCountryCode: string): string {
  const digits = rawPhone.replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith(defaultCountryCode)) return digits;
  return `${defaultCountryCode}${digits}`;
}

async function loadActiveRules(
  service: NotificationService,
  eventKey: NotificationEventKey
): Promise<NotificationRule[]> {
  const { data, error } = await supabase
    .from("notification_settings")
    .select(
      "id, name, enabled, channels, service, recipient_target, event_key, message, media_url, timing, hours, sort_order, version, updated_at"
    )
    .eq("enabled", true)
    .eq("service", service)
    .eq("event_key", eventKey)
    .order("sort_order", { ascending: true });

  if (error) {
    throw error;
  }

  return (data || []).map((row) => ({
    id: row.id,
    name: row.name || "Nova regra",
    enabled: row.enabled,
    channels: (row.channels || []).filter(
      (channel): channel is "email" | "whatsapp" =>
        channel === "email" || channel === "whatsapp"
    ),
    service: row.service === "financeiro" ? "financeiro" : "agenda",
    recipientTarget:
      row.recipient_target === "professional" ? "professional" : "patient",
    eventKey:
      row.event_key === "agendamento_confirmado" ||
      row.event_key === "agendamento_cancelado" ||
      row.event_key === "lembrete_consulta" ||
      row.event_key === "conta_criada" ||
      row.event_key === "conta_vencendo" ||
      row.event_key === "conta_vencida" ||
      row.event_key === "pagamento_confirmado"
        ? row.event_key
        : "agendamento_criado",
    message: row.message || "",
    mediaUrl: row.media_url || "",
    timing: row.timing === "after" ? "after" : "before",
    hours: Number(row.hours) || 0,
    sortOrder: Number(row.sort_order) || 0,
    version: Number(row.version) || 1,
    updatedAt: row.updated_at ?? null,
  }));
}

async function logDispatch(params: {
  notificationSettingsId: string | null;
  service: NotificationService;
  eventKey: NotificationEventKey;
  channel: (typeof CHANNELS)[number];
  recipient: string;
  status: "success" | "failed";
  errorMessage?: string;
  payload: DispatchContext;
  dedupeKey?: string;
  providerResponse?: unknown;
}) {
  const { error } = await supabase.from("notification_dispatch_logs").insert({
    notification_settings_id: params.notificationSettingsId,
    service: params.service,
    event_key: params.eventKey,
    channel: params.channel,
    recipient: params.recipient || "-",
    status: params.status,
    error_message: params.errorMessage ?? null,
    dedupe_key: params.dedupeKey ?? null,
    payload_json: params.payload,
    provider_response_json:
      params.providerResponse == null ? null : params.providerResponse,
  });
  if (error) {
    console.error("logDispatch insert error:", error);
  }
}

async function hasSuccessfulDispatchForDedupe(
  notificationSettingsId: string | null,
  channel: (typeof CHANNELS)[number],
  dedupeKey?: string
) {
  if (!notificationSettingsId || !dedupeKey) return false;

  const { data, error } = await supabase
    .from("notification_dispatch_logs")
    .select("id")
    .eq("notification_settings_id", notificationSettingsId)
    .eq("channel", channel)
    .eq("dedupe_key", dedupeKey)
    .eq("status", "success")
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("hasSuccessfulDispatchForDedupe error:", error);
    return false;
  }

  return !!data;
}

async function sendEmail(
  rule: NotificationRule,
  recipientEmail: string,
  message: string
) {
  const { data, error } = await supabase
    .from("email_smtp_config")
    .select(
      "enabled, host, port, use_tls, username, password, from_name, from_email, backend_url"
    )
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  const emailCfg = data as EmailConfigRow | null;

  if (!emailCfg?.enabled) {
    throw new Error("Integração de e-mail desativada.");
  }
  if (!emailCfg.backend_url?.trim()) {
    throw new Error("URL do backend de e-mail não configurada.");
  }

  const baseUrl = emailCfg.backend_url.replace(/\/+$/, "");
  const response = await fetch(`${baseUrl}/api/email/send`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      config: {
        host: emailCfg.host,
        port: emailCfg.port,
        useTls: emailCfg.use_tls,
        username: emailCfg.username,
        password: emailCfg.password,
        fromName: emailCfg.from_name,
        fromEmail: emailCfg.from_email,
      },
      toEmail: recipientEmail,
      subject: `${rule.name} - Clinica Pro`,
      text: message,
      mediaUrl: (() => {
        const items = parseNotificationMediaUrl(rule.mediaUrl);
        return items.length > 0 ? items[0].url : (rule.mediaUrl || null);
      })(),
    }),
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok || body?.error) {
    throw new Error(body?.details || body?.error || `Erro HTTP ${response.status}`);
  }

  return body;
}

async function resolveDefaultEvolutionInstance(
  baseUrl: string,
  token: string
): Promise<string> {
  const response = await fetch(`${baseUrl.replace(/\/+$/, "")}/instance/fetchInstances`, {
    method: "GET",
    headers: {
      apikey: token,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Falha ao consultar instâncias WhatsApp: ${text.slice(0, 160)}`);
  }

  const data = await response.json().catch(() => null);
  const items = Array.isArray(data)
    ? data
    : Array.isArray(data?.response)
    ? data.response
    : Array.isArray(data?.instances)
    ? data.instances
    : [];

  for (const item of items) {
    const source = item?.instance ?? item;
    const name =
      source?.instanceName ?? source?.instance_name ?? source?.name ?? null;
    const status =
      source?.connectionStatus ?? source?.status ?? source?.connectionState ?? "";
    if (name && String(status).toLowerCase() === "open") {
      return String(name);
    }
  }

  const first = items[0]?.instance ?? items[0];
  const fallback =
    first?.instanceName ?? first?.instance_name ?? first?.name ?? null;
  if (!fallback) {
    throw new Error("Nenhuma instância WhatsApp disponível para envio.");
  }

  return String(fallback);
}

type WhatsAppMediaItem = { url: string; name: string; type: string } | null;

async function sendWhatsApp(
  message: string,
  recipientPhone: string,
  firstMedia: WhatsAppMediaItem
) {
  const { data, error } = await supabase
    .from("evolution_api_config")
    .select("enabled, base_url, token, default_phone_country_code")
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  const evoCfg = data as EvolutionConfigRow | null;

  if (!evoCfg?.enabled) {
    throw new Error("Integração WhatsApp desativada.");
  }
  if (!evoCfg.base_url?.trim() || !evoCfg.token?.trim()) {
    throw new Error("Base URL/token da Evolution API não configurados.");
  }

  const instanceName = await resolveDefaultEvolutionInstance(
    evoCfg.base_url,
    evoCfg.token
  );
  const to = normalizePhone(recipientPhone, evoCfg.default_phone_country_code || "55");
  if (!to) {
    throw new Error("Telefone do destinatário inválido.");
  }

  const base = evoCfg.base_url.replace(/\/+$/, "");
  const headers = {
    apikey: evoCfg.token,
    "Content-Type": "application/json",
  };

  if (firstMedia?.url) {
    const mediatype = getEvolutionMediaType(firstMedia);
    const mimetype = firstMedia.type || (mediatype === "image" ? "image/jpeg" : "application/octet-stream");
    const fileName = firstMedia.name?.trim() || (mediatype === "image" ? "image.jpg" : "arquivo");
    const mediaValue = normalizeMediaForEvolutionApi(firstMedia.url);
    const response = await fetch(`${base}/message/sendMedia/${encodeURIComponent(instanceName)}`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        number: to,
        mediatype,
        mimetype,
        caption: message ?? "",
        media: mediaValue,
        fileName,
        delay: 1200,
      }),
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      const detail = body?.message ?? body?.error ?? (typeof body === "object" ? JSON.stringify(body) : String(body));
      const msg = detail ? `Erro HTTP ${response.status} no envio de mídia WhatsApp: ${detail}` : `Erro HTTP ${response.status} no envio de mídia WhatsApp.`;
      throw new Error(msg);
    }
    return body;
  }

  const response = await fetch(`${base}/message/sendText/${encodeURIComponent(instanceName)}`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      number: to,
      text: message,
      delay: 1200,
    }),
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(body?.message || `Erro HTTP ${response.status} no envio WhatsApp.`);
  }

  return body;
}

export async function dispatchNotificationEvent(input: DispatchInput) {
  try {
    const rules = await loadActiveRules(input.service, input.eventKey);
    if (rules.length === 0) return;

    const establishmentTimezone = normalizeTimezoneConfig(
      await loadEstablishmentTimezone()
    );
    const businessContext = await normalizeBusinessContext(
      input.service,
      input.context
    );
    const resolvedContext = withRuntimePlaceholders(businessContext, {
      timezone: establishmentTimezone,
    }) as DispatchContext;
    const payloadForLog: DispatchContext = {
      ...resolvedContext,
      timezone_aplicado: establishmentTimezone,
    };
    for (const rule of rules) {
      const recipient = await resolveRecipient(input.recipient, rule.recipientTarget);
      const message = applyTemplate(
        rule.message,
        resolvedContext,
        establishmentTimezone
      );
      for (const channel of rule.channels) {
        const dedupeKey = input.dedupeKey
          ? `${input.dedupeKey}:${rule.id ?? "rule"}:${channel}`
          : undefined;
        try {
          const alreadySent = await hasSuccessfulDispatchForDedupe(
            rule.id ?? null,
            channel,
            dedupeKey
          );
          if (alreadySent) continue;

          if (channel === "email") {
            if (!recipient.email) {
              throw new Error(
                rule.recipientTarget === "professional"
                  ? "Profissional sem e-mail."
                  : "Paciente sem e-mail."
              );
            }
            const result = await executeWithRetry(() =>
              sendEmail(rule, recipient.email, message)
            );
            await logDispatch({
              notificationSettingsId: rule.id ?? null,
              service: input.service,
              eventKey: input.eventKey,
              channel,
              recipient: recipient.email,
              status: "success",
              payload: payloadForLog,
              dedupeKey,
              providerResponse: {
                attempts: result.attempts,
                retried: result.retried,
                response: result.response,
              },
            });
            continue;
          }

          if (channel === "whatsapp") {
            if (!recipient.phone) {
              throw new Error(
                rule.recipientTarget === "professional"
                  ? "Profissional sem telefone."
                  : "Paciente sem telefone."
              );
            }
            const firstMedia = getFirstMediaItem(rule.mediaUrl);
            const result = await executeWithRetry(() =>
              sendWhatsApp(message, recipient.phone, firstMedia)
            );
            await logDispatch({
              notificationSettingsId: rule.id ?? null,
              service: input.service,
              eventKey: input.eventKey,
              channel,
              recipient: recipient.phone,
              status: "success",
              payload: payloadForLog,
              dedupeKey,
              providerResponse: {
                attempts: result.attempts,
                retried: result.retried,
                response: result.response,
              },
            });
            continue;
          }
        } catch (channelError: any) {
          const attempts = Number(channelError?.attempts) || 1;
          await logDispatch({
            notificationSettingsId: rule.id ?? null,
            service: input.service,
            eventKey: input.eventKey,
            channel,
            recipient: channel === "email" ? recipient.email : recipient.phone,
            status: "failed",
            errorMessage:
              `${channelError?.message || "Falha ao enviar notificação pelo canal."} (tentativas: ${attempts})`,
            payload: payloadForLog,
            dedupeKey,
            providerResponse: {
              attempts,
              retried: attempts > 1,
            },
          });
        }
      }
    }
  } catch (error) {
    console.error("dispatchNotificationEvent error:", error);
  }
}

function inWindow(targetDate: Date, now: Date, hours: number, timing: "before" | "after") {
  const diff = differenceInMinutes(targetDate, now);
  const windowMinutes = Math.max(5, Math.round(hours * 60));
  if (timing === "before") {
    return diff >= 0 && diff <= windowMinutes;
  }
  return diff <= 0 && Math.abs(diff) <= windowMinutes;
}

export async function processScheduledNotificationEvents() {
  try {
    const now = new Date();
    const establishmentTimezone = normalizeTimezoneConfig(
      await loadEstablishmentTimezone()
    );

    const { data: activeRules, error: rulesError } = await supabase
      .from("notification_settings")
      .select(
        "id, name, enabled, channels, service, event_key, message, media_url, timing, hours, sort_order, version, updated_at"
      )
      .eq("enabled", true)
      .in("event_key", ["lembrete_consulta", "conta_vencendo", "conta_vencida"]);

    if (rulesError) throw rulesError;
    if (!activeRules || activeRules.length === 0) return;

    const hasReminderRule = activeRules.some((rule) => rule.event_key === "lembrete_consulta");
    if (hasReminderRule) {
      const { data: appointments } = await supabase
        .from("appointments")
        .select("id, patient_id, patient_name, attendant_id, attendant_name, service_name, appointment_date, appointment_time, status")
        .in("status", ["pending", "confirmed"]);

      for (const appointment of appointments || []) {
        const appointmentDateTime = parseDateTimeInTimezone(
          appointment.appointment_date,
          appointment.appointment_time,
          establishmentTimezone
        );
        if (!appointmentDateTime) continue;

        for (const rule of activeRules.filter((item) => item.event_key === "lembrete_consulta")) {
          if (!inWindow(appointmentDateTime, now, Number(rule.hours) || 1, rule.timing === "after" ? "after" : "before")) {
            continue;
          }

          const dedupeBase = `agenda:lembrete_consulta:${appointment.id}:${rule.id}:${now.toISOString().slice(0, 13)}`;
          await dispatchNotificationEvent({
            service: "agenda",
            eventKey: "lembrete_consulta",
            recipient: {
              patientId: appointment.patient_id,
              attendantId: appointment.attendant_id,
            },
            context: {
              paciente_nome: appointment.patient_name,
              profissional_nome: appointment.attendant_name,
              servico_nome: appointment.service_name,
              data_agendamento: appointment.appointment_date,
              hora_agendamento: appointment.appointment_time,
            },
            dedupeKey: dedupeBase,
          });
        }
      }
    }

    const hasFinancialRule = activeRules.some(
      (rule) => rule.event_key === "conta_vencendo" || rule.event_key === "conta_vencida"
    );
    if (hasFinancialRule) {
      const { data: revenues } = await supabase
        .from("revenue")
        .select("id, patient_id, patient_name, description, amount, revenue_date, status");

      for (const revenue of revenues || []) {
        const dueDate = parseDateTimeInTimezone(
          revenue.revenue_date,
          "09:00",
          establishmentTimezone
        );
        if (!dueDate) continue;

        for (const rule of activeRules) {
          if (rule.event_key !== "conta_vencendo" && rule.event_key !== "conta_vencida") {
            continue;
          }

          if (rule.event_key === "conta_vencendo") {
            const sendAt = addHours(dueDate, -(Number(rule.hours) || 1));
            if (differenceInMinutes(now, sendAt) < 0 || differenceInMinutes(now, sendAt) > 60) {
              continue;
            }
          }

          if (rule.event_key === "conta_vencida") {
            const sendAt = addHours(dueDate, Number(rule.hours) || 1);
            if (differenceInMinutes(now, sendAt) < 0 || differenceInMinutes(now, sendAt) > 60) {
              continue;
            }
          }

          const dedupeBase = `financeiro:${rule.event_key}:${revenue.id}:${rule.id}:${now.toISOString().slice(0, 13)}`;
          await dispatchNotificationEvent({
            service: "financeiro",
            eventKey: rule.event_key,
            recipient: {
              patientId: revenue.patient_id,
            },
            context: {
              paciente_nome: revenue.patient_name,
              descricao_conta: revenue.description,
              valor: revenue.amount,
              data_vencimento: revenue.revenue_date,
              status_pagamento: revenue.status,
            },
            dedupeKey: dedupeBase,
          });
        }
      }
    }
  } catch (error) {
    console.error("processScheduledNotificationEvents error:", error);
  }
}
