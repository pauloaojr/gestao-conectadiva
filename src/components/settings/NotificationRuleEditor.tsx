import { Dispatch } from "react";
import { Copy, Save, Trash2, FileText, ChevronRight, MessageSquare, Image, CheckCheck, User } from "lucide-react";
import { NotificationMediaField } from "@/components/settings/NotificationMediaField";
import { parseNotificationMediaUrl } from "@/lib/notificationMedia";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  NotificationEventKey,
  NotificationRecipientTarget,
  NotificationService,
  NotificationTiming,
  NotificationRule,
} from "@/hooks/useNotificationSettings";
import { DraftAction } from "@/components/settings/NotificationSettings.reducer";
import { EVENT_OPTIONS, PLACEHOLDERS } from "@/components/settings/NotificationSettings.constants";

type NotificationRuleEditorProps = {
  state: {
    draft: NotificationRule;
    isLoading: boolean;
    invalidPlaceholders: string[];
    usedPlaceholders: string[];
    previewText: string;
    readOnly?: boolean;
  };
  actions: {
    dispatchDraft: Dispatch<DraftAction>;
    onToggleChannel: (channel: "whatsapp" | "email", checked: boolean) => void;
    onInsertPlaceholder: (placeholder: string) => void;
    onServiceChange: (service: NotificationService) => void;
    onSave: () => void;
    onDuplicate: () => void;
    onDelete: () => void;
    onAddMediaFiles?: (files: File[]) => Promise<void>;
  };
};

function PreviewMediaThumbnails({
  mediaUrl,
  compact,
  lightBubble,
}: {
  mediaUrl: string;
  compact?: boolean;
  /** Quando true, usa cores para bolha clara (WhatsApp light mode) */
  lightBubble?: boolean;
}) {
  const items = parseNotificationMediaUrl(mediaUrl);
  if (items.length === 0) return null;
  const size = compact ? "w-14 h-14" : "w-16 h-16";
  const bg = compact ? (lightBubble ? "bg-black/10" : "bg-black/20") : "bg-muted/30";
  const iconColor = compact && lightBubble ? "text-[#667781]" : compact ? "text-[#e9edef]" : "text-muted-foreground";
  return (
    <div className="flex flex-wrap gap-2 mb-2">
      {items.map((item, i) => (
        <div
          key={i}
          className={`rounded border overflow-hidden ${bg} ${size} flex-shrink-0 flex items-center justify-center`}
        >
          {item.url.startsWith("data:") || item.url.startsWith("http") ? (
            item.type.startsWith("image/") ? (
              <img src={item.url} alt={item.name} className="w-full h-full object-cover" />
            ) : item.type.startsWith("video/") ? (
              <video src={item.url} className="w-full h-full object-cover" muted preload="metadata" />
            ) : (
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className={`flex items-center justify-center w-full h-full ${iconColor}`}
              >
                <FileText className="w-5 h-5" />
              </a>
            )
          ) : (
            <FileText className={`w-5 h-5 ${iconColor}`} />
          )}
        </div>
      ))}
    </div>
  );
}

