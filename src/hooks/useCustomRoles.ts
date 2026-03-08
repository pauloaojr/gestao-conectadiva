import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { CustomRole, CreateCustomRoleData, UpdateCustomRoleData } from '@/types/customRole';
import { UserPermissions } from '@/types/user';
import { recordSystemAuditLog } from '@/services/systemAuditLog';

export const useCustomRoles = () => {
  const [roles, setRoles] = useState<CustomRole[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

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

  const fetchRoles = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('custom_roles')
        .select('*')
        .order('is_system', { ascending: false })
        .order('name');

      if (fetchError) throw fetchError;

      // Parse permissions from JSON (cast through unknown to handle Supabase's JSON type)
      const parsedRoles: CustomRole[] = (data || []).map(role => ({
        ...role,
        permissions: role.permissions as unknown as UserPermissions
      }));

      setRoles(parsedRoles);
    } catch (err: any) {
      console.error('Error fetching custom roles:', err);
      setError(err.message);
      toast({
        title: 'Erro ao carregar funções',
        description: err.message,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchRoles();

    // Subscribe to realtime changes
    const channel = supabase
      .channel('custom_roles_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'custom_roles' },
        () => {
          fetchRoles();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchRoles]);

  const createRole = async (roleData: CreateCustomRoleData): Promise<boolean> => {
    try {
      const { data, error: insertError } = await supabase
        .from('custom_roles')
        .insert([{
          name: roleData.name,
          description: roleData.description || null,
          permissions: JSON.parse(JSON.stringify(roleData.permissions)),
          is_system: false,
        }])
        .select('id')
        .single();

      if (insertError) {
        if (insertError.message.includes('duplicate key') || insertError.message.includes('unique')) {
          toast({
            title: 'Erro',
            description: 'Já existe uma função com este nome.',
            variant: 'destructive',
          });
          return false;
        }
        throw insertError;
      }

      toast({
        title: 'Função criada',
        description: `A função "${roleData.name}" foi criada com sucesso.`,
      });

      await fetchRoles();

      await recordSystemAuditLog({
        menuGroup: 'SISTEMA',
        menu: 'Configurações',
        screen: 'Configurações - Funções',
        action: 'create',
        entityType: 'custom_role',
        entityId: data?.id ?? null,
        message: 'Função personalizada criada.',
        metadata: {
          roleName: roleData.name,
          roleDescription: roleData.description || null,
          permissions: roleData.permissions,
        },
      });

      return true;
    } catch (err: any) {
      console.error('Error creating role:', err);
      toast({
        title: 'Erro ao criar função',
        description: err.message,
        variant: 'destructive',
      });
      return false;
    }
  };

  const updateRole = async (roleId: string, updates: UpdateCustomRoleData): Promise<boolean> => {
    try {
      const role = roles.find(r => r.id === roleId);
      if (role?.is_system) {
        toast({
          title: 'Erro',
          description: 'Funções do sistema não podem ser editadas.',
          variant: 'destructive',
        });
        return false;
      }

      const updateData: Record<string, unknown> = {};
      if (updates.name !== undefined) updateData.name = updates.name;
      if (updates.description !== undefined) updateData.description = updates.description;
      if (updates.permissions !== undefined) updateData.permissions = updates.permissions;

      const changedFields = Object.entries(updateData)
        .filter(([key, nextValue]) => {
          const previousValue = role ? (role as unknown as Record<string, unknown>)[key] : undefined;
          return !isEquivalentForAudit(previousValue, nextValue);
        })
        .map(([key]) => key);

      const changedValues = changedFields.map((field) => {
        const previousValue = role ? (role as unknown as Record<string, unknown>)[field] : undefined;
        const nextValue = (updateData as Record<string, unknown>)[field];
        return {
          field,
          before: normalizeForAudit(previousValue),
          after: normalizeForAudit(nextValue),
        };
      });

      const { error: updateError } = await supabase
        .from('custom_roles')
        .update(updateData)
        .eq('id', roleId);

      if (updateError) {
        if (updateError.message.includes('duplicate key') || updateError.message.includes('unique')) {
          toast({
            title: 'Erro',
            description: 'Já existe uma função com este nome.',
            variant: 'destructive',
          });
          return false;
        }
        throw updateError;
      }

      toast({
        title: 'Função atualizada',
        description: 'A função foi atualizada com sucesso.',
      });

      await fetchRoles();

      await recordSystemAuditLog({
        menuGroup: 'SISTEMA',
        menu: 'Configurações',
        screen: 'Configurações - Funções',
        action: 'update',
        entityType: 'custom_role',
        entityId: roleId,
        message: 'Função personalizada atualizada.',
        metadata: {
          roleName: updates.name ?? role?.name ?? null,
          updatedFields: changedFields,
          changedValues,
        },
      });

      return true;
    } catch (err: any) {
      console.error('Error updating role:', err);
      toast({
        title: 'Erro ao atualizar função',
        description: err.message,
        variant: 'destructive',
      });
      return false;
    }
  };

  const deleteRole = async (roleId: string): Promise<boolean> => {
    try {
      const role = roles.find(r => r.id === roleId);
      if (role?.is_system) {
        toast({
          title: 'Erro',
          description: 'Funções do sistema não podem ser excluídas.',
          variant: 'destructive',
        });
        return false;
      }

      const { error: deleteError } = await supabase
        .from('custom_roles')
        .delete()
        .eq('id', roleId);

      if (deleteError) throw deleteError;

      toast({
        title: 'Função excluída',
        description: 'A função foi excluída com sucesso.',
      });

      await fetchRoles();

      await recordSystemAuditLog({
        menuGroup: 'SISTEMA',
        menu: 'Configurações',
        screen: 'Configurações - Funções',
        action: 'delete',
        entityType: 'custom_role',
        entityId: roleId,
        message: 'Função personalizada excluída.',
        metadata: {
          roleName: role?.name ?? null,
          roleDescription: role?.description ?? null,
          permissions: role?.permissions ?? {},
        },
      });

      return true;
    } catch (err: any) {
      console.error('Error deleting role:', err);
      toast({
        title: 'Erro ao excluir função',
        description: err.message,
        variant: 'destructive',
      });
      return false;
    }
  };

  return {
    roles,
    isLoading,
    error,
    fetchRoles,
    createRole,
    updateRole,
    deleteRole,
  };
};
