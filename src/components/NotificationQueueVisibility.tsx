import { useCallback, useEffect, useState } from "react";
import { Clock, Inbox, MessageSquare } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

type QueueVisibilityData = {
  lastSentAt: string | null;
  lastSentCount: number;
  last24hSuccess: number;
  last24hFailed: number;
  appointmentsNext24h: number;
  revenuesLast2h: number;
};

export function NotificationQueueVisibility() {
  const [data, setData] = useState<QueueVisibilityData>({
    lastSentAt: null,
    lastSentCount: 0,
    last24hSuccess: 0,
    last24hFailed: 0,
    appointmentsNext24h: 0,
    revenuesLast2h: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const now = new Date();
      const since24h = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
      const since2h = new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString();
      const today = now.toISOString().slice(0, 10);

      const [
        lastLogRes,
        success24hRes,
        failed24hRes,
        appointmentsRes,
        revenuesRes,
      ] = await Promise.all([
        supabase
          .from("notification_dispatch_logs")
          .select("created_at")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from("notification_dispatch_logs")
          .select("id", { count: "exact", head: true })
          .gte("created_at", since24h)
          .eq("status", "success"),
        supabase
          .from("notification_dispatch_logs")
          .select("id", { count: "exact", head: true })
          .gte("created_at", since24h)
          .eq("status", "failed"),
        supabase
          .from("appointments")
          .select("id", { count: "exact", head: true })
          .in("status", ["pending", "confirmed"])
          .gte("appointment_date", today),
        supabase
          .from("revenue")
          .select("id", { count: "exact", head: true })
          .gte("created_at", since2h),
      ]);

      setData({
        lastSentAt: lastLogRes.data?.created_at ?? null,
        lastSentCount: 1,
        last24hSuccess: success24hRes.count ?? 0,
        last24hFailed: failed24hRes.count ?? 0,
        appointmentsNext24h: appointmentsRes.count ?? 0,
        revenuesLast2h: revenuesRes.count ?? 0,
      });
    } catch {
      // silencioso
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (isLoading) {
    return (
      <Card className="border-border/60">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Inbox className="w-4 h-4" />
            Visibilidade da fila
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Carregando...</p>
        </CardContent>
      </Card>
    );
  }

  const lastSentLabel = data.lastSentAt
    ? formatDistanceToNow(new Date(data.lastSentAt), { addSuffix: true, locale: ptBR })
    : "Nenhum envio ainda";

  return (
    <Card className="border-border/60">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Inbox className="w-4 h-4" />
          Visibilidade da fila
        </CardTitle>
        <p className="text-xs text-muted-foreground mt-1">
          O scheduler roda a cada 15 min. Pendências estimadas por tipo.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2 text-sm">
          <Clock className="w-4 h-4 text-muted-foreground" />
          <span className="text-muted-foreground">Último envio:</span>
          <span className="font-medium">{lastSentLabel}</span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg border bg-muted/30 p-3">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <MessageSquare className="w-4 h-4" />
              <span className="text-xs">24h</span>
            </div>
            <p className="text-lg font-semibold text-green-600">{data.last24hSuccess} sucesso</p>
            <p className="text-xs text-muted-foreground">{data.last24hFailed} falha(s)</p>
          </div>
          <div className="rounded-lg border bg-muted/30 p-3">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Inbox className="w-4 h-4" />
              <span className="text-xs">Pendências</span>
            </div>
            <p className="text-sm font-medium">
              {data.appointmentsNext24h} consulta(s) nos próximos dias
            </p>
            <p className="text-xs text-muted-foreground">
              {data.revenuesLast2h} receita(s) criada(s) nas últimas 2h
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
