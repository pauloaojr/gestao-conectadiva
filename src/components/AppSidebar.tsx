import {
  Calendar,
  CalendarCheck,
  Home,
  Users,
  FileText,
  Settings,
  Plus,
  Activity,
  Stethoscope,
  UserCog,
  Clock,
  Briefcase,
  Pill,
  Receipt,
  ListOrdered,
  Wallet,
  DollarSign,
  PlugZap,
  FileSearch,
  KeyRound,
} from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useCustomizationContext } from "@/contexts/CustomizationContext";

// Menu items principais
const mainMenuItems = [
  {
    title: "Dashboard",
    url: "/",
    icon: Home,
    permission: 'dashboard' as const,
  },
  {
    title: "Pacientes",
    url: "/pacientes",
    icon: Users,
    permission: 'patients' as const,
  },
  {
    title: "Prontuários",
    url: "/prontuarios",
    icon: Stethoscope,
    permission: 'medicalRecords' as const,
  },
  {
    title: "Agenda",
    url: "/agenda",
    icon: Calendar,
    permission: 'schedule' as const,
  },
  {
    title: "Receituário",
    url: "/receituario",
    icon: Pill,
    permission: 'medicalRecords' as const,
  },
];

// Menu Relatórios (seção com relatórios disponíveis)
const reportsMenuItems = [
  {
    title: "Consultório",
    url: "/relatorios",
    icon: FileText,
    permission: 'reports' as const,
  },
  {
    title: "Agendamentos",
    url: "/relatorios/agendamentos",
    icon: CalendarCheck,
    permission: 'reports' as const,
  },
  {
    title: "Financeiro",
    url: "/relatorios/financeiro",
    icon: DollarSign,
    permission: 'reports' as const,
  },
];

// Menu Financeiro
const financialMenuItems = [
  {
    title: "Receitas",
    url: "/financeiro/receitas",
    icon: Receipt,
    permission: 'financial' as const,
  },
  {
    title: "Despesas",
    url: "/financeiro/despesas",
    icon: Wallet,
    permission: 'financial' as const,
  },
  {
    title: "Configurações",
    url: "/financeiro/configuracoes",
    icon: ListOrdered,
    permission: 'financial' as const,
  },
];

// Menu de gestão
const managementMenuItems = [
  {
    title: "Atendentes",
    url: "/gestao/atendentes",
    icon: UserCog,
    permission: 'userManagement' as const,
  },
  {
    title: "Horários",
    url: "/gestao/horarios",
    icon: Clock,
    permission: 'scheduleManagement' as const,
  },
  {
    title: "Serviços",
    url: "/gestao/servicos",
    icon: Briefcase,
    permission: 'serviceManagement' as const,
  },
];

// Menu de sistema
const systemMenuItems = [
  {
    title: "Configurações",
    url: "/configuracoes",
    icon: Settings,
    permission: 'settings' as const,
  },
  {
    title: "Integrações",
    url: "/integracoes",
    icon: PlugZap,
    permission: 'integrations' as const,
  },
  {
    title: "API",
    url: "/sistema/api",
    icon: KeyRound,
    permission: 'api' as const,
  },
];

// Menu de auditoria
const auditMenuItems = [
  {
    title: "Log",
    url: "/auditoria/log",
    icon: FileSearch,
    permission: 'audit' as const,
  },
];

