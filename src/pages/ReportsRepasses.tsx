import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Skeleton } from "@/components/ui/skeleton";
import { format, startOfMonth, endOfMonth, startOfDay, endOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { DollarSign, Calendar as CalendarIcon, Loader2, Wallet, Download, Users, ArrowUpDown, ArrowUp, ArrowDown, Columns3 } from "lucide-react";
import { useRepasses, type RepasseRow, type RepasseStatus } from "@/hooks/useRepasses";
import { useCommissionRules } from "@/hooks/useCommissionRules";
import { usePatients } from "@/hooks/usePatients";
import { useProfiles } from "@/hooks/useProfiles";
import { useCustomizationContext } from "@/contexts/CustomizationContext";
import { useAuth } from "@/contexts/AuthContext";
import { canSeeAllRepasses } from "@/utils/reportsVisibility";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { escapeHtml, printHtmlDocument } from "@/lib/print";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

/** Interpreta string YYYY-MM-DD como data local (evita 1 dia a menos por UTC). */
function parseLocalDateOnly(dateStr: string): Date {
  const s = String(dateStr).slice(0, 10);
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

const STATUS_LABELS: Record<RepasseStatus, string> = {
  pendente: "Pendente",
  pagar: "Pagar",
  pago: "Pago",
};

type RepasseColumnId = "dateConsult" | "dateReceipt" | "patient" | "professional" | "amount" | "status";

const COLUMN_CONFIG: { id: RepasseColumnId; label: string; sortKey: keyof RepasseRow | "revenueReceivedAt"; requiresReportsEdit?: boolean }[] = [
  { id: "dateConsult", label: "Data da Consulta", sortKey: "date" },
  { id: "dateReceipt", label: "Data do Recebimento", sortKey: "revenueReceivedAt", requiresReportsEdit: true },
  { id: "patient", label: "Paciente", sortKey: "patientName" },
  { id: "professional", label: "Profissional", sortKey: "attendantName" },
  { id: "amount", label: "Repasse", sortKey: "amount" },
  { id: "status", label: "Status", sortKey: "status" },
];

export default function ReportsRepasses() {
  const { customizationData } = useCustomizationContext();
  const { user, hasPermission } = useAuth();
  const { rules } = useCommissionRules();
  const { patients } = usePatients();
  const { profiles } = useProfiles();
  const { rows, isLoading, fetchData, setRepassePago } = useRepasses();

  /** Coluna "Data do Recebimento" só para quem tem Editar ou Deletar em Relatórios */
  const canSeeReceiptDate = hasPermission("reports", "edit");
  /** Vê todos os repasses ou apenas os próprios (Admin/Gerente ou edit/delete em Relatórios) */
  const canSeeAll = useMemo(() => canSeeAllRepasses(hasPermission, user), [hasPermission, user]);
  const columns = useMemo(
    () => COLUMN_CONFIG.filter((c) => !c.requiresReportsEdit || canSeeReceiptDate),
    [canSeeReceiptDate]
  );

  const now = useMemo(() => new Date(), []);
  const [periodFrom, setPeriodFrom] = useState(() => format(startOfMonth(now), "yyyy-MM-dd"));
  const [periodTo, setPeriodTo] = useState(() => format(endOfMonth(now), "yyyy-MM-dd"));
  const [patientId, setPatientId] = useState<string | null>(null);
  const [attendantId, setAttendantId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<RepasseStatus | "">("");
  const [periodBy, setPeriodBy] = useState<"appointment_date" | "revenue_received_at">("appointment_date");
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState<Record<RepasseColumnId, boolean>>(() =>
    COLUMN_CONFIG.reduce((acc, c) => ({ ...acc, [c.id]: true }), {} as Record<RepasseColumnId, boolean>)
  );
  const [sortBy, setSortBy] = useState<RepasseColumnId>("dateConsult");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  /** Quando !canSeeAll, força filtrar pelo usuário logado; senão usa o filtro selecionado */
  const effectiveAttendantId = canSeeAll ? attendantId : (user?.id ?? null);

  const periodFromDate = useMemo(() => startOfDay(new Date(periodFrom)), [periodFrom]);
  const periodToDate = useMemo(() => endOfDay(new Date(periodTo)), [periodTo]);

  const attendantIdToProfileId = useMemo(() => {
    const m = new Map<string, string>();
    profiles.forEach((p) => {
      const uid = p.user_id ?? p.id;
      m.set(uid, p.id);
    });
    return m;
  }, [profiles]);

  useEffect(() => {
    if (!canSeeAll && !user?.id) return;
    fetchData({
      periodFrom: format(periodFromDate, "yyyy-MM-dd"),
      periodTo: format(periodToDate, "yyyy-MM-dd"),
      periodBy,
      patientId: patientId || null,
      attendantId: effectiveAttendantId,
      statusFilter,
      rules,
      attendantIdToProfileId,
    });
  }, [canSeeAll, user?.id, periodFrom, periodTo, periodBy, patientId, effectiveAttendantId, statusFilter, rules, attendantIdToProfileId, fetchData]);

  const professionals = useMemo(
    () =>
      profiles
        .filter((p) => p.is_active)
        .map((p) => ({ id: p.user_id ?? p.id, name: p.name })),
    [profiles]
  );

  const handleStatusClick = async (row: RepasseRow) => {
    if (row.status !== "pagar" && row.status !== "pago") return;
    setTogglingId(row.appointmentId);
    const ok = await setRepassePago(row.appointmentId, row.status !== "pago", {
      patientName: row.patientName,
      attendantName: row.attendantName,
      amount: row.amount,
    });
    setTogglingId(null);
    if (ok) {
      fetchData({
        periodFrom,
        periodTo,
        periodBy,
        patientId: patientId || null,
        attendantId: effectiveAttendantId,
        statusFilter,
        rules,
        attendantIdToProfileId,
      });
    }
  };

  const totalRepasse = useMemo(() => rows.reduce((s, r) => s + r.amount, 0), [rows]);

  const getSortValue = (row: RepasseRow, colId: RepasseColumnId): string | number => {
    const c = COLUMN_CONFIG.find((x) => x.id === colId);
    if (!c) return "";
    const key = c.sortKey;
    if (key === "revenueReceivedAt") return row.revenueReceivedAt ?? "";
    const v = (row as Record<string, unknown>)[key];
    if (typeof v === "number") return v;
    return String(v ?? "");
  };

  const sortedRows = useMemo(() => {
    const dir = sortOrder === "asc" ? 1 : -1;
    return [...rows].sort((a, b) => {
      const va = getSortValue(a, sortBy);
      const vb = getSortValue(b, sortBy);
      if (typeof va === "number" && typeof vb === "number") return (va - vb) * dir;
      return String(va).localeCompare(String(vb), "pt-BR") * dir;
    });
  }, [rows, sortBy, sortOrder]);

  const handleSort = (colId: RepasseColumnId) => {
    if (sortBy === colId) setSortOrder((o) => (o === "asc" ? "desc" : "asc"));
    else {
      setSortBy(colId);
      setSortOrder("desc");
    }
  };

  const visibleCols = useMemo(
    () => columns.filter((c) => visibleColumns[c.id]),
    [columns, visibleColumns]
  );

  const summaryByProfessional = useMemo(() => {
    const map = new Map<string, { name: string; total: number; count: number }>();
    for (const r of rows) {
      const cur = map.get(r.attendantId);
      if (cur) {
        cur.total += r.amount;
        cur.count += 1;
      } else {
        map.set(r.attendantId, { name: r.attendantName, total: r.amount, count: 1 });
      }
    }
    return Array.from(map.entries()).map(([id, data]) => ({ id, ...data })).sort((a, b) => b.total - a.total);
  }, [rows]);

  const getCellValue = (row: RepasseRow, colId: RepasseColumnId): string => {
    switch (colId) {
      case "dateConsult":
        return format(parseLocalDateOnly(row.date), "dd/MM/yyyy", { locale: ptBR });
      case "dateReceipt":
        return row.revenueReceivedAt ? format(parseLocalDateOnly(row.revenueReceivedAt), "dd/MM/yyyy", { locale: ptBR }) : "—";
      case "patient":
        return row.patientName;
      case "professional":
        return row.attendantName;
      case "amount":
        return row.amount.toFixed(2).replace(".", ",");
      case "status":
        return STATUS_LABELS[row.status];
      default:
        return "";
    }
  };

  /** Exporta CSV com os dados já filtrados e apenas as colunas visíveis. */
  const handleExportCsv = () => {
    const headers = visibleCols.map((c) => (c.id === "amount" ? "Repasse (R$)" : c.label));
    const sep = ";";
    const lines = [headers.join(sep)];
    for (const r of rows) {
      const rowCells = visibleCols.map((c) => getCellValue(r, c.id));
      lines.push(rowCells.join(sep));
    }
    const blob = new Blob(["\uFEFF" + lines.join("\r\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `repasses_${periodFrom}_${periodTo}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  /** Abre janela de impressão com o relatório filtrado (layout da empresa); use "Salvar como PDF" para gerar PDF. */
  const handleExportPdf = () => {
    const primaryColor = customizationData.primaryColor || "#0066CC";
    const clinicName = customizationData.appName || "Clínica";
    const clinicSubtitle = customizationData.appSubtitle || "Relatório de Repasses";
    const logoUrl = customizationData.logoUrl;

    const periodLabel =
      periodFrom === periodTo
        ? format(new Date(periodFrom), "dd/MM/yyyy", { locale: ptBR })
        : `${format(new Date(periodFrom), "dd/MM/yyyy", { locale: ptBR })} a ${format(new Date(periodTo), "dd/MM/yyyy", { locale: ptBR })}`;

    const colCount = Math.max(1, visibleCols.length);
    const rowsHtml =
      rows.length === 0
        ? `<tr><td colspan="${colCount}" class="table-empty">Nenhum repasse no período.</td></tr>`
        : rows
            .map((r) => {
              const tds = visibleCols.map((c) => {
                const raw = c.id === "amount" ? formatCurrency(r.amount) : getCellValue(r, c.id);
                const cssClass = c.id === "amount" ? "text-right" : "";
                return `<td${cssClass ? ` class="${cssClass}"` : ""}>${escapeHtml(raw)}</td>`;
              });
              return `<tr>${tds.join("")}</tr>`;
            })
            .join("");

    const summaryHtml =
      summaryByProfessional.length === 0
        ? ""
        : `
            <div class="section section-full">
              <div class="section-title">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                Resumo por profissional
              </div>
              <div class="summary-list">
                ${summaryByProfessional.map((s) => `<div class="summary-row"><span>${escapeHtml(s.name)}</span><span class="summary-value">${escapeHtml(formatCurrency(s.total))}</span></div>`).join("")}
              </div>
            </div>`;

    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Repasses - ${escapeHtml(periodLabel)}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; color: #1a1a2e; line-height: 1.6; background: #fff; }
          .document { max-width: 210mm; margin: 0 auto; padding: 40px; }
          .header { display: flex; align-items: center; justify-content: space-between; padding-bottom: 24px; border-bottom: 3px solid ${primaryColor}; margin-bottom: 32px; }
          .header-left { display: flex; align-items: center; gap: 16px; }
          .logo { width: 64px; height: 64px; object-fit: contain; border-radius: 8px; }
          .logo-placeholder { width: 64px; height: 64px; background: linear-gradient(135deg, ${primaryColor}, ${primaryColor}dd); border-radius: 8px; display: flex; align-items: center; justify-content: center; color: white; font-size: 28px; font-weight: 700; }
          .clinic-info { display: flex; flex-direction: column; }
          .clinic-name { font-size: 22px; font-weight: 700; color: #1a1a2e; letter-spacing: -0.5px; }
          .clinic-subtitle { font-size: 13px; color: #64748b; font-weight: 500; text-transform: uppercase; letter-spacing: 0.5px; }
          .header-right { text-align: right; }
          .doc-type { font-size: 11px; color: #64748b; text-transform: uppercase; letter-spacing: 1px; font-weight: 600; }
          .doc-date { font-size: 12px; color: #94a3b8; margin-top: 4px; }
          .report-header { background: linear-gradient(135deg, ${primaryColor}10, ${primaryColor}05); border: 1px solid ${primaryColor}20; border-radius: 12px; padding: 24px; margin-bottom: 28px; }
          .report-header-title { font-size: 11px; font-weight: 600; color: ${primaryColor}; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 12px; }
          .report-header-name { font-size: 22px; font-weight: 700; color: #1a1a2e; }
          .section { background: #fafbfc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 20px; margin-bottom: 20px; }
          .section-full { width: 100%; }
          .section-title { display: flex; align-items: center; gap: 8px; font-size: 11px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 12px; padding-bottom: 10px; border-bottom: 1px solid #e2e8f0; }
          .section-title svg { width: 14px; height: 14px; color: ${primaryColor}; }
          .summary-list { display: flex; flex-direction: column; gap: 8px; }
          .summary-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px dashed #e2e8f0; font-size: 14px; }
          .summary-row:last-child { border-bottom: none; }
          .summary-value { font-weight: 600; color: #1a1a2e; }
          .table-wrap { overflow-x: auto; }
          .report-table { width: 100%; border-collapse: collapse; font-size: 13px; }
          .report-table th, .report-table td { border: 1px solid #e2e8f0; padding: 10px 12px; text-align: left; }
          .report-table th { background: ${primaryColor}12; color: #1a1a2e; font-weight: 600; }
          .report-table .text-right { text-align: right; }
          .table-empty { text-align: center; padding: 24px; color: #94a3b8; }
          .report-total { margin-top: 16px; padding-top: 16px; border-top: 2px solid ${primaryColor}; text-align: right; font-size: 16px; font-weight: 700; color: #1a1a2e; }
          .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center; }
          .footer-left { font-size: 11px; color: #94a3b8; }
          .footer-right { text-align: right; }
          .footer-signature { border-top: 1px solid #cbd5e1; padding-top: 8px; width: 200px; }
          .footer-signature-text { font-size: 11px; color: #94a3b8; text-align: center; }
          .pdf-hint { font-size: 11px; color: #94a3b8; margin-top: 16px; }
          @media print { body { margin: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; } .document { padding: 20px; } }
        </style>
      </head>
      <body>
        <div class="document">
          <div class="header">
            <div class="header-left">
              ${logoUrl ? `<img src="${escapeHtml(logoUrl)}" alt="Logo" class="logo" />` : `<div class="logo-placeholder">${escapeHtml(clinicName.charAt(0))}</div>`}
              <div class="clinic-info">
                <div class="clinic-name">${escapeHtml(clinicName)}</div>
                <div class="clinic-subtitle">${escapeHtml(clinicSubtitle)}</div>
              </div>
            </div>
            <div class="header-right">
              <div class="doc-type">Relatório de Repasses</div>
              <div class="doc-date">${new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}</div>
            </div>
          </div>
          <div class="report-header">
            <div class="report-header-title">Relatório de Repasses</div>
            <div class="report-header-name">Repasses a profissionais</div>
          </div>
          ${summaryHtml}
          <div class="section section-full">
            <div class="section-title">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>
              Detalhamento
            </div>
            <div class="table-wrap">
              <table class="report-table">
                <thead>
                  <tr>
                    ${visibleCols.map((c) => (c.id === "amount" ? `<th class="text-right">${escapeHtml(c.label)}</th>` : `<th>${escapeHtml(c.label)}</th>`)).join("")}
                  </tr>
                </thead>
                <tbody>${rowsHtml}</tbody>
              </table>
            </div>
            ${rows.length > 0 ? `<div class="report-total">Total: ${escapeHtml(formatCurrency(totalRepasse))}</div>` : ""}
          </div>
          <div class="footer">
            <div class="footer-left">
              <div>Documento gerado em ${new Date().toLocaleDateString("pt-BR")} às ${new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</div>
              <div class="pdf-hint" style="margin-top: 4px;">Para salvar como PDF: na janela de impressão, escolha &quot;Salvar como PDF&quot;.</div>
            </div>
            <div class="footer-right">
              <div class="footer-signature"><div class="footer-signature-text">Assinatura do Responsável</div></div>
            </div>
          </div>
        </div>
      </body>
      </html>`;

    printHtmlDocument({
      html: printContent,
      windowTitle: "Repasses",
      printDelayMs: 300,
      onPopupBlocked: () => {},
    });
  };

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Wallet className="w-7 h-7" />
          Repasses
        </h1>
        <p className="text-muted-foreground mt-1">
          Repasses para profissionais. Receita paga (agenda) com status conforme comparecimento.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <DollarSign className="w-4 h-4" />
            Filtros
          </CardTitle>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4 pt-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Período</label>
              <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn("w-full justify-start text-left font-normal")}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {periodFrom === periodTo
                      ? format(new Date(periodFrom), "dd/MM/yyyy", { locale: ptBR })
                      : `${format(new Date(periodFrom), "dd/MM/yyyy", { locale: ptBR })} – ${format(new Date(periodTo), "dd/MM/yyyy", { locale: ptBR })}`}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="range"
                    selected={{ from: periodFromDate, to: periodToDate }}
                    onSelect={(range) => {
                      if (range?.from) {
                        setPeriodFrom(format(range.from, "yyyy-MM-dd"));
                        setPeriodTo(range.to ? format(range.to, "yyyy-MM-dd") : format(range.from, "yyyy-MM-dd"));
                        setDatePickerOpen(false);
                      }
                    }}
                    locale={ptBR}
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Cliente</label>
              <Select
                value={patientId ?? "all"}
                onValueChange={(v) => setPatientId(v === "all" ? null : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {patients.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {canSeeAll ? (
              <div className="space-y-2">
                <label className="text-sm font-medium">Profissional</label>
                <Select
                  value={attendantId ?? "all"}
                  onValueChange={(v) => setAttendantId(v === "all" ? null : v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {professionals.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div className="space-y-2">
                <label className="text-sm font-medium">Exibindo</label>
                <div className="flex h-9 items-center rounded-md border px-3 py-2 text-sm text-muted-foreground">
                  Apenas seus repasses
                </div>
              </div>
            )}
            <div className="space-y-2">
              <label className="text-sm font-medium">Status</label>
              <Select
                value={statusFilter || "all"}
                onValueChange={(v) => setStatusFilter((v === "all" ? "" : v) as RepasseStatus | "")}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {(Object.keys(STATUS_LABELS) as RepasseStatus[]).map((s) => (
                    <SelectItem key={s} value={s}>
                      {STATUS_LABELS[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Período por</label>
              <Select value={periodBy} onValueChange={(v) => setPeriodBy(v as "appointment_date" | "revenue_received_at")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="appointment_date">Data da consulta</SelectItem>
                  <SelectItem value="revenue_received_at">Data do recebimento</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : (
            <>
              {summaryByProfessional.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-2 mb-3">
                    <Users className="w-4 h-4" />
                    Resumo por profissional
                  </h3>
                  <div className="flex flex-wrap gap-3">
                    {summaryByProfessional.map((s) => (
                      <div
                        key={s.id}
                        className="rounded-lg border bg-muted/30 px-4 py-2 min-w-[160px] flex justify-between items-center gap-4"
                      >
                        <span className="text-sm font-medium truncate">{s.name}</span>
                        <span className="text-sm font-semibold tabular-nums shrink-0">{formatCurrency(s.total)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div className="flex justify-end gap-2 mb-2 flex-wrap">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Columns3 className="w-4 h-4 mr-2" />
                      Colunas
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    {columns.map((c) => (
                      <DropdownMenuCheckboxItem
                        key={c.id}
                        checked={visibleColumns[c.id]}
                        onCheckedChange={(checked) =>
                          setVisibleColumns((prev) => ({ ...prev, [c.id]: checked === true }))
                        }
                      >
                        {c.label}
                      </DropdownMenuCheckboxItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button variant="outline" size="sm" onClick={handleExportCsv} disabled={rows.length === 0}>
                  <Download className="w-4 h-4 mr-2" />
                  CSV
                </Button>
                <Button variant="outline" size="sm" onClick={handleExportPdf} disabled={rows.length === 0}>
                  <Download className="w-4 h-4 mr-2" />
                  PDF
                </Button>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    {visibleCols.map((c) => (
                      <TableHead
                        key={c.id}
                        className={c.id === "amount" ? "text-right" : c.id === "status" ? "w-[140px]" : ""}
                      >
                        <button
                          type="button"
                          className="flex items-center gap-1 w-full text-left font-medium hover:opacity-80"
                          onClick={() => handleSort(c.id)}
                        >
                          {c.label}
                          {sortBy === c.id ? (
                            sortOrder === "asc" ? (
                              <ArrowUp className="w-3.5 h-3.5" />
                            ) : (
                              <ArrowDown className="w-3.5 h-3.5" />
                            )
                          ) : (
                            <ArrowUpDown className="w-3.5 h-3.5 opacity-50" />
                          )}
                        </button>
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedRows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={Math.max(1, visibleCols.length)} className="text-center text-muted-foreground py-8">
                        Nenhum repasse no período.
                      </TableCell>
                    </TableRow>
                  ) : (
                    sortedRows.map((row) => (
                      <TableRow key={row.appointmentId}>
                        {visibleCols.some((x) => x.id === "dateConsult") && (
                          <TableCell>
                            {format(parseLocalDateOnly(row.date), "dd/MM/yyyy", { locale: ptBR })}
                          </TableCell>
                        )}
                        {visibleCols.some((x) => x.id === "dateReceipt") && (
                          <TableCell>
                            {row.revenueReceivedAt
                              ? format(parseLocalDateOnly(row.revenueReceivedAt), "dd/MM/yyyy", { locale: ptBR })
                              : "—"}
                          </TableCell>
                        )}
                        {visibleCols.some((x) => x.id === "patient") && (
                          <TableCell>{row.patientName}</TableCell>
                        )}
                        {visibleCols.some((x) => x.id === "professional") && (
                          <TableCell>{row.attendantName}</TableCell>
                        )}
                        {visibleCols.some((x) => x.id === "amount") && (
                          <TableCell className="text-right font-medium">
                            {formatCurrency(row.amount)}
                          </TableCell>
                        )}
                        {visibleCols.some((x) => x.id === "status") && (
                          <TableCell>
                            {row.status === "pendente" ? (
                              <span className="text-muted-foreground">{STATUS_LABELS.pendente}</span>
                            ) : row.status === "pagar" ? (
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-amber-600 border-amber-200 hover:bg-amber-50"
                                onClick={() => handleStatusClick(row)}
                                disabled={togglingId === row.appointmentId}
                              >
                                {togglingId === row.appointmentId ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  STATUS_LABELS.pagar
                                )}
                              </Button>
                            ) : (
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-green-600 border-green-200 hover:bg-green-50"
                                onClick={() => handleStatusClick(row)}
                                disabled={togglingId === row.appointmentId}
                              >
                                {togglingId === row.appointmentId ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  STATUS_LABELS.pago
                                )}
                              </Button>
                            )}
                          </TableCell>
                        )}
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
              {rows.length > 0 && (
                <div className="mt-4 flex justify-end text-sm font-medium">
                  Total: {formatCurrency(totalRepasse)}
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
