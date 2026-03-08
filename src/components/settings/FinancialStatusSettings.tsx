import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
  useFinancialStatusConfig,
  FinancialStatusConfigItem,
  AppliesTo,
} from "@/hooks/useFinancialStatusConfig";
import { useRevenueStatusConfigContext } from "@/contexts/RevenueStatusConfigContext";
import { useExpenseStatusConfigContext } from "@/contexts/ExpenseStatusConfigContext";
import { Receipt, Plus, Pencil, Trash2, Loader2, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";

const APPLIES_TO_LABELS: Record<AppliesTo, string> = {
  revenue: "Receita",
  expense: "Despesa",
  both: "Ambos",
};

export function FinancialStatusSettings() {
  const {
    allStatuses,
    isLoading,
    updateStatus,
    addStatus,
    deleteStatus,
  } = useFinancialStatusConfig();
  const { refresh: refreshRevenue } = useRevenueStatusConfigContext();
  const { refresh: refreshExpense } = useExpenseStatusConfigContext();

  const [editItem, setEditItem] = useState<FinancialStatusConfigItem | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [editCountInBalance, setEditCountInBalance] = useState(false);
  const [editAppliesTo, setEditAppliesTo] = useState<AppliesTo>("revenue");
  const [showAddModal, setShowAddModal] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [newCountInBalance, setNewCountInBalance] = useState(false);
  const [newAppliesTo, setNewAppliesTo] = useState<AppliesTo>("revenue");
  const [deleteItem, setDeleteItem] = useState<FinancialStatusConfigItem | null>(null);
  const [saving, setSaving] = useState(false);

  const [sortBy, setSortBy] = useState<"label" | "applies_to" | "count_in_balance" | "type" | null>(null);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  const refreshContexts = async () => {
    await Promise.all([refreshRevenue(), refreshExpense()]);
  };

  const handleColumnSort = (column: "label" | "applies_to" | "count_in_balance" | "type") => {
    setSortBy((prev) => {
      if (prev === column) {
        setSortOrder((old) => (old === "asc" ? "desc" : "asc"));
        return prev;
      }
      setSortOrder("asc");
      return column;
    });
  };

  const sortedStatuses = useMemo(() => {
    if (!sortBy) return allStatuses;
    const dir = sortOrder === "asc" ? 1 : -1;
    return [...allStatuses].sort((a, b) => {
      let aVal: string | boolean;
      let bVal: string | boolean;

      switch (sortBy) {
        case "label":
          aVal = a.label.toLowerCase();
          bVal = b.label.toLowerCase();
          break;
        case "applies_to":
          aVal = APPLIES_TO_LABELS[a.applies_to as AppliesTo].toLowerCase();
          bVal = APPLIES_TO_LABELS[b.applies_to as AppliesTo].toLowerCase();
          break;
        case "count_in_balance":
          aVal = a.count_in_balance;
          bVal = b.count_in_balance;
          break;
        case "type":
          aVal = a.is_system ? "padrão" : "customizado";
          bVal = b.is_system ? "padrão" : "customizado";
          break;
        default:
          return 0;
      }

      if (aVal < bVal) return -dir;
      if (aVal > bVal) return dir;
      return 0;
    });
  }, [allStatuses, sortBy, sortOrder]);

  const handleOpenEdit = (item: FinancialStatusConfigItem) => {
    setEditItem(item);
    setEditLabel(item.label);
    setEditCountInBalance(item.count_in_balance);
    setEditAppliesTo(item.applies_to as AppliesTo);
  };

  const handleSaveEdit = async () => {
    if (!editItem || !editLabel.trim()) return;
    setSaving(true);
    const ok = await updateStatus(editItem.id, {
      label: editLabel.trim(),
      count_in_balance: editCountInBalance,
      applies_to: editAppliesTo,
    });
    setSaving(false);
    if (ok) {
      await refreshContexts();
      setEditItem(null);
      setEditLabel("");
    }
  };

  const handleAdd = async () => {
    if (!newLabel.trim()) return;
    setSaving(true);
    const ok = await addStatus(newLabel.trim(), newAppliesTo, newCountInBalance);
    setSaving(false);
    if (ok) {
      await refreshContexts();
      setShowAddModal(false);
      setNewLabel("");
      setNewCountInBalance(false);
      setNewAppliesTo("revenue");
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteItem) return;
    setSaving(true);
    const ok = await deleteStatus(deleteItem.id);
    setSaving(false);
    if (ok) {
      await refreshContexts();
      setDeleteItem(null);
    }
  };

  return (
    <>
      <Card className="shadow-sm border-0">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Receipt className="w-5 h-5" />
              Status Financeiro
            </CardTitle>
            <Button
              onClick={() => setShowAddModal(true)}
              className="clinic-gradient text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              Adicionar status
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            Configure os status usados em Receitas e Despesas. Defina em &quot;Aplica-se a&quot; se o status vale para Receita, Despesa ou Ambos. Status padrão não podem ser excluídos.
          </p>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ordem</TableHead>
                  <TableHead>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="-ml-2 h-8 font-medium"
                      onClick={() => handleColumnSort("label")}
                    >
                      Nome exibido
                      {sortBy === "label" ? (
                        sortOrder === "asc" ? (
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
                      onClick={() => handleColumnSort("applies_to")}
                    >
                      Aplica-se a
                      {sortBy === "applies_to" ? (
                        sortOrder === "asc" ? (
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
                      onClick={() => handleColumnSort("count_in_balance")}
                    >
                      Soma Saldo
                      {sortBy === "count_in_balance" ? (
                        sortOrder === "asc" ? (
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
                      onClick={() => handleColumnSort("type")}
                    >
                      Tipo
                      {sortBy === "type" ? (
                        sortOrder === "asc" ? (
                          <ArrowUp className="ml-1 h-4 w-4" />
                        ) : (
                          <ArrowDown className="ml-1 h-4 w-4" />
                        )
                      ) : (
                        <ArrowUpDown className="ml-1 h-4 w-4 opacity-50" />
                      )}
                    </Button>
                  </TableHead>
                  <TableHead className="w-[120px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedStatuses.map((item, index) => (
                  <TableRow key={item.id}>
                    <TableCell className="text-muted-foreground">{index + 1}</TableCell>
                    <TableCell className="font-medium">{item.label}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {APPLIES_TO_LABELS[item.applies_to as AppliesTo]}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {item.count_in_balance ? "Sim" : "Não"}
                    </TableCell>
                    <TableCell>
                      {item.is_system ? (
                        <span className="text-xs text-muted-foreground">Padrão</span>
                      ) : (
                        <span className="text-xs text-muted-foreground">Customizado</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleOpenEdit(item)}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        {!item.is_system && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => setDeleteItem(item)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!editItem} onOpenChange={(open) => !open && setEditItem(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar status</DialogTitle>
            <DialogDescription>
              Altere o nome, onde o status se aplica (Receita/Despesa/Ambos) e se entra na soma do saldo.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-label">Nome exibido</Label>
              <Input
                id="edit-label"
                value={editLabel}
                onChange={(e) => setEditLabel(e.target.value)}
                placeholder="Ex: Pendente"
              />
            </div>
            <div className="space-y-2">
              <Label>Aplica-se a</Label>
              <Select
                value={editAppliesTo}
                onValueChange={(v) => setEditAppliesTo(v as AppliesTo)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="revenue">{APPLIES_TO_LABELS.revenue}</SelectItem>
                  <SelectItem value="expense">{APPLIES_TO_LABELS.expense}</SelectItem>
                  <SelectItem value="both">{APPLIES_TO_LABELS.both}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <Label htmlFor="edit-count-balance">Soma Saldo</Label>
                <p className="text-sm text-muted-foreground">
                  Itens com este status entram no total recebido/pago
                </p>
              </div>
              <Switch
                id="edit-count-balance"
                checked={editCountInBalance}
                onCheckedChange={setEditCountInBalance}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setEditItem(null)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveEdit} disabled={saving || !editLabel.trim()}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Salvar"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar status</DialogTitle>
            <DialogDescription>
              Crie um novo status. Escolha se vale para Receita, Despesa ou Ambos e se entra na soma do saldo.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="new-label">Nome do status</Label>
              <Input
                id="new-label"
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                placeholder="Ex: Parcialmente pago"
              />
            </div>
            <div className="space-y-2">
              <Label>Aplica-se a</Label>
              <Select
                value={newAppliesTo}
                onValueChange={(v) => setNewAppliesTo(v as AppliesTo)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="revenue">{APPLIES_TO_LABELS.revenue}</SelectItem>
                  <SelectItem value="expense">{APPLIES_TO_LABELS.expense}</SelectItem>
                  <SelectItem value="both">{APPLIES_TO_LABELS.both}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <Label htmlFor="new-count-balance">Soma Saldo</Label>
                <p className="text-sm text-muted-foreground">
                  Itens com este status entram no total recebido/pago
                </p>
              </div>
              <Switch
                id="new-count-balance"
                checked={newCountInBalance}
                onCheckedChange={setNewCountInBalance}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowAddModal(false)}>
              Cancelar
            </Button>
            <Button onClick={handleAdd} disabled={saving || !newLabel.trim()}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Adicionar"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteItem} onOpenChange={(open) => !open && setDeleteItem(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir status?</AlertDialogTitle>
            <AlertDialogDescription>
              O status &quot;{deleteItem?.label}&quot; será removido. Receitas ou despesas que usam este status podem precisar
              ser alteradas. Deseja continuar?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-red-600 hover:bg-red-700"
              disabled={saving}
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
