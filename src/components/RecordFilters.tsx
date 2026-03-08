
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Filter, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";

interface RecordFiltersProps {
  onFiltersChange: (filters: {
    status: string[];
    dateRange: string;
  }) => void;
  activeFiltersCount: number;
}

export const RecordFilters = ({ onFiltersChange, activeFiltersCount }: RecordFiltersProps) => {
  const [filters, setFilters] = useState({
    status: [] as string[],
    dateRange: "",
  });
  const [isOpen, setIsOpen] = useState(false);

  const statusOptions = [
    { value: "Em Tratamento", label: "Em Tratamento" },
    { value: "Iniciando", label: "Iniciando" },
    { value: "Concluído", label: "Concluído" },
    { value: "Pausado", label: "Pausado" },
  ];

  const dateRangeOptions = [
    { value: "7days", label: "Últimos 7 dias" },
    { value: "30days", label: "Últimos 30 dias" },
    { value: "3months", label: "Últimos 3 meses" },
    { value: "6months", label: "Últimos 6 meses" },
  ];

  const handleStatusChange = (status: string, checked: boolean) => {
    const newStatus = checked
      ? [...filters.status, status]
      : filters.status.filter(s => s !== status);
    
    const newFilters = { ...filters, status: newStatus };
    setFilters(newFilters);
    onFiltersChange(newFilters);
  };

  const handleDateRangeChange = (dateRange: string, checked: boolean) => {
    const newDateRange = checked ? dateRange : "";
    const newFilters = { ...filters, dateRange: newDateRange };
    setFilters(newFilters);
    onFiltersChange(newFilters);
  };

  const clearAllFilters = () => {
    const clearedFilters = { status: [], dateRange: "" };
    setFilters(clearedFilters);
    onFiltersChange(clearedFilters);
    setIsOpen(false);
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="gap-2 h-10">
          <Filter className="w-4 h-4" />
          Filtros
          {activeFiltersCount > 0 && (
            <Badge variant="secondary" className="ml-1 h-5 min-w-5 text-xs">
              {activeFiltersCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium text-sm">Filtros</h3>
            {activeFiltersCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearAllFilters}
                className="h-auto p-1 text-xs text-muted-foreground hover:text-foreground"
              >
                <X className="w-3 h-3 mr-1" />
                Limpar
              </Button>
            )}
          </div>

          <div className="space-y-4">
            {/* Status do Tratamento */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Status do Tratamento</Label>
              <div className="space-y-2">
                {statusOptions.map((option) => (
                  <div key={option.value} className="flex items-center space-x-2">
                    <Checkbox
                      id={`status-${option.value}`}
                      checked={filters.status.includes(option.value)}
                      onCheckedChange={(checked) => handleStatusChange(option.value, checked as boolean)}
                    />
                    <Label
                      htmlFor={`status-${option.value}`}
                      className="text-sm font-normal cursor-pointer"
                    >
                      {option.label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            {/* Período de Atualização */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Período de Atualização</Label>
              <div className="space-y-2">
                {dateRangeOptions.map((option) => (
                  <div key={option.value} className="flex items-center space-x-2">
                    <Checkbox
                      id={`date-${option.value}`}
                      checked={filters.dateRange === option.value}
                      onCheckedChange={(checked) => handleDateRangeChange(option.value, checked as boolean)}
                    />
                    <Label
                      htmlFor={`date-${option.value}`}
                      className="text-sm font-normal cursor-pointer"
                    >
                      {option.label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};
