import { useState, useMemo } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, TrendingDown, BarChart3, GitCompare, DollarSign, Calendar, ArrowUpDown, ArrowUp, ArrowDown, Printer } from "lucide-react";
import { startOfMonth, endOfMonth } from "date-fns";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useRevenue } from "@/hooks/useRevenue";
import { useExpenses } from "@/hooks/useExpenses";
import { useRevenueStatusConfigContext } from "@/contexts/RevenueStatusConfigContext";
import { useRevenueCategoryConfigContext } from "@/contexts/RevenueCategoryConfigContext";
import { useExpenseStatusConfigContext } from "@/contexts/ExpenseStatusConfigContext";
import { useExpenseCategoryConfigContext } from "@/contexts/ExpenseCategoryConfigContext";
import { cn } from "@/lib/utils";
import { escapeHtml, printHtmlDocument } from "@/lib/print";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

function percentChange(current: number, previous: number): number | null {
  if (previous === 0) return current > 0 ? 100 : null;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

function formatPercentDiff(
  current: number,
  previous: number,
  inverseColors = false
): { text: string; className: string } {
  const pct = percentChange(current, previous);
  if (pct === null) return { text: "—", className: "text-muted-foreground" };
  const isUp = pct > 0;
  const good = inverseColors ? !isUp : isUp;
  const className = good ? "text-emerald-600 dark:text-emerald-400" : "text-destructive";
  const sign = pct >= 0 ? "+" : "";
  return { text: `${sign}${pct}%`, className };
}

const MESES = [
  { value: 1, label: "Janeiro" },
  { value: 2, label: "Fevereiro" },
  { value: 3, label: "Março" },
  { value: 4, label: "Abril" },
  { value: 5, label: "Maio" },
  { value: 6, label: "Junho" },
  { value: 7, label: "Julho" },
  { value: 8, label: "Agosto" },
  { value: 9, label: "Setembro" },
  { value: 10, label: "Outubro" },
  { value: 11, label: "Novembro" },
  { value: 12, label: "Dezembro" },
];

const receitaChartConfig = {
  receita: {
    label: "Receita",
    color: "hsl(var(--primary))",
  },
};

const despesaChartConfig = {
  despesa: {
    label: "Despesa",
    color: "hsl(var(--destructive))",
  },
};

const receitaDespesaChartConfig = {
  receita: {
    label: "Receita",
    color: "hsl(var(--primary))",
  },
  despesa: {
    label: "Despesa",
    color: "hsl(var(--destructive))",
  },
};

const comparativoChartConfig = {
  receita: { label: "Receita", color: "hsl(var(--primary))" },
  despesa: { label: "Despesa", color: "hsl(var(--destructive))" },
  resultado: { label: "Resultado", color: "hsl(142 76% 36%)" },
};

const MESES_ABREV = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

function getYears() {
  const current = new Date().getFullYear();
  const years = [];
  for (let y = current - 5; y <= current + 1; y++) years.push(y);
  return years;
}

export default function ReportsFinancial() {
  type FinancialTab = "receita" | "despesa" | "receita-despesa" | "comparativo";
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState<number>(now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(now.getFullYear());
  const [activeTab, setActiveTab] = useState<FinancialTab>("receita");
  const [sortByReceita, setSortByReceita] = useState<"date" | "description" | "patient" | "category" | "amount" | "status" | "source" | null>(null);
  const [sortOrderReceita, setSortOrderReceita] = useState<"asc" | "desc">("asc");
  const [sortByDespesa, setSortByDespesa] = useState<"date" | "description" | "patient" | "category" | "amount" | "status" | null>(null);
  const [sortOrderDespesa, setSortOrderDespesa] = useState<"asc" | "desc">("asc");
  const [sortByMov, setSortByMov] = useState<"type" | "date" | "description" | "patient" | "amount" | "status" | null>(null);
  const [sortOrderMov, setSortOrderMov] = useState<"asc" | "desc">("asc");

  const { allRevenue, isLoading: revenueLoading } = useRevenue();
  const { statuses: revenueStatuses, getLabel: getStatusLabel } = useRevenueStatusConfigContext();
  const { getLabel: getCategoryLabel } = useRevenueCategoryConfigContext();

  const { expenses, isLoading: expenseLoading } = useExpenses();
  const { statuses: expenseStatuses, getLabel: getExpenseStatusLabel } = useExpenseStatusConfigContext();
  const { getLabel: getExpenseCategoryLabel } = useExpenseCategoryConfigContext();

  const period = useMemo(() => {
    const from = startOfMonth(new Date(selectedYear, selectedMonth - 1));
    const to = endOfMonth(new Date(selectedYear, selectedMonth - 1));
    return { from, to };
  }, [selectedMonth, selectedYear]);

  const periodPrev = useMemo(() => {
    const prevMonth = selectedMonth === 1 ? 12 : selectedMonth - 1;
    const prevYear = selectedMonth === 1 ? selectedYear - 1 : selectedYear;
    const from = startOfMonth(new Date(prevYear, prevMonth - 1));
    const to = endOfMonth(new Date(prevYear, prevMonth - 1));
    return { from, to, month: prevMonth, year: prevYear };
  }, [selectedMonth, selectedYear]);

  const periodoAnteriorLabel = useMemo(
    () => `${MESES[periodPrev.month - 1].label}/${periodPrev.year}`,
    [periodPrev.month, periodPrev.year]
  );

  const countsAsReceived = (statusKey: string) =>
    revenueStatuses.find((s) => s.key === statusKey)?.count_in_balance ?? false;
  const countsAsPaid = (statusKey: string) =>
    expenseStatuses.find((s) => s.key === statusKey)?.count_in_balance ?? false;

  const years = useMemo(() => getYears(), []);

  const handleReceitaColumnSort = (column: "date" | "description" | "patient" | "category" | "amount" | "status" | "source") => {
    setSortByReceita((prev) => {
      if (prev === column) {
        setSortOrderReceita((old) => (old === "asc" ? "desc" : "asc"));
        return prev;
      }
      setSortOrderReceita(column === "date" || column === "amount" ? "desc" : "asc");
      return column;
    });
  };

  const revenuesInPeriod = useMemo(() => {
    return allRevenue.filter((r) => {
      const d = new Date(r.date + "T12:00:00");
      return d >= period.from && d <= period.to;
    });
  }, [allRevenue, period.from, period.to]);

  const handleDespesaColumnSort = (column: "date" | "description" | "patient" | "category" | "amount" | "status") => {
    setSortByDespesa((prev) => {
      if (prev === column) {
        setSortOrderDespesa((old) => (old === "asc" ? "desc" : "asc"));
        return prev;
      }
      setSortOrderDespesa(column === "date" || column === "amount" ? "desc" : "asc");
      return column;
    });
  };

  const sortedRevenuesInPeriod = useMemo(() => {
    if (!sortByReceita) return revenuesInPeriod;
    const dir = sortOrderReceita === "asc" ? 1 : -1;
    return [...revenuesInPeriod].sort((a, b) => {
      let aVal: string | number | Date;
      let bVal: string | number | Date;

      switch (sortByReceita) {
        case "date":
          aVal = new Date(a.date);
          bVal = new Date(b.date);
          break;
        case "description":
          aVal = (a.description || "").toLowerCase();
          bVal = (b.description || "").toLowerCase();
          break;
        case "patient":
          aVal = (a.patientName ?? "").toLowerCase();
          bVal = (b.patientName ?? "").toLowerCase();
          break;
        case "category":
          aVal = getCategoryLabel(a.categoryId ?? null).toLowerCase();
          bVal = getCategoryLabel(b.categoryId ?? null).toLowerCase();
          break;
        case "amount":
          aVal = a.amount;
          bVal = b.amount;
          break;
        case "status":
          aVal = getStatusLabel(a.status).toLowerCase();
          bVal = getStatusLabel(b.status).toLowerCase();
          break;
        case "source":
          aVal = a.source;
          bVal = b.source;
          break;
        default:
          return 0;
      }

      if (aVal < bVal) return -dir;
      if (aVal > bVal) return dir;
      return 0;
    });
  }, [revenuesInPeriod, sortByReceita, sortOrderReceita, getCategoryLabel, getStatusLabel]);

  const totalRecebido = useMemo(
    () => revenuesInPeriod.filter((r) => countsAsReceived(r.status)).reduce((s, r) => s + r.amount, 0),
    [revenuesInPeriod, revenueStatuses]
  );
  const totalPendente = useMemo(
    () => revenuesInPeriod.filter((r) => !countsAsReceived(r.status)).reduce((s, r) => s + r.amount, 0),
    [revenuesInPeriod, revenueStatuses]
  );
  const totalGeral = totalRecebido + totalPendente;

  const revenuesInPrevPeriod = useMemo(() => {
    return allRevenue.filter((r) => {
      const d = new Date(r.date + "T12:00:00");
      return d >= periodPrev.from && d <= periodPrev.to;
    });
  }, [allRevenue, periodPrev.from, periodPrev.to]);

  const totalRecebidoPrev = useMemo(
    () => revenuesInPrevPeriod.filter((r) => countsAsReceived(r.status)).reduce((s, r) => s + r.amount, 0),
    [revenuesInPrevPeriod, revenueStatuses]
  );
  const totalPendentePrev = useMemo(
    () => revenuesInPrevPeriod.filter((r) => !countsAsReceived(r.status)).reduce((s, r) => s + r.amount, 0),
    [revenuesInPrevPeriod, revenueStatuses]
  );
  const totalGeralPrev = totalRecebidoPrev + totalPendentePrev;

  const expensesInPrevPeriod = useMemo(() => {
    return expenses.filter((e) => {
      const d = new Date(e.date + "T12:00:00");
      return d >= periodPrev.from && d <= periodPrev.to;
    });
  }, [expenses, periodPrev.from, periodPrev.to]);

  const totalPagoDespesaPrev = useMemo(
    () => expensesInPrevPeriod.filter((e) => countsAsPaid(e.status)).reduce((s, e) => s + e.amount, 0),
    [expensesInPrevPeriod, expenseStatuses]
  );
  const totalPendenteDespesaPrev = useMemo(
    () => expensesInPrevPeriod.filter((e) => !countsAsPaid(e.status)).reduce((s, e) => s + e.amount, 0),
    [expensesInPrevPeriod, expenseStatuses]
  );
  const totalGeralDespesaPrev = totalPagoDespesaPrev + totalPendenteDespesaPrev;

  const resultadoPrev = totalGeralPrev - totalGeralDespesaPrev;

  const receitaChartData = useMemo(() => {
    const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();
    const byDay: Record<number, number> = {};
    for (let d = 1; d <= daysInMonth; d++) byDay[d] = 0;
    revenuesInPeriod.forEach((r) => {
      const day = new Date(r.date + "T12:00:00").getDate();
      byDay[day] = (byDay[day] ?? 0) + r.amount;
    });
    return Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => ({
      dia: `${day}`,
      receita: Math.round((byDay[day] ?? 0) * 100) / 100,
    }));
  }, [revenuesInPeriod, selectedMonth, selectedYear]);

  const expensesInPeriod = useMemo(() => {
    return expenses.filter((e) => {
      const d = new Date(e.date + "T12:00:00");
      return d >= period.from && d <= period.to;
    });
  }, [expenses, period.from, period.to]);

  const sortedExpensesInPeriod = useMemo(() => {
    if (!sortByDespesa) return expensesInPeriod;
    const dir = sortOrderDespesa === "asc" ? 1 : -1;
    return [...expensesInPeriod].sort((a, b) => {
      let aVal: string | number | Date;
      let bVal: string | number | Date;

      switch (sortByDespesa) {
        case "date":
          aVal = new Date(a.date);
          bVal = new Date(b.date);
          break;
        case "description":
          aVal = (a.description || "").toLowerCase();
          bVal = (b.description || "").toLowerCase();
          break;
        case "patient":
          aVal = (a.patientName ?? "").toLowerCase();
          bVal = (b.patientName ?? "").toLowerCase();
          break;
        case "category":
          aVal = getExpenseCategoryLabel(a.categoryId ?? null).toLowerCase();
          bVal = getExpenseCategoryLabel(b.categoryId ?? null).toLowerCase();
          break;
        case "amount":
          aVal = a.amount;
          bVal = b.amount;
          break;
        case "status":
          aVal = getExpenseStatusLabel(a.status).toLowerCase();
          bVal = getExpenseStatusLabel(b.status).toLowerCase();
          break;
        default:
          return 0;
      }

      if (aVal < bVal) return -dir;
      if (aVal > bVal) return dir;
      return 0;
    });
  }, [expensesInPeriod, sortByDespesa, sortOrderDespesa, getExpenseCategoryLabel, getExpenseStatusLabel]);

  const totalPagoDespesa = useMemo(
    () => expensesInPeriod.filter((e) => countsAsPaid(e.status)).reduce((s, e) => s + e.amount, 0),
    [expensesInPeriod, expenseStatuses]
  );
  const totalPendenteDespesa = useMemo(
    () => expensesInPeriod.filter((e) => !countsAsPaid(e.status)).reduce((s, e) => s + e.amount, 0),
    [expensesInPeriod, expenseStatuses]
  );
  const totalGeralDespesa = totalPagoDespesa + totalPendenteDespesa;

  const despesaChartData = useMemo(() => {
    const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();
    const byDay: Record<number, number> = {};
    for (let d = 1; d <= daysInMonth; d++) byDay[d] = 0;
    expensesInPeriod.forEach((e) => {
      const day = new Date(e.date + "T12:00:00").getDate();
      byDay[day] = (byDay[day] ?? 0) + e.amount;
    });
    return Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => ({
      dia: `${day}`,
      despesa: Math.round((byDay[day] ?? 0) * 100) / 100,
    }));
  }, [expensesInPeriod, selectedMonth, selectedYear]);

  const receitaDespesaChartData = useMemo(() => {
    const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();
    const result: { dia: string; receita: number; despesa: number }[] = [];
    const revByDay: Record<number, number> = {};
    const expByDay: Record<number, number> = {};
    for (let d = 1; d <= daysInMonth; d++) {
      revByDay[d] = 0;
      expByDay[d] = 0;
    }
    revenuesInPeriod.forEach((r) => {
      const day = new Date(r.date + "T12:00:00").getDate();
      revByDay[day] = (revByDay[day] ?? 0) + r.amount;
    });
    expensesInPeriod.forEach((e) => {
      const day = new Date(e.date + "T12:00:00").getDate();
      expByDay[day] = (expByDay[day] ?? 0) + e.amount;
    });
    for (let d = 1; d <= daysInMonth; d++) {
      result.push({
        dia: `${d}`,
        receita: Math.round((revByDay[d] ?? 0) * 100) / 100,
        despesa: Math.round((expByDay[d] ?? 0) * 100) / 100,
      });
    }
    return result;
  }, [revenuesInPeriod, expensesInPeriod, selectedMonth, selectedYear]);

  const resultadoReceitaDespesa = totalGeral - totalGeralDespesa;
  const hasAnyReceitaDespesa = revenuesInPeriod.length > 0 || expensesInPeriod.length > 0;

  const movimentacaoUnificada = useMemo(() => {
    const receitas = revenuesInPeriod.map((r) => ({ tipo: "receita" as const, date: r.date, item: r }));
    const despesas = expensesInPeriod.map((e) => ({ tipo: "despesa" as const, date: e.date, item: e }));
    return [...receitas, ...despesas].sort((a, b) => a.date.localeCompare(b.date));
  }, [revenuesInPeriod, expensesInPeriod]);

  const handleMovColumnSort = (column: "type" | "date" | "description" | "patient" | "amount" | "status") => {
    setSortByMov((prev) => {
      if (prev === column) {
        setSortOrderMov((old) => (old === "asc" ? "desc" : "asc"));
        return prev;
      }
      setSortOrderMov(column === "date" || column === "amount" ? "desc" : "asc");
      return column;
    });
  };

  const sortedMovimentacaoUnificada = useMemo(() => {
    if (!sortByMov) return movimentacaoUnificada;
    const dir = sortOrderMov === "asc" ? 1 : -1;
    return [...movimentacaoUnificada].sort((a, b) => {
      let aVal: string | number | Date;
      let bVal: string | number | Date;

      switch (sortByMov) {
        case "type":
          aVal = a.tipo;
          bVal = b.tipo;
          break;
        case "date":
          aVal = new Date(a.date);
          bVal = new Date(b.date);
          break;
        case "description":
          aVal = (a.item.description || "").toLowerCase();
          bVal = (b.item.description || "").toLowerCase();
          break;
        case "patient":
          aVal = (a.item.patientName ?? "").toLowerCase();
          bVal = (b.item.patientName ?? "").toLowerCase();
          break;
        case "amount":
          aVal = a.item.amount;
          bVal = b.item.amount;
          break;
        case "status":
          if (a.tipo === "receita" && b.tipo === "receita") {
            aVal = getStatusLabel(a.item.status).toLowerCase();
            bVal = getStatusLabel(b.item.status).toLowerCase();
          } else if (a.tipo === "despesa" && b.tipo === "despesa") {
            aVal = getExpenseStatusLabel(a.item.status).toLowerCase();
            bVal = getExpenseStatusLabel(b.item.status).toLowerCase();
          } else {
            aVal = a.item.status.toLowerCase();
            bVal = b.item.status.toLowerCase();
          }
          break;
        default:
          return 0;
      }

      if (aVal < bVal) return -dir;
      if (aVal > bVal) return dir;
      return 0;
    });
  }, [movimentacaoUnificada, sortByMov, sortOrderMov, getStatusLabel, getExpenseStatusLabel]);

  const comparativoMensalData = useMemo(() => {
    const yearStr = String(selectedYear);
    const revByMonth: Record<number, number> = {};
    const expByMonth: Record<number, number> = {};
    for (let m = 1; m <= 12; m++) {
      revByMonth[m] = 0;
      expByMonth[m] = 0;
    }
    allRevenue.forEach((r) => {
      if (!r.date.startsWith(yearStr)) return;
      const month = parseInt(r.date.slice(5, 7), 10);
      if (month >= 1 && month <= 12) revByMonth[month] = (revByMonth[month] ?? 0) + r.amount;
    });
    expenses.forEach((e) => {
      if (!e.date.startsWith(yearStr)) return;
      const month = parseInt(e.date.slice(5, 7), 10);
      if (month >= 1 && month <= 12) expByMonth[month] = (expByMonth[month] ?? 0) + e.amount;
    });
    return Array.from({ length: 12 }, (_, i) => {
      const m = i + 1;
      const receita = Math.round((revByMonth[m] ?? 0) * 100) / 100;
      const despesa = Math.round((expByMonth[m] ?? 0) * 100) / 100;
      return {
        mes: MESES_ABREV[i],
        mesNum: m,
        receita,
        despesa,
        resultado: Math.round((receita - despesa) * 100) / 100,
      };
    });
  }, [allRevenue, expenses, selectedYear]);

  const totaisAnoComparativo = useMemo(() => {
    const totalReceita = comparativoMensalData.reduce((s, d) => s + d.receita, 0);
    const totalDespesa = comparativoMensalData.reduce((s, d) => s + d.despesa, 0);
    const resultado = totalReceita - totalDespesa;
    const melhorMes = comparativoMensalData.reduce(
      (best, d) => (d.receita > best.receita ? { ...d } : best),
      comparativoMensalData[0] ?? { mes: "—", receita: 0 }
    );
    const piorMes = comparativoMensalData.reduce(
      (worst, d) => (d.despesa > worst.despesa ? { ...d } : worst),
      comparativoMensalData[0] ?? { mes: "—", despesa: 0 }
    );
    return {
      totalReceita,
      totalDespesa,
      resultado,
      mediaReceitaMensal: Math.round((totalReceita / 12) * 100) / 100,
      mediaDespesaMensal: Math.round((totalDespesa / 12) * 100) / 100,
      melhorMes: melhorMes.mes,
      melhorMesReceita: melhorMes.receita,
      piorMes: piorMes.mes,
      piorMesDespesa: piorMes.despesa,
    };
  }, [comparativoMensalData]);

  const handlePrint = () => {
    const monthLabel = MESES[selectedMonth - 1]?.label ?? String(selectedMonth);
    const tabLabelMap: Record<FinancialTab, string> = {
      receita: "Receita",
      despesa: "Despesa",
      "receita-despesa": "Receita X Despesa",
      comparativo: "Comparativo",
    };

    let cardsHtml = "";
    let tableHeadHtml = "";
    let rowsHtml = "";
    let hasRows = false;
    let emptyMessage = "Nenhum dado no período selecionado.";

    if (activeTab === "receita") {
      cardsHtml = `
        <div class="card"><div class="label">Total no período</div><div class="value">${escapeHtml(formatCurrency(totalGeral))}</div></div>
        <div class="card"><div class="label">Recebido</div><div class="value">${escapeHtml(formatCurrency(totalRecebido))}</div></div>
        <div class="card"><div class="label">Pendente</div><div class="value">${escapeHtml(formatCurrency(totalPendente))}</div></div>
      `;
      tableHeadHtml = `
        <tr>
          <th>Data</th>
          <th>Descrição</th>
          <th>Cliente</th>
          <th>Categoria</th>
          <th style="text-align:right;">Valor</th>
          <th>Status</th>
          <th>Origem</th>
        </tr>
      `;
      rowsHtml = sortedRevenuesInPeriod
        .map((item) => `
          <tr>
            <td>${escapeHtml(format(new Date(item.date + "T12:00:00"), "dd/MM/yyyy", { locale: ptBR }))}</td>
            <td>${escapeHtml(item.description || "—")}</td>
            <td>${escapeHtml(item.patientName ?? "—")}</td>
            <td>${escapeHtml(getCategoryLabel(item.categoryId ?? null))}</td>
            <td style="text-align:right; color:#0f766e; font-weight:700;">+ ${escapeHtml(formatCurrency(item.amount))}</td>
            <td>${escapeHtml(getStatusLabel(item.status))}</td>
            <td>${escapeHtml(item.source === "manual" ? "Manual" : "Agendamento")}</td>
          </tr>
        `)
        .join("");
      hasRows = sortedRevenuesInPeriod.length > 0;
      emptyMessage = "Nenhuma receita no período selecionado.";
    } else if (activeTab === "despesa") {
      cardsHtml = `
        <div class="card"><div class="label">Total no período</div><div class="value">${escapeHtml(formatCurrency(totalGeralDespesa))}</div></div>
        <div class="card"><div class="label">Pago</div><div class="value">${escapeHtml(formatCurrency(totalPagoDespesa))}</div></div>
        <div class="card"><div class="label">Pendente</div><div class="value">${escapeHtml(formatCurrency(totalPendenteDespesa))}</div></div>
      `;
      tableHeadHtml = `
        <tr>
          <th>Data</th>
          <th>Descrição</th>
          <th>Responsável / Cliente</th>
          <th>Categoria</th>
          <th style="text-align:right;">Valor</th>
          <th>Status</th>
        </tr>
      `;
      rowsHtml = sortedExpensesInPeriod
        .map((item) => `
          <tr>
            <td>${escapeHtml(format(new Date(item.date + "T12:00:00"), "dd/MM/yyyy", { locale: ptBR }))}</td>
            <td>${escapeHtml(item.description || "—")}</td>
            <td>${escapeHtml(item.patientName ?? "—")}</td>
            <td>${escapeHtml(getExpenseCategoryLabel(item.categoryId ?? null))}</td>
            <td style="text-align:right; color:#b91c1c; font-weight:700;">- ${escapeHtml(formatCurrency(item.amount))}</td>
            <td>${escapeHtml(getExpenseStatusLabel(item.status))}</td>
          </tr>
        `)
        .join("");
      hasRows = sortedExpensesInPeriod.length > 0;
      emptyMessage = "Nenhuma despesa no período selecionado.";
    } else if (activeTab === "receita-despesa") {
      cardsHtml = `
        <div class="card"><div class="label">Total Receita</div><div class="value">${escapeHtml(formatCurrency(totalGeral))}</div></div>
        <div class="card"><div class="label">Total Despesa</div><div class="value">${escapeHtml(formatCurrency(totalGeralDespesa))}</div></div>
        <div class="card"><div class="label">Resultado</div><div class="value">${escapeHtml(formatCurrency(resultadoReceitaDespesa))}</div></div>
      `;
      tableHeadHtml = `
        <tr>
          <th>Tipo</th>
          <th>Data</th>
          <th>Descrição</th>
          <th>Cliente / Responsável</th>
          <th style="text-align:right;">Valor</th>
          <th>Status</th>
        </tr>
      `;
      rowsHtml = sortedMovimentacaoUnificada
        .map((row) => {
          const isReceita = row.tipo === "receita";
          const statusLabel = isReceita
            ? getStatusLabel(row.item.status)
            : getExpenseStatusLabel(row.item.status);
          return `
            <tr>
              <td>${isReceita ? "Receita" : "Despesa"}</td>
              <td>${escapeHtml(format(new Date(row.item.date + "T12:00:00"), "dd/MM/yyyy", { locale: ptBR }))}</td>
              <td>${escapeHtml(row.item.description || "—")}</td>
              <td>${escapeHtml(row.item.patientName ?? "—")}</td>
              <td style="text-align:right; color:${isReceita ? "#0f766e" : "#b91c1c"}; font-weight:700;">
                ${isReceita ? "+" : "-"} ${escapeHtml(formatCurrency(row.item.amount))}
              </td>
              <td>${escapeHtml(statusLabel)}</td>
            </tr>
          `;
        })
        .join("");
      hasRows = sortedMovimentacaoUnificada.length > 0;
      emptyMessage = "Nenhuma movimentação no período selecionado.";
    } else {
      cardsHtml = `
        <div class="card"><div class="label">Receita no ano</div><div class="value">${escapeHtml(formatCurrency(totaisAnoComparativo.totalReceita))}</div></div>
        <div class="card"><div class="label">Despesa no ano</div><div class="value">${escapeHtml(formatCurrency(totaisAnoComparativo.totalDespesa))}</div></div>
        <div class="card"><div class="label">Resultado do ano</div><div class="value">${escapeHtml(formatCurrency(totaisAnoComparativo.resultado))}</div></div>
      `;
      tableHeadHtml = `
        <tr>
          <th>Mês</th>
          <th style="text-align:right;">Receita</th>
          <th style="text-align:right;">Despesa</th>
          <th style="text-align:right;">Resultado</th>
        </tr>
      `;
      rowsHtml = comparativoMensalData
        .map((d) => `
          <tr>
            <td>${escapeHtml(d.mes)}</td>
            <td style="text-align:right; color:#0f766e; font-weight:700;">${escapeHtml(formatCurrency(d.receita))}</td>
            <td style="text-align:right; color:#b91c1c; font-weight:700;">${escapeHtml(formatCurrency(d.despesa))}</td>
            <td style="text-align:right; font-weight:700; color:${d.resultado >= 0 ? "#0f766e" : "#b91c1c"};">
              ${escapeHtml(formatCurrency(d.resultado))}
            </td>
          </tr>
        `)
        .join("");
      hasRows = comparativoMensalData.length > 0;
      emptyMessage = "Nenhum dado comparativo no ano selecionado.";
    }

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Relatório Financeiro - ${monthLabel}/${selectedYear}</title>
          <style>
            * { box-sizing: border-box; }
            body {
              font-family: "Inter", "Segoe UI", Arial, sans-serif;
              margin: 24px;
              color: #111827;
              background: #ffffff;
            }
            .header {
              border-bottom: 2px solid #e5e7eb;
              padding-bottom: 10px;
              margin-bottom: 14px;
            }
            h1 {
              margin: 0;
              font-size: 26px;
              letter-spacing: -0.3px;
            }
            .meta {
              margin: 0 0 14px;
              color: #4b5563;
              font-size: 13px;
            }
            .cards {
              display: grid;
              grid-template-columns: repeat(3, minmax(0, 1fr));
              gap: 10px;
              margin-bottom: 16px;
            }
            .card {
              border: 1px solid #dbe1ea;
              border-radius: 10px;
              padding: 11px;
              background: #f8fafc;
            }
            .label { font-size: 11px; color: #6b7280; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.4px; }
            .value { font-size: 17px; font-weight: 700; }
            table {
              width: 100%;
              border-collapse: collapse;
              font-size: 12px;
              border: 1px solid #d1d5db;
              border-radius: 10px;
              overflow: hidden;
            }
            th, td { border: 1px solid #e5e7eb; padding: 8px; text-align: left; }
            th {
              background: #eef2f7;
              font-weight: 700;
              color: #334155;
            }
            tbody tr:nth-child(even) { background: #f8fafc; }
            .empty { margin-top: 10px; padding: 12px; border: 1px dashed #d1d5db; color: #6b7280; }
            .footer {
              margin-top: 14px;
              padding-top: 8px;
              border-top: 1px solid #e5e7eb;
              font-size: 11px;
              color: #64748b;
              text-align: right;
            }
            @media print {
              body { margin: 14px; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Relatório Financeiro</h1>
            <p class="meta" style="font-size:16px; font-weight:700; color:#111827; margin-top:4px; margin-bottom:10px;">
              ${escapeHtml(tabLabelMap[activeTab])}
            </p>
            <p class="meta">
              Período: ${escapeHtml(monthLabel)} de ${selectedYear}
            </p>
          </div>
          <div class="cards">${cardsHtml}</div>
          ${
            !hasRows
              ? `<div class="empty">${escapeHtml(emptyMessage)}</div>`
              : `
                <table>
                  <thead>
                    ${tableHeadHtml}
                  </thead>
                  <tbody>${rowsHtml}</tbody>
                </table>
              `
          }
          <div class="footer">
            Emitido em ${escapeHtml(format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }))}
          </div>
        </body>
      </html>
    `;

    printHtmlDocument({
      html,
      onPopupBlocked: () =>
        alert("Por favor, permita pop-ups para imprimir o relatório financeiro."),
    });
  };

  return (
    <div className="space-y-6 animate-fade-in p-2 sm:p-4 lg:p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Relatório Financeiro</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Receita, despesas e comparativos por período.
          </p>
        </div>
        <Button variant="outline" onClick={handlePrint}>
          <Printer className="h-4 w-4 mr-2" />
          Imprimir
        </Button>
      </div>

      <Card className="border-border/50 rounded-2xl">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">Mês</label>
              <Select
                value={String(selectedMonth)}
                onValueChange={(v) => setSelectedMonth(Number(v))}
              >
                <SelectTrigger className="w-[180px] rounded-xl border-border/50">
                  <SelectValue placeholder="Mês" />
                </SelectTrigger>
                <SelectContent>
                  {MESES.map((m) => (
                    <SelectItem key={m.value} value={String(m.value)}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">Ano</label>
              <Select
                value={String(selectedYear)}
                onValueChange={(v) => setSelectedYear(Number(v))}
              >
                <SelectTrigger className="w-[120px] rounded-xl border-border/50">
                  <SelectValue placeholder="Ano" />
                </SelectTrigger>
                <SelectContent>
                  {years.map((y) => (
                    <SelectItem key={y} value={String(y)}>
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as FinancialTab)} className="w-full">
        <TabsList className="grid w-full max-w-2xl grid-cols-4 h-auto p-1 rounded-xl bg-muted/50">
          <TabsTrigger value="receita" className="flex items-center gap-2 py-3 data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-lg">
            <TrendingUp className="w-4 h-4" />
            <span className="hidden sm:inline">Receita</span>
          </TabsTrigger>
          <TabsTrigger value="despesa" className="flex items-center gap-2 py-3 data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-lg">
            <TrendingDown className="w-4 h-4" />
            <span className="hidden sm:inline">Despesa</span>
          </TabsTrigger>
          <TabsTrigger value="receita-despesa" className="flex items-center gap-2 py-3 data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-lg">
            <BarChart3 className="w-4 h-4" />
            <span className="hidden sm:inline">Receita X Despesa</span>
          </TabsTrigger>
          <TabsTrigger value="comparativo" className="flex items-center gap-2 py-3 data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-lg">
            <GitCompare className="w-4 h-4" />
            <span className="hidden sm:inline">Comparativo</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="receita" className="mt-6 space-y-6">
          {revenueLoading ? (
            <Skeleton className="h-64 rounded-2xl" />
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Card className="border-border/50 rounded-2xl">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Total no período</CardTitle>
                    <DollarSign className="h-4 w-4 text-primary" />
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold text-foreground">{formatCurrency(totalGeral)}</p>
                    <p className={cn("text-xs mt-1", formatPercentDiff(totalGeral, totalGeralPrev).className)}>
                      vs {periodoAnteriorLabel}: {formatPercentDiff(totalGeral, totalGeralPrev).text}
                    </p>
                  </CardContent>
                </Card>
                <Card className="border-border/50 rounded-2xl">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Recebido</CardTitle>
                    <TrendingUp className="h-4 w-4 text-emerald-600" />
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(totalRecebido)}</p>
                    <p className={cn("text-xs mt-1", formatPercentDiff(totalRecebido, totalRecebidoPrev).className)}>
                      vs {periodoAnteriorLabel}: {formatPercentDiff(totalRecebido, totalRecebidoPrev).text}
                    </p>
                  </CardContent>
                </Card>
                <Card className="border-border/50 rounded-2xl">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Pendente</CardTitle>
                    <TrendingUp className="h-4 w-4 text-amber-600" />
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{formatCurrency(totalPendente)}</p>
                    <p className={cn("text-xs mt-1", formatPercentDiff(totalPendente, totalPendentePrev).className)}>
                      vs {periodoAnteriorLabel}: {formatPercentDiff(totalPendente, totalPendentePrev).text}
                    </p>
                  </CardContent>
                </Card>
              </div>

              <Card className="border-border/50 rounded-2xl">
                <CardHeader>
                  <CardTitle>Receita por dia</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {MESES[selectedMonth - 1].label} de {selectedYear}
                  </p>
                </CardHeader>
                <CardContent>
                  {receitaChartData.length > 0 ? (
                    <ChartContainer config={receitaChartConfig} className="h-64 sm:h-80 w-full">
                      <BarChart data={receitaChartData} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                        <XAxis
                          dataKey="dia"
                          fontSize={12}
                          tickLine={false}
                          axisLine={false}
                          tick={{ fill: "hsl(var(--muted-foreground))" }}
                        />
                        <YAxis
                          fontSize={12}
                          tickLine={false}
                          axisLine={false}
                          tick={{ fill: "hsl(var(--muted-foreground))" }}
                          tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(v))}
                        />
                        <ChartTooltip
                          content={
                            <ChartTooltipContent
                              formatter={(value) => (
                                <>
                                  <span className="text-muted-foreground">Receita</span>
                                  <span className="font-mono font-medium tabular-nums text-foreground">
                                    {formatCurrency(Number(value))}
                                  </span>
                                </>
                              )}
                            />
                          }
                        />
                        <Bar dataKey="receita" fill="var(--color-receita)" radius={4} />
                      </BarChart>
                    </ChartContainer>
                  ) : (
                    <div className="h-64 flex items-center justify-center text-muted-foreground rounded-lg border border-dashed">
                      Nenhuma receita no período
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="border-border/50 rounded-2xl">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="w-5 h-5" />
                    Lista detalhada de receitas
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {revenuesInPeriod.length} {revenuesInPeriod.length === 1 ? "lançamento" : "lançamentos"} no período
                  </p>
                </CardHeader>
                <CardContent>
                  {revenuesInPeriod.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      Nenhuma receita no período selecionado.
                    </div>
                  ) : (
                    <div className="overflow-x-auto rounded-xl border border-border/50">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>
                              <button
                                type="button"
                                className="flex items-center text-xs font-medium text-muted-foreground"
                                onClick={() => handleReceitaColumnSort("date")}
                              >
                                Data
                                {sortByReceita === "date" ? (
                                  sortOrderReceita === "asc" ? (
                                    <ArrowUp className="ml-1 h-3 w-3" />
                                  ) : (
                                    <ArrowDown className="ml-1 h-3 w-3" />
                                  )
                                ) : (
                                  <ArrowUpDown className="ml-1 h-3 w-3 opacity-50" />
                                )}
                              </button>
                            </TableHead>
                            <TableHead>
                              <button
                                type="button"
                                className="flex items-center text-xs font-medium text-muted-foreground"
                                onClick={() => handleReceitaColumnSort("description")}
                              >
                                Descrição
                                {sortByReceita === "description" ? (
                                  sortOrderReceita === "asc" ? (
                                    <ArrowUp className="ml-1 h-3 w-3" />
                                  ) : (
                                    <ArrowDown className="ml-1 h-3 w-3" />
                                  )
                                ) : (
                                  <ArrowUpDown className="ml-1 h-3 w-3 opacity-50" />
                                )}
                              </button>
                            </TableHead>
                            <TableHead>
                              <button
                                type="button"
                                className="flex items-center text-xs font-medium text-muted-foreground"
                                onClick={() => handleReceitaColumnSort("patient")}
                              >
                                Cliente
                                {sortByReceita === "patient" ? (
                                  sortOrderReceita === "asc" ? (
                                    <ArrowUp className="ml-1 h-3 w-3" />
                                  ) : (
                                    <ArrowDown className="ml-1 h-3 w-3" />
                                  )
                                ) : (
                                  <ArrowUpDown className="ml-1 h-3 w-3 opacity-50" />
                                )}
                              </button>
                            </TableHead>
                            <TableHead>
                              <button
                                type="button"
                                className="flex items-center text-xs font-medium text-muted-foreground"
                                onClick={() => handleReceitaColumnSort("category")}
                              >
                                Categoria
                                {sortByReceita === "category" ? (
                                  sortOrderReceita === "asc" ? (
                                    <ArrowUp className="ml-1 h-3 w-3" />
                                  ) : (
                                    <ArrowDown className="ml-1 h-3 w-3" />
                                  )
                                ) : (
                                  <ArrowUpDown className="ml-1 h-3 w-3 opacity-50" />
                                )}
                              </button>
                            </TableHead>
                            <TableHead className="text-right">
                              <button
                                type="button"
                                className="flex items-center justify-end w-full text-xs font-medium text-muted-foreground"
                                onClick={() => handleReceitaColumnSort("amount")}
                              >
                                Valor
                                {sortByReceita === "amount" ? (
                                  sortOrderReceita === "asc" ? (
                                    <ArrowUp className="ml-1 h-3 w-3" />
                                  ) : (
                                    <ArrowDown className="ml-1 h-3 w-3" />
                                  )
                                ) : (
                                  <ArrowUpDown className="ml-1 h-3 w-3 opacity-50" />
                                )}
                              </button>
                            </TableHead>
                            <TableHead>
                              <button
                                type="button"
                                className="flex items-center text-xs font-medium text-muted-foreground"
                                onClick={() => handleReceitaColumnSort("status")}
                              >
                                Status
                                {sortByReceita === "status" ? (
                                  sortOrderReceita === "asc" ? (
                                    <ArrowUp className="ml-1 h-3 w-3" />
                                  ) : (
                                    <ArrowDown className="ml-1 h-3 w-3" />
                                  )
                                ) : (
                                  <ArrowUpDown className="ml-1 h-3 w-3 opacity-50" />
                                )}
                              </button>
                            </TableHead>
                            <TableHead>
                              <button
                                type="button"
                                className="flex items-center text-xs font-medium text-muted-foreground"
                                onClick={() => handleReceitaColumnSort("source")}
                              >
                                Origem
                                {sortByReceita === "source" ? (
                                  sortOrderReceita === "asc" ? (
                                    <ArrowUp className="ml-1 h-3 w-3" />
                                  ) : (
                                    <ArrowDown className="ml-1 h-3 w-3" />
                                  )
                                ) : (
                                  <ArrowUpDown className="ml-1 h-3 w-3 opacity-50" />
                                )}
                              </button>
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {sortedRevenuesInPeriod.map((item) => (
                            <TableRow key={item.id}>
                              <TableCell className="font-medium whitespace-nowrap">
                                {format(new Date(item.date + "T12:00:00"), "dd/MM/yyyy", { locale: ptBR })}
                              </TableCell>
                              <TableCell className="max-w-[200px] truncate" title={item.description}>
                                {item.description}
                              </TableCell>
                              <TableCell className="max-w-[180px] truncate" title={item.patientName ?? undefined}>
                                {item.patientName ?? "—"}
                              </TableCell>
                              <TableCell className="text-muted-foreground text-sm">
                                {getCategoryLabel(item.categoryId ?? null)}
                              </TableCell>
                              <TableCell className="text-right font-semibold">
                                {formatCurrency(item.amount)}
                              </TableCell>
                              <TableCell>
                                <Badge
                                  variant={item.status === "received" ? "default" : "secondary"}
                                  className={cn(
                                    item.status === "received" && "bg-emerald-600 hover:bg-emerald-700 text-white"
                                  )}
                                >
                                  {getStatusLabel(item.status)}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-muted-foreground text-sm capitalize">
                                {item.source === "manual" ? "Manual" : "Agendamento"}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        <TabsContent value="despesa" className="mt-6 space-y-6">
          {expenseLoading ? (
            <Skeleton className="h-64 rounded-2xl" />
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Card className="border-border/50 rounded-2xl">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Total no período</CardTitle>
                    <DollarSign className="h-4 w-4 text-destructive" />
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold text-foreground">{formatCurrency(totalGeralDespesa)}</p>
                    <p className={cn("text-xs mt-1", formatPercentDiff(totalGeralDespesa, totalGeralDespesaPrev, true).className)}>
                      vs {periodoAnteriorLabel}: {formatPercentDiff(totalGeralDespesa, totalGeralDespesaPrev, true).text}
                    </p>
                  </CardContent>
                </Card>
                <Card className="border-border/50 rounded-2xl">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Pago</CardTitle>
                    <TrendingDown className="h-4 w-4 text-emerald-600" />
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(totalPagoDespesa)}</p>
                    <p className={cn("text-xs mt-1", formatPercentDiff(totalPagoDespesa, totalPagoDespesaPrev, true).className)}>
                      vs {periodoAnteriorLabel}: {formatPercentDiff(totalPagoDespesa, totalPagoDespesaPrev, true).text}
                    </p>
                  </CardContent>
                </Card>
                <Card className="border-border/50 rounded-2xl">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Pendente</CardTitle>
                    <TrendingDown className="h-4 w-4 text-amber-600" />
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{formatCurrency(totalPendenteDespesa)}</p>
                    <p className={cn("text-xs mt-1", formatPercentDiff(totalPendenteDespesa, totalPendenteDespesaPrev, true).className)}>
                      vs {periodoAnteriorLabel}: {formatPercentDiff(totalPendenteDespesa, totalPendenteDespesaPrev, true).text}
                    </p>
                  </CardContent>
                </Card>
              </div>

              <Card className="border-border/50 rounded-2xl">
                <CardHeader>
                  <CardTitle>Despesa por dia</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {MESES[selectedMonth - 1].label} de {selectedYear}
                  </p>
                </CardHeader>
                <CardContent>
                  {despesaChartData.length > 0 ? (
                    <ChartContainer config={despesaChartConfig} className="h-64 sm:h-80 w-full">
                      <BarChart data={despesaChartData} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                        <XAxis
                          dataKey="dia"
                          fontSize={12}
                          tickLine={false}
                          axisLine={false}
                          tick={{ fill: "hsl(var(--muted-foreground))" }}
                        />
                        <YAxis
                          fontSize={12}
                          tickLine={false}
                          axisLine={false}
                          tick={{ fill: "hsl(var(--muted-foreground))" }}
                          tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(v))}
                        />
                        <ChartTooltip
                          content={
                            <ChartTooltipContent
                              formatter={(value) => (
                                <>
                                  <span className="text-muted-foreground">Despesa</span>
                                  <span className="font-mono font-medium tabular-nums text-foreground">
                                    {formatCurrency(Number(value))}
                                  </span>
                                </>
                              )}
                            />
                          }
                        />
                        <Bar dataKey="despesa" fill="var(--color-despesa)" radius={4} />
                      </BarChart>
                    </ChartContainer>
                  ) : (
                    <div className="h-64 flex items-center justify-center text-muted-foreground rounded-lg border border-dashed">
                      Nenhuma despesa no período
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="border-border/50 rounded-2xl">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="w-5 h-5" />
                    Lista detalhada de despesas
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {expensesInPeriod.length} {expensesInPeriod.length === 1 ? "lançamento" : "lançamentos"} no período
                  </p>
                </CardHeader>
                <CardContent>
                  {expensesInPeriod.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      Nenhuma despesa no período selecionado.
                    </div>
                  ) : (
                    <div className="overflow-x-auto rounded-xl border border-border/50">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>
                              <button
                                type="button"
                                className="flex items-center text-xs font-medium text-muted-foreground"
                                onClick={() => handleDespesaColumnSort("date")}
                              >
                                Data
                                {sortByDespesa === "date" ? (
                                  sortOrderDespesa === "asc" ? (
                                    <ArrowUp className="ml-1 h-3 w-3" />
                                  ) : (
                                    <ArrowDown className="ml-1 h-3 w-3" />
                                  )
                                ) : (
                                  <ArrowUpDown className="ml-1 h-3 w-3 opacity-50" />
                                )}
                              </button>
                            </TableHead>
                            <TableHead>
                              <button
                                type="button"
                                className="flex items-center text-xs font-medium text-muted-foreground"
                                onClick={() => handleDespesaColumnSort("description")}
                              >
                                Descrição
                                {sortByDespesa === "description" ? (
                                  sortOrderDespesa === "asc" ? (
                                    <ArrowUp className="ml-1 h-3 w-3" />
                                  ) : (
                                    <ArrowDown className="ml-1 h-3 w-3" />
                                  )
                                ) : (
                                  <ArrowUpDown className="ml-1 h-3 w-3 opacity-50" />
                                )}
                              </button>
                            </TableHead>
                            <TableHead>
                              <button
                                type="button"
                                className="flex items-center text-xs font-medium text-muted-foreground"
                                onClick={() => handleDespesaColumnSort("patient")}
                              >
                                Responsável / Cliente
                                {sortByDespesa === "patient" ? (
                                  sortOrderDespesa === "asc" ? (
                                    <ArrowUp className="ml-1 h-3 w-3" />
                                  ) : (
                                    <ArrowDown className="ml-1 h-3 w-3" />
                                  )
                                ) : (
                                  <ArrowUpDown className="ml-1 h-3 w-3 opacity-50" />
                                )}
                              </button>
                            </TableHead>
                            <TableHead>
                              <button
                                type="button"
                                className="flex items-center text-xs font-medium text-muted-foreground"
                                onClick={() => handleDespesaColumnSort("category")}
                              >
                                Categoria
                                {sortByDespesa === "category" ? (
                                  sortOrderDespesa === "asc" ? (
                                    <ArrowUp className="ml-1 h-3 w-3" />
                                  ) : (
                                    <ArrowDown className="ml-1 h-3 w-3" />
                                  )
                                ) : (
                                  <ArrowUpDown className="ml-1 h-3 w-3 opacity-50" />
                                )}
                              </button>
                            </TableHead>
                            <TableHead className="text-right">
                              <button
                                type="button"
                                className="flex items-center justify-end w-full text-xs font-medium text-muted-foreground"
                                onClick={() => handleDespesaColumnSort("amount")}
                              >
                                Valor
                                {sortByDespesa === "amount" ? (
                                  sortOrderDespesa === "asc" ? (
                                    <ArrowUp className="ml-1 h-3 w-3" />
                                  ) : (
                                    <ArrowDown className="ml-1 h-3 w-3" />
                                  )
                                ) : (
                                  <ArrowUpDown className="ml-1 h-3 w-3 opacity-50" />
                                )}
                              </button>
                            </TableHead>
                            <TableHead>
                              <button
                                type="button"
                                className="flex items-center text-xs font-medium text-muted-foreground"
                                onClick={() => handleDespesaColumnSort("status")}
                              >
                                Status
                                {sortByDespesa === "status" ? (
                                  sortOrderDespesa === "asc" ? (
                                    <ArrowUp className="ml-1 h-3 w-3" />
                                  ) : (
                                    <ArrowDown className="ml-1 h-3 w-3" />
                                  )
                                ) : (
                                  <ArrowUpDown className="ml-1 h-3 w-3 opacity-50" />
                                )}
                              </button>
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {sortedExpensesInPeriod.map((item) => (
                            <TableRow key={item.id}>
                              <TableCell className="font-medium whitespace-nowrap">
                                {format(new Date(item.date + "T12:00:00"), "dd/MM/yyyy", { locale: ptBR })}
                              </TableCell>
                              <TableCell className="max-w-[200px] truncate" title={item.description}>
                                {item.description}
                              </TableCell>
                              <TableCell className="max-w-[180px] truncate" title={item.patientName ?? undefined}>
                                {item.patientName ?? "—"}
                              </TableCell>
                              <TableCell className="text-muted-foreground text-sm">
                                {getExpenseCategoryLabel(item.categoryId ?? null)}
                              </TableCell>
                              <TableCell className="text-right font-semibold">
                                {formatCurrency(item.amount)}
                              </TableCell>
                              <TableCell>
                                <Badge
                                  variant={countsAsPaid(item.status) ? "default" : "secondary"}
                                  className={cn(
                                    countsAsPaid(item.status) && "bg-emerald-600 hover:bg-emerald-700 text-white"
                                  )}
                                >
                                  {getExpenseStatusLabel(item.status)}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        <TabsContent value="receita-despesa" className="mt-6 space-y-6">
          {(revenueLoading || expenseLoading) ? (
            <Skeleton className="h-64 rounded-2xl" />
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Card className="border-border/50 rounded-2xl">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Total Receita</CardTitle>
                    <TrendingUp className="h-4 w-4 text-primary" />
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold text-primary">{formatCurrency(totalGeral)}</p>
                    <p className={cn("text-xs mt-1", formatPercentDiff(totalGeral, totalGeralPrev).className)}>
                      vs {periodoAnteriorLabel}: {formatPercentDiff(totalGeral, totalGeralPrev).text}
                    </p>
                  </CardContent>
                </Card>
                <Card className="border-border/50 rounded-2xl">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Total Despesa</CardTitle>
                    <TrendingDown className="h-4 w-4 text-destructive" />
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold text-destructive">{formatCurrency(totalGeralDespesa)}</p>
                    <p className={cn("text-xs mt-1", formatPercentDiff(totalGeralDespesa, totalGeralDespesaPrev, true).className)}>
                      vs {periodoAnteriorLabel}: {formatPercentDiff(totalGeralDespesa, totalGeralDespesaPrev, true).text}
                    </p>
                  </CardContent>
                </Card>
                <Card className="border-border/50 rounded-2xl">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Resultado</CardTitle>
                    <BarChart3 className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <p
                      className={cn(
                        "text-2xl font-bold",
                        resultadoReceitaDespesa > 0 && "text-emerald-600 dark:text-emerald-400",
                        resultadoReceitaDespesa < 0 && "text-destructive",
                        resultadoReceitaDespesa === 0 && "text-muted-foreground"
                      )}
                    >
                      {formatCurrency(resultadoReceitaDespesa)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {resultadoReceitaDespesa > 0 ? "Superávit" : resultadoReceitaDespesa < 0 ? "Déficit" : "Equilibrado"}
                    </p>
                    <p className={cn("text-xs mt-0.5", formatPercentDiff(resultadoReceitaDespesa, resultadoPrev).className)}>
                      vs {periodoAnteriorLabel}: {formatPercentDiff(resultadoReceitaDespesa, resultadoPrev).text}
                    </p>
                  </CardContent>
                </Card>
              </div>

              <Card className="border-border/50 rounded-2xl">
                <CardHeader>
                  <CardTitle>Receita X Despesa por dia</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {MESES[selectedMonth - 1].label} de {selectedYear} — barras lado a lado por dia
                  </p>
                </CardHeader>
                <CardContent>
                  {hasAnyReceitaDespesa ? (
                    <ChartContainer config={receitaDespesaChartConfig} className="h-64 sm:h-80 w-full">
                      <BarChart data={receitaDespesaChartData} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                        <XAxis
                          dataKey="dia"
                          fontSize={12}
                          tickLine={false}
                          axisLine={false}
                          tick={{ fill: "hsl(var(--muted-foreground))" }}
                        />
                        <YAxis
                          fontSize={12}
                          tickLine={false}
                          axisLine={false}
                          tick={{ fill: "hsl(var(--muted-foreground))" }}
                          tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(v))}
                        />
                        <ChartTooltip
                          content={
                            <ChartTooltipContent
                              formatter={(value, name) => (
                                <>
                                  <span className="text-muted-foreground">
                                    {name === "receita" ? "Receita" : "Despesa"}
                                  </span>
                                  <span className="font-mono font-medium tabular-nums text-foreground">
                                    {formatCurrency(Number(value))}
                                  </span>
                                </>
                              )}
                            />
                          }
                        />
                        <Bar dataKey="receita" fill="var(--color-receita)" radius={4} name="Receita" />
                        <Bar dataKey="despesa" fill="var(--color-despesa)" radius={4} name="Despesa" />
                      </BarChart>
                    </ChartContainer>
                  ) : (
                    <div className="h-64 flex items-center justify-center text-muted-foreground rounded-lg border border-dashed">
                      Nenhuma receita nem despesa no período
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="border-border/50 rounded-2xl">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="w-5 h-5" />
                    Movimentação do período (Receitas e Despesas)
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {revenuesInPeriod.length + expensesInPeriod.length} lançamentos no total
                  </p>
                </CardHeader>
                <CardContent>
                  {!hasAnyReceitaDespesa ? (
                    <div className="text-center py-12 text-muted-foreground">
                      Nenhum lançamento no período selecionado.
                    </div>
                  ) : (
                    <div className="overflow-x-auto rounded-xl border border-border/50">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>
                              <button
                                type="button"
                                className="flex items-center text-xs font-medium text-muted-foreground"
                                onClick={() => handleMovColumnSort("type")}
                              >
                                Tipo
                                {sortByMov === "type" ? (
                                  sortOrderMov === "asc" ? (
                                    <ArrowUp className="ml-1 h-3 w-3" />
                                  ) : (
                                    <ArrowDown className="ml-1 h-3 w-3" />
                                  )
                                ) : (
                                  <ArrowUpDown className="ml-1 h-3 w-3 opacity-50" />
                                )}
                              </button>
                            </TableHead>
                            <TableHead>
                              <button
                                type="button"
                                className="flex items-center text-xs font-medium text-muted-foreground"
                                onClick={() => handleMovColumnSort("date")}
                              >
                                Data
                                {sortByMov === "date" ? (
                                  sortOrderMov === "asc" ? (
                                    <ArrowUp className="ml-1 h-3 w-3" />
                                  ) : (
                                    <ArrowDown className="ml-1 h-3 w-3" />
                                  )
                                ) : (
                                  <ArrowUpDown className="ml-1 h-3 w-3 opacity-50" />
                                )}
                              </button>
                            </TableHead>
                            <TableHead>
                              <button
                                type="button"
                                className="flex items-center text-xs font-medium text-muted-foreground"
                                onClick={() => handleMovColumnSort("description")}
                              >
                                Descrição
                                {sortByMov === "description" ? (
                                  sortOrderMov === "asc" ? (
                                    <ArrowUp className="ml-1 h-3 w-3" />
                                  ) : (
                                    <ArrowDown className="ml-1 h-3 w-3" />
                                  )
                                ) : (
                                  <ArrowUpDown className="ml-1 h-3 w-3 opacity-50" />
                                )}
                              </button>
                            </TableHead>
                            <TableHead>
                              <button
                                type="button"
                                className="flex items-center text-xs font-medium text-muted-foreground"
                                onClick={() => handleMovColumnSort("patient")}
                              >
                                Cliente / Responsável
                                {sortByMov === "patient" ? (
                                  sortOrderMov === "asc" ? (
                                    <ArrowUp className="ml-1 h-3 w-3" />
                                  ) : (
                                    <ArrowDown className="ml-1 h-3 w-3" />
                                  )
                                ) : (
                                  <ArrowUpDown className="ml-1 h-3 w-3 opacity-50" />
                                )}
                              </button>
                            </TableHead>
                            <TableHead className="text-right">
                              <button
                                type="button"
                                className="flex items-center justify-end w-full text-xs font-medium text-muted-foreground"
                                onClick={() => handleMovColumnSort("amount")}
                              >
                                Valor
                                {sortByMov === "amount" ? (
                                  sortOrderMov === "asc" ? (
                                    <ArrowUp className="ml-1 h-3 w-3" />
                                  ) : (
                                    <ArrowDown className="ml-1 h-3 w-3" />
                                  )
                                ) : (
                                  <ArrowUpDown className="ml-1 h-3 w-3 opacity-50" />
                                )}
                              </button>
                            </TableHead>
                            <TableHead>
                              <button
                                type="button"
                                className="flex items-center text-xs font-medium text-muted-foreground"
                                onClick={() => handleMovColumnSort("status")}
                              >
                                Status
                                {sortByMov === "status" ? (
                                  sortOrderMov === "asc" ? (
                                    <ArrowUp className="ml-1 h-3 w-3" />
                                  ) : (
                                    <ArrowDown className="ml-1 h-3 w-3" />
                                  )
                                ) : (
                                  <ArrowUpDown className="ml-1 h-3 w-3 opacity-50" />
                                )}
                              </button>
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {sortedMovimentacaoUnificada.map((row) =>
                            row.tipo === "receita" ? (
                              <TableRow key={`r-${row.item.id}`}>
                                <TableCell>
                                  <Badge variant="default" className="bg-primary/90">
                                    Receita
                                  </Badge>
                                </TableCell>
                                <TableCell className="font-medium whitespace-nowrap">
                                  {format(new Date(row.item.date + "T12:00:00"), "dd/MM/yyyy", { locale: ptBR })}
                                </TableCell>
                                <TableCell className="max-w-[200px] truncate" title={row.item.description}>
                                  {row.item.description}
                                </TableCell>
                                <TableCell className="max-w-[180px] truncate" title={row.item.patientName ?? undefined}>
                                  {row.item.patientName ?? "—"}
                                </TableCell>
                                <TableCell className="text-right font-semibold text-primary">
                                  + {formatCurrency(row.item.amount)}
                                </TableCell>
                                <TableCell>
                                  <Badge variant="secondary" className="text-xs">
                                    {getStatusLabel(row.item.status)}
                                  </Badge>
                                </TableCell>
                              </TableRow>
                            ) : (
                              <TableRow key={`e-${row.item.id}`}>
                                <TableCell>
                                  <Badge variant="destructive" className="bg-destructive/90">
                                    Despesa
                                  </Badge>
                                </TableCell>
                                <TableCell className="font-medium whitespace-nowrap">
                                  {format(new Date(row.item.date + "T12:00:00"), "dd/MM/yyyy", { locale: ptBR })}
                                </TableCell>
                                <TableCell className="max-w-[200px] truncate" title={row.item.description}>
                                  {row.item.description}
                                </TableCell>
                                <TableCell className="max-w-[180px] truncate" title={row.item.patientName ?? undefined}>
                                  {row.item.patientName ?? "—"}
                                </TableCell>
                                <TableCell className="text-right font-semibold text-destructive">
                                  − {formatCurrency(row.item.amount)}
                                </TableCell>
                                <TableCell>
                                  <Badge variant="secondary" className="text-xs">
                                    {getExpenseStatusLabel(row.item.status)}
                                  </Badge>
                                </TableCell>
                              </TableRow>
                            )
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        <TabsContent value="comparativo" className="mt-6 space-y-6">
          {(revenueLoading || expenseLoading) ? (
            <Skeleton className="h-64 rounded-2xl" />
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
                <Card className="border-border/50 rounded-2xl">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs font-medium text-muted-foreground">Receita no ano</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-lg font-bold text-primary">{formatCurrency(totaisAnoComparativo.totalReceita)}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Média {formatCurrency(totaisAnoComparativo.mediaReceitaMensal)}/mês
                    </p>
                  </CardContent>
                </Card>
                <Card className="border-border/50 rounded-2xl">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs font-medium text-muted-foreground">Despesa no ano</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-lg font-bold text-destructive">{formatCurrency(totaisAnoComparativo.totalDespesa)}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Média {formatCurrency(totaisAnoComparativo.mediaDespesaMensal)}/mês
                    </p>
                  </CardContent>
                </Card>
                <Card className="border-border/50 rounded-2xl">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs font-medium text-muted-foreground">Resultado do ano</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p
                      className={cn(
                        "text-lg font-bold",
                        totaisAnoComparativo.resultado > 0 && "text-emerald-600 dark:text-emerald-400",
                        totaisAnoComparativo.resultado < 0 && "text-destructive",
                        totaisAnoComparativo.resultado === 0 && "text-muted-foreground"
                      )}
                    >
                      {formatCurrency(totaisAnoComparativo.resultado)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {totaisAnoComparativo.resultado > 0 ? "Superávit" : totaisAnoComparativo.resultado < 0 ? "Déficit" : "Equilibrado"}
                    </p>
                  </CardContent>
                </Card>
                <Card className="border-border/50 rounded-2xl">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs font-medium text-muted-foreground">Melhor mês (receita)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-lg font-bold text-foreground">{totaisAnoComparativo.melhorMes}</p>
                    <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-0.5">
                      {formatCurrency(totaisAnoComparativo.melhorMesReceita)}
                    </p>
                  </CardContent>
                </Card>
                <Card className="border-border/50 rounded-2xl">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs font-medium text-muted-foreground">Maior despesa (mês)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-lg font-bold text-foreground">{totaisAnoComparativo.piorMes}</p>
                    <p className="text-xs text-destructive mt-0.5">
                      {formatCurrency(totaisAnoComparativo.piorMesDespesa)}
                    </p>
                  </CardContent>
                </Card>
                <Card className="border-border/50 rounded-2xl">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs font-medium text-muted-foreground">Saldo médio/mês</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p
                      className={cn(
                        "text-lg font-bold",
                        totaisAnoComparativo.resultado >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"
                      )}
                    >
                      {formatCurrency(totaisAnoComparativo.resultado / 12)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">Resultado ÷ 12</p>
                  </CardContent>
                </Card>
              </div>

              <Card className="border-border/50 rounded-2xl">
                <CardHeader>
                  <CardTitle>Receita X Despesa — mês a mês</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Ano {selectedYear} — comparativo mensal
                  </p>
                </CardHeader>
                <CardContent>
                  <ChartContainer config={comparativoChartConfig} className="h-72 sm:h-96 w-full">
                    <BarChart data={comparativoMensalData} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                      <XAxis
                        dataKey="mes"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                        tick={{ fill: "hsl(var(--muted-foreground))" }}
                      />
                      <YAxis
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                        tick={{ fill: "hsl(var(--muted-foreground))" }}
                        tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(v))}
                      />
                      <ChartTooltip
                        content={
                          <ChartTooltipContent
                            formatter={(value, name) => (
                              <>
                                <span className="text-muted-foreground">
                                  {name === "receita" ? "Receita" : name === "despesa" ? "Despesa" : "Resultado"}
                                </span>
                                <span className="font-mono font-medium tabular-nums text-foreground">
                                  {formatCurrency(Number(value))}
                                </span>
                              </>
                            )}
                          />
                        }
                      />
                      <Bar dataKey="receita" fill="var(--color-receita)" radius={4} name="Receita" />
                      <Bar dataKey="despesa" fill="var(--color-despesa)" radius={4} name="Despesa" />
                    </BarChart>
                  </ChartContainer>
                </CardContent>
              </Card>

              <Card className="border-border/50 rounded-2xl">
                <CardHeader>
                  <CardTitle>Resultado por mês</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Receita − Despesa em cada mês de {selectedYear}
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                    {comparativoMensalData.map((d) => (
                      <div
                        key={d.mes}
                        className={cn(
                          "rounded-xl border p-3 text-center",
                          d.resultado >= 0 ? "border-emerald-200 bg-emerald-50/50 dark:border-emerald-900 dark:bg-emerald-950/30" : "border-destructive/30 bg-destructive/5"
                        )}
                      >
                        <p className="text-xs font-medium text-muted-foreground">{d.mes}</p>
                        <p
                          className={cn(
                            "font-bold text-sm mt-0.5",
                            d.resultado >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"
                          )}
                        >
                          {formatCurrency(d.resultado)}
                        </p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
