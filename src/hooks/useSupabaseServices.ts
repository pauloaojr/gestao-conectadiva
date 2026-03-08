import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { recordSystemAuditLog } from '@/services/systemAuditLog';

export interface Service {
  id: string;
  name: string;
  description: string | null;
  price: number;
  duration_minutes: number | null;
  is_available: boolean;
  created_at: string;
  updated_at: string;
}

export interface ServiceAssignment {
  id: string;
  service_id: string;
  attendant_id: string;
  attendant_name: string;
  assigned_at: string;
}

export const useSupabaseServices = () => {
  const { toast } = useToast();
  const [services, setServices] = useState<Service[]>([]);
  const [serviceAssignments, setServiceAssignments] = useState<ServiceAssignment[]>([]);
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

  const fetchServices = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const [servicesResult, assignmentsResult] = await Promise.all([
        supabase.from('services').select('*').order('name', { ascending: true }),
        supabase.from('service_assignments').select('*')
      ]);
      
      if (servicesResult.error) throw servicesResult.error;
      if (assignmentsResult.error) throw assignmentsResult.error;
      
      setServices(servicesResult.data || []);
      setServiceAssignments(assignmentsResult.data || []);
    } catch (err: any) {
      console.error('Error fetching services:', err);
      setError(err.message);
      toast({
        title: "Erro ao carregar serviços",
        description: err.message,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchServices();
  }, [fetchServices]);

  const addService = async (serviceData: Omit<Service, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const { data, error: insertError } = await supabase
        .from('services')
        .insert([serviceData])
        .select()
        .single();
      
      if (insertError) throw insertError;
      
      setServices(prev => [...prev, data]);

      await recordSystemAuditLog({
        menuGroup: 'GESTAO_TECNICA',
        menu: 'Serviços',
        screen: 'Serviços',
        action: 'create',
        entityType: 'service',
        entityId: data.id,
        message: 'Serviço criado.',
        metadata: {
          name: data.name,
          description: data.description,
          price: data.price,
          durationMinutes: data.duration_minutes,
          isAvailable: data.is_available,
        },
      });
      
      toast({
        title: "Serviço adicionado",
        description: `${data.name} foi adicionado com sucesso.`,
      });
      
      return data;
    } catch (err: any) {
      console.error('Error adding service:', err);
      toast({
        title: "Erro ao adicionar serviço",
        description: err.message,
        variant: "destructive"
      });
      throw err;
    }
  };

  const updateService = async (id: string, updates: Partial<Service>) => {
    try {
      const previous = services.find((service) => service.id === id) ?? null;
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
        .from('services')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (updateError) throw updateError;
      
      setServices(prev => prev.map(s => s.id === id ? data : s));

      await recordSystemAuditLog({
        menuGroup: 'GESTAO_TECNICA',
        menu: 'Serviços',
        screen: 'Serviços',
        action: 'update',
        entityType: 'service',
        entityId: id,
        message: 'Serviço atualizado.',
        metadata: {
          name: data.name,
          updatedFields: changedFields,
          changedValues,
        },
      });
      
      toast({
        title: "Serviço atualizado",
        description: "As informações foram atualizadas com sucesso.",
      });
      
      return data;
    } catch (err: any) {
      console.error('Error updating service:', err);
      toast({
        title: "Erro ao atualizar serviço",
        description: err.message,
        variant: "destructive"
      });
      throw err;
    }
  };

  const deleteService = async (id: string) => {
    try {
      const previous = services.find((service) => service.id === id) ?? null;
      const { error: deleteError } = await supabase
        .from('services')
        .delete()
        .eq('id', id);
      
      if (deleteError) throw deleteError;
      
      setServices(prev => prev.filter(s => s.id !== id));

      await recordSystemAuditLog({
        menuGroup: 'GESTAO_TECNICA',
        menu: 'Serviços',
        screen: 'Serviços',
        action: 'delete',
        entityType: 'service',
        entityId: id,
        message: 'Serviço excluído.',
        metadata: {
          name: previous?.name ?? null,
          description: previous?.description ?? null,
          price: previous?.price ?? null,
          durationMinutes: previous?.duration_minutes ?? null,
          isAvailable: previous?.is_available ?? null,
        },
      });
      
      toast({
        title: "Serviço removido",
        description: "O serviço foi removido do sistema.",
      });
    } catch (err: any) {
      console.error('Error deleting service:', err);
      toast({
        title: "Erro ao remover serviço",
        description: err.message,
        variant: "destructive"
      });
      throw err;
    }
  };

  const assignService = async (serviceId: string, attendantId: string, attendantName: string) => {
    try {
      const service = services.find((item) => item.id === serviceId) ?? null;
      const { data, error: insertError } = await supabase
        .from('service_assignments')
        .insert([{ service_id: serviceId, attendant_id: attendantId, attendant_name: attendantName }])
        .select()
        .single();
      
      if (insertError) throw insertError;
      
      setServiceAssignments(prev => [...prev, data]);

      await recordSystemAuditLog({
        menuGroup: 'GESTAO_TECNICA',
        menu: 'Serviços',
        screen: 'Serviços',
        action: 'create',
        entityType: 'service_assignment',
        entityId: data.id,
        message: 'Serviço atribuído ao atendente.',
        metadata: {
          attendantId,
          attendantName,
          serviceId,
          serviceName: service?.name ?? null,
          servicePrice: service?.price ?? null,
        },
      });
      
      toast({
        title: "Serviço atribuído",
        description: `Serviço atribuído a ${attendantName}.`,
      });
      
      return data;
    } catch (err: any) {
      console.error('Error assigning service:', err);
      toast({
        title: "Erro ao atribuir serviço",
        description: err.message,
        variant: "destructive"
      });
      throw err;
    }
  };

  const removeServiceAssignment = async (assignmentId: string) => {
    try {
      const previous = serviceAssignments.find((item) => item.id === assignmentId) ?? null;
      const service = previous
        ? services.find((item) => item.id === previous.service_id) ?? null
        : null;
      const { error: deleteError } = await supabase
        .from('service_assignments')
        .delete()
        .eq('id', assignmentId);
      
      if (deleteError) throw deleteError;
      
      setServiceAssignments(prev => prev.filter(a => a.id !== assignmentId));

      await recordSystemAuditLog({
        menuGroup: 'GESTAO_TECNICA',
        menu: 'Serviços',
        screen: 'Serviços',
        action: 'delete',
        entityType: 'service_assignment',
        entityId: assignmentId,
        message: 'Atribuição de serviço removida.',
        metadata: {
          attendantId: previous?.attendant_id ?? null,
          attendantName: previous?.attendant_name ?? null,
          serviceId: previous?.service_id ?? null,
          serviceName: service?.name ?? null,
          servicePrice: service?.price ?? null,
        },
      });
      
      toast({
        title: "Atribuição removida",
        description: "A atribuição foi removida com sucesso.",
      });
    } catch (err: any) {
      console.error('Error removing service assignment:', err);
      toast({
        title: "Erro ao remover atribuição",
        description: err.message,
        variant: "destructive"
      });
      throw err;
    }
  };

  return {
    services,
    serviceAssignments,
    isLoading,
    error,
    fetchServices,
    addService,
    updateService,
    deleteService,
    assignService,
    removeServiceAssignment
  };
};
