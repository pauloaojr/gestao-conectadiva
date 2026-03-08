import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  getDatePartsByTimezone,
  getFirstName,
  normalizeTimezoneConfig,
  parseDateTimeInTimezone,
  withRuntimePlaceholders,
} from "../_shared/notificationRuntimePlaceholders.ts";
import { normalizeFinancialContextPlaceholders } from "../_shared/financialNotificationPlaceholders.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const MAX_RETRY_ATTEMPTS = 3;
const RETRY_BACKOFF_MS = [800, 1600];
const FINANCIAL_STATUS_LABEL_CACHE_TTL_MS = 5 * 60 * 1000;
const financialStatusLabelCache = new Map<
  string,
  { value: string; expiresAt: number }
>();

type JsonMap = Record<string, string | number | null | undefined>;

type RuleRow = {
  id: string;
  name: string;
  channels: string[];
  service: "agenda" | "financeiro" | "aniversario";
  recipient_target: "patient" | "professional";
  event_key:
    | "lembrete_consulta"
    | "conta_vencendo"
    | "conta_vencida"
    | "agendamento_criado"
    | "agendamento_confirmado"
    | "agendamento_cancelado"
    | "conta_criada"
    | "pagamento_confirmado"
    | "aniversario";
  message: string;
  media_url: string | null;
  hours: number;
  timing: "before" | "after";
  send_time: string | null;
};

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function applyTemplate(template: string, context: JsonMap, timezone?: string | null) {
  const resolvedContext = withRuntimePlaceholders(context, { timezone }) as JsonMap;
  return template.replace(/\{\{([a-zA-Z0-9_]+)\}\}/g, (_, key: string) =>
    resolvedContext[key] == null ? "" : String(resolvedContext[key])
  );
}

function normalizePhone(rawPhone: string, defaultCountryCode: string): string {
  const digits = rawPhone.replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith(defaultCountryCode)) return digits;
  return `${defaultCountryCode}${digits}`;
}

async function resolveFinancialStatusLabel(
  admin: ReturnType<typeof createClient>,
  statusKey: string
): Promise<string> {
  const key = statusKey.trim();
  if (!key) return "";

  const now = Date.now();
  const cached = financialStatusLabelCache.get(key);
  if (cached && cached.expiresAt > now) return cached.value;

  const { data, error } = await admin
    .from("financial_status_config")
    .select("label")
    .eq("key", key)
    .in("applies_to", ["revenue", "both"])
    .limit(1)
    .maybeSingle();

  if (error) return key;

  const label = data?.label?.trim() || key;
  financialStatusLabelCache.set(key, {
    value: label,
    expiresAt: now + FINANCIAL_STATUS_LABEL_CACHE_TTL_MS,
  });
  return label;
}

async function normalizeBusinessContext(params: {
  admin: ReturnType<typeof createClient>;
  service: RuleRow["service"];
  context: JsonMap;
}): Promise<JsonMap> {
  const { admin, service, context } = params;
  if (service !== "financeiro") return context;

  const statusLabel = await resolveFinancialStatusLabel(
    admin,
    String(context.status_pagamento ?? "")
  );

  return {
    ...normalizeFinancialContextPlaceholders(context, statusLabel),
  };
}

