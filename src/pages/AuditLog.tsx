import { ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Activity,
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Copy,
  Database,
  Eye,
  ExternalLink,
  Filter,
  Loader2,
  Play,
  RefreshCcw,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { NotificationQueueVisibility } from "@/components/NotificationQueueVisibility";

type DispatchLogRow = {
  id: string;
  service: string;
  event_key: string;
  channel: string;
  recipient: string;
  status: string;
  error_message: string | null;
  created_at: string;
  dedupe_key: string | null;
  payload_json: {
    paciente_nome?: string;
  } | null;
  notification_settings: { name: string } | null;
};

type MinioAuditLogRow = {
  id: string;
  action: string;
  status: string;
  module: string | null;
  correlation_id: string | null;
  actor_user_id: string | null;
  storage_key: string | null;
  bucket: string | null;
  message: string | null;
  error_message: string | null;
  created_at: string;
};

type StorageActorOption = {
  userId: string;
  name: string;
  email: string;
};

type SystemAuditLogRow = {
  id: string;
  actor_user_id: string | null;
  menu_group: string;
  menu: string;
  screen: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  message: string | null;
  metadata_json: {
    patientName?: string | null;
    patientId?: string | null;
    attendantName?: string | null;
    attendantId?: string | null;
    updatedFields?: string[];
    operationType?: string;
    previousStatus?: string | null;
    newStatus?: string | null;
    [key: string]: unknown;
  } | null;
  created_at: string;
};

const EVENT_LABELS: Record<string, string> = {
  agendamento_criado: "Agendamento criado",
  agendamento_confirmado: "Agendamento confirmado",
  agendamento_cancelado: "Agendamento cancelado",
  lembrete_consulta: "Lembrete de consulta",
  conta_criada: "Conta criada",
  conta_vencendo: "Conta vencendo",
  conta_vencida: "Conta vencida",
  pagamento_confirmado: "Pagamento confirmado",
  aniversario: "Aniversário",
};

const PAGE_SIZE_OPTIONS = [25, 50, 100] as const;
const DEFAULT_PAGE_SIZE = 50;

function sanitizePageSize(value: number): number {
  if (PAGE_SIZE_OPTIONS.includes(value as (typeof PAGE_SIZE_OPTIONS)[number])) {
    return value;
  }
  return DEFAULT_PAGE_SIZE;
}

function sanitizePage(value: number): number {
  return Number.isFinite(value) && value > 0 ? Math.trunc(value) : 1;
}

const AuditLog = () => {
  const { toast } = useToast();
  const [logs, setLogs] = useState<DispatchLogRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(DEFAULT_PAGE_SIZE);
  const [goToPageInput, setGoToPageInput] = useState<string>("1");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [serviceFilter, setServiceFilter] = useState<string>("all");
  const [channelFilter, setChannelFilter] = useState<string>("all");
  const [patientSearch, setPatientSearch] = useState("");
  const [recipientSearch, setRecipientSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [ruleFilter, setRuleFilter] = useState<string>("all");
  const [ruleOptions, setRuleOptions] = useState<{ id: string; name: string }[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [last24hMetrics, setLast24hMetrics] = useState({
    recentTotal: 0,
    successCount: 0,
    failedCount: 0,
    successRate: 0,
    topErrors: [] as Array<{ message: string; count: number }>,
  });
  const [minioLogs, setMinioLogs] = useState<MinioAuditLogRow[]>([]);
  const [minioLoading, setMinioLoading] = useState(false);
  const [storageTotalCount, setStorageTotalCount] = useState(0);
  const [storagePage, setStoragePage] = useState(1);
  const [storagePageSize, setStoragePageSize] = useState<number>(DEFAULT_PAGE_SIZE);
  const [storageGoToPageInput, setStorageGoToPageInput] = useState<string>("1");
  const [storageActionFilter, setStorageActionFilter] = useState<string>("all");
  const [storageStatusFilter, setStorageStatusFilter] = useState<string>("all");
  const [storageMenuFilter, setStorageMenuFilter] = useState<string>("all");
  const [storageActorFilter, setStorageActorFilter] = useState<string>("all");
  const [storageDateFrom, setStorageDateFrom] = useState("");
  const [storageDateTo, setStorageDateTo] = useState("");
  const [storageSortBy, setStorageSortBy] = useState<"created_at" | "action" | "status" | "module">("created_at");
  const [storageSortOrder, setStorageSortOrder] = useState<"asc" | "desc">("desc");
  const [storageMetrics, setStorageMetrics] = useState({
    recentTotal: 0,
    successCount: 0,
    failedCount: 0,
    successRate: 0,
    topErrors: [] as Array<{ message: string; count: number }>,
  });
  const [storageTrendMetrics, setStorageTrendMetrics] = useState({
    sevenDays: { total: 0, success: 0, failed: 0, successRate: 0 },
    thirtyDays: { total: 0, success: 0, failed: 0, successRate: 0 },
  });
  const [storageHealthAlert, setStorageHealthAlert] = useState<{
    show: boolean;
    total: number;
    failed: number;
    errorRate: number;
  }>({ show: false, total: 0, failed: 0, errorRate: 0 });
  const [storageActorOptions, setStorageActorOptions] = useState<StorageActorOption[]>([]);
  const [storageViewRow, setStorageViewRow] = useState<MinioAuditLogRow | null>(null);
  const [storageConfigSnapshot, setStorageConfigSnapshot] = useState<{
    endpoint: string;
    port: number;
    useSsl: boolean;
  } | null>(null);
  const [systemLogs, setSystemLogs] = useState<SystemAuditLogRow[]>([]);
  const [systemLoading, setSystemLoading] = useState(false);
  const [systemTotalCount, setSystemTotalCount] = useState(0);
  const [systemPage, setSystemPage] = useState(1);
  const [systemPageSize, setSystemPageSize] = useState<number>(DEFAULT_PAGE_SIZE);
  const [systemGoToPageInput, setSystemGoToPageInput] = useState("1");
  const [systemActionFilter, setSystemActionFilter] = useState<string>("all");
  const [systemMenuFilter, setSystemMenuFilter] = useState<string>("all");
  const [systemDateFrom, setSystemDateFrom] = useState("");
  const [systemDateTo, setSystemDateTo] = useState("");
  const [selectedSystemLog, setSelectedSystemLog] = useState<SystemAuditLogRow | null>(null);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(totalCount / pageSize)),
    [totalCount, pageSize]
  );
  const storageTotalPages = useMemo(
    () => Math.max(1, Math.ceil(storageTotalCount / storagePageSize)),
    [storageTotalCount, storagePageSize]
  );
  const systemTotalPages = useMemo(
    () => Math.max(1, Math.ceil(systemTotalCount / systemPageSize)),
    [systemTotalCount, systemPageSize]
  );

  const applyQueryFilters = useCallback(
    (query: any) => {
      let q = query;
      if (statusFilter !== "all") q = q.eq("status", statusFilter);
      if (serviceFilter !== "all") q = q.eq("service", serviceFilter);
      if (channelFilter !== "all") q = q.eq("channel", channelFilter);
      if (ruleFilter !== "all") q = q.eq("notification_settings_id", ruleFilter);
      if (patientSearch.trim()) {
        q = q.ilike("payload_json->>paciente_nome", `%${patientSearch.trim()}%`);
      }
      if (recipientSearch.trim()) {
        q = q.ilike("recipient", `%${recipientSearch.trim()}%`);
      }
      if (dateFrom) q = q.gte("created_at", `${dateFrom}T00:00:00`);
      if (dateTo) q = q.lte("created_at", `${dateTo}T23:59:59`);
      return q;
    },
    [statusFilter, serviceFilter, channelFilter, ruleFilter, patientSearch, recipientSearch, dateFrom, dateTo]
  );

  const loadLogs = useCallback(async () => {
    setIsLoading(true);
    try {
      const safePage = sanitizePage(page);
      const safePageSize = sanitizePageSize(pageSize);
      const start = (safePage - 1) * safePageSize;
      const end = start + safePageSize - 1;

      let query = supabase
        .from("notification_dispatch_logs")
        .select(
          "id, service, event_key, channel, recipient, status, error_message, created_at, dedupe_key, payload_json, notification_settings(name)",
          { count: "exact" }
        );

      query = applyQueryFilters(query);

      const { data, error, count } = await query
        .order("created_at", { ascending: false })
        .range(start, end);

      if (error) throw error;
      setLogs((data || []) as DispatchLogRow[]);
      setTotalCount(count || 0);
    } catch (err: any) {
      toast({
        title: "Erro ao carregar logs",
        description: err?.message || "Não foi possível carregar os logs de auditoria.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast, page, pageSize, applyQueryFilters]);

  const loadMinioLogs = useCallback(async () => {
    setMinioLoading(true);
    try {
      const safeStoragePage = sanitizePage(storagePage);
      const safeStoragePageSize = sanitizePageSize(storagePageSize);
      const start = (safeStoragePage - 1) * safeStoragePageSize;
      const end = start + safeStoragePageSize - 1;

      let query = supabase
        .from("minio_storage_audit_logs")
        .select(
          "id, action, status, module, correlation_id, actor_user_id, storage_key, bucket, message, error_message, created_at",
          {
            count: "exact",
          }
        );

      if (storageActionFilter !== "all") query = query.eq("action", storageActionFilter);
      if (storageStatusFilter !== "all") query = query.eq("status", storageStatusFilter);
      if (storageMenuFilter !== "all") query = query.eq("module", storageMenuFilter);
      if (storageActorFilter !== "all") query = query.eq("actor_user_id", storageActorFilter);
      if (storageDateFrom) query = query.gte("created_at", `${storageDateFrom}T00:00:00`);
      if (storageDateTo) query = query.lte("created_at", `${storageDateTo}T23:59:59`);

      const { data, error, count } = await query
        .order(storageSortBy, { ascending: storageSortOrder === "asc", nullsFirst: false })
        .range(start, end);
      if (error) throw error;
      setMinioLogs((data || []) as MinioAuditLogRow[]);
      setStorageTotalCount(count || 0);
    } catch (err: any) {
      toast({
        title: "Erro ao carregar logs Minio",
        description: err?.message || "Não foi possível carregar a auditoria de storage.",
        variant: "destructive",
      });
    } finally {
      setMinioLoading(false);
    }
  }, [
    toast,
    storageActionFilter,
    storageStatusFilter,
    storageMenuFilter,
    storageActorFilter,
    storageDateFrom,
    storageDateTo,
    storagePage,
    storagePageSize,
    storageSortBy,
    storageSortOrder,
  ]);

  const loadSystemLogs = useCallback(async () => {
    setSystemLoading(true);
    try {
      const safePage = sanitizePage(systemPage);
      const safePageSize = sanitizePageSize(systemPageSize);
      const start = (safePage - 1) * safePageSize;
      const end = start + safePageSize - 1;

      let query = supabase
        .from("system_audit_logs")
        .select(
          "id, actor_user_id, menu_group, menu, screen, action, entity_type, entity_id, message, metadata_json, created_at",
          { count: "exact" }
        );

      if (systemActionFilter !== "all") query = query.eq("action", systemActionFilter);
      if (systemMenuFilter !== "all") {
        if (systemMenuFilter.includes("::")) {
          const [menuGroup, menu] = systemMenuFilter.split("::");
          query = query.eq("menu_group", menuGroup).eq("menu", menu);
        } else {
          query = query.eq("menu", systemMenuFilter);
        }
      }
      if (systemDateFrom) query = query.gte("created_at", `${systemDateFrom}T00:00:00`);
      if (systemDateTo) query = query.lte("created_at", `${systemDateTo}T23:59:59`);

      const { data, error, count } = await query
        .order("created_at", { ascending: false })
        .range(start, end);
      if (error) throw error;

      setSystemLogs((data || []) as SystemAuditLogRow[]);
      setSystemTotalCount(count || 0);
    } catch (err: any) {
      toast({
        title: "Erro ao carregar logs do sistema",
        description: err?.message || "Não foi possível carregar os logs do sistema.",
        variant: "destructive",
      });
    } finally {
      setSystemLoading(false);
    }
  }, [toast, systemPage, systemPageSize, systemActionFilter, systemMenuFilter, systemDateFrom, systemDateTo]);

  const loadStorageMetrics = useCallback(async () => {
    try {
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const [successRes, failedRes, errorsRes] = await Promise.all([
        supabase
          .from("minio_storage_audit_logs")
          .select("id", { count: "exact", head: true })
          .gte("created_at", since)
          .eq("status", "success"),
        supabase
          .from("minio_storage_audit_logs")
          .select("id", { count: "exact", head: true })
          .gte("created_at", since)
          .eq("status", "error"),
        supabase
          .from("minio_storage_audit_logs")
          .select("error_message")
          .gte("created_at", since)
          .eq("status", "error")
          .limit(2000),
      ]);

      const successCount = successRes.count || 0;
      const failedCount = failedRes.count || 0;
      const total = successCount + failedCount;
      const successRate = total > 0 ? Math.round((successCount / total) * 100) : 0;

      const errorCounter = new Map<string, number>();
      for (const row of errorsRes.data || []) {
        const key = (row.error_message || "Erro não detalhado").trim();
        errorCounter.set(key, (errorCounter.get(key) || 0) + 1);
      }
      const topErrors = Array.from(errorCounter.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([message, count]) => ({ message, count }));

      setStorageMetrics({
        recentTotal: total,
        successCount,
        failedCount,
        successRate,
        topErrors,
      });
    } catch {
      // não quebra a tela
    }
  }, []);

  const loadStorageTrendMetrics = useCallback(async () => {
    try {
      const since7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const since30d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const [
        success7d,
        failed7d,
        success30d,
        failed30d,
      ] = await Promise.all([
        supabase
          .from("minio_storage_audit_logs")
          .select("id", { count: "exact", head: true })
          .gte("created_at", since7d)
          .eq("status", "success"),
        supabase
          .from("minio_storage_audit_logs")
          .select("id", { count: "exact", head: true })
          .gte("created_at", since7d)
          .eq("status", "error"),
        supabase
          .from("minio_storage_audit_logs")
          .select("id", { count: "exact", head: true })
          .gte("created_at", since30d)
          .eq("status", "success"),
        supabase
          .from("minio_storage_audit_logs")
          .select("id", { count: "exact", head: true })
          .gte("created_at", since30d)
          .eq("status", "error"),
      ]);

      const s7 = success7d.count || 0;
      const f7 = failed7d.count || 0;
      const t7 = s7 + f7;
      const s30 = success30d.count || 0;
      const f30 = failed30d.count || 0;
      const t30 = s30 + f30;

      setStorageTrendMetrics({
        sevenDays: {
          total: t7,
          success: s7,
          failed: f7,
          successRate: t7 > 0 ? Math.round((s7 / t7) * 100) : 0,
        },
        thirtyDays: {
          total: t30,
          success: s30,
          failed: f30,
          successRate: t30 > 0 ? Math.round((s30 / t30) * 100) : 0,
        },
      });
    } catch {
      // Não deve quebrar UI.
    }
  }, []);

  const loadStorageHealthAlert = useCallback(async () => {
    try {
      const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      const [successRes, failedRes] = await Promise.all([
        supabase
          .from("minio_storage_audit_logs")
          .select("id", { count: "exact", head: true })
          .gte("created_at", since)
          .eq("status", "success"),
        supabase
          .from("minio_storage_audit_logs")
          .select("id", { count: "exact", head: true })
          .gte("created_at", since)
          .eq("status", "error"),
      ]);
      const success = successRes.count || 0;
      const failed = failedRes.count || 0;
      const total = success + failed;
      const errorRate = total > 0 ? Math.round((failed / total) * 100) : 0;
      setStorageHealthAlert({
        show: total >= 5 && errorRate >= 20,
        total,
        failed,
        errorRate,
      });
    } catch {
      setStorageHealthAlert({ show: false, total: 0, failed: 0, errorRate: 0 });
    }
  }, []);

  const loadStorageActorOptions = useCallback(async () => {
    try {
      const { data: auditUsers, error: auditError } = await supabase
        .from("minio_storage_audit_logs")
        .select("actor_user_id")
        .not("actor_user_id", "is", null)
        .order("created_at", { ascending: false })
        .limit(2000);
      if (auditError) throw auditError;

      const userIds = Array.from(
        new Set(
          (auditUsers || [])
            .map((row) => row.actor_user_id)
            .filter((id): id is string => Boolean(id))
        )
      );
      if (userIds.length === 0) {
        setStorageActorOptions([]);
        return;
      }

      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("user_id, name, email")
        .in("user_id", userIds);
      if (profilesError) throw profilesError;

      const options = (profiles || [])
        .map((p) => ({
          userId: String(p.user_id),
          name: String(p.name || "Sem nome"),
          email: String(p.email || ""),
        }))
        .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));

      setStorageActorOptions(options);
    } catch {
      setStorageActorOptions([]);
    }
  }, []);

  const loadStorageConfigSnapshot = useCallback(async () => {
    try {
      const { data } = await supabase
        .from("minio_storage_config")
        .select("endpoint, port, use_ssl")
        .limit(1)
        .maybeSingle();
      if (!data) {
        setStorageConfigSnapshot(null);
        return;
      }
      setStorageConfigSnapshot({
        endpoint: String(data.endpoint || ""),
        port: Number(data.port) || 9000,
        useSsl: Boolean(data.use_ssl),
      });
    } catch {
      setStorageConfigSnapshot(null);
    }
  }, []);

  useEffect(() => {
    const safePage = sanitizePage(page);
    if (safePage !== page) setPage(safePage);
  }, [page]);

  useEffect(() => {
    const safePageSize = sanitizePageSize(pageSize);
    if (safePageSize !== pageSize) {
      setPageSize(safePageSize);
    }
  }, [pageSize]);

  useEffect(() => {
    const safeStoragePage = sanitizePage(storagePage);
    if (safeStoragePage !== storagePage) setStoragePage(safeStoragePage);
  }, [storagePage]);

  useEffect(() => {
    const safeStoragePageSize = sanitizePageSize(storagePageSize);
    if (safeStoragePageSize !== storagePageSize) {
      setStoragePageSize(safeStoragePageSize);
    }
  }, [storagePageSize]);

  useEffect(() => {
    const safeSystemPage = sanitizePage(systemPage);
    if (safeSystemPage !== systemPage) setSystemPage(safeSystemPage);
  }, [systemPage]);

  useEffect(() => {
    const safeSystemPageSize = sanitizePageSize(systemPageSize);
    if (safeSystemPageSize !== systemPageSize) {
      setSystemPageSize(safeSystemPageSize);
    }
  }, [systemPageSize]);

  const loadMetrics = useCallback(async () => {
    try {
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const [successRes, failedRes, errorsRes] = await Promise.all([
        supabase
          .from("notification_dispatch_logs")
          .select("id", { count: "exact", head: true })
          .gte("created_at", since)
          .eq("status", "success"),
        supabase
          .from("notification_dispatch_logs")
          .select("id", { count: "exact", head: true })
          .gte("created_at", since)
          .eq("status", "failed"),
        supabase
          .from("notification_dispatch_logs")
          .select("error_message")
          .gte("created_at", since)
          .eq("status", "failed")
          .limit(2000),
      ]);

      const successCount = successRes.count || 0;
      const failedCount = failedRes.count || 0;
      const total = successCount + failedCount;
      const successRate = total > 0 ? Math.round((successCount / total) * 100) : 0;

      const errorCounter = new Map<string, number>();
      for (const row of errorsRes.data || []) {
        const key = (row.error_message || "Erro não detalhado").trim();
        errorCounter.set(key, (errorCounter.get(key) || 0) + 1);
      }
      const topErrors = Array.from(errorCounter.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([message, count]) => ({ message, count }));

      setLast24hMetrics({
        recentTotal: total,
        successCount,
        failedCount,
        successRate,
        topErrors,
      });
    } catch {
      // métricas não devem quebrar a tela
    }
  }, []);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  useEffect(() => {
    loadMinioLogs();
  }, [loadMinioLogs]);

  useEffect(() => {
    loadStorageMetrics();
  }, [loadStorageMetrics]);

  useEffect(() => {
    loadStorageTrendMetrics();
  }, [loadStorageTrendMetrics]);

  useEffect(() => {
    loadStorageHealthAlert();
  }, [loadStorageHealthAlert]);

  useEffect(() => {
    loadStorageActorOptions();
  }, [loadStorageActorOptions]);

  useEffect(() => {
    loadStorageConfigSnapshot();
  }, [loadStorageConfigSnapshot]);

  useEffect(() => {
    loadSystemLogs();
  }, [loadSystemLogs]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
      setGoToPageInput(String(totalPages));
      return;
    }
    setGoToPageInput(String(page));
  }, [page, totalPages]);

  useEffect(() => {
    if (storagePage > storageTotalPages) {
      setStoragePage(storageTotalPages);
      setStorageGoToPageInput(String(storageTotalPages));
      return;
    }
    setStorageGoToPageInput(String(storagePage));
  }, [storagePage, storageTotalPages]);

  useEffect(() => {
    if (systemPage > systemTotalPages) {
      setSystemPage(systemTotalPages);
      setSystemGoToPageInput(String(systemTotalPages));
      return;
    }
    setSystemGoToPageInput(String(systemPage));
  }, [systemPage, systemTotalPages]);

  useEffect(() => {
    loadMetrics();
  }, [loadMetrics]);

  const loadRuleOptions = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("notification_settings")
        .select("id, name")
        .order("name");
      if (!error && data) {
        setRuleOptions(data as { id: string; name: string }[]);
      }
    } catch {
      // silencioso
    }
  }, []);

  useEffect(() => {
    loadRuleOptions();
  }, [loadRuleOptions]);

  const handleProcessPending = async () => {
    setIsProcessing(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error("Sessão expirada. Faça login novamente para processar pendências.");
      }

      const projectUrl = import.meta.env.VITE_SUPABASE_URL as string;
      const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;
      const triggerUrl = `${projectUrl}/functions/v1/trigger-notification-scheduler`;
      if (!publishableKey) {
        throw new Error("VITE_SUPABASE_PUBLISHABLE_KEY não configurada no frontend.");
      }

      const response = await fetch(triggerUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
          apikey: publishableKey,
        },
        body: JSON.stringify({ trigger: "manual" }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(
          data?.error ||
            data?.message ||
            `Falha ao processar pendências (HTTP ${response.status}).`
        );
      }

      if (!data?.ok) throw new Error(data?.error || "Falha ao processar pendências.");

      let description =
        data?.processed != null
          ? `${data.processed} ocorrência(s) processada(s) pelo scheduler.`
          : "Eventos temporais de notificações foram processados.";
      const anivDebug = data?.debug?.aniversario as Record<string, unknown> | undefined;
      if (anivDebug) {
        const parts = [
          `Hoje (TZ): mês ${anivDebug.todayMonth}, dia ${anivDebug.todayDay}`,
          `Hora atual: ${anivDebug.currentHour}h`,
          `Hora envio: ${anivDebug.sendHour}h`,
          `Janela ok: ${anivDebug.inWindow ? "sim" : "não"}`,
        ];
        if (anivDebug.profilesWithBirthDate != null) parts.push(`Perfis com birth_date: ${anivDebug.profilesWithBirthDate}`);
        if (anivDebug.matchingProfiles != null) parts.push(`Perfis que batem (m/d): ${anivDebug.matchingProfiles}`);
        description += " " + parts.join(" • ");
      }

      toast({
        title: "Processamento concluído",
        description,
      });
      await Promise.all([loadLogs(), loadMetrics()]);
    } catch (error: any) {
      toast({
        title: "Falha no processamento",
        description: error?.message || "Erro ao processar pendências.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClearFilters = () => {
    setStatusFilter("all");
    setServiceFilter("all");
    setChannelFilter("all");
    setRuleFilter("all");
    setPatientSearch("");
    setRecipientSearch("");
    setDateFrom("");
    setDateTo("");
    setPage(1);
    setGoToPageInput("1");
  };

  const handleGoToPage = () => {
    const parsed = Number(goToPageInput);
    if (!Number.isFinite(parsed)) return;
    const nextPage = Math.min(Math.max(1, Math.trunc(parsed)), totalPages);
    setPage(nextPage);
  };

  const handleClearStorageFilters = () => {
    setStorageActionFilter("all");
    setStorageStatusFilter("all");
    setStorageMenuFilter("all");
    setStorageActorFilter("all");
    setStorageDateFrom("");
    setStorageDateTo("");
    setStoragePage(1);
    setStorageGoToPageInput("1");
  };

  const handleGoToStoragePage = () => {
    const parsed = Number(storageGoToPageInput);
    if (!Number.isFinite(parsed)) return;
    const nextPage = Math.min(Math.max(1, Math.trunc(parsed)), storageTotalPages);
    setStoragePage(nextPage);
  };

  const handleStorageSort = (column: "created_at" | "action" | "status" | "module") => {
    setStoragePage(1);
    setStorageGoToPageInput("1");
    setStorageSortBy((prev) => {
      if (prev === column) {
        setStorageSortOrder((old) => (old === "asc" ? "desc" : "asc"));
        return prev;
      }
      setStorageSortOrder("asc");
      return column;
    });
  };

  const handleClearSystemFilters = () => {
    setSystemActionFilter("all");
    setSystemMenuFilter("all");
    setSystemDateFrom("");
    setSystemDateTo("");
    setSystemPage(1);
    setSystemGoToPageInput("1");
  };

  const handleGoToSystemPage = () => {
    const parsed = Number(systemGoToPageInput);
    if (!Number.isFinite(parsed)) return;
    const nextPage = Math.min(Math.max(1, Math.trunc(parsed)), systemTotalPages);
    setSystemPage(nextPage);
  };

  const resolveSystemTarget = (row: SystemAuditLogRow): string => {
    const meta = row.metadata_json || {};
    const patient = meta.patientName || meta.patientId;
    const attendant = meta.attendantName || meta.attendantId;

    if (patient && attendant) {
      return `Paciente: ${patient} | Atendente: ${attendant}`;
    }
    if (patient) return `Paciente: ${patient}`;
    if (attendant) return `Atendente: ${attendant}`;
    return "-";
  };

  const formatMetadataValue = (value: unknown): string => {
    if (value === null || value === undefined) return "-";
    if (Array.isArray(value)) return value.join(", ");
    if (typeof value === "object") return JSON.stringify(value);
    return String(value);
  };

  const patientFieldLabelMap: Record<string, string> = {
    name: "Nome",
    email: "E-mail",
    phone: "Telefone",
    cpf: "CPF",
    rg: "RG",
    birth_date: "Data de nascimento",
    gender: "Gênero",
    profession: "Profissão",
    marital_status: "Estado civil",
    notes: "Observações",
    photo_url: "Foto",
    document_url: "Documento",
    plan_id: "Plano",
    address_cep: "CEP",
    address_street: "Rua/Avenida",
    address_number: "Número",
    address_complement: "Complemento",
    address_neighborhood: "Bairro",
    address_city: "Cidade",
    address_state: "Estado",
    status: "Status",
  };

  const humanizeFieldName = (fieldName: string): string => {
    return patientFieldLabelMap[fieldName] || fieldName;
  };

  const formatMetadataEntryValue = (key: string, value: unknown): string => {
    if (key === "updatedFields" && Array.isArray(value)) {
      return value.map((item) => humanizeFieldName(String(item))).join(", ");
    }
    return formatMetadataValue(value);
  };

  const renderMetadataEntryValue = (key: string, value: unknown): ReactNode => {
    if (key === "changedValues" && Array.isArray(value)) {
      const rows = value
        .filter((item) => typeof item === "object" && item !== null && "field" in item)
        .map((item) => item as { field: string; before: unknown; after: unknown });

      if (rows.length === 0) return "-";

      return (
        <div className="space-y-1.5">
          {rows.map((row, idx) => (
            <div key={`${row.field}-${idx}`} className="leading-relaxed">
              <span className="font-medium">{humanizeFieldName(row.field)}:</span>{" "}
              <span className="text-muted-foreground">de</span>{" "}
              <span>{formatMetadataValue(row.before)}</span>{" "}
              <span className="text-muted-foreground">para</span>{" "}
              <span>{formatMetadataValue(row.after)}</span>
            </div>
          ))}
        </div>
      );
    }

    return formatMetadataEntryValue(key, value);
  };

  const metadataLabelMap: Record<string, string> = {
    patientName: "Nome do paciente",
    patientId: "ID do paciente",
    attendantName: "Nome do atendente",
    attendantId: "ID do atendente",
    updatedFields: "Campos alterados",
    operationType: "Tipo de operação",
    changedValues: "Alterações (antes -> depois)",
    previousStatus: "Status anterior",
    newStatus: "Novo status",
    hasEmail: "Possui e-mail",
    hasPhone: "Possui telefone",
    status: "Status",
  };

  const getMetadataLabel = (key: string): string => {
    return metadataLabelMap[key] || key;
  };

  const resolveActorLabel = (actorUserId: string | null): string => {
    if (!actorUserId) return "-";
    const actor = storageActorOptions.find((item) => item.userId === actorUserId);
    if (!actor) return actorUserId;
    return actor.email ? `${actor.name} (${actor.email})` : actor.name;
  };

  const handleCopyText = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast({
        title: `${label} copiado`,
        description: "Valor copiado para a área de transferência.",
      });
    } catch {
      toast({
        title: `Falha ao copiar ${label.toLowerCase()}`,
        description: "Não foi possível copiar para a área de transferência.",
        variant: "destructive",
      });
    }
  };

  const handleOpenStorageObject = (row: MinioAuditLogRow) => {
    if (!row.storage_key || !row.bucket) {
      toast({
        title: "Sem chave/bucket",
        description: "Este registro não possui chave de objeto para abrir.",
        variant: "destructive",
      });
      return;
    }
    if (!storageConfigSnapshot?.endpoint) {
      toast({
        title: "Configuração Minio ausente",
        description: "Não foi possível montar URL do objeto sem endpoint configurado.",
        variant: "destructive",
      });
      return;
    }

    const protocol = storageConfigSnapshot.useSsl ? "https" : "http";
    const endpoint = storageConfigSnapshot.endpoint.replace(/^https?:\/\//, "").replace(/\/+$/, "");
    const portPart = storageConfigSnapshot.port ? `:${storageConfigSnapshot.port}` : "";
    const encodedObject = row.storage_key
      .split("/")
      .map((part) => encodeURIComponent(part))
      .join("/");
    const url = `${protocol}://${endpoint}${portPart}/${encodeURIComponent(row.bucket)}/${encodedObject}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-foreground">Auditoria</h1>
        <p className="text-muted-foreground">
          Acompanhe o histórico de envios e falhas de notificações.
        </p>
      </div>

      <Tabs defaultValue="notifications" className="space-y-4">
        <TabsList className="grid w-full max-w-xl grid-cols-3">
          <TabsTrigger value="notifications">Notificações</TabsTrigger>
          <TabsTrigger value="storage">Storage</TabsTrigger>
          <TabsTrigger value="system">Sistema</TabsTrigger>
        </TabsList>

        <TabsContent value="notifications">
          <Card className="border-0 shadow-sm">
            <CardHeader className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <CardTitle className="flex items-center gap-2">
                  <Activity className="w-5 h-5 text-primary" />
                  Log de Notificações
                </CardTitle>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={loadLogs} disabled={isLoading}>
                    {isLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-1" />
                    ) : (
                      <RefreshCcw className="w-4 h-4 mr-1" />
                    )}
                    Atualizar
                  </Button>
                  <Button variant="outline" onClick={handleClearFilters}>
                    Limpar filtros
                  </Button>
                  <Button
                    className="clinic-gradient text-white"
                    onClick={handleProcessPending}
                    disabled={isProcessing}
                  >
                    {isProcessing ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-1" />
                    ) : (
                      <Play className="w-4 h-4 mr-1" />
                    )}
                    Processar pendências
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-8 gap-3">
                <div className="space-y-1">
                  <Label>Regra</Label>
                  <Select
                    value={ruleFilter}
                    onValueChange={(value) => {
                      setRuleFilter(value);
                      setPage(1);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas</SelectItem>
                      {ruleOptions.map((r) => (
                        <SelectItem key={r.id} value={r.id}>
                          {r.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Status</Label>
                  <Select
                    value={statusFilter}
                    onValueChange={(value) => {
                      setStatusFilter(value);
                      setPage(1);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="success">Sucesso</SelectItem>
                      <SelectItem value="failed">Falha</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Serviço</Label>
                  <Select
                    value={serviceFilter}
                    onValueChange={(value) => {
                      setServiceFilter(value);
                      setPage(1);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="agenda">Agenda</SelectItem>
                      <SelectItem value="financeiro">Financeiro</SelectItem>
                      <SelectItem value="aniversario">Aniversário</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Canal</Label>
                  <Select
                    value={channelFilter}
                    onValueChange={(value) => {
                      setChannelFilter(value);
                      setPage(1);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="email">Email</SelectItem>
                      <SelectItem value="whatsapp">WhatsApp</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Paciente</Label>
                  <Input
                    value={patientSearch}
                    onChange={(e) => {
                      setPatientSearch(e.target.value);
                      setPage(1);
                    }}
                    placeholder="Buscar..."
                  />
                </div>
                <div className="space-y-1">
                  <Label>Destinatário</Label>
                  <Input
                    value={recipientSearch}
                    onChange={(e) => {
                      setRecipientSearch(e.target.value);
                      setPage(1);
                    }}
                    placeholder="Buscar..."
                  />
                </div>
                <div className="space-y-1">
                  <Label>De</Label>
                  <Input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => {
                      setDateFrom(e.target.value);
                      setPage(1);
                    }}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Até</Label>
                  <Input
                    type="date"
                    value={dateTo}
                    onChange={(e) => {
                      setDateTo(e.target.value);
                      setPage(1);
                    }}
                  />
                </div>
              </div>
            </CardHeader>

            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-3 mb-4">
            <div className="lg:col-span-1">
              <NotificationQueueVisibility />
            </div>
            <Card className="border-border/60">
              <CardContent className="py-4">
                <p className="text-xs text-muted-foreground">Taxa de sucesso (24h)</p>
                <p className="text-2xl font-bold text-foreground mt-1">
                  {last24hMetrics.successRate}%
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {last24hMetrics.successCount} sucesso(s) de {last24hMetrics.recentTotal} envio(s)
                </p>
              </CardContent>
            </Card>

            <Card className="border-border/60">
              <CardContent className="py-4">
                <p className="text-xs text-muted-foreground">Falhas (24h)</p>
                <p className="text-2xl font-bold text-destructive mt-1">
                  {last24hMetrics.failedCount}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Total de tentativas com status de falha
                </p>
              </CardContent>
            </Card>

            <Card className="border-border/60">
              <CardContent className="py-4">
                <p className="text-xs text-muted-foreground mb-2">Top erros (24h)</p>
                {last24hMetrics.topErrors.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Sem falhas no período.</p>
                ) : (
                  <div className="space-y-1.5">
                    {last24hMetrics.topErrors.map((item) => (
                      <div
                        key={`${item.message}-${item.count}`}
                        className="text-xs text-muted-foreground flex items-start justify-between gap-2"
                      >
                        <span className="truncate">{item.message}</span>
                        <Badge variant="secondary" className="shrink-0">
                          {item.count}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
                <Filter className="w-3 h-3" />
                {totalCount} registro(s) encontrado(s)
              </div>

              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data/Hora</TableHead>
                      <TableHead>Regra</TableHead>
                      <TableHead>Serviço</TableHead>
                      <TableHead>Evento</TableHead>
                      <TableHead>Canal</TableHead>
                      <TableHead>Paciente</TableHead>
                      <TableHead>Destinatário</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Erro</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                          Carregando...
                        </TableCell>
                      </TableRow>
                    ) : logs.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                          Nenhum log encontrado.
                        </TableCell>
                      </TableRow>
                    ) : (
                      logs.map((row) => (
                        <TableRow key={row.id}>
                          <TableCell className="text-xs">
                            {format(new Date(row.created_at), "dd/MM/yyyy HH:mm", {
                              locale: ptBR,
                            })}
                          </TableCell>
                          <TableCell className="max-w-[200px] truncate">
                            {row.notification_settings?.name || "-"}
                          </TableCell>
                          <TableCell className="capitalize">{row.service}</TableCell>
                          <TableCell>{EVENT_LABELS[row.event_key] || row.event_key}</TableCell>
                          <TableCell className="uppercase">{row.channel}</TableCell>
                          <TableCell className="max-w-[220px] truncate">
                            {row.payload_json?.paciente_nome || "-"}
                          </TableCell>
                          <TableCell className="max-w-[220px] truncate">{row.recipient}</TableCell>
                          <TableCell>
                            <Badge variant={row.status === "success" ? "default" : "destructive"}>
                              {row.status === "success" ? "Sucesso" : "Falha"}
                            </Badge>
                          </TableCell>
                          <TableCell
                            className="max-w-[300px] truncate text-xs text-muted-foreground"
                            title={row.error_message || undefined}
                          >
                            {row.error_message || "-"}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
              <div className="flex items-center justify-between mt-4">
                <p className="text-xs text-muted-foreground">
                  Página {page} de {totalPages}
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center gap-2">
                    <Label className="text-xs text-muted-foreground">Itens/página</Label>
                    <Select
                      value={String(pageSize)}
                      onValueChange={(value) => {
                        setPageSize(sanitizePageSize(Number(value)));
                        setPage(1);
                        setGoToPageInput("1");
                      }}
                    >
                      <SelectTrigger className="h-8 w-20">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PAGE_SIZE_OPTIONS.map((option) => (
                          <SelectItem key={option} value={String(option)}>
                            {option}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page <= 1 || isLoading}
                    onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                  >
                    Anterior
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= totalPages || isLoading}
                    onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                  >
                    Próxima
                  </Button>
                  <div className="flex items-center gap-1">
                    <Input
                      type="number"
                      min={1}
                      max={totalPages}
                      value={goToPageInput}
                      onChange={(e) => setGoToPageInput(e.target.value)}
                      className="h-8 w-20"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleGoToPage}
                      disabled={isLoading}
                    >
                      Ir
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="storage">
          <Card className="border-0 shadow-sm">
            <CardHeader className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <CardTitle className="flex items-center gap-2">
                  <Database className="w-5 h-5 text-primary" />
                  Auditoria de Storage Minio
                </CardTitle>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={loadMinioLogs} disabled={minioLoading}>
                    {minioLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-1" />
                    ) : (
                      <RefreshCcw className="w-4 h-4 mr-1" />
                    )}
                    Atualizar
                  </Button>
                  <Button variant="outline" onClick={handleClearStorageFilters}>
                    Limpar filtros
                  </Button>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                Mostra uploads, remoções e limpezas de órfãos no Minio (sucessos e falhas).
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3">
                <div className="space-y-1">
                  <Label>Ação</Label>
                  <Select
                    value={storageActionFilter}
                    onValueChange={(value) => {
                      setStorageActionFilter(value);
                      setStoragePage(1);
                      setStorageGoToPageInput("1");
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas</SelectItem>
                      <SelectItem value="upload">Upload</SelectItem>
                      <SelectItem value="remove">Remoção</SelectItem>
                      <SelectItem value="cleanup">Limpeza</SelectItem>
                      <SelectItem value="test">Teste</SelectItem>
                      <SelectItem value="other">Outro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Status</Label>
                  <Select
                    value={storageStatusFilter}
                    onValueChange={(value) => {
                      setStorageStatusFilter(value);
                      setStoragePage(1);
                      setStorageGoToPageInput("1");
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="success">Sucesso</SelectItem>
                      <SelectItem value="error">Falha</SelectItem>
                      <SelectItem value="info">Info</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Menu</Label>
                  <Select
                    value={storageMenuFilter}
                    onValueChange={(value) => {
                      setStorageMenuFilter(value);
                      setStoragePage(1);
                      setStorageGoToPageInput("1");
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="attendants">Atendentes</SelectItem>
                      <SelectItem value="integrations">Integrações</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Executor</Label>
                  <Select
                    value={storageActorFilter}
                    onValueChange={(value) => {
                      setStorageActorFilter(value);
                      setStoragePage(1);
                      setStorageGoToPageInput("1");
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      {storageActorOptions.map((actor) => (
                        <SelectItem key={actor.userId} value={actor.userId}>
                          {actor.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>De</Label>
                  <Input
                    type="date"
                    value={storageDateFrom}
                    onChange={(e) => {
                      setStorageDateFrom(e.target.value);
                      setStoragePage(1);
                      setStorageGoToPageInput("1");
                    }}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Até</Label>
                  <Input
                    type="date"
                    value={storageDateTo}
                    onChange={(e) => {
                      setStorageDateTo(e.target.value);
                      setStoragePage(1);
                      setStorageGoToPageInput("1");
                    }}
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
                <Card className="border-border/60">
                  <CardContent className="py-4">
                    <p className="text-xs text-muted-foreground">Taxa de sucesso (24h)</p>
                    <p className="text-2xl font-bold text-foreground mt-1">
                      {storageMetrics.successRate}%
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {storageMetrics.successCount} sucesso(s) de {storageMetrics.recentTotal} operação(ões)
                    </p>
                  </CardContent>
                </Card>
                <Card className="border-border/60">
                  <CardContent className="py-4">
                    <p className="text-xs text-muted-foreground">Falhas (24h)</p>
                    <p className="text-2xl font-bold text-destructive mt-1">
                      {storageMetrics.failedCount}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Total de operações com erro no período
                    </p>
                  </CardContent>
                </Card>
                <Card className="border-border/60">
                  <CardContent className="py-4">
                    <p className="text-xs text-muted-foreground mb-2">Top erros (24h)</p>
                    {storageMetrics.topErrors.length === 0 ? (
                      <p className="text-sm text-muted-foreground">Sem falhas no período.</p>
                    ) : (
                      <div className="space-y-1.5">
                        {storageMetrics.topErrors.map((item) => (
                          <div
                            key={`${item.message}-${item.count}`}
                            className="text-xs text-muted-foreground flex items-start justify-between gap-2"
                          >
                            <span className="truncate">{item.message}</span>
                            <Badge variant="secondary" className="shrink-0">
                              {item.count}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {storageHealthAlert.show ? (
                <div className="mb-4 rounded-md border border-amber-400/60 bg-amber-50 px-3 py-2 text-amber-900">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <AlertTriangle className="w-4 h-4" />
                    Alerta proativo de falhas (última 1h)
                  </div>
                  <p className="text-xs mt-1">
                    Taxa de erro em storage está em {storageHealthAlert.errorRate}% ({storageHealthAlert.failed} falha(s)
                    de {storageHealthAlert.total} operação(ões)).
                  </p>
                </div>
              ) : null}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                <Card className="border-border/60">
                  <CardContent className="py-4">
                    <p className="text-xs text-muted-foreground">Tendência 7 dias</p>
                    <p className="text-2xl font-bold text-foreground mt-1">
                      {storageTrendMetrics.sevenDays.successRate}%
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {storageTrendMetrics.sevenDays.success} sucesso(s), {storageTrendMetrics.sevenDays.failed} falha(s) em{" "}
                      {storageTrendMetrics.sevenDays.total} operação(ões)
                    </p>
                  </CardContent>
                </Card>
                <Card className="border-border/60">
                  <CardContent className="py-4">
                    <p className="text-xs text-muted-foreground">Tendência 30 dias</p>
                    <p className="text-2xl font-bold text-foreground mt-1">
                      {storageTrendMetrics.thirtyDays.successRate}%
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {storageTrendMetrics.thirtyDays.success} sucesso(s), {storageTrendMetrics.thirtyDays.failed} falha(s) em{" "}
                      {storageTrendMetrics.thirtyDays.total} operação(ões)
                    </p>
                  </CardContent>
                </Card>
              </div>

              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
                <Filter className="w-3 h-3" />
                {storageTotalCount} registro(s) encontrado(s)
              </div>

              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="-ml-2 h-8 font-medium"
                          onClick={() => handleStorageSort("created_at")}
                        >
                          Data/Hora
                          {storageSortBy === "created_at" ? (
                            storageSortOrder === "asc" ? (
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
                          onClick={() => handleStorageSort("action")}
                        >
                          Ação
                          {storageSortBy === "action" ? (
                            storageSortOrder === "asc" ? (
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
                          onClick={() => handleStorageSort("status")}
                        >
                          Status
                          {storageSortBy === "status" ? (
                            storageSortOrder === "asc" ? (
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
                          onClick={() => handleStorageSort("module")}
                        >
                          Menu
                          {storageSortBy === "module" ? (
                            storageSortOrder === "asc" ? (
                              <ArrowUp className="ml-1 h-4 w-4" />
                            ) : (
                              <ArrowDown className="ml-1 h-4 w-4" />
                            )
                          ) : (
                            <ArrowUpDown className="ml-1 h-4 w-4 opacity-50" />
                          )}
                        </Button>
                      </TableHead>
                      <TableHead>Executor</TableHead>
                      <TableHead>Correlação</TableHead>
                      <TableHead>Bucket</TableHead>
                      <TableHead>Chave</TableHead>
                      <TableHead>Mensagem</TableHead>
                      <TableHead>Erro</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {minioLoading ? (
                      <TableRow>
                        <TableCell colSpan={11} className="text-center py-8 text-muted-foreground">
                          Carregando...
                        </TableCell>
                      </TableRow>
                    ) : minioLogs.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={11} className="text-center py-8 text-muted-foreground">
                          Nenhum log de storage encontrado.
                        </TableCell>
                      </TableRow>
                    ) : (
                      minioLogs.map((row) => (
                        <TableRow key={row.id}>
                          <TableCell className="text-xs">
                            {format(new Date(row.created_at), "dd/MM/yyyy HH:mm", {
                              locale: ptBR,
                            })}
                          </TableCell>
                          <TableCell className="uppercase">{row.action}</TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                row.status === "success"
                                  ? "default"
                                  : row.status === "error"
                                    ? "destructive"
                                    : "secondary"
                              }
                            >
                              {row.status === "success"
                                ? "Sucesso"
                                : row.status === "error"
                                  ? "Falha"
                                  : "Info"}
                            </Badge>
                          </TableCell>
                          <TableCell>{row.module || "-"}</TableCell>
                          <TableCell className="max-w-[220px] truncate text-xs">
                            {resolveActorLabel(row.actor_user_id)}
                          </TableCell>
                          <TableCell className="max-w-[220px] truncate text-xs">
                            {row.correlation_id || "-"}
                          </TableCell>
                          <TableCell className="max-w-[180px] truncate">{row.bucket || "-"}</TableCell>
                          <TableCell className="max-w-[260px] truncate text-xs">{row.storage_key || "-"}</TableCell>
                          <TableCell className="max-w-[260px] truncate text-xs text-muted-foreground">
                            {row.message || "-"}
                          </TableCell>
                          <TableCell
                            className="max-w-[300px] truncate text-xs text-muted-foreground"
                            title={row.error_message || undefined}
                          >
                            {row.error_message || "-"}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 w-7 p-0"
                              title="Visualizar"
                              onClick={() => setStorageViewRow(row)}
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              <div className="flex items-center justify-between mt-4">
                <p className="text-xs text-muted-foreground">
                  Página {storagePage} de {storageTotalPages}
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center gap-2">
                    <Label className="text-xs text-muted-foreground">Itens/página</Label>
                    <Select
                      value={String(storagePageSize)}
                      onValueChange={(value) => {
                        setStoragePageSize(sanitizePageSize(Number(value)));
                        setStoragePage(1);
                        setStorageGoToPageInput("1");
                      }}
                    >
                      <SelectTrigger className="h-8 w-20">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PAGE_SIZE_OPTIONS.map((option) => (
                          <SelectItem key={option} value={String(option)}>
                            {option}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={storagePage <= 1 || minioLoading}
                    onClick={() => setStoragePage((prev) => Math.max(1, prev - 1))}
                  >
                    Anterior
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={storagePage >= storageTotalPages || minioLoading}
                    onClick={() => setStoragePage((prev) => Math.min(storageTotalPages, prev + 1))}
                  >
                    Próxima
                  </Button>
                  <div className="flex items-center gap-1">
                    <Input
                      type="number"
                      min={1}
                      max={storageTotalPages}
                      value={storageGoToPageInput}
                      onChange={(e) => setStorageGoToPageInput(e.target.value)}
                      className="h-8 w-20"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleGoToStoragePage}
                      disabled={minioLoading}
                    >
                      Ir
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Dialog open={!!storageViewRow} onOpenChange={(open) => !open && setStorageViewRow(null)}>
            <DialogContent className="sm:max-w-[520px] max-h-[90vh] overflow-y-auto p-0">
              {storageViewRow && (
                <>
                  <DialogHeader className="px-6 pt-6 pb-4 space-y-1">
                    <DialogTitle className="text-lg">Detalhes do registro de Storage</DialogTitle>
                    <DialogDescription className="text-sm">
                      Dados do evento de auditoria. Use os botões abaixo para copiar ou abrir o objeto no MinIO.
                    </DialogDescription>
                  </DialogHeader>

                  <div className="px-6 pb-6 space-y-5">
                    <section className="rounded-lg border bg-muted/30 p-4 space-y-3">
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Resumo do evento
                      </h4>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                        <div>
                          <p className="text-xs text-muted-foreground mb-0.5">Ação</p>
                          <p className="font-medium">{storageViewRow.action}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-0.5">Status</p>
                          <Badge
                            variant={
                              storageViewRow.status === "success"
                                ? "default"
                                : storageViewRow.status === "error"
                                  ? "destructive"
                                  : "secondary"
                            }
                            className="text-xs"
                          >
                            {storageViewRow.status === "success"
                              ? "Sucesso"
                              : storageViewRow.status === "error"
                                ? "Falha"
                                : "Info"}
                          </Badge>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-0.5">Módulo</p>
                          <p className="font-medium">{storageViewRow.module || "—"}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-0.5">Data/hora</p>
                          <p className="font-medium">
                            {format(
                              new Date(storageViewRow.created_at),
                              "dd/MM/yyyy HH:mm",
                              { locale: ptBR }
                            )}
                          </p>
                        </div>
                      </div>
                    </section>

                    <section className="rounded-lg border bg-muted/30 p-4 space-y-3">
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Identificação
                      </h4>
                      <div className="space-y-3 text-sm">
                        <div>
                          <p className="text-xs text-muted-foreground mb-0.5">ID do registro</p>
                          <p className="font-mono text-xs break-all text-foreground">
                            {storageViewRow.id}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-0.5">Correlação</p>
                          <p className="font-mono text-xs break-all text-foreground">
                            {storageViewRow.correlation_id || "—"}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-0.5">Responsável</p>
                          <p className="text-foreground">
                            {resolveActorLabel(storageViewRow.actor_user_id)}
                          </p>
                        </div>
                      </div>
                    </section>

                    <section className="rounded-lg border bg-muted/30 p-4 space-y-3">
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Storage
                      </h4>
                      <div className="space-y-3 text-sm">
                        <div>
                          <p className="text-xs text-muted-foreground mb-0.5">Bucket</p>
                          <p className="font-medium">{storageViewRow.bucket || "—"}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-0.5">Chave do objeto</p>
                          <p className="font-mono text-xs break-all text-foreground bg-background/50 rounded px-2 py-1.5">
                            {storageViewRow.storage_key || "—"}
                          </p>
                        </div>
                      </div>
                    </section>

                    <section className="rounded-lg border bg-muted/30 p-4 space-y-3">
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Detalhes
                      </h4>
                      <div className="space-y-3 text-sm">
                        <div>
                          <p className="text-xs text-muted-foreground mb-0.5">Mensagem</p>
                          <p className="text-foreground">{storageViewRow.message || "—"}</p>
                        </div>
                        {storageViewRow.error_message ? (
                          <div>
                            <p className="text-xs text-muted-foreground mb-0.5">Erro</p>
                            <p className="text-destructive text-sm break-words bg-destructive/5 rounded px-2 py-1.5">
                              {storageViewRow.error_message}
                            </p>
                          </div>
                        ) : null}
                      </div>
                    </section>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 px-6 py-4 border-t bg-muted/20 rounded-b-lg">
                    {storageViewRow.storage_key ? (
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1.5"
                        onClick={() => void handleCopyText(storageViewRow.storage_key || "", "Chave")}
                      >
                        <Copy className="w-3.5 h-3.5" />
                        Copiar chave
                      </Button>
                    ) : null}
                    {storageViewRow.correlation_id ? (
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1.5"
                        onClick={() =>
                          void handleCopyText(storageViewRow.correlation_id || "", "Correlação")
                        }
                      >
                        <Copy className="w-3.5 h-3.5" />
                        Copiar correlação
                      </Button>
                    ) : null}
                    {storageViewRow.storage_key && storageViewRow.bucket ? (
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1.5"
                        onClick={() => handleOpenStorageObject(storageViewRow)}
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        Abrir objeto na mídia
                      </Button>
                    ) : null}
                  </div>
                </>
              )}
            </DialogContent>
          </Dialog>
        </TabsContent>

        <TabsContent value="system">
          <Card className="border-0 shadow-sm">
            <CardHeader className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <CardTitle className="flex items-center gap-2">
                  <Activity className="w-5 h-5 text-primary" />
                  Log do Sistema
                </CardTitle>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={loadSystemLogs} disabled={systemLoading}>
                    {systemLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-1" />
                    ) : (
                      <RefreshCcw className="w-4 h-4 mr-1" />
                    )}
                    Atualizar
                  </Button>
                  <Button variant="outline" onClick={handleClearSystemFilters}>
                    Limpar filtros
                  </Button>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                Rastreia operações de cadastro, edição e exclusão por tela, com identificação de quem executou.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div className="space-y-1">
                  <Label>Ação</Label>
                  <Select
                    value={systemActionFilter}
                    onValueChange={(value) => {
                      setSystemActionFilter(value);
                      setSystemPage(1);
                      setSystemGoToPageInput("1");
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas</SelectItem>
                      <SelectItem value="create">Cadastro</SelectItem>
                      <SelectItem value="update">Edição</SelectItem>
                      <SelectItem value="delete">Exclusão</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Menu</Label>
                  <Select
                    value={systemMenuFilter}
                    onValueChange={(value) => {
                      setSystemMenuFilter(value);
                      setSystemPage(1);
                      setSystemGoToPageInput("1");
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectGroup>
                        <SelectLabel className="text-muted-foreground font-semibold">Navegação</SelectLabel>
                        <SelectItem value="Paciente">Paciente</SelectItem>
                        <SelectItem value="Prontuário">Prontuário</SelectItem>
                        <SelectItem value="Agenda">Agenda</SelectItem>
                        <SelectItem value="Receituário">Receituário</SelectItem>
                      </SelectGroup>
                      <SelectGroup>
                        <SelectLabel className="text-muted-foreground font-semibold">Financeiro</SelectLabel>
                        <SelectItem value="Receitas">Receitas</SelectItem>
                        <SelectItem value="Despesas">Despesas</SelectItem>
                        <SelectItem value="FINANCEIRO::Configurações">Configurações (Financeiro)</SelectItem>
                      </SelectGroup>
                      <SelectGroup>
                        <SelectLabel className="text-muted-foreground font-semibold">Gestão Técnica</SelectLabel>
                        <SelectItem value="Atendentes">Atendentes</SelectItem>
                        <SelectItem value="Horários">Horários</SelectItem>
                        <SelectItem value="Serviços">Serviços</SelectItem>
                      </SelectGroup>
                      <SelectGroup>
                        <SelectLabel className="text-muted-foreground font-semibold">Relatórios</SelectLabel>
                        <SelectItem value="Repasses">Repasses</SelectItem>
                      </SelectGroup>
                      <SelectGroup>
                        <SelectLabel className="text-muted-foreground font-semibold">Sistema</SelectLabel>
                        <SelectItem value="SISTEMA::Configurações">Configurações (Sistema)</SelectItem>
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>De</Label>
                  <Input
                    type="date"
                    value={systemDateFrom}
                    onChange={(e) => {
                      setSystemDateFrom(e.target.value);
                      setSystemPage(1);
                      setSystemGoToPageInput("1");
                    }}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Até</Label>
                  <Input
                    type="date"
                    value={systemDateTo}
                    onChange={(e) => {
                      setSystemDateTo(e.target.value);
                      setSystemPage(1);
                      setSystemGoToPageInput("1");
                    }}
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
                <Filter className="w-3 h-3" />
                {systemTotalCount} registro(s) encontrado(s)
              </div>

              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data/Hora</TableHead>
                      <TableHead>Grupo</TableHead>
                      <TableHead>Menu</TableHead>
                      <TableHead>Tela</TableHead>
                      <TableHead>Ação</TableHead>
                      <TableHead>Entidade</TableHead>
                      <TableHead>ID Entidade</TableHead>
                      <TableHead>Alvo</TableHead>
                      <TableHead>Executor</TableHead>
                      <TableHead>Mensagem</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {systemLoading ? (
                      <TableRow>
                        <TableCell colSpan={11} className="text-center py-8 text-muted-foreground">
                          Carregando...
                        </TableCell>
                      </TableRow>
                    ) : systemLogs.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={11} className="text-center py-8 text-muted-foreground">
                          Nenhum log de sistema encontrado.
                        </TableCell>
                      </TableRow>
                    ) : (
                      systemLogs.map((row) => (
                        <TableRow key={row.id}>
                          <TableCell className="text-xs">
                            {format(new Date(row.created_at), "dd/MM/yyyy HH:mm", {
                              locale: ptBR,
                            })}
                          </TableCell>
                          <TableCell>{row.menu_group}</TableCell>
                          <TableCell>{row.menu}</TableCell>
                          <TableCell>{row.screen}</TableCell>
                          <TableCell className="uppercase">{row.action}</TableCell>
                          <TableCell>{row.entity_type}</TableCell>
                          <TableCell className="max-w-[200px] truncate text-xs">{row.entity_id || "-"}</TableCell>
                          <TableCell className="max-w-[260px] truncate text-xs">
                            {resolveSystemTarget(row)}
                          </TableCell>
                          <TableCell className="max-w-[220px] truncate text-xs">
                            {resolveActorLabel(row.actor_user_id)}
                          </TableCell>
                          <TableCell className="max-w-[260px] truncate text-xs text-muted-foreground">
                            {row.message || "-"}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 w-7 p-0"
                              title="Ver detalhes"
                              onClick={() => setSelectedSystemLog(row)}
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              <div className="flex items-center justify-between mt-4">
                <p className="text-xs text-muted-foreground">
                  Página {systemPage} de {systemTotalPages}
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center gap-2">
                    <Label className="text-xs text-muted-foreground">Itens/página</Label>
                    <Select
                      value={String(systemPageSize)}
                      onValueChange={(value) => {
                        setSystemPageSize(sanitizePageSize(Number(value)));
                        setSystemPage(1);
                        setSystemGoToPageInput("1");
                      }}
                    >
                      <SelectTrigger className="h-8 w-20">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PAGE_SIZE_OPTIONS.map((option) => (
                          <SelectItem key={option} value={String(option)}>
                            {option}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={systemPage <= 1 || systemLoading}
                    onClick={() => setSystemPage((prev) => Math.max(1, prev - 1))}
                  >
                    Anterior
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={systemPage >= systemTotalPages || systemLoading}
                    onClick={() => setSystemPage((prev) => Math.min(systemTotalPages, prev + 1))}
                  >
                    Próxima
                  </Button>
                  <div className="flex items-center gap-1">
                    <Input
                      type="number"
                      min={1}
                      max={systemTotalPages}
                      value={systemGoToPageInput}
                      onChange={(e) => setSystemGoToPageInput(e.target.value)}
                      className="h-8 w-20"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleGoToSystemPage}
                      disabled={systemLoading}
                    >
                      Ir
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog
        open={Boolean(selectedSystemLog)}
        onOpenChange={(open) => {
          if (!open) setSelectedSystemLog(null);
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detalhes da ação</DialogTitle>
            <DialogDescription>
              Informações completas da operação registrada no log de sistema.
            </DialogDescription>
          </DialogHeader>
          {selectedSystemLog ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                <div><span className="font-medium">Data/Hora:</span> {format(new Date(selectedSystemLog.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}</div>
                <div><span className="font-medium">Ação:</span> {selectedSystemLog.action}</div>
                <div><span className="font-medium">Menu:</span> {selectedSystemLog.menu}</div>
                <div><span className="font-medium">Tela:</span> {selectedSystemLog.screen}</div>
                <div><span className="font-medium">Entidade:</span> {selectedSystemLog.entity_type}</div>
                <div><span className="font-medium">ID Entidade:</span> {selectedSystemLog.entity_id || "-"}</div>
                <div className="md:col-span-2"><span className="font-medium">Executor:</span> {resolveActorLabel(selectedSystemLog.actor_user_id)}</div>
                <div className="md:col-span-2"><span className="font-medium">Alvo:</span> {resolveSystemTarget(selectedSystemLog)}</div>
                <div className="md:col-span-2"><span className="font-medium">Mensagem:</span> {selectedSystemLog.message || "-"}</div>
              </div>

              <div>
                <p className="text-sm font-medium mb-2">Detalhes registrados</p>
                {selectedSystemLog.metadata_json ? (
                  <div className="rounded-md border p-3 max-h-64 overflow-auto space-y-2 text-xs">
                    {Object.entries(selectedSystemLog.metadata_json).map(([key, value]) => (
                      <div key={key} className="grid grid-cols-[160px_1fr] gap-2">
                        <span className="font-medium text-muted-foreground">{getMetadataLabel(key)}</span>
                        <span className="break-all">{renderMetadataEntryValue(key, value)}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">Sem detalhes adicionais.</p>
                )}
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AuditLog;
