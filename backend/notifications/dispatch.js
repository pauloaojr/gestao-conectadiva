/**
 * Lógica de dispatch de notificações (portada do frontend).
 * Usa Supabase admin (service role) para buscar regras e configs.
 */

const DEFAULT_TIMEZONE = "GMT-3";
const WEEKDAY_NAMES = [
  "domingo", "segunda-feira", "terça-feira", "quarta-feira",
  "quinta-feira", "sexta-feira", "sábado",
];
const MONTH_NAMES = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];
const MAX_RETRY = 3;
const RETRY_BACKOFF_MS = [800, 1600];

function pad2(n) {
  return String(n).padStart(2, "0");
}

function parseGmtOffsetMinutes(tz) {
  const m = String(tz || "").trim().toUpperCase().match(/^GMT\s*([+-])\s*(\d{1,2})(?::?(\d{2}))?$/);
  if (!m) return null;
  const sign = m[1] === "-" ? -1 : 1;
  const h = parseInt(m[2], 10);
  const min = m[3] ? parseInt(m[3], 10) : 0;
  return sign * (h * 60 + min);
}

function normalizeTimezone(tz) {
  const v = String(tz || "").trim();
  if (!v) return DEFAULT_TIMEZONE;
  if (parseGmtOffsetMinutes(v) !== null) return v.toUpperCase().replace(/\s+/g, "");
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: v }).format(new Date());
    return v;
  } catch {
    return DEFAULT_TIMEZONE;
  }
}

function getDatePartsByTimezone(date, tz) {
  const ntz = normalizeTimezone(tz);
  const off = parseGmtOffsetMinutes(ntz);
  if (off !== null) {
    const d = new Date(date.getTime() + off * 60 * 1000);
    return {
      year: d.getUTCFullYear(),
      month: d.getUTCMonth() + 1,
      day: d.getUTCDate(),
      weekday: d.getUTCDay(),
      hour: d.getUTCHours(),
      minute: d.getUTCMinutes(),
    };
  }
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: ntz,
      year: "numeric", month: "numeric", day: "numeric",
      weekday: "short", hour: "2-digit", minute: "2-digit", hour12: false,
    }).formatToParts(date);
    const read = (t) => parseInt(parts.find((p) => p.type === t)?.value || "0", 10);
    const wd = parts.find((p) => p.type === "weekday")?.value || "Sun";
    const wdMap = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
    return {
      year: read("year"),
      month: read("month"),
      day: read("day"),
      weekday: wdMap[wd] ?? 0,
      hour: read("hour"),
      minute: read("minute"),
    };
  } catch {
    return getDatePartsByTimezone(date, DEFAULT_TIMEZONE);
  }
}

function getGreeting(date, tz) {
  const { hour } = getDatePartsByTimezone(date, tz);
  if (hour >= 5 && hour < 12) return "Bom dia";
  if (hour >= 12 && hour < 18) return "Boa tarde";
  return "Boa noite";
}

function getCurrentDate(date, tz) {
  const { day, month, year } = getDatePartsByTimezone(date, tz);
  return `${pad2(day)}/${pad2(month)}/${year}`;
}

function getCurrentWeekday(date, tz) {
  const { weekday } = getDatePartsByTimezone(date, tz);
  return WEEKDAY_NAMES[weekday] ?? WEEKDAY_NAMES[0];
}

function getCurrentTime(date, tz) {
  const { hour, minute } = getDatePartsByTimezone(date, tz);
  return `${pad2(hour)}:${pad2(minute)}`;
}

function getCurrentMonth(date, tz) {
  const { month } = getDatePartsByTimezone(date, tz);
  return MONTH_NAMES[Math.max(0, Math.min(11, month - 1))];
}

function getFirstName(name) {
  const t = String(name || "").trim();
  return t ? t.split(/\s+/)[0] || "" : "";
}

function withRuntimePlaceholders(ctx, tz) {
  const ntz = normalizeTimezone(tz);
  const now = new Date();
  return {
    ...ctx,
    saudacao: String(ctx.saudacao ?? "").trim() || getGreeting(now, ntz),
    data_atual: String(ctx.data_atual ?? "").trim() || getCurrentDate(now, ntz),
    dia_semana_atual: String(ctx.dia_semana_atual ?? "").trim() || getCurrentWeekday(now, ntz),
    hora_atual: String(ctx.hora_atual ?? "").trim() || getCurrentTime(now, ntz),
    mes_atual: String(ctx.mes_atual ?? "").trim() || getCurrentMonth(now, ntz),
    paciente_primeiro_nome: String(ctx.paciente_primeiro_nome ?? "").trim() || getFirstName(ctx.paciente_nome),
  };
}

