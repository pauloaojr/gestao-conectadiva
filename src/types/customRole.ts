import { UserPermissions } from './user';

export interface CustomRole {
  id: string;
  name: string;
  description: string | null;
  permissions: UserPermissions;
  is_system: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateCustomRoleData {
  name: string;
  description?: string;
  permissions: UserPermissions;
}

export interface UpdateCustomRoleData {
  name?: string;
  description?: string;
  permissions?: UserPermissions;
}
