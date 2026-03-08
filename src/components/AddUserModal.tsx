import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useSupabaseUsers } from '@/hooks/useSupabaseUsers';
import { useCustomRoles } from '@/hooks/useCustomRoles';
import { useToast } from '@/hooks/use-toast';
import { ROLE_LABELS } from '@/types/user';
import { Loader2, Plus } from 'lucide-react';
import {
  AttendantProfileForm,
  AttendantTab,
  createDefaultAttendantFormData,
} from '@/components/attendants/AttendantProfileForm';

interface AddUserModalProps {
  trigger?: React.ReactNode;
  onSuccess?: () => void;
}

export const AddUserModal = ({ trigger, onSuccess }: AddUserModalProps) => {
  const { toast } = useToast();
  const { roles: customRoles } = useCustomRoles();
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const roleOptions = [
    { value: 'admin', label: ROLE_LABELS.admin },
    { value: 'manager', label: ROLE_LABELS.manager },
    { value: 'user', label: ROLE_LABELS.user },
    ...(customRoles ?? []).filter((r) => !r.is_system).map((r) => ({ value: r.id, label: r.name })),
  ];
  const [activeTab, setActiveTab] = useState<AttendantTab>('informacoes');
  const [errors, setErrors] = useState<{ name?: string; email?: string }>({});
  const [formData, setFormData] = useState(createDefaultAttendantFormData());
  const { createUser } = useSupabaseUsers();

  useEffect(() => {
    if (open) {
      setErrors({});
      setActiveTab('informacoes');
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const missing: string[] = [];
    if (!formData.name.trim()) missing.push('Nome (aba Informações)');
    if (!formData.email.trim()) missing.push('E-mail (aba Contato)');

    if (missing.length > 0) {
      setActiveTab(!formData.name.trim() ? 'informacoes' : 'contato');
      setErrors({
        ...(!formData.name.trim() && { name: 'Campo obrigatório' }),
        ...(!formData.email.trim() && { email: 'Campo obrigatório' }),
      });
      toast({
        title: 'Campos obrigatórios',
        description: `Preencha: ${missing.join(', ')}`,
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    
    try {
      await createUser({
        name: formData.name.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim() || undefined,
        position: formData.position.trim() || undefined,
        cpf: formData.cpf.trim() || undefined,
        rg: formData.rg.trim() || undefined,
        cnpj: formData.cnpj.trim() || undefined,
        birth_date: formData.birthDate || undefined,
        education: formData.education.trim() || undefined,
        gender: formData.gender || undefined,
        marital_status: formData.maritalStatus || undefined,
        notes: formData.notes.trim() || undefined,
        professional_document: formData.professionalDocument || undefined,
        professional_document_name: formData.professionalDocumentName || undefined,
        professional_document_storage_key: formData.professionalDocumentStorageKey || undefined,
        address_label: formData.addressLabel.trim() || undefined,
        address_cep: formData.addressCep.trim() || undefined,
        address_street: formData.addressStreet.trim() || undefined,
        address_number: formData.addressNumber.trim() || undefined,
        address_complement: formData.addressComplement.trim() || undefined,
        address_state: formData.addressState.trim() || undefined,
        address_country: formData.addressCountry.trim() || undefined,
        service_area: formData.serviceArea.trim() || undefined,
        professional_council: formData.professionalCouncil.trim() || undefined,
        bank_name: formData.bankName.trim() || undefined,
        bank_agency: formData.bankAgency.trim() || undefined,
        bank_account: formData.bankAccount.trim() || undefined,
        bank_holder: formData.bankHolder.trim() || undefined,
        pix_key: formData.pixKey.trim() || undefined,
        contract_status: formData.contractStatus,
        contract_document: formData.contractDocument || undefined,
        contract_document_name: formData.contractDocumentName || undefined,
        contract_document_storage_key: formData.contractDocumentStorageKey || undefined,
        work_days: formData.workDays,
        avatar_url: formData.avatar || undefined,
        avatar_storage_key: formData.avatarStorageKey || undefined,
        role: formData.role
      });
      
      // Reset form
      setFormData(createDefaultAttendantFormData());
      
      setOpen(false);
      setErrors({});
      onSuccess?.();
    } catch (error) {
      console.error('Error adding user:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button className="clinic-gradient text-white">
            <Plus className="w-4 h-4 mr-2" />
            Adicionar Atendente
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Adicionar Novo Atendente</DialogTitle>
          <DialogDescription className="sr-only">
            Formulário para cadastrar um novo atendente com informações pessoais e de contato.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <AttendantProfileForm
            formData={formData}
            setFormData={setFormData}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            errors={errors}
            setErrors={setErrors}
            roleOptions={roleOptions}
          />
            <div className="flex justify-end gap-2 mt-6 pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isSubmitting}>
                Cancelar
              </Button>
              <Button type="submit" className="clinic-gradient text-white hover:opacity-90" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  'Adicionar Atendente'
                )}
              </Button>
            </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
