
import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { UserPermissions } from '@/types/user';
import Login from '@/pages/Login';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredPermission?: keyof UserPermissions;
}

const ProtectedRoute = ({ children, requiredPermission }: ProtectedRouteProps) => {
  const { user, isLoading, hasPermission } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center justify-center">
          <div className="relative flex items-center justify-center mb-5">
            {/* Camada base do spinner */}
            <div className="w-14 h-14 border-4 border-gray-200 rounded-full" />
            {/* Anel animado do Lucide */}
            <div className="absolute">
              <svg className="animate-spin w-14 h-14 text-blue-600" viewBox="0 0 24 24" fill="none">
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                />
              </svg>
            </div>
          </div>
          <p className="text-gray-700 text-lg font-medium">Carregando...</p>
          <p className="text-gray-500 text-sm mt-1">Aguarde um momento</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  // Check specific permission if required
  if (requiredPermission && !hasPermission(requiredPermission)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">🚫</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Acesso Negado</h1>
          <p className="text-gray-600 mb-4">
            Você não tem permissão para acessar esta página. Entre em contato com o administrador para obter as permissões necessárias.
          </p>
          <p className="text-sm text-gray-500">
            Seu perfil atual: <span className="font-medium">
              {user.role === 'admin' && 'Administrador'}
              {user.role === 'manager' && 'Gerente'}
              {user.role === 'user' && 'Usuário'}
            </span>
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default ProtectedRoute;
