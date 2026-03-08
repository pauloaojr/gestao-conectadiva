import { useState } from 'react';
import { Plus, Edit, Trash2, Shield, Lock, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useCustomRoles } from '@/hooks/useCustomRoles';
import { CustomRole } from '@/types/customRole';
import { countNonNonePermissions, formatPermissionsSummary } from '@/types/permissions';
import { SETTINGS_TAB_LABELS } from '@/types/permissions';
import { CreateCustomRoleModal } from './CreateCustomRoleModal';
import { EditCustomRoleModal } from './EditCustomRoleModal';
import { DeleteCustomRoleDialog } from './DeleteCustomRoleDialog';

const RESOURCE_LABELS: Record<string, string> = {
  patients: 'Pacientes',
  medicalRecords: 'Prontuários',
  schedule: 'Agenda',
  settings: 'Configurações',
  userManagement: 'Atendentes',
  scheduleManagement: 'Horários',
  serviceManagement: 'Serviços',
  integrations: 'Integrações',
  api: 'API',
  audit: 'Auditoria',
};

export const CustomRolesManager = () => {
  const { roles, isLoading, createRole, updateRole, deleteRole } = useCustomRoles();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedRole, setSelectedRole] = useState<CustomRole | null>(null);

  const handleEditRole = (role: CustomRole) => {
    setSelectedRole(role);
    setShowEditModal(true);
  };

  const handleDeleteRole = (role: CustomRole) => {
    setSelectedRole(role);
    setShowDeleteDialog(true);
  };

  const getActivePermissionsCount = (permissions: Parameters<typeof countNonNonePermissions>[0]): number => {
    return countNonNonePermissions(permissions);
  };

  const getPermissionsList = (permissions: Parameters<typeof formatPermissionsSummary>[0]): string => {
    return formatPermissionsSummary(permissions, RESOURCE_LABELS, SETTINGS_TAB_LABELS, 4);
  };

  if (isLoading) {
    return (
      <Card className="shadow-sm border-0">
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="shadow-sm border-0">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Funções Personalizadas
          </CardTitle>
          <Button onClick={() => setShowCreateModal(true)} className="clinic-gradient text-white">
            <Plus className="w-4 h-4 mr-2" />
            Nova Função
          </Button>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Crie funções personalizadas com permissões específicas para diferentes tipos de usuários.
          </p>

          {roles.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhuma função encontrada.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead className="hidden md:table-cell">Descrição</TableHead>
                    <TableHead>Permissões</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {roles.map((role) => (
                    <TableRow key={role.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{role.name}</span>
                          {role.is_system && (
                            <Badge variant="secondary" className="text-xs">
                              <Lock className="w-3 h-3 mr-1" />
                              Sistema
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-muted-foreground">
                        {role.description || '-'}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">
                            {getActivePermissionsCount(role.permissions)} permissões
                          </Badge>
                          <span className="text-xs text-muted-foreground hidden lg:inline">
                            {getPermissionsList(role.permissions)}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        {role.is_system ? (
                          <span className="text-xs text-muted-foreground">Não editável</span>
                        ) : (
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEditRole(role)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleDeleteRole(role)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <CreateCustomRoleModal
        open={showCreateModal}
        onOpenChange={setShowCreateModal}
        onCreateRole={createRole}
      />

      <EditCustomRoleModal
        open={showEditModal}
        onOpenChange={setShowEditModal}
        role={selectedRole}
        onUpdateRole={updateRole}
      />

      <DeleteCustomRoleDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        role={selectedRole}
        onDeleteRole={deleteRole}
      />
    </>
  );
};
