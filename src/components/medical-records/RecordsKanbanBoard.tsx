import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import {
  PlayCircle,
  Activity,
  CheckCircle,
  PauseCircle,
  FileText,
  Calendar,
  User
} from "lucide-react";
import { cn } from "@/lib/utils";

interface MedicalRecordDisplay {
  id: string;
  patientName: string;
  patientId: string;
  lastUpdate: string;
  diagnosis: string;
  sessions: number;
  status: string;
  notes: string;
  nextAppointment: string;
  createdDate: string;
}

interface RecordsKanbanBoardProps {
  records: MedicalRecordDisplay[];
  onStatusChange: (recordId: string, newStatus: string) => void;
  onView: (record: MedicalRecordDisplay) => void;
  onEdit: (record: MedicalRecordDisplay) => void;
}

const statusConfig = {
  'Iniciando': {
    icon: PlayCircle,
    bgColor: "bg-emerald-500/5 dark:bg-emerald-500/10",
    borderColor: "border-emerald-500/10 dark:border-emerald-500/20",
    headerBg: "bg-emerald-500/10 dark:bg-emerald-500/20",
    iconColor: "text-emerald-500",
    badgeClass: "bg-emerald-500/20 text-emerald-700 dark:text-emerald-400",
    dbStatus: 'starting'
  },
  'Em Tratamento': {
    icon: Activity,
    bgColor: "bg-blue-500/5 dark:bg-blue-500/10",
    borderColor: "border-blue-500/10 dark:border-blue-500/20",
    headerBg: "bg-blue-500/10 dark:bg-blue-500/20",
    iconColor: "text-blue-500",
    badgeClass: "bg-blue-500/20 text-blue-700 dark:text-blue-400",
    dbStatus: 'in_treatment'
  },
  'Concluído': {
    icon: CheckCircle,
    bgColor: "bg-slate-500/5 dark:bg-slate-500/10",
    borderColor: "border-slate-500/10 dark:border-slate-500/20",
    headerBg: "bg-slate-500/10 dark:bg-slate-500/20",
    iconColor: "text-slate-500",
    badgeClass: "bg-slate-500/20 text-slate-700 dark:text-slate-400",
    dbStatus: 'completed'
  },
  'Pausado': {
    icon: PauseCircle,
    bgColor: "bg-amber-500/5 dark:bg-amber-500/10",
    borderColor: "border-amber-500/10 dark:border-amber-500/20",
    headerBg: "bg-amber-500/10 dark:bg-amber-500/20",
    iconColor: "text-amber-500",
    badgeClass: "bg-amber-500/20 text-amber-700 dark:text-amber-400",
    dbStatus: 'paused'
  }
};

type StatusKey = keyof typeof statusConfig;

export const RecordsKanbanBoard = ({
  records,
  onStatusChange,
  onView,
  onEdit
}: RecordsKanbanBoardProps) => {
  const groupedRecords = useMemo(() => {
    const groups: Record<StatusKey, MedicalRecordDisplay[]> = {
      'Iniciando': [],
      'Em Tratamento': [],
      'Concluído': [],
      'Pausado': []
    };

    records.forEach(record => {
      const status = record.status as StatusKey;
      if (groups[status]) {
        groups[status].push(record);
      }
    });

    return groups;
  }, [records]);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 min-h-[400px] md:min-h-[500px]">
      {(Object.keys(statusConfig) as StatusKey[]).map((status) => (
        <RecordsKanbanColumn
          key={status}
          title={status}
          status={status}
          records={groupedRecords[status]}
          onStatusChange={onStatusChange}
          onView={onView}
          onEdit={onEdit}
        />
      ))}
    </div>
  );
};

interface RecordsKanbanColumnProps {
  title: string;
  status: StatusKey;
  records: MedicalRecordDisplay[];
  onStatusChange: (recordId: string, newStatus: string) => void;
  onView: (record: MedicalRecordDisplay) => void;
  onEdit: (record: MedicalRecordDisplay) => void;
}

