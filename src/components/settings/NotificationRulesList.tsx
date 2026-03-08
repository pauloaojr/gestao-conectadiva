import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Eye,
  Loader2,
  Mail,
  Pencil,
  Power,
  Search,
  Trash2,
} from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { NotificationRule } from "@/hooks/useNotificationSettings";

type NotificationRulesListProps = {
  state: {
    rules: NotificationRule[];
    togglingRuleId: string | null;
  };
  actions: {
    onNewRule: () => void;
    onViewRule: (rule: NotificationRule) => void;
    onEditRule: (rule: NotificationRule) => void;
    onToggleEnabled: (rule: NotificationRule) => void;
    onDeleteRule: (rule: NotificationRule) => void;
  };
};

export function NotificationRulesList({
  state,
  actions,
}: NotificationRulesListProps) {
  const { rules, togglingRuleId } = state;
  const { onNewRule, onViewRule, onEditRule, onToggleEnabled, onDeleteRule } = actions;
  const [searchParams, setSearchParams] = useSearchParams();
  const [sortByFallback] = useState<"updated_desc">("updated_desc");
  const allowedSortValues = [
    "type_asc",
    "type_desc",
    "template_asc",
    "template_desc",
    "service_asc",
    "service_desc",
    "event_asc",
    "event_desc",
    "destino_asc",
    "destino_desc",
    "status_asc",
    "status_desc",
    "version_asc",
    "version_desc",
    "updated_asc",
    "updated_desc",
  ] as const;
  type SortBy = (typeof allowedSortValues)[number];
  type SortableColumn =
    | "type"
    | "template"
    | "service"
    | "event"
    | "destino"
    | "status"
    | "version"
    | "updated";
  const searchTerm = searchParams.get("notif_q") ?? "";
  const showOnlyEnabled = searchParams.get("notif_active") === "1";
  const rawSortBy = searchParams.get("notif_sort");
  const normalizedSortByFromQuery =
    rawSortBy === "name_asc"
      ? "template_asc"
      : rawSortBy === "name_desc"
      ? "template_desc"
      : rawSortBy;
  const sortBy: SortBy =
    normalizedSortByFromQuery &&
    allowedSortValues.includes(normalizedSortByFromQuery as SortBy)
      ? (normalizedSortByFromQuery as SortBy)
      : sortByFallback;
  const rawPage = Number(searchParams.get("notif_page") ?? "1");
  const page = Number.isFinite(rawPage) && rawPage > 0 ? Math.floor(rawPage) : 1;
  const PAGE_SIZE = 10;
  const hasActiveQueryFilters =
    searchParams.has("notif_q") ||
    searchParams.has("notif_active") ||
    searchParams.has("notif_sort") ||
    searchParams.has("notif_page");

  const updateQueryParams = useCallback(
    (updates: Record<string, string | null>) => {
      const next = new URLSearchParams(searchParams);
      Object.entries(updates).forEach(([key, value]) => {
        if (value === null || value === "") {
          next.delete(key);
        } else {
          next.set(key, value);
        }
      });
      setSearchParams(next, { replace: true });
    },
    [searchParams, setSearchParams]
  );

  const sortedRules = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    const filtered = rules.filter((rule) => {
      if (showOnlyEnabled && !rule.enabled) return false;
      if (!normalizedSearch) return true;
      const serviceLabel =
      rule.service === "agenda"
        ? "agenda"
        : rule.service === "financeiro"
        ? "financeiro"
        : "aniversário";
      const eventLabel = rule.eventKey.replaceAll("_", " ").toLowerCase();
      const targetLabel =
        rule.recipientTarget === "professional" ? "profissional" : "paciente";
      const searchable = `${rule.name} ${serviceLabel} ${eventLabel} ${targetLabel}`.toLowerCase();
      return searchable.includes(normalizedSearch);
    });
    return filtered.sort((a, b) => {
      const typeA = [...a.channels].sort().join(",");
      const typeB = [...b.channels].sort().join(",");
      const serviceA =
        a.service === "agenda"
          ? "Agenda"
          : a.service === "financeiro"
          ? "Financeiro"
          : "Aniversário";
      const serviceB =
        b.service === "agenda"
          ? "Agenda"
          : b.service === "financeiro"
          ? "Financeiro"
          : "Aniversário";
      const eventA = a.eventKey.replaceAll("_", " ");
      const eventB = b.eventKey.replaceAll("_", " ");
      const destinoA = a.recipientTarget === "professional" ? "Profissional" : "Paciente";
      const destinoB = b.recipientTarget === "professional" ? "Profissional" : "Paciente";
      const statusA = a.enabled ? "Ativa" : "Inativa";
      const statusB = b.enabled ? "Ativa" : "Inativa";
      const aTime = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
      const bTime = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
      const compareText = (left: string, right: string, asc: boolean) =>
        asc
          ? left.localeCompare(right, "pt-BR")
          : right.localeCompare(left, "pt-BR");

      switch (sortBy) {
        case "type_asc":
          return compareText(typeA, typeB, true);
        case "type_desc":
          return compareText(typeA, typeB, false);
        case "template_asc":
          return compareText(a.name, b.name, true);
        case "template_desc":
          return compareText(a.name, b.name, false);
        case "service_asc":
          return compareText(serviceA, serviceB, true);
        case "service_desc":
          return compareText(serviceA, serviceB, false);
        case "event_asc":
          return compareText(eventA, eventB, true);
        case "event_desc":
          return compareText(eventA, eventB, false);
        case "destino_asc":
          return compareText(destinoA, destinoB, true);
        case "destino_desc":
          return compareText(destinoA, destinoB, false);
        case "status_asc":
          return compareText(statusA, statusB, true);
        case "status_desc":
          return compareText(statusA, statusB, false);
        case "version_asc":
          return a.version - b.version;
        case "version_desc":
          return b.version - a.version;
        case "updated_asc":
          return aTime - bTime;
        case "updated_desc":
        default:
          return bTime - aTime;
      }
    });
  }, [rules, searchTerm, showOnlyEnabled, sortBy]);

  const totalPages = Math.max(1, Math.ceil(sortedRules.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageStart = (safePage - 1) * PAGE_SIZE;
  const paginatedRules = sortedRules.slice(pageStart, pageStart + PAGE_SIZE);

  useEffect(() => {
    if (safePage !== page) {
      updateQueryParams({ notif_page: String(safePage) });
    }
  }, [page, safePage, updateQueryParams]);

  const setSort = (column: SortableColumn) => {
    const currentIsAsc = sortBy === `${column}_asc`;
    const nextSort: SortBy = `${column}_${currentIsAsc ? "desc" : "asc"}` as SortBy;
    updateQueryParams({ notif_sort: nextSort, notif_page: "1" });
  };

  const sortIcon = (column: SortableColumn) => {
    if (sortBy === `${column}_asc`) return <ArrowUp className="h-3.5 w-3.5" />;
    if (sortBy === `${column}_desc`) return <ArrowDown className="h-3.5 w-3.5" />;
    return <ArrowUpDown className="h-3.5 w-3.5" />;
  };

  return (
    <div className="rounded-lg border bg-muted/20 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">Regras cadastradas</p>
        <span className="text-xs text-muted-foreground">{rules.length} regra(s)</span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3 rounded-md border bg-background p-3">
        <div className="space-y-1">
          <div className="space-y-1">
            <Label htmlFor="notification-rules-search" className="text-xs">
              Buscar templates
            </Label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2" />
              <Input
                id="notification-rules-search"
                value={searchTerm}
                onChange={(event) =>
                  updateQueryParams({
                    notif_q: event.target.value || null,
                    notif_page: "1",
                  })
                }
                placeholder="Buscar por nome, evento, serviço..."
                className="pl-8"
              />
            </div>
          </div>
        </div>
        <div className="flex items-end">
          <div className="flex items-center gap-2 pb-2">
            <Checkbox
              id="notification-rules-only-enabled"
              checked={showOnlyEnabled}
              onCheckedChange={(checked) =>
                updateQueryParams({
                  notif_active: checked === true ? "1" : null,
                  notif_page: "1",
                })
              }
            />
            <Label htmlFor="notification-rules-only-enabled" className="text-xs cursor-pointer">
              Mostrar apenas ativas
            </Label>
          </div>
        </div>
      </div>
      <div className="flex justify-end">
        <div className="flex items-center gap-2">
          {hasActiveQueryFilters ? (
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                updateQueryParams({
                  notif_q: null,
                  notif_active: null,
                  notif_sort: null,
                  notif_page: null,
                })
              }
            >
              Limpar filtros
            </Button>
          ) : null}
          <Button type="button" onClick={onNewRule} className="clinic-gradient text-white">
            Novo template
          </Button>
        </div>
      </div>
      {rules.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          Nenhum template criado ainda. Clique em "Novo template" para começar.
        </p>
      ) : sortedRules.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          Nenhum template encontrado com os filtros atuais.
        </p>
      ) : (
        <div className="space-y-3">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[90px]">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 px-1 -ml-1"
                    onClick={() => setSort("type")}
                  >
                    Tipo
                    {sortIcon("type")}
                  </Button>
                </TableHead>
                <TableHead>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 px-1 -ml-1"
                    onClick={() => setSort("template")}
                  >
                    Template
                    {sortIcon("template")}
                  </Button>
                </TableHead>
                <TableHead>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 px-1 -ml-1"
                    onClick={() => setSort("service")}
                  >
                    Serviço
                    {sortIcon("service")}
                  </Button>
                </TableHead>
                <TableHead>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 px-1 -ml-1"
                    onClick={() => setSort("event")}
                  >
                    Evento
                    {sortIcon("event")}
                  </Button>
                </TableHead>
                <TableHead>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 px-1 -ml-1"
                    onClick={() => setSort("destino")}
                  >
                    Destino
                    {sortIcon("destino")}
                  </Button>
                </TableHead>
                <TableHead>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 px-1 -ml-1"
                    onClick={() => setSort("status")}
                  >
                    Status
                    {sortIcon("status")}
                  </Button>
                </TableHead>
                <TableHead>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 px-1 -ml-1"
                    onClick={() => setSort("version")}
                  >
                    Versão
                    {sortIcon("version")}
                  </Button>
                </TableHead>
                <TableHead>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 px-1 -ml-1"
                    onClick={() => setSort("updated")}
                  >
                    Última atualização
                    {sortIcon("updated")}
                  </Button>
                </TableHead>
                <TableHead className="w-[120px] text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedRules.map((rule) => (
                <TableRow key={rule.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {rule.channels.includes("whatsapp") ? (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="inline-flex h-6 w-6 items-center justify-center overflow-hidden rounded-full border border-border bg-white text-blue-700 shadow-sm transition-transform duration-150 hover:scale-105 hover:shadow">
                              <img
                                src="/Whats.png"
                                alt="WhatsApp"
                                className="h-4 w-4 scale-[1.9] object-cover"
                              />
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>WhatsApp</TooltipContent>
                        </Tooltip>
                      ) : null}
                      {rule.channels.includes("email") ? (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-border bg-white text-blue-700 shadow-sm transition-transform duration-150 hover:scale-105 hover:shadow">
                              <Mail className="h-3.5 w-3.5" />
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>Email</TooltipContent>
                        </Tooltip>
                      ) : null}
                      {rule.channels.length === 0 ? (
                        <span className="text-xs text-muted-foreground">-</span>
                      ) : null}
                    </div>
                  </TableCell>
                  <TableCell className="font-medium max-w-[260px]">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="inline-block max-w-full truncate align-bottom cursor-help">
                          {rule.name}
                        </span>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-[460px] p-0">
                        <div className="rounded-md border bg-background">
                          <div className="border-b bg-muted/40 px-3 py-2">
                            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                              Nome da regra
                            </p>
                            <p className="mt-1 text-xs font-medium text-foreground">
                              {rule.name}
                            </p>
                          </div>
                          <div className="border-b bg-muted/20 px-3 py-2">
                            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                              Conteúdo do template
                            </p>
                          </div>
                          <div className="max-h-[260px] overflow-y-auto px-3 py-2">
                            <p className="text-xs leading-relaxed whitespace-pre-wrap">
                              {rule.message?.trim() || "Template sem conteúdo."}
                            </p>
                          </div>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </TableCell>
                  <TableCell>
                    {rule.service === "agenda"
                      ? "Agenda"
                      : rule.service === "financeiro"
                      ? "Financeiro"
                      : "Aniversário"}
                  </TableCell>
                  <TableCell>{rule.eventKey.replaceAll("_", " ")}</TableCell>
                  <TableCell>
                    {rule.recipientTarget === "professional"
                      ? "Profissional"
                      : "Paciente"}
                  </TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${
                        rule.enabled
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {rule.enabled ? "Ativa" : "Inativa"}
                    </span>
                  </TableCell>
                  <TableCell>v{rule.version}</TableCell>
                  <TableCell>
                    {rule.updatedAt
                      ? new Date(rule.updatedAt).toLocaleString("pt-BR")
                      : "-"}
                  </TableCell>
                  <TableCell className="w-[120px]">
                    <div className="flex items-center justify-end gap-1">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={() => onViewRule(rule)}
                            aria-label="Visualizar template"
                            className="h-6 w-6"
                          >
                            <Eye className="w-3 h-3" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Visualizar</TooltipContent>
                      </Tooltip>

                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={() => onEditRule(rule)}
                            aria-label="Editar template"
                            className="h-6 w-6"
                          >
                            <Pencil className="w-3 h-3" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Editar</TooltipContent>
                      </Tooltip>

                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            type="button"
                            size="icon"
                            variant="secondary"
                            onClick={() => onToggleEnabled(rule)}
                            disabled={togglingRuleId === rule.id}
                            aria-label={
                              rule.enabled
                                ? "Desativar template"
                                : "Ativar template"
                            }
                            className={`h-6 w-6 ${
                              rule.enabled
                                ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                                : "bg-muted text-muted-foreground hover:bg-muted/80"
                            }`}
                          >
                            {togglingRuleId === rule.id ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <Power className="w-3 h-3" />
                            )}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          {rule.enabled ? "Desativar" : "Ativar"}
                        </TooltipContent>
                      </Tooltip>

                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={() => onDeleteRule(rule)}
                            aria-label="Excluir regra"
                            className="h-6 w-6 text-destructive hover:text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Excluir regra</TooltipContent>
                      </Tooltip>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              Página {safePage} de {totalPages} • {sortedRules.length} template(s)
            </p>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  updateQueryParams({
                    notif_page: String(Math.max(1, safePage - 1)),
                  })
                }
                disabled={safePage === 1}
              >
                Anterior
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  updateQueryParams({
                    notif_page: String(Math.min(totalPages, safePage + 1)),
                  })
                }
                disabled={safePage === totalPages}
              >
                Próxima
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
