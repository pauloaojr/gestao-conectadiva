import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { useAppointmentStatusConfig, AppointmentStatusConfigItem } from "@/hooks/useAppointmentStatusConfig";
import { useAppointmentStatusConfigContext } from "@/contexts/AppointmentStatusConfigContext";
import { CalendarCheck, Plus, Pencil, Trash2, Loader2, GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";

export function AppointmentStatusSettings() {
  const { statuses, isLoading, updateLabel, addStatus, deleteStatus, updateOrder } = useAppointmentStatusConfig();
  const { refresh: refreshContext } = useAppointmentStatusConfigContext();
  const [editItem, setEditItem] = useState<AppointmentStatusConfigItem | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [deleteItem, setDeleteItem] = useState<AppointmentStatusConfigItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);
  const [reordering, setReordering] = useState(false);

  const handleOpenEdit = (item: AppointmentStatusConfigItem) => {
    setEditItem(item);
    setEditLabel(item.label);
  };

  const handleSaveEdit = async () => {
    if (!editItem || !editLabel.trim()) return;
    setSaving(true);
    const ok = await updateLabel(editItem.id, editLabel.trim());
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
    const ok = await addStatus(newLabel.trim());
    setSaving(false);
    if (ok) {
      await refreshContext();
      setShowAddModal(false);
      setNewLabel("");
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

  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedId(id);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", id);
    e.dataTransfer.setData("application/json", JSON.stringify({ id }));
  };

  const handleDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (draggedId && draggedId !== id) setDropTargetId(id);
  };

  const handleDragLeave = () => {
    setDropTargetId(null);
  };

  const handleDrop = async (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    setDropTargetId(null);
    if (!draggedId || draggedId === targetId || reordering) return;
    const fromIdx = statuses.findIndex((s) => s.id === draggedId);
    const toIdx = statuses.findIndex((s) => s.id === targetId);
    if (fromIdx === -1 || toIdx === -1) {
      setDraggedId(null);
      return;
    }
    const newIds = statuses.map((s) => s.id);
    const [removed] = newIds.splice(fromIdx, 1);
    newIds.splice(toIdx, 0, removed);
    setReordering(true);
    const ok = await updateOrder(newIds);
    setReordering(false);
    setDraggedId(null);
    if (ok) await refreshContext();
  };

  const handleDragEnd = () => {
    setDraggedId(null);
    setDropTargetId(null);
  };

  return (
    <>
      <Card className="shadow-sm border-0">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <CalendarCheck className="w-5 h-5" />
              Status da Agenda
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
            Arraste o ícone de ordem para cima ou para baixo para alterar a exibição na agenda. Edite os nomes ou adicione novos; status padrão não podem ser excluídos.
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
                  <TableHead>Tipo</TableHead>
                  <TableHead className="w-[120px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {statuses.map((item, index) => (
                  <TableRow
                    key={item.id}
                    className={cn(
                      "transition-colors",
                      draggedId === item.id && "opacity-50",
                      dropTargetId === item.id && "bg-primary/10 ring-1 ring-primary/30"
                    )}
                    onDragOver={(e) => handleDragOver(e, item.id)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, item.id)}
                    onDragEnd={handleDragEnd}
                  >
                    <TableCell className="text-muted-foreground w-10">
                      <div
                        draggable={!reordering}
                        onDragStart={(e) => !reordering && handleDragStart(e, item.id)}
                        className={cn(
                          "touch-none p-1 rounded inline-flex",
                          reordering ? "cursor-not-allowed opacity-50" : "cursor-grab active:cursor-grabbing hover:bg-muted"
                        )}
                        title={reordering ? "Salvando ordem..." : "Arrastar para reordenar"}
                      >
                        <GripVertical className="w-4 h-4" />
                      </div>
                      <span className="ml-1">{index + 1}</span>
                    </TableCell>
                    <TableCell className="font-medium">{item.label}</TableCell>
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

      {/* Modal Editar nome */}
      <Dialog open={!!editItem} onOpenChange={(open) => !open && setEditItem(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar nome do status</DialogTitle>
            <DialogDescription>
              Altere o texto exibido na agenda. O identificador interno permanece o mesmo.
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

      {/* Modal Adicionar status */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar status</DialogTitle>
            <DialogDescription>
              Crie um novo status para usar na agenda. Ele poderá ser escolhido ao agendar ou alterar consultas.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="new-label">Nome do status</Label>
              <Input
                id="new-label"
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                placeholder="Ex: Em espera"
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

      {/* Confirmar exclusão */}
      <AlertDialog open={!!deleteItem} onOpenChange={(open) => !open && setDeleteItem(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir status?</AlertDialogTitle>
            <AlertDialogDescription>
              O status &quot;{deleteItem?.label}&quot; será removido. Agendamentos que usam este status podem precisar
              ser alterados manualmente. Deseja continuar?
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
