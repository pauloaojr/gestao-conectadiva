import { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { Calendar as CalendarIcon, Clock, Plus, User as UserIcon, Briefcase, List, LayoutGrid, CheckCircle, AlertCircle, XCircle, Printer, Kanban, Search, CircleDot } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious, PaginationEllipsis } from "@/components/ui/pagination";
import { AppointmentModal } from "@/components/AppointmentModal";
import { AppointmentCard } from "@/components/AppointmentCard";
import { StatusUpdateModal } from "@/components/StatusUpdateModal";
import { KanbanBoard } from "@/components/schedule/KanbanBoard";
import { format, isToday, isSameDay, parseISO, startOfWeek, endOfWeek, eachDayOfInterval, addDays, isSameWeek } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAppointments, Appointment as SupabaseAppointment } from "@/hooks/useAppointments";
import { usePatients } from "@/hooks/usePatients";
import { useProfiles } from "@/hooks/useProfiles";
import { usePlans } from "@/hooks/usePlans";
import { useRevenue } from "@/hooks/useRevenue";
import { useCustomizationContext } from "@/contexts/CustomizationContext";
import { useAppointmentStatusConfigContext } from "@/contexts/AppointmentStatusConfigContext";
import { useRevenueStatusConfigContext } from "@/contexts/RevenueStatusConfigContext";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { printHtmlDocument } from "@/lib/print";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
export interface Appointment {
  id: number | string;
  time: string;
  patient: string;
  type: string;
  duration: number;
  status: string;
  date: Date;
  notes?: string;
  attendantId?: string;
  attendantName?: string;
  serviceId?: string;
  serviceName?: string;
}

