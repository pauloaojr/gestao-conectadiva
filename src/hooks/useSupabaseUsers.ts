import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { recordSystemAuditLog } from '@/services/systemAuditLog';

export interface SupabaseUser {
  id: string;
  user_id: string;
  name: string;
  email: string;
  phone: string | null;
  position: string | null;
  cpf: string | null;
  rg: string | null;
  cnpj: string | null;
  birth_date: string | null;
  education: string | null;
  gender: 'masculino' | 'feminino' | 'outro' | null;
  marital_status: 'solteiro' | 'casado' | 'divorciado' | 'viuvo' | null;
  notes: string | null;
  professional_document: string | null;
  professional_document_name: string | null;
  professional_document_storage_key: string | null;
  address_label: string | null;
  address_cep: string | null;
  address_street: string | null;
  address_number: string | null;
  address_complement: string | null;
  address_state: string | null;
  address_country: string | null;
  service_area: string | null;
  professional_council: string | null;
  bank_name: string | null;
  bank_agency: string | null;
  bank_account: string | null;
  bank_holder: string | null;
  pix_key: string | null;
  contract_status: 'sem_contrato' | 'enviado' | 'assinado';
  contract_document: string | null;
  contract_document_name: string | null;
  contract_document_storage_key: string | null;
  avatar_url: string | null;
  avatar_storage_key: string | null;
  work_days: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
  role?: string;
}

