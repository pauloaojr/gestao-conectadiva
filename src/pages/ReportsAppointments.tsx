import { useMemo, useState, useEffect } from "react";
import { Calendar as CalendarIcon, ArrowUpDown, ArrowUp, ArrowDown, ListOrdered, Printer } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious, PaginationEllipsis } from "@/components/ui/pagination";
import { format, startOfMonth, endOfMonth, startOfDay, endOfDay, subDays, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useAppointments } from "@/hooks/useAppointments";
import { useProfiles } from "@/hooks/useProfiles";
import { useCustomizationContext } from "@/contexts/CustomizationContext";
import { useAppointmentStatusConfigContext } from "@/contexts/AppointmentStatusConfigContext";
import { escapeHtml, printHtmlDocument } from "@/lib/print";
import {
  AlertCircle,
  CheckCircle,
  XCircle,
} from "lucide-react";

type SortKey = "date" | "time" | "patient" | "professional" | "status";

const PAGE_SIZE_OPTIONS = [15, 30, 50, 100] as const;
const DEFAULT_PAGE_SIZE = 15;

const STATUS_CARD_STYLES: Record<string, { icon: typeof CheckCircle; bg: string; iconColor: string }> = {
  pending: { icon: AlertCircle, bg: "bg-yellow-100", iconColor: "text-yellow-600" },
  confirmed: { icon: CheckCircle, bg: "bg-green-100", iconColor: "text-green-600" },
  completed: { icon: CheckCircle, bg: "bg-blue-100", iconColor: "text-blue-600" },
  cancelled: { icon: XCircle, bg: "bg-red-100", iconColor: "text-red-600" },
};

