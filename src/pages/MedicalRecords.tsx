import { useState, useMemo } from "react";
import { Search, Plus, FileText, Calendar, User, Activity, Clock, Loader2, LayoutGrid, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { CreateRecordModal } from "@/components/CreateRecordModal";
import { ViewRecordModal } from "@/components/ViewRecordModal";
import EditRecordModal from "@/components/EditRecordModal";
import { RecordFilters } from "@/components/RecordFilters";
import { RecordsKanbanBoard } from "@/components/medical-records/RecordsKanbanBoard";
import { useIsMobile } from "@/hooks/use-mobile";
import { useMedicalRecords, MedicalRecord } from "@/hooks/useMedicalRecords";

// Interface for UI display (mapped from database)
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

const MedicalRecords = () => {
  const isMobile = useIsMobile();
  const { medicalRecords, isLoading, addMedicalRecord, updateMedicalRecord, deleteMedicalRecord, fetchMedicalRecords } = useMedicalRecords();
  
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<MedicalRecordDisplay | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [activeCurrentPage, setActiveCurrentPage] = useState(1);
  const [recentPeriod, setRecentPeriod] = useState("7");
  const [filters, setFilters] = useState({
    status: [] as string[],
    dateRange: "",
  });

  const recordsPerPage = 4;

  // Map database status to display status
  const mapStatusToDisplay = (status: MedicalRecord['status']): string => {
    const statusMap: Record<string, string> = {
      'starting': 'Iniciando',
      'in_treatment': 'Em Tratamento',
      'completed': 'Concluído',
      'paused': 'Pausado'
    };
    return statusMap[status] || status;
  };

  // Map display status to database status
  const mapDisplayToStatus = (displayStatus: string): MedicalRecord['status'] => {
    const statusMap: Record<string, MedicalRecord['status']> = {
      'Iniciando': 'starting',
      'Em Tratamento': 'in_treatment',
      'Concluído': 'completed',
      'Pausado': 'paused'
    };
    return statusMap[displayStatus] || 'starting';
  };

  // Format date for display
  const formatDate = (dateString: string | null): string => {
    if (!dateString) return "A definir";
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR');
  };

  // Transform database records to display format
  const displayRecords: MedicalRecordDisplay[] = useMemo(() => {
    return medicalRecords.map(record => ({
      id: record.id,
      patientName: record.patient?.name || 'Paciente não encontrado',
      patientId: record.patient_id,
      lastUpdate: formatDate(record.updated_at),
      diagnosis: record.diagnosis,
      sessions: record.sessions,
      status: mapStatusToDisplay(record.status),
      notes: record.notes || '',
      nextAppointment: formatDate(record.next_appointment),
      createdDate: record.created_at.split('T')[0]
    }));
  }, [medicalRecords]);

  // Sort records by most recent first
  const sortedRecords = useMemo(() => {
    return [...displayRecords].sort((a, b) => 
      new Date(b.createdDate).getTime() - new Date(a.createdDate).getTime()
    );
  }, [displayRecords]);

  const filteredRecords = useMemo(() => {
    return sortedRecords.filter(record => {
      const matchesSearch = record.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           record.diagnosis.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = filters.status.length === 0 || filters.status.includes(record.status);
      
      return matchesSearch && matchesStatus;
    });
  }, [sortedRecords, searchTerm, filters.status]);

  // Filter recent records based on selected period
  const recentRecords = useMemo(() => {
    const now = new Date();
    const periodDays = parseInt(recentPeriod);
    const cutoffDate = new Date(now.getTime() - (periodDays * 24 * 60 * 60 * 1000));
    
    return sortedRecords.filter(record => {
      const recordDate = new Date(record.createdDate);
      return recordDate >= cutoffDate;
    });
  }, [sortedRecords, recentPeriod]);

  // Pagination logic for "All" tab
  const totalPages = Math.ceil(filteredRecords.length / recordsPerPage);
  const startIndex = (currentPage - 1) * recordsPerPage;
  const endIndex = startIndex + recordsPerPage;
  const currentRecords = filteredRecords.slice(startIndex, endIndex);

  // Pagination logic for "Active/Em Tratamento" tab
  const activeRecords = useMemo(() => {
    return filteredRecords.filter(r => r.status === 'Em Tratamento');
  }, [filteredRecords]);
  const activeTotalPages = Math.ceil(activeRecords.length / recordsPerPage);
  const activeStartIndex = (activeCurrentPage - 1) * recordsPerPage;
  const activeEndIndex = activeStartIndex + recordsPerPage;
  const currentActiveRecords = activeRecords.slice(activeStartIndex, activeEndIndex);

  // Recent records pagination
  const recentTotalPages = Math.ceil(recentRecords.length / recordsPerPage);
  const recentStartIndex = (currentPage - 1) * recordsPerPage;
  const recentEndIndex = recentStartIndex + recordsPerPage;
  const currentRecentRecords = recentRecords.slice(recentStartIndex, recentEndIndex);

  const handleCreateRecord = async (newRecord: any) => {
    try {
      await addMedicalRecord({
        patient_id: newRecord.patientId,
        diagnosis: newRecord.diagnosis,
        notes: newRecord.notes || null,
        status: mapDisplayToStatus(newRecord.status || 'Iniciando'),
        sessions: 0,
        next_appointment: newRecord.nextAppointment || null,
        created_by: null
      });
    } catch (error) {
      console.error('Error creating record:', error);
    }
  };

  // Convert DD/MM/YYYY to YYYY-MM-DD for database
  const convertDisplayDateToDb = (dateStr: string): string | null => {
    if (!dateStr || dateStr === 'A definir' || dateStr === '-') return null;
    // If already in YYYY-MM-DD format
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
    // Convert from DD/MM/YYYY to YYYY-MM-DD
    const parts = dateStr.split('/');
    if (parts.length === 3) {
      return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
    return null;
  };

  const handleUpdateRecord = async (updatedRecord: MedicalRecordDisplay) => {
    try {
      await updateMedicalRecord(updatedRecord.id, {
        diagnosis: updatedRecord.diagnosis,
        notes: updatedRecord.notes || null,
        status: mapDisplayToStatus(updatedRecord.status),
        sessions: updatedRecord.sessions,
        next_appointment: convertDisplayDateToDb(updatedRecord.nextAppointment)
      });
    } catch (error) {
      console.error('Error updating record:', error);
    }
  };

  const handleKanbanStatusChange = async (recordId: string, newStatus: string) => {
    try {
      await updateMedicalRecord(recordId, {
        status: mapDisplayToStatus(newStatus)
      });
    } catch (error) {
      console.error('Error updating record status:', error);
    }
  };

  const handleViewRecord = (record: MedicalRecordDisplay) => {
    setSelectedRecord(record);
    setIsViewModalOpen(true);
  };

  const handleEditRecord = (record: MedicalRecordDisplay) => {
    setSelectedRecord(record);
    setIsEditModalOpen(true);
  };

  const handleEditFromView = () => {
    setIsViewModalOpen(false);
    setIsEditModalOpen(true);
  };

  const handleDeleteRecord = async (recordId: string) => {
    try {
      await deleteMedicalRecord(recordId);
      setIsViewModalOpen(false);
      setSelectedRecord(null);
    } catch (error) {
      console.error('Error deleting record:', error);
    }
  };

  const getActiveFiltersCount = () => {
    return filters.status.length + (filters.dateRange ? 1 : 0);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Em Tratamento':
        return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">Em Tratamento</Badge>;
      case 'Iniciando':
        return <Badge className="bg-green-100 text-green-700 hover:bg-green-100">Iniciando</Badge>;
      case 'Concluído':
        return <Badge className="bg-gray-100 text-gray-700 hover:bg-gray-100">Concluído</Badge>;
      case 'Pausado':
        return <Badge className="bg-orange-100 text-orange-700 hover:bg-orange-100">Pausado</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  // Reset to first page when search or filters change
  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const handleFiltersChange = (newFilters: { status: string[]; dateRange: string }) => {
    setFilters(newFilters);
    setCurrentPage(1);
  };

  const renderPagination = (totalPgs: number, currentPg: number, setPage: (page: number) => void) => {
    if (totalPgs <= 1) return null;

    const pages = [];
    const showEllipsis = totalPgs > 7;
    
    if (showEllipsis) {
      pages.push(1);
      
      if (currentPg > 3) {
        pages.push("ellipsis1");
      }
      
      for (let i = Math.max(2, currentPg - 1); i <= Math.min(totalPgs - 1, currentPg + 1); i++) {
        pages.push(i);
      }
      
      if (currentPg < totalPgs - 2) {
        pages.push("ellipsis2");
      }
      
      if (totalPgs > 1) {
        pages.push(totalPgs);
      }
    } else {
      for (let i = 1; i <= totalPgs; i++) {
        pages.push(i);
      }
    }

    return (
      <Pagination className="mt-6">
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious 
              onClick={() => currentPg > 1 && setPage(currentPg - 1)}
              className={currentPg === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
            />
          </PaginationItem>
          
          {pages.map((page, index) => (
            <PaginationItem key={index}>
              {typeof page === "string" ? (
                <PaginationEllipsis />
              ) : (
                <PaginationLink
                  onClick={() => setPage(page)}
                  isActive={currentPg === page}
                  className="cursor-pointer"
                >
                  {page}
                </PaginationLink>
              )}
            </PaginationItem>
          ))}
          
          <PaginationItem>
            <PaginationNext 
              onClick={() => currentPg < totalPgs && setPage(currentPg + 1)}
              className={currentPg === totalPgs ? "pointer-events-none opacity-50" : "cursor-pointer"}
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    );
  };

  const getTimeSinceUpdate = (dateString: string) => {
    const recordDate = new Date(dateString);
    const now = new Date();
    const diffInDays = Math.floor((now.getTime() - recordDate.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffInDays === 0) return "Hoje";
    if (diffInDays === 1) return "Ontem";
    if (diffInDays < 7) return `${diffInDays} dias atrás`;
    return `${Math.floor(diffInDays / 7)} semana(s) atrás`;
  };

  const RecordCard = ({ record }: { record: MedicalRecordDisplay }) => (
    <Card className="shadow-sm border-0 hover:shadow-md transition-all duration-200">
      <CardHeader className="pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
              <FileText className="w-5 h-5 text-blue-600" />
            </div>
            <div className="min-w-0 flex-1">
              <CardTitle className="text-lg truncate">{record.patientName}</CardTitle>
              <p className="text-sm text-gray-500">ID: #{record.patientId.slice(0, 8)}</p>
            </div>
          </div>
          <div className="self-start sm:self-center">
            {getStatusBadge(record.status)}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-start gap-2 text-sm">
            <Activity className="w-4 h-4 text-gray-500 mt-0.5 shrink-0" />
            <div className="min-w-0 flex-1">
              <span className="font-medium">Diagnóstico:</span>
              <span className="ml-1 break-words">{record.diagnosis}</span>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 shrink-0" />
              <span className="whitespace-nowrap">Última atualização: {record.lastUpdate}</span>
            </div>
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 shrink-0" />
              <span className="whitespace-nowrap">{record.sessions} sessões realizadas</span>
            </div>
          </div>
          {record.notes && (
            <div className="bg-gray-50 p-3 rounded-lg">
              <p className="text-sm text-gray-700 break-words">{record.notes}</p>
            </div>
          )}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
            <span className="text-sm text-gray-500 break-words">
              {record.nextAppointment !== "A definir" ? `Próxima consulta: ${record.nextAppointment}` : "Próxima consulta a definir"}
            </span>
            <div className="flex gap-2 self-end sm:self-auto">
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => handleViewRecord(record)}
                className="text-xs px-3"
              >
                {isMobile ? "Ver" : "Visualizar"}
              </Button>
              <Button 
                size="sm" 
                className="clinic-gradient text-white text-xs px-3"
                onClick={() => handleEditRecord(record)}
              >
                Editar
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const RecentRecordCard = ({ record }: { record: MedicalRecordDisplay }) => (
    <Card className="shadow-sm border-0 hover:shadow-md transition-all duration-200">
      <CardHeader className="pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center shrink-0">
              <Clock className="w-5 h-5 text-green-600" />
            </div>
            <div className="min-w-0 flex-1">
              <CardTitle className="text-lg truncate">{record.patientName}</CardTitle>
              <p className="text-sm text-gray-500">ID: #{record.patientId.slice(0, 8)}</p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            {getStatusBadge(record.status)}
            <p className="text-xs text-gray-500 whitespace-nowrap">
              {getTimeSinceUpdate(record.createdDate)}
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-start gap-2 text-sm">
            <Activity className="w-4 h-4 text-gray-500 mt-0.5 shrink-0" />
            <div className="min-w-0 flex-1">
              <span className="font-medium">Diagnóstico:</span>
              <span className="ml-1 break-words">{record.diagnosis}</span>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 shrink-0" />
              <span className="whitespace-nowrap">Criado em: {record.lastUpdate}</span>
            </div>
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 shrink-0" />
              <span className="whitespace-nowrap">{record.sessions} sessões realizadas</span>
            </div>
          </div>
          {record.notes && (
            <div className="bg-green-50 p-3 rounded-lg border-l-4 border-green-200">
              <p className="text-sm text-gray-700 break-words">{record.notes}</p>
            </div>
          )}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
            <span className="text-sm text-gray-500 break-words">
              {record.nextAppointment !== "A definir" ? `Próxima consulta: ${record.nextAppointment}` : "Próxima consulta a definir"}
            </span>
            <div className="flex gap-2 self-end sm:self-auto">
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => handleViewRecord(record)}
                className="text-xs px-3"
              >
                {isMobile ? "Ver" : "Visualizar"}
              </Button>
              <Button 
                size="sm" 
                className="clinic-gradient text-white text-xs px-3"
                onClick={() => handleEditRecord(record)}
              >
                Editar
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Carregando prontuários...</p>
        </div>
      </div>
    );
  }

  // Stats calculations
  const totalRecords = displayRecords.length;
  const inTreatmentCount = displayRecords.filter(r => r.status === 'Em Tratamento').length;
  const startingCount = displayRecords.filter(r => r.status === 'Iniciando').length;
  const averageSessions = totalRecords > 0 
    ? Math.round(displayRecords.reduce((acc, r) => acc + r.sessions, 0) / totalRecords) 
    : 0;

  return (
    <div className="space-y-4 md:space-y-6 animate-fade-in px-4 md:px-0">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-gray-900">Prontuários</h1>
            <p className="text-sm md:text-base text-gray-600">Gerencie os prontuários médicos e acompanhe o progresso dos pacientes.</p>
          </div>
          <Button 
            className="clinic-gradient text-white hover:opacity-90 w-full sm:w-auto"
            onClick={() => setIsCreateModalOpen(true)}
          >
            <Plus className="w-4 h-4 mr-2" />
            {isMobile ? "Novo" : "Novo Prontuário"}
          </Button>
        </div>

        {/* Search and Filters - Same Line */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              placeholder={isMobile ? "Buscar prontuários..." : "Buscar prontuários por paciente ou diagnóstico..."}
              value={searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-10"
            />
          </div>
          <RecordFilters 
            onFiltersChange={handleFiltersChange}
            activeFiltersCount={getActiveFiltersCount()}
          />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <Card className="p-3 md:p-4">
          <div className="text-center">
            <p className="text-lg md:text-2xl font-bold text-blue-600">{totalRecords}</p>
            <p className="text-xs md:text-sm text-gray-600">{isMobile ? "Total" : "Total de Prontuários"}</p>
          </div>
        </Card>
        <Card className="p-3 md:p-4">
          <div className="text-center">
            <p className="text-lg md:text-2xl font-bold text-green-600">{inTreatmentCount}</p>
            <p className="text-xs md:text-sm text-gray-600">{isMobile ? "Tratamento" : "Em Tratamento"}</p>
          </div>
        </Card>
        <Card className="p-3 md:p-4">
          <div className="text-center">
            <p className="text-lg md:text-2xl font-bold text-orange-600">{startingCount}</p>
            <p className="text-xs md:text-sm text-gray-600">Iniciando</p>
          </div>
        </Card>
        <Card className="p-3 md:p-4">
          <div className="text-center">
            <p className="text-lg md:text-2xl font-bold text-purple-600">{averageSessions}</p>
            <p className="text-xs md:text-sm text-gray-600">{isMobile ? "Média" : "Média de Sessões"}</p>
          </div>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="all" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="all" className="text-xs md:text-sm">
            {isMobile ? "Todos" : "Todos os Prontuários"}
          </TabsTrigger>
          <TabsTrigger value="active" className="text-xs md:text-sm">
            {isMobile ? "Tratamento" : "Em Tratamento"}
          </TabsTrigger>
          <TabsTrigger value="kanban" className="text-xs md:text-sm">
            <LayoutGrid className="w-3.5 h-3.5 mr-1" />
            Kanban
          </TabsTrigger>
          <TabsTrigger value="recent" className="text-xs md:text-sm">
            {isMobile ? "Recentes" : "Recentes"}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 md:gap-6">
            {currentRecords.map((record) => (
              <RecordCard key={record.id} record={record} />
            ))}
          </div>
          {renderPagination(totalPages, currentPage, setCurrentPage)}
        </TabsContent>

        <TabsContent value="active" className="space-y-4">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 md:gap-6">
            {currentActiveRecords.map((record) => (
              <RecordCard key={record.id} record={record} />
            ))}
          </div>
          {renderPagination(activeTotalPages, activeCurrentPage, setActiveCurrentPage)}
        </TabsContent>

        <TabsContent value="kanban" className="space-y-4">
          <RecordsKanbanBoard
            records={displayRecords}
            onStatusChange={handleKanbanStatusChange}
            onView={handleViewRecord}
            onEdit={handleEditRecord}
          />
        </TabsContent>

        <TabsContent value="recent" className="space-y-4">
          <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 w-full lg:w-auto">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-green-600" />
                <h3 className="text-base md:text-lg font-medium">{isMobile ? "Recentes" : "Prontuários Recentes"}</h3>
              </div>
              <Select value={recentPeriod} onValueChange={setRecentPeriod}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Último dia</SelectItem>
                  <SelectItem value="3">Últimos 3 dias</SelectItem>
                  <SelectItem value="7">Últimos 7 dias</SelectItem>
                  <SelectItem value="14">Últimas 2 semanas</SelectItem>
                  <SelectItem value="30">Último mês</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Badge variant="outline" className="text-green-700 border-green-200 text-xs md:text-sm whitespace-nowrap">
              {recentRecords.length} prontuário(s) encontrado(s)
            </Badge>
          </div>

          {recentRecords.length > 0 ? (
            <>
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 md:gap-6">
                {currentRecentRecords.map((record) => (
                  <RecentRecordCard key={record.id} record={record} />
                ))}
              </div>
              {renderPagination(recentTotalPages, currentPage, setCurrentPage)}
            </>
          ) : (
            <div className="text-center py-8 md:py-12">
              <div className="w-12 h-12 md:w-16 md:h-16 mx-auto bg-green-100 rounded-full flex items-center justify-center mb-4">
                <Clock className="w-6 h-6 md:w-8 md:h-8 text-green-600" />
              </div>
              <h3 className="text-base md:text-lg font-medium text-gray-900 mb-2">Nenhum prontuário recente</h3>
              <p className="text-sm md:text-base text-gray-500 mb-4 px-4">
                Não há prontuários atualizados no período selecionado.
              </p>
              <Button 
                className="clinic-gradient text-white hover:opacity-90 w-full sm:w-auto"
                onClick={() => setIsCreateModalOpen(true)}
              >
                <Plus className="w-4 h-4 mr-2" />
                {isMobile ? "Novo" : "Novo Prontuário"}
              </Button>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Empty State */}
      {filteredRecords.length === 0 && !isLoading && (
        <div className="text-center py-8 md:py-12">
          <div className="w-12 h-12 md:w-16 md:h-16 mx-auto bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <Search className="w-6 h-6 md:w-8 md:h-8 text-gray-400" />
          </div>
          <h3 className="text-base md:text-lg font-medium text-gray-900 mb-2">Nenhum prontuário encontrado</h3>
          <p className="text-sm md:text-base text-gray-500 mb-4 px-4">
            {searchTerm 
              ? "Tente ajustar os termos de busca." 
              : "Adicione seu primeiro prontuário para começar."
            }
          </p>
          <Button 
            className="clinic-gradient text-white hover:opacity-90 w-full sm:w-auto"
            onClick={() => setIsCreateModalOpen(true)}
          >
            <Plus className="w-4 h-4 mr-2" />
            {isMobile ? "Novo" : "Novo Prontuário"}
          </Button>
        </div>
      )}

      {/* Modals */}
      <CreateRecordModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onRecordCreated={handleCreateRecord}
      />

      <ViewRecordModal
        record={selectedRecord}
        isOpen={isViewModalOpen}
        onClose={() => setIsViewModalOpen(false)}
        onEdit={handleEditFromView}
        onDelete={handleDeleteRecord}
      />

      <EditRecordModal
        record={selectedRecord}
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onUpdate={handleUpdateRecord}
      />
    </div>
  );
};

export default MedicalRecords;
