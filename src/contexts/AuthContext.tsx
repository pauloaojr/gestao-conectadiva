import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { UserRole, ROLE_PERMISSIONS, ROLE_LABELS, UserPermissions } from '@/types/user';
import type { SettingsTabId } from '@/types/permissions';
import { getEffectiveLevel, levelAllows } from '@/types/permissions';
import type { GranularResource } from '@/types/permissions';
import { User as SupabaseUser, Session } from '@supabase/supabase-js';

interface User {
  id: string;
  name: string;
  email: string;
  /** role do usuário: 'admin'|'manager'|'user' ou UUID de custom_roles */
  role: UserRole | string;
  /** Nome exibido da função (ex.: "Administrador", "Recepcionista") */
  roleDisplayName?: string;
  /** Permissões efetivas quando role for uma função personalizada (UUID); senão usa ROLE_PERMISSIONS[role] */
  permissions?: UserPermissions;
  phone?: string;
  position?: string;
  avatar_url?: string;
  passwordChangedAt?: string;
}

export type LoginResult = { success: true } | { success: false; errorCode?: string };

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<LoginResult>;
  register: (name: string, email: string, password: string) => Promise<boolean>;
  logout: () => void;
  changePassword: (currentPassword: string, newPassword: string) => Promise<boolean>;
  isLoading: boolean;
  isPasswordExpired: () => boolean;
  /** Verifica permissão. Para recursos granulares (patients, schedule, etc.) use action 'view'|'edit'|'delete'; para settings use settingsTab para aba. */
  hasPermission: (permission: keyof UserPermissions, action?: 'view' | 'edit' | 'delete', settingsTab?: SettingsTabId) => boolean;
  getUserPermissions: () => UserPermissions;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);