function diffMinutes(target: Date, base: Date) {
  return Math.floor((target.getTime() - base.getTime()) / 60000);
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

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
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
      return { response, attempts, retried: attempts > 1 };
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

async function hasSuccessfulDedupe(
  admin: ReturnType<typeof createClient>,
  ruleId: string,
  channel: string,
  dedupeKey: string
) {
  const { data, error } = await admin
    .from("notification_dispatch_logs")
    .select("id")
    .eq("notification_settings_id", ruleId)
    .eq("channel", channel)
    .eq("dedupe_key", dedupeKey)
    .eq("status", "success")
    .limit(1)
    .maybeSingle();

  if (error) return false;
  return !!data;
}

function formatDispatchErrorMessage(error: unknown, attempts: number): string {
  const msg = error instanceof Error ? error.message : String(error ?? "Falha no envio");
  let out = `${msg} (tentativas: ${attempts})`;
  const lower = msg.toLowerCase();
  if (lower.includes("connection refused") && lower.includes("localhost")) {
    out +=
      " — Dica: URL localhost não é acessível pelas Edge Functions. Configure uma URL pública do backend de e-mail em Integrações → E-mail.";
  } else if (lower.includes("connection refused")) {
    out +=
      " — Dica: Verifique se a URL do backend de e-mail está correta e acessível pela internet.";
  }
  return out;
}

async function insertLog(
  admin: ReturnType<typeof createClient>,
  params: {
    ruleId: string;
    service: string;
    eventKey: string;
    channel: string;
    recipient: string;
    status: "success" | "failed";
    dedupeKey: string;
    payload: JsonMap;
    errorMessage?: string;
    providerResponse?: unknown;
  }
) {
  await admin.from("notification_dispatch_logs").insert({
    notification_settings_id: params.ruleId,
    service: params.service,
    event_key: params.eventKey,
    channel: params.channel,
    recipient: params.recipient || "-",
    status: params.status,
    dedupe_key: params.dedupeKey,
    error_message: params.errorMessage ?? null,
    payload_json: params.payload,
    provider_response_json:
      params.providerResponse == null ? null : params.providerResponse,
  });
}

async function sendEmail(
  admin: ReturnType<typeof createClient>,
  rule: RuleRow,
  recipientEmail: string,
  message: string
) {
  const { data, error } = await admin
    .from("email_smtp_config")
    .select(
      "enabled, host, port, use_tls, username, password, from_name, from_email, backend_url"
    )
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!data?.enabled) throw new Error("Integração de e-mail desativada.");
  if (!data.backend_url?.trim()) {
    throw new Error("URL do backend de e-mail não configurada.");
  }

  const res = await fetch(`${data.backend_url.replace(/\/+$/, "")}/api/email/send`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      config: {
        host: data.host,
        port: data.port,
        useTls: data.use_tls,
        username: data.username,
        password: data.password,
        fromName: data.from_name,
        fromEmail: data.from_email,
      },
      toEmail: recipientEmail,
      subject: `${rule.name} - Clinica Pro`,
      text: message,
      mediaUrl: rule.media_url ?? null,
    }),
  });

  const body = await res.json().catch(() => ({}));
  if (!res.ok || body?.error) {
    throw new Error(body?.details || body?.error || `Erro HTTP ${res.status}`);
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
    if (name && String(status).toLowerCase() === "open") return String(name);
  }

  const first = items[0]?.instance ?? items[0];
  const fallback =
    first?.instanceName ?? first?.instance_name ?? first?.name ?? null;
  if (!fallback) throw new Error("Nenhuma instância WhatsApp disponível.");
  return String(fallback);
}

async function sendWhatsApp(
  admin: ReturnType<typeof createClient>,
  message: string,
  recipientPhone: string
) {
  const { data, error } = await admin
    .from("evolution_api_config")
    .select("enabled, base_url, token, default_phone_country_code")
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!data?.enabled) throw new Error("Integração WhatsApp desativada.");
  if (!data.base_url?.trim() || !data.token?.trim()) {
    throw new Error("Base URL/token da Evolution API não configurados.");
  }

  const instanceName = await resolveDefaultEvolutionInstance(
    data.base_url,
    data.token
  );
  const to = normalizePhone(recipientPhone, data.default_phone_country_code || "55");
  if (!to) throw new Error("Telefone do destinatário inválido.");

  const res = await fetch(
    `${data.base_url.replace(/\/+$/, "")}/message/sendText/${encodeURIComponent(instanceName)}`,
    {
      method: "POST",
      headers: {
        apikey: data.token,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ number: to, text: message, delay: 1200 }),
    }
  );
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body?.message || `Erro HTTP ${res.status}`);
  return body;
}

async function resolveRecipient(
  admin: ReturnType<typeof createClient>,
  recipientTarget: RuleRow["recipient_target"],
  patientId: string | null,
  attendantId: string | null
) {
  if (recipientTarget === "professional") {
    if (!attendantId) return { email: "", phone: "" };
    const { data } = await admin
      .from("profiles")
      .select("email, phone")
      .or(`user_id.eq.${attendantId},id.eq.${attendantId}`)
      .limit(1)
      .maybeSingle();
    return {
      email: data?.email?.trim() || "",
      phone: data?.phone?.trim() || "",
    };
  }

  if (!patientId) return { email: "", phone: "" };
  const { data } = await admin
    .from("patients")
    .select("email, phone")
    .eq("id", patientId)
    .maybeSingle();
  return {
    email: data?.email?.trim() || "",
    phone: data?.phone?.trim() || "",
  };
}