function formatBrazilianNumber(v) {
  const raw = String(v ?? "").trim();
  if (!raw) return "";
  const norm = raw.includes(",") && raw.includes(".")
    ? raw.replace(/\./g, "").replace(",", ".")
    : raw.includes(",")
    ? raw.replace(",", ".")
    : raw;
  const n = Number(norm);
  return Number.isFinite(n) ? n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : raw;
}

function formatDateBR(v) {
  const raw = String(v ?? "").trim();
  const m = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : raw;
}

function toTemplateValue(v) {
  return v == null ? "" : String(v);
}

function applyTemplate(template, context) {
  const resolved = { ...context };
  return String(template || "").replace(/\{\{([a-zA-Z0-9_]+)\}\}/g, (_, key) =>
    toTemplateValue(resolved[key])
  );
}

function normalizeFinancialContext(ctx, statusLabel) {
  return {
    ...ctx,
    valor: formatBrazilianNumber(ctx.valor),
    data_vencimento: formatDateBR(ctx.data_vencimento),
    status_pagamento: (statusLabel || "").trim() || String(ctx.status_pagamento ?? ""),
  };
}

function parseFirstMediaUrl(mediaUrl) {
  const raw = String(mediaUrl ?? "").trim();
  if (!raw) return null;
  if (raw.startsWith("[")) {
    try {
      const arr = JSON.parse(raw);
      const first = Array.isArray(arr) && arr[0] && typeof arr[0].url === "string" ? arr[0] : null;
      return first ? { url: first.url, name: first.name || "", type: first.type || "image" } : null;
    } catch {
      return { url: raw, name: "", type: "image" };
    }
  }
  return { url: raw, name: "", type: "image" };
}

function getEvolutionMediaType(item) {
  const t = (item.type || "").toLowerCase();
  const n = (item.name || "").toLowerCase();
  if (t.startsWith("image/") || /\.(jpe?g|png|gif|webp|bmp|svg)$/.test(n)) return "image";
  if (t.startsWith("video/") || /\.(mp4|webm|ogg|mov|avi)$/.test(n)) return "video";
  return "document";
}

function normalizeMediaForEvolution(url) {
  const s = String(url || "").trim();
  const m = /^data:[^;]+;base64,(.+)$/s.exec(s);
  return m ? m[1].trim() : s;
}