export const useSupabaseUsers = () => {
  const { toast } = useToast();
  const [users, setUsers] = useState<SupabaseUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const normalizeForAudit = useCallback((value: unknown): unknown => {
    if (value === undefined || value === null) return null;
    if (typeof value === 'string') {
      const trimmed = value.trim();
      return trimmed === '' ? null : trimmed;
    }
    return value;
  }, []);

  const isEquivalentForAudit = useCallback(
    (a: unknown, b: unknown): boolean =>
      JSON.stringify(normalizeForAudit(a)) === JSON.stringify(normalizeForAudit(b)),
    [normalizeForAudit]
  );

  const fetchUsers = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Fetch profiles with their roles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('name', { ascending: true });

      if (profilesError) throw profilesError;

      // Fetch roles for all users
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('*');

      if (rolesError) {
        console.warn('Could not fetch roles:', rolesError);
      }

      // Combine profiles with roles
      const usersWithRoles = (profiles || []).map(profile => {
        const userRole = roles?.find(r => r.user_id === profile.user_id);
        return {
          ...profile,
          role: userRole?.role || 'user'
        };
      });

      setUsers(usersWithRoles);
    } catch (err: any) {
      console.error('Error fetching users:', err);
      setError(err.message);
      toast({
        title: "Erro ao carregar atendentes",
        description: err.message,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchUsers();

    // Subscribe to realtime changes on profiles table
    const profilesChannel = supabase
      .channel('profiles-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profiles'
        },
        () => {
          fetchUsers();
        }
      )
      .subscribe();

    // Subscribe to realtime changes on user_roles table
    const rolesChannel = supabase
      .channel('user-roles-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_roles'
        },
        () => {
          fetchUsers();
        }
      )
      .subscribe();

    // Cleanup subscriptions on unmount
    return () => {
      supabase.removeChannel(profilesChannel);
      supabase.removeChannel(rolesChannel);
    };
  }, [fetchUsers]);

  const updateUser = async (userId: string, updates: Partial<SupabaseUser>) => {
    try {
      const previous = users.find((u) => u.id === userId) ?? null;
      const normalizedUpdates = { ...updates };
      if (typeof updates.email === 'string') {
        normalizedUpdates.email = updates.email.trim().toLowerCase();
      }
      const changedFields = Object.entries(normalizedUpdates)
        .filter(([key, nextValue]) => {
          if (nextValue === undefined) return false;
          const previousValue = previous ? (previous as unknown as Record<string, unknown>)[key] : undefined;
          return !isEquivalentForAudit(previousValue, nextValue);
        })
        .map(([key]) => key);

      const changedValues = changedFields.map((field) => {
        const previousValue = previous ? (previous as unknown as Record<string, unknown>)[field] : undefined;
        const nextValue = (normalizedUpdates as unknown as Record<string, unknown>)[field];
        return {
          field,
          before: normalizeForAudit(previousValue),
          after: normalizeForAudit(nextValue),
        };
      });

      const emailChanged = changedFields.includes('email');
      if (emailChanged && previous?.user_id && normalizedUpdates.email) {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) {
          toast({
            title: "Sessão expirada",
            description: "Faça login novamente para continuar.",
            variant: "destructive",
          });
          throw new Error('Sessão expirada. Faça login novamente.');
        }
        const { data: authUpdateData, error: authUpdateError } = await supabase.functions.invoke('update-user-email', {
          body: { auth_user_id: previous.user_id, new_email: normalizedUpdates.email },
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        if (authUpdateError) throw authUpdateError;
        const authErr = (authUpdateData as { error?: string })?.error;
        if (authErr) throw new Error(authErr);
      }

      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          name: normalizedUpdates.name,
          email: normalizedUpdates.email,
          phone: normalizedUpdates.phone,
          position: normalizedUpdates.position,
          cpf: normalizedUpdates.cpf,
          rg: normalizedUpdates.rg,
          cnpj: normalizedUpdates.cnpj,
          birth_date: normalizedUpdates.birth_date,
          education: normalizedUpdates.education,
          gender: normalizedUpdates.gender,
          marital_status: normalizedUpdates.marital_status,
          notes: normalizedUpdates.notes,
          professional_document: normalizedUpdates.professional_document,
          professional_document_name: normalizedUpdates.professional_document_name,
          professional_document_storage_key: normalizedUpdates.professional_document_storage_key,
          address_label: normalizedUpdates.address_label,
          address_cep: normalizedUpdates.address_cep,
          address_street: normalizedUpdates.address_street,
          address_number: normalizedUpdates.address_number,
          address_complement: normalizedUpdates.address_complement,
          address_state: normalizedUpdates.address_state,
          address_country: normalizedUpdates.address_country,
          service_area: normalizedUpdates.service_area,
          professional_council: normalizedUpdates.professional_council,
          bank_name: normalizedUpdates.bank_name,
          bank_agency: normalizedUpdates.bank_agency,
          bank_account: normalizedUpdates.bank_account,
          bank_holder: normalizedUpdates.bank_holder,
          pix_key: normalizedUpdates.pix_key,
          contract_status: normalizedUpdates.contract_status,
          contract_document: normalizedUpdates.contract_document,
          contract_document_name: normalizedUpdates.contract_document_name,
          contract_document_storage_key: normalizedUpdates.contract_document_storage_key,
          avatar_url: normalizedUpdates.avatar_url,
          avatar_storage_key: normalizedUpdates.avatar_storage_key,
          work_days: normalizedUpdates.work_days,
          is_active: normalizedUpdates.is_active,
        })
        .eq('id', userId);

      if (updateError) throw updateError;

      // Refresh to get the updated data from the server
      await fetchUsers();

      await recordSystemAuditLog({
        menuGroup: 'GESTAO_TECNICA',
        menu: 'Atendentes',
        screen: 'Atendentes',
        action: 'update',
        entityType: 'attendant',
        entityId: userId,
        message: 'Atendente atualizado.',
        metadata: {
          attendantName: normalizedUpdates.name ?? previous?.name ?? null,
          attendantEmail: normalizedUpdates.email ?? previous?.email ?? null,
          updatedFields: changedFields,
          changedValues,
        },
      });

      toast({
        title: "Atendente atualizado",
        description: "As informações foram atualizadas com sucesso.",
      });

      return true;
    } catch (err: any) {
      console.error('Error updating user:', err);
      toast({
        title: "Erro ao atualizar atendente",
        description: err.message,
        variant: "destructive"
      });
      throw err;
    }
  };

  const toggleUserStatus = async (userId: string) => {
    try {
      const user = users.find(u => u.id === userId);
      if (!user) return;

      const newStatus = !user.is_active;

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ is_active: newStatus })
        .eq('id', userId);

      if (updateError) throw updateError;

      // Update local state without refetching
      setUsers(prev => prev.map(u =>
        u.id === userId ? { ...u, is_active: newStatus } : u
      ));

      await recordSystemAuditLog({
        menuGroup: 'GESTAO_TECNICA',
        menu: 'Atendentes',
        screen: 'Atendentes',
        action: 'update',
        entityType: 'attendant',
        entityId: userId,
        message: newStatus ? 'Atendente ativado.' : 'Atendente desativado.',
        metadata: {
          attendantName: user.name,
          attendantEmail: user.email,
          operationType: newStatus ? 'activate' : 'deactivate',
          previousStatus: user.is_active ? 'active' : 'inactive',
          newStatus: newStatus ? 'active' : 'inactive',
          updatedFields: ['is_active'],
          changedValues: [
            {
              field: 'is_active',
              before: normalizeForAudit(user.is_active),
              after: normalizeForAudit(newStatus),
            },
          ],
        },
      });

      toast({
        title: newStatus ? "Atendente ativado" : "Atendente desativado",
        description: `${user.name} foi ${newStatus ? 'ativado' : 'desativado'} com sucesso.`,
      });
    } catch (err: any) {
      console.error('Error toggling user status:', err);
      toast({
        title: "Erro ao alterar status",
        description: err.message,
        variant: "destructive"
      });
      throw err;
    }
  };

  const deleteUser = async (profileId: string) => {
    try {
      const previous = users.find((u) => u.id === profileId) ?? null;
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        toast({
          title: "Sessão expirada",
          description: "Faça login novamente para continuar.",
          variant: "destructive"
        });
        throw new Error('Sessão expirada. Faça login novamente.');
      }

      const { data, error } = await supabase.functions.invoke('delete-user', {
        body: { profile_id: profileId },
        headers: { Authorization: `Bearer ${session.access_token}` }
      });

      if (error) {
        let errorMessage = 'Erro ao remover atendente. Verifique as permissões.';
        if (error.context?.body) {
          try {
            const text = typeof error.context.body?.text === 'function'
              ? await error.context.body.text()
              : (typeof error.context.body === 'string' ? error.context.body : null);
            if (text) {
              const body = JSON.parse(text);
              errorMessage = body.error || errorMessage;
            }
          } catch (_) {}
        } else if (error.message) {
          errorMessage = error.message;
        }
        throw new Error(errorMessage);
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      setUsers(prev => prev.filter(u => u.id !== profileId));

      await recordSystemAuditLog({
        menuGroup: 'GESTAO_TECNICA',
        menu: 'Atendentes',
        screen: 'Atendentes',
        action: 'delete',
        entityType: 'attendant',
        entityId: profileId,
        message: 'Atendente excluído.',
        metadata: {
          attendantName: previous?.name ?? null,
          attendantEmail: previous?.email ?? null,
          role: previous?.role ?? null,
          status: previous?.is_active ?? null,
        },
      });

      toast({
        title: "Atendente removido",
        description: data?.message || "Atendente removido do sistema com sucesso.",
      });
    } catch (err: any) {
      console.error('Error deleting user:', err);
      toast({
        title: "Erro ao remover atendente",
        description: err.message,
        variant: "destructive"
      });
      throw err;
    }
  };

  const updateUserRole = async (userId: string, newRole: string) => {
    try {
      const user = users.find(u => u.id === userId);
      if (!user) return;

      // Update the role in user_roles table
      const { error: updateError } = await supabase
        .from('user_roles')
        .update({ role: newRole as any })
        .eq('user_id', user.user_id);

      if (updateError) throw updateError;

      // Update local state without refetching
      setUsers(prev => prev.map(u =>
        u.id === userId ? { ...u, role: newRole } : u
      ));

      toast({
        title: "Cargo atualizado",
        description: "O cargo do atendente foi atualizado com sucesso.",
      });
    } catch (err: any) {
      console.error('Error updating user role:', err);
      toast({
        title: "Erro ao atualizar cargo",
        description: err.message,
        variant: "destructive"
      });
      throw err;
    }
  };

  const isEmailRegistered = useCallback((email: string): boolean => {
    const normalizedEmail = email.trim().toLowerCase();
    return users.some(user => user.email.toLowerCase() === normalizedEmail);
  }, [users]);

  /** Retorna true se o e-mail já está em uso por outro atendente (excluindo o perfil com excludeProfileId). */
  const isEmailTakenByOtherUser = useCallback((email: string, excludeProfileId: string): boolean => {
    const normalizedEmail = email.trim().toLowerCase();
    return users.some(
      (u) => u.email.toLowerCase() === normalizedEmail && u.id !== excludeProfileId
    );
  }, [users]);

  const createUser = async (userData: {
    name: string;
    email: string;
    phone?: string;
    position?: string;
    cpf?: string;
    rg?: string;
    cnpj?: string;
    birth_date?: string;
    education?: string;
    gender?: 'masculino' | 'feminino' | 'outro' | '';
    marital_status?: 'solteiro' | 'casado' | 'divorciado' | 'viuvo' | '';
    notes?: string;
    professional_document?: string;
    professional_document_name?: string;
    professional_document_storage_key?: string;
    address_label?: string;
    address_cep?: string;
    address_street?: string;
    address_number?: string;
    address_complement?: string;
    address_state?: string;
    address_country?: string;
    service_area?: string;
    professional_council?: string;
    bank_name?: string;
    bank_agency?: string;
    bank_account?: string;
    bank_holder?: string;
    pix_key?: string;
    contract_status?: 'sem_contrato' | 'enviado' | 'assinado';
    contract_document?: string;
    contract_document_name?: string;
    contract_document_storage_key?: string;
    work_days?: string[];
    avatar_url?: string;
    avatar_storage_key?: string;
    role?: string;
  }) => {
    try {
      // Check if email already exists in the local list
      if (isEmailRegistered(userData.email)) {
        throw new Error('Este e-mail já está cadastrado no sistema');
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        toast({
          title: "Sessão expirada",
          description: "Faça login novamente para continuar.",
          variant: "destructive"
        });
        throw new Error('Sessão expirada. Faça login novamente.');
      }

      // Call edge function to create user with admin API
      const { data, error } = await supabase.functions.invoke('create-user', {
        body: {
          name: userData.name,
          email: userData.email,
          phone: userData.phone || null,
          position: userData.position || null,
          cpf: userData.cpf || null,
          rg: userData.rg || null,
          cnpj: userData.cnpj || null,
          birth_date: userData.birth_date || null,
          education: userData.education || null,
          gender: userData.gender || null,
          marital_status: userData.marital_status || null,
          notes: userData.notes || null,
          professional_document: userData.professional_document || null,
          professional_document_name: userData.professional_document_name || null,
          professional_document_storage_key: userData.professional_document_storage_key || null,
          address_label: userData.address_label || null,
          address_cep: userData.address_cep || null,
          address_street: userData.address_street || null,
          address_number: userData.address_number || null,
          address_complement: userData.address_complement || null,
          address_state: userData.address_state || null,
          address_country: userData.address_country || null,
          service_area: userData.service_area || null,
          professional_council: userData.professional_council || null,
          bank_name: userData.bank_name || null,
          bank_agency: userData.bank_agency || null,
          bank_account: userData.bank_account || null,
          bank_holder: userData.bank_holder || null,
          pix_key: userData.pix_key || null,
          contract_status: userData.contract_status || 'sem_contrato',
          contract_document: userData.contract_document || null,
          contract_document_name: userData.contract_document_name || null,
          contract_document_storage_key: userData.contract_document_storage_key || null,
          work_days: userData.work_days || [],
          avatar_url: userData.avatar_url || null,
          avatar_storage_key: userData.avatar_storage_key || null,
          role: userData.role || 'user'
        },
        headers: { Authorization: `Bearer ${session.access_token}` }
      });

      // Handle edge function errors
      if (error) {
        console.error('Invoke error:', error);

        let errorMessage = 'Erro ao criar atendente. Verifique as permissões.';

        // Handle FunctionsHttpError and extract body
        if (error.context) {
          try {
            const response = error.context;
            if (response.body) {
              // If body is a Blob, we need to read it
              const text = typeof response.body.text === 'function'
                ? await response.body.text()
                : (typeof response.body === 'string' ? response.body : null);

              if (text) {
                const errorBody = JSON.parse(text);
                errorMessage = errorBody.error || errorBody.message || errorMessage;
              }
            }
          } catch (e) {
            console.error('Failed to parse error body:', e);
          }
        } else if (error.message) {
          errorMessage = error.message;
        }

        // Special case for Function not found
        if (errorMessage.includes('Function not found')) {
          errorMessage = 'Função "create-user" não encontrada. Verifique se ela foi implantada.';
        }

        // Translate common Supabase auth errors
        if (errorMessage.toLowerCase().includes('email address has already been registered') ||
          errorMessage.toLowerCase().includes('user already exists')) {
          errorMessage = 'Este e-mail já está cadastrado no sistema.';
        }

        throw new Error(errorMessage);
      }

      if (data?.error) {
        let errorMessage = data.error;
        if (errorMessage.toLowerCase().includes('email address has already been registered')) {
          errorMessage = 'Este e-mail já está cadastrado no sistema.';
        }
        throw new Error(errorMessage);
      }

      // Refresh the users list
      await fetchUsers();

      await recordSystemAuditLog({
        menuGroup: 'GESTAO_TECNICA',
        menu: 'Atendentes',
        screen: 'Atendentes',
        action: 'create',
        entityType: 'attendant',
        entityId: data?.profile?.id ?? null,
        message: 'Atendente criado.',
        metadata: {
          attendantName: userData.name,
          attendantEmail: userData.email,
          role: userData.role || 'user',
          isActive: true,
        },
      });

      toast({
        title: "Atendente criado",
        description: data?.message || `${userData.name} foi adicionado com sucesso.`,
      });

      return data?.profile;
    } catch (err: any) {
      console.error('Error creating user:', err);
      toast({
        title: "Erro ao criar atendente",
        description: err.message || 'Erro desconhecido ao criar atendente',
        variant: "destructive"
      });
      throw err;
    }
  };

  return {
    users,
    isLoading,
    error,
    fetchUsers,
    createUser,
    updateUser,
    toggleUserStatus,
    deleteUser,
    updateUserRole,
    isEmailRegistered,
    isEmailTakenByOtherUser,
  };
};
