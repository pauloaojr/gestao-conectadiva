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
import { DollarSign, Plus, Calendar, Loader2, TrendingUp, Clock, Trash2, CheckCircle, Pencil, FileText, Users, ArrowUpDown, ArrowUp, ArrowDown, Paperclip, Upload, X, Eye } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useRevenue, RevenueItem } from "@/hooks/useRevenue";
import { useRevenueStatusConfigContext } from "@/contexts/RevenueStatusConfigContext";
import { useRevenueCategoryConfigContext } from "@/contexts/RevenueCategoryConfigContext";
import { PatientAutocomplete } from "@/components/forms/PatientAutocomplete";
import { usePatients } from "@/hooks/usePatients";
import { usePlans } from "@/hooks/usePlans";
import { cn } from "@/lib/utils";
import { storageProvider } from "@/lib/storage/storageProvider";
import DocumentViewer from "@/components/DocumentViewer";
import { useToast } from "@/hooks/use-toast";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

const Revenue = () => {
  const { statuses: revenueStatuses, getLabel: getStatusLabel } = useRevenueStatusConfigContext();
  const { categories: revenueCategories, getLabel: getCategoryLabel } = useRevenueCategoryConfigContext();
  const { toast } = useToast();
  const {
    allRevenue,
    totalReceived,
    totalPending,
    total,
    isLoading,
    addManualRevenue,
    addPlanRevenues,
    updateManualRevenue,
    updateManualRevenueStatus,
    deleteManualRevenue,
    fetchRevenueAttachments,
    addRevenueAttachments,
    deleteRevenueAttachment,
  } = useRevenue();
  const { patients: supabasePatients } = usePatients();
  const { plans } = usePlans();

  const patientsWithPlan = useMemo(
    () => supabasePatients.filter((p) => p.plan_id != null),
    [supabasePatients]
  );

  const [showTypeChoice, setShowTypeChoice] = useState(false);
  const [showPlanPatientModal, setShowPlanPatientModal] = useState(false);
  const [selectedPlanPatientId, setSelectedPlanPatientId] = useState<string | null>(null);
  const [selectedPlanCategoryId, setSelectedPlanCategoryId] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editItem, setEditItem] = useState<RevenueItem | null>(null);
  const [viewItem, setViewItem] = useState<RevenueItem | null>(null);
  const [deleteItem, setDeleteItem] = useState<RevenueItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    amount: "",
    description: "",
    revenue_date: format(new Date(), "yyyy-MM-dd"),
    status: "pending" as string,
    patientId: null as string | null,
    patientName: "",
    categoryId: null as string | null,
  });

  const [sortBy, setSortBy] = useState<"date" | "patient" | "description" | "category" | "amount" | "status" | null>("date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  type AttachmentItem = { id?: string; storage_key: string; file_url: string; file_name: string };
  const [manualAttachments, setManualAttachments] = useState<AttachmentItem[]>([]);
  const [planAttachments, setPlanAttachments] = useState<AttachmentItem[]>([]);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const [attachmentViewer, setAttachmentViewer] = useState<{
    isOpen: boolean;
    documentUrl: string;
    documentName: string;
    documentType: "document" | "photo";
  }>({ isOpen: false, documentUrl: "", documentName: "", documentType: "document" });
  const manualAttachmentInputRef = useRef<HTMLInputElement>(null);
  const planAttachmentInputRef = useRef<HTMLInputElement>(null);
  const [viewAttachments, setViewAttachments] = useState<AttachmentItem[]>([]);

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

  const sortedRevenue = useMemo(() => {
    if (!sortBy) return allRevenue;
    const dir = sortOrder === "asc" ? 1 : -1;
    return [...allRevenue].sort((a, b) => {
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
  }, [allRevenue, sortBy, sortOrder, getCategoryLabel, getStatusLabel]);

  const isEditMode = !!editItem;

  const openAddModal = () => {
    setEditItem(null);
    setManualAttachments([]);
    setForm({
      amount: "",
      description: "",
      revenue_date: format(new Date(), "yyyy-MM-dd"),
      status: "pending",
      patientId: null,
      patientName: "",
      categoryId: null,
    });
    setShowAddModal(true);
  };

  const openEditModal = (item: RevenueItem) => {
    setEditItem(item);
    setForm({
      amount: String(item.amount),
      description: item.description || "",
      revenue_date: item.date,
      status: item.status,
      patientId: item.patientId ?? null,
      patientName: item.patientName || "",
      categoryId: item.categoryId ?? null,
    });
    setShowAddModal(true);
  };

  const closeManualModal = () => {
    setShowAddModal(false);
    setEditItem(null);
    setManualAttachments([]);
    setForm({
      amount: "",
      description: "",
      revenue_date: format(new Date(), "yyyy-MM-dd"),
      status: "pending",
      patientId: null,
      patientName: "",
      categoryId: null,
    });
  };

  useEffect(() => {
    if (viewItem) {
      fetchRevenueAttachments(viewItem.id)
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
  }, [viewItem?.id, fetchRevenueAttachments]);

  useEffect(() => {
    if (showAddModal && editItem) {
      fetchRevenueAttachments(editItem.id)
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
  }, [showAddModal, editItem?.id, fetchRevenueAttachments]);

  const isImageUrl = (url: string) =>
    !url?.trim()
      ? false
      : url.startsWith("data:image/") ||
        /\.(jpg|jpeg|png|gif|webp|bmp|svg)(\?|$)/i.test(url) ||
        /\/[^/]*\.(jpg|jpeg|png|gif|webp|bmp|svg)(\?|$)/i.test(url);
  const isImageFileName = (name: string) => /\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i.test(name?.trim() ?? "");
  const attachmentIsImage = (url: string, name: string) => isImageFileName(name) || isImageUrl(url);

  const handleAddManualAttachment = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target;
    const filesArray = Array.from(input.files ?? []);
    if (!filesArray.length) return;
    input.value = "";
    setUploadingAttachment(true);
    try {
      for (const file of filesArray) {
        const result = await storageProvider.upload({
          file,
          path: "revenue/attachments",
          module: "revenue",
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

  const handleRemoveManualAttachment = async (idx: number) => {
    const item = manualAttachments[idx];
    if (item.id) {
      try {
        await deleteRevenueAttachment(item.id);
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

  const handleAddPlanAttachment = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target;
    const filesArray = Array.from(input.files ?? []);
    if (!filesArray.length) return;
    input.value = "";
    setUploadingAttachment(true);
    try {
      for (const file of filesArray) {
        const result = await storageProvider.upload({
          file,
          path: "revenue/attachments",
          module: "revenue",
        });
        setPlanAttachments((prev) => [
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

  const handleRemovePlanAttachment = async (idx: number) => {
    const item = planAttachments[idx];
    if (item.storage_key && !item.storage_key.startsWith("data:")) {
      try {
        await storageProvider.remove(item.storage_key);
      } catch (e) {
        console.warn("Falha ao remover anexo do storage:", e);
      }
    }
    setPlanAttachments((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSaveManual = async () => {
    const amount = parseFloat(form.amount.replace(/,/g, "."));
    if (isNaN(amount) || amount <= 0) return;
    setSaving(true);
    try {
      if (isEditMode && editItem) {
        await updateManualRevenue(editItem.id, {
          amount,
          description: form.description.trim(),
          revenue_date: form.revenue_date,
          status: form.status,
          patient_id: form.patientId || null,
          patient_name: form.patientName.trim() || null,
          category_id: form.categoryId || null,
        });
        const newAttachments = manualAttachments.filter((a) => !a.id).map((a) => ({
          storage_key: a.storage_key,
          file_url: a.file_url,
          file_name: a.file_name,
        }));
        if (newAttachments.length > 0) {
          await addRevenueAttachments(editItem.id, newAttachments);
        }
      } else {
        const attachments = manualAttachments.map((a) => ({
          storage_key: a.storage_key,
          file_url: a.file_url,
          file_name: a.file_name,
        }));
        await addManualRevenue({
          amount,
          description: form.description.trim(),
          revenue_date: form.revenue_date,
          status: form.status,
          patient_id: form.patientId || null,
          patient_name: form.patientName.trim() || null,
          category_id: form.categoryId || null,
          attachments,
        });
      }
      closeManualModal();
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteItem || deleteItem.source !== "manual") return;
    setSaving(true);
    try {
      await deleteManualRevenue(deleteItem.id);
      setDeleteItem(null);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Receitas</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Registre e acompanhe as receitas.
          </p>
        </div>
        <Button
          className="clinic-gradient text-white"
          onClick={() => setShowTypeChoice(true)}
        >
          <Plus className="w-4 h-4 mr-2" />
          Adicionar receita
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
                  Total recebido
                </CardTitle>
                <TrendingUp className="h-4 w-4 text-emerald-500" />
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                  {formatCurrency(totalReceived)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Receita pendente
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
                <DollarSign className="h-4 w-4 text-primary" />
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
                Todas as receitas
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Todas as receitas cadastradas manualmente.
              </p>
            </CardHeader>
            <CardContent>
              {allRevenue.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  Nenhuma receita registrada. Adicione uma receita para começar.
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
                        <TableHead className="whitespace-nowrap">Data Recebido</TableHead>
                        <TableHead className="w-[120px]">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sortedRevenue.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium whitespace-nowrap">
                            {format(new Date(item.date + "T12:00:00"), "dd/MM/yyyy", {
                              locale: ptBR,
                            })}
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
                              variant={item.status === "received" ? "default" : "secondary"}
                              className={cn(
                                item.status === "received" &&
                                  "bg-emerald-600 hover:bg-emerald-700 text-white"
                              )}
                            >
                              {getStatusLabel(item.status)}
                            </Badge>
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-muted-foreground text-sm">
                            {item.receivedAt
                              ? format(new Date(item.receivedAt.slice(0, 10) + "T12:00:00"), "dd/MM/yyyy", { locale: ptBR })
                              : "—"}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-0">
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
                              {item.status === "pending" ? (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-500/10"
                                  onClick={() =>
                                    updateManualRevenueStatus(item.id, "received")
                                  }
                                  title="Marcar como recebida"
                                >
                                  <CheckCircle className="w-3.5 h-3.5" />
                                </Button>
                              ) : (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-amber-600 hover:text-amber-700 hover:bg-amber-500/10"
                                  onClick={() =>
                                    updateManualRevenueStatus(item.id, "pending")
                                  }
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

      {/* Escolha do tipo: Única ou Plano */}
      <Dialog open={showTypeChoice} onOpenChange={(open) => !open && setShowTypeChoice(false)}>
        <DialogContent className="w-[calc(100vw-2rem)] max-w-[380px] overflow-hidden">
          <DialogHeader>
            <DialogTitle>Tipo de receita</DialogTitle>
            <DialogDescription>
              Escolha como deseja cadastrar a receita.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-4 min-w-0">
            <Button
              variant="outline"
              className="h-auto min-w-0 w-full py-4 flex flex-col items-center gap-2 text-center"
              onClick={() => {
                setShowTypeChoice(false);
                openAddModal();
              }}
            >
              <FileText className="w-6 h-6 shrink-0 text-muted-foreground" />
              <span className="font-medium">Única</span>
              <span className="text-xs text-muted-foreground font-normal max-w-full px-1 break-words">
                Receita avulsa (valor, data e descrição livre)
              </span>
            </Button>
            <Button
              variant="outline"
              className="h-auto min-w-0 w-full py-4 flex flex-col items-center gap-2 text-center overflow-hidden"
              onClick={() => {
                setShowTypeChoice(false);
                setSelectedPlanPatientId(null);
                setSelectedPlanCategoryId(null);
                setShowPlanPatientModal(true);
              }}
            >
              <Users className="w-6 h-6 shrink-0 text-muted-foreground" />
              <span className="font-medium shrink-0">Plano</span>
              <span className="text-xs text-muted-foreground font-normal w-full min-w-0 px-2 text-pretty break-words">
                Receitas conforme o plano do paciente (vigência e vencimento)
              </span>
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal Selecionar paciente com plano */}
      <Dialog
        open={showPlanPatientModal}
        onOpenChange={(open) => {
          if (!open) {
            setShowPlanPatientModal(false);
            setPlanAttachments([]);
          }
        }}
      >
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Receita por plano</DialogTitle>
            <DialogDescription>
              Selecione o paciente. Apenas pacientes com plano vinculado aparecem. As receitas serão criadas conforme a vigência e o dia de vencimento do plano.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Paciente com plano</Label>
              <Select
                value={selectedPlanPatientId ?? "none"}
                onValueChange={(v) => setSelectedPlanPatientId(v === "none" ? null : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um paciente" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Selecione...</SelectItem>
                  {patientsWithPlan.map((p) => {
                    const plan = plans.find((pl) => pl.id === p.plan_id);
                    return (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name} {plan ? `— ${plan.name}` : ""}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              {patientsWithPlan.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  Nenhum paciente com plano cadastrado. Vincule um plano ao paciente em Pacientes.
                </p>
              )}
            </div>
            <div className="grid gap-2">
              <Label>Categoria (opcional)</Label>
              <Select
                value={selectedPlanCategoryId ?? "none"}
                onValueChange={(v) => setSelectedPlanCategoryId(v === "none" ? null : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Nenhuma" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhuma</SelectItem>
                  {revenueCategories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label className="flex items-center gap-2">
                <Paperclip className="w-4 h-4" />
                Anexos (opcional)
              </Label>
              <div className="flex flex-wrap gap-2">
                <input
                  ref={planAttachmentInputRef}
                  type="file"
                  className="hidden"
                  multiple
                  accept="image/*,.pdf,.doc,.docx"
                  onChange={handleAddPlanAttachment}
                  disabled={uploadingAttachment}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1"
                  disabled={uploadingAttachment}
                  onClick={() => planAttachmentInputRef.current?.click()}
                >
                  {uploadingAttachment ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                  Adicionar
                </Button>
              </div>
              {planAttachments.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {planAttachments.map((att, idx) => (
                    <div
                      key={att.storage_key + idx}
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
                      <span className="text-[10px] truncate w-full text-center mt-0.5" title={att.file_name}>
                        {att.file_name}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute top-0 right-0 h-5 w-5 opacity-80 group-hover:opacity-100"
                        onClick={() => handleRemovePlanAttachment(idx)}
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
            <Button variant="outline" onClick={() => { setShowPlanPatientModal(false); setPlanAttachments([]); }}>
              Cancelar
            </Button>
            <Button
              disabled={!selectedPlanPatientId || saving}
              onClick={async () => {
                if (!selectedPlanPatientId) return;
                const patient = patientsWithPlan.find((p) => p.id === selectedPlanPatientId);
                const plan = patient?.plan_id ? plans.find((pl) => pl.id === patient.plan_id) : null;
                if (!patient || !plan) return;
                setSaving(true);
                try {
                  const defaultStatus = revenueStatuses[0]?.key ?? "pending";
                  const attachments = planAttachments.map((a) => ({
                    storage_key: a.storage_key,
                    file_url: a.file_url,
                    file_name: a.file_name,
                  }));
                  await addPlanRevenues({
                    patientId: patient.id,
                    patientName: patient.name,
                    planId: plan.id,
                    planName: plan.name,
                    planValue: plan.value,
                    validityMonths: plan.validity_months ?? null,
                    dueDay: plan.due_day ?? 10,
                    defaultStatus,
                    categoryId: selectedPlanCategoryId ?? null,
                    attachments,
                  });
                  setShowPlanPatientModal(false);
                  setSelectedPlanPatientId(null);
                  setSelectedPlanCategoryId(null);
                  setPlanAttachments([]);
                } finally {
                  setSaving(false);
                }
              }}
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Concluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Adicionar / Editar receita manual */}
      <Dialog open={showAddModal} onOpenChange={(open) => !open && closeManualModal()}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{isEditMode ? "Editar receita" : "Adicionar receita"}</DialogTitle>
            <DialogDescription>
              {isEditMode
                ? "Altere os dados da receita."
                : "Registre uma nova receita."}
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
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, amount: e.target.value }))
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="revenue_date">Data</Label>
              <Input
                id="revenue_date"
                type="date"
                value={form.revenue_date}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, revenue_date: e.target.value }))
                }
              />
            </div>
            <div className="grid gap-2">
              <Label>Cliente (opcional)</Label>
              <PatientAutocomplete
                value={form.patientName}
                onChange={(name, patientId) =>
                  setForm((prev) => ({
                    ...prev,
                    patientName: name,
                    patientId: patientId ?? null,
                  }))
                }
                placeholder="Buscar paciente..."
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Descrição</Label>
              <Input
                id="description"
                placeholder="Ex.: Pagamento avulso, venda de produto..."
                value={form.description}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, description: e.target.value }))
                }
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
                  {revenueCategories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Status</Label>
              <Select
                value={form.status}
                onValueChange={(v) =>
                  setForm((prev) => ({ ...prev, status: v }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o status" />
                </SelectTrigger>
                <SelectContent>
                  {revenueStatuses.map((s) => (
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
                  ref={manualAttachmentInputRef}
                  type="file"
                  className="hidden"
                  multiple
                  accept="image/*,.pdf,.doc,.docx"
                  onChange={handleAddManualAttachment}
                  disabled={uploadingAttachment}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1"
                  disabled={uploadingAttachment}
                  onClick={() => manualAttachmentInputRef.current?.click()}
                >
                  {uploadingAttachment ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
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
                      <span className="text-[10px] truncate w-full text-center mt-0.5" title={att.file_name}>
                        {att.file_name}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute top-0 right-0 h-5 w-5 opacity-80 group-hover:opacity-100"
                        onClick={() => handleRemoveManualAttachment(idx)}
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
            <Button variant="outline" onClick={closeManualModal}>
              Cancelar
            </Button>
            <Button
              onClick={handleSaveManual}
              disabled={
                saving ||
                !form.amount ||
                isNaN(parseFloat(form.amount.replace(/,/g, "."))) ||
                parseFloat(form.amount.replace(/,/g, ".")) <= 0
              }
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : null}
              {isEditMode ? "Salvar alterações" : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* AlertDialog Excluir */}
      <AlertDialog open={!!deleteItem} onOpenChange={() => !saving && setDeleteItem(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir receita?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. A receita será removida do registro.
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

      {/* Modal Visualizar receita */}
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
            <DialogTitle>Visualizar receita</DialogTitle>
            <DialogDescription>Detalhes da receita.</DialogDescription>
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
                  variant={viewItem.status === "received" ? "default" : "secondary"}
                  className={cn(
                    viewItem.status === "received" && "bg-emerald-600 hover:bg-emerald-700 text-white"
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

export default Revenue;
