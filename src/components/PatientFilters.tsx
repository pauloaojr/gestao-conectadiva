
import { useState } from "react";
import { Filter, X, ArrowUpDown, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

export interface FilterState {
  status: string;
  gender: string;
  planId: string;
  ageRange: { min: string; max: string };
  sessionsRange: { min: string; max: string };
  lastConsultationRange: { start: string; end: string };
  sortBy: string;
  sortOrder: "asc" | "desc";
}

interface PatientFiltersProps {
  onFiltersChange: (filters: FilterState) => void;
  activeFiltersCount: number;
  plans: { id: string; name: string }[];
}

const PatientFilters = ({ onFiltersChange, activeFiltersCount, plans = [] }: PatientFiltersProps) => {
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

  const [open, setOpen] = useState(false);

  const handleFilterChange = (key: keyof FilterState, value: any) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    onFiltersChange(newFilters);
  };

  const clearFilters = () => {
    const emptyFilters: FilterState = {
      status: "all",
      gender: "all",
      planId: "all",
      ageRange: { min: "", max: "" },
      sessionsRange: { min: "", max: "" },
      lastConsultationRange: { start: "", end: "" },
      sortBy: "none",
      sortOrder: "asc"
    };
    setFilters(emptyFilters);
    onFiltersChange(emptyFilters);
  };

  const clearSpecificFilter = (filterKey: string) => {
    let newFilters = { ...filters };
    
    switch (filterKey) {
      case 'status':
        newFilters.status = "all";
        break;
      case 'gender':
        newFilters.gender = "all";
        break;
      case 'plan':
        newFilters.planId = "all";
        break;
      case 'age':
        newFilters.ageRange = { min: "", max: "" };
        break;
      case 'sessions':
        newFilters.sessionsRange = { min: "", max: "" };
        break;
      case 'consultation':
        newFilters.lastConsultationRange = { start: "", end: "" };
        break;
      case 'sort':
        newFilters.sortBy = "none";
        newFilters.sortOrder = "asc";
        break;
    }
    
    setFilters(newFilters);
    onFiltersChange(newFilters);
  };

  const getActiveFilterBadges = () => {
    const badges = [];
    
    if (filters.status && filters.status !== "all") {
      badges.push(
        <Badge key="status" variant="secondary" className="flex items-center gap-1">
          Status: {filters.status}
          <X className="w-3 h-3 cursor-pointer" onClick={() => clearSpecificFilter('status')} />
        </Badge>
      );
    }
    
    if (filters.gender && filters.gender !== "all") {
      badges.push(
        <Badge key="gender" variant="secondary" className="flex items-center gap-1">
          Gênero: {filters.gender}
          <X className="w-3 h-3 cursor-pointer" onClick={() => clearSpecificFilter('gender')} />
        </Badge>
      );
    }
    if (filters.planId && filters.planId !== "all") {
      const planName = plans.find(p => p.id === filters.planId)?.name ?? filters.planId;
      badges.push(
        <Badge key="plan" variant="secondary" className="flex items-center gap-1">
          Plano: {planName}
          <X className="w-3 h-3 cursor-pointer" onClick={() => clearSpecificFilter('plan')} />
        </Badge>
      );
    }
    if (filters.ageRange.min || filters.ageRange.max) {
      const ageText = `${filters.ageRange.min || '0'}-${filters.ageRange.max || '∞'} anos`;
      badges.push(
        <Badge key="age" variant="secondary" className="flex items-center gap-1">
          Idade: {ageText}
          <X className="w-3 h-3 cursor-pointer" onClick={() => clearSpecificFilter('age')} />
        </Badge>
      );
    }
    
    if (filters.sessionsRange.min || filters.sessionsRange.max) {
      const sessionsText = `${filters.sessionsRange.min || '0'}-${filters.sessionsRange.max || '∞'} sessões`;
      badges.push(
        <Badge key="sessions" variant="secondary" className="flex items-center gap-1">
          Sessões: {sessionsText}
          <X className="w-3 h-3 cursor-pointer" onClick={() => clearSpecificFilter('sessions')} />
        </Badge>
      );
    }
    
    if (filters.sortBy && filters.sortBy !== "none") {
      badges.push(
        <Badge key="sort" variant="secondary" className="flex items-center gap-1">
          Ordenar: {filters.sortBy} ({filters.sortOrder === 'asc' ? '↑' : '↓'})
          <X className="w-3 h-3 cursor-pointer" onClick={() => clearSpecificFilter('sort')} />
        </Badge>
      );
    }
    
    return badges;
  };

  return (
    <div className="space-y-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" className="flex items-center gap-2 relative">
            <Filter className="w-4 h-4" />
            Filtros
            {activeFiltersCount > 0 && (
              <span className="absolute -top-2 -right-2 bg-blue-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {activeFiltersCount}
              </span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-96" align="end">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">Filtros Avançados</h4>
              {activeFiltersCount > 0 && (
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  <X className="w-4 h-4" />
                  Limpar Todos
                </Button>
              )}
            </div>

            {/* Status Filter */}
            <div className="space-y-2">
              <Label>Status do Paciente</Label>
              <Select value={filters.status} onValueChange={(value) => handleFilterChange("status", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos os status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="Ativo">Ativo</SelectItem>
                  <SelectItem value="Inativo">Inativo</SelectItem>
                  <SelectItem value="Suspenso">Suspenso</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Gender Filter */}
            <div className="space-y-2">
              <Label>Gênero</Label>
              <Select value={filters.gender} onValueChange={(value) => handleFilterChange("gender", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos os gêneros" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="Masculino">Masculino</SelectItem>
                  <SelectItem value="Feminino">Feminino</SelectItem>
                  <SelectItem value="Outro">Outro</SelectItem>
                  <SelectItem value="Não informado">Não informado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Plan Filter */}
            <div className="space-y-2">
              <Label>Plano</Label>
              <Select value={filters.planId} onValueChange={(value) => handleFilterChange("planId", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos os planos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="none">Sem plano</SelectItem>
                  {plans.map((plan) => (
                    <SelectItem key={plan.id} value={plan.id}>
                      {plan.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Age Range Filter */}
            <div className="space-y-2">
              <Label>Faixa Etária (anos)</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="Mín"
                  type="number"
                  min="0"
                  max="120"
                  value={filters.ageRange.min}
                  onChange={(e) => handleFilterChange("ageRange", { ...filters.ageRange, min: e.target.value })}
                />
                <Input
                  placeholder="Máx"
                  type="number"
                  min="0"
                  max="120"
                  value={filters.ageRange.max}
                  onChange={(e) => handleFilterChange("ageRange", { ...filters.ageRange, max: e.target.value })}
                />
              </div>
            </div>

            {/* Sessions Range Filter */}
            <div className="space-y-2">
              <Label>Número de Sessões</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="Mín"
                  type="number"
                  min="0"
                  value={filters.sessionsRange.min}
                  onChange={(e) => handleFilterChange("sessionsRange", { ...filters.sessionsRange, min: e.target.value })}
                />
                <Input
                  placeholder="Máx"
                  type="number"
                  min="0"
                  value={filters.sessionsRange.max}
                  onChange={(e) => handleFilterChange("sessionsRange", { ...filters.sessionsRange, max: e.target.value })}
                />
              </div>
            </div>

            {/* Last Consultation Date Range */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Período da Última Consulta
              </Label>
              <div className="flex gap-2">
                <Input
                  placeholder="Data inicial"
                  type="date"
                  value={filters.lastConsultationRange.start}
                  onChange={(e) => handleFilterChange("lastConsultationRange", { ...filters.lastConsultationRange, start: e.target.value })}
                />
                <Input
                  placeholder="Data final"
                  type="date"
                  value={filters.lastConsultationRange.end}
                  onChange={(e) => handleFilterChange("lastConsultationRange", { ...filters.lastConsultationRange, end: e.target.value })}
                />
              </div>
            </div>

            <Separator />

            {/* Sort Options */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <ArrowUpDown className="w-4 h-4" />
                Ordenação
              </Label>
              <div className="flex gap-2">
                <Select value={filters.sortBy} onValueChange={(value) => handleFilterChange("sortBy", value)}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Ordenar por..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sem ordenação</SelectItem>
                    <SelectItem value="name">Nome</SelectItem>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="phone">Telefone</SelectItem>
                    <SelectItem value="age">Idade</SelectItem>
                    <SelectItem value="plan">Plano</SelectItem>
                    <SelectItem value="status">Status</SelectItem>
                    <SelectItem value="sessions">Sessões</SelectItem>
                    <SelectItem value="lastConsultation">Última Consulta</SelectItem>
                  </SelectContent>
                </Select>
                <Select 
                  value={filters.sortOrder} 
                  onValueChange={(value: "asc" | "desc") => handleFilterChange("sortOrder", value)}
                  disabled={!filters.sortBy || filters.sortBy === "none"}
                >
                  <SelectTrigger className="w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="asc">↑</SelectItem>
                    <SelectItem value="desc">↓</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {/* Active Filters Display */}
      {activeFiltersCount > 0 && (
        <div className="flex flex-wrap gap-2">
          {getActiveFilterBadges()}
        </div>
      )}
    </div>
  );
};

export default PatientFilters;
