import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export type EmailSmtpConfig = {
  id?: string;
  enabled: boolean;
  host: string;
  port: number;
  useTls: boolean;
  username: string;
  password: string;
  fromName: string;
  fromEmail: string;
  backendUrl: string | null;
};

const defaultConfig: EmailSmtpConfig = {
  enabled: false,
  host: "",
  port: 587,
  useTls: true,
  username: "",
  password: "",
  fromName: "",
  fromEmail: "",
  backendUrl: null,
};

function rowToConfig(row: {
  id: string;
  enabled: boolean;
  host: string;
  port: number;
  use_tls: boolean;
  username: string;
  password: string;
  from_name: string;
  from_email: string;
  backend_url?: string | null;
}): EmailSmtpConfig {
  return {
    id: row.id,
    enabled: row.enabled,
    host: row.host,
    port: row.port,
    useTls: row.use_tls,
    username: row.username,
    password: row.password,
    fromName: row.from_name,
    fromEmail: row.from_email,
    backendUrl: row.backend_url ?? null,
  };
}

export const useEmailSmtpConfig = () => {
  const { toast } = useToast();
  const [config, setConfig] = useState<EmailSmtpConfig>(defaultConfig);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchConfig = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from("email_smtp_config")
        .select(
          "id, enabled, host, port, use_tls, username, password, from_name, from_email, backend_url"
        )
        .limit(1)
        .maybeSingle();

      if (fetchError) throw fetchError;

      if (data) {
        setConfig(rowToConfig(data));
      } else {
        setConfig({ ...defaultConfig });
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Erro ao carregar configuração de e-mail.";
      console.error("Error fetching email_smtp_config:", err);
      setError(message);
      setConfig({ ...defaultConfig });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  const saveConfig = useCallback(
    async (payload: EmailSmtpConfig) => {
      try {
        const row = {
          enabled: payload.enabled,
          host: payload.host,
          port: payload.port,
          use_tls: payload.useTls,
          username: payload.username,
          password: payload.password,
          from_name: payload.fromName,
          from_email: payload.fromEmail,
          backend_url: payload.backendUrl ?? null,
        };

        const selectFields =
          "id, enabled, host, port, use_tls, username, password, from_name, from_email, backend_url";

        if (payload.id) {
          const { data, error: updateError } = await supabase
            .from("email_smtp_config")
            .update(row)
            .eq("id", payload.id)
            .select(selectFields)
            .single();

          if (updateError) throw updateError;
          if (data) setConfig(rowToConfig(data));
        } else {
          const { data, error: insertError } = await supabase
            .from("email_smtp_config")
            .insert(row)
            .select(selectFields)
            .single();

          if (insertError) throw insertError;
          if (data) setConfig(rowToConfig(data));
        }

        toast({
          title: "Configurações de e-mail salvas",
          description:
            "As credenciais SMTP e a URL do backend foram salvas.",
        });
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : "Não foi possível salvar as configurações.";
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

  const setConfigLocal = useCallback(
    (patch: Partial<EmailSmtpConfig> | ((prev: EmailSmtpConfig) => EmailSmtpConfig)) => {
      setConfig((prev) =>
        typeof patch === "function" ? patch(prev) : { ...prev, ...patch }
      );
    },
    []
  );

  return { config, isLoading, error, fetchConfig, saveConfig, setConfig: setConfigLocal };
};
