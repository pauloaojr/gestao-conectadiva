import { useState } from "react";
import { FileText, Download, TrendingUp, Calendar, Users, Clock, CalendarIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line, PieChart, Pie, Cell } from "recharts";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import StatCard from "@/components/StatCard";
import { useReports } from "@/hooks/useReports";
import { useCustomizationContext } from "@/contexts/CustomizationContext";
import { printHtmlDocument } from "@/lib/print";

const chartConfig = {
  consultas: {
    label: "Consultas",
    color: "#3b82f6",
  },
};

const Reports = () => {
  const {
    appointments,
    stats,
    monthlyData,
    serviceTypeData,
    isLoading,
    selectedPeriod,
    setSelectedPeriod,
    customDateRange,
    setCustomDateRange
  } = useReports();
  
  const { customizationData } = useCustomizationContext();

  const [selectedChart, setSelectedChart] = useState("bar");
  const [showCustomDatePicker, setShowCustomDatePicker] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Pagination calculations
  const totalPages = Math.ceil(appointments.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedAppointments = appointments.slice(startIndex, endIndex);

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

  const handleDateRangeSelect = (range: { from?: Date; to?: Date }) => {
    setCustomDateRange(range);
    setCurrentPage(1);
  };

  const getDisplayPeriod = () => {
    if (selectedPeriod === "custom" && customDateRange.from && customDateRange.to) {
      return `${format(customDateRange.from, "dd/MM/yyyy", { locale: ptBR })} - ${format(customDateRange.to, "dd/MM/yyyy", { locale: ptBR })}`;
    }
    
    switch (selectedPeriod) {
      case "7": return "Últimos 7 dias";
      case "30": return "Últimos 30 dias";
      case "90": return "Últimos 90 dias";
      case "365": return "Último ano";
      default: return "Período personalizado";
    }
  };

  const handleGenerateReport = () => {
    const reportData = {
      period: selectedPeriod,
      totalConsultas: stats.totalConsultas,
      appointments: appointments,
      generatedAt: new Date().toLocaleString('pt-BR')
    };

    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Relatório Clínico - ${customizationData.appName || 'Clínica Médica'}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          .header { text-align: center; margin-bottom: 30px; }
          .header img { max-height: 60px; max-width: 200px; margin-bottom: 10px; }
          .clinic-name { font-size: 24px; font-weight: bold; color: #333; margin-bottom: 4px; }
          .clinic-subtitle { font-size: 14px; color: #666; margin-bottom: 8px; }
          .report-title { font-size: 20px; font-weight: bold; color: #1a1a1a; margin: 15px 0 5px 0; }
          .stats { display: flex; justify-content: space-around; margin: 20px 0; flex-wrap: wrap; gap: 10px; }
          .stat-card { text-align: center; padding: 15px; border: 1px solid #ddd; border-radius: 8px; min-width: 150px; }
          .stat-card h3 { margin: 0 0 8px 0; font-size: 14px; color: #666; }
          .stat-card p { margin: 0; font-size: 24px; font-weight: bold; color: #333; }
          table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
          th { background-color: #f8f9fa; font-weight: 600; }
          .status-completed { color: #059669; font-weight: 500; }
          .status-confirmed { color: #2563eb; font-weight: 500; }
          .status-cancelled { color: #dc2626; font-weight: 500; }
          .status-pending { color: #d97706; font-weight: 500; }
          @media print { body { margin: 0; } }
        </style>
      </head>
      <body>
        <div class="header">
          ${customizationData.logoUrl ? `<img src="${customizationData.logoUrl}" alt="Logo" />` : ''}
          <div class="clinic-name">${customizationData.appName || 'Clínica Médica'}</div>
          <div class="clinic-subtitle">${customizationData.appSubtitle || 'Sistema de Gestão Médica'}</div>
          <div class="report-title">Relatório Clínico</div>
          <p>Período: ${getDisplayPeriod()}</p>
          <p>Gerado em: ${reportData.generatedAt}</p>
        </div>
        
        <div class="stats">
          <div class="stat-card">
            <h3>Total de Consultas</h3>
            <p>${stats.totalConsultas}</p>
          </div>
          <div class="stat-card">
            <h3>Pacientes Únicos</h3>
            <p>${stats.pacientesUnicos}</p>
          </div>
          <div class="stat-card">
            <h3>Taxa de Comparecimento</h3>
            <p>${stats.taxaComparecimento}%</p>
          </div>
          <div class="stat-card">
            <h3>Consultas Concluídas</h3>
            <p>${stats.consultasConcluidas}</p>
          </div>
        </div>

        <h2>Consultas do Período</h2>
        <table>
          <thead>
            <tr>
              <th>Paciente</th>
              <th>Data</th>
              <th>Horário</th>
              <th>Serviço</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${appointments.map(apt => `
              <tr>
                <td>${apt.patient_name}</td>
                <td>${apt.formattedDate}</td>
                <td>${apt.appointment_time}</td>
                <td>${apt.service_name || 'Consulta'}</td>
                <td class="status-${apt.status}">${apt.statusLabel}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </body>
      </html>
    `;

    printHtmlDocument({
      html: printContent,
      onPopupBlocked: () =>
        alert("Por favor, permita pop-ups para gerar o relatório."),
    });
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "completed":
        return "default";
      case "confirmed":
        return "secondary";
      case "cancelled":
        return "destructive";
      case "pending":
        return "outline";
      default:
        return "secondary";
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4 sm:space-y-6 animate-fade-in p-2 sm:p-4 lg:p-6">
        <div className="flex flex-col space-y-4 lg:flex-row lg:items-center lg:justify-between lg:space-y-0">
          <div className="space-y-1">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-64" />
          </div>
          <div className="flex gap-3">
            <Skeleton className="h-10 w-40" />
            <Skeleton className="h-10 w-32" />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6">
          <Skeleton className="h-96" />
          <Skeleton className="h-96" />
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 animate-fade-in p-2 sm:p-4 lg:p-6">
      {/* Header */}
      <div className="flex flex-col space-y-4 lg:flex-row lg:items-center lg:justify-between lg:space-y-0">
        <div className="space-y-1">
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Relatórios</h1>
          <p className="text-sm sm:text-base text-muted-foreground">Análises e estatísticas do seu consultório.</p>
        </div>
        
        <div className="flex flex-col space-y-3 sm:flex-row sm:space-y-0 sm:space-x-3">
          <div className="flex items-center gap-2">
            <Select value={selectedPeriod} onValueChange={handlePeriodChange}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Período" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Últimos 7 dias</SelectItem>
                <SelectItem value="30">Últimos 30 dias</SelectItem>
                <SelectItem value="90">Últimos 90 dias</SelectItem>
                <SelectItem value="365">Último ano</SelectItem>
                <SelectItem value="custom">Período personalizado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {selectedPeriod === "custom" && (
            <Popover open={showCustomDatePicker} onOpenChange={setShowCustomDatePicker}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full sm:w-60 justify-start text-left font-normal text-xs sm:text-sm",
                    !customDateRange.from && !customDateRange.to && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  <span className="truncate">
                    {customDateRange.from && customDateRange.to ? (
                      `${format(customDateRange.from, "dd/MM/yyyy", { locale: ptBR })} - ${format(customDateRange.to, "dd/MM/yyyy", { locale: ptBR })}`
                    ) : (
                      "Selecionar datas"
                    )}
                  </span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarComponent
                  mode="range"
                  selected={{
                    from: customDateRange.from,
                    to: customDateRange.to,
                  }}
                  onSelect={handleDateRangeSelect}
                  numberOfMonths={2}
                  locale={ptBR}
                  className={cn("p-3 pointer-events-auto")}
                />
                <div className="p-3 border-t">
                  <Button
                    onClick={() => setShowCustomDatePicker(false)}
                    className="w-full"
                    size="sm"
                  >
                    Aplicar Filtro
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
          )}

          <Button onClick={handleGenerateReport} className="clinic-gradient text-white hover:opacity-90 w-full sm:w-auto">
            <Download className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">Gerar Relatório</span>
            <span className="sm:hidden">Relatório</span>
          </Button>
        </div>
      </div>

      {/* Period Display */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4" />
          <span className="text-xs sm:text-sm">Exibindo dados para: <strong className="text-foreground">{getDisplayPeriod()}</strong></span>
        </div>
        {appointments.length > 0 && (
          <Badge variant="secondary" className="self-start sm:self-auto">
            {appointments.length} consultas
          </Badge>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
        <StatCard
          title="Total de Consultas"
          value={stats.totalConsultas.toString()}
          subtitle="No período selecionado"
          icon={Calendar}
          iconColor="text-blue-600"
        />
        <StatCard
          title="Pacientes Atendidos"
          value={stats.pacientesUnicos.toString()}
          subtitle="Pacientes únicos"
          icon={Users}
          iconColor="text-green-600"
        />
        <StatCard
          title="Taxa de Comparecimento"
          value={`${stats.taxaComparecimento}%`}
          subtitle="Consultas realizadas"
          icon={TrendingUp}
          iconColor="text-purple-600"
        />
        <StatCard
          title="Consultas Concluídas"
          value={stats.consultasConcluidas.toString()}
          subtitle="No período selecionado"
          icon={FileText}
          iconColor="text-orange-600"
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6">
        {/* Monthly Consultations Chart */}
        <Card className="shadow-sm border-0">
          <CardHeader className="pb-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <CardTitle className="text-base sm:text-lg text-foreground">Consultas Mensais</CardTitle>
              <Select value={selectedChart} onValueChange={setSelectedChart}>
                <SelectTrigger className="w-full sm:w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bar">Barras</SelectItem>
                  <SelectItem value="line">Linha</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent className="p-2 sm:p-6">
            {monthlyData.length > 0 ? (
              <ChartContainer config={chartConfig} className="h-64 sm:h-80">
                {selectedChart === "bar" ? (
                  <BarChart data={monthlyData} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="month" 
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis 
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                    />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="consultas" fill="var(--color-consultas)" radius={4} />
                  </BarChart>
                ) : (
                  <LineChart data={monthlyData} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="month" 
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis 
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                    />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Line type="monotone" dataKey="consultas" stroke="var(--color-consultas)" strokeWidth={3} />
                  </LineChart>
                )}
              </ChartContainer>
            ) : (
              <div className="h-64 sm:h-80 flex items-center justify-center text-muted-foreground">
                <p>Nenhum dado disponível</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Service Types Distribution */}
        <Card className="shadow-sm border-0">
          <CardHeader className="pb-3">
            <CardTitle className="text-base sm:text-lg text-foreground">Tipos de Serviço</CardTitle>
          </CardHeader>
          <CardContent className="p-2 sm:p-6">
            {serviceTypeData.length > 0 ? (
              <ChartContainer config={chartConfig} className="h-64 sm:h-80">
                <PieChart>
                  <Pie
                    data={serviceTypeData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => {
                      const isMobile = window.innerWidth < 640;
                      return isMobile ? `${(percent * 100).toFixed(0)}%` : `${name.substring(0, 15)}${name.length > 15 ? '...' : ''} ${(percent * 100).toFixed(0)}%`;
                    }}
                    outerRadius={window.innerWidth < 640 ? 60 : 80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {serviceTypeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <ChartTooltip content={<ChartTooltipContent />} />
                </PieChart>
              </ChartContainer>
            ) : (
              <div className="h-64 sm:h-80 flex items-center justify-center text-muted-foreground">
                <p>Nenhum dado disponível</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Appointments Table */}
      <Card className="shadow-sm border-0">
        <CardHeader className="p-3 sm:p-6">
          <CardTitle className="text-base sm:text-lg text-foreground flex flex-col sm:flex-row sm:items-center gap-2">
            <div className="flex items-center gap-2">
              <Clock className="w-4 sm:w-5 h-4 sm:h-5" />
              <span>Consultas do Período</span>
            </div>
            {appointments.length > 0 && (
              <Badge variant="secondary" className="self-start sm:self-auto">
                {appointments.length} total
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0 sm:p-6 sm:pt-0">
          {appointments.length > 0 ? (
            <div className="space-y-4">
              {/* Mobile Cards View */}
              <div className="block sm:hidden space-y-3 p-3">
                {paginatedAppointments.map((appointment) => (
                  <Card key={appointment.id} className="p-4 border border-border">
                    <div className="space-y-2">
                      <div className="flex justify-between items-start">
                        <h4 className="font-medium text-sm">{appointment.patient_name}</h4>
                        <Badge variant={getStatusBadgeVariant(appointment.status)} className="text-xs">
                          {appointment.statusLabel}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                        <div>
                          <span className="font-medium">Data:</span> {appointment.formattedDate}
                        </div>
                        <div>
                          <span className="font-medium">Horário:</span> {appointment.appointment_time}
                        </div>
                        <div className="col-span-2">
                          <span className="font-medium">Serviço:</span> {appointment.service_name || 'Consulta'}
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>

              {/* Desktop Table View */}
              <div className="hidden sm:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[150px]">Paciente</TableHead>
                      <TableHead className="min-w-[100px]">Data</TableHead>
                      <TableHead className="min-w-[80px]">Horário</TableHead>
                      <TableHead className="min-w-[150px]">Serviço</TableHead>
                      <TableHead className="min-w-[100px]">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedAppointments.map((appointment) => (
                      <TableRow key={appointment.id}>
                        <TableCell className="font-medium">{appointment.patient_name}</TableCell>
                        <TableCell>{appointment.formattedDate}</TableCell>
                        <TableCell>{appointment.appointment_time}</TableCell>
                        <TableCell>{appointment.service_name || 'Consulta'}</TableCell>
                        <TableCell>
                          <Badge variant={getStatusBadgeVariant(appointment.status)}>
                            {appointment.statusLabel}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              
              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-3 sm:p-0">
                  <div className="text-xs sm:text-sm text-muted-foreground order-2 sm:order-1">
                    Mostrando {startIndex + 1} a {Math.min(endIndex, appointments.length)} de {appointments.length} consultas
                  </div>
                  <Pagination className="order-1 sm:order-2">
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
                      
                      {Array.from({ length: totalPages }, (_, i) => i + 1)
                        .filter(page => {
                          if (window.innerWidth < 640) {
                            return Math.abs(page - currentPage) <= 1;
                          }
                          return true;
                        })
                        .map((page) => (
                          <PaginationItem key={page}>
                            <PaginationLink
                              href="#"
                              onClick={(e) => {
                                e.preventDefault();
                                setCurrentPage(page);
                              }}
                              isActive={currentPage === page}
                              className="cursor-pointer text-xs sm:text-sm"
                            >
                              {page}
                            </PaginationLink>
                          </PaginationItem>
                        ))}
                      
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
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground p-3">
              <Calendar className="w-8 sm:w-12 h-8 sm:h-12 mx-auto mb-4 opacity-50" />
              <p className="text-sm sm:text-base">Nenhuma consulta encontrada no período selecionado.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Reports;
