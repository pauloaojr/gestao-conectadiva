import { useState, useEffect } from "react";
import { Settings2, User, Bell, Shield, Users, Save, Check, Building2, Upload, MapPin, Phone, Globe, Mail, X, Eye, MoreHorizontal, UserCheck, UserX, Edit, Loader2, ShieldCheck, Key, Palette, CalendarCheck, FileText } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useEstablishmentDB, EstablishmentFormData } from "@/hooks/useEstablishment";
import { useSupabaseUsers, SupabaseUser } from "@/hooks/useSupabaseUsers";
import { useProfiles } from "@/hooks/useProfiles";
import { useCustomization, CustomizationFormData } from "@/hooks/useCustomization";
import { useCustomizationContext } from "@/contexts/CustomizationContext";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { recordSystemAuditLog } from "@/services/systemAuditLog";
import {
  TIMEZONE_OPTIONS,
  getCurrentDateByTimezone,
  getCurrentTimeByTimezone,
  normalizeTimezoneConfig,
} from "@/lib/notificationRuntimePlaceholders";
import { ROLE_LABELS, UserRole } from "@/types/user";
import { CustomRolesManager } from "@/components/CustomRolesManager";
import { useCustomRoles } from "@/hooks/useCustomRoles";
import { CreateUserSettingsModal } from "@/components/settings/CreateUserSettingsModal";
import { ResetPasswordModal } from "@/components/settings/ResetPasswordModal";
import { AppointmentStatusSettings } from "@/components/settings/AppointmentStatusSettings";
import { PlanSettings } from "@/components/settings/PlanSettings";
import { NotificationSettings } from "@/components/settings/NotificationSettings";

