import { useState, useCallback } from 'react';
import { User, UserRole, ROLE_PERMISSIONS, UserPermissions } from '@/types/user';
import { useToast } from '@/hooks/use-toast';

export const useUsers = () => {
  const { toast } = useToast();
  
  // Mock data - in a real app this would come from a database
  const [users, setUsers] = useState<User[]>([
    {
      id: '1',
      name: 'Bruno',
      email: 'bruno@contato.com.br',
      phone: '(11) 9999-9992',
      position: 'Atendente Senior',
      role: 'admin',
      createdAt: '2024-01-01',
      lastLogin: '2024-06-15',
      isActive: true,
      workDays: ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'],
    },
    {
      id: '2',
      name: 'João',
      email: 'joao@email.com',
      phone: '11999999994',
      position: 'Atendente',
      role: 'manager',
      createdAt: '2024-02-15',
      lastLogin: '2024-06-14',
      isActive: true,
      workDays: ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'],
    },
    {
      id: '3',
      name: 'Lucas',
      email: 'lucas@email.com',
      phone: '(11) 9999-9993',
      position: 'Atendente Junior',
      role: 'user',
      createdAt: '2024-03-10',
      lastLogin: '2024-06-13',
      isActive: true,
      workDays: ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'],
    },
  ]);

  const addUser = useCallback((userData: Omit<User, 'id' | 'createdAt' | 'isActive' | 'lastLogin'>) => {
    console.log('Adding user:', userData);
    
    const newUser: User = {
      ...userData,
      id: Date.now().toString(),
      createdAt: new Date().toISOString().split('T')[0],
      isActive: true,
    };
    
    console.log('Created new user object:', newUser);
    
    setUsers(prev => {
      const updated = [...prev, newUser];
      console.log('Updated users list:', updated);
      return updated;
    });
    
    toast({
      title: "Atendente adicionado",
      description: `${newUser.name} foi adicionado com sucesso.`,
    });
  }, [toast]);

  const updateUser = useCallback((userId: string, updates: Partial<User>) => {
    console.log('Updating user:', userId, 'with data:', updates);
    
    setUsers(prev => {
      const updated = prev.map(user => {
        if (user.id === userId) {
          const updatedUser = {
            ...user,
            ...updates,
            // Garantir que campos obrigatórios não sejam perdidos
            id: user.id,
            createdAt: user.createdAt,
          };
          console.log('Updated user object:', updatedUser);
          return updatedUser;
        }
        return user;
      });
      console.log('Updated users list:', updated);
      return updated;
    });
    
    toast({
      title: "Atendente atualizado",
      description: "As informações do atendente foram atualizadas com sucesso.",
    });
  }, [toast]);

  const updateUserPermissions = useCallback((userId: string, permissions: UserPermissions) => {
    setUsers(prev => prev.map(user => 
      user.id === userId ? { ...user, customPermissions: permissions } : user
    ));
  }, []);

  const deleteUser = useCallback((userId: string) => {
    setUsers(prev => prev.filter(user => user.id !== userId));
    
    toast({
      title: "Atendente removido",
      description: "O atendente foi removido do sistema.",
    });
  }, [toast]);

  const toggleUserStatus = useCallback((userId: string) => {
    setUsers(prev => prev.map(user => 
      user.id === userId ? { ...user, isActive: !user.isActive } : user
    ));
  }, []);

  const getUserPermissions = useCallback((role: UserRole) => {
    return ROLE_PERMISSIONS[role];
  }, []);

  return {
    users,
    addUser,
    updateUser,
    updateUserPermissions,
    deleteUser,
    toggleUserStatus,
    getUserPermissions,
  };
};
