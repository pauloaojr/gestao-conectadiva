import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export type MinioConfig = {
  id?: string;
  enabled: boolean;
  endpoint: string;
  port: number;
  useSsl: boolean;
  accessKey: string;
  secretKey: string;
  bucket: string;
  region: string;
  basePath: string;
  lastTestAt: string | null;
  lastTestResult: "success" | "error" | null;
  lastTestMessage: string | null;
};

const defaultConfig: MinioConfig = {
  enabled: false,
  endpoint: "",
  port: 9000,
  useSsl: false,
  accessKey: "",
  secretKey: "",
  bucket: "",
  region: "us-east-1",
  basePath: "",
  lastTestAt: null,
  lastTestResult: null,
  lastTestMessage: null,
};

function rowToConfig(row: {
  id: string;
  enabled: boolean;
  endpoint: string;
  port: number;
  use_ssl: boolean;
  access_key: string;
  secret_key: string;
  bucket: string;
  region: string;
  base_path: string;
  last_test_at: string | null;
  last_test_result: string | null;
  last_test_message: string | null;
}): MinioConfig {
  const result =
    row.last_test_result === "success" || row.last_test_result === "error"
      ? row.last_test_result
      : null;
  return {
    id: row.id,
    enabled: row.enabled,
    endpoint: row.endpoint,
    port: row.port,
    useSsl: row.use_ssl,
    accessKey: row.access_key,
    secretKey: row.secret_key,
    bucket: row.bucket,
    region: row.region,
    basePath: row.base_path,
    lastTestAt: row.last_test_at ?? null,
    lastTestResult: result,
    lastTestMessage: row.last_test_message ?? null,
  };
}

export const useMinioConfig = () => {
  const { toast } = useToast();
  const [config, setConfig] = useState<MinioConfig>(defaultConfig);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchConfig = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from("minio_storage_config")
        .select(
          "id, enabled, endpoint, port, use_ssl, access_key, secret_key, bucket, region, base_path, last_test_at, last_test_result, last_test_message"
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
        err instanceof Error ? err.message : "Erro ao carregar configuração do Minio.";
      console.error("Error fetching minio_storage_config:", err);
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
    async (payload: MinioConfig) => {
      try {
        const row = {
          enabled: payload.enabled,
          endpoint: payload.endpoint,
          port: payload.port,
          use_ssl: payload.useSsl,
          access_key: payload.accessKey,
          secret_key: payload.secretKey,
          bucket: payload.bucket,
          region: payload.region,
          base_path: payload.basePath,
          last_test_at: payload.lastTestAt ?? null,
          last_test_result: payload.lastTestResult ?? null,
          last_test_message: payload.lastTestMessage ?? null,
        };

        const selectFields =
          "id, enabled, endpoint, port, use_ssl, access_key, secret_key, bucket, region, base_path, last_test_at, last_test_result, last_test_message";

        if (payload.id) {
          const { data, error: updateError } = await supabase
            .from("minio_storage_config")
            .update(row)
            .eq("id", payload.id)
            .select(selectFields)
            .single();

          if (updateError) throw updateError;
          if (data) setConfig(rowToConfig(data));
        } else {
          const { data, error: insertError } = await supabase
            .from("minio_storage_config")
            .insert(row)
            .select(selectFields)
            .single();

          if (insertError) throw insertError;
          if (data) setConfig(rowToConfig(data));
        }

        toast({
          title: "Configuração Minio salva",
          description: "Os parâmetros de conexão do Minio foram atualizados.",
        });
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : "Não foi possível salvar a configuração Minio.";
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
    (patch: Partial<MinioConfig> | ((prev: MinioConfig) => MinioConfig)) => {
      setConfig((prev) =>
        typeof patch === "function" ? patch(prev) : { ...prev, ...patch }
      );
    },
    []
  );

  const saveLastTestResult = useCallback(
    async (result: "success" | "error", message: string | null) => {
      const id = config.id;
      if (!id) return;
      const now = new Date().toISOString();
      try {
        const { data, error: updateError } = await supabase
          .from("minio_storage_config")
          .update({
            last_test_at: now,
            last_test_result: result,
            last_test_message: message,
          })
          .eq("id", id)
          .select(
            "id, enabled, endpoint, port, use_ssl, access_key, secret_key, bucket, region, base_path, last_test_at, last_test_result, last_test_message"
          )
          .single();

        if (updateError) throw updateError;
        if (data) setConfig(rowToConfig(data));
      } catch (err) {
        console.error("Error saving minio last test:", err);
      }
    },
    [config.id]
  );

  return {
    config,
    isLoading,
    error,
    fetchConfig,
    saveConfig,
    saveLastTestResult,
    setConfig: setConfigLocal,
  };
};
