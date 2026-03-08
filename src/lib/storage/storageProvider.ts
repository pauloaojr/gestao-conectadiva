import { supabase } from "@/integrations/supabase/client";
import { recordMinioAuditLog } from "@/services/minioAuditLog";

export type StorageUploadInput = {
  file: File;
  bucket?: string;
  path?: string;
  requireMinio?: boolean;
  /** Módulo para auditoria (ex.: "patients", "attendants"). */
  module?: string;
};

export type StorageUploadResult = {
  key: string;
  url: string;
  provider: "inline" | "minio";
};

export type StorageProvider = {
  upload: (input: StorageUploadInput) => Promise<StorageUploadResult>;
  getPublicUrl: (key: string) => string;
  remove: (key: string) => Promise<void>;
};

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Falha ao ler arquivo."));
    reader.readAsDataURL(file);
  });
}

class InlineStorageProvider implements StorageProvider {
  async upload(input: StorageUploadInput): Promise<StorageUploadResult> {
    const url = await fileToDataUrl(input.file);
    return {
      key: url,
      url,
      provider: "inline",
    };
  }

  getPublicUrl(key: string): string {
    return key;
  }

  async remove(_key: string): Promise<void> {
    return;
  }
}

type RuntimeMinioConfig = {
  enabled: boolean;
  endpoint: string;
  port: number;
  useSsl: boolean;
  accessKey: string;
  secretKey: string;
  bucket: string;
  region: string;
  basePath: string;
};

async function fileToBase64(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  let binary = "";
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}

function getConfiguredBackendUrl(raw: string | null | undefined): string | null {
  const url = String(raw || "").trim();
  if (!url) return null;
  return url.replace(/\/+$/, "");
}

async function loadMinioRuntime(): Promise<{
  minio: RuntimeMinioConfig | null;
  backendUrl: string | null;
}> {
  const [{ data: minioRow }, { data: emailRow }] = await Promise.all([
    supabase
      .from("minio_storage_config")
      .select("enabled, endpoint, port, use_ssl, access_key, secret_key, bucket, region, base_path")
      .limit(1)
      .maybeSingle(),
    supabase.from("email_smtp_config").select("backend_url").limit(1).maybeSingle(),
  ]);

  const backendUrl = getConfiguredBackendUrl(emailRow?.backend_url ?? null);
  if (!minioRow || !minioRow.enabled) {
    return { minio: null, backendUrl };
  }

  const minio: RuntimeMinioConfig = {
    enabled: Boolean(minioRow.enabled),
    endpoint: String(minioRow.endpoint || ""),
    port: Number(minioRow.port) || 9000,
    useSsl: Boolean(minioRow.use_ssl),
    accessKey: String(minioRow.access_key || ""),
    secretKey: String(minioRow.secret_key || ""),
    bucket: String(minioRow.bucket || ""),
    region: String(minioRow.region || "us-east-1"),
    basePath: String(minioRow.base_path || ""),
  };

  const hasRequired = Boolean(
    minio.endpoint.trim() &&
      minio.accessKey.trim() &&
      minio.secretKey.trim() &&
      minio.bucket.trim() &&
      backendUrl
  );
  return { minio: hasRequired ? minio : null, backendUrl };
}

class SmartStorageProvider implements StorageProvider {
  private inlineProvider = new InlineStorageProvider();

  async upload(input: StorageUploadInput): Promise<StorageUploadResult> {
    const correlationId = crypto.randomUUID();
    const { minio, backendUrl } = await loadMinioRuntime();
    if (!minio || !backendUrl) {
      if (input.requireMinio) {
        await recordMinioAuditLog({
          action: "upload",
          status: "error",
          module: input.module || "storage",
          correlationId,
          message: "Upload Minio obrigatório sem configuração válida.",
          errorMessage:
            "Minio não está configurado. Configure endpoint, bucket, credenciais e URL do backend em Integrações.",
          metadata: {
            requireMinio: true,
            path: input.path || null,
            fileName: input.file.name,
          },
        });
        throw new Error(
          "Minio não está configurado. Configure endpoint, bucket, credenciais e URL do backend em Integrações."
        );
      }
      return this.inlineProvider.upload(input);
    }

    try {
      const contentBase64 = await fileToBase64(input.file);
      const response = await fetch(`${backendUrl}/api/storage/minio/upload`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          config: minio,
          bucket: input.bucket || minio.bucket,
          path: input.path || "",
          file: {
            name: input.file.name,
            type: input.file.type,
            contentBase64,
          },
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok || data?.success === false || !data?.url || !data?.key) {
        throw new Error(data?.details || data?.error || `HTTP ${response.status}`);
      }

      await recordMinioAuditLog({
        action: "upload",
        status: "success",
        module: input.module || "storage",
        correlationId,
        storageKey: String(data.key),
        bucket: input.bucket || minio.bucket,
        prefix: input.path || null,
        message: "Upload no Minio concluído com sucesso.",
        metadata: {
          fileName: input.file.name,
          fileType: input.file.type,
          fileSize: input.file.size,
          provider: "minio",
        },
      });

      return {
        key: String(data.key),
        url: String(data.url),
        provider: "minio",
      };
    } catch (error) {
      await recordMinioAuditLog({
        action: "upload",
        status: "error",
        module: input.module || "storage",
        correlationId,
        bucket: input.bucket || minio.bucket,
        prefix: input.path || null,
        message: "Falha no upload Minio.",
        errorMessage: error instanceof Error ? error.message : "Erro desconhecido no upload Minio.",
        metadata: {
          fileName: input.file.name,
          fileType: input.file.type,
          fileSize: input.file.size,
          requireMinio: Boolean(input.requireMinio),
        },
      });
      if (input.requireMinio) {
        throw error instanceof Error
          ? error
          : new Error("Falha no upload obrigatório para Minio.");
      }
      console.warn("[StorageProvider] fallback inline upload:", error);
      return this.inlineProvider.upload(input);
    }
  }

  getPublicUrl(key: string): string {
    return key;
  }

  async remove(key: string): Promise<void> {
    const correlationId = crypto.randomUUID();
    const normalizedKey = String(key || "").trim();
    if (!normalizedKey || normalizedKey.startsWith("data:")) return;

    const { minio, backendUrl } = await loadMinioRuntime();
    if (!minio || !backendUrl) return;

    const response = await fetch(`${backendUrl}/api/storage/minio/remove`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        config: minio,
        key: normalizedKey,
        bucket: minio.bucket,
      }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || data?.success === false) {
      await recordMinioAuditLog({
        action: "remove",
        status: "error",
        module: "storage",
        correlationId,
        storageKey: normalizedKey,
        bucket: minio.bucket,
        message: "Falha ao remover objeto do Minio.",
        errorMessage: data?.details || data?.error || `Falha ao remover arquivo (HTTP ${response.status}).`,
      });
      throw new Error(data?.details || data?.error || `Falha ao remover arquivo (HTTP ${response.status}).`);
    }

    await recordMinioAuditLog({
      action: "remove",
      status: "success",
      module: "storage",
      correlationId,
      storageKey: normalizedKey,
      bucket: minio.bucket,
      message: "Objeto removido do Minio com sucesso.",
    });
  }
}

export const storageProvider: StorageProvider = new SmartStorageProvider();
