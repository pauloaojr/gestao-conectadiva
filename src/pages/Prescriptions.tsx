import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Search, FileText, Pill, User, Loader2, Eye, Trash2, MoreHorizontal, ChevronLeft, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { usePrescriptions } from "@/hooks/usePrescriptions";
import { useIsMobile } from "@/hooks/use-mobile";
import { CreatePrescriptionModal } from "@/components/prescriptions/CreatePrescriptionModal";
import { ViewPrescriptionModal } from "@/components/prescriptions/ViewPrescriptionModal";
import { Prescription, Medication } from "@/types/prescription";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
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

const ITEMS_PER_PAGE = 12;

const Prescriptions = () => {
  const { prescriptions, isLoading, addPrescription, deletePrescription } = usePrescriptions();
  const isMobile = useIsMobile();

  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState<"patient" | "doctor" | "diagnosis" | "date" | null>(null);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedPrescription, setSelectedPrescription] = useState<Prescription | null>(null);

  const handleColumnSort = (column: "patient" | "doctor" | "diagnosis" | "date") => {
    setSortBy((prev) => {
      if (prev === column) {
        setSortOrder((old) => (old === "asc" ? "desc" : "asc"));
        return prev;
      }
      setSortOrder("asc");
      return column;
    });
    setCurrentPage(1);
  };

  // Filter + sort prescriptions
  const filteredPrescriptions = useMemo(() => {
    let filtered = prescriptions;

    // Search filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(p =>
        p.patient_name.toLowerCase().includes(search) ||
        p.attendant_name.toLowerCase().includes(search) ||
        p.diagnosis?.toLowerCase().includes(search) ||
        p.medications.some(m => m.name.toLowerCase().includes(search))
      );
    }

    if (sortBy) {
      const dir = sortOrder === "asc" ? 1 : -1;
      filtered = [...filtered].sort((a, b) => {
        let aVal: string | Date = "";
        let bVal: string | Date = "";

        switch (sortBy) {
          case "patient":
            aVal = a.patient_name.toLowerCase();
            bVal = b.patient_name.toLowerCase();
            break;
          case "doctor":
            aVal = (a.attendant_name || "").toLowerCase();
            bVal = (b.attendant_name || "").toLowerCase();
            break;
          case "diagnosis":
            aVal = (a.diagnosis || "").toLowerCase();
            bVal = (b.diagnosis || "").toLowerCase();
            break;
          case "date":
            aVal = new Date(a.created_at);
            bVal = new Date(b.created_at);
            break;
        }

        if (aVal < bVal) return -dir;
        if (aVal > bVal) return dir;
        return 0;
      });
    }

    return filtered;
  }, [prescriptions, searchTerm, sortBy, sortOrder]);

  // Pagination
  const totalPages = Math.ceil(filteredPrescriptions.length / ITEMS_PER_PAGE);
  const paginatedPrescriptions = filteredPrescriptions.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  // Recent prescriptions (first 5 from filtered+sorted list)
  const recentPrescriptions = filteredPrescriptions.slice(0, 5);

  // Stats
  const stats = useMemo(() => {
    const today = new Date().toDateString();
    const todayCount = prescriptions.filter(p => 
      new Date(p.created_at).toDateString() === today
    ).length;

    const uniquePatients = new Set(prescriptions.map(p => p.patient_id)).size;
    const totalMedications = prescriptions.reduce((acc, p) => acc + p.medications.length, 0);

    return {
      total: prescriptions.length,
      today: todayCount,
      patients: uniquePatients,
      medications: totalMedications
    };
  }, [prescriptions]);

  const handleCreatePrescription = async (data: {
    patient_id: string;
    patient_name: string;
    attendant_id: string;
    attendant_name: string;
    medications: Medication[];
    notes: string | null;
    diagnosis: string | null;
  }) => {
    await addPrescription({
      ...data,
      created_by: null
    });
  };

  const handleDeletePrescription = async () => {
    if (selectedPrescription) {
      await deletePrescription(selectedPrescription.id);
      setShowDeleteDialog(false);
      setSelectedPrescription(null);
    }
  };

  const handleViewPrescription = (prescription: Prescription) => {
    setSelectedPrescription(prescription);
    setShowViewModal(true);
  };

  const handleDeleteClick = (prescription: Prescription) => {
    setSelectedPrescription(prescription);
    setShowDeleteDialog(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">Receituário</h1>
          <p className="text-muted-foreground">Gerencie as receitas médicas dos pacientes</p>
        </div>
        <Button onClick={() => setShowCreateModal(true)} className="clinic-gradient text-white">
          <Plus className="h-4 w-4 mr-2" />
          Nova Receita
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total de Receitas</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <FileText className="h-8 w-8 text-primary/20" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Receitas Hoje</p>
                <p className="text-2xl font-bold">{stats.today}</p>
              </div>
              <FileText className="h-8 w-8 text-green-500/20" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pacientes Atendidos</p>
                <p className="text-2xl font-bold">{stats.patients}</p>
              </div>
              <User className="h-8 w-8 text-blue-500/20" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Medicamentos</p>
                <p className="text-2xl font-bold">{stats.medications}</p>
              </div>
              <Pill className="h-8 w-8 text-purple-500/20" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por paciente, médico, medicamento..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="pl-10"
          />
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all">
            {isMobile ? "Todas" : "Todas as Receitas"}
          </TabsTrigger>
          <TabsTrigger value="recent">
            {isMobile ? "Recentes" : "Receitas Recentes"}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-6">
          {paginatedPrescriptions.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <FileText className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-medium mb-2">Nenhuma receita encontrada</h3>
                <p className="text-muted-foreground mb-4">
                  {searchTerm 
                    ? "Tente ajustar os filtros de busca" 
                    : "Comece criando uma nova receita médica"}
                </p>
                {!searchTerm && (
                  <Button onClick={() => setShowCreateModal(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Nova Receita
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <>
              <Card>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="-ml-2 h-8 font-medium"
                          onClick={() => handleColumnSort("patient")}
                        >
                          Paciente
                          {sortBy === "patient" ? (
                            sortOrder === "asc" ? (
                              <ArrowUp className="ml-1 h-4 w-4" />
                            ) : (
                              <ArrowDown className="ml-1 h-4 w-4" />
                            )
                          ) : (
                            <ArrowUpDown className="ml-1 h-4 w-4 opacity-50" />
                          )}
                        </Button>
                      </TableHead>
                      <TableHead>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="-ml-2 h-8 font-medium"
                          onClick={() => handleColumnSort("doctor")}
                        >
                          Médico
                          {sortBy === "doctor" ? (
                            sortOrder === "asc" ? (
                              <ArrowUp className="ml-1 h-4 w-4" />
                            ) : (
                              <ArrowDown className="ml-1 h-4 w-4" />
                            )
                          ) : (
                            <ArrowUpDown className="ml-1 h-4 w-4 opacity-50" />
                          )}
                        </Button>
                      </TableHead>
                      <TableHead>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="-ml-2 h-8 font-medium"
                          onClick={() => handleColumnSort("diagnosis")}
                        >
                          Diagnóstico
                          {sortBy === "diagnosis" ? (
                            sortOrder === "asc" ? (
                              <ArrowUp className="ml-1 h-4 w-4" />
                            ) : (
                              <ArrowDown className="ml-1 h-4 w-4" />
                            )
                          ) : (
                            <ArrowUpDown className="ml-1 h-4 w-4 opacity-50" />
                          )}
                        </Button>
                      </TableHead>
                      <TableHead>Medicamentos</TableHead>
                      <TableHead>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="-ml-2 h-8 font-medium"
                          onClick={() => handleColumnSort("date")}
                        >
                          Data
                          {sortBy === "date" ? (
                            sortOrder === "asc" ? (
                              <ArrowUp className="ml-1 h-4 w-4" />
                            ) : (
                              <ArrowDown className="ml-1 h-4 w-4" />
                            )
                          ) : (
                            <ArrowUpDown className="ml-1 h-4 w-4 opacity-50" />
                          )}
                        </Button>
                      </TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedPrescriptions.map(prescription => (
                      <TableRow key={prescription.id}>
                        <TableCell className="font-medium">{prescription.patient_name}</TableCell>
                        <TableCell>{prescription.attendant_name}</TableCell>
                        <TableCell>{prescription.diagnosis || "-"}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {prescription.medications.slice(0, 2).map((med, idx) => (
                              <Badge key={idx} variant="secondary" className="text-xs">
                                {med.name}
                              </Badge>
                            ))}
                            {prescription.medications.length > 2 && (
                              <Badge variant="outline" className="text-xs">
                                +{prescription.medications.length - 2}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {format(new Date(prescription.created_at), "dd/MM/yyyy", { locale: ptBR })}
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleViewPrescription(prescription)}>
                                <Eye className="h-4 w-4 mr-2" />
                                Visualizar
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleDeleteClick(prescription)} className="text-destructive">
                                <Trash2 className="h-4 w-4 mr-2" />
                                Excluir
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>

              {/* Pagination */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-6">
                <span className="text-xs text-muted-foreground">
                  {filteredPrescriptions.length > 0 ? (
                    <>Mostrando página {currentPage} de {totalPages} ({filteredPrescriptions.length} {filteredPrescriptions.length === 1 ? 'receita' : 'receitas'})</>
                  ) : (
                    <>Nenhuma receita encontrada</>
                  )}
                </span>
                
                {totalPages > 1 && (
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="h-8 px-2"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      <span className="hidden sm:inline ml-1">Anterior</span>
                    </Button>
                    
                    <div className="flex items-center gap-1">
                      {(() => {
                        const getVisiblePages = (): (number | string)[] => {
                          if (totalPages <= 5) {
                            return Array.from({ length: totalPages }, (_, i) => i + 1);
                          }
                          
                          const pages: (number | string)[] = [];
                          
                          if (currentPage <= 3) {
                            pages.push(1, 2, 3, 4, '...', totalPages);
                          } else if (currentPage >= totalPages - 2) {
                            pages.push(1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
                          } else {
                            pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages);
                          }
                          
                          return pages;
                        };
                        
                        return getVisiblePages().map((page, index) => (
                          page === '...' ? (
                            <span key={`ellipsis-${index}`} className="px-2 text-muted-foreground">...</span>
                          ) : (
                            <Button
                              key={page}
                              variant={currentPage === page ? "default" : "outline"}
                              size="sm"
                              onClick={() => setCurrentPage(page as number)}
                              className="h-8 w-8 p-0"
                            >
                              {page}
                            </Button>
                          )
                        ));
                      })()}
                    </div>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="h-8 px-2"
                    >
                      <span className="hidden sm:inline mr-1">Próxima</span>
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </div>
            </>
          )}
        </TabsContent>

        <TabsContent value="recent" className="mt-6">
          {recentPrescriptions.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <FileText className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-medium mb-2">Nenhuma receita recente</h3>
                <p className="text-muted-foreground">As receitas mais recentes aparecerão aqui</p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="-ml-2 h-8 font-medium"
                        onClick={() => handleColumnSort("patient")}
                      >
                        Paciente
                        {sortBy === "patient" ? (
                          sortOrder === "asc" ? (
                            <ArrowUp className="ml-1 h-4 w-4" />
                          ) : (
                            <ArrowDown className="ml-1 h-4 w-4" />
                          )
                        ) : (
                          <ArrowUpDown className="ml-1 h-4 w-4 opacity-50" />
                        )}
                      </Button>
                    </TableHead>
                    <TableHead>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="-ml-2 h-8 font-medium"
                        onClick={() => handleColumnSort("doctor")}
                      >
                        Médico
                        {sortBy === "doctor" ? (
                          sortOrder === "asc" ? (
                            <ArrowUp className="ml-1 h-4 w-4" />
                          ) : (
                            <ArrowDown className="ml-1 h-4 w-4" />
                          )
                        ) : (
                          <ArrowUpDown className="ml-1 h-4 w-4 opacity-50" />
                        )}
                      </Button>
                    </TableHead>
                    <TableHead>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="-ml-2 h-8 font-medium"
                        onClick={() => handleColumnSort("diagnosis")}
                      >
                        Diagnóstico
                        {sortBy === "diagnosis" ? (
                          sortOrder === "asc" ? (
                            <ArrowUp className="ml-1 h-4 w-4" />
                          ) : (
                            <ArrowDown className="ml-1 h-4 w-4" />
                          )
                        ) : (
                          <ArrowUpDown className="ml-1 h-4 w-4 opacity-50" />
                        )}
                      </Button>
                    </TableHead>
                    <TableHead>Medicamentos</TableHead>
                    <TableHead>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="-ml-2 h-8 font-medium"
                        onClick={() => handleColumnSort("date")}
                      >
                        Data
                        {sortBy === "date" ? (
                          sortOrder === "asc" ? (
                            <ArrowUp className="ml-1 h-4 w-4" />
                          ) : (
                            <ArrowDown className="ml-1 h-4 w-4" />
                          )
                        ) : (
                          <ArrowUpDown className="ml-1 h-4 w-4 opacity-50" />
                        )}
                      </Button>
                    </TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentPrescriptions.map(prescription => (
                    <TableRow key={prescription.id}>
                      <TableCell className="font-medium">{prescription.patient_name}</TableCell>
                      <TableCell>{prescription.attendant_name}</TableCell>
                      <TableCell>{prescription.diagnosis || "-"}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {prescription.medications.slice(0, 2).map((med, idx) => (
                            <Badge key={idx} variant="secondary" className="text-xs">
                              {med.name}
                            </Badge>
                          ))}
                          {prescription.medications.length > 2 && (
                            <Badge variant="outline" className="text-xs">
                              +{prescription.medications.length - 2}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {format(new Date(prescription.created_at), "dd/MM/yyyy", { locale: ptBR })}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleViewPrescription(prescription)}>
                              <Eye className="h-4 w-4 mr-2" />
                              Visualizar
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDeleteClick(prescription)} className="text-destructive">
                              <Trash2 className="h-4 w-4 mr-2" />
                              Excluir
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Modals */}
      <CreatePrescriptionModal
        open={showCreateModal}
        onOpenChange={setShowCreateModal}
        onSubmit={handleCreatePrescription}
      />

      <ViewPrescriptionModal
        prescription={selectedPrescription}
        open={showViewModal}
        onOpenChange={setShowViewModal}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Receita</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta receita? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeletePrescription} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Prescriptions;
