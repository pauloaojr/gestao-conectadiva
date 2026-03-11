/**
 * Níveis de permissão por recurso: nenhum, visualizar, editar ou deletar.
 * Editar implica visualizar; Deletar implica editar e visualizar.
 */
export type PermissionLevel = 'none' | 'view' | 'edit' | 'delete';

/** Recursos que possuem permissão granular (visualizar / editar / deletar) */
export type GranularResource =
  | 'patients'
  | 'medicalRecords'
  | 'schedule'
  | 'settings'
  | 'userManagement'
  | 'scheduleManagement'
  | 'serviceManagement'
  | 'integrations'
  | 'api'
  | 'audit';

/** Abas de Configurações para permissão por aba */
export type SettingsTabId =
  | 'perfil'
  | 'personalizacao'
  | 'establishment'
  | 'security'
  | 'notifications'
  | 'repasse'
  | 'plano'
  | 'statusAgenda'
  | 'roles'
  | 'users';

export const SETTINGS_TAB_IDS: SettingsTabId[] = [
  'perfil', 'personalizacao', 'establishment', 'security', 'notifications',
  'repasse', 'plano', 'statusAgenda', 'roles', 'users',
];

export const SETTINGS_TAB_LABELS: Record<SettingsTabId, string> = {
  perfil: 'Perfil',
  personalizacao: 'Personalização',
  establishment: 'Estabelecimento',
  security: 'Segurança',
  notifications: 'Notificações',
  repasse: 'Repasse',
  plano: 'Plano',
  statusAgenda: 'Status Agenda',
  roles: 'Funções',
  users: 'Usuários',
};

/** Verifica se o nível de permissão permite a ação (view < edit < delete) */
export function levelAllows(level: PermissionLevel, action: 'view' | 'edit' | 'delete'): boolean {
  if (level === 'none') return false;
  if (action === 'view') return level === 'view' || level === 'edit' || level === 'delete';
  if (action === 'edit') return level === 'edit' || level === 'delete';
  if (action === 'delete') return level === 'delete';
  return false;
}

/** Normaliza valor legado (boolean) ou string para PermissionLevel */
export function normalizePermissionLevel(value: unknown): PermissionLevel {
  if (value === true) return 'delete';
  if (value === false || value === undefined || value === null) return 'none';
  if (value === 'view' || value === 'edit' || value === 'delete') return value;
  return 'none';
}

/** Tipo de permissões que pode ser legado (boolean) ou novo (level + settingsTabs) */
export interface PermissionsLike {
  patients?: PermissionLevel | boolean;
  medicalRecords?: PermissionLevel | boolean;
  schedule?: PermissionLevel | boolean;
  settings?: PermissionLevel | boolean;
  userManagement?: PermissionLevel | boolean;
  scheduleManagement?: PermissionLevel | boolean;
  serviceManagement?: PermissionLevel | boolean;
  integrations?: PermissionLevel | boolean;
  api?: PermissionLevel | boolean;
  audit?: PermissionLevel | boolean;
  settingsTabs?: Partial<Record<SettingsTabId, PermissionLevel>>;
}

/** Retorna permissões padrão (todos nenhum) para nova função */
export function getDefaultGranularPermissions(): Record<GranularResource, PermissionLevel> & { settingsTabs: Record<SettingsTabId, PermissionLevel> } {
  const levels: Record<SettingsTabId, PermissionLevel> = {
    perfil: 'none',
    personalizacao: 'none',
    establishment: 'none',
    security: 'none',
    notifications: 'none',
    repasse: 'none',
    plano: 'none',
    statusAgenda: 'none',
    roles: 'none',
    users: 'none',
  };
  return {
    patients: 'none',
    medicalRecords: 'none',
    schedule: 'none',
    settings: 'none',
    userManagement: 'none',
    scheduleManagement: 'none',
    serviceManagement: 'none',
    integrations: 'none',
    api: 'none',
    audit: 'none',
    settingsTabs: levels,
  };
}

