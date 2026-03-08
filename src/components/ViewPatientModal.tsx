import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Eye, User, MapPin, FileText, Image, History, PlusCircle, RefreshCw, MinusCircle } from "lucide-react";
import { usePlans } from "@/hooks/usePlans";
import { usePatientPlanHistory, type PatientPlanHistoryEntry } from "@/hooks/usePatientPlanHistory";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import DocumentViewer from "./DocumentViewer";
import { useState } from "react";

export interface ViewPatientData {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  cpf?: string;
  rg?: string;
  birthDate?: string;
  gender?: string;
  profession?: string;
  maritalStatus?: string;
  planId?: string | null;
  status?: string;
  address?: {
    street?: string;
    number?: string;
    complement?: string;
    neighborhood?: string;
    city?: string;
    state?: string;
    zipCode?: string;
  };
  notes?: string;
  document?: string | null;
  documentName?: string;
  photo?: string | null;
  photoName?: string;
}

interface ViewPatientModalProps {
  patient: ViewPatientData | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const formatDate = (dateString: string | null | undefined) => {
  if (!dateString) return "—";
  try {
    return format(parseISO(dateString), "dd/MM/yyyy", { locale: ptBR });
  } catch {
    return dateString;
  }
};

const formatDateTime = (dateString: string) => {
  try {
    return format(parseISO(dateString), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
  } catch {
    return dateString;
  }
};

const getHistoryLabel = (
  entry: PatientPlanHistoryEntry,
  planName: (id: string) => string
): string => {
  switch (entry.action) {
    case "added":
      return entry.plan_id
        ? `Plano ${planName(entry.plan_id)} vinculado`
        : "Plano vinculado";
    case "removed":
      return entry.previous_plan_id
        ? `Plano ${planName(entry.previous_plan_id)} retirado`
        : "Plano retirado";
    case "changed":
      return entry.previous_plan_id && entry.plan_id
        ? `Alteração de ${planName(entry.previous_plan_id)} para ${planName(entry.plan_id)}`
        : "Alteração de plano";
    default:
      return "Alteração de plano";
  }
};

const InfoItem = ({ label, value }: { label: string; value?: string | null }) => (
  <div className="space-y-0.5">
    <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
    <dd className="text-sm text-foreground">{value || "—"}</dd>
  </div>
);

const ViewPatientModal = ({ patient, open, onOpenChange }: ViewPatientModalProps) => {
  const { plans } = usePlans();
  const { history, isLoading } = usePatientPlanHistory({
    patientId: patient?.id ?? "",
  });
  const [documentViewer, setDocumentViewer] = useState({
    isOpen: false,
    documentUrl: "",
    documentName: "",
    documentType: "document" as "document" | "photo",
  });

  const planName = (id: string) => plans.find((p) => p.id === id)?.name ?? id;

  if (!patient) return null;

  const isImageUrl = (url: string) =>
    !url?.trim() ? false : url.startsWith("data:image/") || /\.(jpg|jpeg|png|gif|webp|bmp|svg)(\?|$)/i.test(url) || /\/[^/]*\.(jpg|jpeg|png|gif|webp|bmp|svg)(\?|$)/i.test(url);

  const openDocumentViewer = (url: string, name: string, type: "document" | "photo") => {
    const viewerType: "document" | "photo" = type === "photo" || isImageUrl(url) ? "photo" : "document";
    setDocumentViewer({ isOpen: true, documentUrl: url, documentName: name, documentType: viewerType });
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[640px] md:max-w-[720px] max-h-[90vh] overflow-y-auto mx-2 sm:mx-auto p-0 gap-0">
          <DialogHeader className="px-6 pt-6 pb-4">
            <DialogTitle className="text-lg md:text-xl">Visualizar Paciente</DialogTitle>
            <DialogDescription className="sr-only">
              Ficha de visualização dos dados do paciente e histórico de planos.
            </DialogDescription>
          </DialogHeader>

          <div className="px-6 pb-6 space-y-5">
            {/* Cabeçalho: foto + nome + badges */}
            <div className="flex flex-col sm:flex-row gap-4 p-4 rounded-xl bg-muted/40 border">
              <div className="flex-shrink-0">
                {patient.photo ? (
                  <div
                    className="w-20 h-20 md:w-24 md:h-24 rounded-xl overflow-hidden border-2 border-background shadow-sm cursor-pointer hover:opacity-90 transition-opacity"
                    onClick={() =>
                      openDocumentViewer(patient.photo!, patient.photoName || "Foto", "photo")
                    }
                  >
                    <img
                      src={patient.photo}
                      alt={patient.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="w-20 h-20 md:w-24 md:h-24 rounded-xl bg-primary/10 border-2 border-primary/20 flex items-center justify-center">
                    <span className="text-2xl md:text-3xl font-semibold text-primary">
                      {patient.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                        .slice(0, 2)
                        .toUpperCase()}
                    </span>
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0 flex flex-col justify-center gap-2">
                <h2 className="text-lg md:text-xl font-semibold text-foreground truncate">
                  {patient.name}
                </h2>
                <div className="flex flex-wrap gap-2">
                  {patient.status && (
                    <Badge
                      variant={patient.status === "Ativo" ? "default" : "secondary"}
                      className="text-xs"
                    >
                      {patient.status}
                    </Badge>
                  )}
                  {patient.planId ? (
                    <Badge variant="outline" className="text-xs">
                      {planName(patient.planId)}
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="text-xs text-muted-foreground">
                      Sem plano
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            {/* Dados Pessoais */}
            <Card>
              <CardHeader className="py-4 px-5">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-semibold">Dados Pessoais</span>
                </div>
              </CardHeader>
              <CardContent className="pt-0 px-5 pb-5">
                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
                  <InfoItem label="Nome completo" value={patient.name} />
                  <InfoItem label="CPF" value={patient.cpf} />
                  <InfoItem label="RG" value={patient.rg} />
                  <InfoItem label="Data de nascimento" value={formatDate(patient.birthDate)} />
                  <InfoItem label="Telefone" value={patient.phone} />
                  <InfoItem label="E-mail" value={patient.email} />
                  <InfoItem label="Profissão" value={patient.profession} />
                  <InfoItem label="Gênero" value={patient.gender} />
                  <InfoItem label="Estado civil" value={patient.maritalStatus} />
                </dl>
              </CardContent>
            </Card>

            {/* Endereço */}
            <Card>
              <CardHeader className="py-4 px-5">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-semibold">Endereço</span>
                </div>
              </CardHeader>
              <CardContent className="pt-0 px-5 pb-5">
                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
                  <InfoItem label="CEP" value={patient.address?.zipCode} />
                  <InfoItem
                    label="Logradouro"
                    value={[patient.address?.street, patient.address?.number].filter(Boolean).join(", ")}
                  />
                  <InfoItem label="Complemento" value={patient.address?.complement} />
                  <InfoItem label="Bairro" value={patient.address?.neighborhood} />
                  <InfoItem label="Cidade" value={patient.address?.city} />
                  <InfoItem label="Estado" value={patient.address?.state} />
                </dl>
              </CardContent>
            </Card>

            {/* Observações */}
            <Card>
              <CardHeader className="py-4 px-5">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-semibold">Observações / Anotações</span>
                </div>
              </CardHeader>
              <CardContent className="pt-0 px-5 pb-5">
                <p className="text-sm text-muted-foreground whitespace-pre-wrap min-h-[2rem] rounded-lg bg-muted/30 p-3">
                  {patient.notes || "Nenhuma observação registrada."}
                </p>
              </CardContent>
            </Card>

            {/* Documentos e Foto */}
            <Card>
              <CardHeader className="py-4 px-5">
                <div className="flex items-center gap-2">
                  <Image className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-semibold">Documentos e Foto</span>
                </div>
              </CardHeader>
              <CardContent className="pt-0 px-5 pb-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-2">Documento</p>
                    {patient.document ? (
                      <button
                        type="button"
                        className={`w-full h-24 rounded-lg border-2 border-dashed border-muted-foreground/30 transition-colors relative ${
                          isImageUrl(patient.document)
                            ? "overflow-hidden bg-muted/20 hover:bg-muted/40 hover:border-muted-foreground/50"
                            : "bg-muted/20 hover:bg-muted/40 hover:border-muted-foreground/50 flex flex-col items-center justify-center gap-1"
                        }`}
                        onClick={() =>
                          openDocumentViewer(
                            patient.document!,
                            patient.documentName || "Documento",
                            "document"
                          )
                        }
                      >
                        {isImageUrl(patient.document) ? (
                          <>
                            <img
                              src={patient.document}
                              alt={patient.documentName || "Documento"}
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-20 transition-opacity flex items-center justify-center">
                              <Eye className="h-6 w-6 text-white opacity-0 hover:opacity-100" />
                            </div>
                          </>
                        ) : (
                          <>
                            <Eye className="h-5 w-5 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground truncate max-w-full px-2">
                              {patient.documentName || "Visualizar"}
                            </span>
                          </>
                        )}
                      </button>
                    ) : (
                      <div className="w-full h-24 rounded-lg border border-dashed border-muted-foreground/20 bg-muted/10 flex items-center justify-center">
                        <span className="text-xs text-muted-foreground">Nenhum documento</span>
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-2">Foto</p>
                    {patient.photo ? (
                      <button
                        type="button"
                        className="w-full h-24 rounded-lg overflow-hidden border-2 border-muted-foreground/20 hover:border-muted-foreground/40 transition-colors"
                        onClick={() =>
                          openDocumentViewer(patient.photo!, patient.photoName || "Foto", "photo")
                        }
                      >
                        <img
                          src={patient.photo}
                          alt="Foto do paciente"
                          className="w-full h-full object-cover"
                        />
                      </button>
                    ) : (
                      <div className="w-full h-24 rounded-lg border border-dashed border-muted-foreground/20 bg-muted/10 flex items-center justify-center">
                        <span className="text-xs text-muted-foreground">Sem foto</span>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Histórico de Plano */}
            <Card>
              <CardHeader className="py-4 px-5">
                <div className="flex items-center gap-2">
                  <History className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-semibold">Histórico de Plano</span>
                </div>
              </CardHeader>
              <CardContent className="pt-0 px-5 pb-5">
                {isLoading ? (
                  <p className="text-sm text-muted-foreground py-4">Carregando histórico...</p>
                ) : history.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 rounded-lg bg-muted/30 px-4">
                    Nenhuma alteração de plano registrada para este paciente.
                  </p>
                ) : (
                  <div className="relative space-y-0">
                    <div className="absolute left-[11px] top-2 bottom-2 w-px bg-border" />
                    {history.map((entry) => (
                      <div
                        key={entry.id}
                        className="relative flex gap-4 pb-5 last:pb-0"
                      >
                        <div className="relative z-10 flex-shrink-0 mt-0.5 w-6 h-6 rounded-full bg-background border-2 border-primary/30 flex items-center justify-center">
                          {entry.action === "added" && (
                            <PlusCircle className="h-3.5 w-3.5 text-green-600" />
                          )}
                          {entry.action === "changed" && (
                            <RefreshCw className="h-3.5 w-3.5 text-amber-600" />
                          )}
                          {entry.action === "removed" && (
                            <MinusCircle className="h-3.5 w-3.5 text-rose-500" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0 pt-0">
                          <p className="text-sm font-medium text-foreground">
                            {getHistoryLabel(entry, planName)}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {formatDateTime(entry.created_at)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Separator className="my-2" />

            <div className="flex justify-end">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Fechar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <DocumentViewer
        isOpen={documentViewer.isOpen}
        onClose={() =>
          setDocumentViewer({
            isOpen: false,
            documentUrl: "",
            documentName: "",
            documentType: "document",
          })
        }
        documentUrl={documentViewer.documentUrl}
        documentName={documentViewer.documentName}
        documentType={documentViewer.documentType}
      />
    </>
  );
};

export default ViewPatientModal;
