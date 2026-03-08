import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export type EvolutionApiConfig = {
  id?: string;
  enabled: boolean;
  baseUrl: string;
  instanceId: string;
  token: string;
  defaultSenderName: string;
  defaultPhoneCountryCode: string;
  lastTestAt: string | null;
  lastTestResult: "success" | "error" | null;
  lastTestMessage: string | null;
};

const defaultConfig: EvolutionApiConfig = {
  enabled: false,
  baseUrl: "",
  instanceId: "",
  token: "",
  defaultSenderName: "",
  defaultPhoneCountryCode: "55",
  lastTestAt: null,
  lastTestResult: null,
  lastTestMessage: null,
};

function rowToConfig(row: {
  id: string;
  enabled: boolean;
  base_url: string;
  token: string;
  default_sender_name: string;
  default_phone_country_code: string;
  last_test_at: string | null;
  last_test_result: string | null;
  last_test_message: string | null;
}): EvolutionApiConfig {
  const result = row.last_test_result === "success" || row.last_test_result === "error" ? row.last_test_result : null;
  return {
    id: row.id,
    enabled: row.enabled,
    baseUrl: row.base_url,
    instanceId: "",
    token: row.token,
    defaultSenderName: row.default_sender_name,
    defaultPhoneCountryCode: row.default_phone_country_code,
    lastTestAt: row.last_test_at ?? null,
    lastTestResult: result,
    lastTestMessage: row.last_test_message ?? null,
  };
}

export const useEvolutionApiConfig = () => {
  const { toast } = useToast();
  const [config, setConfig] = useState<EvolutionApiConfig>(defaultConfig);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchConfig = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const { data, error: fetchError } = await supabase
        .from("evolution_api_config")
        .select("id, enabled, base_url, token, default_sender_name, default_phone_country_code, last_test_at, last_test_result, last_test_message")
        .limit(1)
        .maybeSingle();

      if (fetchError) throw fetchError;
      if (data) {
        setConfig(rowToConfig(data));
      } else {
        setConfig({ ...defaultConfig });
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erro ao carregar configuração.";
      console.error("Error fetching evolution_api_config:", err);
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
    async (payload: EvolutionApiConfig) => {
      try {
        const row = {
          enabled: payload.enabled,
          base_url: payload.baseUrl,
          token: payload.token,
          default_sender_name: payload.defaultSenderName,
          default_phone_country_code: payload.defaultPhoneCountryCode,
          last_test_at: payload.lastTestAt ?? null,
          last_test_result: payload.lastTestResult ?? null,
          last_test_message: payload.lastTestMessage ?? null,
        };

        const selectFields = "id, enabled, base_url, token, default_sender_name, default_phone_country_code, last_test_at, last_test_result, last_test_message";

        if (payload.id) {
          const { data, error: updateError } = await supabase
            .from("evolution_api_config")
            .update(row)
            .eq("id", payload.id)
            .select(selectFields)
            .single();

          if (updateError) throw updateError;
          if (data) setConfig(rowToConfig(data));
        } else {
          const { data, error: insertError } = await supabase
            .from("evolution_api_config")
            .insert(row)
            .select(selectFields)
            .single();

          if (insertError) throw insertError;
          if (data) setConfig(rowToConfig(data));
        }

        toast({
          title: "Configurações salvas",
          description: "As credenciais da Evolution API foram salvas e ficam disponíveis em todo o sistema.",
        });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Não foi possível salvar as configurações.";
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

  const setConfigLocal = useCallback((patch: Partial<EvolutionApiConfig> | ((prev: EvolutionApiConfig) => EvolutionApiConfig)) => {
    setConfig((prev) => (typeof patch === "function" ? patch(prev) : { ...prev, ...patch }));
  }, []);

  const saveLastTestResult = useCallback(
    async (result: "success" | "error", message: string | null) => {
      const id = config.id;
      if (!id) return;
      const now = new Date().toISOString();
      try {
        const { data, error: updateError } = await supabase
          .from("evolution_api_config")
          .update({
            last_test_at: now,
            last_test_result: result,
            last_test_message: message,
          })
          .eq("id", id)
          .select("id, enabled, base_url, token, default_sender_name, default_phone_country_code, last_test_at, last_test_result, last_test_message")
          .single();

        if (updateError) throw updateError;
        if (data) setConfig(rowToConfig(data));
      } catch (err) {
        console.error("Error saving last test result:", err);
      }
    },
    [config.id]
  );

  return { config, isLoading, error, fetchConfig, saveConfig, saveLastTestResult, setConfig: setConfigLocal };
};