const Schedule = () => {
  const isMobile = useIsMobile();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const { appointments: supabaseAppointments, isLoading, addAppointment, updateAppointment, deleteAppointment } = useAppointments();
  const { patients } = usePatients();
  const { profiles } = useProfiles();
  const { plans } = usePlans();
  const { allRevenue } = useRevenue();
  const { customizationData } = useCustomizationContext();
  const { statuses: statusConfig, getLabel: getStatusLabel } = useAppointmentStatusConfigContext();
  const { statuses: revenueStatuses } = useRevenueStatusConfigContext();

  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [isAppointmentModalOpen, setIsAppointmentModalOpen] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;
  const [statusUpdateAppointment, setStatusUpdateAppointment] = useState<Appointment | null>(null);
  const [activeTab, setActiveTab] = useState("all");
  const [viewMode, setViewMode] = useState<"day" | "week" | "kanban">("day");
  const [appointmentToDelete, setAppointmentToDelete] = useState<Appointment | null>(null);
  const [isDeletingAppointment, setIsDeletingAppointment] = useState(false);
  const [patientSearch, setPatientSearch] = useState("");
  const [professionalSearch, setProfessionalSearch] = useState("");

  // Aplicar filtro de paciente vindo da URL (ex.: ao clicar em Agendamento na tela de Pacientes)
  useEffect(() => {
    const patientFromUrl = searchParams.get("patient");
    if (patientFromUrl != null && patientFromUrl !== "") {
      setPatientSearch(decodeURIComponent(patientFromUrl));
    }
  }, [searchParams]);

  // Transform Supabase appointments to local format
  const appointments: Appointment[] = useMemo(() => {
    return supabaseAppointments.map(apt => ({
      id: apt.id,
      time: apt.appointment_time,
      patient: apt.patient_name,
      type: apt.type || 'Consulta',
      duration: apt.duration_minutes || 60,
      status: apt.status as 'confirmed' | 'pending' | 'cancelled' | 'completed',
      date: parseISO(apt.appointment_date),
      notes: apt.notes || undefined,
      attendantId: apt.attendant_id || undefined,
      attendantName: apt.attendant_name || undefined,
      serviceId: apt.service_id || undefined,
      serviceName: apt.service_name || undefined
    }));
  }, [supabaseAppointments]);

  // Helper: apply patient and professional search filters (definido antes de ser usado em useMemos)
  const applySearchFilters = (list: Appointment[]) => {
    let result = list;
    const patientTerm = patientSearch.trim().toLowerCase();
    const professionalTerm = professionalSearch.trim().toLowerCase();
    if (patientTerm) {
      result = result.filter(apt => (apt.patient || "").toLowerCase().includes(patientTerm));
    }
    if (professionalTerm) {
      result = result.filter(apt => (apt.attendantName || "").toLowerCase().includes(professionalTerm));
    }
    return result;
  };

  // Listas para autocomplete: Paciente = tabela patients, Profissional = tabela profiles (atendentes). Usar id como key para evitar duplicatas de nome.
  const patientOptionsFromTable = useMemo(() =>
    patients
      .filter(p => p.name?.trim())
      .sort((a, b) => (a.name || "").localeCompare(b.name || "", "pt-BR"))
      .map(p => ({ id: p.id, name: p.name })),
    [patients]
  );
  const professionalOptionsFromTable = useMemo(() => {
    const attendants = profiles.filter(p => p.is_active && p.role === "user");
    return attendants
      .filter(p => p.name?.trim())
      .sort((a, b) => (a.name || "").localeCompare(b.name || "", "pt-BR"))
      .map(p => ({ id: p.user_id || p.id, name: p.name }));
  }, [profiles]);

  // Mapa de agendamentos e sessões pagas por paciente (reutiliza mesma lógica da tela de Pacientes)
  const paidRevenueStatusKeys = useMemo(
    () => new Set(revenueStatuses.filter((s) => s.count_in_balance).map((s) => s.key)),
    [revenueStatuses]
  );

  const appointmentCountByPatientId = useMemo(() => {
    const map: Record<string, number> = {};
    for (const a of supabaseAppointments) {
      if (a.patient_id) map[a.patient_id] = (map[a.patient_id] ?? 0) + 1;
    }
    return map;
  }, [supabaseAppointments]);

  const paidRevenueCountByPatientId = useMemo(() => {
    const map: Record<string, number> = {};
    for (const r of allRevenue) {
      if (r.patientId && paidRevenueStatusKeys.has(r.status)) {
        map[r.patientId] = (map[r.patientId] ?? 0) + 1;
      }
    }
    return map;
  }, [allRevenue, paidRevenueStatusKeys]);

  // Agendamentos que batem com os filtros de busca (para o calendário seguir o filtro)
  const appointmentsMatchingSearch = useMemo(() => applySearchFilters(appointments), [appointments, patientSearch, professionalSearch]);

  // Get week days
  const weekDays = useMemo(() => {
    const start = startOfWeek(selectedDate, { weekStartsOn: 0 });
    return eachDayOfInterval({ start, end: addDays(start, 6) });
  }, [selectedDate]);

  // Filter appointments based on view mode, tab and search
  const filteredAppointments = useMemo(() => {
    let result = appointments;

    // Filter by selected date (always filter by selected day, even in week view)
    result = result.filter(apt => isSameDay(apt.date, selectedDate));

    // Filter by status tab
    if (activeTab !== "all") {
      result = result.filter(apt => apt.status === activeTab);
    }

    result = applySearchFilters(result);

    // Sort by time
    return result.sort((a, b) => a.time.localeCompare(b.time));
  }, [appointments, selectedDate, activeTab, patientSearch, professionalSearch]);

  // Kanban appointments - show all appointments from the selected week, not just the selected day
  const kanbanAppointments = useMemo(() => {
    let result = appointments.filter(apt => isSameWeek(apt.date, selectedDate, { weekStartsOn: 0 }));
    result = applySearchFilters(result);

    // Sort by date then time
    return result.sort((a, b) => {
      const dateCompare = a.date.getTime() - b.date.getTime();
      if (dateCompare !== 0) return dateCompare;
      return a.time.localeCompare(b.time);
    });
  }, [appointments, selectedDate, patientSearch, professionalSearch]);

  // Stats - baseado no modo de visualização atual e nos filtros de paciente/profissional
  const statsAppointments = useMemo(() => {
    let result;
    if (viewMode === "day") {
      result = appointments.filter(apt => isSameDay(apt.date, selectedDate));
    } else {
      result = appointments.filter(apt => isSameWeek(apt.date, selectedDate, { weekStartsOn: 0 }));
    }
    return applySearchFilters(result);
  }, [appointments, selectedDate, viewMode, patientSearch, professionalSearch]);

  // Contagem de agendamentos da semana para exibir no badge
  const weekAppointmentsCount = useMemo(() => {
    return appointments.filter(apt => isSameWeek(apt.date, selectedDate, { weekStartsOn: 0 })).length;
  }, [appointments, selectedDate]);

  // Status da agenda sem "Pago" (removido do fluxo); ordem segue Configurações > Status Agenda
  const scheduleStatuses = useMemo(
    () => statusConfig.filter((s) => s.key !== 'paid'),
    [statusConfig]
  );

  // Estilos dos cards por status (customizados usam estilo padrão)
  const getStatusCardStyle = (key: string) => {
    const map: Record<string, { Icon: typeof AlertCircle; bg: string; iconColor: string; ring: string }> = {
      pending: { Icon: AlertCircle, bg: "bg-yellow-100", iconColor: "text-yellow-600", ring: "ring-yellow-500" },
      confirmed: { Icon: CheckCircle, bg: "bg-green-100", iconColor: "text-green-600", ring: "ring-green-500" },
      completed: { Icon: CheckCircle, bg: "bg-blue-100", iconColor: "text-blue-600", ring: "ring-blue-500" },
      cancelled: { Icon: XCircle, bg: "bg-red-100", iconColor: "text-red-600", ring: "ring-red-500" },
    };
    return map[key] ?? { Icon: CircleDot, bg: "bg-muted", iconColor: "text-muted-foreground", ring: "ring-muted-foreground" };
  };

  // Pagination
  const totalPages = Math.ceil(filteredAppointments.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedAppointments = filteredAppointments.slice(startIndex, startIndex + itemsPerPage);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, selectedDate, viewMode, patientSearch, professionalSearch]);

  const handleCreateAppointment = async (appointmentData: any, options?: { closeModal?: boolean }) => {
    const closeModal = options?.closeModal !== false;
    try {
      await addAppointment({
        patient_id: appointmentData.patientId || null,
        patient_name: appointmentData.patient,
        attendant_id: appointmentData.attendantId || null,
        attendant_name: appointmentData.attendantName || null,
        service_id: appointmentData.serviceId || null,
        service_name: appointmentData.serviceName || null,
        appointment_date: format(appointmentData.date, 'yyyy-MM-dd'),
        appointment_time: appointmentData.time,
        duration_minutes: appointmentData.duration || 60,
        status: appointmentData.status || 'pending',
        type: appointmentData.type || null,
        notes: appointmentData.notes || null
      });
      if (closeModal) setIsAppointmentModalOpen(false);
    } catch (error) {
      console.error('Error creating appointment:', error);
    }
  };

  const handleEditAppointment = (appointment: Appointment) => {
    setEditingAppointment(appointment);
    setIsAppointmentModalOpen(true);
  };

  const handleUpdateAppointment = async (updatedAppointment: Appointment) => {
    try {
      await updateAppointment(updatedAppointment.id.toString(), {
        patient_name: updatedAppointment.patient,
        attendant_id: updatedAppointment.attendantId || null,
        attendant_name: updatedAppointment.attendantName || null,
        service_id: updatedAppointment.serviceId || null,
        service_name: updatedAppointment.serviceName || null,
        appointment_date: format(updatedAppointment.date, 'yyyy-MM-dd'),
        appointment_time: updatedAppointment.time,
        duration_minutes: updatedAppointment.duration,
        type: updatedAppointment.type || null,
        notes: updatedAppointment.notes || null
      });
      setIsAppointmentModalOpen(false);
      setEditingAppointment(null);
    } catch (error) {
      console.error('Error updating appointment:', error);
    }
  };

  const handleOpenStatusModal = (appointment: Appointment) => {
    setStatusUpdateAppointment(appointment);
  };

  const handleUpdateStatus = async (appointmentId: number | string, newStatus: string) => {
    try {
      await updateAppointment(appointmentId.toString(), { status: newStatus });
      setStatusUpdateAppointment(null);
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const handleKanbanStatusChange = async (appointmentId: number | string, newStatus: 'pending' | 'confirmed' | 'cancelled' | 'completed') => {
    try {
      await updateAppointment(appointmentId.toString(), { status: newStatus });
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const handleSubmitAppointment = async (appointmentData: any) => {
    if (editingAppointment) {
      const first = appointmentData.slots?.[0];
      await handleUpdateAppointment({
        ...appointmentData,
        id: editingAppointment.id,
        date: first?.date ?? appointmentData.date,
        time: first?.time ?? appointmentData.time,
      });
      return;
    }
    const slots = appointmentData.slots?.length
      ? appointmentData.slots
      : [{ date: appointmentData.date, time: appointmentData.time }];

    // Antes de criar novos agendamentos, validar saldo de sessões do paciente (quando houver paciente vinculado)
    const patientId: string | undefined = appointmentData.patientId;
    if (patientId) {
      const existingAppointmentsForPatient = appointmentCountByPatientId[patientId] ?? 0;
      const slotsToCreate = slots.length;

      const fullPatient = patients.find((p) => p.id === patientId);
      const plan = fullPatient?.plan_id ? plans.find((pl) => pl.id === fullPatient.plan_id) : null;
      const paidCount = paidRevenueCountByPatientId[patientId] ?? 0;
      const planSessions = plan != null ? Math.max(1, plan.sessions ?? 1) : 0;
      const sessionsLiberated = plan ? paidCount * planSessions : 0;

      // Se não houver plano ou nenhuma sessão liberada, impedir novo agendamento
      if (!plan || sessionsLiberated === 0) {
        toast({
          title: "Sem sessões liberadas",
          description:
            "Este paciente não possui sessões liberadas pelo plano. Registre o pagamento do plano antes de agendar.",
          variant: "destructive",
        });
        return;
      }

      const futureTotalAppointments = existingAppointmentsForPatient + slotsToCreate;
      if (futureTotalAppointments > sessionsLiberated) {
        toast({
          title: "Saldo de sessões insuficiente",
          description: `Este paciente já possui ${existingAppointmentsForPatient} de ${sessionsLiberated} sessões liberadas. Não é possível agendar mais ${slotsToCreate} sessão(ões) sem novo pagamento.`,
          variant: "destructive",
        });
        return;
      }
    }

    if (slots.length === 1) {
      await handleCreateAppointment({ ...appointmentData, date: slots[0].date, time: slots[0].time });
      return;
    }
    try {
      for (const slot of slots) {
        await handleCreateAppointment(
          { ...appointmentData, date: slot.date, time: slot.time },
          { closeModal: false }
        );
      }
      setIsAppointmentModalOpen(false);
    } catch (error) {
      console.error('Error creating appointments:', error);
    }
  };

  const handleDeleteAppointment = (id: number | string) => {
    const appointment = appointments.find((apt) => apt.id === id);
    if (appointment) {
      setAppointmentToDelete(appointment);
    }
  };

  const handleConfirmDeleteAppointment = async () => {
    if (!appointmentToDelete) return;
    try {
      setIsDeletingAppointment(true);
      await deleteAppointment(appointmentToDelete.id.toString());
    } catch (error) {
      console.error('Error deleting appointment:', error);
    } finally {
      setIsDeletingAppointment(false);
      setAppointmentToDelete(null);
    }
  };

  const handlePrintSchedule = () => {
    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Agenda - ${format(selectedDate, "dd/MM/yyyy")} - ${customizationData.appName || 'Clínica Médica'}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 15px; }
          .header img { max-height: 60px; max-width: 200px; margin-bottom: 10px; }
          .clinic-name { font-size: 20px; font-weight: bold; color: #333; margin-bottom: 4px; }
          .clinic-subtitle { font-size: 12px; color: #666; margin-bottom: 8px; }
          .date { font-size: 18px; font-weight: bold; color: #1a1a1a; margin-top: 10px; }
          .subtitle { font-size: 14px; color: #666; margin-top: 5px; }
          .stats { display: flex; justify-content: space-around; margin: 20px 0; }
          .stat { text-align: center; }
          .stat-number { font-size: 20px; font-weight: bold; color: #4f46e5; }
          .stat-label { font-size: 12px; color: #666; }
          .appointment { border: 1px solid #ddd; margin: 10px 0; padding: 15px; border-radius: 8px; }
          .appointment-time { font-size: 18px; font-weight: bold; color: #333; }
          .appointment-patient { font-size: 16px; margin: 5px 0; }
          .status-confirmed { background-color: #dcfce7; color: #166534; }
          .status-pending { background-color: #fef3c7; color: #92400e; }
          .status-cancelled { background-color: #fee2e2; color: #991b1b; }
          .status-badge { padding: 3px 8px; border-radius: 12px; font-size: 11px; font-weight: bold; }
          .no-appointments { text-align: center; padding: 40px; color: #666; }
          .footer { margin-top: 30px; text-align: center; font-size: 12px; color: #888; border-top: 1px solid #eee; padding-top: 15px; }
        </style>
      </head>
      <body>
        <div class="header">
          ${customizationData.logoUrl ? `<img src="${customizationData.logoUrl}" alt="Logo" />` : ''}
          <div class="clinic-name">${customizationData.appName || 'Clínica Médica'}</div>
          <div class="clinic-subtitle">${customizationData.appSubtitle || 'Sistema de Gestão Médica'}</div>
          <div class="date">Agenda do Dia</div>
          <div class="subtitle">${format(selectedDate, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}</div>
        </div>
        
        <div class="stats">
          <div class="stat">
            <div class="stat-number">${statsAppointments.length}</div>
            <div class="stat-label">Total</div>
          </div>
          ${scheduleStatuses.map(s => {
            const count = statsAppointments.filter(apt => apt.status === s.key).length;
            return `
          <div class="stat">
            <div class="stat-number">${count}</div>
            <div class="stat-label">${s.label}</div>
          </div>`;
          }).join('')}
        </div>

        ${statsAppointments.length === 0 ?
        '<div class="no-appointments">Nenhuma consulta agendada</div>' :
        statsAppointments
          .sort((a, b) => a.time.localeCompare(b.time))
          .map(apt => `
              <div class="appointment">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                  <div class="appointment-time">${apt.time}</div>
                  <span class="status-badge status-${apt.status}">
                    ${getStatusLabel(apt.status)}
                  </span>
                </div>
                <div class="appointment-patient"><strong>Paciente:</strong> ${apt.patient}</div>
                ${apt.serviceName ? `<div><strong>Serviço:</strong> ${apt.serviceName}</div>` : ''}
                ${apt.attendantName ? `<div><strong>Atendente:</strong> ${apt.attendantName}</div>` : ''}
              </div>
            `).join('')
      }

        <div class="footer">
          Gerado em ${format(new Date(), "dd/MM/yyyy 'às' HH:mm")}
        </div>
      </body>
      </html>
    `;

    printHtmlDocument({
      html: printContent,
      onPopupBlocked: () =>
        alert("Por favor, permita pop-ups para imprimir a agenda."),
    });
  };

  const renderPagination = () => {
    if (totalPages <= 1) return null;

    const getVisiblePages = () => {
      const pages: (number | string)[] = [];
      const maxVisible = isMobile ? 3 : 5;

      if (totalPages <= maxVisible) {
        for (let i = 1; i <= totalPages; i++) pages.push(i);
      } else {
        if (currentPage <= 3) {
          pages.push(1, 2, 3, '...', totalPages);
        } else if (currentPage >= totalPages - 2) {
          pages.push(1, '...', totalPages - 2, totalPages - 1, totalPages);
        } else {
          pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages);
        }
      }
      return pages;
    };

    return (
      <Pagination className="mt-4">
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
            />
          </PaginationItem>
          {getVisiblePages().map((page, index) => (
            <PaginationItem key={index}>
              {page === '...' ? (
                <PaginationEllipsis />
              ) : (
                <PaginationLink
                  onClick={() => setCurrentPage(page as number)}
                  isActive={currentPage === page}
                  className="cursor-pointer"
                >
                  {page}
                </PaginationLink>
              )}
            </PaginationItem>
          ))}
          <PaginationItem>
            <PaginationNext
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-4 animate-fade-in p-3 md:p-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-3 gap-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-20" />)}
        </div>
        <Skeleton className="h-12 w-full" />
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          <Skeleton className="h-80" />
          <div className="lg:col-span-3 space-y-3">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-24" />)}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-fade-in p-3 md:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-foreground">Agenda</h1>
          <p className="text-sm text-muted-foreground">
            {format(selectedDate, "EEEE, dd 'de' MMMM", { locale: ptBR })}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handlePrintSchedule}>
            <Printer className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">Imprimir</span>
          </Button>
          <Button
            className="clinic-gradient text-white"
            size="sm"
            onClick={() => {
              setEditingAppointment(null);
              setIsAppointmentModalOpen(true);
            }}
          >
            <Plus className="w-4 h-4 mr-2" />
            Novo Agendamento
          </Button>
        </div>
      </div>

      {/* Busca por Paciente e Profissional (com sugestões do que está cadastrado) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
            <Search className="w-3.5 h-3.5" />
            Busca por Paciente
          </label>
          <Input
            placeholder="Digite o nome do paciente..."
            value={patientSearch}
            onChange={(e) => setPatientSearch(e.target.value)}
            className="h-9"
            list="schedule-patient-list"
            autoComplete="off"
          />
          <datalist id="schedule-patient-list">
            {patientOptionsFromTable.map((p) => (
              <option key={p.id} value={p.name} />
            ))}
          </datalist>
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
            <Search className="w-3.5 h-3.5" />
            Busca por Profissional
          </label>
          <Input
            placeholder="Digite o nome do profissional..."
            value={professionalSearch}
            onChange={(e) => setProfessionalSearch(e.target.value)}
            className="h-9"
            list="schedule-professional-list"
            autoComplete="off"
          />
          <datalist id="schedule-professional-list">
            {professionalOptionsFromTable.map((p) => (
              <option key={p.id} value={p.name} />
            ))}
          </datalist>
        </div>
      </div>

      {/* Stats Cards - ordem e itens vêm de Configurações > Status Agenda */}
      <div
        className={cn(
          "grid gap-3",
          scheduleStatuses.length === 4 ? "grid-cols-2 sm:grid-cols-4" : ""
        )}
        style={
          scheduleStatuses.length !== 4
            ? { gridTemplateColumns: `repeat(${scheduleStatuses.length}, minmax(0, 1fr))` }
            : undefined
        }
      >
        {scheduleStatuses.map((s) => {
          const count = statsAppointments.filter((apt) => apt.status === s.key).length;
          const style = getStatusCardStyle(s.key);
          const Icon = style.Icon;
          return (
            <Card
              key={s.id}
              className={cn(
                "cursor-pointer transition-all hover:shadow-md",
                activeTab === s.key && "ring-2",
                activeTab === s.key && style.ring
              )}
              onClick={() => setActiveTab(activeTab === s.key ? "all" : s.key)}
            >
              <CardContent className="p-3 md:p-4">
                <div className="flex items-center gap-3">
                  <div className={cn("p-2 rounded-full", style.bg)}>
                    <Icon className={cn("w-4 h-4 md:w-5 md:h-5", style.iconColor)} />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">{count}</p>
                    <p className="text-xs text-muted-foreground">{s.label}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* View Tabs */}
      <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as "day" | "week" | "kanban")} className="w-full">
        <div className="flex items-center w-full border rounded-lg bg-background">
          <TabsList className="h-10 bg-transparent border-0 p-0">
            <TabsTrigger value="day" className="h-10 px-4 rounded-none border-r data-[state=active]:bg-muted">
              <CalendarIcon className="w-4 h-4 mr-2" />
              Dia
            </TabsTrigger>
            <TabsTrigger value="week" className="h-10 px-4 rounded-none border-r data-[state=active]:bg-muted">
              <LayoutGrid className="w-4 h-4 mr-2" />
              Semana
            </TabsTrigger>
            <TabsTrigger value="kanban" className="h-10 px-4 rounded-none border-r data-[state=active]:bg-muted">
              <Kanban className="w-4 h-4 mr-2" />
              Kanban
            </TabsTrigger>
          </TabsList>

          {activeTab !== "all" && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setActiveTab("all")}
              className="text-muted-foreground h-10 rounded-none ml-auto"
            >
              Limpar filtro
            </Button>
          )}
        </div>

        <div className="mt-4 flex flex-col lg:flex-row gap-4">
          {/* Calendar Sidebar - Hidden in Kanban view */}
          {viewMode !== "kanban" && (
            <Card className="shadow-sm lg:w-[280px] lg:min-w-[280px] lg:flex-shrink-0">
              <CardContent className="p-3">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => date && setSelectedDate(date)}
                  locale={ptBR}
                  className="rounded-md border-0 w-full pointer-events-auto"
                  modifiers={{
                    hasAppointments: (date) => appointmentsMatchingSearch.some(apt => isSameDay(apt.date, date))
                  }}
                  modifiersStyles={{
                    hasAppointments: {
                      backgroundColor: 'hsl(var(--primary) / 0.15)',
                      color: 'hsl(var(--primary))',
                      fontWeight: 'bold'
                    }
                  }}
                />
              </CardContent>
            </Card>
          )}

          {/* Main Content */}
          <div className="flex-1 min-w-0">
            <TabsContent value="day" className="mt-0">
              <Card className="shadow-sm">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base font-semibold">
                      Agendamentos do Dia
                    </CardTitle>
                    <Badge variant="secondary">
                      {filteredAppointments.length} {filteredAppointments.length === 1 ? 'agendamento' : 'agendamentos'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-3 pt-0">
                  {filteredAppointments.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="w-16 h-16 mx-auto bg-muted rounded-full flex items-center justify-center mb-4">
                        <CalendarIcon className="w-8 h-8 text-muted-foreground" />
                      </div>
                      <h3 className="text-lg font-medium text-foreground mb-2">
                        Nenhum agendamento
                      </h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        Que tal criar um novo agendamento?
                      </p>
                      <Button
                        className="clinic-gradient text-white"
                        onClick={() => {
                          setEditingAppointment(null);
                          setIsAppointmentModalOpen(true);
                        }}
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Novo Agendamento
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {paginatedAppointments.map((appointment) => (
                        <AppointmentCard
                          key={appointment.id}
                          appointment={appointment}
                          onEdit={handleEditAppointment}
                          onDelete={handleDeleteAppointment}
                          onStatusChange={handleOpenStatusModal}
                        />
                      ))}
                      {renderPagination()}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="week" className="mt-0">
              <Card className="shadow-sm">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base font-semibold">
                      Semana de {format(weekDays[0], "dd/MM")} a {format(weekDays[6], "dd/MM")}
                    </CardTitle>
                    <Badge variant="secondary">
                      {weekAppointmentsCount} {weekAppointmentsCount === 1 ? 'agendamento' : 'agendamentos'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-3 pt-0">
                  {/* Week Day Headers */}
                  <div className="grid grid-cols-7 gap-1 mb-3">
                    {weekDays.map((day, index) => {
                      const dayAppointments = applySearchFilters(appointments.filter(apt => isSameDay(apt.date, day)));
                      const isSelected = isSameDay(day, selectedDate);
                      const hasAppointments = dayAppointments.length > 0;

                      return (
                        <button
                          key={index}
                          onClick={() => setSelectedDate(day)}
                          className={cn(
                            "p-2 rounded-lg text-center transition-all",
                            isSelected
                              ? "bg-primary text-primary-foreground"
                              : hasAppointments
                                ? "bg-primary/10 hover:bg-primary/20"
                                : "hover:bg-muted",
                            isToday(day) && !isSelected && "ring-1 ring-primary"
                          )}
                        >
                          <p className="text-xs font-medium">
                            {format(day, "EEE", { locale: ptBR })}
                          </p>
                          <p className={cn(
                            "text-lg font-bold",
                            isSelected ? "text-primary-foreground" : "text-foreground"
                          )}>
                            {format(day, "dd")}
                          </p>
                          {hasAppointments && (
                            <Badge
                              variant={isSelected ? "secondary" : "outline"}
                              className="text-xs mt-1"
                            >
                              {dayAppointments.length}
                            </Badge>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* Selected Day Label */}
                  <div className="mb-3 text-sm text-muted-foreground">
                    {format(selectedDate, "EEEE, dd/MM", { locale: ptBR })}
                  </div>

                  {/* Appointments List */}
                  {filteredAppointments.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-muted-foreground">Nenhum agendamento para {format(selectedDate, "EEEE", { locale: ptBR })}</p>
                    </div>
                  ) : (
                    <ScrollArea className="h-[400px]">
                      <div className="space-y-3 pr-3">
                        {paginatedAppointments.map((appointment) => (
                          <AppointmentCard
                            key={appointment.id}
                            appointment={appointment}
                            onEdit={handleEditAppointment}
                            onDelete={handleDeleteAppointment}
                            onStatusChange={handleOpenStatusModal}
                          />
                        ))}
                      </div>
                    </ScrollArea>
                  )}
                  {renderPagination()}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="kanban" className="mt-0">
              <Card className="shadow-sm">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base font-semibold">
                      Gestão de Agendamentos - Semana de {format(weekDays[0], "dd/MM")} a {format(weekDays[6], "dd/MM")}
                    </CardTitle>
                    <Badge variant="secondary">
                      {kanbanAppointments.length} {kanbanAppointments.length === 1 ? 'agendamento' : 'agendamentos'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-3 pt-0">
                  <KanbanBoard
                    statuses={scheduleStatuses}
                    appointments={kanbanAppointments}
                    onStatusChange={handleKanbanStatusChange}
                    onEdit={handleEditAppointment}
                    onDelete={handleDeleteAppointment}
                  />
                </CardContent>
              </Card>
            </TabsContent>
          </div>
        </div>
      </Tabs>

      <AppointmentModal
        isOpen={isAppointmentModalOpen}
        onClose={() => {
          setIsAppointmentModalOpen(false);
          setEditingAppointment(null);
        }}
        onSubmit={handleSubmitAppointment}
        selectedDate={selectedDate}
        appointmentToEdit={editingAppointment}
      />

      <StatusUpdateModal
        isOpen={!!statusUpdateAppointment}
        onClose={() => setStatusUpdateAppointment(null)}
        appointment={statusUpdateAppointment}
        onUpdateStatus={handleUpdateStatus}
      />

      <AlertDialog
        open={!!appointmentToDelete}
        onOpenChange={(open) => {
          if (!open && !isDeletingAppointment) {
            setAppointmentToDelete(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir agendamento?</AlertDialogTitle>
            <AlertDialogDescription>
              {appointmentToDelete && (
                <>
                  Tem certeza que deseja excluir o agendamento de{" "}
                  <strong>{appointmentToDelete.patient}</strong>{" "}
                  {appointmentToDelete.serviceName && (
                    <>
                      para o serviço <strong>{appointmentToDelete.serviceName}</strong>{" "}
                    </>
                  )}
                  em{" "}
                  {format(appointmentToDelete.date, "dd/MM/yyyy", { locale: ptBR })} às{" "}
                  {appointmentToDelete.time}? Esta ação não pode ser desfeita.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeletingAppointment}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDeleteAppointment}
              className="bg-red-600 hover:bg-red-700"
              disabled={isDeletingAppointment}
            >
              {isDeletingAppointment ? "Excluindo..." : "Excluir agendamento"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Schedule;
