import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { X, Calendar as CalendarIcon, CheckCircle, User as UserIcon, Briefcase, Clock, FileText, Loader2, Plus, Trash2 } from "lucide-react";
import { PatientAutocomplete } from "@/components/forms/PatientAutocomplete";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useCustomizationContext } from "@/contexts/CustomizationContext";
import { format, addDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useProfiles, Profile } from "@/hooks/useProfiles";
import { useSupabaseServices, Service } from "@/hooks/useSupabaseServices";
import { useSupabaseSchedule } from "@/hooks/useSupabaseSchedule";
import { useAppointments } from "@/hooks/useAppointments";
import { usePatients } from "@/hooks/usePatients";
import { usePlans } from "@/hooks/usePlans";
import { useRevenue } from "@/hooks/useRevenue";
import AddPatientModal from "@/components/AddPatientModal";
import { Card, CardContent } from "./ui/card";
import { cn } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Appointment } from "@/pages/Schedule";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAppointmentStatusConfigContext } from "@/contexts/AppointmentStatusConfigContext";
import { useRevenueStatusConfigContext } from "@/contexts/RevenueStatusConfigContext";

const slotSchema = z.object({
  date: z.date(),
  time: z.string(),
});

const appointmentSchema = z.object({
  patient: z.string().min(1, "O nome do paciente é obrigatório."),
  patientId: z.string().optional(),
  notes: z.string().optional(),
  attendant: z.custom<Profile>().refine(u => !!u?.id, { message: "O atendente é obrigatório." }),
  service: z.custom<Service>().refine(s => !!s?.id, { message: "O serviço é obrigatório." }),
  status: z.string().min(1, "Selecione o status."),
  slots: z.array(slotSchema).min(1, "Adicione pelo menos um dia e horário."),
});

type AppointmentFormValues = z.infer<typeof appointmentSchema>;

interface AppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (appointment: any) => void;
  selectedDate: Date;
  appointmentToEdit?: Appointment | null;
}

const steps = [
  { id: 1, name: 'Paciente', icon: FileText },
  { id: 2, name: 'Atendente', icon: UserIcon },
  { id: 3, name: 'Serviço', icon: Briefcase },
  { id: 4, name: 'Horário', icon: Clock },
  { id: 5, name: 'Revisão', icon: CheckCircle },
];

