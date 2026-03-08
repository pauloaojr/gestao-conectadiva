export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  position?: string;
  cpf?: string;
  rg?: string;
  cnpj?: string;
  birthDate?: string;
  education?: string;
  gender?: 'masculino' | 'feminino' | 'outro' | '';
  maritalStatus?: 'solteiro' | 'casado' | 'divorciado' | 'viuvo' | '';
  notes?: string;
  professionalDocument?: string;
  professionalDocumentName?: string;
  professionalDocumentStorageKey?: string;
  addressLabel?: string;
  addressCep?: string;
  addressStreet?: string;
  addressNumber?: string;
  addressComplement?: string;
  addressState?: string;
  addressCountry?: string;
  serviceArea?: string;
  professionalCouncil?: string;
  bankName?: string;
  bankAgency?: string;
  bankAccount?: string;
  bankHolder?: string;
  pixKey?: string;
  contractStatus?: 'sem_contrato' | 'enviado' | 'assinado';
  contractDocument?: string;
  contractDocumentName?: string;
  contractDocumentStorageKey?: string;
  /** 'admin' | 'manager' | 'user' ou UUID de custom_roles */
  role: UserRole | string;
  createdAt: string;
  lastLogin?: string;
  isActive: boolean;
  workDays?: string[];
  customPermissions?: UserPermissions;
  avatar?: string; // base64 string
  avatarStorageKey?: string;
}

import type { PermissionLevel, SettingsTabId } from './permissions';

export type { PermissionLevel, SettingsTabId };
export type UserRole = 'admin' | 'manager' | 'user';

export interface UserPermissions {
  dashboard: boolean;
  reports: boolean;
  financial?: boolean;
  /** Recursos com nível: none | view | edit | delete (legado: boolean = delete | none) */
  patients?: PermissionLevel | boolean;
  medicalRecords?: PermissionLevel | boolean;
  schedule?: PermissionLevel | boolean;
  settings?: PermissionLevel | boolean;
  userManagement?: PermissionLevel | boolean;
  scheduleManagement?: PermissionLevel | boolean;
  serviceManagement?: PermissionLevel | boolean;
  integrations?: PermissionLevel | boolean;
  audit?: PermissionLevel | boolean;
  /** Configurações por aba (apenas funções customizadas) */
  settingsTabs?: Partial<Record<SettingsTabId, PermissionLevel>>;
}

export const ROLE_PERMISSIONS: Record<UserRole, UserPermissions> = {
  admin: {
    dashboard: true,
    patients: true,
    medicalRecords: true,
    schedule: true,
    reports: true,
    settings: true,
    userManagement: true,
    scheduleManagement: true,
    serviceManagement: true,
    integrations: true,
    audit: true,
    financial: true,
  },
  manager: {
    dashboard: true,
    patients: true,
    medicalRecords: true,
    schedule: true,
    reports: true,
    settings: false,
    userManagement: false,
    scheduleManagement: true,
    serviceManagement: true,
    integrations: false,
    audit: false,
    financial: true,
  },
  user: {
    dashboard: true,
    patients: true,
    medicalRecords: false,
    schedule: true,
    reports: false,
    settings: false,
    userManagement: false,
    scheduleManagement: false,
    serviceManagement: false,
    integrations: false,
    audit: false,
    financial: false,
  },
};

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Administrador',
  manager: 'Gerente',
  user: 'Usuário',
};
