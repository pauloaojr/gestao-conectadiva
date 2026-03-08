import { Dispatch, SetStateAction, useEffect, useRef, useState } from "react";
import { Upload, User as UserIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { storageProvider } from "@/lib/storage/storageProvider";
import { ROLE_LABELS } from "@/types/user";

export type AttendantTab =
  | "informacoes"
  | "contato"
  | "endereco"
  | "curriculo"
  | "dados_bancarios"
  | "contrato";

export type AttendantFormData = {
  name: string;
  email: string;
  phone: string;
  /** 'admin' | 'manager' | 'user' ou id de custom_roles */
  role: string;
  position: string;
  workDays: string[];
  isActive: boolean;
  avatar: string;
  avatarStorageKey: string;
  cpf: string;
  rg: string;
  cnpj: string;
  birthDate: string;
  education: string;
  gender: "masculino" | "feminino" | "outro" | "";
  maritalStatus: "solteiro" | "casado" | "divorciado" | "viuvo" | "";
  notes: string;
  professionalDocument: string;
  professionalDocumentName: string;
  professionalDocumentStorageKey: string;
  addressLabel: string;
  addressCep: string;
  addressStreet: string;
  addressNumber: string;
  addressComplement: string;
  addressState: string;
  addressCountry: string;
  serviceArea: string;
  professionalCouncil: string;
  bankName: string;
  bankAgency: string;
  bankAccount: string;
  bankHolder: string;
  pixKey: string;
  contractStatus: "sem_contrato" | "enviado" | "assinado";
  contractDocument: string;
  contractDocumentName: string;
  contractDocumentStorageKey: string;
};

export const DEFAULT_WORK_DAYS = [
  "Segunda",
  "Terça",
  "Quarta",
  "Quinta",
  "Sexta",
  "Sábado",
  "Domingo",
];

export const createDefaultAttendantFormData = (): AttendantFormData => ({
  name: "",
  email: "",
  phone: "",
  role: "user",
  position: "",
  workDays: [...DEFAULT_WORK_DAYS],
  isActive: true,
  avatar: "",
  avatarStorageKey: "",
  cpf: "",
  rg: "",
  cnpj: "",
  birthDate: "",
  education: "",
  gender: "",
  maritalStatus: "",
  notes: "",
  professionalDocument: "",
  professionalDocumentName: "",
  professionalDocumentStorageKey: "",
  addressLabel: "",
  addressCep: "",
  addressStreet: "",
  addressNumber: "",
  addressComplement: "",
  addressState: "",
  addressCountry: "",
  serviceArea: "",
  professionalCouncil: "",
  bankName: "",
  bankAgency: "",
  bankAccount: "",
  bankHolder: "",
  pixKey: "",
  contractStatus: "sem_contrato",
  contractDocument: "",
  contractDocumentName: "",
  contractDocumentStorageKey: "",
});

type Props = {
  formData: AttendantFormData;
  setFormData: Dispatch<SetStateAction<AttendantFormData>>;
  activeTab: AttendantTab;
  setActiveTab: (tab: AttendantTab) => void;
  errors: { name?: string; email?: string };
  setErrors: Dispatch<SetStateAction<{ name?: string; email?: string }>>;
  /** Opções de função (sistema + personalizadas); se não informado, usa apenas admin/manager/user */
  roleOptions?: { value: string; label: string }[];
};

export function AttendantProfileForm(props: Props) {
  const { formData, setFormData, activeTab, setActiveTab, errors, setErrors, roleOptions } = props;
  const { toast } = useToast();
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const professionalDocInputRef = useRef<HTMLInputElement>(null);
  const contractDocInputRef = useRef<HTMLInputElement>(null);
  const [remoteDocumentTypes, setRemoteDocumentTypes] = useState<
    Record<string, "pdf" | "image" | "unknown">
  >({});

  useEffect(() => {
    const remoteUrls = [formData.professionalDocument, formData.contractDocument].filter(
      (url) => url?.startsWith("http://") || url?.startsWith("https://")
    );
    const pending = remoteUrls.filter((url) => !remoteDocumentTypes[url]);
    if (pending.length === 0) return;

    let cancelled = false;
    const detectByUrl = (urlValue: string): "pdf" | "image" | "unknown" => {
      try {
        const pathname = new URL(urlValue).pathname.toLowerCase();
        if (pathname.endsWith(".pdf")) return "pdf";
        if (
          pathname.endsWith(".png") ||
          pathname.endsWith(".jpg") ||
          pathname.endsWith(".jpeg") ||
          pathname.endsWith(".webp") ||
          pathname.endsWith(".gif")
        ) {
          return "image";
        }
      } catch {
        return "unknown";
      }
      return "unknown";
    };

    const resolveRemoteType = async (urlValue: string): Promise<"pdf" | "image" | "unknown"> => {
      const byExt = detectByUrl(urlValue);
      if (byExt !== "unknown") return byExt;
      try {
        const response = await fetch(urlValue, { method: "HEAD" });
        const contentType = response.headers.get("content-type")?.toLowerCase() || "";
        if (contentType.includes("application/pdf")) return "pdf";
        if (contentType.startsWith("image/")) return "image";
      } catch {
        // Segue fallback para unknown.
      }
      return "unknown";
    };

    const run = async () => {
      const entries = await Promise.all(
        pending.map(async (url) => [url, await resolveRemoteType(url)] as const)
      );
      if (cancelled) return;
      setRemoteDocumentTypes((prev) => {
        const next = { ...prev };
        for (const [url, type] of entries) {
          next[url] = type;
        }
        return next;
      });
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [formData.contractDocument, formData.professionalDocument, remoteDocumentTypes]);

  const toggleWorkDay = (day: string) => {
    setFormData((prev) => ({
      ...prev,
      workDays: prev.workDays.includes(day)
        ? prev.workDays.filter((d) => d !== day)
        : [...prev.workDays, day],
    }));
  };

  const handleAvatarUpload = async (file?: File) => {
    if (!file) return;
    const previousKey = formData.avatarStorageKey;
    try {
      const uploaded = await storageProvider.upload({
        file,
        path: "attendants/avatar",
        requireMinio: true,
        module: "attendants",
      });
      if (uploaded.provider !== "minio") {
        throw new Error("Upload não foi enviado para Minio.");
      }
      setFormData((prev) => ({
        ...prev,
        avatar: uploaded.url,
        avatarStorageKey: uploaded.key,
      }));

      if (previousKey && previousKey !== uploaded.key) {
        try {
          await storageProvider.remove(previousKey);
        } catch (removeError) {
          console.warn("Falha ao remover avatar anterior no Minio:", removeError);
        }
      }
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Falha ao enviar foto para o Minio.";
      toast({
        title: "Falha no upload da foto",
        description: message,
        variant: "destructive",
      });
    }
  };

  const handleProfessionalDocUpload = async (file?: File) => {
    if (!file) return;
    const previousKey = formData.professionalDocumentStorageKey;
    try {
      const uploaded = await storageProvider.upload({
        file,
        path: "attendants/professional-documents",
        requireMinio: true,
        module: "attendants",
      });
      if (uploaded.provider !== "minio") {
        throw new Error("Upload não foi enviado para Minio.");
      }
      setFormData((prev) => ({
        ...prev,
        professionalDocument: uploaded.url,
        professionalDocumentName: file.name,
        professionalDocumentStorageKey: uploaded.key,
      }));

      if (previousKey && previousKey !== uploaded.key) {
        try {
          await storageProvider.remove(previousKey);
        } catch (removeError) {
          console.warn("Falha ao remover documento profissional anterior no Minio:", removeError);
        }
      }
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Falha ao enviar documento profissional para o Minio.";
      toast({
        title: "Falha no upload do documento",
        description: message,
        variant: "destructive",
      });
    }
  };

  const handleContractDocUpload = async (file?: File) => {
    if (!file) return;
    const previousKey = formData.contractDocumentStorageKey;
    try {
      const uploaded = await storageProvider.upload({
        file,
        path: "attendants/contracts",
        requireMinio: true,
        module: "attendants",
      });
      if (uploaded.provider !== "minio") {
        throw new Error("Upload não foi enviado para Minio.");
      }
      setFormData((prev) => ({
        ...prev,
        contractDocument: uploaded.url,
        contractDocumentName: file.name,
        contractDocumentStorageKey: uploaded.key,
      }));

      if (previousKey && previousKey !== uploaded.key) {
        try {
          await storageProvider.remove(previousKey);
        } catch (removeError) {
          console.warn("Falha ao remover contrato anterior no Minio:", removeError);
        }
      }
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Falha ao enviar contrato para o Minio.";
      toast({
        title: "Falha no upload do contrato",
        description: message,
        variant: "destructive",
      });
    }
  };

  const renderDocumentPreview = (value: string) => {
    if (!value) return null;
    const isDataPdf = value.startsWith("data:application/pdf");
    const isDataImage = value.startsWith("data:image/");

    const getRemoteFileType = (urlValue: string): "pdf" | "image" | "unknown" => {
      return remoteDocumentTypes[urlValue] || "unknown";
    };

    const remoteType = value.startsWith("http://") || value.startsWith("https://")
      ? getRemoteFileType(value)
      : "unknown";
    const isPdf = isDataPdf || remoteType === "pdf";
    const isImage = isDataImage || remoteType === "image";

    if (isImage) {
      return (
        <div className="rounded-md border overflow-hidden">
          <img src={value} alt="Pré-visualização do documento" className="w-full max-h-56 object-contain bg-muted/20" />
        </div>
      );
    }

    if (isPdf) {
      return (
        <div className="rounded-md border overflow-hidden bg-white">
          <iframe src={value} title="Pré-visualização PDF" className="w-full h-56" />
        </div>
      );
    }

    if (value.startsWith("http://") || value.startsWith("https://")) {
      return (
        <div className="rounded-md border bg-muted/20 p-3">
          <p className="text-xs text-muted-foreground mb-2">
            Não foi possível identificar o formato para pré-visualização automática.
          </p>
          <a
            href={value}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-primary underline"
          >
            Abrir documento em nova aba
          </a>
        </div>
      );
    }

    return null;
  };

  return (
    <Tabs
      value={activeTab}
      onValueChange={(v) => {
        setActiveTab(v as AttendantTab);
        setErrors({});
      }}
      className="w-full"
    >
      <TabsList className="grid w-full grid-cols-2 md:grid-cols-6 h-auto">
        <TabsTrigger value="informacoes">Informações</TabsTrigger>
        <TabsTrigger value="contato">Contato</TabsTrigger>
        <TabsTrigger value="endereco">Endereço</TabsTrigger>
        <TabsTrigger value="curriculo">Currículo</TabsTrigger>
        <TabsTrigger value="dados_bancarios">Dados Bancários</TabsTrigger>
        <TabsTrigger value="contrato">Contrato</TabsTrigger>
      </TabsList>

      <TabsContent value="informacoes" className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="userName">Nome *</Label>
            <Input
              id="userName"
              value={formData.name}
              onChange={(e) => {
                setFormData((prev) => ({ ...prev, name: e.target.value }));
                setErrors((prev) => ({ ...prev, name: undefined }));
              }}
              placeholder="Nome do atendente"
              className={errors.name ? "border-destructive" : ""}
            />
            {errors.name ? <p className="text-sm text-destructive">{errors.name}</p> : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="userPosition">Cargo</Label>
            <Input
              id="userPosition"
              value={formData.position}
              onChange={(e) => setFormData((prev) => ({ ...prev, position: e.target.value }))}
              placeholder="Cargo ou função"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="cpf">CPF</Label>
            <Input id="cpf" value={formData.cpf} onChange={(e) => setFormData((prev) => ({ ...prev, cpf: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="rg">RG</Label>
            <Input id="rg" value={formData.rg} onChange={(e) => setFormData((prev) => ({ ...prev, rg: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cnpj">CNPJ</Label>
            <Input id="cnpj" value={formData.cnpj} onChange={(e) => setFormData((prev) => ({ ...prev, cnpj: e.target.value }))} />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="birthDate">Data de Nascimento</Label>
            <Input
              id="birthDate"
              type="date"
              value={formData.birthDate}
              onChange={(e) => setFormData((prev) => ({ ...prev, birthDate: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="education">Formação</Label>
            <Input id="education" value={formData.education} onChange={(e) => setFormData((prev) => ({ ...prev, education: e.target.value }))} />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Gênero</Label>
            <Select
              value={formData.gender || "nao_informado"}
              onValueChange={(value) =>
                setFormData((prev) => ({
                  ...prev,
                  gender: value === "nao_informado" ? "" : (value as AttendantFormData["gender"]),
                }))
              }
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="nao_informado">Não informado</SelectItem>
                <SelectItem value="masculino">Masculino</SelectItem>
                <SelectItem value="feminino">Feminino</SelectItem>
                <SelectItem value="outro">Outro</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Estado Civil</Label>
            <Select
              value={formData.maritalStatus || "nao_informado"}
              onValueChange={(value) =>
                setFormData((prev) => ({
                  ...prev,
                  maritalStatus:
                    value === "nao_informado" ? "" : (value as AttendantFormData["maritalStatus"]),
                }))
              }
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="nao_informado">Não informado</SelectItem>
                <SelectItem value="solteiro">Solteiro(a)</SelectItem>
                <SelectItem value="casado">Casado(a)</SelectItem>
                <SelectItem value="divorciado">Divorciado(a)</SelectItem>
                <SelectItem value="viuvo">Viúvo(a)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="notes">Observações / Anotações</Label>
          <Textarea id="notes" value={formData.notes} onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))} />
        </div>

        <div className="space-y-3">
          <Label>Documento do Profissional (PNG, JPG ou PDF)</Label>
          <input
            type="file"
            ref={professionalDocInputRef}
            onChange={(e) => void handleProfessionalDocUpload(e.target.files?.[0])}
            accept=".png,.jpg,.jpeg,application/pdf"
            className="hidden"
          />
          <Button type="button" variant="outline" onClick={() => professionalDocInputRef.current?.click()}>
            <Upload className="w-4 h-4 mr-2" />
            {formData.professionalDocument ? "Alterar documento" : "Enviar documento"}
          </Button>
          {formData.professionalDocumentName ? (
            <p className="text-xs text-muted-foreground">Arquivo: {formData.professionalDocumentName}</p>
          ) : null}
          {renderDocumentPreview(formData.professionalDocument)}
        </div>

        <div className="space-y-2">
          <Label htmlFor="userRole">Função no Sistema</Label>
          <Select
            value={formData.role}
            onValueChange={(value: string) => setFormData((prev) => ({ ...prev, role: value }))}
          >
            <SelectTrigger><SelectValue placeholder="Selecione uma função" /></SelectTrigger>
            <SelectContent>
              {(roleOptions?.length ? roleOptions : Object.entries(ROLE_LABELS).map(([value, label]) => ({ value, label }))).map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-3">
          <Label>Dias de Atendimento</Label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {DEFAULT_WORK_DAYS.map((day) => (
              <Button
                key={day}
                type="button"
                variant={formData.workDays.includes(day) ? "default" : "outline"}
                className={formData.workDays.includes(day) ? "clinic-gradient text-white" : ""}
                onClick={() => toggleWorkDay(day)}
              >
                {day}
              </Button>
            ))}
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Switch
            id="isActive"
            checked={formData.isActive}
            onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, isActive: checked }))}
          />
          <Label htmlFor="isActive" className="text-green-600">Disponível</Label>
        </div>
      </TabsContent>

      <TabsContent value="contato" className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="userPhone">Telefone</Label>
          <Input
            id="userPhone"
            value={formData.phone}
            onChange={(e) => setFormData((prev) => ({ ...prev, phone: e.target.value }))}
            placeholder="(11) 9999-9999"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="userEmail">E-mail *</Label>
          <Input
            id="userEmail"
            type="email"
            value={formData.email}
            onChange={(e) => {
              setFormData((prev) => ({ ...prev, email: e.target.value }));
              setErrors((prev) => ({ ...prev, email: undefined }));
            }}
            placeholder="email@exemplo.com"
            className={errors.email ? "border-destructive" : ""}
          />
          {errors.email ? <p className="text-sm text-destructive">{errors.email}</p> : null}
        </div>
        <div className="space-y-2">
          <Label>Foto do Atendente</Label>
          <div className="flex flex-col items-center space-y-4">
            <div className="w-24 h-24 rounded-full overflow-hidden bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-semibold text-2xl">
              {formData.avatar ? (
                <img src={formData.avatar} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                formData.name.charAt(0).toUpperCase() || <UserIcon className="w-8 h-8" />
              )}
            </div>
            <input
              type="file"
              ref={avatarInputRef}
              onChange={(e) => void handleAvatarUpload(e.target.files?.[0])}
              accept="image/*"
              className="hidden"
            />
            <Button type="button" variant="outline" onClick={() => avatarInputRef.current?.click()}>
              <Upload className="w-4 h-4 mr-2" />
              {formData.avatar ? "Alterar foto" : "Adicionar foto"}
            </Button>
          </div>
        </div>
      </TabsContent>

      <TabsContent value="endereco" className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="addressLabel">Endereço</Label>
          <Input id="addressLabel" value={formData.addressLabel} onChange={(e) => setFormData((prev) => ({ ...prev, addressLabel: e.target.value }))} placeholder="Ex.: Consultório Centro" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="addressCep">CEP</Label>
            <Input id="addressCep" value={formData.addressCep} onChange={(e) => setFormData((prev) => ({ ...prev, addressCep: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="addressStreet">Rua/Avenida</Label>
            <Input id="addressStreet" value={formData.addressStreet} onChange={(e) => setFormData((prev) => ({ ...prev, addressStreet: e.target.value }))} />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="addressNumber">Número</Label>
            <Input id="addressNumber" value={formData.addressNumber} onChange={(e) => setFormData((prev) => ({ ...prev, addressNumber: e.target.value }))} />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="addressComplement">Complemento</Label>
            <Input id="addressComplement" value={formData.addressComplement} onChange={(e) => setFormData((prev) => ({ ...prev, addressComplement: e.target.value }))} />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="addressState">Estado</Label>
            <Input id="addressState" value={formData.addressState} onChange={(e) => setFormData((prev) => ({ ...prev, addressState: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="addressCountry">País</Label>
            <Input id="addressCountry" value={formData.addressCountry} onChange={(e) => setFormData((prev) => ({ ...prev, addressCountry: e.target.value }))} />
          </div>
        </div>
      </TabsContent>

      <TabsContent value="curriculo" className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="serviceArea">Área de Atendimento</Label>
          <Input id="serviceArea" value={formData.serviceArea} onChange={(e) => setFormData((prev) => ({ ...prev, serviceArea: e.target.value }))} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="professionalCouncil">Conselho de Classe</Label>
          <Input id="professionalCouncil" value={formData.professionalCouncil} onChange={(e) => setFormData((prev) => ({ ...prev, professionalCouncil: e.target.value }))} placeholder="Ex.: CRP 00/00000" />
        </div>
      </TabsContent>

      <TabsContent value="dados_bancarios" className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="bankName">Banco</Label>
            <Input id="bankName" value={formData.bankName} onChange={(e) => setFormData((prev) => ({ ...prev, bankName: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="bankAgency">Agência</Label>
            <Input id="bankAgency" value={formData.bankAgency} onChange={(e) => setFormData((prev) => ({ ...prev, bankAgency: e.target.value }))} />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="bankAccount">Conta</Label>
            <Input id="bankAccount" value={formData.bankAccount} onChange={(e) => setFormData((prev) => ({ ...prev, bankAccount: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="bankHolder">Titularidade</Label>
            <Input id="bankHolder" value={formData.bankHolder} onChange={(e) => setFormData((prev) => ({ ...prev, bankHolder: e.target.value }))} />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="pixKey">PIX</Label>
          <Input id="pixKey" value={formData.pixKey} onChange={(e) => setFormData((prev) => ({ ...prev, pixKey: e.target.value }))} />
        </div>
      </TabsContent>

      <TabsContent value="contrato" className="space-y-4">
        <div className="space-y-2">
          <Label>Status</Label>
          <Select
            value={formData.contractStatus}
            onValueChange={(value: AttendantFormData["contractStatus"]) =>
              setFormData((prev) => ({ ...prev, contractStatus: value }))
            }
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="sem_contrato">Sem Contrato</SelectItem>
              <SelectItem value="enviado">Enviado</SelectItem>
              <SelectItem value="assinado">Assinado</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-3">
          <Label>Contrato (PDF)</Label>
          <input
            type="file"
            ref={contractDocInputRef}
            onChange={(e) => void handleContractDocUpload(e.target.files?.[0])}
            accept="application/pdf"
            className="hidden"
          />
          <Button type="button" variant="outline" onClick={() => contractDocInputRef.current?.click()}>
            <Upload className="w-4 h-4 mr-2" />
            {formData.contractDocument ? "Alterar contrato" : "Enviar contrato"}
          </Button>
          {formData.contractDocumentName ? (
            <p className="text-xs text-muted-foreground">Arquivo: {formData.contractDocumentName}</p>
          ) : null}
          {renderDocumentPreview(formData.contractDocument)}
        </div>
      </TabsContent>
    </Tabs>
  );
}
