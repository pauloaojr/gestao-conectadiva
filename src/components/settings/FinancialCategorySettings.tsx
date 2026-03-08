import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  useFinancialCategoryConfig,
  FinancialCategoryItem,
  CategoryAppliesTo,
} from "@/hooks/useFinancialCategoryConfig";
import { useRevenueCategoryConfigContext } from "@/contexts/RevenueCategoryConfigContext";
import { useExpenseCategoryConfigContext } from "@/contexts/ExpenseCategoryConfigContext";
import { FolderTree, Plus, Pencil, Trash2, Loader2, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";

const APPLIES_TO_LABELS: Record<CategoryAppliesTo, string> = {
  revenue: "Receita",
  expense: "Despesa",
  both: "Ambos",
};

export function FinancialCategorySettings() {
  const {
    allCategories,
    isLoading,
    updateCategory,
    addCategory,
    deleteCategory,
  } = useFinancialCategoryConfig();
  const { refresh: refreshRevenue } = useRevenueCategoryConfigContext();
  const { refresh: refreshExpense } = useExpenseCategoryConfigContext();

  const [editItem, setEditItem] = useState<FinancialCategoryItem | null>(null);
  const [editName, setEditName] = useState("");
  const [editAppliesTo, setEditAppliesTo] = useState<CategoryAppliesTo>("revenue");
  const [showAddModal, setShowAddModal] = useState(false);
  const [newName, setNewName] = useState("");
  const [newAppliesTo, setNewAppliesTo] = useState<CategoryAppliesTo>("revenue");
  const [deleteItem, setDeleteItem] = useState<FinancialCategoryItem | null>(null);
  const [saving, setSaving] = useState(false);

  const [sortBy, setSortBy] = useState<"name" | "applies_to" | null>(null);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  const refreshContexts = async () => {
    await Promise.all([refreshRevenue(), refreshExpense()]);
  };

  const handleColumnSort = (column: "name" | "applies_to") => {
    setSortBy((prev) => {
      if (prev === column) {
        setSortOrder((old) => (old === "asc" ? "desc" : "asc"));
        return prev;
      }
      setSortOrder("asc");
      return column;
    });
  };

  const sortedCategories = useMemo(() => {
    if (!sortBy) return allCategories;
    const dir = sortOrder === "asc" ? 1 : -1;
    return [...allCategories].sort((a, b) => {
      let aVal: string;
      let bVal: string;

      switch (sortBy) {
        case "name":
          aVal = a.name.toLowerCase();
          bVal = b.name.toLowerCase();
          break;
        case "applies_to":
          aVal = APPLIES_TO_LABELS[a.applies_to as CategoryAppliesTo].toLowerCase();
          bVal = APPLIES_TO_LABELS[b.applies_to as CategoryAppliesTo].toLowerCase();
          break;
        default:
          return 0;
      }

      if (aVal < bVal) return -dir;
      if (aVal > bVal) return dir;
      return 0;
    });
  }, [allCategories, sortBy, sortOrder]);

  const handleOpenEdit = (item: FinancialCategoryItem) => {
    setEditItem(item);
    setEditName(item.name);
    setEditAppliesTo(item.applies_to as CategoryAppliesTo);
  };

  const handleSaveEdit = async () => {
    if (!editItem || !editName.trim()) return;
    setSaving(true);
    const ok = await updateCategory(editItem.id, {
      name: editName.trim(),
      applies_to: editAppliesTo,
    });
    setSaving(false);
    if (ok) {
      await refreshContexts();
      setEditItem(null);
      setEditName("");
    }
  };

  const handleAdd = async () => {
    if (!newName.trim()) return;
    setSaving(true);
    const ok = await addCategory(newName.trim(), newAppliesTo);
    setSaving(false);
    if (ok) {
      await refreshContexts();
      setShowAddModal(false);
      setNewName("");
      setNewAppliesTo("revenue");
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteItem) return;
    setSaving(true);
    const ok = await deleteCategory(deleteItem.id);
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
              <FolderTree className="w-5 h-5" />
              Categorias
            </CardTitle>
            <Button
              onClick={() => setShowAddModal(true)}
              className="clinic-gradient text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              Adicionar categoria
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            Categorias para classificar Receitas e Despesas. Defina em &quot;Aplica-se a&quot; se a categoria vale para Receita, Despesa ou Ambos.
          </p>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : allCategories.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              Nenhuma categoria cadastrada. Adicione uma categoria para começar.
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
                      onClick={() => handleColumnSort("name")}
                    >
                      Nome
                      {sortBy === "name" ? (
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
                  <TableHead className="w-[120px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedCategories.map((item, index) => (
                  <TableRow key={item.id}>
                    <TableCell className="text-muted-foreground">{index + 1}</TableCell>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {APPLIES_TO_LABELS[item.applies_to as CategoryAppliesTo]}
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
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => setDeleteItem(item)}
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
        </CardContent>
      </Card>

      <Dialog open={!!editItem} onOpenChange={(open) => !open && setEditItem(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar categoria</DialogTitle>
            <DialogDescription>
              Altere o nome e onde a categoria se aplica (Receita/Despesa/Ambos).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Nome</Label>
              <Input
                id="edit-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Ex: Consulta"
              />
            </div>
            <div className="space-y-2">
              <Label>Aplica-se a</Label>
              <Select
                value={editAppliesTo}
                onValueChange={(v) => setEditAppliesTo(v as CategoryAppliesTo)}
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
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setEditItem(null)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveEdit} disabled={saving || !editName.trim()}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Salvar"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar categoria</DialogTitle>
            <DialogDescription>
              Crie uma nova categoria. Escolha se vale para Receita, Despesa ou Ambos.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="new-name">Nome</Label>
              <Input
                id="new-name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Ex: Materiais"
              />
            </div>
            <div className="space-y-2">
              <Label>Aplica-se a</Label>
              <Select
                value={newAppliesTo}
                onValueChange={(v) => setNewAppliesTo(v as CategoryAppliesTo)}
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
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowAddModal(false)}>
              Cancelar
            </Button>
            <Button onClick={handleAdd} disabled={saving || !newName.trim()}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Adicionar"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteItem} onOpenChange={(open) => !open && setDeleteItem(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir categoria?</AlertDialogTitle>
            <AlertDialogDescription>
              A categoria &quot;{deleteItem?.name}&quot; será removida. Receitas ou despesas que usam esta categoria ficarão sem categoria. Deseja continuar?
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
