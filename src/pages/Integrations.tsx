import { useState, useMemo, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useEvolutionApiConfig } from "@/hooks/useEvolutionApiConfig";
import { useEmailSmtpConfig } from "@/hooks/useEmailSmtpConfig";
import { useMinioConfig } from "@/hooks/useMinioConfig";
import { recordMinioAuditLog } from "@/services/minioAuditLog";
import { supabase } from "@/integrations/supabase/client";
import {
  PlugZap,
  Globe,
  KeyRound,
  Phone,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Link2,
  Trash2,
  RotateCw,
  Mail,
  Server,
  Lock,
  User2,
  Database,
} from "lucide-react";

type EvolutionInstance = {
  instanceName: string;
  instanceId: string;
  status?: string;
  owner?: string | null;
  integration?: string | null;
};

const Integrations = () => {
  const { toast } = useToast();
  const { hasPermission } = useAuth();
  const canEditIntegrations = hasPermission("integrations", "edit");
  const canDeleteIntegrations = hasPermission("integrations", "delete");
  const { config, isLoading: configLoading, saveConfig, saveLastTestResult, setConfig } = useEvolutionApiConfig();
  const {
    config: emailConfig,
    isLoading: emailLoading,
    error: emailError,
    saveConfig: saveEmailConfig,
    setConfig: setEmailConfig,
  } = useEmailSmtpConfig();
  const {
    config: minioConfig,
    isLoading: minioLoading,
    error: minioError,
    saveConfig: saveMinioConfig,
    saveLastTestResult: saveMinioLastTestResult,
    setConfig: setMinioConfig,
  } = useMinioConfig();
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [instances, setInstances] = useState<EvolutionInstance[]>([]);
  const [instancesLoading, setInstancesLoading] = useState(false);
  const [instancesError, setInstancesError] = useState<string | null>(null);
  const [newInstanceName, setNewInstanceName] = useState("");
  const [newInstanceIntegration, setNewInstanceIntegration] = useState<"WHATSAPP-BAILEYS" | "WHATSAPP-BUSINESS">(
    "WHATSAPP-BAILEYS"
  );

  const [connectDialogOpen, setConnectDialogOpen] = useState(false);
  const [connectInstanceName, setConnectInstanceName] = useState<string | null>(null);
  const [connectQrBase64, setConnectQrBase64] = useState<string | null>(null);
  const [connectCount, setConnectCount] = useState<number | null>(null);
  const [connectLoading, setConnectLoading] = useState(false);
  const [connectError, setConnectError] = useState<string | null>(null);

  const [smtpTesting, setSmtpTesting] = useState(false);
  const [smtpSending, setSmtpSending] = useState(false);
  const [minioTesting, setMinioTesting] = useState(false);
  const [minioCleaning, setMinioCleaning] = useState(false);
  const [testEmailTo, setTestEmailTo] = useState("");

  const formatWhatsAppNumber = (ownerJid: string | null | undefined): string => {
    if (!ownerJid) return "-";
    const num = ownerJid.split("@")[0].trim();
    return num || "-";
  };

  const getStatusLabel = (status: string | undefined): string => {
    if (!status) return "-";
    const s = status.toLowerCase();
    if (s === "open") return "Conectado";
    if (s === "close") return "Desconectado";
    return status;
  };

  const fetchConnectInfo = async (instanceName: string) => {
    if (!config.baseUrl || !config.token) return;
    setConnectLoading(true);
    setConnectError(null);
    setConnectQrBase64(null);
    setConnectCount(null);
    try {
      const url = config.baseUrl.replace(/\/+$/, "");
      const connectUrl = `${url}/instance/connect/${encodeURIComponent(instanceName)}`;
      const response = await fetch(connectUrl, {
        method: "GET",
        headers: {
          apikey: config.token,
          "Content-Type": "application/json",
        },
      });
      if (!response.ok) {
        const text = await response.text();
        throw new Error(`HTTP ${response.status}: ${text.slice(0, 200)}`);
      }
      const data = await response.json();

      // QR Code em base64 (campo depende da versão da Evolution API)
      const qrRaw =
        data.qrCode ??
        data.qrcode ??
        data.qr_code ??
        data.qr ??
        data.qrImage ??
        data.qr_image ??
        data.qrCodeImage ??
        data.image ??
        data.base64 ??
        data.qr_base64 ??
        data.response?.qrCode ??
        data.response?.qrcode ??
        data.response?.qr ??
        null;

      setConnectQrBase64(typeof qrRaw === "string" ? qrRaw : null);
      setConnectCount(typeof data.count === "number" ? data.count : null);
    } catch (error: any) {
      setConnectError(error?.message || "Não foi possível gerar o código de conexão.");
    } finally {
      setConnectLoading(false);
    }
  };

  const openConnectDialogForInstance = async (instanceName: string) => {
    setConnectInstanceName(instanceName);
    setConnectDialogOpen(true);
    await fetchConnectInfo(instanceName);
  };

  const handleChange = <K extends keyof typeof config>(key: K, value: (typeof config)[K]) => {
    setConfig((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    if (!canEditIntegrations) return;
    setIsSaving(true);
    try {
      await saveConfig(config);
    } catch {
      // toast já é exibido pelo hook
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestConnection = async () => {
    if (!config.baseUrl || !config.token) {
      toast({
        title: "Preencha os campos obrigatórios",
        description: "URL da API e API Key são obrigatórios para o teste.",
        variant: "destructive",
      });
      return;
    }

    setIsTesting(true);

    try {
      const url = config.baseUrl.replace(/\/+$/, "");
      const testUrl = `${url}/instance/fetchInstances`;

      const response = await fetch(testUrl, {
        method: "GET",
        headers: {
          apikey: config.token,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const text = await response.text();
        const msg = `Status HTTP ${response.status}. Corpo da resposta: ${text.slice(0, 300)}`;
        setConfig((prev) => ({ ...prev, lastTestResult: "error", lastTestMessage: msg, lastTestAt: new Date().toISOString() }));
        await saveLastTestResult("error", msg);
        toast({
          title: "Falha na conexão",
          description: "A Evolution API respondeu com erro. Verifique URL e API Key.",
          variant: "destructive",
        });
        return;
      }

      const data = await response.json().catch(() => null);
      const msg = data ? JSON.stringify(data, null, 2).slice(0, 600) : "Conexão bem-sucedida.";
      setConfig((prev) => ({ ...prev, lastTestResult: "success", lastTestMessage: msg, lastTestAt: new Date().toISOString() }));
      await saveLastTestResult("success", msg);
      toast({
        title: "Conexão bem-sucedida",
        description: "A clínica conseguiu se comunicar com a Evolution API.",
      });
    } catch (error: any) {
      const msg = error?.message || "Erro desconhecido ao contatar a Evolution API.";
      setConfig((prev) => ({ ...prev, lastTestResult: "error", lastTestMessage: msg, lastTestAt: new Date().toISOString() }));
      await saveLastTestResult("error", msg);
      toast({
        title: "Erro na requisição",
        description:
          "Não foi possível contatar a Evolution API. Verifique se a URL está acessível e se não há bloqueio de CORS.",
        variant: "destructive",
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleTestMinioConnection = async () => {
    const correlationId = crypto.randomUUID();
    const backendUrl = emailConfig.backendUrl?.trim().replace(/\/+$/, "");
    if (!backendUrl) {
      toast({
        title: "Configure a URL do backend",
        description: "Defina a URL do backend na aba E-mail para testar a conectividade do Minio.",
        variant: "destructive",
      });
      return;
    }

    if (
      !minioConfig.endpoint.trim() ||
      !minioConfig.accessKey.trim() ||
      !minioConfig.secretKey.trim() ||
      !minioConfig.bucket.trim()
    ) {
      toast({
        title: "Campos obrigatórios do Minio",
        description: "Preencha endpoint, access key, secret key e bucket para executar o teste.",
        variant: "destructive",
      });
      return;
    }

    setMinioTesting(true);
    try {
      const response = await fetch(`${backendUrl}/api/storage/minio/test`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          config: {
            endpoint: minioConfig.endpoint,
            port: minioConfig.port,
            useSsl: minioConfig.useSsl,
            accessKey: minioConfig.accessKey,
            secretKey: minioConfig.secretKey,
            bucket: minioConfig.bucket,
            region: minioConfig.region,
            basePath: minioConfig.basePath,
          },
        }),
      });
      const data = await response.json().catch(() => ({}));
      const now = new Date().toISOString();
      if (response.ok && data?.success) {
        const message = String(data?.message || "Conectividade Minio validada.");
        setMinioConfig((prev) => ({
          ...prev,
          lastTestAt: now,
          lastTestResult: "success",
          lastTestMessage: message,
        }));
        await saveMinioLastTestResult("success", message);
        await recordMinioAuditLog({
          action: "test",
          status: "success",
          module: "integrations",
          correlationId,
          bucket: minioConfig.bucket || null,
          message,
          metadata: {
            endpoint: minioConfig.endpoint,
            port: minioConfig.port,
            useSsl: minioConfig.useSsl,
          },
        });
        toast({
          title: "Conexão com Minio OK",
          description: message,
        });
      } else {
        const message = String(
          data?.details ||
            data?.error ||
            `Falha no teste Minio (HTTP ${response.status}).`
        );
        setMinioConfig((prev) => ({
          ...prev,
          lastTestAt: now,
          lastTestResult: "error",
          lastTestMessage: message,
        }));
        await saveMinioLastTestResult("error", message);
        await recordMinioAuditLog({
          action: "test",
          status: "error",
          module: "integrations",
          correlationId,
          bucket: minioConfig.bucket || null,
          message: "Falha no teste de conectividade Minio.",
          errorMessage: message,
          metadata: {
            endpoint: minioConfig.endpoint,
            port: minioConfig.port,
            useSsl: minioConfig.useSsl,
          },
        });
        toast({
          title: "Falha no teste Minio",
          description: message,
          variant: "destructive",
        });
      }
    } catch (error: any) {
      const message = error?.message || "Erro inesperado no teste de conectividade Minio.";
      const now = new Date().toISOString();
      setMinioConfig((prev) => ({
        ...prev,
        lastTestAt: now,
        lastTestResult: "error",
        lastTestMessage: message,
      }));
      await saveMinioLastTestResult("error", message);
      await recordMinioAuditLog({
        action: "test",
        status: "error",
        module: "integrations",
        correlationId,
        bucket: minioConfig.bucket || null,
        message: "Erro inesperado no teste de conectividade Minio.",
        errorMessage: message,
      });
      toast({
        title: "Erro no teste Minio",
        description: message,
        variant: "destructive",
      });
    } finally {
      setMinioTesting(false);
    }
  };

  const handleCleanupOrphans = async () => {
    const correlationId = crypto.randomUUID();
    const backendUrl = emailConfig.backendUrl?.trim().replace(/\/+$/, "");
    if (!backendUrl) {
      toast({
        title: "Configure a URL do backend",
        description: "Defina a URL do backend na aba E-mail antes da limpeza de órfãos.",
        variant: "destructive",
      });
      return;
    }

    if (!minioConfig.bucket.trim() || !minioConfig.endpoint.trim()) {
      toast({
        title: "Configure o Minio",
        description: "Preencha endpoint e bucket para executar a limpeza.",
        variant: "destructive",
      });
      return;
    }

    setMinioCleaning(true);
    try {
      const configPayload = {
        endpoint: minioConfig.endpoint,
        port: minioConfig.port,
        useSsl: minioConfig.useSsl,
        accessKey: minioConfig.accessKey,
        secretKey: minioConfig.secretKey,
        bucket: minioConfig.bucket,
        region: minioConfig.region,
        basePath: minioConfig.basePath,
      };

      type ModuleConfig = { prefix: string; label: string; getKeys: () => Promise<string[]> };
      const modules: ModuleConfig[] = [
        {
          prefix: "attendants",
          label: "Atendentes",
          getKeys: async () => {
            const { data: rows, error } = await supabase
              .from("profiles")
              .select("avatar_storage_key, professional_document_storage_key, contract_document_storage_key");
            if (error) throw error;
            return (rows || [])
              .flatMap((r: any) => [
                r.avatar_storage_key,
                r.professional_document_storage_key,
                r.contract_document_storage_key,
              ])
              .filter((k: string) => Boolean(k && String(k).trim()) && !String(k).startsWith("data:"));
          },
        },
        {
          prefix: "patients",
          label: "Pacientes",
          getKeys: async () => {
            const { data: rows, error } = await supabase
              .from("patients")
              .select("photo_storage_key, document_storage_key");
            if (error) throw error;
            return (rows || [])
              .flatMap((r: any) => [r.photo_storage_key, r.document_storage_key])
              .filter((k: string) => Boolean(k && String(k).trim()) && !String(k).startsWith("data:"));
          },
        },
        {
          prefix: "revenue",
          label: "Receitas",
          getKeys: async () => {
            const { data: rows, error } = await supabase
              .from("revenue_attachments")
              .select("storage_key");
            if (error) throw error;
            return (rows || [])
              .map((r: any) => r.storage_key)
              .filter((k: string) => Boolean(k && String(k).trim()) && !String(k).startsWith("data:"));
          },
        },
        {
          prefix: "expenses",
          label: "Despesas",
          getKeys: async () => {
            const { data: rows, error } = await supabase
              .from("expense_attachments")
              .select("storage_key");
            if (error) throw error;
            return (rows || [])
              .map((r: any) => r.storage_key)
              .filter((k: string) => Boolean(k && String(k).trim()) && !String(k).startsWith("data:"));
          },
        },
      ];

      let totalOrphans = 0;
      for (const mod of modules) {
        const referencedKeys = Array.from(new Set(await mod.getKeys()));
        const dryRunResponse = await fetch(`${backendUrl}/api/storage/minio/cleanup-orphans`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            config: configPayload,
            prefix: mod.prefix,
            referencedKeys,
            dryRun: true,
          }),
        });
        const dryRunData = await dryRunResponse.json().catch(() => ({}));
        if (!dryRunResponse.ok || dryRunData?.success === false) {
          throw new Error(
            dryRunData?.details ||
              dryRunData?.error ||
              `Falha no dry-run para ${mod.label} (HTTP ${dryRunResponse.status}).`
          );
        }
        totalOrphans += Number(dryRunData?.orphanCount || 0);

        await recordMinioAuditLog({
          action: "cleanup",
          status: "info",
          module: "integrations",
          correlationId,
          bucket: minioConfig.bucket,
          prefix: mod.prefix,
          message: `Dry-run de limpeza de órfãos (${mod.label}) executado.`,
          metadata: {
            dryRun: true,
            scannedCount: dryRunData?.scannedCount ?? 0,
            orphanCount: dryRunData?.orphanCount ?? 0,
            referencedCount: dryRunData?.referencedCount ?? 0,
          },
        });
      }

      if (totalOrphans <= 0) {
        toast({
          title: "Dry-run concluído",
          description: "Nenhum arquivo órfão encontrado nos módulos (Atendentes, Pacientes, Receitas, Despesas).",
        });
        return;
      }

      const confirmed = window.confirm(
        `Dry-run encontrou ${totalOrphans} arquivo(s) órfão(s) nos módulos (Atendentes, Pacientes, Receitas, Despesas).\n` +
          `Deseja remover agora esses arquivos do Minio?`
      );
      if (!confirmed) {
        await recordMinioAuditLog({
          action: "cleanup",
          status: "info",
          module: "integrations",
          correlationId,
          bucket: minioConfig.bucket,
          prefix: "all",
          message: "Limpeza de órfãos cancelada após dry-run.",
          metadata: { dryRun: true, totalOrphans, cancelled: true },
        });
        toast({
          title: "Limpeza cancelada",
          description: "Os arquivos não foram removidos. Dry-run mantido para auditoria.",
        });
        return;
      }

      let totalRemoved = 0;
      let totalScanned = 0;
      for (const mod of modules) {
        const referencedKeys = Array.from(new Set(await mod.getKeys()));
        const response = await fetch(`${backendUrl}/api/storage/minio/cleanup-orphans`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            config: configPayload,
            prefix: mod.prefix,
            referencedKeys,
            dryRun: false,
          }),
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok || data?.success === false) {
          throw new Error(
            data?.details || data?.error || `Falha na limpeza para ${mod.label} (HTTP ${response.status}).`
          );
        }
        totalRemoved += Number(data?.removedCount || 0);
        totalScanned += Number(data?.scannedCount || 0);

        await recordMinioAuditLog({
          action: "cleanup",
          status: "success",
          module: "integrations",
          correlationId,
          bucket: minioConfig.bucket,
          prefix: mod.prefix,
          message: `Limpeza de órfãos (${mod.label}) executada com sucesso.`,
          metadata: {
            dryRun: false,
            scannedCount: data?.scannedCount ?? 0,
            orphanCount: data?.orphanCount ?? 0,
            removedCount: data?.removedCount ?? 0,
          },
        });
      }

      toast({
        title: "Limpeza concluída",
        description: `${totalRemoved} arquivo(s) órfão(s) removido(s). Escaneados: ${totalScanned}.`,
      });
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Erro ao limpar arquivos órfãos do Minio.";
      await recordMinioAuditLog({
        action: "cleanup",
        status: "error",
        module: "integrations",
        correlationId,
        bucket: minioConfig.bucket || null,
        prefix: "all",
        message: "Falha na rotina de limpeza de órfãos.",
        errorMessage: message,
      });
      toast({
        title: "Falha na limpeza",
        description: message,
        variant: "destructive",
      });
    } finally {
      setMinioCleaning(false);
    }
  };

  const maskedToken = useMemo(() => {
    if (!config.token) return "";
    if (config.token.length <= 10) return "••••••••";
    const start = config.token.slice(0, 4);
    const end = config.token.slice(-4);
    return `${start}••••••${end}`;
  }, [config.token]);

  const connectionStatus = useMemo<"not_configured" | "disabled" | "ready" | "connected" | "error">(() => {
    if (!config.baseUrl || !config.token) return "not_configured";
    if (!config.enabled) return "disabled";
    if (config.lastTestResult === "success") return "connected";
    if (config.lastTestResult === "error") return "error";
    return "ready";
  }, [config.baseUrl, config.token, config.enabled, config.lastTestResult]);

  const connectionStatusLabel: Record<typeof connectionStatus, string> = {
    not_configured: "Não configurada",
    disabled: "Desativada",
    ready: "Configurada (aguardando teste)",
    connected: "Conectada",
    error: "Erro na última conexão",
  };

  const canManageInstances = !!config.baseUrl && !!config.token;

  const handleTestSmtpConfig = async () => {
    const baseUrl = emailConfig.backendUrl?.trim().replace(/\/+$/, "");
    if (!baseUrl) {
      toast({
        title: "Configure a URL do backend",
        description: "Informe a URL do backend de e-mail (ex.: https://seu-backend.railway.app) para testar o SMTP.",
        variant: "destructive",
      });
      return;
    }
    if (!emailConfig.host?.trim() || !emailConfig.fromEmail?.trim()) {
      toast({
        title: "Preencha SMTP e remetente",
        description: "Informe o servidor SMTP e o e-mail do remetente.",
        variant: "destructive",
      });
      return;
    }
    setSmtpTesting(true);
    try {
      const res = await fetch(`${baseUrl}/api/email/test`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          config: {
            host: emailConfig.host,
            port: emailConfig.port,
            useTls: emailConfig.useTls,
            username: emailConfig.username,
            password: emailConfig.password,
            fromName: emailConfig.fromName,
            fromEmail: emailConfig.fromEmail,
          },
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast({
          title: "Falha no teste",
          description: data?.details || data?.error || `HTTP ${res.status}`,
          variant: "destructive",
        });
        return;
      }
      if (data?.error) {
        toast({
          title: "Falha no teste",
          description: data.details || data.error,
          variant: "destructive",
        });
        return;
      }
      toast({
        title: "Configuração OK",
        description: data?.message || "Teste concluído com sucesso.",
      });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Erro ao testar. Verifique se o backend está no ar e a URL está correta.";
      toast({
        title: "Erro no teste",
        description: msg,
        variant: "destructive",
      });
    } finally {
      setSmtpTesting(false);
    }
  };

  const handleSendTestEmail = async () => {
    const to = testEmailTo.trim();
    if (!to || !to.includes("@")) {
      toast({
        title: "E-mail inválido",
        description: "Informe um e-mail de destino para enviar o teste.",
        variant: "destructive",
      });
      return;
    }
    const baseUrl = emailConfig.backendUrl?.trim().replace(/\/+$/, "");
    if (!baseUrl || !emailConfig.host?.trim()) {
      toast({
        title: "Configure o backend e o SMTP",
        description: "Informe a URL do backend e o servidor SMTP.",
        variant: "destructive",
      });
      return;
    }
    setSmtpSending(true);
    try {
      const res = await fetch(`${baseUrl}/api/email/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          config: {
            host: emailConfig.host,
            port: emailConfig.port,
            useTls: emailConfig.useTls,
            username: emailConfig.username,
            password: emailConfig.password,
            fromName: emailConfig.fromName,
            fromEmail: emailConfig.fromEmail,
          },
          toEmail: to,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast({
          title: "Falha no envio",
          description: data?.details || data?.error || `HTTP ${res.status}`,
          variant: "destructive",
        });
        return;
      }
      if (data?.error) {
        toast({
          title: "Falha no envio",
          description: data.details || data.error,
          variant: "destructive",
        });
        return;
      }
      toast({
        title: "E-mail enviado",
        description: data?.message || `E-mail de teste enviado para ${to}.`,
      });
      setTestEmailTo("");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Erro ao enviar. Verifique se o backend está no ar.";
      toast({
        title: "Erro no envio",
        description: msg,
        variant: "destructive",
      });
    } finally {
      setSmtpSending(false);
    }
  };

  const fetchInstances = async () => {
    if (!canManageInstances) return;
    setInstancesLoading(true);
    setInstancesError(null);
    try {
      const url = config.baseUrl.replace(/\/+$/, "");
      const fetchUrl = `${url}/instance/fetchInstances`;
      const response = await fetch(fetchUrl, {
        method: "GET",
        headers: {
          apikey: config.token,
          "Content-Type": "application/json",
        },
      });
      if (!response.ok) {
        const text = await response.text();
        throw new Error(`HTTP ${response.status}: ${text.slice(0, 200)}`);
      }
      const data = await response.json();

      const normalize = (inst: any): EvolutionInstance | null => {
        if (inst == null) return null;
        const i = inst.instance ?? inst;
        const name =
          i.instanceName ?? i.instance_name ?? inst.instanceName ?? inst.instance_name ?? i.name ?? inst.name;
        const id =
          i.instanceId ?? i.instance_id ?? inst.instanceId ?? inst.instance_id ?? i.id ?? inst.id;
        if (name == null || name === "" || id == null || id === "") return null;
        const ownerRaw =
          i.ownerJid ?? inst.ownerJid ?? i.owner ?? inst.owner ?? i.ownerId ?? inst.ownerId ?? null;
        const statusRaw =
          i.connectionStatus ??
          inst.connectionStatus ??
          i.status ??
          inst.status ??
          i.connectionState ??
          inst.connectionState ??
          undefined;
        return {
          instanceName: String(name),
          instanceId: String(id),
          status: statusRaw != null ? String(statusRaw) : undefined,
          owner: ownerRaw != null ? String(ownerRaw) : null,
          integration:
            i.integration?.integration ??
            inst.integration?.integration ??
            (typeof i.integration === "string" ? i.integration : null) ??
            null,
        };
      };

      const pickInstanceArray = (obj: any): any[] | null => {
        if (Array.isArray(obj)) return obj;
        if (obj && typeof obj === "object") {
          if (Array.isArray(obj.response)) return obj.response;
          if (Array.isArray(obj.instances)) return obj.instances;
          if (Array.isArray(obj.data)) return obj.data;
          if (Array.isArray(obj.result)) return obj.result;
          if (Array.isArray(obj.message)) return obj.message;
          if (obj.instance && !Array.isArray(obj.instance)) return [obj];
          if (obj.response && typeof obj.response === "object" && !Array.isArray(obj.response)) {
            const r = obj.response;
            if (r.instance) return [r];
            if (r.instanceName != null || r.instanceId != null) return [r];
          }
          for (const key of Object.keys(obj)) {
            const val = obj[key];
            if (Array.isArray(val) && val.length > 0) {
              const first = val[0];
              const hasInstance =
                first?.instance != null ||
                first?.instanceName != null ||
                first?.instance_name != null ||
                first?.instanceId != null ||
                first?.instance_id != null;
              if (hasInstance) return val;
            }
          }
          const values = Object.values(obj).filter(
            (v) =>
              v &&
              typeof v === "object" &&
              ((v as any).instanceName != null ||
                (v as any).instance_name != null ||
                (v as any).instanceId != null ||
                (v as any).instance_id != null)
          );
          if (values.length > 0) return values as any[];
        }
        return null;
      };

      const raw = pickInstanceArray(data);
      let list: EvolutionInstance[] = [];
      if (raw?.length) {
        list = raw
          .map((row: any) => {
            const item = row?.instance ?? row;
            return normalize(item);
          })
          .filter((x): x is EvolutionInstance => x != null);
      } else if (data?.instance) {
        const one = normalize(data.instance);
        if (one) list = [one];
      } else if (
        data?.instanceName != null ||
        data?.instance_name != null ||
        data?.instanceId != null ||
        data?.instance_id != null
      ) {
        const one = normalize(data);
        if (one) list = [one];
      }

      if (list.length === 0 && data != null && import.meta.env.DEV) {
        console.warn("[Integrações] Nenhuma instância extraída da resposta. Estrutura recebida:", data);
      }
      setInstances(list);
    } catch (error: any) {
      setInstancesError(error?.message || "Erro ao carregar instâncias da Evolution API.");
    } finally {
      setInstancesLoading(false);
    }
  };

  useEffect(() => {
    if (canManageInstances) {
      fetchInstances();
    } else {
      setInstances([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canManageInstances, config.baseUrl, config.token]);

  // Enquanto o modal de conexão estiver aberto:
  // - Faz polling periódico das instâncias (via fetchInstances) para atualizar o status.
  // - A cada ~1 minuto, gera automaticamente um novo QR Code.
  useEffect(() => {
    if (!connectDialogOpen || !connectInstanceName || !canManageInstances) return;

    let cancelled = false;
    let attempts = 0;
    const maxAttempts = 20; // 20 * 3s ≈ 60s
    const delayMs = 3000;

    const tick = async () => {
      if (cancelled) return;
      attempts += 1;
      try {
        await fetchInstances();
      } catch {
        // erros de polling são ignorados
      }

      // Após ~1 minuto, gera automaticamente um novo QR Code
      if (!cancelled && attempts >= maxAttempts && connectInstanceName) {
        attempts = 0;
        fetchConnectInfo(connectInstanceName);
      }
    };

    // primeira execução imediata
    tick();
    const interval = setInterval(tick, delayMs);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [connectDialogOpen, connectInstanceName, canManageInstances, fetchInstances, fetchConnectInfo]);

  // Fecha o modal automaticamente quando a instância ficar conectada
  useEffect(() => {
    if (!connectDialogOpen || !connectInstanceName) return;
    const inst = instances.find((i) => i.instanceName === connectInstanceName);
    if (inst && inst.status && inst.status.toLowerCase() === "open") {
      setConnectDialogOpen(false);
      toast({
        title: "Instância conectada",
        description: `A instância "${connectInstanceName}" foi conectada com sucesso.`,
      });
    }
  }, [connectDialogOpen, connectInstanceName, instances, toast]);

  const handleCreateInstance = async () => {
    if (!canEditIntegrations) return;
    const trimmedName = newInstanceName.trim();
    if (!trimmedName) {
      toast({
        title: "Informe o nome da instância",
        description: "Defina um nome para a instância de WhatsApp.",
        variant: "destructive",
      });
      return;
    }
    if (!canManageInstances) {
      toast({
        title: "Configure a URL e o token primeiro",
        description: "Preencha a URL da Evolution API e o token para criar instâncias.",
        variant: "destructive",
      });
      return;
    }
    try {
      setIsSaving(true);
      const url = config.baseUrl.replace(/\/+$/, "");
      const createUrl = `${url}/instance/create`;
      const body: any = {
        instanceName: trimmedName,
        integration: newInstanceIntegration,
      };
      const response = await fetch(createUrl, {
        method: "POST",
        headers: {
          apikey: config.token,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });
      if (!response.ok) {
        const text = await response.text();
        throw new Error(`HTTP ${response.status}: ${text.slice(0, 200)}`);
      }
      toast({
        title: "Instância criada",
        description: `A instância "${trimmedName}" foi criada na Evolution API.`,
      });
      setNewInstanceName("");
      await fetchInstances();
      await openConnectDialogForInstance(trimmedName);
    } catch (error: any) {
      toast({
        title: "Erro ao criar instância",
        description: error?.message || "Não foi possível criar a instância na Evolution API.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteInstance = async (instanceName: string) => {
    if (!canDeleteIntegrations || !canManageInstances) return;
    const confirmed = window.confirm(
      `Tem certeza que deseja excluir a instância "${instanceName}" na Evolution API?`
    );
    if (!confirmed) return;
    try {
      setIsSaving(true);
      const url = config.baseUrl.replace(/\/+$/, "");
      const deleteUrl = `${url}/instance/delete/${encodeURIComponent(instanceName)}`;
      const response = await fetch(deleteUrl, {
        method: "DELETE",
        headers: {
          apikey: config.token,
          "Content-Type": "application/json",
        },
      });
      if (!response.ok) {
        const text = await response.text();
        throw new Error(`HTTP ${response.status}: ${text.slice(0, 200)}`);
      }
      toast({
        title: "Instância excluída",
        description: `A instância "${instanceName}" foi removida da Evolution API.`,
      });
      await fetchInstances();
    } catch (error: any) {
      toast({
        title: "Erro ao excluir instância",
        description: error?.message || "Não foi possível excluir a instância na Evolution API.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (configLoading || minioLoading) {
    return (
      <div className="flex items-center justify-center min-h-[200px] p-4">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <Loader2 className="w-8 h-8 animate-spin" />
          <p className="text-sm">Carregando configurações…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6 animate-fade-in p-2 md:p-0">
      <div className="space-y-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-foreground flex items-center gap-2">
            <PlugZap className="w-5 h-5 text-primary" />
            Integrações
          </h1>
          <p className="text-sm md:text-base text-muted-foreground">
            Configure integrações externas para habilitar comunicação e automações.
          </p>
        </div>
      </div>

      <Tabs defaultValue="evolution" className="space-y-4 md:space-y-6">
        {/* Abas principais (nível de integração) — destaque com cor primária */}
        <TabsList className="inline-flex rounded-lg border border-primary/30 bg-primary/5 p-1 shadow-sm">
          <TabsTrigger
            value="evolution"
            className="flex items-center justify-center gap-2 rounded-md min-w-[170px] px-4 py-2 text-sm font-medium
                       text-muted-foreground transition-colors
                       data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm"
          >
            <PlugZap className="w-4 h-4" />
            <span>Evolution API</span>
          </TabsTrigger>
          <TabsTrigger
            value="email"
            className="flex items-center justify-center gap-2 rounded-md min-w-[170px] px-4 py-2 text-sm font-medium
                       text-muted-foreground transition-colors
                       data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm"
          >
            <Mail className="w-4 h-4" />
            <span>Email</span>
          </TabsTrigger>
          <TabsTrigger
            value="minio"
            className="flex items-center justify-center gap-2 rounded-md min-w-[170px] px-4 py-2 text-sm font-medium
                       text-muted-foreground transition-colors
                       data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm"
          >
            <Database className="w-4 h-4" />
            <span>Minio</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="evolution" className="space-y-4 md:space-y-6">
          {/* Sub-abas da Evolution API (nível interno) — largura menor que as abas principais */}
          <Tabs defaultValue="setup" className="space-y-4 md:space-y-6">
            <TabsList className="inline-flex w-auto h-8 rounded-md bg-muted/50 px-1.5 py-1 gap-1 border border-border/60">
              <TabsTrigger
                value="setup"
                className="flex-none rounded-sm w-auto min-w-0 px-3 py-1 text-xs font-medium text-muted-foreground
                           data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
              >
                Setup
              </TabsTrigger>
              <TabsTrigger
                value="connections"
                className="flex-none rounded-sm w-auto min-w-0 px-3 py-1 text-xs font-medium text-muted-foreground
                           data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
              >
                Conexões
              </TabsTrigger>
            </TabsList>

            <TabsContent value="setup">
              {/* Resumo rápido do status da Evolution API (apenas na aba Setup) */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
                <Card className="border-border/60">
                  <CardContent className="py-3 px-4 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">Evolution API</p>
                      <p className="text-sm font-semibold">
                        {connectionStatusLabel[connectionStatus]}
                      </p>
                    </div>
                    <div
                      className={[
                        "px-2 py-1 rounded-full text-[11px] font-semibold flex items-center gap-1",
                        connectionStatus === "connected"
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : connectionStatus === "error"
                          ? "bg-destructive/5 text-destructive border border-destructive/30"
                          : connectionStatus === "disabled"
                          ? "bg-muted text-muted-foreground border border-border/50"
                          : "bg-amber-50 text-amber-700 border border-amber-200",
                      ].join(" ")}
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-current" />
                      {connectionStatus === "connected"
                        ? "Pronta para uso"
                        : connectionStatus === "error"
                        ? "Verificar conexão"
                        : connectionStatus === "disabled"
                        ? "Desativada"
                        : "Precisa configurar"}
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-dashed border-border/60 hidden md:block">
                  <CardContent className="py-3 px-4 text-xs text-muted-foreground space-y-1">
                    <p className="font-semibold text-foreground text-sm">Próximos passos</p>
                    <p>1. Informar URL da Evolution API e API Key.</p>
                    <p>2. Salvar integração e testar conexão.</p>
                    <p>3. Habilitar notificações de WhatsApp (futuro).</p>
                  </CardContent>
                </Card>
                <Card className="border-dashed border-border/60 hidden md:block">
                  <CardContent className="py-3 px-4 text-xs text-muted-foreground space-y-1">
                    <p className="font-semibold text-foreground text-sm">Último teste</p>
                    {config.lastTestAt ? (
                      <p>{new Date(config.lastTestAt).toLocaleString("pt-BR")}</p>
                    ) : (
                      <p>Nenhum teste realizado ainda.</p>
                    )}
                  </CardContent>
                </Card>
              </div>

              <Card className="shadow-sm border-0">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <PlugZap className="w-5 h-5 text-primary" />
                    Evolution API – WhatsApp
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 rounded-xl border bg-muted/40 space-y-2 md:col-span-2">
                      <p className="text-sm text-muted-foreground">
                        Esta integração permite que, no futuro, o sistema envie notificações via WhatsApp
                        (confirmação de agendamento, lembretes, etc.) usando a{" "}
                        <a
                          href="https://evolution-api.com/"
                          target="_blank"
                          rel="noreferrer"
                          className="underline font-medium"
                        >
                          Evolution API
                        </a>
                        .
                      </p>
                      <p className="text-xs text-muted-foreground">
                        As credenciais são salvas no banco de dados e ficam disponíveis em todo o sistema,
                        inclusive em outros navegadores e dispositivos.
                      </p>
                    </div>
                    <div className="p-4 rounded-xl border bg-muted/10 space-y-2">
                      <p className="text-xs font-semibold text-muted-foreground">Checklist de configuração</p>
                      <ul className="space-y-1 text-xs text-muted-foreground">
                        <li>
                          <span className={config.baseUrl ? "text-emerald-600 font-semibold" : ""}>
                            {config.baseUrl ? "✓" : "•"} URL da API preenchida
                          </span>
                        </li>
                        <li>
                          <span className={config.token ? "text-emerald-600 font-semibold" : ""}>
                            {config.token ? "✓" : "•"} Token informado
                          </span>
                        </li>
                        <li>
                          <span className={config.lastTestResult === "success" ? "text-emerald-600 font-semibold" : ""}>
                            {config.lastTestResult === "success" ? "✓" : "•"} Teste de conexão concluído
                          </span>
                        </li>
                      </ul>
                    </div>
                  </div>

                  <div className="flex items-center justify-between rounded-lg border bg-muted/30 p-4">
                    <div className="space-y-1">
                      <Label className="flex items-center gap-1 text-sm font-medium">
                        Integração habilitada
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Ative para permitir que o sistema utilize a Evolution API quando houver
                        funcionalidades de WhatsApp.
                      </p>
                    </div>
                    <Switch
                      checked={config.enabled}
                      onCheckedChange={(checked) => handleChange("enabled", checked)}
                      disabled={!canEditIntegrations}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="evo-base-url" className="flex items-center gap-2">
                        <Globe className="w-4 h-4 text-muted-foreground" />
                        URL base da Evolution API
                      </Label>
                      <Input
                        id="evo-base-url"
                        placeholder="Ex.: https://meu-servidor-evolution.com/api/v1"
                        value={config.baseUrl}
                        onChange={(e) => handleChange("baseUrl", e.target.value)}
                        disabled={!canEditIntegrations}
                      />
                      <p className="text-xs text-muted-foreground">
                        Inclua o caminho até a API. Exemplo de endpoint de teste usado:{" "}
                        <code className="font-mono text-[11px]">
                          /instance/&lt;instanceId&gt;/status
                        </code>
                        .
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="evo-token" className="flex items-center gap-2">
                        <KeyRound className="w-4 h-4 text-muted-foreground" />
                        Token de acesso
                      </Label>
                      <Textarea
                        id="evo-token"
                        placeholder="Cole aqui o token (Bearer) da Evolution API"
                        value={config.token}
                        onChange={(e) => handleChange("token", e.target.value)}
                        rows={3}
                        disabled={!canEditIntegrations}
                      />
                      <p className="text-xs text-muted-foreground">
                        Mantenha este token em sigilo. Em produção, o ideal é armazenar este dado no
                        backend.
                      </p>
                    </div>

                    {/* Campos adicionais como remetente/DDD podem ser adicionados futuramente;
                        por enquanto, o setup pede apenas URL e API Key, como combinado. */}
                  </div>

                  {/* Resumo da configuração atual */}
                  <div className="border-t pt-4">
                    <Card className="border-border/60 bg-muted/20 max-w-xl">
                      <CardHeader className="py-3 px-4">
                        <CardTitle className="text-sm">Resumo da conexão</CardTitle>
                      </CardHeader>
                      <CardContent className="px-4 pb-4 space-y-1 text-xs text-muted-foreground">
                        <p>
                          <span className="font-semibold">Status:</span> {connectionStatusLabel[connectionStatus]}
                        </p>
                        <p>
                          <span className="font-semibold">URL base:</span>{" "}
                          {config.baseUrl || <span className="italic">não definida</span>}
                        </p>
                        <p>
                          <span className="font-semibold">Token:</span>{" "}
                          {maskedToken || <span className="italic">não informado</span>}
                        </p>
                        <p>
                          <span className="font-semibold">Remetente padrão:</span>{" "}
                          {config.defaultSenderName || <span className="italic">não definido</span>}
                        </p>
                        <p>
                          <span className="font-semibold">DDI padrão:</span>{" "}
                          {config.defaultPhoneCountryCode || "55"}
                        </p>
                        {config.lastTestAt && (
                          <p>
                            <span className="font-semibold">Último teste:</span>{" "}
                            {new Date(config.lastTestAt).toLocaleString("pt-BR")}
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  </div>

                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 pt-2 border-t">
                    <div className="space-y-1 text-xs text-muted-foreground flex-1">
                      <p className="flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3 text-amber-500" />
                        Esta aba apenas configura a integração. O envio automático de notificações será
                        implementado em etapas futuras.
                      </p>
{config.lastTestResult && config.lastTestMessage && (
                    <div
                      className={`
                        mt-2 rounded-md border px-3 py-2 font-mono text-[11px] whitespace-pre-wrap
                        ${
                          config.lastTestResult === "success"
                            ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                            : "border-destructive/40 bg-destructive/5 text-destructive"
                        }
                      `}
                    >
                      {config.lastTestMessage}
                    </div>
                  )}
                    </div>

                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleTestConnection}
                        disabled={isTesting}
                        className="flex items-center gap-2"
                      >
                        {isTesting ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : config.lastTestResult === "success" ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        ) : (
                          <PlugZap className="w-4 h-4" />
                        )}
                        Testar conexão
                      </Button>
                      {canEditIntegrations && (
                        <Button
                          type="button"
                          onClick={handleSave}
                          disabled={isSaving}
                          className="clinic-gradient text-white flex items-center gap-2"
                        >
                          {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                          Salvar integração
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="connections" className="mt-4 md:mt-6">
              <Card className="shadow-sm border-0">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Link2 className="w-5 h-5 text-primary" />
                    Conexões Evolution API
                  </CardTitle>
                  <p className="text-sm text-muted-foreground font-normal">
                    Gerencie as instâncias WhatsApp conectadas à Evolution API (criar e remover).
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-row items-center justify-between gap-2">
                    <span className="text-sm font-medium">Instâncias</span>
                  </div>
                  {!canManageInstances ? (
                    <p className="text-sm text-muted-foreground py-4">
                      Informe a URL e o token da Evolution API na aba <strong>Setup</strong> e salve a
                      integração para gerenciar as instâncias aqui.
                    </p>
                  ) : (
                    <>
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <p className="text-xs text-muted-foreground flex-1">
                          Crie novas conexões para múltiplos números de WhatsApp vinculados à Evolution API.
                        </p>
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            onClick={fetchInstances}
                            disabled={!canManageInstances || instancesLoading}
                            title="Recarregar conexões"
                          >
                            <RotateCw className={`w-4 h-4 ${instancesLoading ? "animate-spin" : ""}`} />
                          </Button>
                          {canEditIntegrations && (
                            <Button
                              type="button"
                              size="sm"
                              className="clinic-gradient text-white whitespace-nowrap"
                              onClick={() => {
                                setNewInstanceName("");
                                setNewInstanceIntegration("WHATSAPP-BAILEYS");
                                setConnectInstanceName(null);
                                setConnectQrBase64(null);
                                setConnectCount(null);
                                setConnectError(null);
                                setConnectDialogOpen(true);
                              }}
                            >
                              Nova conexão
                            </Button>
                          )}
                        </div>
                      </div>

                      {instancesError && (
                        <p className="text-xs text-destructive">{instancesError}</p>
                      )}

                      {instances.length === 0 && !instancesLoading ? (
                        <p className="text-sm text-muted-foreground py-4">
                          Nenhuma instância retornada pela Evolution API para estas credenciais.
                        </p>
                      ) : (
                        <div className="border rounded-md max-h-52 overflow-auto">
                          <table className="w-full text-xs">
                            <thead className="bg-muted/60">
                              <tr>
                                <th className="px-2 py-1 text-left font-medium">Nome</th>
                                <th className="px-2 py-1 text-left font-medium">WhatsApp</th>
                                <th className="px-2 py-1 text-left font-medium">Status</th>
                                <th className="px-2 py-1 text-left font-medium">Engine</th>
                                <th className="px-2 py-1 text-left font-medium">ID</th>
                                <th className="px-2 py-1 text-right font-medium">Ações</th>
                              </tr>
                            </thead>
                            <tbody>
                              {instances.map((inst) => (
                                <tr key={inst.instanceId} className="border-t">
                                  <td className="px-2 py-1 align-top">
                                    <span className="font-medium">{inst.instanceName}</span>
                                  </td>
                                  <td className="px-2 py-1 align-top text-muted-foreground">
                                    {formatWhatsAppNumber(inst.owner)}
                                  </td>
                                  <td className="px-2 py-1 align-top">
                                    <span
                                      className={
                                        inst.status?.toLowerCase() === "open" || inst.status?.toLowerCase() === "connected"
                                          ? "text-emerald-600 font-medium"
                                          : inst.status?.toLowerCase() === "close" || inst.status?.toLowerCase() === "closed"
                                            ? "text-muted-foreground"
                                            : "text-amber-600"
                                      }
                                    >
                                      {getStatusLabel(inst.status)}
                                    </span>
                                  </td>
                                  <td className="px-2 py-1 align-top">
                                    {inst.integration || <span className="text-muted-foreground">-</span>}
                                  </td>
                                  <td className="px-2 py-1 align-top text-[11px] text-muted-foreground">
                                    {inst.instanceId}
                                  </td>
                                  <td className="px-2 py-1 align-top text-right">
                                    {canDeleteIntegrations && (
                                      <Button
                                        type="button"
                                        variant="outline"
                                        size="icon"
                                        className="h-7 w-7 text-destructive hover:bg-destructive/10"
                                        onClick={() => handleDeleteInstance(inst.instanceName)}
                                      >
                                        <Trash2 className="w-3 h-3" />
                                      </Button>
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </TabsContent>

        <TabsContent value="email">
          <Card className="shadow-sm border-0">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="w-5 h-5 text-primary" />
                Integração de Email (SMTP)
              </CardTitle>
              <p className="text-sm text-muted-foreground font-normal">
                Configure o servidor SMTP e a URL do backend de e-mail. O backend (pasta <code className="text-xs">backend/</code> neste projeto) é quem envia os e-mails via SMTP.
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl border bg-muted/40 space-y-2 md:col-span-2">
                  <p className="text-sm text-muted-foreground">
                    Preencha a <strong>URL do backend</strong> (onde o servidor de e-mail está rodando) e as credenciais SMTP. Use &quot;Testar configuração&quot; e &quot;Enviar teste&quot; para validar.
                  </p>
                  <p className="text-xs text-muted-foreground">
                    O backend pode ser executado localmente (<code className="text-[11px]">node backend/server.js</code>) ou em um serviço como Railway, Render ou VPS.
                  </p>
                </div>
                <div className="p-4 rounded-xl border bg-muted/10 space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground">Status da configuração</p>
                  <ul className="space-y-1 text-xs text-muted-foreground">
                    <li>
                      <span className={emailConfig.backendUrl ? "text-emerald-600 font-semibold" : ""}>
                        {emailConfig.backendUrl ? "✓" : "•"} URL do backend
                      </span>
                    </li>
                    <li>
                      <span className={emailConfig.host ? "text-emerald-600 font-semibold" : ""}>
                        {emailConfig.host ? "✓" : "•"} Servidor SMTP
                      </span>
                    </li>
                    <li>
                      <span className={emailConfig.fromEmail ? "text-emerald-600 font-semibold" : ""}>
                        {emailConfig.fromEmail ? "✓" : "•"} Remetente
                      </span>
                    </li>
                  </ul>
                </div>
              </div>

              {emailError && (
                <div className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-xs text-destructive">
                  {emailError}
                </div>
              )}

              <div className="flex items-center justify-between rounded-lg border bg-muted/30 p-4">
                <div className="space-y-1">
                  <Label className="flex items-center gap-1 text-sm font-medium">
                    Envio de e-mails habilitado
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Ative para permitir que o sistema use o backend para enviar notificações por e-mail.
                  </p>
                </div>
                <Switch
                  checked={emailConfig.enabled}
                  onCheckedChange={(checked) =>
                    setEmailConfig((prev) => ({ ...prev, enabled: checked }))
                  }
                  disabled={emailLoading || !canEditIntegrations}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="backend-url" className="flex items-center gap-2">
                  <Globe className="w-4 h-4 text-muted-foreground" />
                  URL do backend de e-mail
                </Label>
                <Input
                  id="backend-url"
                  type="url"
                  placeholder="Ex.: https://seu-backend.railway.app ou http://localhost:3021"
                  value={emailConfig.backendUrl ?? ""}
                  onChange={(e) =>
                    setEmailConfig((prev) => ({ ...prev, backendUrl: e.target.value || null }))
                  }
                  disabled={emailLoading || !canEditIntegrations}
                />
                <p className="text-xs text-muted-foreground">
                  URL base do servidor que envia e-mails (sem barra no final). O front chama <code className="text-[11px]">/api/email/test</code> e <code className="text-[11px]">/api/email/send</code>.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="smtp-host" className="flex items-center gap-2">
                    <Server className="w-4 h-4 text-muted-foreground" />
                    Servidor SMTP (host)
                  </Label>
                  <Input
                    id="smtp-host"
                    placeholder="Ex.: smtp.seudominio.com"
                    value={emailConfig.host}
                    onChange={(e) =>
                      setEmailConfig((prev) => ({ ...prev, host: e.target.value }))
                    }
                    disabled={emailLoading || !canEditIntegrations}
                  />
                </div>

                <div className="grid grid-cols-[1.5fr_1.5fr] gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="smtp-port" className="flex items-center gap-2">
                      <Globe className="w-4 h-4 text-muted-foreground" />
                      Porta
                    </Label>
                    <Input
                      id="smtp-port"
                      type="number"
                      min={1}
                      max={65535}
                      value={emailConfig.port}
                      onChange={(e) =>
                        setEmailConfig((prev) => ({
                          ...prev,
                          port: Number(e.target.value) || 0,
                        }))
                      }
                      disabled={emailLoading || !canEditIntegrations}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Lock className="w-4 h-4 text-muted-foreground" />
                      Segurança (TLS)
                    </Label>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Switch
                        checked={emailConfig.useTls}
                        onCheckedChange={(checked) =>
                          setEmailConfig((prev) => ({ ...prev, useTls: checked }))
                        }
                        disabled={emailLoading || !canEditIntegrations}
                      />
                      <span>{emailConfig.useTls ? "Ativado" : "Desativado"}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="smtp-username" className="flex items-center gap-2">
                    <User2 className="w-4 h-4 text-muted-foreground" />
                    Usuário
                  </Label>
                  <Input
                    id="smtp-username"
                    placeholder="Ex.: no-reply@seudominio.com"
                    value={emailConfig.username}
                    onChange={(e) =>
                      setEmailConfig((prev) => ({ ...prev, username: e.target.value }))
                    }
                    disabled={emailLoading || !canEditIntegrations}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="smtp-password" className="flex items-center gap-2">
                    <KeyRound className="w-4 h-4 text-muted-foreground" />
                    Senha / Token SMTP
                  </Label>
                  <Input
                    id="smtp-password"
                    type="password"
                    placeholder="Informe a senha ou token de acesso do SMTP"
                    value={emailConfig.password}
                    onChange={(e) =>
                      setEmailConfig((prev) => ({ ...prev, password: e.target.value }))
                    }
                    disabled={emailLoading || !canEditIntegrations}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="smtp-from-name" className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-muted-foreground" />
                    Nome do remetente
                  </Label>
                  <Input
                    id="smtp-from-name"
                    placeholder="Ex.: Clínica Pro"
                    value={emailConfig.fromName}
                    onChange={(e) =>
                      setEmailConfig((prev) => ({ ...prev, fromName: e.target.value }))
                    }
                    disabled={emailLoading || !canEditIntegrations}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="smtp-from-email" className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-muted-foreground" />
                    E-mail do remetente
                  </Label>
                  <Input
                    id="smtp-from-email"
                    placeholder="Ex.: notificacoes@seudominio.com"
                    value={emailConfig.fromEmail}
                    onChange={(e) =>
                      setEmailConfig((prev) => ({ ...prev, fromEmail: e.target.value }))
                    }
                    disabled={emailLoading || !canEditIntegrations}
                  />
                </div>
              </div>

              <div className="rounded-lg border bg-muted/20 p-4 space-y-4">
                <p className="text-sm font-medium">Testar configuração e envio</p>
                <p className="text-xs text-muted-foreground">
                  Verifique se a conexão SMTP está correta e envie um e-mail de teste para um endereço.
                </p>
                <div className="flex flex-wrap items-end gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleTestSmtpConfig}
                    disabled={
                      emailLoading ||
                      smtpTesting ||
                      !emailConfig.backendUrl?.trim() ||
                      !emailConfig.host?.trim() ||
                      !emailConfig.fromEmail?.trim()
                    }
                    className="flex items-center gap-2"
                  >
                    {smtpTesting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4 text-muted-foreground" />
                    )}
                    Testar configuração
                  </Button>
                  <div className="flex flex-1 min-w-[200px] items-end gap-2">
                    <div className="flex-1 space-y-1.5">
                      <Label htmlFor="test-email-to" className="text-xs">
                        Enviar e-mail de teste para
                      </Label>
                      <Input
                        id="test-email-to"
                        type="email"
                        placeholder="exemplo@email.com"
                        value={testEmailTo}
                        onChange={(e) => setTestEmailTo(e.target.value)}
                        disabled={emailLoading || smtpSending}
                        className="h-9"
                      />
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleSendTestEmail}
                      disabled={
                        emailLoading ||
                        smtpSending ||
                        !testEmailTo.trim() ||
                        !emailConfig.backendUrl?.trim() ||
                        !emailConfig.host?.trim()
                      }
                      className="flex items-center gap-2 shrink-0"
                    >
                      {smtpSending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Mail className="w-4 h-4 text-muted-foreground" />
                      )}
                      Enviar teste
                    </Button>
                  </div>
                </div>
              </div>

              {canEditIntegrations && (
                <div className="flex justify-end pt-2 border-t">
                  <Button
                    type="button"
                    onClick={() => saveEmailConfig(emailConfig)}
                    disabled={emailLoading}
                    className="clinic-gradient text-white flex items-center gap-2"
                  >
                    {emailLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                    Salvar configuração de e-mail
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="minio">
          <Card className="shadow-sm border-0">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="w-5 h-5 text-primary" />
                Integração Minio (Storage)
              </CardTitle>
              <p className="text-sm text-muted-foreground font-normal">
                Configure os dados para conexão com o storage Minio. Esta configuração será usada nos próximos passos para upload de arquivos dos módulos do sistema.
              </p>
              <p className="text-xs text-muted-foreground">
                O teste e os uploads Minio usam a URL do backend definida na aba E-mail.
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              {minioError ? (
                <div className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-xs text-destructive">
                  {minioError}
                </div>
              ) : null}

              <div className="flex items-center justify-between rounded-lg border bg-muted/30 p-4">
                <div className="space-y-1">
                  <Label className="text-sm font-medium">Integração habilitada</Label>
                  <p className="text-xs text-muted-foreground">
                    Ative para permitir uso do Minio no upload de documentos.
                  </p>
                </div>
                <Switch
                  checked={minioConfig.enabled}
                  onCheckedChange={(checked) =>
                    setMinioConfig((prev) => ({ ...prev, enabled: checked }))
                  }
                  disabled={!canEditIntegrations}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="minio-endpoint">Endpoint</Label>
                  <Input
                    id="minio-endpoint"
                    placeholder="Ex.: minio.seudominio.com"
                    value={minioConfig.endpoint}
                    onChange={(e) =>
                      setMinioConfig((prev) => ({ ...prev, endpoint: e.target.value }))
                    }
                    disabled={!canEditIntegrations}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="minio-port">Porta</Label>
                  <Input
                    id="minio-port"
                    type="number"
                    min={1}
                    max={65535}
                    value={minioConfig.port}
                    onChange={(e) =>
                      setMinioConfig((prev) => ({
                        ...prev,
                        port: Number(e.target.value) || 0,
                      }))
                    }
                    disabled={!canEditIntegrations}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="minio-access-key">Access Key</Label>
                  <Input
                    id="minio-access-key"
                    value={minioConfig.accessKey}
                    onChange={(e) =>
                      setMinioConfig((prev) => ({ ...prev, accessKey: e.target.value }))
                    }
                    disabled={!canEditIntegrations}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="minio-secret-key">Secret Key</Label>
                  <Input
                    id="minio-secret-key"
                    type="password"
                    value={minioConfig.secretKey}
                    onChange={(e) =>
                      setMinioConfig((prev) => ({ ...prev, secretKey: e.target.value }))
                    }
                    disabled={!canEditIntegrations}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="minio-bucket">Bucket</Label>
                  <Input
                    id="minio-bucket"
                    value={minioConfig.bucket}
                    onChange={(e) =>
                      setMinioConfig((prev) => ({ ...prev, bucket: e.target.value }))
                    }
                    disabled={!canEditIntegrations}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="minio-region">Região</Label>
                  <Input
                    id="minio-region"
                    placeholder="Ex.: us-east-1"
                    value={minioConfig.region}
                    onChange={(e) =>
                      setMinioConfig((prev) => ({ ...prev, region: e.target.value }))
                    }
                    disabled={!canEditIntegrations}
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="minio-base-path">Prefixo base (opcional)</Label>
                  <Input
                    id="minio-base-path"
                    placeholder="Ex.: clinica-pro/uploads"
                    value={minioConfig.basePath}
                    onChange={(e) =>
                      setMinioConfig((prev) => ({ ...prev, basePath: e.target.value }))
                    }
                    disabled={!canEditIntegrations}
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  checked={minioConfig.useSsl}
                  onCheckedChange={(checked) =>
                    setMinioConfig((prev) => ({ ...prev, useSsl: checked }))
                  }
                  disabled={!canEditIntegrations}
                />
                <Label>Usar SSL (HTTPS)</Label>
              </div>

              {minioConfig.lastTestAt ? (
                <div
                  className={`rounded-md border px-3 py-2 text-xs ${
                    minioConfig.lastTestResult === "success"
                      ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-700"
                      : "border-destructive/40 bg-destructive/5 text-destructive"
                  }`}
                >
                  <p className="font-medium">
                    Último teste: {new Date(minioConfig.lastTestAt).toLocaleString("pt-BR")}
                  </p>
                  {minioConfig.lastTestMessage ? <p className="mt-1">{minioConfig.lastTestMessage}</p> : null}
                </div>
              ) : null}

              <div className="flex justify-end gap-2 pt-2 border-t">
                {canDeleteIntegrations && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCleanupOrphans}
                    disabled={minioCleaning}
                    className="flex items-center gap-2"
                  >
                    {minioCleaning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                    Limpar órfãos
                  </Button>
                )}
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleTestMinioConnection}
                  disabled={minioTesting}
                  className="flex items-center gap-2"
                >
                  {minioTesting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Link2 className="w-4 h-4" />}
                  Testar conectividade
                </Button>
                {canEditIntegrations && (
                  <Button
                    type="button"
                    onClick={() => saveMinioConfig(minioConfig)}
                    className="clinic-gradient text-white"
                  >
                    Salvar configuração Minio
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={connectDialogOpen} onOpenChange={setConnectDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nova conexão WhatsApp</DialogTitle>
            <DialogDescription>
              Crie uma nova instância na Evolution API e conecte o WhatsApp escaneando o QR Code gerado.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {!connectInstanceName && (
              <form
                className="space-y-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!canEditIntegrations) return;
                  handleCreateInstance();
                }}
              >
                <div className="space-y-2">
                  <Label htmlFor="modal-instance-name">Nome da conexão</Label>
                  <Input
                    id="modal-instance-name"
                    placeholder="Ex.: clinica-whats-01"
                    value={newInstanceName}
                    onChange={(e) => setNewInstanceName(e.target.value)}
                    autoFocus
                  />
                  <p className="text-xs text-muted-foreground">
                    Use um nome curto que identifique o número ou finalidade desta conexão.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="modal-instance-engine">Engine</Label>
                  <select
                    id="modal-instance-engine"
                    className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                    value={newInstanceIntegration}
                    onChange={(e) =>
                      setNewInstanceIntegration(
                        e.target.value as "WHATSAPP-BAILEYS" | "WHATSAPP-BUSINESS"
                      )
                    }
                  >
                    <option value="WHATSAPP-BAILEYS">WhatsApp Baileys</option>
                    <option value="WHATSAPP-BUSINESS">WhatsApp Business (Cloud)</option>
                  </select>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setConnectDialogOpen(false)}
                  >
                    Cancelar
                  </Button>
                  {canEditIntegrations && (
                    <Button
                      type="submit"
                      size="sm"
                      className="clinic-gradient text-white"
                      disabled={isSaving}
                    >
                      {isSaving ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        "Criar e gerar QR Code"
                      )}
                    </Button>
                  )}
                </div>
              </form>
            )}

            {connectInstanceName && (
              <div className="space-y-4">
                <div className="text-sm text-muted-foreground">
                  <p>
                    Instância:{" "}
                    <span className="font-semibold text-foreground">
                      {connectInstanceName}
                    </span>
                  </p>
                </div>

                {connectLoading && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Gerando QR Code…</span>
                  </div>
                )}

                {!connectLoading && connectError && (
                  <p className="text-sm text-destructive whitespace-pre-wrap">
                    {connectError}
                  </p>
                )}

                {!connectLoading && !connectError && (
                  <div className="space-y-4">
                    {connectQrBase64 ? (
                      <div className="space-y-2">
                        <p className="text-sm font-medium">Escaneie o QR Code abaixo</p>
                        <div className="flex justify-center">
                          <img
                            src={
                              connectQrBase64.startsWith("data:")
                                ? connectQrBase64
                                : `data:image/png;base64,${connectQrBase64}`
                            }
                            alt="QR Code para conectar o WhatsApp"
                            className="w-56 h-56 border rounded-md bg-white"
                          />
                        </div>
                        <p className="text-xs text-muted-foreground text-center">
                          Abra o WhatsApp no celular, vá em{" "}
                          <span className="font-semibold">Aparelhos conectados</span> e
                          escaneie este QR Code.
                        </p>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        Nenhum QR Code foi retornado pela Evolution API para esta instância.
                      </p>
                    )}

                    {typeof connectCount === "number" && (
                      <p className="text-[11px] text-muted-foreground">
                        Tentativa #{connectCount}
                      </p>
                    )}
                  </div>
                )}

                <div className="flex justify-between items-center pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (connectInstanceName) {
                        fetchConnectInfo(connectInstanceName);
                      }
                    }}
                    disabled={!connectInstanceName || connectLoading}
                  >
                    {connectLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      "Gerar novo QR Code"
                    )}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => setConnectDialogOpen(false)}
                  >
                    Fechar
                  </Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Integrations;

