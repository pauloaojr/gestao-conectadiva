import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { normalizeTimezoneConfig } from '@/lib/notificationRuntimePlaceholders';
import { recordSystemAuditLog } from '@/services/systemAuditLog';

export interface Establishment {
  id: string;
  name: string;
  cnpj: string | null;
  phone: string | null;
  email: string | null;
  timezone: string;
  logo_url: string | null;
  address_street: string | null;
  address_number: string | null;
  address_neighborhood: string | null;
  address_city: string | null;
  address_state: string | null;
  address_cep: string | null;
  created_at: string;
  updated_at: string;
}

export interface EstablishmentFormData {
  name: string;
  cnpj: string;
  phone: string;
  email: string;
  timezone: string;
  logo_url: string;
  address_street: string;
  address_number: string;
  address_neighborhood: string;
  address_city: string;
  address_state: string;
  address_cep: string;
}

export const useEstablishmentDB = () => {
  const { toast } = useToast();
  const [establishment, setEstablishment] = useState<Establishment | null>(null);
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

  const fetchEstablishment = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const { data, error: fetchError } = await supabase
        .from('establishments')
        .select('*')
        .limit(1)
        .maybeSingle();
      
      if (fetchError) throw fetchError;
      
      setEstablishment(data);
    } catch (err: any) {
      console.error('Error fetching establishment:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEstablishment();
  }, [fetchEstablishment]);

  const createEstablishment = async (formData: EstablishmentFormData) => {
    try {
      const { data, error: createError } = await supabase
        .from('establishments')
        .insert({
          name: formData.name,
          cnpj: formData.cnpj || null,
          phone: formData.phone || null,
          email: formData.email || null,
          timezone: normalizeTimezoneConfig(formData.timezone),
          logo_url: formData.logo_url || null,
          address_street: formData.address_street || null,
          address_number: formData.address_number || null,
          address_neighborhood: formData.address_neighborhood || null,
          address_city: formData.address_city || null,
          address_state: formData.address_state || null,
          address_cep: formData.address_cep || null,
        })
        .select()
        .single();
      
      if (createError) throw createError;
      
      setEstablishment(data);

      await recordSystemAuditLog({
        menuGroup: 'SISTEMA',
        menu: 'Configurações',
        screen: 'Configurações - Estabelecimento',
        action: 'create',
        entityType: 'establishment',
        entityId: data?.id ?? null,
        message: 'Estabelecimento criado.',
        metadata: {
          name: data?.name ?? null,
          cnpj: data?.cnpj ?? null,
          timezone: data?.timezone ?? null,
          email: data?.email ?? null,
          phone: data?.phone ?? null,
        },
      });
      
      toast({
        title: "Estabelecimento criado",
        description: "As informações foram salvas com sucesso.",
      });
      
      return data;
    } catch (err: any) {
      console.error('Error creating establishment:', err);
      toast({
        title: "Erro ao criar estabelecimento",
        description: err.message,
        variant: "destructive"
      });
      throw err;
    }
  };

  const updateEstablishment = async (id: string, formData: Partial<EstablishmentFormData>) => {
    try {
      const previous = establishment;
      const normalizedPayload = {
        name: formData.name,
        cnpj: formData.cnpj || null,
        phone: formData.phone || null,
        email: formData.email || null,
        timezone: normalizeTimezoneConfig(formData.timezone),
        logo_url: formData.logo_url || null,
        address_street: formData.address_street || null,
        address_number: formData.address_number || null,
        address_neighborhood: formData.address_neighborhood || null,
        address_city: formData.address_city || null,
        address_state: formData.address_state || null,
        address_cep: formData.address_cep || null,
      };

      const changedFields = Object.entries(normalizedPayload)
        .filter(([key, nextValue]) => {
          const previousValue = previous ? (previous as unknown as Record<string, unknown>)[key] : undefined;
          return !isEquivalentForAudit(previousValue, nextValue);
        })
        .map(([key]) => key);

      const changedValues = changedFields.map((field) => {
        const previousValue = previous ? (previous as unknown as Record<string, unknown>)[field] : undefined;
        const nextValue = (normalizedPayload as unknown as Record<string, unknown>)[field];
        return {
          field,
          before: normalizeForAudit(previousValue),
          after: normalizeForAudit(nextValue),
        };
      });

      const { data, error: updateError } = await supabase
        .from('establishments')
        .update(normalizedPayload)
        .eq('id', id)
        .select()
        .single();
      
      if (updateError) throw updateError;
      
      setEstablishment(data);

      await recordSystemAuditLog({
        menuGroup: 'SISTEMA',
        menu: 'Configurações',
        screen: 'Configurações - Estabelecimento',
        action: 'update',
        entityType: 'establishment',
        entityId: id,
        message: 'Estabelecimento atualizado.',
        metadata: {
          name: data?.name ?? previous?.name ?? null,
          updatedFields: changedFields,
          changedValues,
        },
      });
      
      toast({
        title: "Estabelecimento atualizado",
        description: "As informações foram salvas com sucesso.",
      });
      
      return data;
    } catch (err: any) {
      console.error('Error updating establishment:', err);
      toast({
        title: "Erro ao atualizar estabelecimento",
        description: err.message,
        variant: "destructive"
      });
      throw err;
    }
  };

  const saveEstablishment = async (formData: EstablishmentFormData) => {
    if (establishment?.id) {
      return updateEstablishment(establishment.id, formData);
    } else {
      return createEstablishment(formData);
    }
  };

  return {
    establishment,
    isLoading,
    error,
    fetchEstablishment,
    saveEstablishment,
    updateEstablishment,
    createEstablishment
  };
};