export function AppSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, hasPermission } = useAuth();
  const { customizationData } = useCustomizationContext();

  // Filter menu items based on user permissions
  const filteredMainMenuItems = mainMenuItems.filter(item => hasPermission(item.permission));
  const filteredReportsMenuItems = reportsMenuItems.filter(item => hasPermission(item.permission));
  const filteredFinancialMenuItems = financialMenuItems.filter(item => hasPermission(item.permission));
  const filteredManagementMenuItems = managementMenuItems.filter(item => hasPermission(item.permission));
  const filteredSystemMenuItems = systemMenuItems.filter(item => hasPermission(item.permission));
  const filteredAuditMenuItems = auditMenuItems.filter(item => hasPermission(item.permission));

  return (
    <Sidebar className="border-r border-border/40 bg-card/30 backdrop-blur-xl">
      <SidebarHeader className="p-6 border-b border-border/40">
        <div className="flex items-center gap-4 group cursor-pointer" onClick={() => navigate('/')}>
          <div className={cn(
            "w-12 h-12 rounded-2xl flex items-center justify-center overflow-hidden shrink-0 shadow-lg transition-transform duration-500 group-hover:rotate-12 group-hover:scale-110",
            customizationData.logoUrl ? "bg-white p-1" : "clinic-gradient"
          )}>
            {customizationData.logoUrl ? (
              <img
                src={customizationData.logoUrl}
                alt="Logo"
                className="w-full h-full object-contain rounded-xl"
              />
            ) : (
              <Activity className="w-6 h-6 text-white" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-base font-black text-foreground truncate tracking-tighter leading-tight italic">
              {customizationData.appName || "Clinica Pro"}
            </h1>
            <p className="text-[10px] uppercase font-bold text-muted-foreground/60 truncate tracking-[0.2em] mt-0.5">
              {customizationData.appSubtitle || "Professional Management"}
            </p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="p-4 pr-1.5 space-y-6">
        {hasPermission('schedule') && (
          <div className="px-2 pr-2.5">
            <Button
              className="w-full clinic-gradient text-white shadow-lg shadow-primary/20 hover:shadow-primary/40 active:scale-95 transition-all duration-300 rounded-xl font-bold py-6"
              onClick={() => navigate('/agenda')}
            >
              <Plus className="w-5 h-5 mr-2" />
              Agendar Consulta
            </Button>
          </div>
        )}

        <SidebarGroup>
          <SidebarGroupLabel className="px-4 text-[10px] font-black text-muted-foreground/50 uppercase tracking-[0.2em] mb-4">
            Navegação
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-1.5">
              {filteredMainMenuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={location.pathname === item.url}
                    className={cn(
                      "group relative px-4 py-6 rounded-xl transition-all duration-300",
                      "hover:bg-primary/5 hover:text-primary",
                      "data-[active=true]:bg-primary/10 data-[active=true]:text-primary data-[active=true]:shadow-sm"
                    )}
                  >
                    <button onClick={() => navigate(item.url)} className="w-full flex items-center gap-3">
                      <div className={cn(
                        "w-8 h-8 rounded-lg flex items-center justify-center transition-colors duration-300",
                        location.pathname === item.url ? "bg-primary/20" : "bg-muted/40 group-hover:bg-primary/10"
                      )}>
                        <item.icon className="w-4 h-4" />
                      </div>
                      <span className="font-bold text-sm tracking-tight">{item.title}</span>
                      {location.pathname === item.url && (
                        <div className="absolute right-2 w-1.5 h-6 bg-primary rounded-full animate-in fade-in zoom-in duration-500" />
                      )}
                    </button>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {filteredFinancialMenuItems.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel className="px-4 text-[10px] font-black text-muted-foreground/50 uppercase tracking-[0.2em] mb-4">
              Financeiro
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="gap-1.5">
                {filteredFinancialMenuItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={location.pathname === item.url}
                      className={cn(
                        "group relative px-4 py-5 rounded-xl transition-all duration-300",
                        "hover:bg-primary/5 hover:text-primary",
                        "data-[active=true]:bg-primary/10 data-[active=true]:text-primary data-[active=true]:shadow-sm"
                      )}
                    >
                      <button onClick={() => navigate(item.url)} className="w-full flex items-center gap-3">
                        <div className={cn(
                          "w-8 h-8 rounded-lg flex items-center justify-center transition-colors duration-300",
                          location.pathname === item.url ? "bg-primary/20" : "bg-muted/40 group-hover:bg-primary/10"
                        )}>
                          <item.icon className="w-4 h-4" />
                        </div>
                        <span className="font-bold text-sm tracking-tight">{item.title}</span>
                        {location.pathname === item.url && (
                          <div className="absolute right-2 w-1.5 h-6 bg-primary rounded-full animate-in fade-in zoom-in duration-500" />
                        )}
                      </button>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {filteredReportsMenuItems.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel className="px-4 text-[10px] font-black text-muted-foreground/50 uppercase tracking-[0.2em] mb-4">
              Relatórios
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="gap-1.5">
                {filteredReportsMenuItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={location.pathname === item.url}
                      className={cn(
                        "group relative px-4 py-5 rounded-xl transition-all duration-300",
                        "hover:bg-primary/5 hover:text-primary",
                        "data-[active=true]:bg-primary/10 data-[active=true]:text-primary data-[active=true]:shadow-sm"
                      )}
                    >
                      <button onClick={() => navigate(item.url)} className="w-full flex items-center gap-3">
                        <div className={cn(
                          "w-8 h-8 rounded-lg flex items-center justify-center transition-colors duration-300",
                          location.pathname === item.url ? "bg-primary/20" : "bg-muted/40 group-hover:bg-primary/10"
                        )}>
                          <item.icon className="w-4 h-4" />
                        </div>
                        <span className="font-bold text-sm tracking-tight">{item.title}</span>
                        {location.pathname === item.url && (
                          <div className="absolute right-2 w-1.5 h-6 bg-primary rounded-full animate-in fade-in zoom-in duration-500" />
                        )}
                      </button>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {filteredManagementMenuItems.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel className="px-4 text-[10px] font-black text-muted-foreground/50 uppercase tracking-[0.2em] mb-4">
              Gestão Técnica
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="gap-1.5">
                {filteredManagementMenuItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={location.pathname === item.url}
                      className={cn(
                        "group relative px-4 py-5 rounded-xl transition-all duration-300",
                        "hover:bg-accent/5 hover:text-accent-foreground",
                        "data-[active=true]:bg-accent/10 data-[active=true]:text-foreground"
                      )}
                    >
                      <button onClick={() => navigate(item.url)} className="w-full flex items-center gap-3">
                        <div className={cn(
                          "w-8 h-8 rounded-lg flex items-center justify-center transition-colors duration-300",
                          location.pathname === item.url ? "bg-accent/20" : "bg-muted/40 group-hover:bg-accent/10"
                        )}>
                          <item.icon className="w-4 h-4" />
                        </div>
                        <span className="font-bold text-sm tracking-tight">{item.title}</span>
                      </button>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {filteredSystemMenuItems.length > 0 && (
          <>
            <SidebarSeparator className="my-3 md:my-4" />

            <SidebarGroup>
              <SidebarGroupLabel className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                Sistema
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {filteredSystemMenuItems.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton
                        asChild
                        isActive={location.pathname === item.url}
                        className="w-full justify-start hover:bg-muted hover:text-foreground data-[active=true]:bg-muted data-[active=true]:text-foreground"
                      >
                        <button onClick={() => navigate(item.url)} className="w-full flex items-center">
                          <item.icon className="w-4 h-4 md:w-5 md:h-5 mr-2 md:mr-3 shrink-0" />
                          <span className="font-medium text-sm truncate">{item.title}</span>
                        </button>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </>
        )}

        {filteredAuditMenuItems.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel className="px-4 text-[10px] font-black text-muted-foreground/50 uppercase tracking-[0.2em] mb-4">
              Auditoria
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="gap-1.5">
                {filteredAuditMenuItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={location.pathname === item.url}
                      className={cn(
                        "group relative px-4 py-5 rounded-xl transition-all duration-300",
                        "hover:bg-primary/5 hover:text-primary",
                        "data-[active=true]:bg-primary/10 data-[active=true]:text-primary data-[active=true]:shadow-sm"
                      )}
                    >
                      <button onClick={() => navigate(item.url)} className="w-full flex items-center gap-3">
                        <div className={cn(
                          "w-8 h-8 rounded-lg flex items-center justify-center transition-colors duration-300",
                          location.pathname === item.url ? "bg-primary/20" : "bg-muted/40 group-hover:bg-primary/10"
                        )}>
                          <item.icon className="w-4 h-4" />
                        </div>
                        <span className="font-bold text-sm tracking-tight">{item.title}</span>
                        {location.pathname === item.url && (
                          <div className="absolute right-2 w-1.5 h-6 bg-primary rounded-full animate-in fade-in zoom-in duration-500" />
                        )}
                      </button>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="p-4 border-t border-border/40 bg-card/50">
        <div className="relative group p-3 rounded-2xl bg-muted/30 border border-border/20 hover:border-primary/30 transition-all duration-300 cursor-pointer overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="relative flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm group-hover:scale-110 transition-transform duration-500 overflow-hidden bg-primary/20">
              {user?.avatar_url ? (
                <img
                  src={user.avatar_url}
                  alt={user.name || 'Foto de perfil'}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-sm font-black text-primary">
                  {user?.name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U'}
                </span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-black text-foreground truncate tracking-tight">{user?.name || 'Usuário'}</p>
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <p className="text-xs font-bold text-muted-foreground/60 uppercase tracking-tighter">
                  {user?.roleDisplayName ?? (user?.role === 'admin' ? 'Administrador' : user?.role === 'manager' ? 'Gerente' : 'Usuário')}
                </p>
              </div>
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg group-hover:bg-primary/20 group-hover:text-primary transition-colors" onClick={() => navigate('/configuracoes')}>
              <Settings className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