const Settings = () => {
  const { user, changePassword, isPasswordExpired, hasPermission } = useAuth();
  const { establishment, isLoading: establishmentLoading, saveEstablishment } = useEstablishmentDB();
  const { users, isLoading: usersLoading, toggleUserStatus, updateUserRole, fetchUsers } = useSupabaseUsers();
  const { roles: customRoles } = useCustomRoles();
  const { updateProfile } = useProfiles();

  // Opções de função para a aba Usuários: sistema (admin, manager, user) + funções personalizadas
  const roleOptions = [
    { value: 'admin' as const, label: ROLE_LABELS.admin },
    { value: 'manager' as const, label: ROLE_LABELS.manager },
    { value: 'user' as const, label: ROLE_LABELS.user },
    ...(customRoles ?? [])
      .filter((r) => !r.is_system)
      .map((r) => ({ value: r.id, label: r.name })),
  ];
  const { customization, isLoading: customizationLoading, saveCustomization } = useCustomization();
  const { refreshCustomization } = useCustomizationContext();
  const { toast } = useToast();

  // Profile data state
  const [profileData, setProfileData] = useState({
    name: '',
    email: '',
    phone: '',
    position: '',
    avatar_url: '',
  });

  // Establishment form data state
  const [establishmentForm, setEstablishmentForm] = useState<EstablishmentFormData>({
    name: '',
    cnpj: '',
    phone: '',
    email: '',
    timezone: 'GMT-3',
    logo_url: '',
    address_street: '',
    address_number: '',
    address_neighborhood: '',
    address_city: '',
    address_state: '',
    address_cep: '',
  });

  // Security settings state (allowRegistrations vem do banco via customization)
  const [security, setSecurity] = useState({
    allowRegistrations: true,
    passwordExpiry: parseInt(localStorage.getItem('clinic_password_expiry') || '90'),
    sessionTimeout: parseInt(localStorage.getItem('clinic_session_timeout') || '60'),
    twoFactorAuth: localStorage.getItem('clinic_2fa') === 'true',
  });

  // Password change state
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  // Image preview modal state
  const [showImagePreview, setShowImagePreview] = useState(false);

  // Saving state
  const [isSaving, setIsSaving] = useState(false);

  // Reset password modal state
  const [showResetPasswordModal, setShowResetPasswordModal] = useState(false);
  const [selectedUserForPassword, setSelectedUserForPassword] = useState<SupabaseUser | null>(null);

  // Customization form state
  const [customizationForm, setCustomizationForm] = useState<CustomizationFormData>({
    app_name: '',
    app_subtitle: '',
    logo_url: '',
    primary_color: '#3B82F6',
    sidebar_style: 'default',
  });

  // Logo preview modal state
  const [showLogoPreview, setShowLogoPreview] = useState(false);
  const [timezonePreviewNow, setTimezonePreviewNow] = useState(() => new Date());

  // Load user profile data
  useEffect(() => {
    if (user) {
      setProfileData({
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
        position: user.position || '',
        avatar_url: user.avatar_url || '',
      });
    }
  }, [user]);

  // Load establishment data when fetched
  useEffect(() => {
    if (establishment) {
      setEstablishmentForm({
        name: establishment.name || '',
        cnpj: establishment.cnpj || '',
        phone: establishment.phone || '',
        email: establishment.email || '',
        timezone: establishment.timezone || 'GMT-3',
        logo_url: establishment.logo_url || '',
        address_street: establishment.address_street || '',
        address_number: establishment.address_number || '',
        address_neighborhood: establishment.address_neighborhood || '',
        address_city: establishment.address_city || '',
        address_state: establishment.address_state || '',
        address_cep: establishment.address_cep || '',
      });
    }
  }, [establishment]);

  // Load customization data when fetched
  useEffect(() => {
    if (customization) {
      setCustomizationForm({
        app_name: customization.app_name || '',
        app_subtitle: customization.app_subtitle || '',
        logo_url: customization.logo_url || '',
        primary_color: customization.primary_color || '#3B82F6',
        sidebar_style: customization.sidebar_style || 'default',
      });
      setSecurity(prev => ({ ...prev, allowRegistrations: customization.allow_registrations !== false }));
    }
  }, [customization]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setTimezonePreviewNow(new Date());
    }, 30000);

    return () => window.clearInterval(timer);
  }, []);

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setEstablishmentForm(prev => ({ ...prev, logo_url: result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveLogo = () => {
    setEstablishmentForm(prev => ({ ...prev, logo_url: '' }));
  };

  const handleSaveProfile = async () => {
    try {
      setIsSaving(true);
      
      // Validação básica
      if (!profileData.name.trim()) {
        toast({
          title: "Campo obrigatório",
          description: "O nome completo não pode estar vazio.",
          variant: "destructive",
        });
        return;
      }

      // Get current user's profile id
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user?.id)
        .maybeSingle();

      if (profile) {
        await updateProfile(profile.id, { 
          name: profileData.name,
          phone: profileData.phone,
          position: profileData.position,
          avatar_url: profileData.avatar_url
        });
      }

      toast({
        title: "Perfil atualizado",
        description: "Suas informações pessoais foram atualizadas com sucesso.",
      });
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleAvatarUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setProfileData(prev => ({ ...prev, avatar_url: result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveEstablishment = async () => {
    try {
      setIsSaving(true);
      const previousTimezone = normalizeTimezoneConfig(establishment?.timezone || null);
      const nextTimezone = normalizeTimezoneConfig(establishmentForm.timezone);

      if (previousTimezone !== nextTimezone) {
        toast({
          title: "Atenção: fuso horário alterado",
          description:
            "Essa alteração impacta placeholders dinâmicos e horários de notificações futuras.",
        });
      }

      await saveEstablishment(establishmentForm);
    } catch (error) {
      // Error already handled in hook
    } finally {
      setIsSaving(false);
    }
  };

  const normalizedTimezone = normalizeTimezoneConfig(establishmentForm.timezone);
  const hasTimezoneChanged =
    normalizeTimezoneConfig(establishment?.timezone || null) !== normalizedTimezone;
  const timezonePreviewDate = getCurrentDateByTimezone(
    timezonePreviewNow,
    normalizedTimezone
  );
  const timezonePreviewTime = getCurrentTimeByTimezone(
    timezonePreviewNow,
    normalizedTimezone
  );

  const handleChangePassword = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast({
        title: "Erro",
        description: "As senhas não coincidem.",
        variant: "destructive",
      });
      return;
    }

    if (passwordData.newPassword.length < 6) {
      toast({
        title: "Erro",
        description: "A nova senha deve ter pelo menos 6 caracteres.",
        variant: "destructive",
      });
      return;
    }

    const success = await changePassword(passwordData.currentPassword, passwordData.newPassword);

    if (success) {
      await recordSystemAuditLog({
        menuGroup: "SISTEMA",
        menu: "Configurações",
        screen: "Configurações - Segurança",
        action: "update",
        entityType: "security_settings",
        entityId: user?.id ?? null,
        message: "Senha alterada.",
        metadata: {
          operationType: "change_password",
        },
      });

      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      toast({
        title: "Senha alterada",
        description: "Sua senha foi alterada com sucesso.",
      });
    } else {
      toast({
        title: "Erro",
        description: "Senha atual incorreta.",
        variant: "destructive",
      });
    }
  };

  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setCustomizationForm(prev => ({ ...prev, logo_url: result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveLogoCustomization = () => {
    setCustomizationForm(prev => ({ ...prev, logo_url: '' }));
  };

  const handleSaveCustomization = async () => {
    try {
      setIsSaving(true);
      const success = await saveCustomization(customizationForm);
      if (success) {
        await refreshCustomization();
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveSecurity = async () => {
    try {
      const previousAllowRegistrations = customization?.allow_registrations ?? true;
      const previousPasswordExpiry = parseInt(localStorage.getItem('clinic_password_expiry') || '90');
      const previousSessionTimeout = parseInt(localStorage.getItem('clinic_session_timeout') || '60');
      const previousTwoFactorAuth = localStorage.getItem('clinic_2fa') === 'true';

      if (customization?.id) {
        const { error } = await supabase
          .from('customization')
          .update({ allow_registrations: security.allowRegistrations })
          .eq('id', customization.id);
        if (error) throw error;
        await refreshCustomization();
      }
      localStorage.setItem('clinic_password_expiry', security.passwordExpiry.toString());
      localStorage.setItem('clinic_session_timeout', security.sessionTimeout.toString());
      localStorage.setItem('clinic_2fa', security.twoFactorAuth.toString());

      const changedValues = [
        { field: 'allow_registrations', before: previousAllowRegistrations, after: security.allowRegistrations },
        { field: 'password_expiry', before: previousPasswordExpiry, after: security.passwordExpiry },
        { field: 'session_timeout', before: previousSessionTimeout, after: security.sessionTimeout },
        { field: 'two_factor_auth', before: previousTwoFactorAuth, after: security.twoFactorAuth },
      ].filter((item) => JSON.stringify(item.before) !== JSON.stringify(item.after));

      await recordSystemAuditLog({
        menuGroup: "SISTEMA",
        menu: "Configurações",
        screen: "Configurações - Segurança",
        action: "update",
        entityType: "security_settings",
        entityId: customization?.id ?? user?.id ?? null,
        message: "Configurações de segurança atualizadas.",
        metadata: {
          updatedFields: changedValues.map((item) => item.field),
          changedValues,
        },
      });

      toast({
        title: "Configurações de segurança atualizadas",
        description: "As configurações foram salvas com sucesso.",
      });
    } catch (e) {
      console.error(e);
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível atualizar a opção de permitir cadastros.",
        variant: "destructive",
      });
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-red-100 text-red-800';
      case 'manager': return 'bg-blue-100 text-blue-800';
      case 'user': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handleToggleUserStatus = async (userId: string) => {
    const targetUser = users.find((u) => u.id === userId);
    await toggleUserStatus(userId);

    await recordSystemAuditLog({
      menuGroup: "SISTEMA",
      menu: "Configurações",
      screen: "Configurações - Usuários",
      action: "update",
      entityType: "user",
      entityId: userId,
      message: targetUser?.is_active ? "Usuário desativado." : "Usuário ativado.",
      metadata: {
        targetName: targetUser?.name ?? null,
        targetEmail: targetUser?.email ?? null,
        previousStatus: targetUser?.is_active ? "active" : "inactive",
        newStatus: targetUser?.is_active ? "inactive" : "active",
        updatedFields: ["is_active"],
        changedValues: [
          {
            field: "is_active",
            before: targetUser?.is_active ?? null,
            after: targetUser ? !targetUser.is_active : null,
          },
        ],
      },
    });
  };

  const handleChangeUserRole = async (userId: string, newRole: string) => {
    const targetUser = users.find((u) => u.id === userId);
    await updateUserRole(userId, newRole);

    await recordSystemAuditLog({
      menuGroup: "SISTEMA",
      menu: "Configurações",
      screen: "Configurações - Usuários",
      action: "update",
      entityType: "user_role",
      entityId: userId,
      message: "Função de usuário atualizada.",
      metadata: {
        targetName: targetUser?.name ?? null,
        targetEmail: targetUser?.email ?? null,
        updatedFields: ["role"],
        changedValues: [
          {
            field: "role",
            before: targetUser?.role ?? null,
            after: newRole,
          },
        ],
      },
    });
  };

  const handleResetPassword = (userData: SupabaseUser) => {
    setSelectedUserForPassword(userData);
    setShowResetPasswordModal(true);
  };

  return (
    <div className="space-y-4 md:space-y-6 animate-fade-in p-2 md:p-0">
      {/* Header */}
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-foreground">Configurações</h1>
        <p className="text-sm md:text-base text-muted-foreground">Gerencie as configurações do seu consultório e perfil.</p>
        {isPasswordExpired() && (
          <div className="mt-4 p-3 md:p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
            <p className="text-destructive font-medium text-sm md:text-base">
              ⚠️ Sua senha expirou! Por favor, altere sua senha na aba Segurança.
            </p>
          </div>
        )}
      </div>

      {/* Settings Tabs — Perfil liberado para todos; demais abas conforme permissões (funções) */}
      <Tabs defaultValue="profile" className="space-y-4 md:space-y-6">
        <TabsList className="flex flex-wrap w-full h-auto gap-1 p-1">
          <TabsTrigger value="profile" className="flex items-center gap-1 md:gap-2 text-xs md:text-sm py-2">
            <User className="w-3 h-3 md:w-4 md:h-4" />
            <span className="hidden sm:inline">Perfil</span>
            <span className="sm:hidden">Perfil</span>
          </TabsTrigger>
          {hasPermission('settings', 'view', 'personalizacao') && (
            <TabsTrigger value="customization" className="flex items-center gap-1 md:gap-2 text-xs md:text-sm py-2">
              <Palette className="w-3 h-3 md:w-4 md:h-4" />
              <span className="hidden sm:inline">Personalização</span>
              <span className="sm:hidden">Pers.</span>
            </TabsTrigger>
          )}
          {hasPermission('settings', 'view', 'establishment') && (
            <TabsTrigger value="establishment" className="flex items-center gap-1 md:gap-2 text-xs md:text-sm py-2">
              <Building2 className="w-3 h-3 md:w-4 md:h-4" />
              <span className="hidden sm:inline">Estabelecimento</span>
              <span className="sm:hidden">Estab.</span>
            </TabsTrigger>
          )}
          {hasPermission('settings', 'view', 'security') && (
            <TabsTrigger value="security" className="flex items-center gap-1 md:gap-2 text-xs md:text-sm py-2">
              <Shield className="w-3 h-3 md:w-4 md:h-4" />
              <span className="hidden sm:inline">Segurança</span>
              <span className="sm:hidden">Seg.</span>
            </TabsTrigger>
          )}
          {hasPermission('settings', 'view', 'notifications') && (
            <TabsTrigger value="notifications" className="flex items-center gap-1 md:gap-2 text-xs md:text-sm py-2">
              <Bell className="w-3 h-3 md:w-4 md:h-4" />
              <span className="hidden sm:inline">Notificações</span>
              <span className="sm:hidden">Notif.</span>
            </TabsTrigger>
          )}
          {hasPermission('settings', 'view', 'plano') && (
            <TabsTrigger value="plano" className="flex items-center gap-1 md:gap-2 text-xs md:text-sm py-2">
              <FileText className="w-3 h-3 md:w-4 md:h-4" />
              <span className="hidden sm:inline">Plano</span>
              <span className="sm:hidden">Plano</span>
            </TabsTrigger>
          )}
          {hasPermission('settings', 'view', 'statusAgenda') && (
            <TabsTrigger value="statusAgenda" className="flex items-center gap-1 md:gap-2 text-xs md:text-sm py-2">
              <CalendarCheck className="w-3 h-3 md:w-4 md:h-4" />
              <span className="hidden sm:inline">Status Agenda</span>
              <span className="sm:hidden">Status</span>
            </TabsTrigger>
          )}
          {hasPermission('settings', 'view', 'roles') && (
            <TabsTrigger value="roles" className="flex items-center gap-1 md:gap-2 text-xs md:text-sm py-2">
              <ShieldCheck className="w-3 h-3 md:w-4 md:h-4" />
              <span className="hidden sm:inline">Funções</span>
              <span className="sm:hidden">Funções</span>
            </TabsTrigger>
          )}
          {hasPermission('settings', 'view', 'users') && (
            <TabsTrigger value="users" className="flex items-center gap-1 md:gap-2 text-xs md:text-sm py-2">
              <Users className="w-3 h-3 md:w-4 md:h-4" />
              <span className="hidden sm:inline">Usuários</span>
              <span className="sm:hidden">Users</span>
            </TabsTrigger>
          )}
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column: Avatar & Quick Info */}
            <div className="lg:col-span-1 space-y-6">
              <Card className="overflow-hidden border-border/50 shadow-lg hover:shadow-xl transition-all duration-300">
                <div className="h-24 clinic-gradient relative">
                   <div className="absolute -bottom-12 left-1/2 -translate-x-1/2">
                      <div className="relative group">
                        <div className="w-24 h-24 rounded-2xl border-4 border-background shadow-xl overflow-hidden bg-muted group-hover:scale-105 transition-transform duration-300">
                          {profileData.avatar_url ? (
                            <img 
                              src={profileData.avatar_url} 
                              alt={profileData.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-primary/5">
                              <User className="w-10 h-10 text-primary animate-pulse-gentle" />
                            </div>
                          )}
                        </div>
                        <Label 
                          htmlFor="avatar-upload" 
                          className="absolute bottom-0 right-0 p-1.5 bg-primary text-white rounded-lg shadow-lg cursor-pointer hover:scale-110 transition-transform duration-200 border-2 border-background"
                        >
                          <Edit className="w-3.5 h-3.5" />
                          <input 
                            id="avatar-upload" 
                            type="file" 
                            className="hidden" 
                            accept="image/*"
                            onChange={handleAvatarUpload}
                          />
                        </Label>
                      </div>
                   </div>
                </div>
                <CardContent className="pt-16 pb-6 text-center">
                  <h3 className="text-xl font-bold text-foreground">{profileData.name || 'Seu Nome'}</h3>
                  <p className="text-sm text-primary font-medium tracking-wide flex items-center justify-center gap-1 mt-1 uppercase">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    {user?.role === 'admin' ? 'Administrador' : user?.role === 'manager' ? 'Gerente' : 'Especialista'}
                  </p>
                  
                  <div className="mt-6 flex flex-col gap-2">
                    <div className="flex items-center gap-3 p-3 bg-muted/40 rounded-xl text-sm border border-border/50">
                      <Mail className="w-4 h-4 text-primary shrink-0" />
                      <span className="truncate text-muted-foreground">{profileData.email}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border/50 bg-primary/5 border-dashed">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3 text-primary">
                    <Shield className="w-5 h-5 shrink-0" />
                    <div>
                      <h4 className="text-sm font-bold">Nível de Acesso</h4>
                      <p className="text-xs text-primary/70">
                        {user?.role === 'admin' || user?.role === 'manager'
                          ? 'Você possui permissões totais para gerenciar o estabelecimento.'
                          : 'Você pode editar seus dados de perfil nesta aba.'}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right Column: Detailed Forms */}
            <div className="lg:col-span-2">
              <Card className="border-border/50 shadow-sm overflow-hidden flex flex-col h-full">
                <CardHeader className="border-b bg-muted/20 pb-4">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <User className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">Informações Detalhadas</CardTitle>
                      <p className="text-xs text-muted-foreground">Mantenha seus dados atualizados para uma melhor comunicação.</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-6 space-y-6 flex-1">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2 group">
                      <Label htmlFor="name" className="text-xs font-bold uppercase tracking-wider text-muted-foreground group-focus-within:text-primary transition-colors">
                        Nome Completo
                      </Label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                        <Input
                          id="name"
                          value={profileData.name}
                          onChange={(e) => setProfileData(prev => ({ ...prev, name: e.target.value }))}
                          placeholder="Seu nome completo"
                          className="pl-10 h-11 border-border/60 focus:ring-primary/20 bg-muted/10"
                        />
                      </div>
                    </div>

                    <div className="space-y-2 group">
                      <Label htmlFor="position" className="text-xs font-bold uppercase tracking-wider text-muted-foreground group-focus-within:text-primary transition-colors">
                        Cargo / Especialidade
                      </Label>
                      <div className="relative">
                        <Check className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                        <Input
                          id="position"
                          value={profileData.position}
                          onChange={(e) => setProfileData(prev => ({ ...prev, position: e.target.value }))}
                          placeholder="Ex: Médico, Recepcionista..."
                          className="pl-10 h-11 border-border/60 focus:ring-primary/20 bg-muted/10"
                        />
                      </div>
                    </div>

                    <div className="space-y-2 group">
                      <Label htmlFor="phone" className="text-xs font-bold uppercase tracking-wider text-muted-foreground group-focus-within:text-primary transition-colors">
                        WhatsApp / Celular
                      </Label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                        <Input
                          id="phone"
                          value={profileData.phone}
                          onChange={(e) => setProfileData(prev => ({ ...prev, phone: e.target.value }))}
                          placeholder="(00) 00000-0000"
                          className="pl-10 h-11 border-border/60 focus:ring-primary/20 bg-muted/10"
                        />
                      </div>
                    </div>

                    <div className="space-y-2 group">
                      <Label htmlFor="email" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        E-mail de Acesso
                      </Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
                        <Input
                          id="email"
                          type="email"
                          value={profileData.email}
                          disabled
                          className="pl-10 h-11 bg-muted/40 cursor-not-allowed opacity-70"
                        />
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1">
                        <Shield className="w-3 h-3" />
                         E-mail vinculado à conta não pode ser alterado
                      </p>
                    </div>
                  </div>

                  <div className="pt-6 border-t flex justify-end items-center gap-4">
                     <span className="text-xs text-muted-foreground italic">Última atualização: hoje</span>
                    <Button 
                      onClick={handleSaveProfile} 
                      disabled={isSaving} 
                      className="clinic-gradient text-white h-11 px-8 shadow-md hover:shadow-lg transition-all active:scale-95 min-w-[180px]"
                    >
                      {isSaving ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Check className="w-4 h-4 mr-2" />
                      )}
                      Salvar Alterações
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* Customization Tab */}
        <TabsContent value="customization">
          <Card className="shadow-sm border-0">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="w-5 h-5" />
                Personalização do Painel
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-8">
              {customizationLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <>
                  {/* App Name and Subtitle */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium text-foreground">Identidade do Sistema</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="appName">Nome do Aplicativo</Label>
                        <Input
                          id="appName"
                          value={customizationForm.app_name}
                          onChange={(e) => setCustomizationForm(prev => ({ ...prev, app_name: e.target.value }))}
                          placeholder="Ex: Clinica Pro - Gestão Profissional"
                        />
                        <p className="text-xs text-muted-foreground">Nome exibido na sidebar e no cabeçalho</p>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="appSubtitle">Subtítulo</Label>
                        <Input
                          id="appSubtitle"
                          value={customizationForm.app_subtitle}
                          onChange={(e) => setCustomizationForm(prev => ({ ...prev, app_subtitle: e.target.value }))}
                          placeholder="Ex: Sistema de Gestão Médica"
                        />
                        <p className="text-xs text-muted-foreground">Texto secundário exibido abaixo do nome</p>
                      </div>
                    </div>
                  </div>

                  {/* Logo Upload */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium text-foreground">Logo do Sistema</h3>
                    <div className="flex items-start gap-4">
                      <div className="relative">
                        <div className="w-24 h-24 bg-muted rounded-lg flex items-center justify-center border-2 border-dashed border-border overflow-hidden">
                          {customizationForm.logo_url ? (
                            <img
                              src={customizationForm.logo_url}
                              alt="Logo"
                              className="w-full h-full object-contain rounded-lg cursor-pointer hover:opacity-75 transition-opacity"
                              onClick={() => setShowLogoPreview(true)}
                            />
                          ) : (
                            <Palette className="w-8 h-8 text-muted-foreground" />
                          )}
                        </div>
                        {customizationForm.logo_url && (
                          <div className="absolute -top-2 -right-2 flex gap-1">
                            <Button
                              size="icon"
                              variant="secondary"
                              className="h-6 w-6 rounded-full bg-blue-500 hover:bg-blue-600 text-white"
                              onClick={() => setShowLogoPreview(true)}
                            >
                              <Eye className="w-3 h-3" />
                            </Button>
                            <Button
                              size="icon"
                              variant="destructive"
                              className="h-6 w-6 rounded-full"
                              onClick={handleRemoveLogoCustomization}
                            >
                              <X className="w-3 h-3" />
                            </Button>
                          </div>
                        )}
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Input
                            type="file"
                            accept="image/*"
                            onChange={handleLogoUpload}
                            className="hidden"
                            id="customization-logo-upload"
                          />
                          <Label htmlFor="customization-logo-upload" className="cursor-pointer">
                            <Button variant="outline" className="flex items-center gap-2" asChild>
                              <span>
                                <Upload className="w-4 h-4" />
                                Enviar Logo
                              </span>
                            </Button>
                          </Label>
                        </div>
                        <p className="text-sm text-muted-foreground">PNG, JPG até 2MB. Recomendado: 200x200px</p>
                        {customizationForm.logo_url && (
                          <p className="text-sm text-green-600">✓ Logo carregado com sucesso</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Preview */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium text-foreground">Pré-visualização</h3>
                    <div className="p-4 bg-muted/50 rounded-lg border">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center overflow-hidden shrink-0">
                          {customizationForm.logo_url ? (
                            <img
                              src={customizationForm.logo_url}
                              alt="Logo Preview"
                              className="w-full h-full object-contain"
                            />
                          ) : (
                            <Palette className="w-6 h-6 text-white" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <h1 className="text-lg font-bold text-foreground truncate">
                            {customizationForm.app_name || "Clinica Pro"}
                          </h1>
                          <p className="text-sm text-muted-foreground truncate">
                            {customizationForm.app_subtitle || "Gestão Profissional"}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <Button onClick={handleSaveCustomization} disabled={isSaving} className="clinic-gradient text-white">
                    {isSaving ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4 mr-2" />
                    )}
                    Salvar Personalização
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Establishment Tab */}
        <TabsContent value="establishment">
          <Card className="shadow-sm border-0">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="w-5 h-5" />
                Informações do Estabelecimento
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-8">
              {establishmentLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <>
                  {/* Company Basic Info */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium text-foreground">Dados da Empresa</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="companyName">Nome da Empresa</Label>
                        <Input
                          id="companyName"
                          value={establishmentForm.name}
                          onChange={(e) => setEstablishmentForm(prev => ({ ...prev, name: e.target.value }))}
                          placeholder="Nome completo da empresa"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="cnpj">CNPJ</Label>
                        <Input
                          id="cnpj"
                          value={establishmentForm.cnpj}
                          onChange={(e) => setEstablishmentForm(prev => ({ ...prev, cnpj: e.target.value }))}
                          placeholder="00.000.000/0000-00"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Logo Upload */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium text-foreground">Logo da Empresa</h3>
                    <div className="flex items-start gap-4">
                      <div className="relative">
                        <div className="w-24 h-24 bg-muted rounded-lg flex items-center justify-center border-2 border-dashed border-border overflow-hidden">
                          {establishmentForm.logo_url ? (
                            <img
                              src={establishmentForm.logo_url}
                              alt="Logo"
                              className="w-full h-full object-contain rounded-lg cursor-pointer hover:opacity-75 transition-opacity"
                              onClick={() => setShowImagePreview(true)}
                            />
                          ) : (
                            <Building2 className="w-8 h-8 text-muted-foreground" />
                          )}
                        </div>
                        {establishmentForm.logo_url && (
                          <div className="absolute -top-2 -right-2 flex gap-1">
                            <Button
                              size="icon"
                              variant="secondary"
                              className="h-6 w-6 rounded-full bg-blue-500 hover:bg-blue-600 text-white"
                              onClick={() => setShowImagePreview(true)}
                            >
                              <Eye className="w-3 h-3" />
                            </Button>
                            <Button
                              size="icon"
                              variant="destructive"
                              className="h-6 w-6 rounded-full"
                              onClick={handleRemoveLogo}
                            >
                              <X className="w-3 h-3" />
                            </Button>
                          </div>
                        )}
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Input
                            type="file"
                            accept="image/*"
                            onChange={handleImageUpload}
                            className="hidden"
                            id="logo-upload"
                          />
                          <Label htmlFor="logo-upload" className="cursor-pointer">
                            <Button variant="outline" className="flex items-center gap-2" asChild>
                              <span>
                                <Upload className="w-4 h-4" />
                                Enviar Logo
                              </span>
                            </Button>
                          </Label>
                        </div>
                        <p className="text-sm text-muted-foreground">PNG, JPG até 2MB</p>
                        {establishmentForm.logo_url && (
                          <p className="text-sm text-green-600">✓ Logo carregado com sucesso</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Address */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium text-foreground flex items-center gap-2">
                      <MapPin className="w-5 h-5" />
                      Endereço
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      <div className="space-y-2 md:col-span-2">
                        <Label htmlFor="street">Logradouro</Label>
                        <Input
                          id="street"
                          value={establishmentForm.address_street}
                          onChange={(e) => setEstablishmentForm(prev => ({ ...prev, address_street: e.target.value }))}
                          placeholder="Rua, Avenida..."
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="number">Número</Label>
                        <Input
                          id="number"
                          value={establishmentForm.address_number}
                          onChange={(e) => setEstablishmentForm(prev => ({ ...prev, address_number: e.target.value }))}
                          placeholder="123"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="neighborhood">Bairro</Label>
                        <Input
                          id="neighborhood"
                          value={establishmentForm.address_neighborhood}
                          onChange={(e) => setEstablishmentForm(prev => ({ ...prev, address_neighborhood: e.target.value }))}
                          placeholder="Nome do bairro"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="city">Cidade</Label>
                        <Input
                          id="city"
                          value={establishmentForm.address_city}
                          onChange={(e) => setEstablishmentForm(prev => ({ ...prev, address_city: e.target.value }))}
                          placeholder="Nome da cidade"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="state">Estado</Label>
                        <Input
                          id="state"
                          value={establishmentForm.address_state}
                          onChange={(e) => setEstablishmentForm(prev => ({ ...prev, address_state: e.target.value }))}
                          placeholder="SP"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="zipCode">CEP</Label>
                        <Input
                          id="zipCode"
                          value={establishmentForm.address_cep}
                          onChange={(e) => setEstablishmentForm(prev => ({ ...prev, address_cep: e.target.value }))}
                          placeholder="00000-000"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Contact Info */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium text-foreground">Contato</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="contactPhone" className="flex items-center gap-2">
                          <Phone className="w-4 h-4" />
                          Telefone
                        </Label>
                        <Input
                          id="contactPhone"
                          value={establishmentForm.phone}
                          onChange={(e) => setEstablishmentForm(prev => ({ ...prev, phone: e.target.value }))}
                          placeholder="(11) 3000-0000"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="contactEmail" className="flex items-center gap-2">
                          <Mail className="w-4 h-4" />
                          E-mail
                        </Label>
                        <Input
                          id="contactEmail"
                          type="email"
                          value={establishmentForm.email}
                          onChange={(e) => setEstablishmentForm(prev => ({ ...prev, email: e.target.value }))}
                          placeholder="contato@clinica.com"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="establishmentTimezone" className="flex items-center gap-2">
                          <Globe className="w-4 h-4" />
                          Fuso horário (GMT)
                        </Label>
                        <Select
                          value={establishmentForm.timezone}
                          onValueChange={(value) =>
                            setEstablishmentForm((prev) => ({ ...prev, timezone: value }))
                          }
                        >
                          <SelectTrigger id="establishmentTimezone">
                            <SelectValue placeholder="Selecione o fuso horário" />
                          </SelectTrigger>
                          <SelectContent>
                            {TIMEZONE_OPTIONS.map((timezone) => (
                              <SelectItem key={timezone} value={timezone}>
                                {timezone}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">
                          Esse fuso será usado nos placeholders dinâmicos das notificações.
                        </p>
                        <p className="text-xs text-primary font-medium">
                          Horário atual nesse fuso: {timezonePreviewDate} às {timezonePreviewTime}
                        </p>
                        {hasTimezoneChanged ? (
                          <p className="text-xs text-amber-600">
                            Alteração pendente: esse novo fuso será aplicado nas próximas notificações após salvar.
                          </p>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  <Button onClick={handleSaveEstablishment} disabled={isSaving} className="clinic-gradient text-white">
                    {isSaving ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4 mr-2" />
                    )}
                    Salvar Estabelecimento
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security">
          <Card className="shadow-sm border-0">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Configurações de Segurança
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-8">
              {/* Password Change Section */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-foreground">Alterar Senha</h3>
                {isPasswordExpired() && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-800">
                      <strong>Atenção:</strong> Sua senha expirou e precisa ser alterada.
                    </p>
                  </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="currentPassword">Senha atual</Label>
                    <Input
                      id="currentPassword"
                      type="password"
                      value={passwordData.currentPassword}
                      onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
                      placeholder="Digite sua senha atual"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="newPassword">Nova senha</Label>
                    <Input
                      id="newPassword"
                      type="password"
                      value={passwordData.newPassword}
                      onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                      placeholder="Digite a nova senha"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirmar nova senha</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      value={passwordData.confirmPassword}
                      onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                      placeholder="Confirme a nova senha"
                    />
                  </div>
                </div>
                <Button onClick={handleChangePassword} className="clinic-gradient text-white">
                  Alterar Senha
                </Button>
              </div>

              {/* System Settings */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-foreground">Configurações do Sistema</h3>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Permitir registro de novos usuários</Label>
                    <p className="text-sm text-muted-foreground">Quando desabilitado, a página de registro ficará indisponível</p>
                  </div>
                  <Switch
                    checked={security.allowRegistrations}
                    onCheckedChange={(checked) => setSecurity(prev => ({ ...prev, allowRegistrations: checked }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sessionTimeout">Timeout da sessão (minutos)</Label>
                  <Input
                    id="sessionTimeout"
                    type="number"
                    min="1"
                    max="1440"
                    value={security.sessionTimeout}
                    onChange={(e) => setSecurity(prev => ({ ...prev, sessionTimeout: parseInt(e.target.value) }))}
                    className="w-32"
                  />
                  <p className="text-sm text-muted-foreground">Tempo limite para logout automático (1-1440 minutos)</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="passwordExpiry">Expiração da senha (dias)</Label>
                  <Input
                    id="passwordExpiry"
                    type="number"
                    min="1"
                    max="365"
                    value={security.passwordExpiry}
                    onChange={(e) => setSecurity(prev => ({ ...prev, passwordExpiry: parseInt(e.target.value) }))}
                    className="w-32"
                  />
                  <p className="text-sm text-muted-foreground">Período para renovação obrigatória da senha (1-365 dias)</p>
                </div>
                <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                  <p className="text-sm text-yellow-800">
                    <strong>Dica de segurança:</strong> Use senhas complexas com pelo menos 12 caracteres, incluindo letras maiúsculas, minúsculas, números e símbolos.
                  </p>
                </div>
              </div>
              <Button onClick={handleSaveSecurity} className="clinic-gradient text-white">
                <Save className="w-4 h-4 mr-2" />
                Salvar Segurança
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications" className="space-y-6">
          <NotificationSettings />
        </TabsContent>

        {/* Plano Tab */}
        {hasPermission('settings', 'view', 'plano') && (
          <TabsContent value="plano" className="space-y-6">
            <PlanSettings />
          </TabsContent>
        )}

        {/* Status Agenda Tab */}
        {hasPermission('settings', 'view', 'statusAgenda') && (
          <TabsContent value="statusAgenda" className="space-y-6">
            <AppointmentStatusSettings />
          </TabsContent>
        )}

        {/* Users Tab */}
        {hasPermission('settings', 'view', 'users') && (
          <TabsContent value="users">
            <Card className="shadow-sm border-0">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    <CardTitle>Gerenciamento de Usuários</CardTitle>
                  </div>
                  <CreateUserSettingsModal onSuccess={fetchUsers} />
                </div>
                <p className="text-muted-foreground">Gerencie usuários, crie novos e altere senhas.</p>
              </CardHeader>
              <CardContent>
                {usersLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <>
                    <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Nome</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Cargo</TableHead>
                            <TableHead>Função</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="w-[50px]">Ações</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {users.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                                Nenhum usuário encontrado
                              </TableCell>
                            </TableRow>
                          ) : (
                            users.map((userData) => {
                              const isCurrentUser = userData.user_id === user?.id;

                              return (
                                <TableRow key={userData.id}>
                                  <TableCell className="font-medium">{userData.name}</TableCell>
                                  <TableCell>{userData.email}</TableCell>
                                  <TableCell>{userData.position || '-'}</TableCell>
                                  <TableCell>
                                    <Select
                                      value={userData.role || 'user'}
                                      onValueChange={(value) => handleChangeUserRole(userData.id, value)}
                                    >
                                      <SelectTrigger className="w-32">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {roleOptions.map((opt) => (
                                          <SelectItem key={opt.value} value={opt.value}>
                                            {opt.label}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </TableCell>
                                  <TableCell>
                                    <div className="flex items-center gap-2">
                                      <div className={`w-2 h-2 rounded-full ${userData.is_active ? 'bg-green-400' : 'bg-red-400'}`}></div>
                                      {userData.is_active ? 'Ativo' : 'Inativo'}
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-8 w-8">
                                          <MoreHorizontal className="w-4 h-4" />
                                        </Button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent align="end" className="w-48 rounded-xl border-border/50">
                                        <DropdownMenuItem onClick={() => handleResetPassword(userData)} className="font-medium cursor-pointer">
                                          <Key className="w-4 h-4 mr-2 text-primary" />
                                          Resetar Senha
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem
                                          disabled={isCurrentUser && userData.is_active}
                                          onClick={() => {
                                            if (isCurrentUser && userData.is_active) return;
                                            handleToggleUserStatus(userData.id);
                                          }}
                                          className={cn(
                                            "font-medium cursor-pointer",
                                            isCurrentUser && userData.is_active
                                              ? "text-muted-foreground cursor-not-allowed"
                                              : userData.is_active
                                              ? "text-rose-500 hover:text-rose-600 font-bold"
                                              : "text-emerald-500 hover:text-emerald-600 font-bold"
                                          )}
                                        >
                                          {isCurrentUser && userData.is_active ? (
                                            <>
                                              <UserX className="w-4 h-4 mr-2" />
                                              Você não pode se desativar
                                            </>
                                          ) : userData.is_active ? (
                                            <>
                                              <UserX className="w-4 h-4 mr-2" />
                                              Desativar Usuário
                                            </>
                                          ) : (
                                            <>
                                              <UserCheck className="w-4 h-4 mr-2" />
                                              Reativar Usuário
                                            </>
                                          )}
                                        </DropdownMenuItem>
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                  </TableCell>
                                </TableRow>
                              );
                            })
                          )}
                        </TableBody>
                      </Table>
                    </div>

                    <div className="mt-8 p-5 bg-muted/40 rounded-2xl border border-border/50">
                      <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em] mb-4">
                        <ShieldCheck className="w-3 h-3 text-primary" />
                        NÍVEIS DE PERMISSÃO
                      </div>
                      <div className="space-y-3 text-xs">
                        <div className="flex gap-2">
                          <strong className="text-foreground shrink-0 w-24">Administrador:</strong>
                          <span className="text-muted-foreground">Acesso completo ao sistema, incluindo gerenciamento de usuários e configurações.</span>
                        </div>
                        <div className="flex gap-2">
                          <strong className="text-foreground shrink-0 w-24">Gerente:</strong>
                          <span className="text-muted-foreground">Acesso a pacientes, prontuários, agenda e relatórios. Sem acesso a configurações do sistema.</span>
                        </div>
                        <div className="flex gap-2">
                          <strong className="text-foreground shrink-0 w-24">Usuário:</strong>
                          <span className="text-muted-foreground">Acesso básico a pacientes e agenda. Sem acesso a prontuários, relatórios ou configurações.</span>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* Custom Roles Tab */}
        {hasPermission('settings', 'view', 'roles') && (
          <TabsContent value="roles">
            <CustomRolesManager />
          </TabsContent>
        )}
      </Tabs>

      {/* Image Preview Modal */}
      <Dialog open={showImagePreview} onOpenChange={setShowImagePreview}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Visualizar Logo</DialogTitle>
            <DialogDescription className="sr-only">Visualização da logo do estabelecimento.</DialogDescription>
          </DialogHeader>
          <div className="flex justify-center">
            {establishmentForm.logo_url && (
              <img
                src={establishmentForm.logo_url}
                alt="Logo Preview"
                className="max-w-full max-h-96 object-contain rounded-lg"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Logo Preview Modal (Customization) */}
      <Dialog open={showLogoPreview} onOpenChange={setShowLogoPreview}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Visualizar Logo do Sistema</DialogTitle>
            <DialogDescription className="sr-only">Visualização da logo do sistema.</DialogDescription>
          </DialogHeader>
          <div className="flex justify-center">
            {customizationForm.logo_url && (
              <img
                src={customizationForm.logo_url}
                alt="Logo Preview"
                className="max-w-full max-h-96 object-contain rounded-lg"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Reset Password Modal */}
      <ResetPasswordModal
        user={selectedUserForPassword}
        open={showResetPasswordModal}
        onOpenChange={(open) => {
          setShowResetPasswordModal(open);
          if (!open) setSelectedUserForPassword(null);
        }}
      />
    </div>
  );
};

export default Settings;
