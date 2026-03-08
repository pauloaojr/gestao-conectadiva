import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { X, ChevronLeft, ChevronRight, Pill } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useAuth } from "@/contexts/AuthContext";
import { useAppointmentStatusConfigContext } from "@/contexts/AppointmentStatusConfigContext";

export interface ScheduleFilterState {
  status: string;
  patient: string;
  timeRange: { start: string; end: string };
  sortBy: string;
  sortOrder: "asc" | "desc";
}

interface ScheduleFiltersProps {
  onFiltersChange: (filters: ScheduleFilterState) => void;
  activeFiltersCount: number;
  defaultFilters?: Partial<ScheduleFilterState>;
  // Pagination props
  currentPage?: number;
  totalPages?: number;
  totalItems?: number;
  onPageChange?: (page: number) => void;
  showPagination?: boolean;
}

const ScheduleFilters = ({ 
  onFiltersChange, 
  activeFiltersCount, 
  defaultFilters,
  currentPage = 1,
  totalPages = 1,
  totalItems = 0,
  onPageChange,
  showPagination = false
}: ScheduleFiltersProps) => {
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const { statuses: statusConfig, getLabel: getStatusLabel } = useAppointmentStatusConfigContext();
  const [filters, setFilters] = useState<ScheduleFilterState>({
    status: "all",
    patient: "",
    timeRange: { start: "", end: "" },
    sortBy: "none",
    sortOrder: "asc",
    ...defaultFilters
  });

  useEffect(() => {
    if (defaultFilters) {
      setFilters(prev => ({ ...prev, ...defaultFilters }));
    }
  }, [defaultFilters]);

  const handleFilterChange = (key: keyof ScheduleFilterState, value: any) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    onFiltersChange(newFilters);
  };

  const clearAllFilters = () => {
    const clearedFilters: ScheduleFilterState = {
      status: "all",
      patient: "",
      timeRange: { start: "", end: "" },
      sortBy: "none",
      sortOrder: "asc"
    };
    setFilters(clearedFilters);
    onFiltersChange(clearedFilters);
  };

  const handlePrevPage = () => {
    if (onPageChange && currentPage > 1) {
      onPageChange(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (onPageChange && currentPage < totalPages) {
      onPageChange(currentPage + 1);
    }
  };

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

  return (
    <div className="w-full border rounded-lg bg-card p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-sm text-foreground">Filtros</h3>
        <div className="flex items-center gap-2">
          {hasPermission('medicalRecords') && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate('/receituario')}
                  className="h-auto p-1.5 text-primary hover:text-primary hover:bg-primary/10"
                >
                  <Pill className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Receituário</p>
              </TooltipContent>
            </Tooltip>
          )}
          {activeFiltersCount > 0 && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={clearAllFilters}
              className="text-destructive hover:text-destructive hover:bg-destructive/10 h-auto p-1 text-xs"
            >
              <X className="w-3 h-3 mr-1" />
              Limpar ({activeFiltersCount})
            </Button>
          )}
        </div>
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Status Filter */}
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-muted-foreground">Status</Label>
          <Select 
            value={filters.status} 
            onValueChange={(value) => handleFilterChange('status', value)}
          >
            <SelectTrigger className="h-9 text-sm">
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {statusConfig.map((s) => (
                <SelectItem key={s.id} value={s.key}>
                  {getStatusLabel(s.key)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Patient Filter */}
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-muted-foreground">Paciente</Label>
          <Input
            placeholder="Buscar..."
            value={filters.patient}
            onChange={(e) => handleFilterChange('patient', e.target.value)}
            className="h-9 text-sm"
          />
        </div>

        {/* Time Start */}
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-muted-foreground">Horário Início</Label>
          <Input
            type="time"
            value={filters.timeRange.start}
            onChange={(e) => handleFilterChange('timeRange', { ...filters.timeRange, start: e.target.value })}
            className="h-9 text-sm"
          />
        </div>

        {/* Time End */}
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-muted-foreground">Horário Fim</Label>
          <Input
            type="time"
            value={filters.timeRange.end}
            onChange={(e) => handleFilterChange('timeRange', { ...filters.timeRange, end: e.target.value })}
            className="h-9 text-sm"
          />
        </div>

        {/* Sort By */}
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-muted-foreground">Ordenar por</Label>
          <Select 
            value={filters.sortBy} 
            onValueChange={(value) => handleFilterChange('sortBy', value)}
          >
            <SelectTrigger className="h-9 text-sm">
              <SelectValue placeholder="Nenhum" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Nenhum</SelectItem>
              <SelectItem value="time">Horário</SelectItem>
              <SelectItem value="patient">Paciente</SelectItem>
              <SelectItem value="status">Status</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Sort Order */}
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-muted-foreground">Ordem</Label>
          <Select 
            value={filters.sortOrder} 
            onValueChange={(value) => handleFilterChange('sortOrder', value as "asc" | "desc")}
            disabled={filters.sortBy === "none"}
          >
            <SelectTrigger className="h-9 text-sm">
              <SelectValue placeholder="Crescente" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="asc">Crescente</SelectItem>
              <SelectItem value="desc">Decrescente</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Pagination */}
      {showPagination && totalPages > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-4 pt-4 border-t">
          <span className="text-xs text-muted-foreground">
            {totalItems > 0 ? (
              <>Mostrando página {currentPage} de {totalPages} ({totalItems} {totalItems === 1 ? 'item' : 'itens'})</>
            ) : (
              <>Nenhum item encontrado</>
            )}
          </span>
          
          {totalPages > 1 && (
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrevPage}
                disabled={currentPage === 1}
                className="h-8 px-2"
              >
                <ChevronLeft className="w-4 h-4" />
                <span className="hidden sm:inline ml-1">Anterior</span>
              </Button>
              
              <div className="flex items-center gap-1">
                {getVisiblePages().map((page, index) => (
                  page === '...' ? (
                    <span key={`ellipsis-${index}`} className="px-2 text-muted-foreground">...</span>
                  ) : (
                    <Button
                      key={page}
                      variant={currentPage === page ? "default" : "outline"}
                      size="sm"
                      onClick={() => onPageChange?.(page as number)}
                      className="h-8 w-8 p-0"
                    >
                      {page}
                    </Button>
                  )
                ))}
              </div>
              
              <Button
                variant="outline"
                size="sm"
                onClick={handleNextPage}
                disabled={currentPage === totalPages}
                className="h-8 px-2"
              >
                <span className="hidden sm:inline mr-1">Próxima</span>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ScheduleFilters;
