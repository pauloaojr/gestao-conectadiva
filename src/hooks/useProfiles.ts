import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { recordSystemAuditLog } from '@/services/systemAuditLog';

export interface Profile {
  id: string;
  user_id: string;
  name: string;
  email: string;
  phone: string | null;
  position: string | null;
  avatar_url: string | null;
  work_days: string[] | null;
  is_active: boolean;
  role?: string;
  created_at: string;
  updated_at: string;
}

export const useProfiles = () => {
  const { toast } = useToast();
  const [profiles, setProfiles] = useState<Profile[]>([]);
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

  const fetchProfiles = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('name', { ascending: true });

      if (profilesError) throw profilesError;

      // Fetch roles for all users
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role');

      if (rolesError) {
        console.warn('Could not fetch roles in useProfiles:', rolesError);
      }

      const combinedData = (profilesData || []).map(profile => ({
        ...profile,
        role: roles?.find(r => r.user_id === profile.user_id)?.role || 'user'
      }));

      setProfiles(combinedData);
    } catch (err: any) {
      console.error('Error fetching profiles:', err);
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
    fetchProfiles();
  }, [fetchProfiles]);

  const updateProfile = async (id: string, updates: Partial<Profile>) => {
    try {
      const previous = profiles.find((p) => p.id === id) ?? null;
      const changedFields = Object.entries(updates)
        .filter(([key, nextValue]) => {
          if (nextValue === undefined) return false;
          const previousValue = previous ? (previous as unknown as Record<string, unknown>)[key] : undefined;
          return !isEquivalentForAudit(previousValue, nextValue);
        })
        .map(([key]) => key);

      const changedValues = changedFields.map((field) => {
        const previousValue = previous ? (previous as unknown as Record<string, unknown>)[field] : undefined;
        const nextValue = (updates as unknown as Record<string, unknown>)[field];
        return {
          field,
          before: normalizeForAudit(previousValue),
          after: normalizeForAudit(nextValue),
        };
      });

      const { data, error: updateError } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (updateError) throw updateError;

      setProfiles(prev => prev.map(p => p.id === id ? data : p));

      await recordSystemAuditLog({
        menuGroup: 'SISTEMA',
        menu: 'Configurações',
        screen: 'Configurações - Perfil',
        action: 'update',
        entityType: 'profile',
        entityId: id,
        message: 'Perfil atualizado.',
        metadata: {
          profileName: data?.name ?? previous?.name ?? null,
          profileEmail: data?.email ?? previous?.email ?? null,
          updatedFields: changedFields,
          changedValues,
        },
      });

      toast({
        title: "Perfil atualizado",
        description: "As informações foram atualizadas com sucesso.",
      });

      return data;
    } catch (err: any) {
      console.error('Error updating profile:', err);
      toast({
        title: "Erro ao atualizar perfil",
        description: err.message,
        variant: "destructive"
      });
      throw err;
    }
  };

  return {
    profiles,
    isLoading,
    error,
    fetchProfiles,
    updateProfile
  };
};
