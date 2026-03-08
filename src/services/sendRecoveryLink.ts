import { supabase } from "@/integrations/supabase/client";

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

type EvolutionConfigRow = {
  enabled: boolean;
  base_url: string;
  token: string;
  default_phone_country_code: string;
};

function normalizePhone(rawPhone: string, defaultCountryCode: string): string {
  const digits = rawPhone.replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith(defaultCountryCode)) return digits;
  return `${defaultCountryCode}${digits}`;
}

async function resolveEvolutionInstance(
  baseUrl: string,
  token: string
): Promise<string> {
  const response = await fetch(`${baseUrl.replace(/\/+$/, "")}/instance/fetchInstances`, {
    method: "GET",
    headers: { apikey: token, "Content-Type": "application/json" },
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Falha ao consultar instâncias WhatsApp: ${text.slice(0, 120)}`);
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
    const name = source?.instanceName ?? source?.instance_name ?? source?.name ?? null;
    const status = source?.connectionStatus ?? source?.status ?? source?.connectionState ?? "";
    if (name && String(status).toLowerCase() === "open") return String(name);
  }
  const first = items[0]?.instance ?? items[0];
  const fallback = first?.instanceName ?? first?.instance_name ?? first?.name ?? null;
  if (!fallback) throw new Error("Nenhuma instância WhatsApp disponível.");
  return String(fallback);
}

export type SendRecoveryLinkResult = {
  emailSent: boolean;
  whatsappSent: boolean;
  emailError?: string;
  whatsappError?: string;
};

/**
 * Envia o link de redefinição de senha por e-mail e/ou WhatsApp quando as integrações estão configuradas.
 */
export async function sendRecoveryLinkChannels(
  userEmail: string,
  userPhone: string | null | undefined,
  userName: string,
  link: string
): Promise<SendRecoveryLinkResult> {
  const result: SendRecoveryLinkResult = { emailSent: false, whatsappSent: false };
  const messageText = `Olá${userName ? ` ${userName}` : ""}! Segue o link para redefinir sua senha no sistema. Abra no navegador (válido por pouco tempo):\n\n${link}`;
  const emailBody = messageText.replace(/\n/g, "\n");

  if (userEmail?.trim()) {
    try {
      const { data, error } = await supabase
        .from("email_smtp_config")
        .select("enabled, host, port, use_tls, username, password, from_name, from_email, backend_url")
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      const cfg = data as EmailConfigRow | null;
      if (cfg?.enabled && cfg?.backend_url?.trim()) {
        const baseUrl = cfg.backend_url.replace(/\/+$/, "");
        const res = await fetch(`${baseUrl}/api/email/send`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            config: {
              host: cfg.host,
              port: cfg.port,
              useTls: cfg.use_tls,
              username: cfg.username,
              password: cfg.password,
              fromName: cfg.from_name,
              fromEmail: cfg.from_email,
            },
            toEmail: userEmail.trim(),
            subject: "Redefinição de senha - Clinica Pro",
            text: emailBody,
            mediaUrl: null,
          }),
        });
        const body = await res.json().catch(() => ({}));
        if (!res.ok || body?.error) {
          throw new Error(body?.details || body?.error || `Erro HTTP ${res.status}`);
        }
        result.emailSent = true;
      }
    } catch (e) {
      result.emailError = e instanceof Error ? e.message : String(e);
    }
  }

  const phone = typeof userPhone === "string" ? userPhone.trim() : "";
  if (phone) {
    try {
      const { data, error } = await supabase
        .from("evolution_api_config")
        .select("enabled, base_url, token, default_phone_country_code")
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      const evo = data as EvolutionConfigRow | null;
      if (evo?.enabled && evo?.base_url?.trim() && evo?.token?.trim()) {
        const instanceName = await resolveEvolutionInstance(evo.base_url, evo.token);
        const to = normalizePhone(phone, evo.default_phone_country_code || "55");
        if (!to) throw new Error("Telefone inválido.");
        const base = evo.base_url.replace(/\/+$/, "");
        const res = await fetch(`${base}/message/sendText/${encodeURIComponent(instanceName)}`, {
          method: "POST",
          headers: { apikey: evo.token, "Content-Type": "application/json" },
          body: JSON.stringify({ number: to, text: messageText, delay: 1200 }),
        });
        const body = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(body?.message || `Erro HTTP ${res.status} no envio WhatsApp.`);
        }
        result.whatsappSent = true;
      }
    } catch (e) {
      result.whatsappError = e instanceof Error ? e.message : String(e);
    }
  }

  return result;
}