export function NotificationRuleEditor({
  state,
  actions,
}: NotificationRuleEditorProps) {
  const {
    draft,
    isLoading,
    invalidPlaceholders,
    usedPlaceholders,
    previewText,
    readOnly = false,
  } = state;
  const {
    dispatchDraft,
    onToggleChannel,
    onInsertPlaceholder,
    onServiceChange,
    onSave,
    onDuplicate,
    onDelete,
    onAddMediaFiles,
  } = actions;

  return (
    <div className="space-y-4">
      {/* Identificação */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <MessageSquare className="w-4 h-4" />
            Identificação
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Nome e status da regra de notificação.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="notification-rule-name">Nome da regra</Label>
            <Input
              id="notification-rule-name"
              value={draft.name}
              onChange={(e) => dispatchDraft({ type: "set_name", value: e.target.value })}
              placeholder="Ex.: Lembrete de consulta 24h antes"
              disabled={readOnly}
            />
          </div>
          <div className="flex items-center justify-between rounded-lg border bg-muted/30 p-3">
            <div className="space-y-0.5">
              <Label htmlFor="notification-enabled" className="text-sm font-medium">
                Notificações ativas
              </Label>
              <p className="text-xs text-muted-foreground">
                Desative para pausar os envios sem perder o template.
              </p>
            </div>
            <Checkbox
              id="notification-enabled"
              checked={draft.enabled}
              disabled={readOnly}
              onCheckedChange={(checked) =>
                dispatchDraft({ type: "set_enabled", value: checked === true })
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Quando e para quem */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-medium">Quando e para quem</CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Serviço, destinatário, evento e canais de envio.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="notification-service">Serviço</Label>
              <Select value={draft.service} onValueChange={onServiceChange} disabled={readOnly}>
                <SelectTrigger id="notification-service">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="agenda">Agenda</SelectItem>
                  <SelectItem value="financeiro">Financeiro</SelectItem>
                  <SelectItem value="aniversario">Aniversário</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="notification-recipient-target">Destinatário</Label>
              <Select
                value={draft.recipientTarget}
                disabled={readOnly}
                onValueChange={(value: NotificationRecipientTarget) =>
                  dispatchDraft({ type: "set_recipient_target", value })
                }
              >
                <SelectTrigger id="notification-recipient-target">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="patient">Paciente</SelectItem>
                  <SelectItem value="professional">Profissional</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="notification-event">Evento</Label>
              <Select
                value={draft.eventKey}
                disabled={readOnly}
                onValueChange={(value: NotificationEventKey) =>
                  dispatchDraft({ type: "set_event", value })
                }
              >
                <SelectTrigger id="notification-event">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {EVENT_OPTIONS[draft.service].map((event) => (
                    <SelectItem key={event.value} value={event.value}>
                      {event.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Canais de envio</Label>
            <div className="flex flex-wrap gap-6">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="notification-type-whatsapp"
                  checked={draft.channels.includes("whatsapp")}
                  disabled={readOnly}
                  onCheckedChange={(checked) => onToggleChannel("whatsapp", checked === true)}
                />
                <Label htmlFor="notification-type-whatsapp">WhatsApp</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="notification-type-email"
                  checked={draft.channels.includes("email")}
                  disabled={readOnly}
                  onCheckedChange={(checked) => onToggleChannel("email", checked === true)}
                />
                <Label htmlFor="notification-type-email">Email</Label>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              {draft.channels.includes("whatsapp") &&
                "WhatsApp: prefira texto curto. "}
              {draft.channels.includes("email") &&
                "Email: suporta texto detalhado e links longos."}
              {draft.channels.length === 0 && "Selecione ao menos um canal."}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Conteúdo da mensagem */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <Image className="w-4 h-4" />
            Conteúdo da mensagem
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Texto da notificação e anexos. Use os placeholders para dados dinâmicos.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="notification-message">Texto da mensagem</Label>
            <Textarea
              id="notification-message"
              value={draft.message}
              onChange={(e) => dispatchDraft({ type: "set_message", value: e.target.value })}
              onPaste={(e) => {
                const files = e.clipboardData?.files;
                if (files?.length && onAddMediaFiles && !readOnly) {
                  e.preventDefault();
                  onAddMediaFiles(Array.from(files));
                }
              }}
              placeholder="Digite o texto. Você pode colar imagens/arquivos com Ctrl+V."
              className="min-h-[120px]"
              disabled={readOnly}
            />
          </div>

          <div className="space-y-2 rounded-lg border bg-muted/20 p-3">
            <p className="text-xs font-medium text-muted-foreground">Placeholders disponíveis</p>
            <div className="flex flex-wrap gap-1.5">
              {PLACEHOLDERS[draft.service].map((placeholder) => (
                <Button
                  key={placeholder}
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-6 text-xs px-2"
                  onClick={() => onInsertPlaceholder(placeholder)}
                  disabled={readOnly}
                >
                  {placeholder}
                </Button>
              ))}
            </div>
            {usedPlaceholders.length > 0 && (
              <div className="pt-2 space-y-1">
                <p className="text-xs text-muted-foreground">Usados na mensagem:</p>
                <div className="flex flex-wrap gap-1.5">
                  {usedPlaceholders.map((p) => (
                    <Badge
                      key={p}
                      variant={invalidPlaceholders.includes(p) ? "destructive" : "secondary"}
                      className="text-xs"
                    >
                      {p}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            {invalidPlaceholders.length > 0 && (
              <p className="text-xs text-destructive pt-1">
                Inválidos para este serviço: {invalidPlaceholders.join(", ")}
              </p>
            )}
          </div>

          {onAddMediaFiles ? (
            <NotificationMediaField
              mediaUrl={draft.mediaUrl}
              onMediaChange={(items) => dispatchDraft({ type: "set_media_items", value: items })}
              onAddFiles={onAddMediaFiles}
              readOnly={readOnly}
              disabled={isLoading}
            />
          ) : (
            <div className="space-y-2">
              <Label htmlFor="notification-media-url">Imagem (opcional)</Label>
              <Input
                id="notification-media-url"
                value={draft.mediaUrl}
                onChange={(e) => dispatchDraft({ type: "set_media_url", value: e.target.value })}
                placeholder="https://..."
                disabled={readOnly}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Agendamento */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-medium">Agendamento</CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Quando a notificação será enviada em relação ao evento.
          </p>
        </CardHeader>
        <CardContent>
          {draft.service === "aniversario" ? (
            <div className="space-y-2">
              <Label htmlFor="notification-send-time">Hora do envio</Label>
              <Input
                id="notification-send-time"
                type="time"
                value={draft.sendTime ?? "09:00"}
                onChange={(e) =>
                  dispatchDraft({ type: "set_send_time", value: e.target.value })
                }
                className="w-full max-w-[140px]"
                disabled={readOnly}
              />
              <p className="text-xs text-muted-foreground">
                Horário (24h) em que a notificação de aniversário será enviada.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <Label>Quando enviar</Label>
              <div className="flex flex-wrap gap-3 items-center">
                <Input
                  type="number"
                  min={0}
                  value={draft.hours}
                  onChange={(e) =>
                    dispatchDraft({ type: "set_hours", value: Number(e.target.value) })
                  }
                  className="w-20"
                  disabled={readOnly}
                />
                <Select
                  value={draft.timing}
                  disabled={readOnly}
                  onValueChange={(value: NotificationTiming) =>
                    dispatchDraft({ type: "set_timing", value })
                  }
                >
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="before">antes do evento</SelectItem>
                    <SelectItem value="after">depois do evento</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <p className="text-xs text-muted-foreground">
                Quantas horas antes/depois da Agenda ou do evento Financeiro.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pré-visualização (colapsável) */}
      <Collapsible defaultOpen={false}>
        <CollapsibleTrigger className="flex w-full items-center justify-between rounded-lg border bg-muted/20 px-4 py-3 text-left hover:bg-muted/30 transition-colors [&[data-state=open]>svg]:rotate-90">
          <span className="text-sm font-medium">Pré-visualização do envio</span>
          <ChevronRight className="h-4 w-4 shrink-0 transition-transform text-muted-foreground" />
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="mt-2 space-y-4">
            {draft.channels.length === 0 ? (
              <p className="text-sm text-muted-foreground p-3 rounded-lg border">
                Selecione ao menos um canal (WhatsApp ou Email) para visualizar o preview.
              </p>
            ) : (
              <div className="space-y-4">
                {draft.channels.includes("whatsapp") && (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Como chega no WhatsApp
                    </p>
                    <div className="rounded-xl overflow-hidden border border-[#e9edef] shadow-lg min-h-[200px]">
                      {/* Header estilo WhatsApp (modo claro) */}
                      <div className="flex items-center gap-3 px-4 py-3 bg-[#f0f2f5] border-b border-[#e9edef]">
                        <div className="w-10 h-10 rounded-full bg-[#00a884] flex items-center justify-center text-white">
                          <User className="w-5 h-5" strokeWidth={2} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[#111b21] text-sm font-medium truncate">
                            Pré-visualização
                          </p>
                          <p className="text-[#667781] text-xs">online</p>
                        </div>
                      </div>
                      {/* Área do chat - fundo padrão WhatsApp (modo claro) */}
                      <div className="p-4 min-h-[140px] bg-[#e5ddd5]">
                        <div className="flex justify-end">
                          {/* Bolha enviada - verde claro oficial WhatsApp */}
                          <div
                            className="max-w-[85%] rounded-[10px] rounded-tr-[2px] bg-[#d9fdd3] px-3 py-2 shadow-[0_1px_0.5px_rgba(0,0,0,0.13)]"
                            style={{ boxShadow: "0 1px 0.5px rgba(0,0,0,0.13)" }}
                          >
                            <PreviewMediaThumbnails mediaUrl={draft.mediaUrl} compact lightBubble />
                            <p className="text-[#111b21] text-[15px] leading-[1.4] whitespace-pre-wrap break-words">
                              {previewText || "Digite um texto para visualizar..."}
                            </p>
                            <div className="flex items-center justify-end gap-1 mt-1">
                              <span className="text-[10px] text-[#667781]">
                                {new Date().toLocaleTimeString("pt-BR", {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </span>
                              <CheckCheck className="w-4 h-3.5 text-[#53bdeb] shrink-0" strokeWidth={2.5} />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                {draft.channels.includes("email") && (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Como chega no Email
                    </p>
                    <div className="rounded-xl border overflow-hidden bg-muted/10">
                      <div className="border-b bg-muted/30 px-4 py-2">
                        <p className="text-[10px] text-muted-foreground uppercase">Assunto</p>
                        <p className="text-sm font-medium">
                          {draft.name || "Notificação Clínica"}
                        </p>
                      </div>
                      <div className="p-4 space-y-3">
                        <div className="text-sm whitespace-pre-wrap text-foreground">
                          {previewText || "Digite um texto para visualizar..."}
                        </div>
                        <PreviewMediaThumbnails mediaUrl={draft.mediaUrl} />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              Preview com dados simulados para validação.
            </p>
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Ações */}
      {!readOnly ? (
        <div className="flex flex-wrap items-center gap-2 pt-2">
          <Button
            onClick={onSave}
            disabled={isLoading || invalidPlaceholders.length > 0}
            className="clinic-gradient text-white"
          >
            <Save className="w-4 h-4 mr-2" />
            Salvar regra
          </Button>
          <Button type="button" variant="outline" onClick={onDuplicate}>
            <Copy className="w-4 h-4 mr-2" />
            Duplicar
          </Button>
          <Button type="button" variant="outline" onClick={onDelete}>
            <Trash2 className="w-4 h-4 mr-2" />
            {draft.id ? "Excluir" : "Limpar"}
          </Button>
          {draft.id && (
            <span className="text-xs text-muted-foreground ml-2">
              v{draft.version}
              {draft.updatedAt
                ? ` • ${new Date(draft.updatedAt).toLocaleString("pt-BR")}`
                : ""}
            </span>
          )}
        </div>
      ) : draft.id ? (
        <p className="text-xs text-muted-foreground pt-2">
          v{draft.version}
          {draft.updatedAt
            ? ` • Atualizado em ${new Date(draft.updatedAt).toLocaleString("pt-BR")}`
            : ""}
        </p>
      ) : null}
    </div>
  );
}
