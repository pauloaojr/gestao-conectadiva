import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Checkbox } from "@/components/ui/checkbox";
import { usePlans, PlanItem } from "@/hooks/usePlans";
import { useSupabaseServices } from "@/hooks/useSupabaseServices";
import { Plus, Pencil, Trash2, Loader2, FileText } from "lucide-react";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

const FieldWithTooltip = ({ tooltip: content, children }: { tooltip: string; children: React.ReactNode }) => (
  <Tooltip>
    <TooltipTrigger asChild>{children}</TooltipTrigger>
    <TooltipContent side="top" className="max-w-xs">
      {content}
    </TooltipContent>
  </Tooltip>
);

export function PlanSettings() {
  const { plans, isLoading, addPlan, updatePlan, deletePlan } = usePlans();
  const { services } = useSupabaseServices();
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<PlanItem | null>(null);
  const [deleteItem, setDeleteItem] = useState<PlanItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    value: "",
    sessions: "",
    observations: "",
    due_day: "10",
    validity_months: "",
    cycle_start_day: "01",
    serviceIds: [] as string[],
  });

  const isEdit = !!editItem;

  const openNew = () => {
    setEditItem(null);
    setForm({ name: "", value: "", sessions: "", observations: "", due_day: "10", validity_months: "", cycle_start_day: "01", serviceIds: [] });
    setShowModal(true);
  };

  const openEdit = (item: PlanItem) => {
    setEditItem(item);
    setForm({
      name: item.name,
      value: String(item.value),
      sessions: String(item.sessions),
      observations: item.observations ?? "",
      due_day: String(item.due_day ?? 10),
      validity_months: item.validity_months != null ? String(item.validity_months) : "",
      cycle_start_day: String(item.cycle_start_day ?? 1).padStart(2, "0"),
      serviceIds: item.service_ids ?? [],
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditItem(null);
    setForm({ name: "", value: "", sessions: "", observations: "", due_day: "10", validity_months: "", cycle_start_day: "01", serviceIds: [] });
  };

  const handleSubmit = async () => {
    const name = form.name.trim();
    if (!name) return;
    const value = parseFloat(form.value.replace(/,/g, "."));
    if (Number.isNaN(value) || value < 0) return;
    const sessions = parseInt(form.sessions, 10);
    if (Number.isNaN(sessions) || sessions < 1) return;
    const dueDay = parseInt(form.due_day.replace(/\D/g, ""), 10) || 10;
    const dueDayClamped = Math.min(31, Math.max(1, dueDay));
    const validityMonths = form.validity_months.trim() === "" ? null : parseInt(form.validity_months.replace(/\D/g, ""), 10);
    if (validityMonths !== null && (Number.isNaN(validityMonths) || validityMonths < 1)) return;
    const cycleStartDay = parseInt(form.cycle_start_day.replace(/\D/g, ""), 10) || 1;
    const cycleStartDayClamped = Math.min(31, Math.max(1, cycleStartDay));

    setSaving(true);
    try {
      if (isEdit && editItem) {
        await updatePlan(editItem.id, {
          name,
          value,
          sessions,
          observations: form.observations.trim() || null,
          due_day: dueDayClamped,
          validity_months: validityMonths ?? null,
          cycle_start_day: cycleStartDayClamped,
          service_ids: form.serviceIds,
        });
      } else {
        await addPlan({
          name,
          value,
          sessions,
          observations: form.observations.trim() || null,
          due_day: dueDayClamped,
          validity_months: validityMonths ?? null,
          cycle_start_day: cycleStartDayClamped,
          service_ids: form.serviceIds,
        });
      }
      closeModal();
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteItem) return;
    setSaving(true);
    try {
      await deletePlan(deleteItem.id);
      setDeleteItem(null);
    } finally {
      setSaving(false);
    }
  };

  const validityNum = form.validity_months.trim() === "" ? 1 : parseInt(form.validity_months.replace(/\D/g, ""), 10);
  const valid =
    form.name.trim() !== "" &&
    !Number.isNaN(parseFloat(form.value.replace(/,/g, "."))) &&
    parseFloat(form.value.replace(/,/g, ".")) >= 0 &&
    !Number.isNaN(parseInt(form.sessions, 10)) &&
    parseInt(form.sessions, 10) >= 1 &&
    (form.validity_months.trim() === "" || validityNum >= 1);

  return (
    <>
      <Card className="shadow-sm border-border/50 rounded-2xl">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Planos
            </CardTitle>
            <Button onClick={openNew} className="rounded-xl">
              <Plus className="w-4 h-4 mr-2" />
              Novo Plano
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            Cadastre planos para vincular a clientes. Ex.: Básico (5 sessões – R$ 300,00).
          </p>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="rounded-xl border border-border/50 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead className="text-right">Sessões</TableHead>
                    <TableHead className="text-center">Dia Venc.</TableHead>
                    <TableHead className="text-center">Vigência</TableHead>
                    <TableHead className="text-center">Início Ciclo</TableHead>
                    <TableHead className="max-w-[200px]">Observações</TableHead>
                    <TableHead className="w-[100px]">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {plans.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                        Nenhum plano cadastrado. Clique em Novo Plano para adicionar.
                      </TableCell>
                    </TableRow>
                  ) : (
                    plans.map((plan) => (
                      <TableRow key={plan.id}>
                        <TableCell className="font-medium">{plan.name}</TableCell>
                        <TableCell className="text-right">{formatCurrency(plan.value)}</TableCell>
                        <TableCell className="text-right">{plan.sessions}</TableCell>
                        <TableCell className="text-center">{plan.due_day ?? 10}</TableCell>
                        <TableCell className="text-center">{plan.validity_months != null ? `${plan.validity_months} mês(es)` : "—"}</TableCell>
                        <TableCell className="text-center">{plan.cycle_start_day ?? 1}</TableCell>
                        <TableCell className="max-w-[200px] truncate text-muted-foreground text-sm" title={plan.observations ?? undefined}>
                          {plan.observations ?? "—"}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(plan)} title="Editar">
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              onClick={() => setDeleteItem(plan)}
                              title="Excluir"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showModal} onOpenChange={(open) => !open && closeModal()}>
        <DialogContent className="sm:max-w-[425px] rounded-2xl max-h-[90vh] flex flex-col p-0 gap-0">
          <DialogHeader className="p-6 pt-6 pb-0 pr-12 shrink-0">
            <DialogTitle>{isEdit ? "Editar plano" : "Novo plano"}</DialogTitle>
            <DialogDescription>
              {isEdit ? "Altere os dados do plano." : "Preencha os campos para cadastrar um novo plano."}
            </DialogDescription>
          </DialogHeader>
          <div className="overflow-y-auto min-h-0 flex-1 px-6 py-4">
            <div className="grid gap-4">
            <FieldWithTooltip tooltip="Nome do Plano. Ex.: Básico">
              <div className="grid gap-2">
                <Label htmlFor="plan-name">Nome *</Label>
                <Input
                  id="plan-name"
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  placeholder="Ex.: Básico"
                  className="rounded-xl"
                />
              </div>
            </FieldWithTooltip>
            <FieldWithTooltip tooltip="Valor do Plano. Valor total definido para quantas sessões o plano irá contemplar. Ex.: R$ 300,00">
              <div className="grid gap-2">
                <Label htmlFor="plan-value">Valor (R$) *</Label>
                <Input
                  id="plan-value"
                  type="text"
                  inputMode="decimal"
                  value={form.value}
                  onChange={(e) => setForm((p) => ({ ...p, value: e.target.value }))}
                  placeholder="Ex.: 300,00"
                  className="rounded-xl"
                />
              </div>
            </FieldWithTooltip>
            <FieldWithTooltip tooltip="Definir quantas sessões este plano irá contemplar. Ex.: 5">
              <div className="grid gap-2">
                <Label htmlFor="plan-sessions">Sessões *</Label>
                <Input
                  id="plan-sessions"
                  type="text"
                  inputMode="numeric"
                  value={form.sessions}
                  onChange={(e) => setForm((p) => ({ ...p, sessions: e.target.value.replace(/\D/g, "") }))}
                  placeholder="Ex.: 5"
                  className="rounded-xl"
                />
              </div>
            </FieldWithTooltip>
            <FieldWithTooltip tooltip="Dia do mês em que vence o plano. Ex.: 10">
              <div className="grid gap-2">
                <Label htmlFor="plan-due-day">Dia Vencimento</Label>
                <Input
                  id="plan-due-day"
                  type="text"
                  inputMode="numeric"
                  value={form.due_day}
                  onChange={(e) => setForm((p) => ({ ...p, due_day: e.target.value.replace(/\D/g, "").slice(0, 2) || "10" }))}
                  placeholder="10"
                  className="rounded-xl"
                />
              </div>
            </FieldWithTooltip>
            <FieldWithTooltip tooltip="Quantidade de meses que o plano fica ativo. Deixe em branco se não houver vigência definida.">
              <div className="grid gap-2">
                <Label htmlFor="plan-validity">Vigência (meses)</Label>
                <Input
                  id="plan-validity"
                  type="text"
                  inputMode="numeric"
                  value={form.validity_months}
                  onChange={(e) => setForm((p) => ({ ...p, validity_months: e.target.value.replace(/\D/g, "") }))}
                  placeholder="Ex.: 12"
                  className="rounded-xl"
                />
              </div>
            </FieldWithTooltip>
            <FieldWithTooltip tooltip="Dia do mês em que inicia o ciclo de vigência do plano. Ex.: 01">
              <div className="grid gap-2">
                <Label htmlFor="plan-cycle-start">Início do Ciclo</Label>
                <Input
                  id="plan-cycle-start"
                  type="text"
                  inputMode="numeric"
                  value={form.cycle_start_day}
                  onChange={(e) => setForm((p) => ({ ...p, cycle_start_day: e.target.value.replace(/\D/g, "").slice(0, 2) || "01" }))}
                  placeholder="01"
                  className="rounded-xl"
                />
              </div>
            </FieldWithTooltip>
            <FieldWithTooltip tooltip="Adicionar as observações necessárias que contemplam este plano. Ex.: 5 Sessões com qualquer profissional">
              <div className="grid gap-2">
                <Label htmlFor="plan-observations">Observações do Plano</Label>
                <Textarea
                  id="plan-observations"
                  value={form.observations}
                  onChange={(e) => setForm((p) => ({ ...p, observations: e.target.value }))}
                  placeholder="Ex.: 5 Sessões com qualquer profissional"
                  className="rounded-xl min-h-[80px] resize-none"
                  rows={3}
                />
              </div>
            </FieldWithTooltip>
            <FieldWithTooltip tooltip="Serviços que este plano dá direito. Marque os que estão incluídos.">
              <div className="grid gap-2">
                <Label>Serviços incluídos</Label>
                {services.length === 0 ? (
                  <p className="text-muted-foreground text-sm">Nenhum serviço cadastrado. Cadastre em Configurações → Serviços.</p>
                ) : (
                  <div className="border rounded-xl p-3 max-h-[180px] overflow-y-auto space-y-2">
                    {services.map((s) => (
                      <label key={s.id} className="flex items-center gap-2 cursor-pointer">
                        <Checkbox
                          checked={form.serviceIds.includes(s.id)}
                          onCheckedChange={(checked) => {
                            setForm((p) => ({
                              ...p,
                              serviceIds: checked ? [...p.serviceIds, s.id] : p.serviceIds.filter((id) => id !== s.id),
                            }));
                          }}
                        />
                        <span className="text-sm">{s.name}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </FieldWithTooltip>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0 p-6 pt-4 shrink-0 border-t">
            <Button type="button" variant="outline" onClick={closeModal} disabled={saving} className="rounded-xl">
              Cancelar
            </Button>
            <Button type="button" onClick={handleSubmit} disabled={!valid || saving} className="rounded-xl">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : isEdit ? "Salvar" : "Criar plano"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteItem} onOpenChange={(open) => !open && setDeleteItem(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir plano</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o plano &quot;{deleteItem?.name}&quot;? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving} className="rounded-xl">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={saving}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
