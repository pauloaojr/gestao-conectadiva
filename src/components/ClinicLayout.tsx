import { SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { ThemeToggle } from "./ThemeToggle";

interface ClinicLayoutProps {
  children: React.ReactNode;
}

const ClinicLayout = ({ children }: ClinicLayoutProps) => {
  const { user, logout } = useAuth();
  const isMobile = useIsMobile();

  return (
    <>
      <AppSidebar />
      <main className="flex-1 w-full min-w-0">
        <div className="sticky top-0 z-10 bg-background border-b px-3 md:px-6 py-3 md:py-4 flex items-center gap-2 md:gap-4">
          <SidebarTrigger className="text-muted-foreground hover:text-foreground shrink-0" />
          <div className="flex-1 min-w-0" />
          <div className="flex items-center gap-2 md:gap-4">
            {!isMobile && (
              <div className="text-xs md:text-sm text-muted-foreground hidden sm:block">
                {new Date().toLocaleDateString('pt-BR', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </div>
            )}
            <ThemeToggle />
            <div className="flex items-center gap-1 md:gap-2">
              <span className="text-xs md:text-sm text-muted-foreground truncate max-w-[100px] md:max-w-none">
                {isMobile ? user?.name?.split(' ')[0] : `Olá, ${user?.name}`}
              </span>
              <Button 
                variant="ghost" 
                size={isMobile ? "icon" : "sm"}
                onClick={logout}
                className="text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0"
              >
                <LogOut className="w-4 h-4" />
                {!isMobile && <span className="ml-2">Sair</span>}
              </Button>
            </div>
          </div>
        </div>
        <div className="p-3 md:p-4 lg:p-6">
          {children}
        </div>
      </main>
    </>
  );
};

export default ClinicLayout;