export default function ReportsAppointments() {
  const { customizationData } = useCustomizationContext();
  const { statuses: statusConfig, getLabel: getStatusLabel } = useAppointmentStatusConfigContext();
  const { appointments: rawAppointments, isLoading } = useAppointments();
  const { profiles } = useProfiles();

  const [selectedPeriod, setSelectedPeriod] = useState<string>("custom");
  const [customDateRange, setCustomDateRange] = useState<{ from?: Date; to?: Date }>(() => {
    const now = new Date();
    return { from: startOfMonth(now), to: endOfMonth(now) };
  });
  const [showCustomDatePicker, setShowCustomDatePicker] = useState(false);
  const [patientFilter, setPatientFilter] = useState<string>("all");
  const [professionalFilter, setProfessionalFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<SortKey>("date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSizeOption, setPageSizeOption] = useState<string>(String(DEFAULT_PAGE_SIZE)); // "15" | "30" | "50" | "100" | "all"

  const attendants = useMemo(
    () => profiles.filter((p) => p.is_active && p.role === "user"),
    [profiles]
  );

  const patientOptions = useMemo(() => {
    const names = new Set(rawAppointments.map((a) => a.patient_name).filter(Boolean));
    return Array.from(names).sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [rawAppointments]);

  const { periodFrom, periodTo } = useMemo(() => {
    if (selectedPeriod === "all") {
      return {
        periodFrom: startOfDay(new Date(1970, 0, 1)),
        periodTo: endOfDay(new Date(2099, 11, 31)),
      };
    }
    const today = new Date();
    const range = customDateRange ?? {};
    const from = range.from ?? range.to;
    const to = range.to ?? range.from;
    if (selectedPeriod === "custom" && from) {
      return { periodFrom: startOfDay(from), periodTo: endOfDay(to ?? from) };
    }
    const daysBack = parseInt(String(selectedPeriod), 10);
    if (!Number.isNaN(daysBack) && daysBack > 0) {
      return {
        periodFrom: startOfDay(subDays(today, daysBack)),
        periodTo: endOfDay(today),
      };
    }
    return {
      periodFrom: startOfDay(subDays(today, 30)),
      periodTo: endOfDay(today),
    };
  }, [selectedPeriod, customDateRange]);

  const appointmentsForStatusCounts = useMemo(() => {
    let list = rawAppointments.filter((apt) => {
      const dateStr = (apt.appointment_date || "").slice(0, 10);
      const parts = dateStr.split("-").map(Number);
      if (parts.length !== 3 || parts.some(Number.isNaN)) return false;
      const [y, m, d] = parts;
      const aptDate = new Date(y, m - 1, d);
      if (Number.isNaN(aptDate.getTime())) return false;
      return aptDate >= periodFrom && aptDate <= periodTo;
    });
    if (patientFilter !== "all") {
      list = list.filter((apt) => (apt.patient_name || "").toLowerCase() === patientFilter.toLowerCase());
    }
    if (professionalFilter !== "all") {
      list = list.filter((apt) => apt.attendant_id === professionalFilter);
    }
    return list;
  }, [rawAppointments, periodFrom, periodTo, patientFilter, professionalFilter]);

  const filteredAppointments = useMemo(() => {
    if (statusFilter === "all") return appointmentsForStatusCounts;
    return appointmentsForStatusCounts.filter((apt) => apt.status === statusFilter);
  }, [appointmentsForStatusCounts, statusFilter]);

  const sortedAppointments = useMemo(() => {
    const dir = sortDir === "asc" ? 1 : -1;
    return [...filteredAppointments].sort((a, b) => {
      let cmp = 0;
      switch (sortBy) {
        case "date":
          cmp = a.appointment_date.localeCompare(b.appointment_date);
          if (cmp === 0) cmp = a.appointment_time.localeCompare(b.appointment_time);
          break;
        case "time":
          cmp = a.appointment_date.localeCompare(b.appointment_date);
          if (cmp === 0) cmp = a.appointment_time.localeCompare(b.appointment_time);
          break;
        case "patient":
          cmp = (a.patient_name || "").localeCompare(b.patient_name || "", "pt-BR");
          break;
        case "professional":
          cmp = (a.attendant_name || "").localeCompare(b.attendant_name || "", "pt-BR");
          break;
        case "status":
          cmp = (a.status || "").localeCompare(b.status || "", "pt-BR");
          break;
        default:
          cmp = a.appointment_date.localeCompare(b.appointment_date);
      }
      return cmp * dir;
    });
  }, [filteredAppointments, sortBy, sortDir]);

  const handleSort = (key: SortKey) => {
    if (sortBy === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortBy(key);
      setSortDir("asc");
    }
  };

  const SortIcon = ({ column }: { column: SortKey }) => {
    if (sortBy !== column) return <ArrowUpDown className="w-3.5 h-3.5 opacity-50" />;
    return sortDir === "asc" ? <ArrowUp className="w-3.5 h-3.5" /> : <ArrowDown className="w-3.5 h-3.5" />;
  };

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    statusConfig.forEach((s) => {
      counts[s.key] = appointmentsForStatusCounts.filter((apt) => apt.status === s.key).length;
    });
    return counts;
  }, [appointmentsForStatusCounts, statusConfig]);

  const totalItems = sortedAppointments.length;
  const effectivePageSize = pageSizeOption === "all" ? totalItems : Math.min(totalItems, parseInt(pageSizeOption, 10) || DEFAULT_PAGE_SIZE);
  const totalPages = effectivePageSize > 0 ? Math.ceil(totalItems / effectivePageSize) : 1;
  const startIndex = (currentPage - 1) * effectivePageSize;
  const paginatedAppointments = sortedAppointments.slice(startIndex, startIndex + effectivePageSize);

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedPeriod, customDateRange, patientFilter, professionalFilter, statusFilter, pageSizeOption]);

  useEffect(() => {
    if (currentPage > totalPages && totalPages >= 1) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  const handlePeriodChange = (value: string) => {
    setSelectedPeriod(value);
    setCurrentPage(1);
    if (value !== "custom") {
      setCustomDateRange({});
      setShowCustomDatePicker(false);
    } else {
      setShowCustomDatePicker(true);
    }
  };

  const handleDateRangeSelect = (range: { from?: Date; to?: Date } | undefined) => {
    if (range == null) return;
    const from = range.from ?? range.to;
    const to = range.to ?? range.from;
    const next = from ? { from, to: to ?? from } : {};
    setCustomDateRange(next);
    setCurrentPage(1);
    if (next.from && next.to) setShowCustomDatePicker(false);
  };

  const handlePrint = () => {
    const periodLabel =
      selectedPeriod === "all"
        ? "Todos os dias"
        : selectedPeriod === "custom"
        ? `${format(periodFrom, "dd/MM/yyyy", { locale: ptBR })} até ${format(periodTo, "dd/MM/yyyy", {
            locale: ptBR,
          })}`
        : `Últimos ${selectedPeriod} dias`;

    const rowsHtml = sortedAppointments
      .map((apt) => {
        const dateFormatted = format(parseISO(apt.appointment_date), "dd/MM/yyyy", {
          locale: ptBR,
        });
        return `
          <tr>
            <td>${escapeHtml(dateFormatted)}</td>
            <td>${escapeHtml(apt.appointment_time || "—")}</td>
            <td>${escapeHtml(apt.patient_name || "—")}</td>
            <td>${escapeHtml(apt.attendant_name || "—")}</td>
            <td>${escapeHtml(getStatusLabel(apt.status || ""))}</td>
          </tr>
        `;
      })
      .join("");

    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Relatório de Agendamentos</title>
          <style>
            * { box-sizing: border-box; }
            body {
              font-family: Arial, sans-serif;
              color: #111827;
              margin: 24px;
            }
            h1 {
              margin: 0 0 8px;
              color: ${customizationData.primaryColor || "#2563eb"};
            }
            .meta {
              margin: 0 0 16px;
              color: #4b5563;
              font-size: 13px;
              line-height: 1.5;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              font-size: 12px;
            }
            th, td {
              border: 1px solid #d1d5db;
              padding: 8px;
              text-align: left;
            }
            th {
              background: #f3f4f6;
              font-weight: 700;
            }
            .empty {
              margin-top: 16px;
              padding: 12px;
              border: 1px dashed #d1d5db;
              color: #6b7280;
            }
            @media print {
              body { margin: 12px; }
            }
          </style>
        </head>
        <body>
          <h1>Relatório de Agendamentos</h1>
          <p class="meta">
            Período: ${escapeHtml(periodLabel)}<br />
            Total de registros: ${sortedAppointments.length}
          </p>
          ${
            sortedAppointments.length === 0
              ? '<div class="empty">Nenhum agendamento encontrado para os filtros selecionados.</div>'
              : `
                <table>
                  <thead>
                    <tr>
                      <th>Data</th>
                      <th>Hora</th>
                      <th>Paciente</th>
                      <th>Profissional</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>${rowsHtml}</tbody>
                </table>
              `
          }
        </body>
      </html>
    `;

    printHtmlDocument({
      html: printContent,
      onPopupBlocked: () =>
        alert("Por favor, permita pop-ups para imprimir o relatório."),
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-6 p-4 lg:p-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-96 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in p-2 sm:p-4 lg:p-6">
      <div className="flex flex-col gap-4">
        <div className="flex items-start justify-between gap-3">
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Relatório de Agendamentos</h1>
          <Button variant="outline" onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-2" />
            Imprimir
          </Button>
        </div>

        <Card className="border-border/50 rounded-2xl">
          <CardContent className="p-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">Período</label>
                <div className="flex flex-col gap-2 sm:flex-row sm:gap-2">
                  <Select value={selectedPeriod} onValueChange={handlePeriodChange}>
                    <SelectTrigger className="w-full rounded-xl border-border/50">
                      <SelectValue placeholder="Período" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os dias</SelectItem>
                      <SelectItem value="7">Últimos 7 dias</SelectItem>
                      <SelectItem value="30">Últimos 30 dias</SelectItem>
                      <SelectItem value="90">Últimos 90 dias</SelectItem>
                      <SelectItem value="365">Último ano</SelectItem>
                      <SelectItem value="custom">Período personalizado</SelectItem>
                    </SelectContent>
                  </Select>
                  {selectedPeriod === "custom" && (
                    <Popover open={showCustomDatePicker} onOpenChange={setShowCustomDatePicker}>
                      <PopoverTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          className={cn(
                            "w-full sm:w-auto justify-start text-left font-normal rounded-xl border-border/50 shrink-0",
                            !customDateRange.from && !customDateRange.to && "text-muted-foreground"
                          )}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" style={{ color: customizationData?.primaryColor }} />
                          <span className="truncate">
                            {customDateRange.from && customDateRange.to ? (
                              `${format(customDateRange.from, "dd/MM/yyyy", { locale: ptBR })} - ${format(customDateRange.to, "dd/MM/yyyy", { locale: ptBR })}`
                            ) : (
                              "Selecionar datas"
                            )}
                          </span>
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent
                        className="w-auto p-0 rounded-2xl z-[100]"
                        align="start"
                        side="bottom"
                        sideOffset={8}
                        onPointerDownOutside={(e) => e.preventDefault()}
                        onInteractOutside={(e) => e.preventDefault()}
                      >
                        <Calendar
                          mode="range"
                          selected={{ from: customDateRange.from, to: customDateRange.to }}
                          onSelect={handleDateRangeSelect}
                          numberOfMonths={2}
                          locale={ptBR}
                          className="p-3"
                        />
                      </PopoverContent>
                    </Popover>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">Paciente</label>
                <Select value={patientFilter} onValueChange={setPatientFilter}>
                  <SelectTrigger className="w-full rounded-xl border-border/50">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {patientOptions.map((name) => (
                      <SelectItem key={name} value={name}>
                        {name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">Profissional</label>
                <Select value={professionalFilter} onValueChange={setProfessionalFilter}>
                  <SelectTrigger className="w-full rounded-xl border-border/50">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {attendants.map((p) => (
                      <SelectItem key={p.id} value={p.user_id || p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Cards por status — clique filtra pelo status */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
          {statusConfig.map((s) => {
            const style = STATUS_CARD_STYLES[s.key] || {
              icon: CheckCircle,
              bg: "bg-muted",
              iconColor: "text-muted-foreground",
            };
            const Icon = style.icon;
            const isSelected = statusFilter === s.key;
            return (
              <Card
                key={s.key}
                className={cn(
                  "rounded-2xl border-border/50 overflow-hidden cursor-pointer transition-all hover:shadow-md",
                  isSelected && "ring-2 ring-primary ring-offset-2"
                )}
                onClick={() => setStatusFilter(isSelected ? "all" : s.key)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className={cn("p-2 rounded-full", style.bg)}>
                      <Icon className={cn("w-4 h-4", style.iconColor)} />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-foreground">{statusCounts[s.key] ?? 0}</p>
                      <p className="text-xs text-muted-foreground">{getStatusLabel(s.key)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Tabela */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ListOrdered className="w-5 h-5" />
              Agendamentos
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              {filteredAppointments.length === 0
                ? "Nenhum agendamento para os filtros selecionados."
                : `${filteredAppointments.length} ${filteredAppointments.length === 1 ? "agendamento" : "agendamentos"}.`}
            </p>
          </CardHeader>
          <CardContent>
            {filteredAppointments.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground rounded-lg border border-dashed">
                Nenhum agendamento encontrado para os filtros selecionados.
              </div>
            ) : (
              <div className="overflow-x-auto rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="-ml-3 h-8 font-semibold hover:bg-muted/50 gap-1"
                          onClick={() => handleSort("date")}
                        >
                          Data
                          <SortIcon column="date" />
                        </Button>
                      </TableHead>
                      <TableHead>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="-ml-3 h-8 font-semibold hover:bg-muted/50 gap-1"
                          onClick={() => handleSort("time")}
                        >
                          Hora
                          <SortIcon column="time" />
                        </Button>
                      </TableHead>
                      <TableHead>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="-ml-3 h-8 font-semibold hover:bg-muted/50 gap-1"
                          onClick={() => handleSort("patient")}
                        >
                          Paciente
                          <SortIcon column="patient" />
                        </Button>
                      </TableHead>
                      <TableHead>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="-ml-3 h-8 font-semibold hover:bg-muted/50 gap-1"
                          onClick={() => handleSort("professional")}
                        >
                          Profissional
                          <SortIcon column="professional" />
                        </Button>
                      </TableHead>
                      <TableHead>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="-ml-3 h-8 font-semibold hover:bg-muted/50 gap-1"
                          onClick={() => handleSort("status")}
                        >
                          Status
                          <SortIcon column="status" />
                        </Button>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedAppointments.map((apt) => (
                      <TableRow key={apt.id}>
                        <TableCell className="font-medium whitespace-nowrap">
                          {format(parseISO(apt.appointment_date), "dd/MM/yyyy", { locale: ptBR })}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-muted-foreground">
                          {apt.appointment_time}
                        </TableCell>
                        <TableCell className="max-w-[180px] truncate" title={apt.patient_name ?? undefined}>
                          {apt.patient_name || "—"}
                        </TableCell>
                        <TableCell className="max-w-[180px] truncate text-muted-foreground text-sm" title={apt.attendant_name ?? undefined}>
                          {apt.attendant_name || "—"}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="font-medium">
                            {getStatusLabel(apt.status)}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {/* Paginação: esquerda = texto, centro = paginação, direita = itens por página */}
            {filteredAppointments.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-3 items-center gap-4 mt-4 pt-4 border-t">
                <div className="text-sm text-muted-foreground order-2 sm:order-1 sm:justify-self-start">
                  {totalItems === 0 ? "0 de 0" : `${startIndex + 1} a ${Math.min(startIndex + effectivePageSize, totalItems)} de ${totalItems}`}
                </div>
                <div className="flex justify-center order-1 sm:order-2 sm:justify-self-center">
                {totalPages > 1 && (
                  <Pagination>
                    <PaginationContent className="flex-wrap gap-1">
                      <PaginationItem>
                        <PaginationPrevious
                          href="#"
                          onClick={(e) => {
                            e.preventDefault();
                            if (currentPage > 1) setCurrentPage(currentPage - 1);
                          }}
                          className={cn(
                            "text-xs sm:text-sm",
                            currentPage <= 1 ? "pointer-events-none opacity-50" : "cursor-pointer"
                          )}
                        />
                      </PaginationItem>
                      {(() => {
                        const pages: (number | string)[] = [];
                        if (totalPages <= 7) {
                          for (let i = 1; i <= totalPages; i++) pages.push(i);
                        } else {
                          pages.push(1);
                          if (currentPage > 3) pages.push("...");
                          const start = Math.max(2, currentPage - 1);
                          const end = Math.min(totalPages - 1, currentPage + 1);
                          for (let i = start; i <= end; i++) if (!pages.includes(i)) pages.push(i);
                          if (currentPage < totalPages - 2) pages.push("...");
                          if (totalPages > 1) pages.push(totalPages);
                        }
                        return pages.map((page, index) =>
                          page === "..." ? (
                            <PaginationItem key={`ellipsis-${index}`}>
                              <PaginationEllipsis />
                            </PaginationItem>
                          ) : (
                            <PaginationItem key={page}>
                              <PaginationLink
                                href="#"
                                onClick={(e) => {
                                  e.preventDefault();
                                  setCurrentPage(page as number);
                                }}
                                isActive={currentPage === page}
                                className="cursor-pointer text-xs sm:text-sm"
                              >
                                {page}
                              </PaginationLink>
                            </PaginationItem>
                          )
                        );
                      })()}
                      <PaginationItem>
                        <PaginationNext
                          href="#"
                          onClick={(e) => {
                            e.preventDefault();
                            if (currentPage < totalPages) setCurrentPage(currentPage + 1);
                          }}
                          className={cn(
                            "text-xs sm:text-sm",
                            currentPage >= totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"
                          )}
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                )}
                </div>
                <div className="flex justify-end order-3 sm:justify-self-end">
                  <Select value={pageSizeOption} onValueChange={setPageSizeOption}>
                    <SelectTrigger className="w-[100px] h-9 rounded-lg">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PAGE_SIZE_OPTIONS.map((n) => (
                        <SelectItem key={n} value={String(n)}>
                          {n}
                        </SelectItem>
                      ))}
                      <SelectItem value="all">Todos</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
