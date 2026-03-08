import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Save, X, Loader2, Edit } from 'lucide-react';
import { CustomRole, UpdateCustomRoleData } from '@/types/customRole';
import { UserPermissions } from '@/types/user';
import { getDefaultGranularPermissions, normalizePermissionsForForm } from '@/types/permissions';
import { RolePermissionsEditor } from './settings/RolePermissionsEditor';

interface EditCustomRoleModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  role: CustomRole | null;
  onUpdateRole: (roleId: string, data: UpdateCustomRoleData) => Promise<boolean>;
}

const DEFAULT_PERMISSIONS: UserPermissions = {
  dashboard: true,
  reports: false,
  financial: false,
  ...getDefaultGranularPermissions(),
};

export const EditCustomRoleModal = ({
  open,
  onOpenChange,
  role,
  onUpdateRole,
}: EditCustomRoleModalProps) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [permissions, setPermissions] = useState<UserPermissions>(DEFAULT_PERMISSIONS);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (role && open) {
      setName(role.name);
      setDescription(role.description || '');
      setPermissions(normalizePermissionsForForm(role.permissions) as UserPermissions);
    }
  }, [role, open]);

  const handleSubmit = async () => {
    if (!role || !name.trim()) return;

    setIsSaving(true);
    const success = await onUpdateRole(role.id, {
      name: name.trim(),
      description: description.trim() || undefined,
      permissions,
    });

    setIsSaving(false);

    if (success) {
      onOpenChange(false);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
  };

  if (!role) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit className="w-5 h-5" />
            Editar Função
          </DialogTitle>
          <DialogDescription className="sr-only">
            Formulário para editar nome, descrição e permissões da função.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="edit-role-name">Nome da Função *</Label>
            <Input
              id="edit-role-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Recepcionista, Auxiliar..."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-role-description">Descrição</Label>
            <Textarea
              id="edit-role-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descreva as responsabilidades desta função..."
              rows={2}
            />
          </div>

          <RolePermissionsEditor
            permissions={permissions}
            onChange={setPermissions}
            idPrefix="edit"
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
            Salvar Alterações
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
