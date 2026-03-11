import { useState } from "react";
import {
  Percent,
  DollarSign,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  User,
  UserCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useCommissionRules,
  type CommissionRule,
  type CommissionRuleInsert,
  type CommissionTargetType,
  type CommissionValueType,
} from "@/hooks/useCommissionRules";
import { useSupabaseServices } from "@/hooks/useSupabaseServices";
import { usePatients } from "@/hooks/usePatients";
import { useProfiles } from "@/hooks/useProfiles";

const TARGET_LABELS: Record<CommissionTargetType, string> = {
  patient: "Por Paciente",
  professional: "Por Profissional",
};

const VALUE_TYPE_LABELS: Record<CommissionValueType, string> = {
  percent: "Percentual (%)",
  fixed: "Valor fixo (R$)",
};

function formatValue(value: number, valueType: CommissionValueType): string {
  if (valueType === "percent") return String(Number(value).toFixed(1)) + "%";
  return "R$ " + Number(value).toFixed(2).replace(".", ",");
}

export function RepasseSettings() {
  const { rules, isLoading, saveRule, updateRule, deleteRule, toggleEnabled } =
    useCommissionRules();
  const { services } = useSupabaseServices();
  const { patients } = usePatients();
  const { profiles } = useProfiles();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<CommissionRule | null>(null);
  const [deleteRuleItem, setDeleteRuleItem] = useState<CommissionRule | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<CommissionRuleInsert>({
    name: "",
    enabled: true,
    target_type: "professional",
    value_type: "percent",
    value: 0,
    service_id: null,
    recipient_patient_ids: [],
    recipient_attendant_ids: [],
  });

  const resetForm = () => {
    setForm({
      name: "",
      enabled: true,
      target_type: "professional",
      value_type: "percent",
      value: 0,
      service_id: null,
      recipient_patient_ids: [],
      recipient_attendant_ids: [],
    });
    setEditingRule(null);
  };

  const openAdd = () => {
    resetForm();
    setModalOpen(true);
  };

  const openEdit = (rule: CommissionRule) => {
    setEditingRule(rule);
    setForm({
      name: rule.name,
      enabled: rule.enabled,
      target_type: rule.target_type,
      value_type: rule.value_type,
      value: rule.value,
      service_id: rule.service_id ?? null,
      recipient_patient_ids: rule.recipient_patient_ids ?? [],
      recipient_attendant_ids: rule.recipient_attendant_ids ?? [],
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) return;
    if (form.value < 0) return;
    if (form.value_type === "percent" && form.value > 100) return;

    setSaving(true);
    if (editingRule) {
      const ok = await updateRule(editingRule.id, form);
      setSaving(false);
      if (ok) {
        setModalOpen(false);
        resetForm();
      }
    } else {
      const id = await saveRule(form);
      setSaving(false);
      if (id) {
        setModalOpen(false);
        resetForm();
      }
    }
  };

  const handleDelete = async () => {
    if (!deleteRuleItem) return;
    setSaving(true);
    const ok = await deleteRule(deleteRuleItem.id);
    setSaving(false);
    if (ok) {
      setDeleteRuleItem(null);
    }
  };

  const getServiceName = (serviceId: string | null) => {
    if (!serviceId) return "Todos os servicos";
    const s = services.find((x) => x.id === serviceId);
    return s?.name ?? "-";
  };

  const getRecipientDisplay = (rule: CommissionRule) => {
    const ids = rule.target_type === "patient" ? (rule.recipient_patient_ids ?? []) : (rule.recipient_attendant_ids ?? []);
    const list = rule.target_type === "patient" ? patients : profiles;
    if (ids.length === 0) return "Todos";
    const names = ids.map((id) => list.find((x) => x.id === id)?.name ?? "-").filter((n) => n !== "-");
    return names.length > 0 ? names.join(", ") : "-";
  };

  return (
    <Card className="shadow-sm border-0">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5" />
            Regras de Comissão (Repasse)
          </CardTitle>
          <Button onClick={openAdd} className="clinic-gradient text-white">
            <Plus className="w-4 h-4 mr-2" />
            Nova regra
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">
          Configure regras de comissão por paciente ou por profissional.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : rules.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground border rounded-lg border-dashed">
            <DollarSign className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p className="font-medium">Nenhuma regra de comissão</p>
            <p className="text-sm mt-1">Adicione uma regra para configurar repasses.</p>
            <Button onClick={openAdd} variant="outline" className="mt-4">
              <Plus className="w-4 h-4 mr-2" />
              Nova regra
            </Button>
          </div>
        ) : (
          <Table>
            <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Base</TableHead>
                  <TableHead>Destinatario</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Servico</TableHead>
                  <TableHead>Ativo</TableHead>
                  <TableHead className="w-[100px]">Acoes</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
              {rules.map((rule) => (
                <TableRow key={rule.id}>
                  <TableCell className="font-medium">{rule.name}</TableCell>
                  <TableCell>
                    <span className="inline-flex items-center gap-1.5">
                      {rule.target_type === "patient" ? (
                        <UserCircle className="w-4 h-4 text-muted-foreground" />
                      ) : (
                        <User className="w-4 h-4 text-muted-foreground" />
                      )}
                      {TARGET_LABELS[rule.target_type]}
                    </span>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {getRecipientDisplay(rule)}
                  </TableCell>
                  <TableCell>
                    {rule.value_type === "percent" ? (
                      <Percent className="w-4 h-4 inline mr-1 text-muted-foreground" />
                    ) : (
                      <DollarSign className="w-4 h-4 inline mr-1 text-muted-foreground" />
                    )}
                    {VALUE_TYPE_LABELS[rule.value_type]}
                  </TableCell>
                  <TableCell>{formatValue(rule.value, rule.value_type)}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {getServiceName(rule.service_id)}
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={rule.enabled}
                      onCheckedChange={(checked) => toggleEnabled(rule.id, checked)}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => openEdit(rule)}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => setDeleteRuleItem(rule)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        <Dialog
          open={modalOpen}
          onOpenChange={(open) => {
            if (!open) {
              setModalOpen(false);
              resetForm();
            }
          }}
        >
          <DialogContent className="max-h-[90vh] flex flex-col p-0 gap-0">
            <DialogHeader className="shrink-0 px-6 pt-6 pb-2">
              <DialogTitle>
                {editingRule ? "Editar regra" : "Nova regra de comissao"}
              </DialogTitle>
              <DialogDescription>
                Defina a base (paciente ou profissional), o tipo de valor e o valor.
              </DialogDescription>
            </DialogHeader>
            <div className="overflow-y-auto min-h-0 flex-1 px-6 py-4 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="rule-name">Nome da regra</Label>
                <Input
                  id="rule-name"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Ex: Comissao padrao profissional"
                />
              </div>
              <div className="space-y-2">
                <Label>Base da comissao</Label>
                <Select
                  value={form.target_type}
                  onValueChange={(v: CommissionTargetType) =>
                    setForm((f) => ({
                      ...f,
                      target_type: v,
                      recipient_patient_ids: [],
                      recipient_attendant_ids: [],
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="patient">
                      <span className="flex items-center gap-2">
                        <UserCircle className="w-4 h-4" />
                        {TARGET_LABELS.patient}
                      </span>
                    </SelectItem>
                    <SelectItem value="professional">
                      <span className="flex items-center gap-2">
                        <User className="w-4 h-4" />
                        {TARGET_LABELS.professional}
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>
                  {form.target_type === "patient" ? "Pacientes" : "Profissionais"}
                </Label>
                <p className="text-xs text-muted-foreground">
                  Deixe nenhum marcado para Todos. Marque os desejados.
                </p>
                <div className="max-h-48 overflow-y-auto rounded-md border p-3 space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <Checkbox
                      checked={
                        form.target_type === "patient"
                          ? form.recipient_patient_ids?.length === 0
                          : form.recipient_attendant_ids?.length === 0
                      }
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setForm((f) =>
                            f.target_type === "patient"
                              ? { ...f, recipient_patient_ids: [], recipient_attendant_ids: [] }
                              : { ...f, recipient_attendant_ids: [], recipient_patient_ids: [] }
                          );
                        }
                      }}
                    />
                    <span className="text-sm font-medium">Todos</span>
                  </label>
                  {form.target_type === "patient"
                    ? patients.map((p) => (
                        <label key={p.id} className="flex items-center gap-2 cursor-pointer">
                          <Checkbox
                            checked={form.recipient_patient_ids?.includes(p.id) ?? false}
                            onCheckedChange={(checked) => {
                              setForm((f) => {
                                const ids = f.recipient_patient_ids ?? [];
                                const next = checked ? [...ids, p.id] : ids.filter((id) => id !== p.id);
                                return { ...f, recipient_patient_ids: next };
                              });
                            }}
                          />
                          <span className="text-sm">{p.name}</span>
                        </label>
                      ))
                    : profiles.map((p) => (
                        <label key={p.id} className="flex items-center gap-2 cursor-pointer">
                          <Checkbox
                            checked={form.recipient_attendant_ids?.includes(p.id) ?? false}
                            onCheckedChange={(checked) => {
                              setForm((f) => {
                                const ids = f.recipient_attendant_ids ?? [];
                                const next = checked ? [...ids, p.id] : ids.filter((id) => id !== p.id);
                                return { ...f, recipient_attendant_ids: next };
                              });
                            }}
                          />
                          <span className="text-sm">{p.name}</span>
                        </label>
                      ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tipo de valor</Label>
                  <Select
                    value={form.value_type}
                    onValueChange={(v: CommissionValueType) =>
                      setForm((f) => ({ ...f, value_type: v }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percent">{VALUE_TYPE_LABELS.percent}</SelectItem>
                      <SelectItem value="fixed">{VALUE_TYPE_LABELS.fixed}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Valor</Label>
                  <Input
                    type="number"
                    min={0}
                    max={form.value_type === "percent" ? 100 : undefined}
                    step={form.value_type === "percent" ? 0.1 : 0.01}
                    value={form.value || ""}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        value: parseFloat(e.target.value) || 0,
                      }))
                    }
                    placeholder={form.value_type === "percent" ? "Ex: 10" : "Ex: 50,00"}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Servico (opcional)</Label>
                <Select
                  value={form.service_id ?? "all"}
                  onValueChange={(v) =>
                    setForm((f) => ({ ...f, service_id: v === "all" ? null : v }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os servicos</SelectItem>
                    {services.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {!editingRule && (
                <div className="flex items-center gap-2">
                  <Switch
                    checked={form.enabled}
                    onCheckedChange={(v) => setForm((f) => ({ ...f, enabled: v }))}
                  />
                  <Label>Ativo</Label>
                </div>
              )}
            </div>
            <DialogFooter className="shrink-0 px-6 py-4 border-t">
              <Button variant="outline" onClick={() => setModalOpen(false)}>
                Cancelar
              </Button>
              <Button
                onClick={handleSave}
                disabled={
                  saving ||
                  !form.name.trim() ||
                  form.value < 0 ||
                  (form.value_type === "percent" && form.value > 100)
                }
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Salvar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <AlertDialog
          open={!!deleteRuleItem}
          onOpenChange={(open) => !open && setDeleteRuleItem(null)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir regra?</AlertDialogTitle>
              <AlertDialogDescription>
                A regra "{deleteRuleItem?.name}" sera removida. Deseja continuar?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={saving}>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                className="bg-red-600 hover:bg-red-700"
                disabled={saving}
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Excluir"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}
