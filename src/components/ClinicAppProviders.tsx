import { AppointmentStatusConfigProvider } from "@/contexts/AppointmentStatusConfigContext";
import { RevenueStatusConfigProvider } from "@/contexts/RevenueStatusConfigContext";
import { ExpenseStatusConfigProvider } from "@/contexts/ExpenseStatusConfigContext";
import { RevenueCategoryConfigProvider } from "@/contexts/RevenueCategoryConfigContext";
import { ExpenseCategoryConfigProvider } from "@/contexts/ExpenseCategoryConfigContext";

/** Configs que consultam o Supabase — só após login (evita requisições na tela de login). */
export function ClinicAppProviders({ children }: { children: React.ReactNode }) {
  return (
    <AppointmentStatusConfigProvider>
      <RevenueStatusConfigProvider>
        <ExpenseStatusConfigProvider>
          <RevenueCategoryConfigProvider>
            <ExpenseCategoryConfigProvider>{children}</ExpenseCategoryConfigProvider>
          </RevenueCategoryConfigProvider>
        </ExpenseStatusConfigProvider>
      </RevenueStatusConfigProvider>
    </AppointmentStatusConfigProvider>
  );
}
