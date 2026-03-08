import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { AddUserModal } from '@/components/AddUserModal';
import { EditUserModal } from '@/components/EditUserModal';
import { EditUserPermissionsModal } from '@/components/EditUserPermissionsModal';
import UserStatusToggleModal from '@/components/UserStatusToggleModal';
import { useSupabaseUsers, SupabaseUser } from '@/hooks/useSupabaseUsers';
import { useCustomRoles } from '@/hooks/useCustomRoles';
import { Search, Users, UserPlus, Settings, Trash2, Phone, Mail, Edit, Loader2, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { User, ROLE_LABELS } from '@/types/user';

// Transform Supabase user to local User type
const transformUser = (supabaseUser: SupabaseUser): User => ({
  id: supabaseUser.id,
  name: supabaseUser.name,
  email: supabaseUser.email,
  phone: supabaseUser.phone || '',
  position: supabaseUser.position || '',
  cpf: supabaseUser.cpf || '',
  rg: supabaseUser.rg || '',
  cnpj: supabaseUser.cnpj || '',
  birthDate: supabaseUser.birth_date || '',
  education: supabaseUser.education || '',
  gender: supabaseUser.gender || '',
  maritalStatus: supabaseUser.marital_status || '',
  notes: supabaseUser.notes || '',
  professionalDocument: supabaseUser.professional_document || '',
  professionalDocumentName: supabaseUser.professional_document_name || '',
  professionalDocumentStorageKey: supabaseUser.professional_document_storage_key || '',
  addressLabel: supabaseUser.address_label || '',
  addressCep: supabaseUser.address_cep || '',
  addressStreet: supabaseUser.address_street || '',
  addressNumber: supabaseUser.address_number || '',
  addressComplement: supabaseUser.address_complement || '',
  addressState: supabaseUser.address_state || '',
  addressCountry: supabaseUser.address_country || '',
  serviceArea: supabaseUser.service_area || '',
  professionalCouncil: supabaseUser.professional_council || '',
  bankName: supabaseUser.bank_name || '',
  bankAgency: supabaseUser.bank_agency || '',
  bankAccount: supabaseUser.bank_account || '',
  bankHolder: supabaseUser.bank_holder || '',
  pixKey: supabaseUser.pix_key || '',
  contractStatus: supabaseUser.contract_status || 'sem_contrato',
  contractDocument: supabaseUser.contract_document || '',
  contractDocumentName: supabaseUser.contract_document_name || '',
  contractDocumentStorageKey: supabaseUser.contract_document_storage_key || '',
  role: supabaseUser.role || 'user',
  createdAt: supabaseUser.created_at,
  lastLogin: supabaseUser.updated_at,
  isActive: supabaseUser.is_active,
  workDays: supabaseUser.work_days || [],
  avatar: supabaseUser.avatar_url || undefined,
  avatarStorageKey: supabaseUser.avatar_storage_key || undefined,
});

const UserManagement = () => {
  const { users: supabaseUsers, isLoading, updateUser, toggleUserStatus, deleteUser, updateUserRole, fetchUsers } = useSupabaseUsers();
  const { roles: customRoles } = useCustomRoles();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPermissionsModal, setShowPermissionsModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const users = supabaseUsers.map(transformUser);

  const [sortBy, setSortBy] = useState<'name' | 'email' | 'status' | null>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const filteredUsers = useMemo(() => {
    return users.filter(user =>
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [users, searchTerm]);

  const sortedUsers = useMemo(() => {
    if (!sortBy) return filteredUsers;
    const dir = sortOrder === 'asc' ? 1 : -1;
    return [...filteredUsers].sort((a, b) => {
      let aVal: string | boolean;
      let bVal: string | boolean;

      switch (sortBy) {
        case 'name':
          aVal = a.name.toLowerCase();
          bVal = b.name.toLowerCase();
          break;
        case 'email':
          aVal = a.email.toLowerCase();
          bVal = b.email.toLowerCase();
          break;
        case 'status':
          aVal = a.isActive;
          bVal = b.isActive;
          break;
        default:
          return 0;
      }

      if (aVal < bVal) return -dir;
      if (aVal > bVal) return dir;
      return 0;
    });
  }, [filteredUsers, sortBy, sortOrder]);

  const handleColumnSort = (column: 'name' | 'email' | 'status') => {
    setSortBy((prev) => {
      if (prev === column) {
        setSortOrder((old) => (old === 'asc' ? 'desc' : 'asc'));
        return prev;
      }
      setSortOrder('asc');
      return column;
    });
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'manager':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'user':
        return 'bg-green-100 text-green-800 border-green-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getRoleLabel = (role: string) => {
    if (role === 'admin') return ROLE_LABELS.admin;
    if (role === 'manager') return ROLE_LABELS.manager;
    if (role === 'user') return ROLE_LABELS.user;
    const custom = (customRoles ?? []).find((r) => r.id === role);
    return custom?.name ?? role;
  };

  const handleEditClick = (user: User) => {
    setSelectedUser(user);
    setShowEditModal(true);
  };

  const handlePermissionsClick = (user: User) => {
    setSelectedUser(user);
    setShowPermissionsModal(true);
  };

  const handleStatusToggle = (user: User) => {
    setSelectedUser(user);
    setShowStatusModal(true);
  };

  const confirmStatusToggle = async () => {
    if (selectedUser) {
      await toggleUserStatus(selectedUser.id);
      setShowStatusModal(false);
      setSelectedUser(null);
    }
  };

  const handleConfirmDeleteUser = async () => {
    if (!userToDelete) return;
    setIsDeleting(true);
    try {
      await deleteUser(userToDelete.id);
      setUserToDelete(null);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleUpdatePermissions = (userId: string, permissions: any) => {
    console.log('Update permissions:', userId, permissions);
    setShowPermissionsModal(false);
    setSelectedUser(null);
  };

  const weekDays = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6 p-2 md:p-0">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-foreground">Atendentes</h1>
          <p className="text-sm text-muted-foreground">Gerencie os atendentes e suas informações no sistema</p>
        </div>
        <div className="shrink-0">
          <AddUserModal onSuccess={fetchUsers} />
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <Card>
          <CardContent className="p-3 md:p-4">
            <div className="flex items-center">
              <Users className="w-6 h-6 md:w-8 md:h-8 text-blue-600 shrink-0" />
              <div className="ml-3 md:ml-4 min-w-0">
                <p className="text-xs md:text-sm font-medium text-muted-foreground truncate">Total de Atendentes</p>
                <p className="text-lg md:text-2xl font-bold text-foreground">{users.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3 md:p-4">
            <div className="flex items-center">
              <UserPlus className="w-6 h-6 md:w-8 md:h-8 text-green-600 shrink-0" />
              <div className="ml-3 md:ml-4 min-w-0">
                <p className="text-xs md:text-sm font-medium text-muted-foreground truncate">Atendentes Ativos</p>
                <p className="text-lg md:text-2xl font-bold text-foreground">
                  {users.filter(user => user.isActive).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3 md:p-4">
            <div className="flex items-center">
              <Settings className="w-6 h-6 md:w-8 md:h-8 text-purple-600 shrink-0" />
              <div className="ml-3 md:ml-4 min-w-0">
                <p className="text-xs md:text-sm font-medium text-muted-foreground truncate">Administradores</p>
                <p className="text-lg md:text-2xl font-bold text-foreground">
                  {users.filter(user => user.role === 'admin').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3 md:p-4">
            <div className="flex items-center">
              <Users className="w-6 h-6 md:w-8 md:h-8 text-orange-600 shrink-0" />
              <div className="ml-3 md:ml-4 min-w-0">
                <p className="text-xs md:text-sm font-medium text-muted-foreground truncate">Gerentes</p>
                <p className="text-lg md:text-2xl font-bold text-foreground">
                  {users.filter(user => user.role === 'manager').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="p-3 md:p-4">
          <div className="flex items-center space-x-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Pesquisar por nome ou email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 text-sm"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Users Table - Desktop */}
      <Card className="hidden md:block">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Atendentes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="-ml-2 h-8 font-medium"
                      onClick={() => handleColumnSort('name')}
                    >
                      Atendente
                      {sortBy === 'name' ? (
                        sortOrder === 'asc' ? (
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
                      onClick={() => handleColumnSort('email')}
                    >
                      Contato
                      {sortBy === 'email' ? (
                        sortOrder === 'asc' ? (
                          <ArrowUp className="ml-1 h-4 w-4" />
                        ) : (
                          <ArrowDown className="ml-1 h-4 w-4" />
                        )
                      ) : (
                        <ArrowUpDown className="ml-1 h-4 w-4 opacity-50" />
                      )}
                    </Button>
                  </TableHead>
                  <TableHead className="hidden lg:table-cell">Dias de Atendimento</TableHead>
                  <TableHead>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="-ml-2 h-8 font-medium"
                      onClick={() => handleColumnSort('status')}
                    >
                      Status
                      {sortBy === 'status' ? (
                        sortOrder === 'asc' ? (
                          <ArrowUp className="ml-1 h-4 w-4" />
                        ) : (
                          <ArrowDown className="ml-1 h-4 w-4" />
                        )
                      ) : (
                        <ArrowUpDown className="ml-1 h-4 w-4 opacity-50" />
                      )}
                    </Button>
                  </TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-full overflow-hidden bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-semibold shrink-0">
                          {user.avatar ? (
                            <img 
                              src={user.avatar} 
                              alt={user.name} 
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            user.name.charAt(0).toUpperCase()
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="font-medium text-foreground truncate">{user.name}</div>
                          <div className="text-sm">
                            <Badge className={getRoleBadgeColor(user.role)}>
                              {getRoleLabel(user.role)}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex items-center text-sm text-muted-foreground">
                          <Phone className="w-4 h-4 mr-2 shrink-0" />
                          <span className="truncate">{user.phone || '(11) 9999-9999'}</span>
                        </div>
                        <div className="flex items-center text-sm text-muted-foreground">
                          <Mail className="w-4 h-4 mr-2 shrink-0" />
                          <span className="truncate">{user.email}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <div className="flex flex-wrap gap-1">
                        {weekDays.map((day) => {
                          const isAvailable = user.workDays?.includes(day) !== false;
                          return (
                            <Badge
                              key={day}
                              variant={isAvailable ? "default" : "secondary"}
                              className={`text-xs px-1.5 py-0.5 ${
                                isAvailable 
                                  ? 'bg-blue-100 text-blue-800 border-blue-300' 
                                  : 'bg-muted text-muted-foreground'
                              }`}
                            >
                              {day.slice(0, 3)}
                            </Badge>
                          );
                        })}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <div className={`w-2 h-2 rounded-full mr-2 ${user.isActive ? 'bg-green-500' : 'bg-red-500'}`} />
                        <span className={`text-sm font-medium ${user.isActive ? 'text-green-700' : 'text-red-700'}`}>
                          {user.isActive ? 'Ativo' : 'Inativo'}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditClick(user)}
                          className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setUserToDelete(user)}
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Users Cards - Mobile */}
      <div className="md:hidden space-y-3">
        {sortedUsers.map((user) => (
          <Card key={user.id} className="overflow-hidden">
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="w-12 h-12 rounded-full overflow-hidden bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-semibold shrink-0">
                    {user.avatar ? (
                      <img 
                        src={user.avatar} 
                        alt={user.name} 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      user.name.charAt(0).toUpperCase()
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-medium text-foreground truncate">{user.name}</h3>
                    <Badge className={`${getRoleBadgeColor(user.role)} mt-1`}>
                      {getRoleLabel(user.role)}
                    </Badge>
                  </div>
                </div>
                <div className={`w-3 h-3 rounded-full shrink-0 ${user.isActive ? 'bg-green-500' : 'bg-red-500'}`} />
              </div>

              <div className="mt-3 space-y-2 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 shrink-0" />
                  <span className="truncate">{user.email}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 shrink-0" />
                  <span>{user.phone || '(11) 9999-9999'}</span>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-1">
                {weekDays.slice(0, 5).map((day) => {
                  const isAvailable = user.workDays?.includes(day) !== false;
                  return (
                    <Badge
                      key={day}
                      variant={isAvailable ? "default" : "secondary"}
                      className={`text-xs px-1.5 py-0.5 ${
                        isAvailable 
                          ? 'bg-blue-100 text-blue-800' 
                          : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {day.slice(0, 3)}
                    </Badge>
                  );
                })}
              </div>

              <div className="mt-4 flex items-center justify-end gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleEditClick(user)}
                  className="text-blue-600"
                >
                  <Edit className="w-4 h-4 mr-1" />
                  Editar
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setUserToDelete(user)}
                  className="text-destructive"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Modals - Always render but control visibility with open prop */}
      <EditUserModal
        user={selectedUser || { id: '', name: '', email: '', phone: '', position: '', role: 'user', createdAt: '', isActive: true, workDays: [] }}
        open={showEditModal && !!selectedUser}
        onOpenChange={(open) => {
          setShowEditModal(open);
          if (!open) setSelectedUser(null);
        }}
        onUpdateUser={updateUser}
        onUpdateUserRole={updateUserRole}
      />
      <EditUserPermissionsModal
        user={selectedUser || { id: '', name: '', email: '', phone: '', position: '', role: 'user', createdAt: '', isActive: true, workDays: [] }}
        open={showPermissionsModal && !!selectedUser}
        onOpenChange={(open) => {
          setShowPermissionsModal(open);
          if (!open) setSelectedUser(null);
        }}
        onUpdatePermissions={handleUpdatePermissions}
      />
      <UserStatusToggleModal
        user={selectedUser || { id: '', name: '', email: '', phone: '', position: '', role: 'user', createdAt: '', isActive: true, workDays: [] }}
        open={showStatusModal && !!selectedUser}
        onOpenChange={(open) => {
          setShowStatusModal(open);
          if (!open) setSelectedUser(null);
        }}
        onConfirm={confirmStatusToggle}
      />

      <AlertDialog open={!!userToDelete} onOpenChange={(open) => !open && !isDeleting && setUserToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir atendente?</AlertDialogTitle>
            <AlertDialogDescription>
              {userToDelete && (
                <>
                  Tem certeza que deseja excluir o atendente <strong>{userToDelete.name}</strong>?
                  Esta ação não pode ser desfeita e removerá o usuário do sistema.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {isDeleting && (
            <div className="flex items-center justify-center gap-2 py-2 text-sm text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>Excluindo atendente...</span>
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <Button
              type="button"
              variant="destructive"
              onClick={handleConfirmDeleteUser}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700 flex items-center gap-2"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Excluindo...
                </>
              ) : (
                'Excluir'
              )}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default UserManagement;
