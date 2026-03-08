import { Clock, User, Edit, Trash2, Printer, MoreVertical, Briefcase, Activity } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useIsMobile } from "@/hooks/use-mobile";
import { useCustomizationContext } from "@/contexts/CustomizationContext";
import { useAppointmentStatusConfigContext } from "@/contexts/AppointmentStatusConfigContext";
import { printHtmlDocument } from "@/lib/print";

interface Appointment {
  id: number | string;
  time: string;
  patient: string;
  type: string;
  duration: number;
  status: string;
  date: Date;
  notes?: string;
  attendantName?: string;
  serviceName?: string;
}

interface AppointmentCardProps {
  appointment: Appointment;
  onEdit: (appointment: Appointment) => void;
  onDelete: (id: number | string) => void;
  onStatusChange: (appointment: Appointment) => void;
}

const statusBadgeClass: Record<string, string> = {
  confirmed: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 shadow-none border-emerald-500/20",
  pending: "bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 shadow-none border-amber-500/20",
  cancelled: "bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-500/20 shadow-none border-rose-500/20",
  completed: "bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-500/20 shadow-none border-blue-500/20",
};

export const AppointmentCard = ({ appointment, onEdit, onDelete, onStatusChange }: AppointmentCardProps) => {
  const isMobile = useIsMobile();
  const { customizationData } = useCustomizationContext();
  const { getLabel } = useAppointmentStatusConfigContext();

  const getStatusBadge = (status: string) => {
    const label = getLabel(status);
    const className = statusBadgeClass[status] ?? "bg-muted text-muted-foreground shadow-none border-border/50";
    return <Badge className={className}>{label}</Badge>;
  };

  const handlePrintAppointment = () => {
    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Consulta - ${appointment.patient}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 15px; }
          .header img { max-height: 60px; max-width: 200px; margin-bottom: 10px; }
          .clinic-name { font-size: 20px; font-weight: bold; color: #333; margin-bottom: 4px; }
          .clinic-subtitle { font-size: 12px; color: #666; margin-bottom: 8px; }
          .title { font-size: 18px; font-weight: bold; color: #1a1a1a; margin-top: 10px; }
          .subtitle { font-size: 14px; color: #666; margin-top: 5px; }
          .appointment-card { border: 2px solid #ddd; margin: 20px 0; padding: 20px; border-radius: 8px; background-color: #f9f9f9; }
          .appointment-time { font-size: 20px; font-weight: bold; color: #333; margin-bottom: 10px; }
          .appointment-patient { font-size: 18px; margin: 10px 0; font-weight: bold; }
          .appointment-type { font-size: 16px; color: #666; margin: 8px 0; }
          .appointment-duration { font-size: 14px; color: #888; margin: 8px 0; }
          .appointment-notes { font-style: italic; color: #666; margin-top: 15px; background-color: #f0f0f0; padding: 10px; border-radius: 4px; }
          .status-confirmed { background-color: #dcfce7; color: #166534; }
          .status-pending { background-color: #fef3c7; color: #92400e; }
          .status-cancelled { background-color: #fee2e2; color: #991b1b; }
          .status-completed { background-color: #dbeafe; color: #1e40af; }
          .status-badge { padding: 5px 12px; border-radius: 15px; font-size: 12px; font-weight: bold; display: inline-block; margin: 10px 0; }
          .footer { margin-top: 30px; text-align: center; font-size: 12px; color: #888; border-top: 1px solid #eee; padding-top: 15px; }
          .info-row { margin: 8px 0; }
          .label { font-weight: bold; color: #333; }
        </style>
      </head>
      <body>
        <div class="header">
          ${customizationData.logoUrl ? `<img src="${customizationData.logoUrl}" alt="Logo" />` : ''}
          <div class="clinic-name">${customizationData.appName || 'Clínica Médica'}</div>
          <div class="clinic-subtitle">${customizationData.appSubtitle || 'Sistema de Gestão Médica'}</div>
          <div class="title">Detalhes da Consulta</div>
          <div class="subtitle">${format(appointment.date, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}</div>
        </div>
        
        <div class="appointment-card">
          <div class="appointment-time">📅 ${appointment.time}</div>
          
          <div class="info-row">
            <span class="label">Paciente:</span> ${appointment.patient}
          </div>
          
          ${appointment.serviceName ? `
            <div class="info-row">
              <span class="label">Serviço:</span> ${appointment.serviceName}
            </div>
          ` : ''}
          
          ${appointment.attendantName ? `
            <div class="info-row">
              <span class="label">Atendente:</span> ${appointment.attendantName}
            </div>
          ` : ''}
          
          <div class="info-row">
            <span class="label">Status:</span> 
            <span class="status-badge status-${appointment.status}">
              ${getLabel(appointment.status)}
            </span>
          </div>
          
          ${appointment.notes ? `
            <div class="appointment-notes">
              <div class="label">Observações:</div>
              "${appointment.notes}"
            </div>
          ` : ''}
        </div>

        <div class="footer">
          Consulta impressa em ${format(new Date(), "dd/MM/yyyy 'às' HH:mm")}
        </div>
      </body>
      </html>
    `;

    printHtmlDocument({
      html: printContent,
      onPopupBlocked: () =>
        alert("Por favor, permita pop-ups para imprimir a consulta."),
    });
  };

  return (
    <Card className="hover:shadow-md transition-all duration-300 border-border/40 bg-card/50 backdrop-blur-sm rounded-2xl group overflow-hidden">
      <CardContent className="p-4 md:p-5 relative">
        <div className="flex items-start justify-between relative z-10">
          <div className="flex items-start gap-4 flex-1">
            <div className="p-2.5 rounded-xl bg-primary/10 dark:bg-primary/20 shrink-0">
              <Clock className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-3 mb-2">
                <span className="text-lg font-black text-foreground tracking-tight">{appointment.time}</span>
                <div onClick={() => onStatusChange(appointment)} className="cursor-pointer transition-transform active:scale-95">
                  {getStatusBadge(appointment.status)}
                </div>
              </div>
              <div className="flex items-center gap-2 mb-2">
                <User className="w-4 h-4 text-muted-foreground" />
                <span className="text-base font-bold text-foreground truncate tracking-tight">{appointment.patient}</span>
              </div>
              {appointment.notes && (
                <p className="text-sm text-muted-foreground mt-2 italic font-medium leading-relaxed bg-muted/30 p-2 rounded-lg border-l-2 border-primary/30">
                  "{appointment.notes}"
                </p>
              )}
            </div>
          </div>

          {/* Desktop Actions */}
          {!isMobile && (
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 translate-x-4 group-hover:translate-x-0 transition-all duration-300">
              <Button
                variant="ghost"
                size="sm"
                className="w-9 h-9 p-0 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-full"
                onClick={() => onEdit(appointment)}
              >
                <Edit className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="w-9 h-9 p-0 text-muted-foreground hover:text-emerald-500 hover:bg-emerald-500/10 rounded-full"
                onClick={handlePrintAppointment}
              >
                <Printer className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="w-9 h-9 p-0 text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 rounded-full"
                onClick={() => onDelete(appointment.id)}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          )}

          {/* Mobile Actions - Dropdown Menu */}
          {isMobile && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground hover:text-foreground p-1"
                >
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 rounded-xl border-border/50">
                <DropdownMenuItem onClick={() => onEdit(appointment)} className="font-medium">
                  <Edit className="w-4 h-4 mr-2 text-primary" />
                  Editar
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handlePrintAppointment} className="font-medium">
                  <Printer className="w-4 h-4 mr-2 text-emerald-500" />
                  Imprimir
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => onStatusChange(appointment)}
                  className="sm:hidden font-medium"
                >
                  <Activity className="w-4 h-4 mr-2 text-amber-500" />
                  Alterar Status
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => onDelete(appointment.id)}
                  className="text-rose-500 hover:text-rose-600 font-bold"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Excluir
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
        {(appointment.attendantName || appointment.serviceName) && (
          <div className="mt-4 pt-4 border-t border-border/40 flex flex-wrap gap-y-2 gap-x-6 text-[11px] font-bold text-muted-foreground uppercase tracking-widest">
            {appointment.attendantName && (
              <div className="flex items-center gap-1.5 hover:text-primary transition-colors cursor-default">
                <User className="w-3.5 h-3.5" />
                <span>{appointment.attendantName}</span>
              </div>
            )}
            {appointment.serviceName && (
              <div className="flex items-center gap-1.5 hover:text-primary transition-colors cursor-default">
                <Briefcase className="w-3.5 h-3.5" />
                <span>{appointment.serviceName}</span>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
