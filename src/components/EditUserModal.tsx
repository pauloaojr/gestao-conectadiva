import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { User, ROLE_LABELS } from '@/types/user';
import { useSupabaseUsers } from '@/hooks/useSupabaseUsers';
import { useCustomRoles } from '@/hooks/useCustomRoles';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  AttendantProfileForm,
  AttendantTab,
  createDefaultAttendantFormData,
} from '@/components/attendants/AttendantProfileForm';

interface EditUserModalProps {
  user: User;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdateUser: (userId: string, updates: any) => Promise<any>;
  onUpdateUserRole: (userId: string, newRole: string) => Promise<void>;
}

export const EditUserModal = ({ user, open, onOpenChange, onUpdateUser, onUpdateUserRole }: EditUserModalProps) => {
  const { isEmailTakenByOtherUser } = useSupabaseUsers();
  const { roles: customRoles } = useCustomRoles();
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
  const { toast } = useToast();

  useEffect(() => {
    if (user && open) {
      setFormData({
        name: user.name,
        email: user.email,
        phone: user.phone || '',
        role: typeof user.role === 'string' ? user.role : 'user',
        position: user.position || '',
        cpf: user.cpf || '',
        rg: user.rg || '',
        cnpj: user.cnpj || '',
        birthDate: user.birthDate || '',
        education: user.education || '',
        gender: user.gender || '',
        maritalStatus: user.maritalStatus || '',
        notes: user.notes || '',
        professionalDocument: user.professionalDocument || '',
        professionalDocumentName: user.professionalDocumentName || '',
        professionalDocumentStorageKey: user.professionalDocumentStorageKey || '',
        addressLabel: user.addressLabel || '',
        addressCep: user.addressCep || '',
        addressStreet: user.addressStreet || '',
        addressNumber: user.addressNumber || '',
        addressComplement: user.addressComplement || '',
        addressState: user.addressState || '',
        addressCountry: user.addressCountry || '',
        serviceArea: user.serviceArea || '',
        professionalCouncil: user.professionalCouncil || '',
        bankName: user.bankName || '',
        bankAgency: user.bankAgency || '',
        bankAccount: user.bankAccount || '',
        bankHolder: user.bankHolder || '',
        pixKey: user.pixKey || '',
        contractStatus: user.contractStatus || 'sem_contrato',
        contractDocument: user.contractDocument || '',
        contractDocumentName: user.contractDocumentName || '',
        contractDocumentStorageKey: user.contractDocumentStorageKey || '',
        workDays: user.workDays || [],
        isActive: user.isActive,
        avatar: user.avatar || '',
        avatarStorageKey: user.avatarStorageKey || ''
      });
      setErrors({});
      setActiveTab('informacoes');
    }
  }, [user, open]);

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

    if (isEmailTakenByOtherUser(formData.email.trim(), user.id)) {
      setActiveTab('contato');
      setErrors((prev) => ({ ...prev, email: 'Este e-mail já está cadastrado para outro atendente.' }));
      toast({
        title: 'E-mail em uso',
        description: 'Este e-mail já está cadastrado para outro atendente. Use outro e-mail.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Update profile data
      await onUpdateUser(user.id, {
        name: formData.name.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim() || null,
        position: formData.position.trim() || null,
        cpf: formData.cpf.trim() || null,
        rg: formData.rg.trim() || null,
        cnpj: formData.cnpj.trim() || null,
        birth_date: formData.birthDate || null,
        education: formData.education.trim() || null,
        gender: formData.gender || null,
        marital_status: formData.maritalStatus || null,
        notes: formData.notes.trim() || null,
        professional_document: formData.professionalDocument || null,
        professional_document_name: formData.professionalDocumentName || null,
        professional_document_storage_key: formData.professionalDocumentStorageKey || null,
        address_label: formData.addressLabel.trim() || null,
        address_cep: formData.addressCep.trim() || null,
        address_street: formData.addressStreet.trim() || null,
        address_number: formData.addressNumber.trim() || null,
        address_complement: formData.addressComplement.trim() || null,
        address_state: formData.addressState.trim() || null,
        address_country: formData.addressCountry.trim() || null,
        service_area: formData.serviceArea.trim() || null,
        professional_council: formData.professionalCouncil.trim() || null,
        bank_name: formData.bankName.trim() || null,
        bank_agency: formData.bankAgency.trim() || null,
        bank_account: formData.bankAccount.trim() || null,
        bank_holder: formData.bankHolder.trim() || null,
        pix_key: formData.pixKey.trim() || null,
        contract_status: formData.contractStatus,
        contract_document: formData.contractDocument || null,
        contract_document_name: formData.contractDocumentName || null,
        contract_document_storage_key: formData.contractDocumentStorageKey || null,
        work_days: formData.workDays,
        is_active: formData.isActive,
        avatar_url: formData.avatar || null,
        avatar_storage_key: formData.avatarStorageKey || null
      });

      // Update role if changed
      if (formData.role !== user.role) {
        await onUpdateUserRole(user.id, formData.role);
      }
      
      setErrors({});
      onOpenChange(false);
    } catch (error) {
      console.error('Error updating user:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Atendente</DialogTitle>
          <DialogDescription className="sr-only">
            Formulário para editar os dados do atendente.
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
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
                Cancelar
              </Button>
              <Button type="submit" className="clinic-gradient text-white hover:opacity-90" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  'Salvar Alterações'
                )}
              </Button>
            </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
