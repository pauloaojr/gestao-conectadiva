import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { startOfDay, endOfDay, subDays, format, startOfMonth, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export interface ReportAppointment {
  id: string;
  patient_name: string;
  appointment_date: string;
  appointment_time: string;
  service_name: string | null;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  duration_minutes: number | null;
}

export interface ReportStats {
  totalConsultas: number;
  consultasConcluidas: number;
  pacientesUnicos: number;
  taxaComparecimento: number;
}

export interface MonthlyData {
  month: string;
  consultas: number;
}

export interface ServiceTypeData {
  name: string;
  value: number;
  color: string;
}

const SERVICE_COLORS = [
  "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", 
  "#ec4899", "#14b8a6", "#f97316", "#6366f1", "#84cc16"
];

export const useReports = () => {
  const { toast } = useToast();
  const [appointments, setAppointments] = useState<ReportAppointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState("30");
  const [customDateRange, setCustomDateRange] = useState<{ from?: Date; to?: Date }>({});

  const fetchAppointments = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const { data, error: fetchError } = await supabase
        .from('appointments')
        .select('id, patient_name, appointment_date, appointment_time, service_name, status, duration_minutes')
        .order('appointment_date', { ascending: false })
        .order('appointment_time', { ascending: false });
      
      if (fetchError) throw fetchError;
      
      setAppointments(data || []);
    } catch (err: any) {
      console.error('Error fetching appointments for reports:', err);
      setError(err.message);
      toast({
        title: "Erro ao carregar dados",
        description: err.message,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  // Filtrar appointments por período
  const filteredAppointments = useMemo(() => {
    const today = new Date();
    let startDate: Date;
    let endDate: Date;

    if (selectedPeriod === "custom" && customDateRange.from && customDateRange.to) {
      startDate = startOfDay(customDateRange.from);
      endDate = endOfDay(customDateRange.to);
    } else if (selectedPeriod === "all") {
      // Mostrar todos os appointments
      return appointments;
    } else {
      const daysBack = parseInt(selectedPeriod) || 30;
      startDate = startOfDay(subDays(today, daysBack));
      // Incluir consultas futuras também (próximos 30 dias)
      endDate = endOfDay(subDays(today, -30));
    }

    return appointments.filter(apt => {
      const aptDate = parseISO(apt.appointment_date);
      return aptDate >= startDate && aptDate <= endDate;
    });
  }, [appointments, selectedPeriod, customDateRange]);

  // Calcular estatísticas
  const stats = useMemo((): ReportStats => {
    const totalConsultas = filteredAppointments.length;
    const consultasConcluidas = filteredAppointments.filter(apt => apt.status === 'completed').length;
    const pacientesUnicos = new Set(filteredAppointments.map(apt => apt.patient_name)).size;
    const taxaComparecimento = totalConsultas > 0 
      ? Math.round((consultasConcluidas / totalConsultas) * 100) 
      : 0;

    return {
      totalConsultas,
      consultasConcluidas,
      pacientesUnicos,
      taxaComparecimento
    };
  }, [filteredAppointments]);

  // Dados mensais para gráfico
  const monthlyData = useMemo((): MonthlyData[] => {
    const monthlyMap = new Map<string, number>();
    
    // Pegar últimos 12 meses
    const today = new Date();
    for (let i = 11; i >= 0; i--) {
      const monthDate = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const monthKey = format(monthDate, 'yyyy-MM');
      const monthLabel = format(monthDate, 'MMM', { locale: ptBR });
      monthlyMap.set(monthKey, 0);
    }

    // Contar appointments por mês
    appointments.forEach(apt => {
      const aptDate = parseISO(apt.appointment_date);
      const monthKey = format(aptDate, 'yyyy-MM');
      if (monthlyMap.has(monthKey)) {
        monthlyMap.set(monthKey, (monthlyMap.get(monthKey) || 0) + 1);
      }
    });

    // Converter para array
    return Array.from(monthlyMap.entries()).map(([key, count]) => {
      const date = parseISO(`${key}-01`);
      return {
        month: format(date, 'MMM', { locale: ptBR }).charAt(0).toUpperCase() + 
               format(date, 'MMM', { locale: ptBR }).slice(1),
        consultas: count
      };
    });
  }, [appointments]);

  // Dados por tipo de serviço
  const serviceTypeData = useMemo((): ServiceTypeData[] => {
    const serviceMap = new Map<string, number>();

    filteredAppointments.forEach(apt => {
      const serviceName = apt.service_name || 'Consulta';
      serviceMap.set(serviceName, (serviceMap.get(serviceName) || 0) + 1);
    });

    return Array.from(serviceMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, value], index) => ({
        name,
        value,
        color: SERVICE_COLORS[index % SERVICE_COLORS.length]
      }));
  }, [filteredAppointments]);

  // Mapear status para português
  const getStatusLabel = (status: string): string => {
    switch (status) {
      case 'completed': return 'Concluída';
      case 'confirmed': return 'Confirmada';
      case 'cancelled': return 'Cancelada';
      case 'pending': return 'Pendente';
      default: return status;
    }
  };

  // Appointments formatados para exibição
  const formattedAppointments = useMemo(() => {
    return filteredAppointments.map(apt => ({
      ...apt,
      statusLabel: getStatusLabel(apt.status),
      formattedDate: format(parseISO(apt.appointment_date), 'dd/MM/yyyy', { locale: ptBR })
    }));
  }, [filteredAppointments]);

  return {
    appointments: formattedAppointments,
    stats,
    monthlyData,
    serviceTypeData,
    isLoading,
    error,
    selectedPeriod,
    setSelectedPeriod,
    customDateRange,
    setCustomDateRange,
    refetch: fetchAppointments
  };
};
