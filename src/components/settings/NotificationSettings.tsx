import { useReducer, useState } from "react";
import { Bell, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  NotificationRule,
  NotificationChannel,
  NotificationService,
  DEFAULT_NOTIFICATION_RULE,
  useNotificationSettings,
} from "@/hooks/useNotificationSettings";
import { useEstablishmentDB } from "@/hooks/useEstablishment";
import { useEvolutionApiConfig } from "@/hooks/useEvolutionApiConfig";
import { useEmailSmtpConfig } from "@/hooks/useEmailSmtpConfig";
import { draftReducer } from "@/components/settings/NotificationSettings.reducer";
import { NotificationRuleEditor } from "@/components/settings/NotificationRuleEditor";
import { NotificationRulesList } from "@/components/settings/NotificationRulesList";
import {
  EVENT_OPTIONS,
  PLACEHOLDERS,
  buildSampleContext,
  extractTemplateTokens,
  renderTemplatePreview,
} from "@/components/settings/NotificationSettings.constants";
import { sendTestNotification } from "@/services/notificationDispatch";
import { storageProvider } from "@/lib/storage/storageProvider";
import { parseNotificationMediaUrl, type NotificationMediaItem } from "@/lib/notificationMedia";

export function NotificationSettings() {
  const { toast } = useToast();
  const { establishment } = useEstablishmentDB();
  const { config: evolutionConfig } = useEvolutionApiConfig();
  const { config: emailConfig } = useEmailSmtpConfig();
  const { rules, isLoading, error, saveRule, deleteRule, createEmptyRule } =
    useNotificationSettings();
  const [togglingRuleId, setTogglingRuleId] = useState<string | null>(null);
  const [draft, dispatchDraft] = useReducer(draftReducer, DEFAULT_NOTIFICATION_RULE);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit" | "view">("create");
  const allowedPlaceholders = PLACEHOLDERS[draft.service];
  const usedPlaceholders = extractTemplateTokens(draft.message);
  const invalidPlaceholders = usedPlaceholders.filter(
    (placeholder) => !allowedPlaceholders.includes(placeholder)
  );
  const sampleContext = buildSampleContext(establishment?.timezone);
  const previewText = renderTemplatePreview(
    draft.message,
    sampleContext[draft.service]
  );

  const toggleChannel = (channel: NotificationChannel, checked: boolean) => {
    dispatchDraft({ type: "toggle_channel", channel, checked });
  };

  const handleSave = async () => {
    if (!draft.name.trim()) {
      toast({
        title: "Nome obrigatório",
        description: "Informe um nome para a regra.",
        variant: "destructive",
      });
      return;
    }

    if (draft.channels.length === 0) {
      toast({
        title: "Selecione um tipo",
        description: "Escolha ao menos um tipo de notificação: WhatsApp ou Email.",
        variant: "destructive",
      });
      return;
    }

    if (!draft.message.trim()) {
      toast({
        title: "Texto obrigatório",
        description: "Preencha o texto da notificação.",
        variant: "destructive",
      });
      return;
    }

    if (invalidPlaceholders.length > 0) {
      toast({
        title: "Placeholders inválidos",
        description:
          "Remova ou corrija os placeholders inválidos antes de salvar a regra.",
        variant: "destructive",
      });
      return;
    }

    if (draft.service !== "aniversario" && (!Number.isFinite(draft.hours) || draft.hours < 0)) {
      toast({
        title: "Horas inválidas",
        description: "Informe uma quantidade de horas válida (maior ou igual a zero).",
        variant: "destructive",
      });
      return;
    }

    if (draft.channels.includes("whatsapp") && !evolutionConfig.enabled) {
      const confirmed = window.confirm(
        "A Evolution API (WhatsApp) não está ativada nas Integrações. As notificações por WhatsApp não serão enviadas até configurá-la. Deseja salvar mesmo assim?"
      );
      if (!confirmed) return;
    }

    if (draft.channels.includes("email") && (!emailConfig.enabled || !emailConfig.backendUrl?.trim())) {
      const confirmed = window.confirm(
        "O e-mail SMTP não está configurado ou a URL do backend não foi informada. As notificações por e-mail não serão enviadas até configurá-lo. Deseja salvar mesmo assim?"
      );
      if (!confirmed) return;
    }

    if (draft.recipientTarget === "patient" && draft.channels.includes("whatsapp")) {
      toast({
        title: "WhatsApp para paciente",
        description: "Verifique se os pacientes possuem telefone cadastrado para receber as notificações.",
        variant: "default",
      });
    }

    await saveRule(draft, {
      successTitle: draft.id ? "Regra atualizada" : "Regra criada",
      successDescription: draft.id
        ? `As alterações da regra "${draft.name}" foram salvas.`
        : `A regra "${draft.name}" foi criada com sucesso.`,
    });
    setIsModalOpen(false);
  };

  const handleDelete = async () => {
    if (!draft.id) {
      dispatchDraft({ type: "replace", rule: createEmptyRule("agenda") });
      toast({
        title: "Rascunho limpo",
        description: "O rascunho foi limpo e uma nova regra em branco foi carregada.",
      });
      return;
    }
    const confirmed = window.confirm(
      `Deseja realmente excluir a regra "${draft.name}"?`
    );
    if (!confirmed) return;
    await deleteRule(draft.id);
    dispatchDraft({ type: "replace", rule: createEmptyRule("agenda") });
    toast({
      title: "Regra excluída",
      description: `A regra "${draft.name}" foi removida.`,
    });
    setIsModalOpen(false);
  };

  const handleNewRule = () => {
    dispatchDraft({ type: "replace", rule: createEmptyRule("agenda") });
    setModalMode("create");
    setIsModalOpen(true);
  };

  const handleDuplicateRule = () => {
    const base = createEmptyRule(draft.service);
    const duplicated: NotificationRule = {
      ...draft,
      id: undefined,
      version: 1,
      updatedAt: null,
      sortOrder: base.sortOrder,
      name: draft.name?.trim()
        ? `${draft.name.trim()} (cópia)`
        : "Nova regra (cópia)",
    };

    dispatchDraft({ type: "replace", rule: duplicated });
    setModalMode("create");
    setIsModalOpen(true);
    toast({
      title: "Rascunho duplicado",
      description: `A cópia de "${draft.name}" foi preparada. Clique em Salvar regra para criar.`,
    });
  };

  const handleToggleRuleEnabled = async (rule: NotificationRule) => {
    if (!rule.id) return;
    try {
      setTogglingRuleId(rule.id);
      const nextEnabled = !rule.enabled;
      await saveRule(
        { ...rule, enabled: nextEnabled },
        {
          successTitle: nextEnabled ? "Regra ativada" : "Regra inativada",
          successDescription: nextEnabled
            ? `A regra "${rule.name}" foi marcada como ativa.`
            : `A regra "${rule.name}" foi marcada como inativa.`,
        }
      );
      if (draft.id === rule.id) dispatchDraft({ type: "set_enabled", value: nextEnabled });
    } finally {
      setTogglingRuleId(null);
    }
  };

  const insertPlaceholder = (placeholder: string) => {
    dispatchDraft({ type: "append_placeholder", value: placeholder });
  };

  const handleAddMediaFiles = async (files: File[]) => {
    const current = parseNotificationMediaUrl(draft.mediaUrl);
    const newItems: NotificationMediaItem[] = [];
    for (const file of files) {
      try {
        const result = await storageProvider.upload({
          file,
          path: "notifications/media",
          module: "notifications",
        });
        newItems.push({
          url: result.url,
          name: file.name,
          type: file.type,
          storage_key: result.key,
        });
      } catch (err) {
        toast({
          title: "Erro ao enviar mídia",
          description: err instanceof Error ? err.message : "Falha no upload.",
          variant: "destructive",
        });
      }
    }
    if (newItems.length) {
      dispatchDraft({ type: "set_media_items", value: [...current, ...newItems] });
    }
  };

  const handleServiceChange = (service: NotificationService) => {
    const firstEvent = EVENT_OPTIONS[service][0].value;
    dispatchDraft({ type: "set_service", service, defaultEvent: firstEvent });
  };

  const handleSendTest = async (email?: string, phone?: string) => {
    if (!draft.id) return;
    const sampleContext = buildSampleContext(establishment?.timezone);
    const context = sampleContext[draft.service] as Record<string, string>;
    try {
      await sendTestNotification({
        ruleId: draft.id,
        service: draft.service,
        eventKey: draft.eventKey,
        recipient: { email, phone },
        context,
      });
      toast({
        title: "Teste enviado",
        description: "Verifique o e-mail e/ou WhatsApp informado.",
      });
    } catch (err: unknown) {
      toast({
        title: "Erro ao enviar teste",
        description: err instanceof Error ? err.message : "Não foi possível enviar o teste.",
        variant: "destructive",
      });
      throw err;
    }
  };

  const handleViewRule = (rule: NotificationRule) => {
    dispatchDraft({ type: "replace", rule });
    setModalMode("view");
    setIsModalOpen(true);
  };

  const handleEditRule = (rule: NotificationRule) => {
    dispatchDraft({ type: "replace", rule });
    setModalMode("edit");
    setIsModalOpen(true);
  };

  const handleDeleteRuleFromList = async (rule: NotificationRule) => {
    if (!rule.id) return;
    const confirmed = window.confirm(
      `Deseja realmente excluir a regra "${rule.name}"?`
    );
    if (!confirmed) return;
    await deleteRule(rule.id);
    if (draft.id === rule.id) {
      dispatchDraft({ type: "replace", rule: createEmptyRule("agenda") });
      setIsModalOpen(false);
    }
    toast({
      title: "Regra excluída",
      description: `A regra "${rule.name}" foi removida.`,
    });
  };

  if (isLoading) {
    return (
      <Card className="shadow-sm border-0">
        <CardContent className="py-12">
          <div className="flex items-center justify-center gap-2 text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Carregando configurações de notificações...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-sm border-0">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="w-5 h-5" />
          Configurações de Notificações
        </CardTitle>
        {error ? <p className="text-xs text-destructive">{error}</p> : null}
      </CardHeader>
      <CardContent className="space-y-6">
        <NotificationRulesList
          state={{
            rules,
            togglingRuleId,
          }}
          actions={{
            onNewRule: handleNewRule,
            onViewRule: handleViewRule,
            onEditRule: handleEditRule,
            onToggleEnabled: handleToggleRuleEnabled,
            onDeleteRule: handleDeleteRuleFromList,
          }}
        />
      </CardContent>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-5xl">
          <DialogHeader>
            <DialogTitle>
              {modalMode === "view"
                ? "Visualizar template"
                : draft.id
                ? "Editar template"
                : "Novo template"}
            </DialogTitle>
            <DialogDescription>
              {modalMode === "view"
                ? "Visualização do template sem edição."
                : "Configure os campos do template e salve quando concluir."}
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-[72vh] overflow-y-auto pr-1 space-y-6">
            <NotificationRuleEditor
              state={{
                draft,
                isLoading,
                invalidPlaceholders,
                usedPlaceholders,
                previewText,
                readOnly: modalMode === "view",
              }}
              actions={{
                dispatchDraft,
                onToggleChannel: toggleChannel,
                onInsertPlaceholder: insertPlaceholder,
                onServiceChange: handleServiceChange,
                onSave: handleSave,
                onDuplicate: handleDuplicateRule,
                onDelete: handleDelete,
                onAddMediaFiles: handleAddMediaFiles,
                onSendTest: handleSendTest,
              }}
            />
          </div>

          <DialogFooter>
            {modalMode === "view" ? (
              <Button variant="outline" onClick={() => setIsModalOpen(false)}>
                Fechar
              </Button>
            ) : null}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
