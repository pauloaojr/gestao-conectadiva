import { supabase } from "@/integrations/supabase/client";

export type SystemAuditAction = "create" | "update" | "delete" | "view" | "other";

type SystemAuditPayload = {
  menuGroup: string;
  menu: string;
  screen: string;
  action: SystemAuditAction;
  entityType: string;
  entityId?: string | null;
  message?: string | null;
  metadata?: Record<string, unknown>;
  actorUserId?: string | null;
};

export async function recordSystemAuditLog(payload: SystemAuditPayload): Promise<void> {
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const actorUserId = payload.actorUserId ?? session?.user?.id ?? null;

    const { error } = await supabase.from("system_audit_logs").insert({
      actor_user_id: actorUserId,
      menu_group: payload.menuGroup,
      menu: payload.menu,
      screen: payload.screen,
      action: payload.action,
      entity_type: payload.entityType,
      entity_id: payload.entityId ?? null,
      message: payload.message ?? null,
      metadata_json: payload.metadata ?? {},
    });

    if (error) {
      console.warn("[SystemAudit] failed to persist log:", error.message);
    }
  } catch (err) {
    console.warn("[SystemAudit] unexpected error:", err);
  }
}
