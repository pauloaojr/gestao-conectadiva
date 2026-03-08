import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CheckCircle, AlertCircle, XCircle, Clock, User, Briefcase, CircleDot } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useAppointmentStatusConfigContext } from "@/contexts/AppointmentStatusConfigContext";

export interface KanbanAppointment {
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

interface KanbanColumnProps {
  title: string;
  status: string;
  appointments: KanbanAppointment[];
  onStatusChange: (appointmentId: number | string, newStatus: string) => void;
  onEdit: (appointment: KanbanAppointment) => void;
  onDelete: (id: number | string) => void;
}

const statusConfig = {
  pending: {
    icon: AlertCircle,
    bgColor: "bg-amber-500/5 dark:bg-amber-500/10",
    borderColor: "border-amber-500/10 dark:border-amber-500/20",
    headerBg: "bg-amber-500/10 dark:bg-amber-500/20",
    iconColor: "text-amber-500",
    badgeClass: "bg-amber-500/20 text-amber-700 dark:text-amber-400",
    label: "Pendentes"
  },
  confirmed: {
    icon: CheckCircle,
    bgColor: "bg-emerald-500/5 dark:bg-emerald-500/10",
    borderColor: "border-emerald-500/10 dark:border-emerald-500/20",
    headerBg: "bg-emerald-500/10 dark:bg-emerald-500/20",
    iconColor: "text-emerald-500",
    badgeClass: "bg-emerald-500/20 text-emerald-700 dark:text-emerald-400",
    label: "Confirmados"
  },
  cancelled: {
    icon: XCircle,
    bgColor: "bg-rose-500/5 dark:bg-rose-500/10",
    borderColor: "border-rose-500/10 dark:border-rose-500/20",
    headerBg: "bg-rose-500/10 dark:bg-rose-500/20",
    iconColor: "text-rose-500",
    badgeClass: "bg-rose-500/20 text-rose-700 dark:text-rose-400",
    label: "Cancelados"
  },
  completed: {
    icon: CheckCircle,
    bgColor: "bg-blue-500/5 dark:bg-blue-500/10",
    borderColor: "border-blue-500/10 dark:border-blue-500/20",
    headerBg: "bg-blue-500/10 dark:bg-blue-500/20",
    iconColor: "text-blue-500",
    badgeClass: "bg-blue-500/20 text-blue-700 dark:text-blue-400",
    label: "Finalizados"
  }
};

const defaultColumnConfig = {
  icon: CircleDot,
  bgColor: "bg-muted/50 dark:bg-muted/30",
  borderColor: "border-border/50",
  headerBg: "bg-muted/50 dark:bg-muted/30",
  iconColor: "text-muted-foreground",
  badgeClass: "bg-muted text-muted-foreground",
  label: "",
};

export const KanbanColumn = ({
  title,
  status,
  appointments,
  onStatusChange,
  onEdit,
  onDelete
}: KanbanColumnProps) => {
  const config = (statusConfig as Record<string, typeof defaultColumnConfig>)[status] ?? defaultColumnConfig;
  const Icon = config.icon;

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.currentTarget.classList.add('ring-2', 'ring-primary');
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.currentTarget.classList.remove('ring-2', 'ring-primary');
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.currentTarget.classList.remove('ring-2', 'ring-primary');
    const appointmentId = e.dataTransfer.getData('appointmentId');
    if (appointmentId) {
      onStatusChange(appointmentId, status);
    }
  };