/** Normaliza permissões legadas (boolean) para formato com níveis (para exibição em formulário) */
export function normalizePermissionsForForm(
  raw: PermissionsLike & { dashboard?: boolean; reports?: boolean; financial?: boolean }
): PermissionsLike & { dashboard: boolean; reports: boolean; financial?: boolean } {
  const defaults = getDefaultGranularPermissions();
  const tabs = { ...defaults.settingsTabs };
  if (raw.settingsTabs) {
    for (const k of SETTINGS_TAB_IDS) {
      if (raw.settingsTabs[k] != null) tabs[k] = raw.settingsTabs[k]!;
    }
  }
  return {
    dashboard: raw.dashboard ?? true,
    reports: raw.reports ?? false,
    financial: raw.financial ?? false,
    patients: normalizePermissionLevel((raw as Record<string, unknown>).patients ?? 'none'),
    medicalRecords: normalizePermissionLevel((raw as Record<string, unknown>).medicalRecords ?? 'none'),
    schedule: normalizePermissionLevel((raw as Record<string, unknown>).schedule ?? 'none'),
    settings: normalizePermissionLevel((raw as Record<string, unknown>).settings ?? 'none'),
    userManagement: normalizePermissionLevel((raw as Record<string, unknown>).userManagement ?? 'none'),
    scheduleManagement: normalizePermissionLevel((raw as Record<string, unknown>).scheduleManagement ?? 'none'),
    serviceManagement: normalizePermissionLevel((raw as Record<string, unknown>).serviceManagement ?? 'none'),
    integrations: normalizePermissionLevel((raw as Record<string, unknown>).integrations ?? 'none'),
    api: normalizePermissionLevel((raw as Record<string, unknown>).api ?? 'none'),
    audit: normalizePermissionLevel((raw as Record<string, unknown>).audit ?? 'none'),
    settingsTabs: tabs,
  } as PermissionsLike & { dashboard: boolean; reports: boolean; financial?: boolean };
}

const LEVEL_LABEL: Record<PermissionLevel, string> = {
  none: 'Nenhum',
  view: 'Visualizar',
  edit: 'Editar',
  delete: 'Deletar',
};

/** Conta quantos recursos/abas têm permissão diferente de "none" */
export function countNonNonePermissions(permissions: PermissionsLike): number {
  let n = 0;
  for (const r of ['patients', 'medicalRecords', 'schedule', 'settings', 'userManagement', 'scheduleManagement', 'serviceManagement', 'integrations', 'api', 'audit'] as const) {
    if (normalizePermissionLevel((permissions as Record<string, unknown>)[r]) !== 'none') n++;
  }
  if (permissions.settingsTabs) {
    for (const level of Object.values(permissions.settingsTabs)) {
      if (level && level !== 'none') n++;
    }
  }
  return n;
}

/** Retorna resumo curto das permissões (ex.: "Pacientes: Editar, Agenda: Visualizar") */
export function formatPermissionsSummary(
  permissions: PermissionsLike,
  resourceLabels: Record<string, string>,
  settingsTabLabels?: Record<string, string>,
  maxItems = 5
): string {
  const parts: string[] = [];
  for (const r of ['patients', 'medicalRecords', 'schedule', 'settings', 'userManagement', 'scheduleManagement', 'serviceManagement', 'integrations', 'api', 'audit'] as const) {
    const level = normalizePermissionLevel((permissions as Record<string, unknown>)[r]);
    if (level !== 'none') parts.push(`${resourceLabels[r] ?? r}: ${LEVEL_LABEL[level]}`);
  }
  if (permissions.settingsTabs && settingsTabLabels) {
    for (const [tab, level] of Object.entries(permissions.settingsTabs)) {
      if (level && level !== 'none') parts.push(`Config. ${settingsTabLabels[tab] ?? tab}: ${LEVEL_LABEL[level as PermissionLevel]}`);
    }
  }
  if (parts.length === 0) return 'Nenhuma';
  if (parts.length <= maxItems) return parts.join(', ');
  return parts.slice(0, maxItems).join(', ') + ` +${parts.length - maxItems}`;
}

/** Obtém o nível efetivo para um recurso (e opcionalmente aba de configurações) */
export function getEffectiveLevel(
  permissions: PermissionsLike | undefined,
  resource: GranularResource,
  settingsTab?: SettingsTabId
): PermissionLevel {
  if (!permissions) return 'none';
  if (resource === 'settings' && settingsTab && permissions.settingsTabs?.[settingsTab] != null) {
    return normalizePermissionLevel(permissions.settingsTabs[settingsTab]);
  }
  const raw = (permissions as Record<string, unknown>)[resource];
  return normalizePermissionLevel(raw);
}
