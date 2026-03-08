import { useState, useMemo, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Wallet, Plus, Calendar, Loader2, TrendingDown, Clock, Trash2, CheckCircle, Pencil, ArrowUpDown, ArrowUp, ArrowDown, Paperclip, Upload, X, Eye, FileText } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useExpenses, ExpenseItem } from "@/hooks/useExpenses";
import { useExpenseStatusConfigContext } from "@/contexts/ExpenseStatusConfigContext";
import { useExpenseCategoryConfigContext } from "@/contexts/ExpenseCategoryConfigContext";
import { PatientAutocomplete } from "@/components/forms/PatientAutocomplete";
import { cn } from "@/lib/utils";
import { storageProvider } from "@/lib/storage/storageProvider";
import DocumentViewer from "@/components/DocumentViewer";
import { useToast } from "@/hooks/use-toast";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

const Expenses = () => {
  const { statuses: expenseStatuses, getLabel: getStatusLabel } = useExpenseStatusConfigContext();
  const { categories: expenseCategories, getLabel: getCategoryLabel } = useExpenseCategoryConfigContext();
  const { toast } = useToast();
  const {
    expenses,
    totalPaid,
    totalPending,
    total,
    isLoading,
    addExpense,
    updateExpense,
    updateExpenseStatus,
    deleteExpense,
    fetchExpenseAttachments,
    addExpenseAttachments,
    deleteExpenseAttachment,
  } = useExpenses();

  const [showAddModal, setShowAddModal] = useState(false);
  const [editItem, setEditItem] = useState<ExpenseItem | null>(null);
  const [viewItem, setViewItem] = useState<ExpenseItem | null>(null);
  const [deleteItem, setDeleteItem] = useState<ExpenseItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    amount: "",
    description: "",
    expense_date: format(new Date(), "yyyy-MM-dd"),
    status: "pending" as string,
    patientId: null as string | null,
    patientName: "",
    categoryId: null as string | null,
  });

  const isEditMode = !!editItem;

  const [sortBy, setSortBy] = useState<"date" | "patient" | "description" | "category" | "amount" | "status" | null>("date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  type AttachmentItem = { id?: string; storage_key: string; file_url: string; file_name: string };
  const [manualAttachments, setManualAttachments] = useState<AttachmentItem[]>([]);
  const [viewAttachments, setViewAttachments] = useState<AttachmentItem[]>([]);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const [attachmentViewer, setAttachmentViewer] = useState<{
    isOpen: boolean;
    documentUrl: string;
    documentName: string;
    documentType: "document" | "photo";
  }>({ isOpen: false, documentUrl: "", documentName: "", documentType: "document" });
  const attachmentInputRef = useRef<HTMLInputElement>(null);

  const handleColumnSort = (column: "date" | "patient" | "description" | "category" | "amount" | "status") => {
    setSortBy((prev) => {
      if (prev === column) {
        setSortOrder((old) => (old === "asc" ? "desc" : "asc"));
        return prev;
      }
      setSortOrder(column === "date" ? "desc" : "asc");
      return column;
    });
  };

  const sortedExpenses = useMemo(() => {
    if (!sortBy) return expenses;
    const dir = sortOrder === "asc" ? 1 : -1;
    return [...expenses].sort((a, b) => {
      let aVal: string | number | Date;
      let bVal: string | number | Date;

      switch (sortBy) {
        case "date":
          aVal = new Date(a.date);
          bVal = new Date(b.date);
          break;
        case "patient":
          aVal = (a.patientName ?? "").toLowerCase();
          bVal = (b.patientName ?? "").toLowerCase();
          break;
        case "description":
          aVal = (a.description || "").toLowerCase();
          bVal = (b.description || "").toLowerCase();
          break;
        case "category":
          aVal = getCategoryLabel(a.categoryId ?? null).toLowerCase();
          bVal = getCategoryLabel(b.categoryId ?? null).toLowerCase();
          break;
        case "amount":
          aVal = a.amount;
          bVal = b.amount;
          break;
        case "status":
          aVal = getStatusLabel(a.status).toLowerCase();
          bVal = getStatusLabel(b.status).toLowerCase();
          break;
        default:
          return 0;
      }

      if (aVal < bVal) return -dir;
      if (aVal > bVal) return dir;
      return 0;
    });
  }, [expenses, sortBy, sortOrder, getCategoryLabel, getStatusLabel]);

  useEffect(() => {
    if (viewItem) {
      fetchExpenseAttachments(viewItem.id)
        .then((list) =>
          setViewAttachments(
            list.map((a) => ({
              id: a.id,
              storage_key: a.storage_key,
              file_url: a.file_url,
              file_name: a.file_name,
            }))
          )
        )
        .catch(() => setViewAttachments([]));
    }
  }, [viewItem?.id, fetchExpenseAttachments]);

  useEffect(() => {
    if (showAddModal && editItem) {
      fetchExpenseAttachments(editItem.id)
        .then((list) =>
          setManualAttachments(
            list.map((a) => ({
              id: a.id,
              storage_key: a.storage_key,
              file_url: a.file_url,
              file_name: a.file_name,
            }))
          )
        )
        .catch(() => setManualAttachments([]));
    }
  }, [showAddModal, editItem?.id, fetchExpenseAttachments]);

  const isImageUrl = (url: string) =>
    !url?.trim()
      ? false
      : url.startsWith("data:image/") ||
        /\.(jpg|jpeg|png|gif|webp|bmp|svg)(\?|$)/i.test(url) ||
        /\/[^/]*\.(jpg|jpeg|png|gif|webp|bmp|svg)(\?|$)/i.test(url);
  const isImageFileName = (name: string) =>
    /\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i.test(name?.trim() ?? "");
  const attachmentIsImage = (url: string, name: string) =>
    isImageFileName(name) || isImageUrl(url);

  const handleAddAttachment = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target;
    const filesArray = Array.from(input.files ?? []);
    if (!filesArray.length) return;
    input.value = "";
    setUploadingAttachment(true);
    try {
      for (const file of filesArray) {
        const result = await storageProvider.upload({
          file,
          path: "expenses/attachments",
          module: "expenses",
        });
        setManualAttachments((prev) => [
          ...prev,
          { storage_key: result.key, file_url: result.url, file_name: file.name },
        ]);
      }
    } catch (err) {
      toast({
        title: "Erro ao enviar anexo",
        description: err instanceof Error ? err.message : "Erro ao processar o arquivo.",
        variant: "destructive",
      });
    } finally {
      setUploadingAttachment(false);
    }
  };

  const handleRemoveAttachment = async (idx: number) => {
    const item = manualAttachments[idx];
    if (item.id) {
      try {
        await deleteExpenseAttachment(item.id);
      } catch (e) {
        toast({ title: "Erro ao remover anexo", variant: "destructive" });
        return;
      }
    } else if (item.storage_key && !item.storage_key.startsWith("data:")) {
      try {
        await storageProvider.remove(item.storage_key);
      } catch (e) {
        console.warn("Falha ao remover anexo do storage:", e);
      }
    }
    setManualAttachments((prev) => prev.filter((_, i) => i !== idx));
  };

  const openAddModal = () => {
    setEditItem(null);
    setManualAttachments([]);
    setForm({
      amount: "",
      description: "",
      expense_date: format(new Date(), "yyyy-MM-dd"),
      status: "pending",
      patientId: null,
      patientName: "",
      categoryId: null,
    });
    setShowAddModal(true);
  };

  const openEditModal = (item: ExpenseItem) => {
    setEditItem(item);
    setForm({
      amount: String(item.amount),
      description: item.description || "",
      expense_date: item.date,
      status: item.status,
      patientId: item.patientId ?? null,
      patientName: item.patientName || "",
      categoryId: item.categoryId ?? null,
    });
    setShowAddModal(true);
  };

  const closeModal = () => {
    setShowAddModal(false);
    setEditItem(null);
    setManualAttachments([]);
    setForm({
      amount: "",
      description: "",
      expense_date: format(new Date(), "yyyy-MM-dd"),
      status: "pending",
      patientId: null,
      patientName: "",
      categoryId: null,
    });
  };

  const handleSave = async () => {
    const amount = parseFloat(form.amount.replace(/,/g, "."));
    if (isNaN(amount) || amount <= 0) return;
    setSaving(true);
    try {
      if (isEditMode && editItem) {
        await updateExpense(editItem.id, {
          amount,
          description: form.description.trim(),
          expense_date: form.expense_date,
          status: form.status,
          patient_id: form.patientId || null,
          patient_name: form.patientName.trim() || null,
          category_id: form.categoryId || null,
        });
        const newAttachments = manualAttachments
          .filter((a) => !a.id)
          .map((a) => ({
            storage_key: a.storage_key,
            file_url: a.file_url,
            file_name: a.file_name,
          }));
        if (newAttachments.length > 0) {
          await addExpenseAttachments(editItem.id, newAttachments);
        }
      } else {
        const attachments = manualAttachments.map((a) => ({
          storage_key: a.storage_key,
          file_url: a.file_url,
          file_name: a.file_name,
        }));
        await addExpense({
          amount,
          description: form.description.trim(),
          expense_date: form.expense_date,
          status: form.status,
          patient_id: form.patientId || null,
          patient_name: form.patientName.trim() || null,
          category_id: form.categoryId || null,
          attachments,
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
      await deleteExpense(deleteItem.id);
      setDeleteItem(null);
    } finally {
      setSaving(false);
    }
  };

  const countsAsPaid = (statusKey: string) =>
    expenseStatuses.find((s) => s.key === statusKey)?.count_in_balance ?? false;

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Despesas</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Registre e acompanhe as despesas.
          </p>
        </div>
        <Button className="clinic-gradient text-white" onClick={openAddModal}>
          <Plus className="w-4 h-4 mr-2" />
          Adicionar despesa
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total pago
                </CardTitle>
                <TrendingDown className="h-4 w-4 text-rose-500" />
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-rose-600 dark:text-rose-400">
                  {formatCurrency(totalPaid)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Despesa pendente
                </CardTitle>
                <Clock className="h-4 w-4 text-amber-500" />
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                  {formatCurrency(totalPending)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total geral
                </CardTitle>
                <Wallet className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{formatCurrency(total)}</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Todas as despesas
              </CardTitle>
            </CardHeader>
            <CardContent>
              {expenses.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  Nenhuma despesa registrada. Adicione uma despesa para começar.
                </div>
              ) : (
                <div className="overflow-x-auto rounded-lg border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="-ml-2 h-8 font-medium"
                            onClick={() => handleColumnSort("date")}
                          >
                            Data
                            {sortBy === "date" ? (
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
                            onClick={() => handleColumnSort("patient")}
                          >
                            Cliente
                            {sortBy === "patient" ? (
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
                            onClick={() => handleColumnSort("description")}
                          >
                            Descrição
                            {sortBy === "description" ? (
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
                            onClick={() => handleColumnSort("category")}
                          >
                            Categoria
                            {sortBy === "category" ? (
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
                        <TableHead className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="-ml-2 h-8 font-medium justify-end w-full"
                            onClick={() => handleColumnSort("amount")}
                          >
                            Valor
                            {sortBy === "amount" ? (
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
                            onClick={() => handleColumnSort("status")}
                          >
                            Status
                            {sortBy === "status" ? (
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
                        <TableHead className="w-[140px]">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sortedExpenses.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium whitespace-nowrap">
                            {format(new Date(item.date + "T12:00:00"), "dd/MM/yyyy", { locale: ptBR })}
                          </TableCell>
                          <TableCell className="max-w-[180px] truncate" title={item.patientName ?? undefined}>
                            {item.patientName ?? "—"}
                          </TableCell>
                          <TableCell className="max-w-[200px] truncate" title={item.description}>
                            {item.description}
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {getCategoryLabel(item.categoryId ?? null)}
                          </TableCell>
                          <TableCell className="text-right font-semibold">
                            {formatCurrency(item.amount)}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={countsAsPaid(item.status) ? "default" : "secondary"}
                              className={cn(
                                countsAsPaid(item.status) &&
                                  "bg-rose-600 hover:bg-rose-700 text-white"
                              )}
                            >
                              {getStatusLabel(item.status)}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-0.5">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-muted-foreground hover:text-foreground"
                                onClick={() => setViewItem(item)}
                                title="Visualizar"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-muted-foreground hover:text-foreground"
                                onClick={() => openEditModal(item)}
                                title="Editar"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </Button>
                              {!countsAsPaid(item.status) ? (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-rose-600 hover:bg-rose-500/10"
                                  onClick={() => updateExpenseStatus(item.id, "paid")}
                                  title="Marcar como paga"
                                >
                                  <CheckCircle className="w-3.5 h-3.5" />
                                </Button>
                              ) : (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-amber-600 hover:bg-amber-500/10"
                                  onClick={() => updateExpenseStatus(item.id, "pending")}
                                  title="Marcar como pendente"
                                >
                                  <Clock className="w-3.5 h-3.5" />
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-destructive hover:bg-destructive/10"
                                onClick={() => setDeleteItem(item)}
                                title="Excluir"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      <Dialog open={showAddModal} onOpenChange={(open) => !open && closeModal()}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{isEditMode ? "Editar despesa" : "Adicionar despesa"}</DialogTitle>
            <DialogDescription>
              {isEditMode ? "Altere os dados da despesa." : "Registre uma nova despesa."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="amount">Valor (R$)</Label>
              <Input
                id="amount"
                type="text"
                inputMode="decimal"
                placeholder="0,00"
                value={form.amount}
                onChange={(e) => setForm((prev) => ({ ...prev, amount: e.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="expense_date">Data</Label>
              <Input
                id="expense_date"
                type="date"
                value={form.expense_date}
                onChange={(e) => setForm((prev) => ({ ...prev, expense_date: e.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <Label>Cliente (opcional)</Label>
              <PatientAutocomplete
                value={form.patientName}
                onChange={(name, patientId) =>
                  setForm((prev) => ({ ...prev, patientName: name, patientId: patientId ?? null }))
                }
                placeholder="Buscar paciente..."
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Descrição</Label>
              <Input
                id="description"
                placeholder="Ex.: Aluguel, material..."
                value={form.description}
                onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <Label>Categoria (opcional)</Label>
              <Select
                value={form.categoryId ?? "none"}
                onValueChange={(v) =>
                  setForm((prev) => ({ ...prev, categoryId: v === "none" ? null : v }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Nenhuma" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhuma</SelectItem>
                  {expenseCategories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm((prev) => ({ ...prev, status: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o status" />
                </SelectTrigger>
                <SelectContent>
                  {expenseStatuses.map((s) => (
                    <SelectItem key={s.id} value={s.key}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label className="flex items-center gap-2">
                <Paperclip className="w-4 h-4" />
                Anexos
              </Label>
              <div className="flex flex-wrap gap-2">
                <input
                  ref={attachmentInputRef}
                  type="file"
                  className="hidden"
                  multiple
                  accept="image/*,.pdf,.doc,.docx"
                  onChange={handleAddAttachment}
                  disabled={uploadingAttachment}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1"
                  disabled={uploadingAttachment}
                  onClick={() => attachmentInputRef.current?.click()}
                >
                  {uploadingAttachment ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Upload className="w-4 h-4" />
                  )}
                  Adicionar
                </Button>
              </div>
              {manualAttachments.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {manualAttachments.map((att, idx) => (
                    <div
                      key={att.id ?? att.storage_key + idx}
                      className="relative border rounded-lg p-1 flex flex-col items-center w-20 group"
                    >
                      <button
                        type="button"
                        className="w-full h-14 flex items-center justify-center overflow-hidden rounded bg-muted/50"
                        onClick={() => {
                          const isImage = attachmentIsImage(att.file_url, att.file_name);
                          setAttachmentViewer({
                            isOpen: true,
                            documentUrl: att.file_url,
                            documentName: att.file_name,
                            documentType: isImage ? "photo" : "document",
                          });
                        }}
                      >
                        {attachmentIsImage(att.file_url, att.file_name) ? (
                          <img
                            src={att.file_url}
                            alt={att.file_name}
                            className="max-w-full max-h-full object-contain"
                          />
                        ) : (
                          <FileText className="w-8 h-8 text-muted-foreground" />
                        )}
                      </button>
                      <span
                        className="text-[10px] truncate w-full text-center mt-0.5"
                        title={att.file_name}
                      >
                        {att.file_name}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute top-0 right-0 h-5 w-5 opacity-80 group-hover:opacity-100"
                        onClick={() => handleRemoveAttachment(idx)}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeModal}>
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              disabled={
                saving ||
                !form.amount ||
                isNaN(parseFloat(form.amount.replace(/,/g, "."))) ||
                parseFloat(form.amount.replace(/,/g, ".")) <= 0
              }
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              {isEditMode ? "Salvar alterações" : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteItem} onOpenChange={() => !saving && setDeleteItem(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir despesa?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. A despesa será removida do registro.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={saving}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Modal Visualizar despesa */}
      <Dialog
        open={!!viewItem}
        onOpenChange={(open) => {
          if (!open) {
            setViewItem(null);
            setViewAttachments([]);
          }
        }}
      >
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Visualizar despesa</DialogTitle>
            <DialogDescription>Detalhes da despesa.</DialogDescription>
          </DialogHeader>
          {viewItem && (
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label className="text-muted-foreground">Data</Label>
                <p className="font-medium">
                  {format(new Date(viewItem.date + "T12:00:00"), "dd/MM/yyyy", { locale: ptBR })}
                </p>
              </div>
              <div className="grid gap-2">
                <Label className="text-muted-foreground">Cliente</Label>
                <p className="font-medium">{viewItem.patientName ?? "—"}</p>
              </div>
              <div className="grid gap-2">
                <Label className="text-muted-foreground">Descrição</Label>
                <p className="font-medium">{viewItem.description}</p>
              </div>
              <div className="grid gap-2">
                <Label className="text-muted-foreground">Categoria</Label>
                <p className="font-medium">{getCategoryLabel(viewItem.categoryId ?? null)}</p>
              </div>
              <div className="grid gap-2">
                <Label className="text-muted-foreground">Valor</Label>
                <p className="font-semibold text-lg">{formatCurrency(viewItem.amount)}</p>
              </div>
              <div className="grid gap-2">
                <Label className="text-muted-foreground">Status</Label>
                <Badge
                  variant={countsAsPaid(viewItem.status) ? "default" : "secondary"}
                  className={cn(
                    countsAsPaid(viewItem.status) && "bg-rose-600 hover:bg-rose-700 text-white"
                  )}
                >
                  {getStatusLabel(viewItem.status)}
                </Badge>
              </div>
              {viewAttachments.length > 0 && (
                <div className="grid gap-2">
                  <Label className="text-muted-foreground flex items-center gap-2">
                    <Paperclip className="w-4 h-4" />
                    Anexos
                  </Label>
                  <div className="flex flex-wrap gap-2">
                    {viewAttachments.map((att, idx) => (
                      <div
                        key={att.id ?? att.storage_key + idx}
                        className="relative border rounded-lg p-1 flex flex-col items-center w-20 group"
                      >
                        <button
                          type="button"
                          className="w-full h-14 flex items-center justify-center overflow-hidden rounded bg-muted/50"
                          onClick={() => {
                            const isImage = attachmentIsImage(att.file_url, att.file_name);
                            setAttachmentViewer({
                              isOpen: true,
                              documentUrl: att.file_url,
                              documentName: att.file_name,
                              documentType: isImage ? "photo" : "document",
                            });
                          }}
                        >
                          {attachmentIsImage(att.file_url, att.file_name) ? (
                            <img
                              src={att.file_url}
                              alt={att.file_name}
                              className="max-w-full max-h-full object-contain"
                            />
                          ) : (
                            <FileText className="w-8 h-8 text-muted-foreground" />
                          )}
                        </button>
                        <span
                          className="text-[10px] truncate w-full text-center mt-0.5"
                          title={att.file_name}
                        >
                          {att.file_name}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setViewItem(null);
                setViewAttachments([]);
              }}
            >
              Fechar
            </Button>
            {viewItem && (
              <Button
                variant="default"
                onClick={() => {
                  openEditModal(viewItem);
                  setViewItem(null);
                  setViewAttachments([]);
                }}
              >
                <Pencil className="w-4 h-4 mr-2" />
                Editar
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DocumentViewer
        isOpen={attachmentViewer.isOpen}
        onClose={() => setAttachmentViewer((p) => ({ ...p, isOpen: false }))}
        documentUrl={attachmentViewer.documentUrl}
        documentName={attachmentViewer.documentName}
        documentType={attachmentViewer.documentType}
      />
    </div>
  );
};

export default Expenses;
