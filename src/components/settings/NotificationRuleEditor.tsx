import { Dispatch } from "react";
import { Copy, Save, Trash2 } from "lucide-react";
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
  };
};

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
  } = actions;

  return (
    <>
      <div className="flex items-center justify-between rounded-lg border bg-muted/20 p-3">
        <div className="min-w-0">
          <p className="text-sm font-medium truncate">
            {draft.name?.trim() ? draft.name : "Nova regra"}
          </p>
          <p className="text-xs text-muted-foreground">
            {draft.service === "agenda"
              ? "Agenda"
              : draft.service === "financeiro"
              ? "Financeiro"
              : "Aniversário"}{" "}
            •{" "}
            {draft.recipientTarget === "professional" ? "Profissional" : "Paciente"} •{" "}
            {draft.enabled ? "Ativa" : "Inativa"}
          </p>
        </div>
      </div>

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

      <div className="flex items-center justify-between rounded-lg border bg-muted/30 p-4">
        <div className="space-y-1">
          <Label className="text-sm font-medium">Notificações ativas</Label>
          <p className="text-xs text-muted-foreground">
            Desative para pausar os envios sem perder o template configurado.
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

      <div className="space-y-3">
        <Label>Tipo</Label>
        <p className="text-sm text-muted-foreground">
          Escolha por quais integrações a notificação será enviada.
        </p>
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
        <div className="rounded-md border bg-muted/20 p-3 text-xs text-muted-foreground space-y-1">
          {draft.channels.includes("whatsapp") && (
            <p>• WhatsApp: prefira texto curto, emojis moderados e link público para imagem.</p>
          )}
          {draft.channels.includes("email") && (
            <p>• Email: você pode usar texto mais detalhado e incluir links longos no corpo.</p>
          )}
          {draft.channels.length === 0 && <p>• Selecione ao menos um tipo para visualizar recomendações.</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="notification-service">Serviço</Label>
          <Select
            value={draft.service}
            onValueChange={onServiceChange}
            disabled={readOnly}
          >
            <SelectTrigger id="notification-service">
              <SelectValue placeholder="Selecione o serviço" />
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
              <SelectValue placeholder="Selecione o destinatário" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="patient">Paciente</SelectItem>
              <SelectItem value="professional">Profissional (atendente)</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Paciente usa os dados de contato do paciente. Profissional usa os dados do atendente.
          </p>
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
              <SelectValue placeholder="Selecione o evento" />
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
        <Label htmlFor="notification-message">Texto</Label>
        <Textarea
          id="notification-message"
          value={draft.message}
          onChange={(e) => dispatchDraft({ type: "set_message", value: e.target.value })}
          placeholder="Digite o texto da notificação. Você pode usar emojis e links."
          className="min-h-[140px]"
          disabled={readOnly}
        />
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">Placeholders disponíveis para este serviço:</p>
          <div className="flex flex-wrap gap-2">
            {PLACEHOLDERS[draft.service].map((placeholder) => (
              <Button
                key={placeholder}
                type="button"
                variant="outline"
                size="sm"
                className="h-7 text-xs"
                onClick={() => onInsertPlaceholder(placeholder)}
                disabled={readOnly}
              >
                {placeholder}
              </Button>
            ))}
          </div>
          {usedPlaceholders.length > 0 && (
            <div className="space-y-1 pt-1">
              <p className="text-xs text-muted-foreground">Placeholders usados na mensagem:</p>
              <div className="flex flex-wrap gap-2">
                {usedPlaceholders.map((placeholder) => {
                  const isInvalid = invalidPlaceholders.includes(placeholder);
                  return (
                    <Badge key={placeholder} variant={isInvalid ? "destructive" : "secondary"}>
                      {placeholder}
                    </Badge>
                  );
                })}
              </div>
            </div>
          )}
            {invalidPlaceholders.length > 0 && (
            <p className="text-xs text-destructive">
              Placeholders inválidos para{" "}
              {draft.service === "agenda"
                ? "Agenda"
                : draft.service === "financeiro"
                ? "Financeiro"
                : "Aniversário"}
              : {invalidPlaceholders.join(", ")}
            </p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="notification-media-url">Imagem (opcional)</Label>
        <Input
          id="notification-media-url"
          value={draft.mediaUrl}
          onChange={(e) => dispatchDraft({ type: "set_media_url", value: e.target.value })}
          placeholder="https://seu-dominio.com/imagem.png"
          disabled={readOnly}
        />
      </div>

      <div className="space-y-3">
        <Label>Pré-visualização do envio</Label>
        {draft.channels.length === 0 ? (
          <div className="rounded-lg border bg-muted/20 p-3 text-xs text-muted-foreground">
            Selecione ao menos um tipo (WhatsApp ou Email) para visualizar o preview.
          </div>
        ) : (
          <div className={`grid grid-cols-1 gap-3 ${draft.channels.length > 1 ? "md:grid-cols-2" : ""}`}>
            {draft.channels.includes("whatsapp") && (
              <div className="rounded-lg border bg-muted/20 p-3 space-y-2">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  WhatsApp
                </p>
                <div className="rounded-md bg-white border p-3 text-sm whitespace-pre-wrap min-h-[110px]">
                  {previewText || "Digite um texto para visualizar a mensagem..."}
                </div>
                {draft.mediaUrl && (
                  <p className="text-xs text-muted-foreground truncate">Mídia: {draft.mediaUrl}</p>
                )}
              </div>
            )}
            {draft.channels.includes("email") && (
              <div className="rounded-lg border bg-muted/20 p-3 space-y-2">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Email
                </p>
                <div className="rounded-md bg-white border p-3 text-sm whitespace-pre-wrap min-h-[110px]">
                  {previewText || "Digite um texto para visualizar a mensagem..."}
                </div>
                <p className="text-xs text-muted-foreground">
                  Assunto: {draft.name || "Notificação Clínica"}
                </p>
              </div>
            )}
          </div>
        )}
        <p className="text-xs text-muted-foreground">
          Preview com dados simulados para validação do template antes do envio real.
        </p>
      </div>

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
            Horário (24h) em que a notificação de aniversário será enviada no dia.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          <Label>Horas</Label>
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <Input
              type="number"
              min={0}
              value={draft.hours}
              onChange={(e) =>
                dispatchDraft({ type: "set_hours", value: Number(e.target.value) })
              }
              className="w-full md:w-32"
              disabled={readOnly}
            />
            <Select
              value={draft.timing}
              disabled={readOnly}
              onValueChange={(value: NotificationTiming) =>
                dispatchDraft({ type: "set_timing", value })
              }
            >
              <SelectTrigger className="w-full md:w-52">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="before">Antes do evento</SelectItem>
                <SelectItem value="after">Depois do evento</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <p className="text-xs text-muted-foreground">
            Define quantas horas antes/depois do evento da Agenda ou do Financeiro a notificação será disparada.
          </p>
        </div>
      )}

      {!readOnly ? (
        <div className="flex flex-wrap gap-2">
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
            Duplicar regra
          </Button>
          <Button type="button" variant="outline" onClick={onDelete}>
            <Trash2 className="w-4 h-4 mr-2" />
            {draft.id ? "Excluir regra" : "Limpar rascunho"}
          </Button>
          {draft.id && (
            <p className="text-xs text-muted-foreground self-center">
              v{draft.version}
              {draft.updatedAt
                ? ` • Atualizado em ${new Date(draft.updatedAt).toLocaleString("pt-BR")}`
                : ""}
            </p>
          )}
        </div>
      ) : draft.id ? (
        <p className="text-xs text-muted-foreground">
          v{draft.version}
          {draft.updatedAt
            ? ` • Atualizado em ${new Date(draft.updatedAt).toLocaleString("pt-BR")}`
            : ""}
        </p>
      ) : null}
    </>
  );
}