export const AppointmentModal = ({
  isOpen,
  onClose,
  onSubmit,
  selectedDate,
  appointmentToEdit
}: AppointmentModalProps) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [hasInitialized, setHasInitialized] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPatientModalOpen, setIsPatientModalOpen] = useState(false);
  // Estado local da data exibida no calendário (evita bug com 1 slot no useFieldArray/watch)
  const [slotCalendarDates, setSlotCalendarDates] = useState<Record<number, Date | undefined>>({});
  const { toast } = useToast();
  const { addPatient, patients } = usePatients();
  const { customizationData } = useCustomizationContext();
  const { statuses: statusConfig, getLabel: getStatusLabel } = useAppointmentStatusConfigContext();
  const initialStatusOptions = statusConfig.filter((s) => s.key !== "cancelled");

  const { plans } = usePlans();
  const { allRevenue } = useRevenue();
  const { statuses: revenueStatuses } = useRevenueStatusConfigContext();

  const [patientHasSessions, setPatientHasSessions] = useState<boolean | null>(null);

  // Usar hooks do Supabase
  const { profiles, isLoading: profilesLoading } = useProfiles();
  const { services, isLoading: servicesLoading } = useSupabaseServices();
  const { timeSlots, assignments, isLoading: scheduleLoading } = useSupabaseSchedule();
  const { appointments: existingAppointments, isLoading: appointmentsLoading, fetchAppointments } = useAppointments();

  const paidRevenueStatusKeys = useMemo(
    () => new Set(revenueStatuses.filter((s) => s.count_in_balance).map((s) => s.key)),
    [revenueStatuses]
  );

  const paidRevenueCountByPatientId = useMemo(() => {
    const map: Record<string, number> = {};
    for (const r of allRevenue) {
      if (r.patientId && paidRevenueStatusKeys.has(r.status)) {
        map[r.patientId] = (map[r.patientId] ?? 0) + 1;
      }
    }
    return map;
  }, [allRevenue, paidRevenueStatusKeys]);

  /** Retorna o número de sessões liberadas do paciente (0 se sem plano ou sem receitas pagas). */
  const getSessionsLiberated = useCallback(
    (patientId?: string): number => {
      if (!patientId) return 0;
      const fullPatient = patients.find((p) => p.id === patientId);
      const plan = fullPatient?.plan_id ? plans.find((pl) => pl.id === fullPatient.plan_id) : null;
      const paidCount = paidRevenueCountByPatientId[patientId] ?? 0;
      const planSessions = plan != null ? Math.max(1, plan.sessions ?? 1) : 0;
      return plan ? paidCount * planSessions : 0;
    },
    [patients, plans, paidRevenueCountByPatientId]
  );

  const ensurePatientHasSessions = useCallback(
    (patientId?: string) => {
      if (!patientId) {
        setPatientHasSessions(null);
        return;
      }

      const sessionsLiberated = getSessionsLiberated(patientId);

      if (sessionsLiberated <= 0) {
        setPatientHasSessions(false);
        toast({
          title: "Paciente sem sessões liberadas",
          description:
            "Este paciente não possui sessões liberadas pelo plano. Registre o pagamento do plano antes de seguir com o agendamento.",
          variant: "destructive",
        });
        return;
      }

      setPatientHasSessions(true);
    },
    [getSessionsLiberated, toast]
  );

  // Filtrar apenas atendentes que são do tipo 'user' e estão ativos
  const attendants = useMemo(() =>
    profiles.filter(p => p.is_active && p.role === 'user'),
    [profiles]
  );

  // Filtrar apenas serviços disponíveis
  const availableServices = useMemo(() =>
    services.filter(s => s.is_available),
    [services]
  );

  const isEditMode = !!appointmentToEdit;
  // Loading apenas afeta steps que precisam dos dados (2, 3, 4)
  const isDataLoading = profilesLoading || servicesLoading || scheduleLoading || appointmentsLoading;

  const form = useForm<AppointmentFormValues>({
    resolver: zodResolver(appointmentSchema.partial()),
    defaultValues: {
      patient: '',
      notes: '',
      status: 'pending',
      slots: [{ date: selectedDate, time: '' }],
    }
  });

  const { reset, setValue, watch } = form;
  const { fields: slotFields, append: appendSlot, remove: removeSlot, update: updateSlot } = useFieldArray({ control: form.control, name: 'slots' });

  // Inicializar form apenas quando modal abre (sem depender de isLoading)
  useEffect(() => {
    if (isOpen && !hasInitialized) {
      if (isEditMode && appointmentToEdit) {
        reset({
          patient: appointmentToEdit.patient,
          notes: appointmentToEdit.notes || '',
          status: appointmentToEdit.status,
          slots: [{ date: new Date(appointmentToEdit.date), time: appointmentToEdit.time }],
          attendant: undefined,
          service: undefined,
        });
      } else {
        reset({
          status: 'pending',
          slots: [{ date: selectedDate, time: '' }],
          notes: '',
          patient: '',
          attendant: undefined,
          service: undefined,
        });
      }
      setHasInitialized(true);
    }

    if (!isOpen) {
      setHasInitialized(false);
    }
  }, [isOpen, hasInitialized, isEditMode, selectedDate, reset, appointmentToEdit]);

  // Atualizar attendant e service após carregar dados (para modo edição)
  useEffect(() => {
    if (isOpen && isEditMode && appointmentToEdit && !isDataLoading && hasInitialized) {
      const attendant = attendants.find(a => a.user_id === appointmentToEdit.attendantId);
      const service = services.find(s => s.id === appointmentToEdit.serviceId);
      if (attendant) setValue('attendant', attendant, { shouldValidate: false });
      if (service) setValue('service', service, { shouldValidate: false });
    }
  }, [isOpen, isEditMode, appointmentToEdit, isDataLoading, hasInitialized, attendants, services, setValue]);

  // Só definir a data do primeiro slot ao ABRIR o modal (não sobrescrever depois que o usuário escolheu outra data no passo 4).
  const prevOpenRef = useRef(false);
  useEffect(() => {
    if (isOpen && !prevOpenRef.current && !isEditMode && hasInitialized) {
      const slots = watch('slots');
      if (slots?.length === 1 && slots[0]) {
        setValue('slots.0.date', selectedDate, { shouldValidate: false });
      }
    }
    prevOpenRef.current = isOpen;
  }, [isOpen, isEditMode, hasInitialized, selectedDate, setValue, watch]);

  // Ao abrir o modal, atualizar lista de agendamentos para que horários já salvos na sessão anterior não apareçam.
  useEffect(() => {
    if (isOpen) fetchAppointments();
  }, [isOpen, fetchAppointments]);

  // Sincronizar estado local do calendário com o form ao entrar no passo 4 (garante 1 slot clicável)
  useEffect(() => {
    if (currentStep === 4) {
      const slots = form.getValues('slots') ?? [];
      const next: Record<number, Date | undefined> = {};
      slots.forEach((s: { date?: Date | string; time?: string }, i: number) => {
        if (s?.date) next[i] = s.date instanceof Date ? s.date : new Date(s.date);
      });
      setSlotCalendarDates(prev => ({ ...prev, ...next }));
    }
  }, [currentStep]);

  const selectedAttendantId = watch('attendant')?.user_id;
  const slots = watch('slots') || [];
  const formDate = slots[0]?.date;

  // Normaliza data (Date ou string) para "yyyy-MM-dd" em horário LOCAL (sempre format(new Date(x)) para evitar UTC vs local).
  const toLocalDateString = useCallback((d: Date | string | undefined): string => {
    if (!d) return '';
    const dateObj = d instanceof Date ? d : new Date(String(d));
    if (Number.isNaN(dateObj.getTime())) return '';
    return format(dateObj, "yyyy-MM-dd");
  }, []);

  // Retorna horários disponíveis para uma data (usado por cada slot no passo 4).
  // occupiedTimesFromPreviousSlots: horários já escolhidos em slots anteriores na MESMA data (já calculados fora).
  const getAvailableTimeSlotsForDate = useCallback((date: Date, slotIndex: number, occupiedTimesFromPreviousSlots: string[]) => {
    if (!selectedAttendantId || !date) return [];

    const dayOfWeekFull = format(date, "EEEE", { locale: ptBR });
    const dayOfWeekShort = dayOfWeekFull.split('-')[0];
    const capitalizedDayOfWeek = dayOfWeekShort.charAt(0).toUpperCase() + dayOfWeekShort.slice(1);
    const formattedDate = format(date, "yyyy-MM-dd");

    const occupiedTimes = existingAppointments
      .filter(apt =>
        apt.attendant_id === selectedAttendantId &&
        apt.appointment_date === formattedDate &&
        apt.status !== 'cancelled' &&
        (!isEditMode || apt.id !== appointmentToEdit?.id?.toString() || slotIndex !== 0)
      )
      .map(apt => apt.appointment_time);

    occupiedTimes.push(...(occupiedTimesFromPreviousSlots ?? []));

    const attendantAssignments = assignments.filter(a => a.attendant_id === selectedAttendantId);
    let slotsForDay: typeof timeSlots;

    if (attendantAssignments.length === 0) {
      slotsForDay = timeSlots.filter(ts =>
        ts.is_available && ts.days.includes(capitalizedDayOfWeek)
      );
    } else {
      const assignedSlotIds = attendantAssignments.map(a => a.time_slot_id);
      slotsForDay = timeSlots.filter(ts => {
        const matchesSlot = assignedSlotIds.includes(ts.id);
        const isAvailable = ts.is_available;
        const matchesDay = ts.days.includes(capitalizedDayOfWeek);
        return matchesSlot && isAvailable && matchesDay;
      });
    }

    const occupiedSet = new Set(occupiedTimes.map(t => String(t).trim()));
    return slotsForDay.filter(slot => !occupiedSet.has(String(slot.time).trim()));
  }, [selectedAttendantId, assignments, timeSlots, existingAppointments, isEditMode, appointmentToEdit]);

  const handleNext = async () => {
    // Validação manual por etapa para impedir avançar com campos obrigatórios vazios
    const values = form.getValues();

    if (currentStep === 1) {
      if (!values.patient?.trim()) {
        form.setError('patient', { type: 'manual', message: 'Selecione ou busque um paciente.' });
        return;
      }
      if (!values.patientId) {
        form.setError('patient', { type: 'manual', message: 'Selecione um paciente cadastrado na lista ou cadastre um novo.' });
        return;
      }

      // Bloquear avanço se o paciente não tiver sessões liberadas
      ensurePatientHasSessions(values.patientId);
      if (patientHasSessions === false) {
        form.setError('patient', {
          type: 'manual',
          message: 'Este paciente não possui sessões liberadas no plano.',
        });
        return;
      }
    }

    if (currentStep === 2) {
      if (!values.attendant?.id) {
        form.setError('attendant', { type: 'manual', message: 'O atendente é obrigatório.' } as any);
        toast({
          title: 'Selecione um profissional',
          description: 'Escolha o atendente antes de avançar para o próximo passo.',
          variant: 'destructive',
        });
        return;
      }
    }

    if (currentStep === 3) {
      if (!values.service?.id) {
        form.setError('service', { type: 'manual', message: 'O serviço é obrigatório.' } as any);
        toast({
          title: 'Selecione um serviço',
          description: 'Escolha o serviço que será realizado antes de avançar.',
          variant: 'destructive',
        });
        return;
      }
    }

    if (currentStep === 4) {
      const slotsVal = values.slots || [];
      const allFilled = slotsVal.length > 0 && slotsVal.every(s => s?.date && s?.time?.trim());
      if (!allFilled) {
        form.setError('slots', { type: 'manual', message: 'Selecione data e horário para cada dia.' });
        toast({
          title: 'Defina data e horário',
          description: 'Preencha data e horário para cada dia adicionado.',
          variant: 'destructive',
        });
        return;
      }
    }

    setCurrentStep(prev => prev + 1);
  };

  const handleBack = () => setCurrentStep(prev => prev - 1);

  const handleNewPatientSaved = async (newPatient: any) => {
    try {
      const data = await addPatient({
        name: newPatient.name,
        email: newPatient.email || null,
        phone: newPatient.phone || null,
        cpf: newPatient.cpf || null,
        rg: newPatient.rg || null,
        birth_date: newPatient.birthDate || null,
        gender: newPatient.gender === 'Não informado' ? null : newPatient.gender || null,
        profession: newPatient.profession || null,
        marital_status: newPatient.maritalStatus || null,
        status: 'active',
        notes: newPatient.notes || null,
        photo_url: newPatient.photo || null,
        document_url: newPatient.document || null,
        address_cep: newPatient.address?.zipCode || null,
        address_street: newPatient.address?.street || null,
        address_number: newPatient.address?.number || null,
        address_complement: newPatient.address?.complement || null,
        address_neighborhood: newPatient.address?.neighborhood || null,
        address_city: newPatient.address?.city || null,
        address_state: newPatient.address?.state || null
      });
      if (data?.id && data?.name) {
        form.setValue('patient', data.name, { shouldValidate: true });
        form.setValue('patientId', data.id);
        setIsPatientModalOpen(false);
      }
    } catch (_) {
      // usePatients já exibe toast de erro
    }
  };

  const onFinalSubmit = async (data: AppointmentFormValues) => {
    // Validação extra na etapa final para garantir campos obrigatórios,
    // mesmo que o usuário tenha pulado algo de forma inesperada.
    const missingFields: string[] = [];

    if (!data.patient?.trim() || !data.patientId) missingFields.push("paciente (cadastrado)");
    if (!data.attendant?.id) missingFields.push("atendente");
    if (!data.service?.id) missingFields.push("serviço");
    const slotsValid = (data.slots?.length ?? 0) > 0 && data.slots?.every(s => s?.date && s?.time?.trim());
    if (!slotsValid) missingFields.push("pelo menos um dia e horário");

    if (missingFields.length > 0) {
      toast({
        title: "Campos obrigatórios faltando",
        description: `Preencha: ${missingFields.join(", ")} antes de concluir o agendamento.`,
        variant: "destructive",
      });

      // Marcar erros nos campos principais para feedback visual
      if (!data.patient?.trim() || !data.patientId) {
        form.setError("patient", { type: "manual", message: "Selecione um paciente cadastrado." });
      }
      if (!data.attendant?.id) {
        form.setError("attendant", { type: "manual", message: "O atendente é obrigatório." } as any);
      }
      if (!data.service?.id) {
        form.setError("service", { type: "manual", message: "O serviço é obrigatório." } as any);
      }
      if (!slotsValid) {
        form.setError("slots", { type: "manual", message: "Adicione pelo menos um dia e horário." });
      }

      return;
    }

    setIsSubmitting(true);

    try {
      const baseData = {
        patient: data.patient,
        patientId: data.patientId,
        notes: data.notes,
        status: data.status,
        attendantId: data.attendant?.user_id,
        attendantName: data.attendant?.name,
        serviceId: data.service?.id,
        serviceName: data.service?.name,
        type: data.service?.name,
        duration: data.service?.duration_minutes || 60,
      };

      onSubmit({
        ...baseData,
        slots: data.slots,
      });
      setCurrentStep(1);
      onClose();
    } catch (error) {
      console.error('Error submitting appointment:', error);
      toast({
        title: "Erro ao agendar",
        description: "Ocorreu um erro ao criar o agendamento.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) {
        setCurrentStep(1);
        onClose();
      }
    }}>
      <DialogContent className="sm:max-w-[640px] max-h-[92vh] p-0 gap-0 border-0 shadow-2xl rounded-3xl overflow-hidden flex flex-col [&>button:last-child]:hidden">
        {/* Banner de Header Estilizado */}
        <div className="p-6 text-white relative overflow-hidden flex-shrink-0" style={{ backgroundColor: customizationData?.primaryColor }}>
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-20 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors duration-200 group"
          >
            <X className="w-5 h-5 text-white/70 group-hover:text-white" />
          </button>
          <div className="absolute inset-0 bg-gradient-to-br from-black/0 to-black/30 pointer-events-none" />

          <div className="relative z-10">
            <DialogTitle className="text-xl font-bold tracking-tight mb-1">
              {isEditMode ? 'Editar Agendamento' : 'Novo Agendamento'}
            </DialogTitle>
            <DialogDescription className="sr-only">
              Formulário para agendar ou editar uma consulta médica.
            </DialogDescription>
            <div className="flex items-center gap-2 text-white/80 text-sm font-medium">
              <CalendarIcon className="w-4 h-4" />
              <span>
                {slots.length > 1
                  ? `${slots.length} dias`
                  : formDate
                    ? format(formDate, "EEEE, dd 'de' MMMM", { locale: ptBR })
                    : "Selecionando data..."}
              </span>
            </div>
          </div>
        </div>

        <div className="p-6 flex flex-col gap-6 overflow-y-auto min-h-0 flex-1">
          {/* Indicador de Passos Premium */}
          <div className="flex items-center justify-between px-2">
            {steps.map((step, index) => {
              const isActive = currentStep === step.id;
              const isCompleted = currentStep > step.id;
              const StepIcon = step.icon;
              return (
                <div key={step.id} className="flex items-center flex-1 last:flex-none">
                  <div className="flex flex-col items-center gap-1.5 group cursor-default">
                    <div
                      className={cn(
                        "w-10 h-10 rounded-2xl flex items-center justify-center transition-all duration-300",
                        isActive ? "bg-primary text-white shadow-lg shadow-primary/20 scale-110" :
                          isCompleted ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
                      )}
                      style={isActive ? { backgroundColor: customizationData?.primaryColor } : {}}
                    >
                      {isCompleted ? <CheckCircle className="w-5 h-5" /> : <StepIcon className="w-5 h-5" />}
                    </div>
                    {isActive && (
                      <span className="text-[10px] font-black uppercase tracking-widest text-primary" style={{ color: customizationData?.primaryColor }}>
                        {step.name}
                      </span>
                    )}
                  </div>
                  {index < steps.length - 1 && (
                    <div className="flex-1 h-1 mx-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full bg-primary transition-all duration-500 ease-in-out"
                        style={{
                          width: isCompleted ? "100%" : "0%",
                          backgroundColor: customizationData?.primaryColor
                        }}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="min-h-[320px]">
            {isDataLoading && currentStep >= 2 && currentStep <= 4 ? (
              <div className="flex flex-col items-center justify-center py-20 gap-4">
                <Loader2 className="w-10 h-10 animate-spin text-primary" style={{ color: customizationData?.primaryColor }} />
                <p className="text-sm font-medium text-muted-foreground animate-pulse">Sincronizando disponibilidade...</p>
              </div>
            ) : (
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onFinalSubmit)} className="space-y-6">
                  {currentStep === 1 && (
                    <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
                      <div className="space-y-2">
                        <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Paciente *</Label>
                        <PatientAutocomplete
                          value={form.watch('patient') || ''}
                          onChange={(name, patientId) => {
                            form.setValue('patient', name, { shouldValidate: true });
                            form.setValue('patientId', patientId);
                            setPatientHasSessions(null);
                            if (patientId) {
                              ensurePatientHasSessions(patientId);
                            }
                          }}
                          onRegisterNew={() => setIsPatientModalOpen(true)}
                          placeholder="Quem vamos atender hoje?"
                          autoFocus
                        />
                        {form.formState.errors.patient && (
                          <p className="text-destructive text-xs font-medium">{form.formState.errors.patient.message}</p>
                        )}
                      </div>
                      <FormField
                        control={form.control}
                        name="notes"
                        render={({ field }) => (
                          <div className="space-y-2">
                            <Label htmlFor="notes-field" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Observações Internas</Label>
                            <Textarea
                              id="notes-field"
                              placeholder="Algum detalhe importante para este atendimento?"
                              className="min-h-[120px] resize-none border-border/50 bg-muted/20 focus:bg-background transition-colors"
                              {...field}
                              value={field.value || ''}
                            />
                          </div>
                        )}
                      />
                    </div>
                  )}

                  {currentStep === 2 && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Escolha o Profissional</h3>
                        <Badge variant="outline" className="font-mono text-[10px]">{attendants.length} Disponíveis</Badge>
                      </div>

                      {attendants.length === 0 ? (
                        <div className="text-center py-12 bg-muted/30 rounded-3xl border border-dashed">
                          <UserIcon className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
                          <p className="text-sm text-muted-foreground">Nenhum profissional habilitado encontrado.</p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 gap-3 max-h-[340px] overflow-y-auto p-1 pr-2 custom-scrollbar">
                          {attendants.map(attendant => {
                            const isSelected = form.watch('attendant')?.id === attendant.id;
                            return (
                              <button
                                key={attendant.id}
                                type="button"
                                onClick={() => {
                                  form.setValue('attendant', attendant, { shouldValidate: true });
                                  setCurrentStep(3);
                                }}
                                className={cn(
                                  "group relative flex flex-col items-center p-4 rounded-2xl border transition-all duration-200 text-center",
                                  isSelected ? "border-primary bg-primary/5 ring-1 ring-primary shadow-sm" :
                                    "border-border/50 hover:border-primary/30 hover:bg-muted/30"
                                )}
                              >
                                {isSelected && (
                                  <div className="absolute top-2 right-2 text-primary" style={{ color: customizationData?.primaryColor }}>
                                    <CheckCircle className="w-4 h-4 fill-current bg-white rounded-full" />
                                  </div>
                                )}
                                <div className={cn(
                                  "w-12 h-12 rounded-full flex items-center justify-center mb-3 transition-transform group-hover:scale-110",
                                  isSelected ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
                                )}>
                                  <UserIcon className="w-6 h-6" />
                                </div>
                                <p className="text-sm font-bold truncate w-full">{attendant.name}</p>
                                <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-tight truncate w-full">
                                  {attendant.position || 'Profissional'}
                                </p>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {currentStep === 3 && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">O que faremos hoje?</h3>
                        <Badge variant="outline" className="font-mono text-[10px]">{availableServices.length} Serviços</Badge>
                      </div>

                      <div className="grid gap-3 max-h-[340px] overflow-y-auto p-1 pr-2 custom-scrollbar">
                        {availableServices.map(service => {
                          const isSelected = form.watch('service')?.id === service.id;
                          return (
                            <button
                              key={service.id}
                              type="button"
                              onClick={() => {
                                form.setValue('service', service, { shouldValidate: true });
                                setCurrentStep(4);
                              }}
                              className={cn(
                                "group relative flex items-center p-4 rounded-2xl border transition-all duration-200 text-left gap-4",
                                isSelected ? "border-primary bg-primary/5 ring-1 ring-primary shadow-sm" :
                                  "border-border/50 hover:border-primary/30 hover:bg-muted/30"
                              )}
                            >
                              <div className={cn(
                                "w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-all",
                                isSelected ? "bg-primary text-white" : "bg-muted text-muted-foreground group-hover:bg-primary/10"
                              )} style={isSelected ? { backgroundColor: customizationData?.primaryColor } : {}}>
                                <Briefcase className="w-6 h-6" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-bold text-sm truncate">{service.name}</p>
                                <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                                  <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {service.duration_minutes}min</span>
                                </div>
                              </div>
                              {isSelected && <CheckCircle className="w-5 h-5 text-primary" style={{ color: customizationData?.primaryColor }} />}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {currentStep === 4 && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                      <div className="space-y-2">
                        <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Status Inicial</Label>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                          {initialStatusOptions.map((s) => {
                            const isSelected = watch("status") === s.key;
                            return (
                              <Button
                                key={s.id}
                                type="button"
                                variant={isSelected ? "default" : "outline"}
                                onClick={() => setValue("status", s.key)}
                                className={cn(
                                  "h-11 rounded-xl text-xs font-bold"
                                )}
                                style={isSelected && s.key === "confirmed" ? { backgroundColor: customizationData?.primaryColor } : {}}
                              >
                                {getStatusLabel(s.key)}
                              </Button>
                            );
                          })}
                        </div>
                      </div>

                      <div className="space-y-4">
                        <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Data e horário</Label>
                        {slotFields.map((field, index) => {
                          const slot = watch(`slots.${index}`);
                          const slotDate = slot?.date;
                          const slotTime = slot?.time;
                          const dateFromForm = slotDate ? (slotDate instanceof Date ? slotDate : new Date(slotDate)) : undefined;
                          const dateForCalendar = slotCalendarDates[index] ?? dateFromForm;
                          const dateForSlot = dateForCalendar || selectedDate;
                          const dateStrForSlot = dateForSlot ? toLocalDateString(dateForSlot) : '';
                          // Horários já escolhidos em slots ANTERIORES na MESMA data — calculado aqui a partir dos valores atuais do form (Dia 1 sempre considerado).
                          const timesTakenByPrevious: string[] = [];
                          for (let i = 0; i < index; i++) {
                            const s = slots[i] as { date?: Date | string; time?: string } | undefined;
                            if (!s?.date || !s?.time?.trim()) continue;
                            if (toLocalDateString(s.date).trim() === dateStrForSlot.trim()) {
                              timesTakenByPrevious.push(String(s.time).trim());
                            }
                          }
                          const availableForThisDate = getAvailableTimeSlotsForDate(dateForSlot, index, timesTakenByPrevious);
                          return (
                            <div key={field.id} className="rounded-2xl border border-border/50 bg-muted/10 p-4 space-y-3">
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-[10px] font-bold uppercase text-muted-foreground">Dia {index + 1}</span>
                                {slotFields.length > 1 && (
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                    onClick={() => removeSlot(index)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                )}
                              </div>
                              <div className="grid gap-4 sm:grid-cols-2">
                                <div className="space-y-1.5">
                                  <Label className="text-[10px] uppercase text-muted-foreground">Data</Label>
                                  <Popover>
                                    <PopoverTrigger asChild>
                                      <Button
                                        type="button"
                                        variant="outline"
                                        className="w-full justify-start text-left font-bold border-border/50 bg-background h-10 rounded-xl text-sm"
                                      >
                                        <CalendarIcon className="mr-2 h-4 w-4" style={{ color: customizationData?.primaryColor }} />
                                        {dateForCalendar ? format(dateForCalendar, "PPP", { locale: ptBR }) : "Escolher dia"}
                                      </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0 z-[100] rounded-2xl shadow-2xl border-0 overflow-hidden" align="start">
                                      <Calendar
                                        mode="single"
                                        selected={slotCalendarDates[index] ?? dateForCalendar}
                                        onSelect={(date) => {
                                          if (!date) return;
                                          setSlotCalendarDates(prev => ({ ...prev, [index]: date }));
                                          const currentTime = String(form.getValues(`slots.${index}.time`) ?? '').trim();
                                          form.setValue(`slots.${index}.date`, date, { shouldValidate: true, shouldDirty: true });
                                          form.setValue(`slots.${index}.time`, currentTime || '', { shouldValidate: true });
                                        }}
                                        locale={ptBR}
                                        className="pointer-events-auto"
                                      />
                                    </PopoverContent>
                                  </Popover>
                                </div>
                                <div className="space-y-1.5">
                                  <Label className="text-[10px] uppercase text-muted-foreground">Horário</Label>
                                  {availableForThisDate.length > 0 ? (
                                    <div className="grid grid-cols-4 gap-1.5 max-h-[120px] overflow-y-auto custom-scrollbar">
                                      {availableForThisDate.map(ts => {
                                        const isSelected = slotTime === ts.time;
                                        return (
                                          <button
                                            key={ts.id}
                                            type="button"
                                            onClick={() => {
                                              form.setValue(`slots.${index}.time`, ts.time, { shouldValidate: true });
                                            }}
                                            className={cn(
                                              "h-9 flex items-center justify-center rounded-lg text-xs font-bold transition-all",
                                              isSelected ? "bg-primary text-white" : "bg-muted/50 hover:bg-primary/10 text-muted-foreground hover:text-primary"
                                            )}
                                            style={isSelected ? { backgroundColor: customizationData?.primaryColor } : {}}
                                          >
                                            {ts.time}
                                          </button>
                                        );
                                      })}
                                    </div>
                                  ) : (
                                    <p className="text-xs text-muted-foreground py-2">Selecione a data para ver horários.</p>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}

                        {!isEditMode && (
                          <Button
                            type="button"
                            variant="outline"
                            className="w-full h-11 rounded-xl border-dashed font-bold text-xs uppercase tracking-wider gap-2"
                            style={{ borderColor: customizationData?.primaryColor, color: customizationData?.primaryColor }}
                            onClick={() => {
                              const patientId = watch('patientId');
                              const sessionsLiberated = getSessionsLiberated(patientId);
                              const currentSlots = form.getValues('slots')?.length ?? 0;

                              if (!patientId || sessionsLiberated <= 0) {
                                toast({
                                  title: "Sem sessões liberadas",
                                  description: "Este paciente não possui sessões liberadas pelo plano. Registre o pagamento do plano antes de adicionar mais dias.",
                                  variant: "destructive",
                                });
                                return;
                              }
                              if (currentSlots >= sessionsLiberated) {
                                toast({
                                  title: "Limite de sessões atingido",
                                  description: `Você possui ${sessionsLiberated} sessão(ões) liberada(s). Não é possível adicionar mais dias.`,
                                  variant: "destructive",
                                });
                                return;
                              }

                              const slotsAtual = form.getValues('slots') ?? [];
                              const last = slotsAtual[slotsAtual.length - 1];
                              appendSlot({
                                date: last?.date ? addDays(last.date instanceof Date ? last.date : new Date(last.date), 1) : selectedDate,
                                time: '',
                              });
                            }}
                          >
                            <Plus className="h-4 w-4" />
                            Próximo Dia
                          </Button>
                        )}
                        {form.formState.errors.slots && (
                          <p className="text-destructive text-xs font-bold">{form.formState.errors.slots.message}</p>
                        )}
                      </div>
                    </div>
                  )}

                  {currentStep === 5 && (
                    <div className="space-y-6 animate-in fade-in zoom-in-95 duration-400">
                      <div className="text-center space-y-1">
                        <h3 className="text-lg font-black tracking-tight">Tudo pronto?</h3>
                        <p className="text-sm text-muted-foreground">Confira os detalhes rápidos abaixo</p>
                      </div>

                      <div className="relative group">
                        <div className="absolute inset-0 bg-primary/5 rounded-3xl -rotate-1 group-hover:rotate-0 transition-transform" />
                        <Card className="relative border-2 border-border/50 rounded-3xl overflow-hidden shadow-none border-dashed bg-background">
                          <CardContent className="p-6 space-y-4">
                            <div className="flex items-center gap-4 border-b pb-4">
                              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center shrink-0">
                                <UserIcon className="w-6 h-6 text-primary" style={{ color: customizationData?.primaryColor }} />
                              </div>
                              <div className="min-w-0">
                                <p className="text-[10px] uppercase font-black text-muted-foreground tracking-widest">Paciente</p>
                                <p className="font-bold text-lg truncate">{watch('patient')}</p>
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-6">
                              <div className="space-y-1">
                                <p className="text-[10px] uppercase font-black text-muted-foreground tracking-widest">Procedimento</p>
                                <p className="font-bold text-sm">{watch('service')?.name}</p>
                              </div>
                              <div className="space-y-1">
                                <p className="text-[10px] uppercase font-black text-muted-foreground tracking-widest">Responsável</p>
                                <p className="font-bold text-sm">{watch('attendant')?.name}</p>
                              </div>
                            </div>
                            <div className="space-y-1">
                              <p className="text-[10px] uppercase font-black text-muted-foreground tracking-widest">Data(s) e horário(s)</p>
                              <ul className="space-y-1">
                                {(watch('slots') || []).map((slot: { date?: Date; time?: string }, i: number) => (
                                  <li key={i} className="flex items-center gap-2 font-bold text-sm">
                                    <span className="font-black text-primary" style={{ color: customizationData?.primaryColor }}>{slot.time}</span>
                                    <span className="text-muted-foreground">—</span>
                                    <span>{slot.date ? format(slot.date, "dd/MM/yyyy (EEEE)", { locale: ptBR }) : '-'}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>

                            {watch('notes') && (
                              <div className="pt-2 border-t mt-4">
                                <p className="text-[10px] uppercase font-black text-muted-foreground tracking-widest mb-1">Notas</p>
                                <p className="text-xs italic text-muted-foreground line-clamp-2">"{watch('notes')}"</p>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between gap-3 pt-4">
                    {currentStep > 1 ? (
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={handleBack}
                        className="h-12 px-6 rounded-xl font-bold uppercase text-[11px] tracking-widest hover:bg-muted"
                      >
                        Voltar
                      </Button>
                    ) : <div />}

                    <div className="flex gap-3">
                      {(currentStep === 1 || currentStep === 4) && (
                        <Button
                          type="button"
                          className="h-12 px-8 rounded-xl font-bold uppercase text-[11px] tracking-widest text-white shadow-lg transition-transform active:scale-95"
                          style={{ backgroundColor: customizationData?.primaryColor }}
                          onClick={handleNext}
                        >
                          Avançar
                        </Button>
                      )}

                      {currentStep === 5 && (
                        <Button
                          type="submit"
                          disabled={isSubmitting}
                          className="h-12 px-10 rounded-xl font-bold uppercase text-[11px] tracking-widest text-white shadow-xl shadow-primary/20 transition-all hover:scale-[1.02] active:scale-95"
                          style={{ backgroundColor: customizationData?.primaryColor }}
                        >
                          {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : (isEditMode ? 'Salvar Alterações' : 'Confirmar Agendamento')}
                        </Button>
                      )}
                    </div>
                  </div>
                </form>
              </Form>
            )}
          </div>
        </div>
      </DialogContent>
      <AddPatientModal
        open={isPatientModalOpen}
        onOpenChange={setIsPatientModalOpen}
        defaultName={form.watch('patient')?.trim() || undefined}
        onAddPatient={handleNewPatientSaved}
      />
    </Dialog>
  );
};