async function dispatchByRule(params: {
  admin: ReturnType<typeof createClient>;
  rule: RuleRow;
  eventKey: RuleRow["event_key"];
  context: JsonMap;
  dedupeBase: string;
  recipient: { email: string; phone: string };
  timezone?: string | null;
}) {
  const { admin, rule, eventKey, context, dedupeBase, recipient, timezone } = params;
  const businessContext = await normalizeBusinessContext({
    admin,
    service: rule.service,
    context,
  });
  const resolvedContext = withRuntimePlaceholders(businessContext, { timezone }) as JsonMap;
  const payloadForLog: JsonMap = {
    ...resolvedContext,
    timezone_aplicado: normalizeTimezoneConfig(timezone),
  };
  const message = applyTemplate(rule.message, resolvedContext, timezone);

  for (const channel of rule.channels || []) {
    if (channel !== "email" && channel !== "whatsapp") continue;
    const dedupeKey = `${dedupeBase}:${rule.id}:${channel}`;

    const alreadySent = await hasSuccessfulDedupe(admin, rule.id, channel, dedupeKey);
    if (alreadySent) continue;

    try {
      if (channel === "email") {
        if (!recipient.email) throw new Error("Destinatário sem e-mail.");
        const result = await executeWithRetry(() =>
          sendEmail(admin, rule, recipient.email, message)
        );
        await insertLog(admin, {
          ruleId: rule.id,
          service: rule.service,
          eventKey,
          channel,
          recipient: recipient.email,
          status: "success",
          dedupeKey,
          payload: payloadForLog,
          providerResponse: {
            attempts: result.attempts,
            retried: result.retried,
            response: result.response,
          },
        });
        continue;
      }

      if (!recipient.phone) throw new Error("Destinatário sem telefone.");
      const result = await executeWithRetry(() =>
        sendWhatsApp(admin, message, recipient.phone)
      );
      await insertLog(admin, {
        ruleId: rule.id,
        service: rule.service,
        eventKey,
        channel,
        recipient: recipient.phone,
        status: "success",
        dedupeKey,
        payload: payloadForLog,
        providerResponse: {
          attempts: result.attempts,
          retried: result.retried,
          response: result.response,
        },
      });
    } catch (error: any) {
      const attempts = Number(error?.attempts) || 1;
      const errorMsg = formatDispatchErrorMessage(error, attempts);
      const providerResp: Record<string, unknown> = {
        attempts,
        retried: attempts > 1,
      };
      if (channel === "email") {
        const raw = error?.message || String(error);
        if (raw.toLowerCase().includes("connection refused")) {
          providerResp.errorType = "connection_refused";
          providerResp.hint =
            "Use URL pública do backend de e-mail em produção. localhost não é acessível pelas Edge Functions.";
        }
      }
      await insertLog(admin, {
        ruleId: rule.id,
        service: rule.service,
        eventKey,
        channel,
        recipient: channel === "email" ? recipient.email : recipient.phone,
        status: "failed",
        dedupeKey,
        payload: payloadForLog,
        errorMessage: errorMsg,
        providerResponse: providerResp,
      });
    }
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  try {
    const schedulerToken = Deno.env.get("CRON_SCHEDULER_TOKEN");
    if (!schedulerToken) {
      return jsonResponse(
        { ok: false, error: "CRON_SCHEDULER_TOKEN não configurado." },
        500
      );
    }

    const providedToken = req.headers.get("x-scheduler-token");
    if (!providedToken || providedToken !== schedulerToken) {
      return jsonResponse({ ok: false, error: "Unauthorized" }, 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceRoleKey) {
      return jsonResponse(
        { ok: false, error: "SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY ausentes." },
        500
      );
    }

    const admin = createClient(supabaseUrl, serviceRoleKey);
    const now = new Date();
    let processed = 0;
    const { data: establishmentData } = await admin
      .from("establishments")
      .select("timezone")
      .limit(1)
      .maybeSingle();
    const establishmentTimezone = normalizeTimezoneConfig(
      establishmentData?.timezone || null
    );

    const { data: rules, error: rulesError } = await admin
      .from("notification_settings")
      .select(
        "id, name, channels, service, recipient_target, event_key, message, media_url, hours, timing"
      )
      .eq("enabled", true)
      .in("event_key", ["lembrete_consulta", "conta_vencendo", "conta_vencida"]);

    if (rulesError) throw rulesError;
    let activeRules = (rules || []) as RuleRow[];

    try {
      const { data: aniversarioRules } = await admin
        .from("notification_settings")
        .select(
          "id, name, channels, service, recipient_target, event_key, message, media_url, hours, timing, send_time"
        )
        .eq("enabled", true)
        .eq("service", "aniversario")
        .eq("event_key", "aniversario");
      if ((aniversarioRules || []).length > 0) {
        activeRules = [...activeRules, ...(aniversarioRules as RuleRow[])];
      }
    } catch {
      // ignore aniversario fetch errors (e.g. send_time column missing)
    }

    if (activeRules.length === 0) {
      return jsonResponse({ ok: true, processed: 0, message: "Sem regras ativas." });
    }

    const reminderRules = activeRules.filter((r) => r.event_key === "lembrete_consulta");
    if (reminderRules.length > 0) {
      const { data: appointments } = await admin
        .from("appointments")
        .select(
          "id, patient_id, patient_name, attendant_id, attendant_name, service_name, appointment_date, appointment_time, status"
        )
        .in("status", ["pending", "confirmed"]);

      for (const appointment of appointments || []) {
        const dateTime = parseDateTimeInTimezone(
          appointment.appointment_date,
          appointment.appointment_time,
          establishmentTimezone
        );
        if (!dateTime) continue;
        for (const rule of reminderRules) {
          const recipient = await resolveRecipient(
            admin,
            rule.recipient_target,
            appointment.patient_id,
            appointment.attendant_id
          );
          const windowMinutes = Math.max(5, Math.round((Number(rule.hours) || 1) * 60));
          const diff = diffMinutes(dateTime, now);
          const inTime =
            rule.timing === "before"
              ? diff >= 0 && diff <= windowMinutes
              : diff <= 0 && Math.abs(diff) <= windowMinutes;
          if (!inTime) continue;

          await dispatchByRule({
            admin,
            rule,
            eventKey: "lembrete_consulta",
            recipient,
            dedupeBase: `sched:agenda:lembrete:${appointment.id}:${now.toISOString().slice(0, 13)}`,
            context: {
              paciente_nome: appointment.patient_name,
              profissional_nome: appointment.attendant_name,
              servico_nome: appointment.service_name,
              data_agendamento: appointment.appointment_date,
              hora_agendamento: appointment.appointment_time,
            },
            timezone: establishmentTimezone,
          });
          processed += 1;
        }
      }
    }

    const financialRules = activeRules.filter(
      (r) => r.event_key === "conta_vencendo" || r.event_key === "conta_vencida"
    );
    if (financialRules.length > 0) {
      const { data: revenues } = await admin
        .from("revenue")
        .select("id, patient_id, patient_name, description, amount, revenue_date, status");

      for (const revenue of revenues || []) {
        const due = parseDateTimeInTimezone(
          revenue.revenue_date,
          "09:00",
          establishmentTimezone
        );
        if (!due) continue;
        for (const rule of financialRules) {
          const recipient = await resolveRecipient(
            admin,
            rule.recipient_target,
            revenue.patient_id,
            null
          );
          const hours = Number(rule.hours) || 1;
          const target =
            rule.event_key === "conta_vencendo"
              ? new Date(due.getTime() - hours * 60 * 60 * 1000)
              : new Date(due.getTime() + hours * 60 * 60 * 1000);

          const age = Math.abs(diffMinutes(target, now));
          if (target > now || age > 60) continue;

          await dispatchByRule({
            admin,
            rule,
            eventKey: rule.event_key,
            recipient,
            dedupeBase: `sched:financeiro:${rule.event_key}:${revenue.id}:${now.toISOString().slice(0, 13)}`,
            context: {
              paciente_nome: revenue.patient_name,
              descricao_conta: revenue.description,
              valor: revenue.amount,
              data_vencimento: revenue.revenue_date,
              status_pagamento: revenue.status,
            },
            timezone: establishmentTimezone,
          });
          processed += 1;
        }
      }
    }

    let aniversarioProcessed = 0;
    let aniversarioDebug: Record<string, unknown> | null = null;
    const aniversarioRules = activeRules.filter(
      (r) => r.service === "aniversario" && r.event_key === "aniversario"
    );
    if (aniversarioRules.length > 0) {
      try {
        const t = normalizeTimezoneConfig(establishmentTimezone);
        const pt = getDatePartsByTimezone(now, establishmentTimezone);
        const ptHour = pt.hour ?? 0;
        const ptMonth = pt.month ?? 1;
        const ptDay = pt.day ?? 1;
        const firstRule = aniversarioRules[0];
        const firstSend = String((firstRule as { send_time?: string }).send_time || "09:00").trim();
        const firstM = firstSend.match(/^(\d{1,2})/);
        const firstSendHour = firstM ? parseInt(firstM[1], 10) : 9;
        aniversarioDebug = {
          todayMonth: ptMonth,
          todayDay: ptDay,
          currentHour: ptHour,
          sendHour: firstSendHour,
          inWindow: ptHour === firstSendHour || ptHour === (firstSendHour + 1) % 24,
          tz: t,
        };

        const parseBirthMonthDay = (bd: unknown): { month: number; day: number } | null => {
          if (bd == null) return null;
          const s = typeof bd === "string" ? bd : (bd instanceof Date ? bd.toISOString().slice(0, 10) : String(bd));
          const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
          if (iso) return { month: parseInt(iso[2], 10), day: parseInt(iso[3], 10) };
          const dmy = s.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
          if (dmy) return { month: parseInt(dmy[2], 10), day: parseInt(dmy[1], 10) };
          return null;
        };

        for (const rule of aniversarioRules) {
          const sendTime = String((rule as { send_time?: string }).send_time || "09:00").trim();
          const m = sendTime.match(/^(\d{1,2})/);
          const sendHour = m ? parseInt(m[1], 10) : 9;
          const nextH = (sendHour + 1) % 24;
          if (ptHour !== sendHour && ptHour !== nextH) continue;

          if (rule.recipient_target === "professional") {
            const { data: profiles } = await admin
              .from("profiles")
              .select("id, name, email, phone, birth_date")
              .not("birth_date", "is", null);
            const profilesList = profiles || [];
            let matchingCount = 0;
            for (const pr of profilesList) {
              const parsed = parseBirthMonthDay(pr.birth_date);
              if (!parsed || parsed.month !== ptMonth || parsed.day !== ptDay) continue;
              matchingCount += 1;

              const recipient = await resolveRecipient(admin, "professional", null, pr.id);
              const nome = (pr.name || "").trim() || "Profissional";
              await dispatchByRule({
                admin,
                rule,
                eventKey: "aniversario",
                recipient,
                dedupeBase: `sched:aniversario:${rule.id}:professional:${pr.id}:${ptMonth}-${ptDay}`,
                context: {
                  paciente_nome: "",
                  paciente_primeiro_nome: "",
                  profissional_nome: nome,
                  profissional_primeiro_nome: nome.split(/\s+/)[0] || nome,
                },
                timezone: establishmentTimezone,
              });
              aniversarioProcessed += 1;
            }
            aniversarioDebug = {
              todayMonth: ptMonth,
              todayDay: ptDay,
              currentHour: ptHour,
              sendHour,
              inWindow: true,
              profilesWithBirthDate: profilesList.length,
              matchingProfiles: matchingCount,
              tz: t,
            };
          } else {
            const { data: patients } = await admin
              .from("patients")
              .select("id, name, email, phone, birth_date")
              .not("birth_date", "is", null);
            for (const p of patients || []) {
              const parsed = parseBirthMonthDay(p.birth_date);
              if (!parsed || parsed.month !== ptMonth || parsed.day !== ptDay) continue;

              const recipient = await resolveRecipient(admin, "patient", p.id, null);
              const nome = (p.name || "").trim() || "Paciente";
              await dispatchByRule({
                admin,
                rule,
                eventKey: "aniversario",
                recipient,
                dedupeBase: `sched:aniversario:${rule.id}:patient:${p.id}:${ptMonth}-${ptDay}`,
                context: {
                  paciente_nome: nome,
                  paciente_primeiro_nome: nome.split(/\s+/)[0] || nome,
                  profissional_nome: "",
                  profissional_primeiro_nome: "",
                },
                timezone: establishmentTimezone,
              });
              aniversarioProcessed += 1;
            }
          }
        }
        processed += aniversarioProcessed;
      } catch (_err) {
        // aniversario block failed; continue with processed count
      }
    }

    const body: Record<string, unknown> = {
      ok: true,
      processed,
      executedAt: now.toISOString(),
    };
    if (aniversarioDebug !== null) body.debug = { aniversario: aniversarioDebug };
    return jsonResponse(body);
  } catch (error: any) {
    return jsonResponse(
      {
        ok: false,
        error: error?.message || "Erro inesperado no scheduler.",
      },
      500
    );
  }
});