  return (
    <Card
      className={cn(
        "flex flex-col min-h-[400px] transition-all duration-300 border-none rounded-3xl overflow-hidden shadow-sm",
        config.bgColor,
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <CardHeader className={cn("pb-4 p-5", config.headerBg)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <Icon className={cn("w-4 h-4 sm:w-5 sm:h-5", config.iconColor)} />
            <CardTitle className="text-sm sm:text-base font-semibold">{title}</CardTitle>
          </div>
          <Badge variant="secondary" className={cn(config.badgeClass, "text-xs")}>
            {appointments.length}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="flex-1 p-3 pt-0 overflow-hidden">
        <ScrollArea className="h-[450px] pr-2">
          <div className="space-y-3 pt-4 pb-4 px-1">
            {appointments.length === 0 ? (
              <div className="text-center py-6 sm:py-8 text-muted-foreground text-xs sm:text-sm">
                Nenhum agendamento
              </div>
            ) : (
              appointments.map((appointment) => (
                <KanbanCard
                  key={appointment.id}
                  appointment={appointment}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  onStatusChange={onStatusChange}
                />
              ))
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

interface KanbanCardProps {
  appointment: KanbanAppointment;
  onEdit: (appointment: KanbanAppointment) => void;
  onDelete: (id: number | string) => void;
  onStatusChange: (appointmentId: number | string, newStatus: string) => void;
}

const quickActionClass: Record<string, string> = {
  pending: "bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20",
  confirmed: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20",
  completed: "bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-500/20",
  cancelled: "bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-500/20",
};

const KanbanCard = ({ appointment, onEdit, onDelete, onStatusChange }: KanbanCardProps) => {
  const { statuses: statusList, getLabel } = useAppointmentStatusConfigContext();
  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('appointmentId', appointment.id.toString());
    e.currentTarget.classList.add('opacity-50');
  };

  const handleDragEnd = (e: React.DragEvent) => {
    e.currentTarget.classList.remove('opacity-50');
  };

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      className={cn(
        "bg-card border rounded-lg p-2 sm:p-3 shadow-sm cursor-grab active:cursor-grabbing",
        "hover:shadow-md transition-all",
        "group"
      )}
    >
      {/* Header with time */}
      <div className="flex items-center justify-between mb-1.5 sm:mb-2">
        <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm font-semibold text-foreground">
          <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-muted-foreground" />
          {appointment.time}
        </div>
        <span className="text-[10px] sm:text-xs text-muted-foreground">
          {format(appointment.date, "dd/MM", { locale: ptBR })}
        </span>
      </div>

      {/* Patient name */}
      <div className="flex items-center gap-1.5 sm:gap-2 mb-1.5 sm:mb-2">
        <User className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-muted-foreground flex-shrink-0" />
        <span className="text-xs sm:text-sm font-medium text-foreground truncate">
          {appointment.patient}
        </span>
      </div>

      {/* Service */}
      {appointment.serviceName && (
        <div className="flex items-center gap-1.5 sm:gap-2 mb-1.5 sm:mb-2">
          <Briefcase className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-muted-foreground flex-shrink-0" />
          <span className="text-[10px] sm:text-xs text-muted-foreground truncate">
            {appointment.serviceName}
          </span>
        </div>
      )}

      {/* Attendant */}
      {appointment.attendantName && (
        <div className="text-[10px] sm:text-xs text-muted-foreground mb-1.5 sm:mb-2 truncate">
          Atendente: {appointment.attendantName}
        </div>
      )}

      {/* Quick Actions - Always visible on mobile, hover on desktop */}
      <div className="flex flex-wrap gap-1.5 mt-4 pt-3 border-t border-border/40 opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-300">
        {statusList
          .filter((s) => s.key !== appointment.status)
          .map((s) => (
            <button
              key={s.id}
              onClick={(e) => {
                e.stopPropagation();
                onStatusChange(appointment.id, s.key);
              }}
              className={cn(
                "flex-1 min-w-[50px] text-[10px] font-bold px-2 py-1.5 rounded-lg transition-colors",
                quickActionClass[s.key] ?? "bg-muted text-muted-foreground hover:bg-muted/80"
              )}
            >
              {getLabel(s.key)}
            </button>
          ))}
      </div>

      {/* Edit/Delete - Always visible on mobile, hover on desktop */}
      <div className="flex gap-1 mt-1.5 sm:mt-2 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onEdit(appointment);
          }}
          className="flex-1 text-[10px] sm:text-xs px-1.5 sm:px-2 py-1 rounded bg-muted text-muted-foreground hover:bg-muted/80 transition-colors"
        >
          Editar
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(appointment.id);
          }}
          className="flex-1 text-[10px] sm:text-xs px-1.5 sm:px-2 py-1 rounded bg-muted text-destructive hover:bg-destructive/10 transition-colors"
        >
          Excluir
        </button>
      </div>
    </div>
  );
};

export default KanbanColumn;
