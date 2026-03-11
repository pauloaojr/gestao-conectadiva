import { useMemo } from "react";
import { KanbanColumn, KanbanAppointment } from "./KanbanColumn";
import type { AppointmentStatusConfigItem } from "@/hooks/useAppointmentStatusConfig";

interface KanbanBoardProps {
  statuses: AppointmentStatusConfigItem[];
  appointments: KanbanAppointment[];
  onStatusChange: (appointmentId: number | string, newStatus: string) => void;
  onEdit: (appointment: KanbanAppointment) => void;
  onDelete: (id: number | string) => void;
  canUpdateStatus?: boolean;
  canFullEdit?: boolean;
  canDelete?: boolean;
}

export const KanbanBoard = ({
  statuses,
  appointments,
  onStatusChange,
  onEdit,
  onDelete,
  canUpdateStatus = true,
  canFullEdit = true,
  canDelete = true,
}: KanbanBoardProps) => {
  const appointmentsByStatus = useMemo(() => {
    const map: Record<string, KanbanAppointment[]> = {};
    for (const s of statuses) {
      map[s.key] = appointments
        .filter(apt => apt.status === s.key)
        .sort((a, b) => a.time.localeCompare(b.time));
    }
    return map;
  }, [statuses, appointments]);

  return (
    <div className="overflow-x-auto">
      <div
        className="grid gap-3 md:gap-4 min-h-[400px] md:min-h-[500px] min-w-0"
        style={{
          gridTemplateColumns: `repeat(${statuses.length}, minmax(160px, 1fr))`,
        }}
      >
      {statuses.map((s) => (
        <KanbanColumn
          key={s.id}
          title={s.label}
          status={s.key}
          appointments={appointmentsByStatus[s.key] ?? []}
          onStatusChange={onStatusChange}
          onEdit={onEdit}
          onDelete={onDelete}
          canUpdateStatus={canUpdateStatus}
          canFullEdit={canFullEdit}
          canDelete={canDelete}
        />
      ))}
      </div>
    </div>
  );
};

export default KanbanBoard;
