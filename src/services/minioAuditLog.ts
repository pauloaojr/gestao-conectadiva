import { supabase } from "@/integrations/supabase/client";

export type MinioAuditAction = "upload" | "remove" | "cleanup" | "test" | "other";
export type MinioAuditStatus = "success" | "error" | "info";

type MinioAuditPayload = {
  action: MinioAuditAction;
  status: MinioAuditStatus;
  module?: string | null;
  correlationId?: string | null;
  actorUserId?: string | null;
  storageKey?: string | null;
  bucket?: string | null;
  prefix?: string | null;
  message?: string | null;
  errorMessage?: string | null;
  metadata?: Record<string, unknown>;
};

export async function recordMinioAuditLog(payload: MinioAuditPayload): Promise<void> {
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    const actorUserId = payload.actorUserId ?? session?.user?.id ?? null;

    const { error } = await supabase.from("minio_storage_audit_logs").insert({
      actor_user_id: actorUserId,
      action: payload.action,
      status: payload.status,
      module: payload.module ?? null,
      correlation_id: payload.correlationId ?? null,
      storage_key: payload.storageKey ?? null,
      bucket: payload.bucket ?? null,
      prefix: payload.prefix ?? null,
      message: payload.message ?? null,
      error_message: payload.errorMessage ?? null,
      metadata_json: payload.metadata ?? {},
    });

    if (error) {
      console.warn("[MinioAudit] failed to persist log:", error.message);
    }
  } catch (err) {
    console.warn("[MinioAudit] unexpected error:", err);
  }
}
