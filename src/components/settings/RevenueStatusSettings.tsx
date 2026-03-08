import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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
import { useRevenueStatusConfig, RevenueStatusConfigItem } from "@/hooks/useRevenueStatusConfig";
import { useRevenueStatusConfigContext } from "@/contexts/RevenueStatusConfigContext";
import { Receipt, Plus, Pencil, Trash2, Loader2 } from "lucide-react";

export function RevenueStatusSettings() {
  const { statuses, isLoading, updateStatus, addStatus, deleteStatus } = useRevenueStatusConfig();
  const { refresh: refreshContext } = useRevenueStatusConfigContext();
  const [editItem, setEditItem] = useState<RevenueStatusConfigItem | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [editCountInBalance, setEditCountInBalance] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [newCountInBalance, setNewCountInBalance] = useState(false);
  const [deleteItem, setDeleteItem] = useState<RevenueStatusConfigItem | null>(null);
  const [saving, setSaving] = useState(false);

  const handleOpenEdit = (item: RevenueStatusConfigItem) => {
    setEditItem(item);
    setEditLabel(item.label);
    setEditCountInBalance(item.count_in_balance);
  };

  const handleSaveEdit = async () => {
    if (!editItem || !editLabel.trim()) return;
    setSaving(true);
    const ok = await updateStatus(editItem.id, { label: editLabel.trim(), count_in_balance: editCountInBalance });
    setSaving(false);
    if (ok) {
      await refreshContext();
      setEditItem(null);
      setEditLabel("");
    }
  };

  const handleAdd = async () => {
    if (!newLabel.trim()) return;
    setSaving(true);
    const ok = await addStatus(newLabel.trim(), newCountInBalance);
    setSaving(false);
    if (ok) {
      await refreshContext();
      setShowAddModal(false);
      setNewLabel("");
      setNewCountInBalance(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteItem) return;
    setSaving(true);
    const ok = await deleteStatus(deleteItem.id);
    setSaving(false);
    if (ok) {
      await refreshContext();
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
              Status da Receita
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
            Edite os nomes dos status padrão (Receita Pendente, Recebida) ou adicione novos. Status padrão não podem ser excluídos. A agenda altera automaticamente o status da receita conforme o status do agendamento (com histórico).
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
                  <TableHead>Nome exibido</TableHead>
                  <TableHead>Soma Saldo</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead className="w-[120px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {statuses.map((item, index) => (
                  <TableRow key={item.id}>
                    <TableCell className="text-muted-foreground">{index + 1}</TableCell>
                    <TableCell className="font-medium">{item.label}</TableCell>
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
              Altere o nome e defina se receitas com este status entram na soma de receitas pagas (Total recebido).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-label">Nome exibido</Label>
              <Input
                id="edit-label"
                value={editLabel}
                onChange={(e) => setEditLabel(e.target.value)}
                placeholder="Ex: Receita Pendente"
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <Label htmlFor="edit-count-balance">Soma Saldo</Label>
                <p className="text-sm text-muted-foreground">
                  Receitas com este status entram no Total recebido
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
              Crie um novo status para usar nas receitas. Defina se ele entra na soma de receitas pagas (Total recebido).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="new-label">Nome do status</Label>
              <Input
                id="new-label"
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                placeholder="Ex: Parcialmente recebido"
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <Label htmlFor="new-count-balance">Soma Saldo</Label>
                <p className="text-sm text-muted-foreground">
                  Receitas com este status entram no Total recebido
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
              O status &quot;{deleteItem?.label}&quot; será removido. Receitas que usam este status podem precisar
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
