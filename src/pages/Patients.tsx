import { useState, useMemo } from "react";
import { Search, Phone, Mail, Calendar, FileText, Pill, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious, PaginationEllipsis } from "@/components/ui/pagination";
import AddPatientModal from "@/components/AddPatientModal";
import PatientFilters, { FilterState } from "@/components/PatientFilters";
import PatientActions from "@/components/PatientActions";
import ViewPatientModal from "@/components/ViewPatientModal";
import StatusToggleModal from "@/components/StatusToggleModal";
import { ViewRecordModal } from "@/components/ViewRecordModal";
import { ViewPrescriptionModal } from "@/components/prescriptions/ViewPrescriptionModal";
import { usePatients } from "@/hooks/usePatients";
import { usePlans } from "@/hooks/usePlans";
import { useAppointments } from "@/hooks/useAppointments";
import { useRevenue } from "@/hooks/useRevenue";
import { useRevenueStatusConfigContext } from "@/contexts/RevenueStatusConfigContext";
import { useMedicalRecords, MedicalRecord } from "@/hooks/useMedicalRecords";
import { usePrescriptions } from "@/hooks/usePrescriptions";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { format, parseISO, differenceInYears } from "date-fns";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

interface PatientUI {
  id: string;
  name: string;
  email: string;
  phone: string;
  age: number;
  gender: string;
  lastConsultation: string;
  sessions: number;
  status: string;
  avatar: string;
  planId: string | null;
}

