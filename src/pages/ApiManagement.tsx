import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useApiTokens } from "@/hooks/useApiTokens";
import { useAuth } from "@/contexts/AuthContext";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  KeyRound,
  Plus,
  Loader2,
  Copy,
  Check,
  FileText,
  ChevronRight,
} from "lucide-react";
import { API_MENUS } from "@/lib/apiDocs";
import { ApiEndpointDoc } from "@/components/ApiEndpointDoc";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const ApiManagement = () => {
  const { hasPermission } = useAuth();
  const canManage = hasPermission("api", "edit");
  const { tokens, isLoading, createToken, revokeToken } = useApiTokens();
  const [createOpen, setCreateOpen] = useState(false);
  const [newTokenName, setNewTokenName] = useState("");
  const [creating, setCreating] = useState(false);
  const [newTokenRaw, setNewTokenRaw] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleCreateToken = async () => {
    if (!newTokenName.trim() || !canManage) return;
    setCreating(true);
    try {
      const raw = await createToken(newTokenName.trim());
      if (raw) {
        setNewTokenRaw(raw);
      } else {
        setCreateOpen(false);
        setNewTokenName("");
      }
    } finally {
      setCreating(false);
    }
  };

  const handleCopyToken = async () => {
    if (!newTokenRaw) return;
    try {
      await navigator.clipboard.writeText(newTokenRaw);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  };

  const handleCloseCreate = () => {
    setCreateOpen(false);
    setNewTokenName("");
    setNewTokenRaw(null);
    setCopied(false);
  };

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">API</h1>
        <p className="text-muted-foreground text-sm">
          Configure tokens para consumidores externos e consulte a documentação dos endpoints.
        </p>
      </div>

      <Tabs defaultValue="tokens" className="space-y-4">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="tokens" className="flex items-center gap-2">
            <KeyRound className="w-4 h-4" />
            Tokens
          </TabsTrigger>
          <TabsTrigger value="docs" className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Documentação
          </TabsTrigger>
        </TabsList>

        <TabsContent value="tokens" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-base font-medium">Configuração de Tokens</CardTitle>
              {canManage && (
                <Button size="sm" onClick={() => setCreateOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Novo token
                </Button>
              )}
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Os tokens permitem que sistemas externos autentiquem nas APIs. Gere um token e informe ao consumidor.
                O token deve ser enviado no header <code className="text-xs bg-muted px-1 rounded">X-API-Key</code> ou{" "}
                <code className="text-xs bg-muted px-1 rounded">Authorization: Bearer &lt;token&gt;</code>.
              </p>
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : tokens.length === 0 ? (
                <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground text-sm">
                  Nenhum token cadastrado. Crie um token para que sistemas externos possam chamar as APIs.
                </div>
              ) : (
                <div className="space-y-2">
                  {tokens.map((t) => (
                    <div
                      key={t.id}
                      className="flex items-center justify-between rounded-lg border p-4"
                    >
                      <div>
                        <p className="font-medium">{t.name}</p>
                        <p className="text-sm text-muted-foreground font-mono">
                          {t.tokenPrefix}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Criado em {format(new Date(t.createdAt), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-xs font-medium px-2 py-1 rounded-full ${
                            t.isActive
                              ? "bg-emerald-500/20 text-emerald-600"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {t.isActive ? "Ativo" : "Revogado"}
                        </span>
                        {canManage && t.isActive && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => revokeToken(t.id)}
                          >
                            Revogar
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="docs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-medium flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Documentação dos Endpoints
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Documentação dos endpoints REST. Todas as APIs (Pacientes, Receitas, Despesas) usam o Backend.
                Configure <code className="text-xs bg-muted px-1 rounded">VITE_BACKEND_URL</code> para exibir a URL completa da API Pacientes.
              </p>
              <div className="space-y-2">
                {API_MENUS.map((menu) => {
                  const baseUrl =
                    menu.baseUrlKey === "backend"
                      ? (import.meta.env.VITE_BACKEND_URL ?? "")
                      : (import.meta.env.VITE_SUPABASE_URL ?? "");
                  return (
                    <Collapsible key={menu.id} defaultOpen={false} className="rounded-lg border">
                      <CollapsibleTrigger className="flex w-full items-center gap-2 px-4 py-3 text-left hover:bg-muted/50 transition-colors rounded-lg [&[data-state=open]>svg.chevron]:rotate-90">
                        <ChevronRight className="chevron h-4 w-4 shrink-0 transition-transform text-muted-foreground" />
                        <span className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                          {menu.label}
                        </span>
                        {menu.baseUrlKey === "backend" && (
                          <span className="text-xs font-normal normal-case text-muted-foreground/80">(Backend)</span>
                        )}
                        {menu.baseUrlKey === "supabase" && (
                          <span className="text-xs font-normal normal-case text-muted-foreground/80">(Supabase Edge Functions)</span>
                        )}
                        <span className="ml-auto text-xs text-muted-foreground">
                          {menu.endpoints.length} endpoint{menu.endpoints.length !== 1 ? "s" : ""}
                        </span>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <div className="space-y-3 px-4 pb-4 pt-1 border-t">
                          {menu.endpoints.map((ep, i) => (
                            <ApiEndpointDoc
                              key={`${menu.id}-${ep.method}-${i}`}
                              endpoint={ep}
                              baseUrl={baseUrl}
                            />
                          ))}
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={createOpen} onOpenChange={(open) => !open && handleCloseCreate()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {newTokenRaw ? "Copie seu token" : "Novo token"}
            </DialogTitle>
            <DialogDescription>
              {newTokenRaw
                ? "Este token não será exibido novamente. Copie e guarde em local seguro."
                : "Informe um nome para identificar o consumidor deste token."}
            </DialogDescription>
          </DialogHeader>
          {newTokenRaw ? (
            <div className="space-y-4">
              <div className="rounded-lg bg-muted p-4 font-mono text-sm break-all">
                {newTokenRaw}
              </div>
              <Button
                variant="outline"
                className="w-full"
                onClick={handleCopyToken}
              >
                {copied ? (
                  <Check className="w-4 h-4 mr-2 text-emerald-600" />
                ) : (
                  <Copy className="w-4 h-4 mr-2" />
                )}
                {copied ? "Copiado!" : "Copiar token"}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <Label htmlFor="token-name">Nome do consumidor</Label>
                <Input
                  id="token-name"
                  placeholder="Ex: Sistema de agendamento externo"
                  value={newTokenName}
                  onChange={(e) => setNewTokenName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleCreateToken()}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            {newTokenRaw ? (
              <Button onClick={handleCloseCreate}>Fechar</Button>
            ) : (
              <>
                <Button variant="outline" onClick={handleCloseCreate}>
                  Cancelar
                </Button>
                <Button
                  onClick={handleCreateToken}
                  disabled={!newTokenName.trim() || creating}
                >
                  {creating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Criar token
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ApiManagement;
