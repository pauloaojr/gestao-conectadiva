import { useCallback, useEffect, useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { AlertTriangle, Loader2, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { sendTestNotification } from "@/services/notificationDispatch";
import { useNavigate } from "react-router-dom";

type FailedLogRow = {
  id: string;
  service: string;
  event_key: string;
  channel: string;
  recipient: string;
  error_message: string | null;
  created_at: string;
  notification_settings_id: string | null;
  payload_json: Record<string, unknown> | null;
  notification_settings: { name: string } | null;
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

function inferErrorType(msg: string | null): string {
  if (!msg) return "Erro desconhecido";
  const m = msg.toLowerCase();
  if (m.includes("evolution") || m.includes("whatsapp") || m.includes("fetch")) return "Evolution API";
  if (m.includes("smtp") || m.includes("connection refused") || m.includes("e-mail")) return "SMTP";
  if (m.includes("sem telefone") || m.includes("sem e-mail")) return "Destinatário";
  return "Outro";
}

export function NotificationFailuresCard() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [rows, setRows] = useState<FailedLogRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [retryingId, setRetryingId] = useState<string | null>(null);

  const loadFailures = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("notification_dispatch_logs")
        .select("id, service, event_key, channel, recipient, error_message, created_at, notification_settings_id, payload_json, notification_settings(name)")
        .eq("status", "failed")
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) throw error;
      setRows((data || []) as FailedLogRow[]);
    } catch (err: unknown) {
      toast({
        title: "Erro ao carregar falhas",
        description: err instanceof Error ? err.message : "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadFailures();
  }, [loadFailures]);

  const handleRetry = async (row: FailedLogRow) => {
    if (!row.notification_settings_id || !row.payload_json) {
      toast({
        title: "Não é possível reenviar",
        description: "Dados insuficientes para reenvio.",
        variant: "destructive",
      });
      return;
    }
    setRetryingId(row.id);
    try {
      const recipient =
        row.channel === "email"
          ? { email: row.recipient, phone: undefined }
          : { email: undefined, phone: row.recipient };
      const context = (row.payload_json || {}) as Record<string, string>;
      await sendTestNotification({
        ruleId: row.notification_settings_id,
        service: row.service as "agenda" | "financeiro" | "aniversario",
        eventKey: row.event_key as never,
        recipient,
        context,
      });
      toast({
        title: "Reenvio realizado",
        description: `Notificação reenviada para ${row.recipient}.`,
      });
      loadFailures();
    } catch (err: unknown) {
      toast({
        title: "Erro ao reenviar",
        description: err instanceof Error ? err.message : "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setRetryingId(null);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-destructive" />
            Falhas recentes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
            Carregando...
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-destructive" />
          Falhas recentes
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Últimas 10 notificações com falha. Use &quot;Reenviar&quot; para tentar novamente.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma falha recente.</p>
        ) : (
          <ul className="space-y-2 max-h-[320px] overflow-y-auto">
            {rows.map((row) => (
              <li
                key={row.id}
                className="flex flex-col gap-1 rounded-lg border p-3 text-sm"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium truncate">
                      {row.notification_settings?.name || "Regra"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {EVENT_LABELS[row.event_key] || row.event_key} • {row.channel} • {row.recipient}
                    </p>
                    <p className="text-xs text-destructive mt-1 truncate" title={row.error_message || undefined}>
                      {row.error_message || "Erro não registrado"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {format(new Date(row.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant="outline" className="text-[10px]">
                      {inferErrorType(row.error_message)}
                    </Badge>
                    {row.notification_settings_id && row.payload_json && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs"
                        disabled={retryingId === row.id}
                        onClick={() => handleRetry(row)}
                      >
                        {retryingId === row.id ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <>
                            <RefreshCw className="w-3 h-3 mr-1" />
                            Reenviar
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
        <Button
          variant="ghost"
          size="sm"
          className="w-full text-xs"
          onClick={() => navigate("/auditoria/log")}
        >
          Ver todos no Log de Auditoria
        </Button>
      </CardContent>
    </Card>
  );
}