const BOOTSTRAP_TIMEOUT_MS = 15000;
const RETRY_DELAY_MS = 600;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> {
  let timeoutId: number | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = window.setTimeout(
      () => reject(new Error(`${label} timeout após ${timeoutMs}ms`)),
      timeoutMs
    );
  });

  try {
    return (await Promise.race([promise, timeoutPromise])) as T;
  } finally {
    if (timeoutId !== undefined) {
      window.clearTimeout(timeoutId);
    }
  }
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchUserRole = async (userId: string): Promise<string> => {
    try {
      for (let attempt = 1; attempt <= 2; attempt += 1) {
        try {
          const { data, error } = await withTimeout(
            supabase.from('user_roles').select('role').eq('user_id', userId).maybeSingle(),
            BOOTSTRAP_TIMEOUT_MS,
            'fetchUserRole'
          );

          if (error) {
            throw error;
          }

          return typeof data?.role === 'string' ? data.role : 'user';
        } catch (attemptError) {
          if (attempt === 2) {
            throw attemptError;
          }
          await sleep(RETRY_DELAY_MS);
        }
      }
    } catch (err) {
      console.error('Error fetching user role:', err);
      return 'user';
    }
  };

  const SYSTEM_ROLES: UserRole[] = ['admin', 'manager', 'user'];

  const fetchCustomRole = async (customRoleId: string): Promise<{ permissions: UserPermissions; name: string } | null> => {
    try {
      const { data, error } = await supabase
        .from('custom_roles')
        .select('permissions, name')
        .eq('id', customRoleId)
        .maybeSingle();
      if (error || !data?.permissions) return null;
      return { permissions: data.permissions as UserPermissions, name: data.name ?? '' };
    } catch {
      return null;
    }
  };

  const fetchUserProfile = async (userId: string): Promise<{
    name: string;
    email: string;
    phone: string | null;
    position: string | null;
    avatar_url: string | null;
  } | null> => {
    try {
      for (let attempt = 1; attempt <= 2; attempt += 1) {
        try {
          const { data, error } = await withTimeout(
            supabase
              .from('profiles')
              .select('name, email, phone, position, avatar_url')
              .eq('user_id', userId)
              .maybeSingle(),
            BOOTSTRAP_TIMEOUT_MS,
            'fetchUserProfile'
          );

          if (error) {
            throw error;
          }

          return data;
        } catch (attemptError) {
          if (attempt === 2) {
            throw attemptError;
          }
          await sleep(RETRY_DELAY_MS);
        }
      }
    } catch (err) {
      console.error('Error fetching user profile:', err);
      return null;
    }
  };

  const buildUserFromSession = async (session: Session): Promise<User> => {
    const supabaseUser = session.user;
    if (!supabaseUser?.id) {
      return {
        id: '',
        name: 'Usuário',
        email: supabaseUser?.email ?? '',
        role: 'user'
      };
    }

    const [roleResult, profileResult] = await Promise.allSettled([
      fetchUserRole(supabaseUser.id),
      fetchUserProfile(supabaseUser.id)
    ]);

    const roleRaw: string = roleResult.status === 'fulfilled' ? roleResult.value : 'user';
    const profile = profileResult.status === 'fulfilled' ? profileResult.value : null;

    const isSystemRole = SYSTEM_ROLES.includes(roleRaw as UserRole);
    let permissions: UserPermissions | undefined;
    let roleDisplayName: string | undefined;
    if (isSystemRole) {
      roleDisplayName = ROLE_LABELS[roleRaw as UserRole];
    } else if (roleRaw && /^[0-9a-f-]{36}$/i.test(roleRaw)) {
      const custom = await fetchCustomRole(roleRaw);
      if (custom) {
        permissions = custom.permissions;
        roleDisplayName = custom.name;
      }
    }

    return {
      id: supabaseUser.id,
      name: profile?.name || supabaseUser.user_metadata?.name || supabaseUser.email || 'Usuário',
      email: profile?.email || supabaseUser.email || '',
      role: roleRaw,
      roleDisplayName,
      permissions,
      phone: profile?.phone || '',
      position: profile?.position || '',
      avatar_url: profile?.avatar_url || '',
      passwordChangedAt: supabaseUser.user_metadata?.password_changed_at
    };
  };

  const buildMinimalUserFromSession = (session: Session): User => {
    const u = session.user;
    return {
      id: u?.id ?? '',
      name: u?.user_metadata?.name || u?.email || 'Usuário',
      email: u?.email ?? '',
      role: 'user'
    };
  };

  useEffect(() => {
    let isMounted = true;

    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!isMounted) return;

      if (session) {
        // Use setTimeout to avoid potential race conditions with Supabase internals
        setTimeout(async () => {
          if (!isMounted) return;
          try {
            const userData = await buildUserFromSession(session);
            if (isMounted) {
              setUser(userData);
              setIsLoading(false);
            }
          } catch (error) {
            console.error('Error building user from session:', error);
            if (isMounted) {
              setUser(buildMinimalUserFromSession(session));
              setIsLoading(false);
            }
          }
        }, 0);
      } else {
        setUser(null);
        setIsLoading(false);
      }
    });

    // Then check for existing session
    const initSession = async () => {
      try {
        const { data: { session } } = await withTimeout(
          supabase.auth.getSession(),
          BOOTSTRAP_TIMEOUT_MS,
          'getSession'
        );

        if (!isMounted) return;

        if (session) {
          try {
            const userData = await buildUserFromSession(session);
            if (isMounted) setUser(userData);
          } catch (err) {
            console.error('Error initializing session:', err);
            if (isMounted) setUser(buildMinimalUserFromSession(session));
          }
        }
      } catch (error) {
        console.error('Error initializing session:', error);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    initSession();

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string): Promise<LoginResult> => {
    try {
      setIsLoading(true);
      // Normalizar e-mail (trim + minúsculas) para bater com auth.users e evitar falha por diferença de caixa
      const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';

      const { data, error } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password
      });

      if (error) {
        console.error('Login error:', error);
        const code = error.message?.toLowerCase().includes('invalid') ? 'invalid_credentials' : undefined;
        return { success: false, errorCode: code };
      }

      if (data.session) {
        const userData = await buildUserFromSession(data.session);
        setUser(userData);
        return { success: true };
      }

      return { success: false };
    } catch (err) {
      console.error('Login error:', err);
      return { success: false };
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (name: string, email: string, password: string): Promise<boolean> => {
    try {
      setIsLoading(true);

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
            password_changed_at: new Date().toISOString().split('T')[0]
          }
        }
      });

      if (error) {
        console.error('Registration error:', error);
        return false;
      }

      if (data.session) {
        const userData = await buildUserFromSession(data.session);
        setUser(userData);
        return true;
      }

      // User might need to confirm email
      return true;
    } catch (err) {
      console.error('Registration error:', err);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  const changePassword = async (currentPassword: string, newPassword: string): Promise<boolean> => {
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) {
        console.error('Password change error:', error);
        return false;
      }

      // Update password changed date in metadata
      await supabase.auth.updateUser({
        data: {
          password_changed_at: new Date().toISOString().split('T')[0]
        }
      });

      if (user) {
        setUser({
          ...user,
          passwordChangedAt: new Date().toISOString().split('T')[0]
        });
      }

      return true;
    } catch (err) {
      console.error('Password change error:', err);
      return false;
    }
  };

  const isPasswordExpired = (): boolean => {
    if (!user?.passwordChangedAt) return false;

    const passwordChangedDate = new Date(user.passwordChangedAt);
    const expiryDays = parseInt(localStorage.getItem('clinic_password_expiry') || '90');
    const expiryDate = new Date(passwordChangedDate.getTime() + (expiryDays * 24 * 60 * 60 * 1000));

    return new Date() > expiryDate;
  };

  const hasPermission = (
    permission: keyof UserPermissions,
    action: 'view' | 'edit' | 'delete' = 'view',
    settingsTab?: SettingsTabId
  ): boolean => {
    if (!user || !user.role) return false;

    const effectivePermissions: UserPermissions | undefined = user.permissions ?? ROLE_PERMISSIONS[user.role as UserRole] ?? undefined;
    if (!effectivePermissions) return false;

    const granularResources: (keyof UserPermissions)[] = [
      'patients', 'medicalRecords', 'schedule', 'settings',
      'userManagement', 'scheduleManagement', 'serviceManagement',
      'integrations', 'audit',
    ];
    if (granularResources.includes(permission)) {
      const level = getEffectiveLevel(effectivePermissions, permission as GranularResource, settingsTab);
      return levelAllows(level, action);
    }

    return !!(effectivePermissions as Record<string, unknown>)[permission];
  };

  const getUserPermissions = (): UserPermissions => {
    const empty: UserPermissions = {
      dashboard: false,
      reports: false,
      financial: false,
      patients: 'none',
      medicalRecords: 'none',
      schedule: 'none',
      settings: 'none',
      userManagement: 'none',
      scheduleManagement: 'none',
      serviceManagement: 'none',
      integrations: 'none',
      audit: 'none',
    };

    if (!user || !user.role) return empty;

    if (user.permissions) return user.permissions;

    const userPermissions = ROLE_PERMISSIONS[user.role as UserRole];
    if (!userPermissions) return empty;

    return userPermissions;
  };

  const value: AuthContextType = {
    user,
    login,
    register,
    logout,
    changePassword,
    isLoading,
    isPasswordExpired,
    hasPermission,
    getUserPermissions,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
