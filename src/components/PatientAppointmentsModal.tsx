import { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAppointmentStatusConfig } from "@/hooks/useAppointmentStatusConfig";
import type { Appointment } from "@/hooks/useAppointments";
import { Calendar, CalendarDays } from "lucide-react";

const MONTH_NAMES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

interface PatientAppointmentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  patientId: string;
  patientName: string;
  appointments: Appointment[];
}

function getCurrentMonth(): number {
  return new Date().getMonth() + 1;
}

function getCurrentYear(): number {
  return new Date().getFullYear();
}

export function PatientAppointmentsModal({
  isOpen,
  onClose,
  patientId,
  patientName,
  appointments,
}: PatientAppointmentsModalProps) {
  const navigate = useNavigate();
  const { statuses: statusConfig } = useAppointmentStatusConfig();
  const [selectedMonth, setSelectedMonth] = useState<number>(getCurrentMonth());
  const [selectedYear, setSelectedYear] = useState<number>(getCurrentYear());

  useEffect(() => {
    if (isOpen) {
      setSelectedMonth(getCurrentMonth());
      setSelectedYear(getCurrentYear());
    }
  }, [isOpen]);

  const patientAppointments = useMemo(
    () => appointments.filter((a) => a.patient_id === patientId),
    [appointments, patientId]
  );

  const targetYearMonth = useMemo(
    () => `${selectedYear}-${String(selectedMonth).padStart(2, "0")}`,
    [selectedYear, selectedMonth]
  );

  const filteredByMonth = useMemo(
    () =>
      patientAppointments.filter((a) => {
        if (!a.appointment_date) return false;
        return a.appointment_date.slice(0, 7) === targetYearMonth;
      }),
    [patientAppointments, targetYearMonth]
  );

  const yearOptions = useMemo(() => {
    const current = getCurrentYear();
    const years: number[] = [];
    for (let y = current - 2; y <= current + 1; y++) years.push(y);
    return years.sort((a, b) => b - a);
  }, []);

  const getStatusLabel = (key: string) => {
    const item = statusConfig.find((s) => s.key === key);
    return item?.label ?? key;
  };

  const handleOpenInSchedule = () => {
    onClose();
    navigate(`/agenda?patient=${encodeURIComponent(patientName)}`);
  };

  const sortedAppointments = useMemo(
    () =>
      [...filteredByMonth].sort((a, b) => {
        const d = a.appointment_date.localeCompare(b.appointment_date);
        if (d !== 0) return d;
        return (a.appointment_time || "").localeCompare(b.appointment_time || "");
      }),
    [filteredByMonth]
  );

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[520px] max-h-[85vh] flex flex-col gap-0 p-0">
        <DialogHeader className="p-6 pb-4">
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            Agendamentos — {patientName}
          </DialogTitle>
          <DialogDescription className="sr-only">
            Resumo de agendamentos do paciente. Filtre por mês e ano.
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 pb-4">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2 rounded-lg border bg-muted/20 px-3 py-1.5">
              <span className="text-xs font-medium text-muted-foreground shrink-0">Mês</span>
              <Select
                value={String(selectedMonth)}
                onValueChange={(v) => setSelectedMonth(Number(v))}
              >
                <SelectTrigger className="h-8 w-[110px] rounded-md border bg-background text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MONTH_NAMES.map((name, i) => (
                    <SelectItem key={i} value={String(i + 1)}>
                      {name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2 rounded-lg border bg-muted/20 px-3 py-1.5">
              <span className="text-xs font-medium text-muted-foreground shrink-0">Ano</span>
              <Select
                value={String(selectedYear)}
                onValueChange={(v) => setSelectedYear(Number(v))}
              >
                <SelectTrigger className="h-8 w-[72px] rounded-md border bg-background text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {yearOptions.map((y) => (
                    <SelectItem key={y} value={String(y)}>
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto border-t px-6 py-4">
          {sortedAppointments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <CalendarDays className="h-12 w-12 text-muted-foreground/50 mb-3" />
              <p className="text-sm font-medium text-foreground">
                Nenhum agendamento no período
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Nenhum agendamento em {MONTH_NAMES[selectedMonth - 1]} de {selectedYear}.
              </p>
            </div>
          ) : (
            <ul className="space-y-2">
              {sortedAppointments.map((apt) => {
                let dateLabel = apt.appointment_date;
                try {
                  dateLabel = format(parseISO(apt.appointment_date), "dd/MM/yyyy", {
                    locale: ptBR,
                  });
                } catch {
                  /* keep raw */
                }
                return (
                  <li
                    key={apt.id}
                    className="flex items-center justify-between gap-3 rounded-lg border bg-muted/30 px-4 py-3"
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-foreground">
                        {dateLabel} — {apt.appointment_time || "—"}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {apt.service_name || "Serviço não informado"}
                        {apt.attendant_name ? ` • ${apt.attendant_name}` : ""}
                      </p>
                    </div>
                    <span className="shrink-0 text-xs font-medium px-2 py-1 rounded-md bg-primary/10 text-primary">
                      {getStatusLabel(apt.status)}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <DialogFooter className="p-6 pt-4 border-t">
          <Button type="button" variant="outline" onClick={onClose}>
            Fechar
          </Button>
          <Button type="button" onClick={handleOpenInSchedule}>
            <Calendar className="h-4 w-4 mr-2" />
            Ver na Agenda
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
