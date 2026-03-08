import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Save, X, Loader2, Shield } from 'lucide-react';
import { CreateCustomRoleData } from '@/types/customRole';
import { UserPermissions } from '@/types/user';
import { getDefaultGranularPermissions } from '@/types/permissions';
import { RolePermissionsEditor } from './settings/RolePermissionsEditor';

interface CreateCustomRoleModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateRole: (data: CreateCustomRoleData) => Promise<boolean>;
}

const DEFAULT_PERMISSIONS: UserPermissions = {
  dashboard: true,
  reports: false,
  financial: false,
  ...getDefaultGranularPermissions(),
};

export const CreateCustomRoleModal = ({
  open,
  onOpenChange,
  onCreateRole,
}: CreateCustomRoleModalProps) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [permissions, setPermissions] = useState<UserPermissions>(DEFAULT_PERMISSIONS);
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async () => {
    if (!name.trim()) return;

    setIsSaving(true);
    const success = await onCreateRole({
      name: name.trim(),
      description: description.trim() || undefined,
      permissions,
    });

    setIsSaving(false);

    if (success) {
      setName('');
      setDescription('');
      setPermissions(DEFAULT_PERMISSIONS);
      onOpenChange(false);
    }
  };

  const handleClose = () => {
    setName('');
    setDescription('');
    setPermissions(DEFAULT_PERMISSIONS);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Criar Nova Função
          </DialogTitle>
          <DialogDescription className="sr-only">
            Formulário para criar uma nova função personalizada com nome, descrição e permissões de acesso.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="role-name">Nome da Função *</Label>
            <Input
              id="role-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Recepcionista, Auxiliar..."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="role-description">Descrição</Label>
            <Textarea
              id="role-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descreva as responsabilidades desta função..."
              rows={2}
            />
          </div>

          <RolePermissionsEditor
            permissions={permissions}
            onChange={setPermissions}
            idPrefix="create"
          />
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={handleClose} disabled={isSaving}>
            <X className="w-4 h-4 mr-2" />
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!name.trim() || isSaving}
            className="clinic-gradient text-white"
          >
            {isSaving ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            Criar Função
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
