import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { User, UserPermissions, ROLE_PERMISSIONS } from '@/types/user';
import { normalizePermissionLevel } from '@/types/permissions';
import { useToast } from '@/hooks/use-toast';
import { Settings, Save, X } from 'lucide-react';

interface EditUserPermissionsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: User;
  onUpdatePermissions: (userId: string, permissions: UserPermissions) => void;
}

const PERMISSION_LABELS = {
  dashboard: 'Dashboard',
  patients: 'Pacientes',
  medicalRecords: 'Prontuários Médicos',
  schedule: 'Agenda',
  reports: 'Relatórios',
  settings: 'Configurações',
  userManagement: 'Gerenciamento de Atendentes',
  scheduleManagement: 'Gerenciamento de Horários',
  serviceManagement: 'Gerenciamento de Serviços',
};

export const EditUserPermissionsModal = ({ 
  open, 
  onOpenChange, 
  user, 
  onUpdatePermissions 
}: EditUserPermissionsModalProps) => {
  const { toast } = useToast();

  const getEffectivePermissions = (currentUser: User): UserPermissions => {
    const basePermissions: UserPermissions = {
      dashboard: false,
      patients: false,
      medicalRecords: false,
      schedule: false,
      reports: 'none',
      settings: false,
      userManagement: false,
      scheduleManagement: false,
      serviceManagement: false,
    };
    const permissionsSource = currentUser.customPermissions || ROLE_PERMISSIONS[currentUser.role];
    return { ...basePermissions, ...permissionsSource };
  };

  const [permissions, setPermissions] = useState<UserPermissions>(
    getEffectivePermissions(user)
  );

  useEffect(() => {
    if (user && open) {
      setPermissions(getEffectivePermissions(user));
    }
  }, [user, open]);

  const handlePermissionChange = (permission: keyof UserPermissions, checked: boolean) => {
    if (permission === 'reports') {
      setPermissions(prev => ({ ...prev, reports: checked ? 'view' : 'none' }));
      return;
    }
    setPermissions(prev => ({ ...prev, [permission]: checked }));
  };

  const handleSave = () => {
    onUpdatePermissions(user.id, permissions);
    onOpenChange(false);
    toast({
      title: "Permissões atualizadas",
      description: `As permissões de ${user.name} foram atualizadas com sucesso.`,
    });
  };

  const handleCancel = () => {
    setPermissions(getEffectivePermissions(user));
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Editar Permissões de Acesso
          </DialogTitle>
          <DialogDescription className="sr-only">Definir quais abas do sistema o usuário poderá acessar.</DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          <div className="space-y-2">
            <p className="text-sm text-gray-600">
              Usuário: <strong>{user.name}</strong>
            </p>
            <p className="text-sm text-gray-600">
              Função atual: <strong>
                {user.role === 'admin' && 'Administrador'}
                {user.role === 'manager' && 'Gerente'}
                {user.role === 'user' && 'Usuário'}
              </strong>
            </p>
          </div>

          <div className="space-y-4">
            <Label className="text-base font-medium">Selecione as abas que o usuário poderá acessar:</Label>
            
            <div className="space-y-3">
              {Object.entries(PERMISSION_LABELS).map(([permission, label]) => {
                const isReports = permission === 'reports';
                const checked = isReports
                  ? normalizePermissionLevel(permissions.reports) !== 'none'
                  : !!(permissions[permission as keyof UserPermissions]);
                return (
                <div key={permission} className="flex items-center space-x-3">
                  <Checkbox
                    id={permission}
                    checked={checked}
                    onCheckedChange={(c) =>
                      handlePermissionChange(permission as keyof UserPermissions, c === true)
                    }
                  />
                  <Label 
                    htmlFor={permission} 
                    className="text-sm font-normal cursor-pointer flex-1"
                  >
                    {label}
                  </Label>
                </div>
              ); })}
            </div>
          </div>

          <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200">
            <p className="text-sm text-yellow-800">
              <strong>Nota:</strong> As permissões personalizadas substituirão as permissões padrão da função do usuário.
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={handleCancel}>
              <X className="w-4 h-4 mr-2" />
              Cancelar
            </Button>
            <Button onClick={handleSave} className="clinic-gradient text-white">
              <Save className="w-4 h-4 mr-2" />
              Salvar Permissões
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
