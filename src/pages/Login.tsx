import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { useCustomizationContext } from '@/contexts/CustomizationContext';
import { Activity, Eye, EyeOff, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const Login = () => {
  const [loginData, setLoginData] = useState({ email: '', password: '' });
  const [registerData, setRegisterData] = useState({ name: '', email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const { login, register, isLoading } = useAuth();
  const { customizationData } = useCustomizationContext();
  const { toast } = useToast();

  // Definido pela empresa no banco (customization.allow_registrations); primeira visita já respeita
  const allowNewRegistrations = customizationData.allowRegistrations;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = await login(loginData.email, loginData.password);

    if (!result.success) {
      const isInvalidCredentials = result.errorCode === 'invalid_credentials';
      toast({
        title: "Erro no login",
        description: isInvalidCredentials
          ? "E-mail ou senha incorretos. Se você acabou de resetar a senha, use exatamente a nova senha informada. Se o problema continuar, peça ao administrador para resetar sua senha novamente e confirmar seu e-mail no painel do Supabase (Authentication → Users)."
          : "E-mail ou senha incorretos.",
        variant: "destructive",
      });
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!allowNewRegistrations) {
      toast({
        title: "Registro não permitido",
        description: "O registro de novos usuários está desabilitado pelo administrador.",
        variant: "destructive",
      });
      return;
    }

    const success = await register(registerData.name, registerData.email, registerData.password);

    if (!success) {
      toast({
        title: "Erro no cadastro",
        description: "Este email já está em uso.",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Cadastro realizado",
        description: "Conta criada com sucesso!",
      });
    }
  };

  return (
    <div
      className="w-full min-h-screen flex items-center justify-center px-4"
      style={{
        background: `linear-gradient(135deg, ${customizationData.primaryColor}10 0%, ${customizationData.primaryColor}25 100%)`
      }}
    >
      <div className="w-full max-w-md space-y-6">
        {/* Header Section */}
        <div className="text-center">
          <div
            className="inline-flex items-center justify-center w-20 h-20 rounded-2xl mb-4 overflow-hidden shadow-sm bg-white border border-gray-100 p-2"
          >
            {customizationData.logoUrl ? (
              <img
                src={customizationData.logoUrl}
                alt="Logo"
                className="w-full h-full object-contain"
              />
            ) : (
              <Activity className="w-10 h-10" style={{ color: customizationData.primaryColor }} />
            )}
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {customizationData.appName}
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {customizationData.appSubtitle}
          </p>
        </div>

        {/* Card Section */}
        <Card className="shadow-lg">
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-xl font-bold">Acesso ao Sistema</CardTitle>
            <CardDescription>
              {allowNewRegistrations ? 'Entre com sua conta ou crie uma nova' : 'Entre com sua conta'}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <Tabs defaultValue="login" className="w-full">
              {allowNewRegistrations && (
                <TabsList className="grid w-full grid-cols-2 mb-6">
                  <TabsTrigger value="login">Entrar</TabsTrigger>
                  <TabsTrigger value="register">Cadastrar</TabsTrigger>
                </TabsList>
              )}

              <TabsContent value="login">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      autoComplete="email"
                      placeholder="seu@email.com"
                      value={loginData.email}
                      onChange={(e) => setLoginData(prev => ({ ...prev, email: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Senha</Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        autoComplete="current-password"
                        placeholder="Sua senha"
                        value={loginData.password}
                        onChange={(e) => setLoginData(prev => ({ ...prev, password: e.target.value }))}
                        required
                        className="pr-10"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-10 px-3 hover:bg-transparent"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                  <Button
                    type="submit"
                    className="w-full bg-primary text-white mt-6 transition-all hover:opacity-90 active:scale-[0.98]"
                    disabled={isLoading}
                  >
                    {isLoading ? "Entrando..." : "Entrar"}
                  </Button>
                </form>
              </TabsContent>

              {allowNewRegistrations && (
              <TabsContent value="register">
                {!allowNewRegistrations && (
                  <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-red-800">Registro não permitido</p>
                      <p className="text-sm text-red-600 mt-1">
                        O registro de novos usuários está desabilitado pelo administrador.
                        Entre em contato para obter acesso ao sistema.
                      </p>
                    </div>
                  </div>
                )}

                <form onSubmit={handleRegister} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nome completo</Label>
                    <Input
                      id="name"
                      type="text"
                      placeholder="Seu nome completo"
                      value={registerData.name}
                      onChange={(e) => setRegisterData(prev => ({ ...prev, name: e.target.value }))}
                      required
                      disabled={!allowNewRegistrations}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="register-email">Email</Label>
                    <Input
                      id="register-email"
                      type="email"
                      placeholder="seu@email.com"
                      value={registerData.email}
                      onChange={(e) => setRegisterData(prev => ({ ...prev, email: e.target.value }))}
                      required
                      disabled={!allowNewRegistrations}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="register-password">Senha</Label>
                    <div className="relative">
                      <Input
                        id="register-password"
                        type={showRegisterPassword ? "text" : "password"}
                        placeholder="Crie uma senha"
                        value={registerData.password}
                        onChange={(e) => setRegisterData(prev => ({ ...prev, password: e.target.value }))}
                        required
                        disabled={!allowNewRegistrations}
                        className="pr-10"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-10 px-3 hover:bg-transparent"
                        onClick={() => setShowRegisterPassword(!showRegisterPassword)}
                        disabled={!allowNewRegistrations}
                      >
                        {showRegisterPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                  <Button
                    type="submit"
                    className="w-full bg-primary text-white mt-6 transition-all hover:opacity-90 active:scale-[0.98]"
                    disabled={isLoading || !allowNewRegistrations}
                  >
                    {isLoading ? "Criando conta..." : "Criar conta"}
                  </Button>
                </form>
              </TabsContent>
              )}
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Login;