function normalizePhone(raw, defaultCode) {
  const d = String(raw || "").replace(/\D/g, "");
  if (!d) return "";
  return d.startsWith(defaultCode) ? d : defaultCode + d;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function isTransientError(msg) {
  const m = String(msg || "").toLowerCase();
  return /timeout|timed out|network|fetch|tempor|too many requests|http 429|http 5\d{2}/.test(m);
}

async function executeWithRetry(fn) {
  let attempts = 0;
  let lastErr;
  while (attempts < MAX_RETRY) {
    attempts += 1;
    try {
      const res = await fn();
      return { response: res, attempts, retried: attempts > 1 };
    } catch (e) {
      lastErr = e;
      const msg = e?.message || String(e);
      if (!isTransientError(msg) || attempts >= MAX_RETRY) {
        const err = new Error(msg);
        err.attempts = attempts;
        throw err;
      }
      await sleep(RETRY_BACKOFF_MS[Math.min(attempts - 1, RETRY_BACKOFF_MS.length - 1)]);
    }
  }
  throw lastErr || new Error("Retry exhausted");
}

/**
 * Executa o dispatch de notificações.
 * @param {object} supabase - Cliente Supabase admin
 * @param {object} input - { service, eventKey, ruleId?, recipient: { patientId?, attendantId?, email?, phone? }, context, dedupeKey? }
 * @param {object} options - { backendBaseUrl } - URL do backend para /api/email/send
 */
async function runDispatch(supabase, input, options = {}) {
  const { backendBaseUrl = "" } = options;

  let query = supabase
    .from("notification_settings")
    .select("id, name, enabled, channels, service, recipient_target, event_key, message, media_url, timing, hours, sort_order")
    .eq("enabled", true)
    .eq("service", input.service)
    .eq("event_key", input.eventKey);

  if (input.ruleId) {
    query = query.eq("id", input.ruleId);
  }
  const { data: rulesData, error: rulesErr } = await query.order("sort_order", { ascending: true });

  if (rulesErr) throw rulesErr;
  const rules = rulesData || [];
  if (rules.length === 0) return { dispatched: 0, rules: 0 };

  const { data: tzRow } = await supabase.from("establishments").select("timezone").limit(1).maybeSingle();
  const establishmentTz = normalizeTimezone(tzRow?.timezone);

  let businessContext = { ...input.context };
  if (input.service === "financeiro") {
    const statusKey = String(input.context?.status_pagamento ?? "").trim();
    if (statusKey) {
      const { data: fsRow } = await supabase
        .from("financial_status_config")
        .select("label")
        .eq("key", statusKey)
        .in("applies_to", ["revenue", "both"])
        .limit(1)
        .maybeSingle();
      businessContext = normalizeFinancialContext(businessContext, fsRow?.label);
    }
  }
  const resolvedContext = withRuntimePlaceholders(businessContext, establishmentTz);
  const payloadForLog = { ...resolvedContext, timezone_aplicado: establishmentTz };

  for (const rule of rules) {
    const channels = Array.isArray(rule.channels)
      ? rule.channels.filter((c) => c === "email" || c === "whatsapp")
      : [];

    let email = (input.recipient?.email || "").trim();
    let phone = (input.recipient?.phone || "").trim();
    if (!email || !phone) {
      if (rule.recipient_target === "professional" && input.recipient?.attendantId) {
        const { data: prof } = await supabase
          .from("profiles")
          .select("email, phone")
          .or(`user_id.eq.${input.recipient.attendantId},id.eq.${input.recipient.attendantId}`)
          .limit(1)
          .maybeSingle();
        email = email || (prof?.email || "").trim();
        phone = phone || (prof?.phone || "").trim();
      }
      if (rule.recipient_target === "patient" && input.recipient?.patientId) {
        const { data: pat } = await supabase
          .from("patients")
          .select("email, phone")
          .eq("id", input.recipient.patientId)
          .maybeSingle();
        email = email || (pat?.email || "").trim();
        phone = phone || (pat?.phone || "").trim();
      }
    }

    const message = applyTemplate(rule.message, resolvedContext);

    for (const channel of channels) {
      const dedupeKey = input.dedupeKey ? `${input.dedupeKey}:${rule.id}:${channel}` : null;

      if (dedupeKey && rule.id) {
        const { data: existing } = await supabase
          .from("notification_dispatch_logs")
          .select("id")
          .eq("notification_settings_id", rule.id)
          .eq("channel", channel)
          .eq("dedupe_key", dedupeKey)
          .eq("status", "success")
          .limit(1)
          .maybeSingle();
        if (existing) continue;
      }

      const logDispatch = async (status, errorMessage, providerResponse) => {
        await supabase.from("notification_dispatch_logs").insert({
          notification_settings_id: rule.id,
          service: input.service,
          event_key: input.eventKey,
          channel,
          recipient: channel === "email" ? email : phone,
          status,
          error_message: errorMessage || null,
          dedupe_key: dedupeKey,
          payload_json: payloadForLog,
          provider_response_json: providerResponse ?? null,
        });
      };

      try {
        if (channel === "email") {
          if (!email || !email.includes("@")) {
            await logDispatch("failed", rule.recipient_target === "professional" ? "Profissional sem e-mail." : "Paciente sem e-mail.");
            continue;
          }
          const { data: emailCfg } = await supabase
            .from("email_smtp_config")
            .select("enabled, host, port, use_tls, username, password, from_name, from_email, backend_url")
            .limit(1)
            .maybeSingle();
          if (!emailCfg?.enabled || !emailCfg?.backend_url?.trim()) {
            await logDispatch("failed", "Integração de e-mail desativada ou não configurada.");
            continue;
          }
          const base = String(emailCfg.backend_url).replace(/\/+$/, "");
          const firstMedia = parseFirstMediaUrl(rule.media_url);
          const mediaUrl = firstMedia?.url || rule.media_url || null;
          const res = await executeWithRetry(() =>
            fetch(`${base}/api/email/send`, {
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
                toEmail: email,
                subject: `${rule.name || "Notificação"} - Clinica Pro`,
                text: message,
                mediaUrl,
              }),
            })
          );
          const body = await res.response.json().catch(() => ({}));
          if (!res.response.ok || body?.error) {
            throw new Error(body?.details || body?.error || `HTTP ${res.response.status}`);
          }
          await logDispatch("success", null, { attempts: res.attempts, retried: res.retried, response: body });
        }

        if (channel === "whatsapp") {
          if (!phone || !phone.replace(/\D/g, "")) {
            await logDispatch("failed", rule.recipient_target === "professional" ? "Profissional sem telefone." : "Paciente sem telefone.");
            continue;
          }
          const { data: evoCfg } = await supabase
            .from("evolution_api_config")
            .select("enabled, base_url, token, default_phone_country_code")
            .limit(1)
            .maybeSingle();
          if (!evoCfg?.enabled || !evoCfg?.base_url?.trim() || !evoCfg?.token?.trim()) {
            await logDispatch("failed", "Integração WhatsApp desativada ou não configurada.");
            continue;
          }

          const instanceRes = await fetch(
            `${String(evoCfg.base_url).replace(/\/+$/, "")}/instance/fetchInstances`,
            { headers: { apikey: evoCfg.token, "Content-Type": "application/json" } }
          );
          const instanceData = await instanceRes.json().catch(() => null);
          const items = Array.isArray(instanceData)
            ? instanceData
            : Array.isArray(instanceData?.response)
            ? instanceData.response
            : Array.isArray(instanceData?.instances)
            ? instanceData.instances
            : [];
          let instanceName = null;
          for (const it of items) {
            const src = it?.instance ?? it;
            const name = src?.instanceName ?? src?.instance_name ?? src?.name;
            const status = String(src?.connectionStatus ?? src?.status ?? src?.connectionState ?? "").toLowerCase();
            if (name && status === "open") {
              instanceName = String(name);
              break;
            }
          }
          if (!instanceName) {
            const first = items[0]?.instance ?? items[0];
            instanceName = first?.instanceName ?? first?.instance_name ?? first?.name;
          }
          if (!instanceName) {
            await logDispatch("failed", "Nenhuma instância WhatsApp disponível.");
            continue;
          }

          const to = normalizePhone(phone, evoCfg.default_phone_country_code || "55");
          const firstMedia = parseFirstMediaUrl(rule.media_url);
          const base = String(evoCfg.base_url).replace(/\/+$/, "");

          if (firstMedia?.url) {
            const mediatype = getEvolutionMediaType(firstMedia);
            const mimetype = firstMedia.type || (mediatype === "image" ? "image/jpeg" : "application/octet-stream");
            const fileName = (firstMedia.name || "").trim() || (mediatype === "image" ? "image.jpg" : "arquivo");
            const mediaValue = normalizeMediaForEvolution(firstMedia.url);
            const res = await executeWithRetry(() =>
              fetch(`${base}/message/sendMedia/${encodeURIComponent(instanceName)}`, {
                method: "POST",
                headers: { apikey: evoCfg.token, "Content-Type": "application/json" },
                body: JSON.stringify({
                  number: to,
                  mediatype,
                  mimetype,
                  caption: message ?? "",
                  media: mediaValue,
                  fileName,
                  delay: 1200,
                }),
              })
            );
            const body = await res.response.json().catch(() => ({}));
            if (!res.response.ok) {
              const detail = body?.message ?? body?.error ?? JSON.stringify(body);
              throw new Error(detail || `HTTP ${res.response.status}`);
            }
            await logDispatch("success", null, { attempts: res.attempts, retried: res.retried, response: body });
          } else {
            const res = await executeWithRetry(() =>
              fetch(`${base}/message/sendText/${encodeURIComponent(instanceName)}`, {
                method: "POST",
                headers: { apikey: evoCfg.token, "Content-Type": "application/json" },
                body: JSON.stringify({ number: to, text: message, delay: 1200 }),
              })
            );
            const body = await res.response.json().catch(() => ({}));
            if (!res.response.ok) {
              throw new Error(body?.message || body?.error || `HTTP ${res.response.status}`);
            }
            await logDispatch("success", null, { attempts: res.attempts, retried: res.retried, response: body });
          }
        }
      } catch (chErr) {
        const attempts = chErr?.attempts || 1;
        await logDispatch(
          "failed",
          `${chErr?.message || "Falha ao enviar"} (tentativas: ${attempts})`,
          { attempts, retried: attempts > 1 }
        ).catch((e) => console.error("logDispatch failed:", e));
      }
    }
  }

  return { dispatched: 1, rules: rules.length };
}

module.exports = { runDispatch };
