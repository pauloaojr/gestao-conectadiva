import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { recordSystemAuditLog } from '@/services/systemAuditLog';

export interface Customization {
  id: string;
  app_name: string;
  app_subtitle: string | null;
  logo_url: string | null;
  primary_color: string | null;
  sidebar_style: string | null;
  allow_registrations: boolean;
  created_at: string;
  updated_at: string;
}

export interface CustomizationFormData {
  app_name: string;
  app_subtitle: string;
  logo_url: string;
  primary_color: string;
  sidebar_style: string;
}

export const useCustomization = () => {
  const [customization, setCustomization] = useState<Customization | null>(null);
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

  const fetchCustomization = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('customization')
        .select('*')
        .limit(1)
        .maybeSingle();

      if (fetchError) {
        throw fetchError;
      }

      setCustomization(data);
    } catch (err) {
      console.error('Error fetching customization:', err);
      setError('Erro ao carregar personalização');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCustomization();
  }, [fetchCustomization]);

  const saveCustomization = async (formData: CustomizationFormData) => {
    try {
      if (customization?.id) {
        const payload = {
          app_name: formData.app_name,
          app_subtitle: formData.app_subtitle || null,
          logo_url: formData.logo_url || null,
          primary_color: formData.primary_color || null,
          sidebar_style: formData.sidebar_style || null,
        };

        const changedFields = Object.entries(payload)
          .filter(([key, nextValue]) => {
            const previousValue = customization
              ? (customization as unknown as Record<string, unknown>)[key]
              : undefined;
            return !isEquivalentForAudit(previousValue, nextValue);
          })
          .map(([key]) => key);

        const changedValues = changedFields.map((field) => {
          const previousValue = customization
            ? (customization as unknown as Record<string, unknown>)[field]
            : undefined;
          const nextValue = (payload as unknown as Record<string, unknown>)[field];
          return {
            field,
            before: normalizeForAudit(previousValue),
            after: normalizeForAudit(nextValue),
          };
        });

        // Update existing
        const { error: updateError } = await supabase
          .from('customization')
          .update(payload)
          .eq('id', customization.id);

        if (updateError) throw updateError;

        await recordSystemAuditLog({
          menuGroup: 'SISTEMA',
          menu: 'Configurações',
          screen: 'Configurações - Personalização',
          action: 'update',
          entityType: 'customization',
          entityId: customization.id,
          message: 'Personalização atualizada.',
          metadata: {
            updatedFields: changedFields,
            changedValues,
          },
        });

        toast({
          title: 'Personalização salva',
          description: 'As configurações foram atualizadas com sucesso.',
        });
      } else {
        // Create new
        const { data, error: insertError } = await supabase
          .from('customization')
          .insert({
            app_name: formData.app_name,
            app_subtitle: formData.app_subtitle || null,
            logo_url: formData.logo_url || null,
            primary_color: formData.primary_color || null,
            sidebar_style: formData.sidebar_style || null,
          })
          .select('id')
          .single();

        if (insertError) throw insertError;

        await recordSystemAuditLog({
          menuGroup: 'SISTEMA',
          menu: 'Configurações',
          screen: 'Configurações - Personalização',
          action: 'create',
          entityType: 'customization',
          entityId: data?.id ?? null,
          message: 'Personalização criada.',
          metadata: {
            appName: formData.app_name,
            appSubtitle: formData.app_subtitle || null,
            primaryColor: formData.primary_color || null,
            sidebarStyle: formData.sidebar_style || null,
            hasLogo: Boolean(formData.logo_url),
          },
        });

        toast({
          title: 'Personalização criada',
          description: 'As configurações foram salvas com sucesso.',
        });
      }

      await fetchCustomization();
      return true;
    } catch (err) {
      console.error('Error saving customization:', err);
      toast({
        title: 'Erro ao salvar',
        description: 'Não foi possível salvar as configurações.',
        variant: 'destructive',
      });
      return false;
    }
  };

  return {
    customization,
    isLoading,
    error,
    fetchCustomization,
    saveCustomization,
  };
};
