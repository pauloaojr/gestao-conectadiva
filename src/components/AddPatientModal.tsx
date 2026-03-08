import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Upload, Camera, Search, Eye, Loader2 } from "lucide-react";
import { usePlans } from "@/hooks/usePlans";
import { useToast } from "@/hooks/use-toast";
import DocumentViewer from "./DocumentViewer";
import { storageProvider } from "@/lib/storage/storageProvider";

interface AddPatientModalProps {
  onAddPatient: (patient: any) => void;
  editingPatient?: any;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Nome inicial ao abrir para cadastro novo (ex.: vindo do agendamento). */
  defaultName?: string;
}

const AddPatientModal = ({ onAddPatient, editingPatient, open, onOpenChange, defaultName }: AddPatientModalProps) => {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = open !== undefined;
  const modalOpen = isControlled ? open : internalOpen;
  const setModalOpen = isControlled ? onOpenChange : setInternalOpen;
  
  const { plans } = usePlans();
  const [formData, setFormData] = useState({
    name: editingPatient?.name || "",
    email: editingPatient?.email || "",
    phone: editingPatient?.phone || "",
    cpf: editingPatient?.cpf || "",
    rg: editingPatient?.rg || "",
    birthDate: editingPatient?.birthDate || "",
    gender: editingPatient?.gender || "Não informado",
    profession: editingPatient?.profession || "",
    maritalStatus: editingPatient?.maritalStatus || "",
    planId: editingPatient?.planId || "",
    address: {
      street: editingPatient?.address?.street || "",
      number: editingPatient?.address?.number || "",
      complement: editingPatient?.address?.complement || "",
      neighborhood: editingPatient?.address?.neighborhood || "",
      city: editingPatient?.address?.city || "",
      state: editingPatient?.address?.state || "",
      zipCode: editingPatient?.address?.zipCode || ""
    },
    notes: editingPatient?.notes || "",
    document: editingPatient?.document || null,
    documentName: editingPatient?.documentName || "",
    documentStorageKey: "",
    photo: editingPatient?.photo || null,
    photoName: editingPatient?.photoName || "",
    photoStorageKey: "",
  });

  // Preencher nome quando abrir com defaultName (ex.: vindo do agendamento)
  useEffect(() => {
    if (modalOpen && defaultName?.trim() && !editingPatient) {
      setFormData(prev => ({ ...prev, name: defaultName.trim() }));
    }
  }, [modalOpen, defaultName, editingPatient]);

  // Sincronizar formulário ao abrir em modo edição
  useEffect(() => {
    if (modalOpen && editingPatient) {
      setFormData({
        name: editingPatient.name || "",
        email: editingPatient.email || "",
        phone: editingPatient.phone || "",
        cpf: editingPatient.cpf || "",
        rg: editingPatient.rg || "",
        birthDate: editingPatient.birthDate || "",
        gender: editingPatient.gender || "Não informado",
        profession: editingPatient.profession || "",
        maritalStatus: editingPatient.maritalStatus || "",
        planId: editingPatient.planId || "",
        address: {
          street: editingPatient.address?.street || "",
          number: editingPatient.address?.number || "",
          complement: editingPatient.address?.complement || "",
          neighborhood: editingPatient.address?.neighborhood || "",
          city: editingPatient.address?.city || "",
          state: editingPatient.address?.state || "",
          zipCode: editingPatient.address?.zipCode || ""
        },
        notes: editingPatient.notes || "",
        document: editingPatient.document || null,
        documentName: editingPatient.documentName || "",
        documentStorageKey: editingPatient.documentStorageKey ?? "",
        photo: editingPatient.photo || null,
        photoName: editingPatient.photoName || "",
        photoStorageKey: editingPatient.photoStorageKey ?? "",
      });
    }
  }, [modalOpen, editingPatient]);
  
  const [isLoadingCep, setIsLoadingCep] = useState(false);
  const [uploadingDocument, setUploadingDocument] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [documentViewer, setDocumentViewer] = useState({
    isOpen: false,
    documentUrl: "",
    documentName: "",
    documentType: 'document' as 'document' | 'photo'
  });
  const { toast } = useToast();

  const fetchAddressByCep = async (cep: string) => {
    // Remove any non-numeric characters from CEP
    const cleanCep = cep.replace(/\D/g, '');
    
    // Check if CEP has 8 digits
    if (cleanCep.length !== 8) {
      return;
    }

    setIsLoadingCep(true);
    
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
      const data = await response.json();
      
      if (data.erro) {
        toast({
          title: "CEP não encontrado",
          description: "Por favor, verifique o CEP digitado.",
          variant: "destructive",
        });
        return;
      }

      // Update address fields with ViaCEP data
      setFormData(prev => ({
        ...prev,
        address: {
          ...prev.address,
          street: data.logradouro || prev.address.street,
          neighborhood: data.bairro || prev.address.neighborhood,
          city: data.localidade || prev.address.city,
          state: data.uf || prev.address.state,
          zipCode: cep
        }
      }));

      toast({
        title: "Endereço encontrado",
        description: "Dados do endereço preenchidos automaticamente.",
      });
      
    } catch (error) {
      console.error('Erro ao buscar CEP:', error);
      toast({
        title: "Erro",
        description: "Erro ao buscar dados do CEP. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingCep(false);
    }
  };

  const handleCepChange = (value: string) => {
    // Format CEP as user types (00000-000)
    const formatted = value
      .replace(/\D/g, '')
      .replace(/(\d{5})(\d)/, '$1-$2')
      .slice(0, 9);
    
    handleAddressChange("zipCode", formatted);
    
    // Trigger address search when CEP is complete
    if (formatted.replace(/\D/g, '').length === 8) {
      fetchAddressByCep(formatted);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.phone) {
      toast({
        title: "Erro",
        description: "Por favor, preencha o nome e telefone do paciente.",
        variant: "destructive",
      });
      return;
    }

    const patientData = {
      id: editingPatient?.id || Date.now(),
      name: formData.name,
      email: formData.email,
      phone: formData.phone,
      cpf: formData.cpf,
      rg: formData.rg,
      birthDate: formData.birthDate,
      gender: formData.gender,
      profession: formData.profession,
      maritalStatus: formData.maritalStatus,
      planId: formData.planId || null,
      address: formData.address,
      notes: formData.notes,
      lastConsultation: editingPatient?.lastConsultation || "Nunca",
      sessions: editingPatient?.sessions || 0,
      status: editingPatient?.status || "Ativo",
      avatar: formData.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2),
      document: formData.document,
      documentName: formData.documentName,
      documentStorageKey: formData.documentStorageKey,
      photo: formData.photo,
      photoName: formData.photoName,
      photoStorageKey: formData.photoStorageKey,
    };

    onAddPatient(patientData);
    
    toast({
      title: "Sucesso",
      description: editingPatient ? "Paciente atualizado com sucesso!" : "Paciente adicionado com sucesso!",
    });

    if (!editingPatient) {
      setFormData({ 
        name: "", 
        email: "", 
        phone: "", 
        cpf: "",
        rg: "",
        birthDate: "",
        gender: "Não informado",
        profession: "",
        maritalStatus: "",
        planId: "",
        address: {
          street: "",
          number: "",
          complement: "",
          neighborhood: "",
          city: "",
          state: "",
          zipCode: ""
        },
        notes: "",
        document: null,
        documentName: "",
        documentStorageKey: "",
        photo: null,
        photoName: "",
        photoStorageKey: "",
      });
    }
    
    setModalOpen?.(false);
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleAddressChange = (field: string, value: string) => {
    setFormData(prev => ({ 
      ...prev, 
      address: { ...prev.address, [field]: value }
    }));
  };

  const handleDocumentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const previousKey = formData.documentStorageKey;
    setUploadingDocument(true);
    e.target.value = "";
    try {
      const result = await storageProvider.upload({
        file,
        path: "patients/documents",
        module: "patients",
      });
      setFormData(prev => ({
        ...prev,
        document: result.url,
        documentName: file.name,
        documentStorageKey: result.key,
      }));
      if (previousKey && previousKey !== result.key && !previousKey.startsWith("data:")) {
        try {
          await storageProvider.remove(previousKey);
        } catch (removeError) {
          console.warn("Falha ao remover documento anterior do storage:", removeError);
        }
      }
    } catch (error) {
      toast({
        title: "Erro ao enviar documento",
        description: error instanceof Error ? error.message : "Erro ao processar o documento.",
        variant: "destructive",
      });
    } finally {
      setUploadingDocument(false);
    }
  };

  const handlePhotoCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const previousKey = formData.photoStorageKey;
    setUploadingPhoto(true);
    e.target.value = "";
    try {
      const result = await storageProvider.upload({
        file,
        path: "patients/photo",
        module: "patients",
      });
      setFormData(prev => ({
        ...prev,
        photo: result.url,
        photoName: file.name,
        photoStorageKey: result.key,
      }));
      if (previousKey && previousKey !== result.key && !previousKey.startsWith("data:")) {
        try {
          await storageProvider.remove(previousKey);
        } catch (removeError) {
          console.warn("Falha ao remover foto anterior do storage:", removeError);
        }
      }
    } catch (error) {
      toast({
        title: "Erro ao enviar foto",
        description: error instanceof Error ? error.message : "Erro ao processar a foto.",
        variant: "destructive",
      });
    } finally {
      setUploadingPhoto(false);
    }
  };

  const isImageFileName = (fileName: string) => /\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i.test(fileName?.trim() ?? "");
  const isImageUrl = (url: string) =>
    !url?.trim() ? false : url.startsWith("data:image/") || /\.(jpg|jpeg|png|gif|webp|bmp|svg)(\?|$)/i.test(url) || /\/[^/]*\.(jpg|jpeg|png|gif|webp|bmp|svg)(\?|$)/i.test(url);

  const documentIsImage = (url: string, name: string) => isImageFileName(name) || isImageUrl(url);

  const openDocumentViewer = (url: string, name: string, type: 'document' | 'photo') => {
    const viewerType: 'document' | 'photo' =
      type === 'photo' ? 'photo' : documentIsImage(url, name) ? 'photo' : 'document';
    setDocumentViewer({
      isOpen: true,
      documentUrl: url,
      documentName: name,
      documentType: viewerType
    });
  };

  const closeDocumentViewer = () => {
    setDocumentViewer({
      isOpen: false,
      documentUrl: "",
      documentName: "",
      documentType: 'document'
    });
  };

  return (
    <>
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        {!editingPatient && (
          <DialogTrigger asChild>
            <Button className="clinic-gradient text-white hover:opacity-90 text-xs md:text-sm">
              <Plus className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" />
              <span className="hidden sm:inline">Novo Paciente</span>
              <span className="sm:hidden">Novo</span>
            </Button>
          </DialogTrigger>
        )}
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto mx-2 sm:mx-auto">
          <DialogHeader>
            <DialogTitle className="text-base md:text-lg">{editingPatient ? "Editar Paciente" : "Adicionar Novo Paciente"}</DialogTitle>
            <DialogDescription className="sr-only">
              {editingPatient ? "Formulário para editar os dados do paciente." : "Formulário para cadastrar um novo paciente com dados pessoais e endereço."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 md:space-y-6">
            {/* Dados Pessoais */}
            <div className="space-y-3 md:space-y-4">
              <h3 className="text-xs md:text-sm font-medium text-foreground border-b pb-2">Dados Pessoais</h3>
              
              <div className="space-y-2">
                <Label htmlFor="name" className="text-xs md:text-sm">Nome Completo *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleChange("name", e.target.value)}
                  placeholder="Digite o nome completo"
                  className="text-sm"
                />
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                <div className="space-y-2">
                  <Label htmlFor="cpf" className="text-xs md:text-sm">CPF</Label>
                  <Input
                    id="cpf"
                    value={formData.cpf}
                    onChange={(e) => {
                      const value = e.target.value
                        .replace(/\D/g, '')
                        .replace(/(\d{3})(\d)/, '$1.$2')
                        .replace(/(\d{3})(\d)/, '$1.$2')
                        .replace(/(\d{3})(\d{1,2})/, '$1-$2')
                        .slice(0, 14);
                      handleChange("cpf", value);
                    }}
                    placeholder="000.000.000-00"
                    className="text-sm"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="rg" className="text-xs md:text-sm">RG</Label>
                  <Input
                    id="rg"
                    value={formData.rg}
                    onChange={(e) => handleChange("rg", e.target.value)}
                    placeholder="Digite o RG"
                    className="text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                <div className="space-y-2">
                  <Label htmlFor="birthDate" className="text-xs md:text-sm">Data de Nascimento</Label>
                  <Input
                    id="birthDate"
                    type="date"
                    value={formData.birthDate}
                    onChange={(e) => handleChange("birthDate", e.target.value)}
                    className="text-sm"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-xs md:text-sm">Telefone *</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => handleChange("phone", e.target.value)}
                    placeholder="(11) 99999-9999"
                    className="text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-xs md:text-sm">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleChange("email", e.target.value)}
                    placeholder="exemplo@email.com"
                    className="text-sm"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="profession" className="text-xs md:text-sm">Profissão</Label>
                  <Input
                    id="profession"
                    value={formData.profession}
                    onChange={(e) => handleChange("profession", e.target.value)}
                    placeholder="Digite a profissão"
                    className="text-sm"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="plan" className="text-xs md:text-sm">Plano</Label>
                <Select
                  value={formData.planId || "none"}
                  onValueChange={(v) => setFormData((p) => ({ ...p, planId: v === "none" ? "" : v }))}
                >
                  <SelectTrigger id="plan" className="text-sm">
                    <SelectValue placeholder="Nenhum plano" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhum plano</SelectItem>
                    {plans.map((plan) => (
                      <SelectItem key={plan.id} value={plan.id}>
                        {plan.name} — {plan.sessions} sessões · R$ {Number(plan.value).toFixed(2).replace(".", ",")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">Opcional. Defina o plano vinculado ao paciente.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                <div className="space-y-3">
                  <Label className="text-xs md:text-sm">Gênero</Label>
                  <RadioGroup 
                    value={formData.gender} 
                    onValueChange={(value) => handleChange("gender", value)}
                    className="flex flex-wrap gap-4"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="Masculino" id="masculino" />
                      <Label htmlFor="masculino" className="cursor-pointer text-xs md:text-sm">Masculino</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="Feminino" id="feminino" />
                      <Label htmlFor="feminino" className="cursor-pointer text-xs md:text-sm">Feminino</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="Outro" id="outro" />
                      <Label htmlFor="outro" className="cursor-pointer text-xs md:text-sm">Outro</Label>
                    </div>
                  </RadioGroup>
                </div>

                <div className="space-y-3">
                  <Label className="text-xs md:text-sm">Estado Civil</Label>
                  <RadioGroup 
                    value={formData.maritalStatus} 
                    onValueChange={(value) => handleChange("maritalStatus", value)}
                    className="flex flex-wrap gap-4"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="Solteiro(a)" id="solteiro" />
                      <Label htmlFor="solteiro" className="cursor-pointer text-xs md:text-sm">Solteiro(a)</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="Casado(a)" id="casado" />
                      <Label htmlFor="casado" className="cursor-pointer text-xs md:text-sm">Casado(a)</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="Divorciado(a)" id="divorciado" />
                      <Label htmlFor="divorciado" className="cursor-pointer text-xs md:text-sm">Divorciado(a)</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="Viúvo(a)" id="viuvo" />
                      <Label htmlFor="viuvo" className="cursor-pointer text-xs md:text-sm">Viúvo(a)</Label>
                    </div>
                  </RadioGroup>
                </div>
              </div>
            </div>

            {/* Endereço */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-gray-900 border-b pb-2">Endereço</h3>
              
              <div className="space-y-2">
                <Label htmlFor="zipCode">CEP</Label>
                <div className="relative">
                  <Input
                    id="zipCode"
                    value={formData.address.zipCode}
                    onChange={(e) => handleCepChange(e.target.value)}
                    placeholder="00000-000"
                    maxLength={9}
                  />
                  {isLoadingCep && (
                    <div className="absolute right-3 top-3">
                      <Search className="w-4 h-4 animate-spin text-gray-400" />
                    </div>
                  )}
                </div>
                <p className="text-xs text-gray-500">Digite o CEP para buscar o endereço automaticamente</p>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="street" className="text-xs md:text-sm">Rua/Avenida</Label>
                  <Input
                    id="street"
                    value={formData.address.street}
                    onChange={(e) => handleAddressChange("street", e.target.value)}
                    placeholder="Nome da rua"
                    className="text-sm"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="number" className="text-xs md:text-sm">Número</Label>
                  <Input
                    id="number"
                    value={formData.address.number}
                    onChange={(e) => handleAddressChange("number", e.target.value)}
                    placeholder="Nº"
                    className="text-sm"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-3 md:gap-4">
                <div className="space-y-2">
                  <Label htmlFor="complement" className="text-xs md:text-sm">Complemento</Label>
                  <Input
                    id="complement"
                    value={formData.address.complement}
                    onChange={(e) => handleAddressChange("complement", e.target.value)}
                    placeholder="Apto, bloco, etc."
                    className="text-sm"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="neighborhood" className="text-xs md:text-sm">Bairro</Label>
                  <Input
                    id="neighborhood"
                    value={formData.address.neighborhood}
                    onChange={(e) => handleAddressChange("neighborhood", e.target.value)}
                    placeholder="Nome do bairro"
                    className="text-sm"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-3 md:gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city" className="text-xs md:text-sm">Cidade</Label>
                  <Input
                    id="city"
                    value={formData.address.city}
                    onChange={(e) => handleAddressChange("city", e.target.value)}
                    placeholder="Nome da cidade"
                    className="text-sm"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="state" className="text-xs md:text-sm">Estado</Label>
                  <Input
                    id="state"
                    value={formData.address.state}
                    onChange={(e) => handleAddressChange("state", e.target.value)}
                    placeholder="SP"
                    className="text-sm"
                  />
                </div>
              </div>

              {/* Observações */}
              <div className="space-y-2 pt-4 border-t">
                <Label htmlFor="notes" className="text-xs md:text-sm">Observações / Anotações</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => handleChange("notes", e.target.value)}
                  placeholder="Espaço reservado para anotações clínicas e observações relevantes sobre o paciente."
                  rows={4}
                  className="text-sm"
                />
              </div>
            </div>

            {/* Documentos e Foto */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-gray-900 border-b pb-2">Documentos e Foto</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="document">Documento do Cliente</Label>
                  <div className="flex flex-col gap-2">
                    <input
                      id="document"
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png,.gif,.webp,.bmp,.doc,.docx,image/*"
                      onChange={handleDocumentUpload}
                      className="hidden"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => document.getElementById('document')?.click()}
                      className="w-full"
                      disabled={uploadingDocument}
                    >
                      {uploadingDocument ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                      {uploadingDocument ? "Enviando..." : (formData.documentName ? formData.documentName : "Carregar Documento")}
                    </Button>
                    
                    {formData.document && (
                      <div className="space-y-2">
                        <div className="relative group">
                          <div
                            className={`w-full h-20 rounded-lg overflow-hidden cursor-pointer border-2 border-dashed border-gray-300 bg-gray-100 hover:bg-gray-50 transition-colors ${
                              documentIsImage(formData.document!, formData.documentName) ? "" : "flex items-center justify-center"
                            }`}
                            onClick={() => openDocumentViewer(formData.document!, formData.documentName, 'document')}
                          >
                            {documentIsImage(formData.document!, formData.documentName) ? (
                              <>
                                <img
                                  src={formData.document}
                                  alt={formData.documentName}
                                  className="w-full h-full object-cover"
                                />
                                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-200 flex items-center justify-center">
                                  <Eye className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                                </div>
                              </>
                            ) : (
                              <>
                                <div className="text-center">
                                  <Upload className="w-6 h-6 text-gray-400 mx-auto mb-1" />
                                  <p className="text-xs text-gray-600 truncate px-2">{formData.documentName}</p>
                                </div>
                                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-all duration-200 rounded-lg flex items-center justify-center">
                                  <Eye className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                        <p className="text-xs text-green-600 text-center">Clique na miniatura para visualizar</p>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="photo">Foto do Cliente</Label>
                  <div className="flex flex-col gap-2">
                    <input
                      id="photo"
                      type="file"
                      accept="image/*"
                      capture="user"
                      onChange={handlePhotoCapture}
                      className="hidden"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => document.getElementById('photo')?.click()}
                      className="w-full"
                      disabled={uploadingPhoto}
                    >
                      {uploadingPhoto ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Camera className="w-4 h-4 mr-2" />}
                      {uploadingPhoto ? "Enviando..." : (formData.photoName ? formData.photoName : "Tirar Foto")}
                    </Button>
                    
                    {formData.photo && (
                      <div className="space-y-2">
                        <div className="relative group">
                          <div className="w-full h-20 bg-gray-100 border rounded-lg overflow-hidden cursor-pointer"
                               onClick={() => openDocumentViewer(formData.photo!, formData.photoName, 'photo')}>
                            <img 
                              src={formData.photo} 
                              alt="Preview" 
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-200 flex items-center justify-center">
                              <Eye className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                          </div>
                        </div>
                        <p className="text-xs text-green-600 text-center">Clique na miniatura para visualizar</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setModalOpen?.(false)} className="flex-1">
                Cancelar
              </Button>
              <Button type="submit" className="clinic-gradient text-white flex-1">
                {editingPatient ? "Atualizar" : "Adicionar"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <DocumentViewer 
        isOpen={documentViewer.isOpen}
        onClose={closeDocumentViewer}
        documentUrl={documentViewer.documentUrl}
        documentName={documentViewer.documentName}
        documentType={documentViewer.documentType}
      />
    </>
  );
};

export default AddPatientModal;
