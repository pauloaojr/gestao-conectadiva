import type { UserPermissions } from "@/types/user";

type HasPermissionFn = (
  permission: keyof UserPermissions,
  action?: "view" | "status" | "edit" | "delete"
) => boolean;

type UserWithRole = { role?: string } | null;

/**
 * Verifica se o usuário pode ver TODOS os repasses (de todos os profissionais).
 * Retorna true quando:
 * - Admin
 * - Gerente (manager)
 * - Possui permissão de editar ou deletar em Relatórios
 *
 * Caso contrário, retorna false e a tela deve restringir aos repasses do próprio usuário.
 */
export function canSeeAllRepasses(
  hasPermission: HasPermissionFn,
  user: UserWithRole
): boolean {
  if (!user) return false;
  if (user.role === "admin" || user.role === "manager") return true;
  return hasPermission("reports", "edit") || hasPermission("reports", "delete");
}

/**
 * Verifica se o usuário pode ver TODOS os agendamentos (de todos os profissionais).
 * Retorna true quando:
 * - Admin
 * - Gerente (manager)
 * - Possui permissão de editar ou deletar em Agenda (schedule)
 *
 * Caso contrário, retorna false e a tela deve restringir aos agendamentos do próprio usuário.
 */
export function canSeeAllSchedule(
  hasPermission: HasPermissionFn,
  user: UserWithRole
): boolean {
  if (!user) return false;
  if (user.role === "admin" || user.role === "manager") return true;
  return hasPermission("schedule", "edit") || hasPermission("schedule", "delete");
}

/** Pode alterar apenas o status do agendamento (sem editar paciente, data, etc.) */
export function canUpdateScheduleStatus(hasPermission: HasPermissionFn): boolean {
  return hasPermission("schedule", "status");
}

/** Pode editar completamente o agendamento (paciente, data, horário, etc.) */
export function canFullEditSchedule(hasPermission: HasPermissionFn): boolean {
  return hasPermission("schedule", "edit") || hasPermission("schedule", "delete");
}

/** Pode deletar agendamento */
export function canDeleteSchedule(hasPermission: HasPermissionFn): boolean {
  return hasPermission("schedule", "delete");
}