const Patients = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { hasPermission } = useAuth();
  const { patients: supabasePatients, isLoading, addPatient, updatePatient, deletePatient } = usePatients();
  const { plans } = usePlans();
  const { appointments } = useAppointments();
  const { allRevenue } = useRevenue();
  const { statuses: revenueStatuses } = useRevenueStatusConfigContext();
  const { medicalRecords } = useMedicalRecords();
  const { prescriptions } = usePrescriptions();

  const paidRevenueStatusKeys = useMemo(
    () => new Set(revenueStatuses.filter((s) => s.count_in_balance).map((s) => s.key)),
    [revenueStatuses]
  );
  const appointmentCountByPatientId = useMemo(() => {
    const map: Record<string, number> = {};
    for (const a of appointments) {
      if (a.patient_id) map[a.patient_id] = (map[a.patient_id] ?? 0) + 1;
    }
    return map;
  }, [appointments]);
  const paidRevenueCountByPatientId = useMemo(() => {
    const map: Record<string, number> = {};
    for (const r of allRevenue) {
      if (r.patientId && paidRevenueStatusKeys.has(r.status)) {
        map[r.patientId] = (map[r.patientId] ?? 0) + 1;
      }
    }
    return map;
  }, [allRevenue, paidRevenueStatusKeys]);
  
  const [searchTerm, setSearchTerm] = useState("");
  const [editingPatient, setEditingPatient] = useState<any>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [viewingPatient, setViewingPatient] = useState<any>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [statusModalPatient, setStatusModalPatient] = useState<PatientUI | null>(null);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  
  // Medical record modal state
  const [selectedRecord, setSelectedRecord] = useState<{
    id: string;
    patientName: string;
    patientId: string;
    lastUpdate: string;
    diagnosis: string;
    sessions: number;
    status: string;
    notes: string;
    nextAppointment: string;
  } | null>(null);
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  
  // Prescription modal state
  const [selectedPrescription, setSelectedPrescription] = useState<any>(null);
  const [isPrescriptionModalOpen, setIsPrescriptionModalOpen] = useState(false);
  
  const [filters, setFilters] = useState<FilterState>({
    status: "all",
    gender: "all",
    planId: "all",
    ageRange: { min: "", max: "" },
    sessionsRange: { min: "", max: "" },
    lastConsultationRange: { start: "", end: "" },
    sortBy: "none",
    sortOrder: "asc"
  });

  // Transform Supabase patients to UI format (sessions = do plano vinculado; sem plano = 0)
  const patients: PatientUI[] = useMemo(() => {
    return supabasePatients.map(p => {
      const age = p.birth_date ? differenceInYears(new Date(), parseISO(p.birth_date)) : 0;
      const initials = p.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
      const plan = p.plan_id ? plans.find(pl => pl.id === p.plan_id) : null;
      const sessions = plan ? plan.sessions : 0;
      return {
        id: p.id,
        name: p.name,
        email: p.email || '',
        phone: p.phone || '',
        age,
        gender: p.gender || 'Não informado',
        lastConsultation: p.updated_at,
        sessions,
        status: p.status === 'active' ? 'Ativo' : p.status === 'inactive' ? 'Inativo' : 'Pendente',
        avatar: initials,
        planId: p.plan_id || null
      };
    });
  }, [supabasePatients, plans]);

  const handleAddPatient = async (newPatient: any) => {
    try {
      const photoKey = newPatient.photoStorageKey && !String(newPatient.photoStorageKey).startsWith("data:") ? newPatient.photoStorageKey : null;
      const docKey = newPatient.documentStorageKey && !String(newPatient.documentStorageKey).startsWith("data:") ? newPatient.documentStorageKey : null;
      await addPatient({
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
        photo_storage_key: photoKey,
        document_url: newPatient.document || null,
        document_storage_key: docKey,
        plan_id: newPatient.planId || null,
        address_cep: newPatient.address?.zipCode || null,
        address_street: newPatient.address?.street || null,
        address_number: newPatient.address?.number || null,
        address_complement: newPatient.address?.complement || null,
        address_neighborhood: newPatient.address?.neighborhood || null,
        address_city: newPatient.address?.city || null,
        address_state: newPatient.address?.state || null
      });
    } catch (error) {
      console.error('Error adding patient:', error);
    }
  };

  const handleEditPatient = (patient: PatientUI) => {
    // Find the full patient data from Supabase
    const fullPatient = supabasePatients.find(p => p.id === patient.id);
    if (fullPatient) {
      // Transform to modal format with all fields
      const editPatientData = {
        id: fullPatient.id,
        name: fullPatient.name,
        email: fullPatient.email || '',
        phone: fullPatient.phone || '',
        cpf: fullPatient.cpf || '',
        rg: fullPatient.rg || '',
        birthDate: fullPatient.birth_date || '',
        gender: fullPatient.gender || 'Não informado',
        profession: fullPatient.profession || '',
        maritalStatus: fullPatient.marital_status || '',
        planId: fullPatient.plan_id || '',
        status: fullPatient.status === 'active' ? 'Ativo' : fullPatient.status === 'inactive' ? 'Inativo' : 'Pendente',
        address: {
          street: fullPatient.address_street || '',
          number: fullPatient.address_number || '',
          complement: fullPatient.address_complement || '',
          neighborhood: fullPatient.address_neighborhood || '',
          city: fullPatient.address_city || '',
          state: fullPatient.address_state || '',
          zipCode: fullPatient.address_cep || ''
        },
        notes: fullPatient.notes || '',
        document: fullPatient.document_url || null,
        documentName: fullPatient.document_url ? 'Documento existente' : '',
        documentStorageKey: fullPatient.document_storage_key || '',
        photo: fullPatient.photo_url || null,
        photoName: fullPatient.photo_url ? 'Foto existente' : '',
        photoStorageKey: fullPatient.photo_storage_key || '',
      };
      setEditingPatient(editPatientData);
      setIsEditModalOpen(true);
    }
  };

  const handleViewPatient = (patient: PatientUI) => {
    const fullPatient = supabasePatients.find(p => p.id === patient.id);
    if (fullPatient) {
      const viewPatientData = {
        id: fullPatient.id,
        name: fullPatient.name,
        email: fullPatient.email || '',
        phone: fullPatient.phone || '',
        cpf: fullPatient.cpf || '',
        rg: fullPatient.rg || '',
        birthDate: fullPatient.birth_date || '',
        gender: fullPatient.gender || 'Não informado',
        profession: fullPatient.profession || '',
        maritalStatus: fullPatient.marital_status || '',
        planId: fullPatient.plan_id || null,
        status: fullPatient.status === 'active' ? 'Ativo' : fullPatient.status === 'inactive' ? 'Inativo' : 'Pendente',
        address: {
          street: fullPatient.address_street || '',
          number: fullPatient.address_number || '',
          complement: fullPatient.address_complement || '',
          neighborhood: fullPatient.address_neighborhood || '',
          city: fullPatient.address_city || '',
          state: fullPatient.address_state || '',
          zipCode: fullPatient.address_cep || ''
        },
        notes: fullPatient.notes || '',
        document: fullPatient.document_url || null,
        documentName: fullPatient.document_url ? 'Documento existente' : '',
        photo: fullPatient.photo_url || null,
        photoName: fullPatient.photo_url ? 'Foto existente' : ''
      };
      setViewingPatient(viewPatientData);
      setIsViewModalOpen(true);
    }
  };

  const handleUpdatePatient = async (updatedPatient: any) => {
    try {
      const statusMap: Record<string, 'active' | 'inactive' | 'pending'> = {
        'Ativo': 'active',
        'Inativo': 'inactive',
        'Pendente': 'pending'
      };
      
      const photoKey = updatedPatient.photoStorageKey && !String(updatedPatient.photoStorageKey).startsWith("data:") ? updatedPatient.photoStorageKey : null;
      const docKey = updatedPatient.documentStorageKey && !String(updatedPatient.documentStorageKey).startsWith("data:") ? updatedPatient.documentStorageKey : null;
      await updatePatient(updatedPatient.id, {
        name: updatedPatient.name,
        email: updatedPatient.email || null,
        phone: updatedPatient.phone || null,
        cpf: updatedPatient.cpf || null,
        rg: updatedPatient.rg || null,
        birth_date: updatedPatient.birthDate || null,
        gender: updatedPatient.gender === 'Não informado' ? null : updatedPatient.gender || null,
        profession: updatedPatient.profession || null,
        marital_status: updatedPatient.maritalStatus || null,
        notes: updatedPatient.notes || null,
        photo_url: updatedPatient.photo || null,
        photo_storage_key: photoKey,
        document_url: updatedPatient.document || null,
        document_storage_key: docKey,
        plan_id: updatedPatient.planId || null,
        address_cep: updatedPatient.address?.zipCode || null,
        address_street: updatedPatient.address?.street || null,
        address_number: updatedPatient.address?.number || null,
        address_complement: updatedPatient.address?.complement || null,
        address_neighborhood: updatedPatient.address?.neighborhood || null,
        address_city: updatedPatient.address?.city || null,
        address_state: updatedPatient.address?.state || null,
        status: statusMap[updatedPatient.status] || 'active'
      });
      setEditingPatient(null);
      setIsEditModalOpen(false);
    } catch (error) {
      console.error('Error updating patient:', error);
    }
  };

  const handleDeletePatient = async (patientId: string) => {
    try {
      await deletePatient(patientId);
    } catch (error) {
      console.error('Error deleting patient:', error);
    }
  };

  const handleScheduleAppointment = (patient: PatientUI) => {
    navigate(`/agenda?patient=${encodeURIComponent(patient.name)}`);
  };

  const handleViewMedicalRecord = (patientId: string) => {
    // Find medical record for this patient
    const record = medicalRecords.find(r => r.patient_id === patientId);
    
    if (record) {
      const mapStatusToDisplay = (status: MedicalRecord['status']) => {
        switch (status) {
          case 'starting': return 'Iniciando';
          case 'in_treatment': return 'Em Tratamento';
          case 'completed': return 'Concluído';
          case 'paused': return 'Pausado';
          default: return status;
        }
      };
      
      const formatRecordDate = (dateString: string | null) => {
        if (!dateString) return 'A definir';
        try {
          return format(parseISO(dateString), 'dd/MM/yyyy');
        } catch {
          return dateString;
        }
      };
      
      setSelectedRecord({
        id: record.id,
        patientName: record.patient?.name || 'Paciente',
        patientId: record.patient_id,
        lastUpdate: formatRecordDate(record.updated_at),
        diagnosis: record.diagnosis,
        sessions: record.sessions,
        status: mapStatusToDisplay(record.status),
        notes: record.notes || '',
        nextAppointment: formatRecordDate(record.next_appointment)
      });
      setIsRecordModalOpen(true);
    } else {
      toast({
        title: "Prontuário não encontrado",
        description: "Este paciente ainda não possui prontuário. Deseja criar um?",
        variant: "destructive"
      });
      navigate('/prontuarios');
    }
  };

  const handleViewPrescription = (patientId: string) => {
    // Find prescription for this patient
    const prescription = prescriptions.find(p => p.patient_id === patientId);
    
    if (prescription) {
      setSelectedPrescription(prescription);
      setIsPrescriptionModalOpen(true);
    } else {
      const patientName = supabasePatients.find(p => p.id === patientId)?.name || 'Paciente';
      toast({
        title: "Receituário não encontrado",
        description: `${patientName} ainda não possui receita médica.`,
        variant: "destructive"
      });
    }
  };

  const handleStatusChange = async (patientId: string, newStatus: string) => {
    try {
      const statusMap: Record<string, 'active' | 'inactive' | 'pending'> = {
        'Ativo': 'active',
        'Inativo': 'inactive',
        'Pendente': 'pending'
      };
      await updatePatient(patientId, { status: statusMap[newStatus] || 'active' });
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const handleStatusClick = (patient: PatientUI) => {
    setStatusModalPatient(patient);
    setIsStatusModalOpen(true);
  };

  const getActiveFiltersCount = () => {
    let count = 0;
    if (filters.status && filters.status !== "all") count++;
    if (filters.gender && filters.gender !== "all") count++;
    if (filters.planId && filters.planId !== "all") count++;
    if (filters.ageRange.min || filters.ageRange.max) count++;
    if (filters.sessionsRange.min || filters.sessionsRange.max) count++;
    if (filters.lastConsultationRange.start || filters.lastConsultationRange.end) count++;
    if (filters.sortBy && filters.sortBy !== "none") count++;
    return count;
  };

  const handleColumnSort = (columnKey: string) => {
    setFilters((prev) => ({
      ...prev,
      sortBy: columnKey,
      sortOrder: prev.sortBy === columnKey && prev.sortOrder === "asc" ? "desc" : "asc"
    }));
    setCurrentPage(1);
  };

  const formatDate = (dateString: string) => {
    try {
      return format(parseISO(dateString), 'dd/MM/yyyy');
    } catch {
      return dateString;
    }
  };

  const filteredAndSortedPatients = useMemo(() => {
    let result = patients.filter(patient => {
      const matchesSearch = patient.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           patient.email.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = filters.status === "all" || patient.status === filters.status;
      const matchesGender = filters.gender === "all" || patient.gender === filters.gender;
      const matchesPlan =
        filters.planId === "all" ||
        (filters.planId === "none" ? !patient.planId : patient.planId === filters.planId);
      const matchesAge = (!filters.ageRange.min || patient.age >= parseInt(filters.ageRange.min)) &&
                        (!filters.ageRange.max || patient.age <= parseInt(filters.ageRange.max));
      const matchesSessions = (!filters.sessionsRange.min || patient.sessions >= parseInt(filters.sessionsRange.min)) &&
                             (!filters.sessionsRange.max || patient.sessions <= parseInt(filters.sessionsRange.max));
      
      return matchesSearch && matchesStatus && matchesGender && matchesPlan && matchesAge && matchesSessions;
    });

    if (filters.sortBy && filters.sortBy !== "none") {
      const dir = filters.sortOrder === "asc" ? 1 : -1;
      result.sort((a, b) => {
        let aVal: string | number | Date, bVal: string | number | Date;
        switch (filters.sortBy) {
          case "name":
            aVal = a.name.toLowerCase();
            bVal = b.name.toLowerCase();
            break;
          case "email":
            aVal = (a.email || "").toLowerCase();
            bVal = (b.email || "").toLowerCase();
            break;
          case "phone":
            aVal = (a.phone || "").toLowerCase();
            bVal = (b.phone || "").toLowerCase();
            break;
          case "age":
            aVal = a.age;
            bVal = b.age;
            break;
          case "plan":
            aVal = (plans.find((p) => p.id === a.planId)?.name ?? "").toLowerCase();
            bVal = (plans.find((p) => p.id === b.planId)?.name ?? "").toLowerCase();
            break;
          case "status":
            aVal = a.status.toLowerCase();
            bVal = b.status.toLowerCase();
            break;
          case "sessions":
            aVal = a.sessions;
            bVal = b.sessions;
            break;
          case "lastConsultation":
            aVal = new Date(a.lastConsultation).getTime();
            bVal = new Date(b.lastConsultation).getTime();
            break;
          default:
            return 0;
        }
        if (aVal < bVal) return -dir;
        if (aVal > bVal) return dir;
        return 0;
      });
    }

    return result;
  }, [patients, searchTerm, filters, plans]);

  const ITEMS_PER_PAGE = 10;
  const totalPages = Math.ceil(filteredAndSortedPatients.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedPatients = filteredAndSortedPatients.slice(startIndex, endIndex);

  const handleFiltersChange = (newFilters: FilterState) => {
    setFilters(newFilters);
    setCurrentPage(1);
  };

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const renderPagination = () => {
    if (totalPages <= 1) return null;

    const pages = [];
    const maxVisiblePages = 5;
    
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
    
    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    return (
      <Pagination className="mt-6">
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious 
              onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
              className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
            />
          </PaginationItem>
          
          {startPage > 1 && (
            <>
              <PaginationItem>
                <PaginationLink onClick={() => handlePageChange(1)} className="cursor-pointer">
                  1
                </PaginationLink>
              </PaginationItem>
              {startPage > 2 && (
                <PaginationItem>
                  <PaginationEllipsis />
                </PaginationItem>
              )}
            </>
          )}
          
          {Array.from({ length: endPage - startPage + 1 }, (_, i) => startPage + i).map((page) => (
            <PaginationItem key={page}>
              <PaginationLink
                onClick={() => handlePageChange(page)}
                isActive={currentPage === page}
                className="cursor-pointer"
              >
                {page}
              </PaginationLink>
            </PaginationItem>
          ))}
          
          {endPage < totalPages && (
            <>
              {endPage < totalPages - 1 && (
                <PaginationItem>
                  <PaginationEllipsis />
                </PaginationItem>
              )}
              <PaginationItem>
                <PaginationLink onClick={() => handlePageChange(totalPages)} className="cursor-pointer">
                  {totalPages}
                </PaginationLink>
              </PaginationItem>
            </>
          )}
          
          <PaginationItem>
            <PaginationNext 
              onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
              className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    );
  };

  const canEditPatient = hasPermission('patients', 'edit');
  const getStatusBadge = (status: string, patient: PatientUI) => {
    const baseClass = status === 'Ativo' 
      ? "bg-green-100 text-green-700" 
      : status === 'Inativo'
      ? "bg-gray-100 text-gray-700"
      : "bg-red-100 text-red-700";
    const interactiveClass = canEditPatient
      ? " hover:bg-opacity-80 cursor-pointer transition-colors"
      : "";
    
    return (
      <Badge 
        className={baseClass + interactiveClass}
        onClick={canEditPatient ? () => handleStatusClick(patient) : undefined}
        role={canEditPatient ? "button" : undefined}
      >
        {status}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-4 md:space-y-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-4 w-64" />
          </div>
          <Skeleton className="h-10 w-40" />
        </div>
        <div className="flex gap-4">
          <Skeleton className="h-10 flex-1" />
          <Skeleton className="h-10 w-24" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 md:gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => <Skeleton key={i} className="h-20" />)}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
          {[1, 2, 3, 4, 5, 6, 7, 8].map(i => <Skeleton key={i} className="h-64" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-foreground">Gestão de Pacientes</h1>
          <p className="text-sm md:text-base text-muted-foreground">Gerencie seus pacientes e acompanhe o progresso dos tratamentos.</p>
        </div>
        {canEditPatient && (
          <div className="shrink-0">
            <AddPatientModal onAddPatient={handleAddPatient} />
          </div>
        )}
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-3 md:gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar pacientes por nome ou email..."
            value={searchTerm}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="shrink-0">
          <PatientFilters 
            onFiltersChange={handleFiltersChange}
            activeFiltersCount={getActiveFiltersCount()}
            plans={plans.map((p) => ({ id: p.id, name: p.name }))}
          />
        </div>
      </div>

      {/* Stats: 6 cards por linha */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 md:gap-4">
        <Card className="p-3 md:p-4">
          <div className="text-center">
            <p className="text-lg md:text-2xl font-bold text-blue-600">{patients.length}</p>
            <p className="text-xs md:text-sm text-muted-foreground">Total de Pacientes</p>
          </div>
        </Card>
        <Card className="p-3 md:p-4">
          <div className="text-center">
            <p className="text-lg md:text-2xl font-bold text-green-600">{patients.filter(p => p.status === 'Ativo').length}</p>
            <p className="text-xs md:text-sm text-muted-foreground">Pacientes Ativos</p>
          </div>
        </Card>
        <Card className="p-3 md:p-4">
          <div className="text-center">
            <p className="text-lg md:text-2xl font-bold text-orange-600">
              {patients.length > 0 ? Math.round(patients.reduce((acc, p) => acc + p.sessions, 0) / patients.length) : 0}
            </p>
            <p className="text-xs md:text-sm text-muted-foreground">Média de Sessões</p>
          </div>
        </Card>
        <Card className="p-3 md:p-4">
          <div className="text-center">
            <p className="text-lg md:text-2xl font-bold text-purple-600">{filteredAndSortedPatients.length}</p>
            <p className="text-xs md:text-sm text-muted-foreground">Resultados Filtrados</p>
          </div>
        </Card>
        <Card className="p-3 md:p-4">
          <div className="text-center">
            <p className="text-lg md:text-2xl font-bold text-muted-foreground">{patients.filter(p => !p.planId).length}</p>
            <p className="text-xs md:text-sm text-muted-foreground">Sem plano</p>
          </div>
        </Card>
        {plans.map((plan) => (
          <Card key={plan.id} className="p-3 md:p-4">
            <div className="text-center">
              <p className="text-lg md:text-2xl font-bold text-primary">{patients.filter(p => p.planId === plan.id).length}</p>
              <p className="text-xs md:text-sm text-muted-foreground truncate" title={`Plano ${plan.name}`}>Plano {plan.name}</p>
            </div>
          </Card>
        ))}
      </div>

      {/* Table View */}
      <Card className="mt-4 md:mt-6">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]"></TableHead>
                  <TableHead>
                    <Button variant="ghost" size="sm" className="-ml-2 h-8 font-medium" onClick={() => handleColumnSort("name")}>
                      Nome
                      {filters.sortBy === "name" ? (filters.sortOrder === "asc" ? <ArrowUp className="ml-1 h-4 w-4" /> : <ArrowDown className="ml-1 h-4 w-4" />) : <ArrowUpDown className="ml-1 h-4 w-4 opacity-50" />}
                    </Button>
                  </TableHead>
                  <TableHead className="hidden md:table-cell">
                    <Button variant="ghost" size="sm" className="-ml-2 h-8 font-medium" onClick={() => handleColumnSort("email")}>
                      Email
                      {filters.sortBy === "email" ? (filters.sortOrder === "asc" ? <ArrowUp className="ml-1 h-4 w-4" /> : <ArrowDown className="ml-1 h-4 w-4" />) : <ArrowUpDown className="ml-1 h-4 w-4 opacity-50" />}
                    </Button>
                  </TableHead>
                  <TableHead className="hidden lg:table-cell">
                    <Button variant="ghost" size="sm" className="-ml-2 h-8 font-medium" onClick={() => handleColumnSort("phone")}>
                      Telefone
                      {filters.sortBy === "phone" ? (filters.sortOrder === "asc" ? <ArrowUp className="ml-1 h-4 w-4" /> : <ArrowDown className="ml-1 h-4 w-4" />) : <ArrowUpDown className="ml-1 h-4 w-4 opacity-50" />}
                    </Button>
                  </TableHead>
                  <TableHead className="hidden lg:table-cell">
                    <Button variant="ghost" size="sm" className="-ml-2 h-8 font-medium" onClick={() => handleColumnSort("age")}>
                      Idade
                      {filters.sortBy === "age" ? (filters.sortOrder === "asc" ? <ArrowUp className="ml-1 h-4 w-4" /> : <ArrowDown className="ml-1 h-4 w-4" />) : <ArrowUpDown className="ml-1 h-4 w-4 opacity-50" />}
                    </Button>
                  </TableHead>
                  <TableHead className="hidden sm:table-cell">
                    <Button variant="ghost" size="sm" className="-ml-2 h-8 font-medium" onClick={() => handleColumnSort("plan")}>
                      Plano
                      {filters.sortBy === "plan" ? (filters.sortOrder === "asc" ? <ArrowUp className="ml-1 h-4 w-4" /> : <ArrowDown className="ml-1 h-4 w-4" />) : <ArrowUpDown className="ml-1 h-4 w-4 opacity-50" />}
                    </Button>
                  </TableHead>
                  <TableHead className="hidden sm:table-cell text-center whitespace-nowrap">
                    Saldo/Sessões
                  </TableHead>
                  <TableHead>
                    <Button variant="ghost" size="sm" className="-ml-2 h-8 font-medium" onClick={() => handleColumnSort("status")}>
                      Status
                      {filters.sortBy === "status" ? (filters.sortOrder === "asc" ? <ArrowUp className="ml-1 h-4 w-4" /> : <ArrowDown className="ml-1 h-4 w-4" />) : <ArrowUpDown className="ml-1 h-4 w-4 opacity-50" />}
                    </Button>
                  </TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedPatients.map((patient) => (
                  <TableRow key={patient.id}>
                    <TableCell>
                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                        <span className="text-xs font-semibold text-blue-600">{patient.avatar}</span>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">{patient.name}</TableCell>
                    <TableCell className="text-muted-foreground hidden md:table-cell">{patient.email || '-'}</TableCell>
                    <TableCell className="text-muted-foreground hidden lg:table-cell">{patient.phone || '-'}</TableCell>
                    <TableCell className="text-muted-foreground hidden lg:table-cell">{patient.age} anos</TableCell>
                    <TableCell className="hidden sm:table-cell">
                      {(() => {
                        const plan = patient.planId ? plans.find((pl) => pl.id === patient.planId) : null;
                        if (!plan) return <span className="text-muted-foreground">—</span>;
                        return (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="cursor-default font-medium text-foreground">{plan.name}</span>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="max-w-xs space-y-1.5 p-3">
                              <p className="font-semibold border-b pb-1">{plan.name}</p>
                              <p className="text-xs"><span className="text-muted-foreground">Valor:</span> {formatCurrency(plan.value)}</p>
                              <p className="text-xs"><span className="text-muted-foreground">Sessões:</span> {plan.sessions}</p>
                              {plan.observations ? (
                                <p className="text-xs pt-1 border-t">
                                  <span className="text-muted-foreground">Observações:</span>
                                  <span className="block mt-0.5 whitespace-pre-line">{plan.observations}</span>
                                </p>
                              ) : null}
                            </TooltipContent>
                          </Tooltip>
                        );
                      })()}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-center tabular-nums">
                      {(() => {
                        const agendasCount = appointmentCountByPatientId[patient.id] ?? 0;
                        const plan = patient.planId ? plans.find((pl) => pl.id === patient.planId) : null;
                        const paidCount = paidRevenueCountByPatientId[patient.id] ?? 0;
                        const planSessions = plan != null ? Math.max(1, plan.sessions ?? 1) : 0;
                        const sessionsLiberated = plan ? paidCount * planSessions : 0;
                        return (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="text-muted-foreground cursor-default">{agendasCount}/{sessionsLiberated}</span>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="max-w-xs">
                              <p><strong>Agendamentos</strong> realizados / <strong>Sessões</strong> liberadas</p>
                              <p className="text-xs text-muted-foreground mt-1">Sessões = receitas com status pago × sessões do plano</p>
                            </TooltipContent>
                          </Tooltip>
                        );
                      })()}
                    </TableCell>
                    <TableCell>{getStatusBadge(patient.status, patient)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1 md:gap-2">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button 
                              size="sm" 
                              variant="outline"
                              className="h-7 w-7 p-0 text-xs md:text-sm"
                              onClick={() => handleScheduleAppointment(patient)}
                            >
                              <Calendar className="w-3.5 h-3.5" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Agendamento</p>
                          </TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button 
                              size="sm" 
                              variant="outline"
                              className="h-7 w-7 p-0 text-xs md:text-sm"
                              onClick={() => handleViewMedicalRecord(patient.id)}
                            >
                              <FileText className="w-3.5 h-3.5" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Prontuário</p>
                          </TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button 
                              size="sm" 
                              variant="outline"
                              className="h-7 w-7 p-0 text-xs md:text-sm"
                              onClick={() => handleViewPrescription(patient.id)}
                            >
                              <Pill className="w-3.5 h-3.5" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Receita Médica</p>
                          </TooltipContent>
                        </Tooltip>
                        <PatientActions 
                          patient={patient}
                          fullPatient={supabasePatients.find(p => p.id === patient.id)}
                          onView={handleViewPatient}
                          onEdit={handleEditPatient}
                          onDelete={() => handleDeletePatient(patient.id)}
                          onViewRecord={handleViewMedicalRecord}
                          onViewPrescription={handleViewPrescription}
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      {renderPagination()}

      {/* Empty State */}
      {filteredAndSortedPatients.length === 0 && (
        <div className="text-center py-8 md:py-12">
          <div className="w-12 h-12 md:w-16 md:h-16 mx-auto bg-muted rounded-full flex items-center justify-center mb-4">
            <Search className="w-6 h-6 md:w-8 md:h-8 text-muted-foreground" />
          </div>
          <h3 className="text-base md:text-lg font-medium text-foreground mb-2">Nenhum paciente encontrado</h3>
          <p className="text-sm md:text-base text-muted-foreground mb-4 px-4">
            {searchTerm || getActiveFiltersCount() > 0 
              ? "Tente ajustar os termos de busca ou filtros." 
              : "Adicione seu primeiro paciente para começar."
            }
          </p>
          {canEditPatient && <AddPatientModal onAddPatient={handleAddPatient} />}
        </div>
      )}

      {/* Edit Patient Modal */}
      {isEditModalOpen && editingPatient && (
        <AddPatientModal 
          onAddPatient={handleUpdatePatient}
          editingPatient={editingPatient}
          open={isEditModalOpen}
          onOpenChange={setIsEditModalOpen}
        />
      )}

      {/* View Patient Modal */}
      <ViewPatientModal
        patient={viewingPatient}
        open={isViewModalOpen}
        onOpenChange={(open) => {
          setIsViewModalOpen(open);
          if (!open) setViewingPatient(null);
        }}
      />

      {/* Status Toggle Modal */}
      {isStatusModalOpen && statusModalPatient && (
        <StatusToggleModal 
          patient={statusModalPatient}
          open={isStatusModalOpen}
          onOpenChange={setIsStatusModalOpen}
          onStatusChange={(id, status) => handleStatusChange(id.toString(), status)}
        />
      )}

      {/* View Medical Record Modal */}
      <ViewRecordModal
        record={selectedRecord}
        isOpen={isRecordModalOpen}
        onClose={() => {
          setIsRecordModalOpen(false);
          setSelectedRecord(null);
        }}
        onEdit={() => {
          setIsRecordModalOpen(false);
          navigate('/prontuarios');
        }}
      />

      {/* View Prescription Modal */}
      <ViewPrescriptionModal
        prescription={selectedPrescription}
        open={isPrescriptionModalOpen}
        onOpenChange={(open) => {
          setIsPrescriptionModalOpen(open);
          if (!open) setSelectedPrescription(null);
        }}
      />
    </div>
  );
};

export default Patients;
