import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Appointment } from "@/pages/Schedule";
import { useAppointmentStatusConfigContext } from "@/contexts/AppointmentStatusConfigContext";
import { cn } from "@/lib/utils";

const statusButtonClass: Record<string, string> = {
  pending: "bg-amber-500/10 text-amber-700 hover:bg-amber-500/20 border-amber-500/20",
  confirmed: "bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/20 border-emerald-500/20",
  completed: "bg-blue-500/10 text-blue-700 hover:bg-blue-500/20 border-blue-500/20",
};

interface StatusUpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
  appointment: Appointment | null;
  onUpdateStatus: (id: number | string, status: string) => void;
}

export const StatusUpdateModal = ({
  isOpen,
  onClose,
  appointment,
  onUpdateStatus
}: StatusUpdateModalProps) => {
  const { statuses, getLabel } = useAppointmentStatusConfigContext();

  if (!appointment) return null;

  const handleStatus = (status: string) => {
    onUpdateStatus(appointment.id, status);
    onClose();
  };

  const statusesWithoutCancelled = statuses.filter((s) => s.key !== "cancelled");

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Alterar Status da Consulta</DialogTitle>
          <DialogDescription>
            Atualize o status da consulta para <strong>{appointment.patient}</strong>.
          </DialogDescription>
        </DialogHeader>

        <p className="text-sm text-muted-foreground">
          A consulta está marcada para <strong>{appointment.time}</strong>. Selecione uma das opções abaixo.
        </p>

        <div className="flex flex-col gap-2 pt-4">
          <div className="flex flex-wrap gap-2">
            {statusesWithoutCancelled.map((s) => (
              <Button
                key={s.id}
                type="button"
                variant="outline"
                onClick={() => handleStatus(s.key)}
                className={cn("border", statusButtonClass[s.key] ?? "bg-muted/50 hover:bg-muted")}
              >
                {getLabel(s.key)}
              </Button>
            ))}
          </div>
          <Button
            type="button"
            variant="destructive"
            onClick={() => handleStatus("cancelled")}
            className="mt-2"
          >
            Cancelar Consulta
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