const RecordsKanbanColumn = ({
  title,
  status,
  records,
  onStatusChange,
  onView,
  onEdit
}: RecordsKanbanColumnProps) => {
  const config = statusConfig[status];
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
    const recordId = e.dataTransfer.getData('recordId');
    if (recordId) {
      onStatusChange(recordId, status);
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
            {records.length}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="flex-1 p-3 pt-0 overflow-hidden">
        <ScrollArea className="h-[450px] pr-2">
          <div className="space-y-3 pt-4 pb-4 px-1">
            {records.length === 0 ? (
              <div className="text-center py-6 sm:py-8 text-muted-foreground text-xs sm:text-sm">
                Nenhum prontuário
              </div>
            ) : (
              records.map((record) => (
                <RecordsKanbanCard
                  key={record.id}
                  record={record}
                  currentStatus={status}
                  onStatusChange={onStatusChange}
                  onView={onView}
                  onEdit={onEdit}
                />
              ))
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

interface RecordsKanbanCardProps {
  record: MedicalRecordDisplay;
  currentStatus: StatusKey;
  onStatusChange: (recordId: string, newStatus: string) => void;
  onView: (record: MedicalRecordDisplay) => void;
  onEdit: (record: MedicalRecordDisplay) => void;
}

const RecordsKanbanCard = ({
  record,
  currentStatus,
  onStatusChange,
  onView,
  onEdit
}: RecordsKanbanCardProps) => {
  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('recordId', record.id);
    e.currentTarget.classList.add('opacity-50');
  };

  const handleDragEnd = (e: React.DragEvent) => {
    e.currentTarget.classList.remove('opacity-50');
  };

  const availableStatuses = (Object.keys(statusConfig) as StatusKey[]).filter(
    s => s !== currentStatus
  );

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
      {/* Header with patient name */}
      <div className="flex items-center gap-1.5 sm:gap-2 mb-1.5 sm:mb-2">
        <FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-muted-foreground flex-shrink-0" />
        <span className="text-xs sm:text-sm font-semibold text-foreground truncate">
          {record.patientName}
        </span>
      </div>

      {/* Diagnosis */}
      <div className="text-[10px] sm:text-xs text-muted-foreground mb-1.5 sm:mb-2 line-clamp-2">
        {record.diagnosis}
      </div>

      {/* Sessions */}
      <div className="flex items-center gap-1.5 sm:gap-2 mb-1.5 sm:mb-2">
        <User className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-muted-foreground flex-shrink-0" />
        <span className="text-[10px] sm:text-xs text-muted-foreground">
          {record.sessions} sessões
        </span>
      </div>

      {/* Next appointment */}
      {record.nextAppointment !== "A definir" && (
        <div className="flex items-center gap-1.5 sm:gap-2 mb-1.5 sm:mb-2">
          <Calendar className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-muted-foreground flex-shrink-0" />
          <span className="text-[10px] sm:text-xs text-muted-foreground truncate">
            {record.nextAppointment}
          </span>
        </div>
      )}

      {/* Quick Status Actions - Always visible on mobile, hover on desktop */}
      <div className="flex flex-wrap gap-1.5 mt-4 pt-3 border-t border-border/40 opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-300">
        {availableStatuses.map((newStatus) => {
          const config = statusConfig[newStatus];
          return (
            <button
              key={newStatus}
              onClick={(e) => {
                e.stopPropagation();
                onStatusChange(record.id, newStatus);
              }}
              className={cn(
                "flex-1 min-w-[50px] text-[10px] font-bold px-2 py-1.5 rounded-lg transition-colors bg-background/50 backdrop-blur-sm",
                config.iconColor,
                "hover:bg-background/80"
              )}
            >
              {newStatus === 'Em Tratamento' ? 'Tratar' :
                newStatus === 'Concluído' ? 'Concluir' :
                  newStatus === 'Pausado' ? 'Pausar' : 'Iniciar'}
            </button>
          );
        })}
      </div>

      {/* View/Edit Actions */}
      <div className="flex gap-1 mt-1.5 sm:mt-2 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
        <Button
          size="sm"
          variant="outline"
          onClick={(e) => {
            e.stopPropagation();
            onView(record);
          }}
          className="flex-1 text-[10px] sm:text-xs h-7 sm:h-8"
        >
          Ver
        </Button>
        <Button
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            onEdit(record);
          }}
          className="flex-1 text-[10px] sm:text-xs h-7 sm:h-8 clinic-gradient text-white"
        >
          Editar
        </Button>
      </div>
    </div>
  );
};

export default RecordsKanbanBoard;
