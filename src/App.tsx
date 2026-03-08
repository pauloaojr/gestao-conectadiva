import { useState, useEffect, useRef } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HashRouter, Routes, Route } from "react-router-dom";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AuthProvider } from "@/contexts/AuthContext";
import { EstablishmentProvider } from "@/contexts/EstablishmentContext";
import { CustomizationProvider } from "@/contexts/CustomizationContext";
import { AppointmentStatusConfigProvider } from "@/contexts/AppointmentStatusConfigContext";
import { RevenueStatusConfigProvider } from "@/contexts/RevenueStatusConfigContext";
import { ExpenseStatusConfigProvider } from "@/contexts/ExpenseStatusConfigContext";
import { RevenueCategoryConfigProvider } from "@/contexts/RevenueCategoryConfigContext";
import { ExpenseCategoryConfigProvider } from "@/contexts/ExpenseCategoryConfigContext";
import { ThemeProvider } from "@/components/ThemeProvider";
import ProtectedRoute from "@/components/ProtectedRoute";
import ClinicLayout from "./components/ClinicLayout";
import Dashboard from "./pages/Dashboard";
import Patients from "./pages/Patients";
import Schedule from "./pages/Schedule";
import Reports from "./pages/Reports";
import ReportsAppointments from "./pages/ReportsAppointments";
import ReportsFinancial from "./pages/ReportsFinancial";
import Settings from "./pages/Settings";
import MedicalRecords from "./pages/MedicalRecords";
import Prescriptions from "./pages/Prescriptions";
import UserManagement from "./pages/UserManagement";
import ScheduleManagement from "./pages/ScheduleManagement";
import ServiceManagement from "./pages/ServiceManagement";
import Revenue from "./pages/Revenue";
import Expenses from "./pages/Expenses";
import FinancialConfigPage from "./pages/FinancialConfigPage";
import Integrations from "./pages/Integrations";
import ApiManagement from "./pages/ApiManagement";
import AuditLog from "./pages/AuditLog";
import SetPasswordFromRecovery from "./pages/SetPasswordFromRecovery";
import { RecoveryLinkExpired } from "./components/RecoveryLinkExpired";
import { Navigate } from "react-router-dom";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function AppContent() {
  const [hash, setHash] = useState(() => (typeof window !== "undefined" ? window.location.hash : ""));
  const [search] = useState(() => (typeof window !== "undefined" ? window.location.search : ""));
  const recoveryLockRef = useRef(false);

  useEffect(() => {
    const onHash = () => setHash(window.location.hash);
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  const hasRecoveryInUrl =
    hash.includes("type=recovery") ||
    search.includes("type=recovery") ||
    hash.includes("type=magiclink") ||
    search.includes("type=magiclink") ||
    hash.includes("token_hash=") ||
    search.includes("token_hash=") ||
    hash.includes("reset_token=") ||
    search.includes("reset_token=");
  const hasRecoveryError =
    hash.includes("error_code=otp_expired") ||
    search.includes("error_code=otp_expired") ||
    hash.includes("error_description=") && (hash.includes("expired") || hash.includes("invalid"));
  if (hasRecoveryInUrl) recoveryLockRef.current = true;
  const isRecovery = recoveryLockRef.current || hasRecoveryInUrl;

  const handleRecoveryDone = () => {
    recoveryLockRef.current = false;
    setHash(typeof window !== "undefined" ? window.location.hash : "");
  };

  const handleRecoveryExpiredGoToLogin = () => {
    if (typeof window !== "undefined") {
      window.history.replaceState(null, "", window.location.pathname + window.location.search);
      setHash("");
    }
  };

  if (hasRecoveryError) {
    return <RecoveryLinkExpired onGoToLogin={handleRecoveryExpiredGoToLogin} />;
  }

  if (isRecovery) {
    return <SetPasswordFromRecovery onDone={handleRecoveryDone} />;
  }

  return (
    <EstablishmentProvider>
            <CustomizationProvider>
              <AppointmentStatusConfigProvider>
                <RevenueStatusConfigProvider>
                <ExpenseStatusConfigProvider>
                <RevenueCategoryConfigProvider>
                <ExpenseCategoryConfigProvider>
                <SidebarProvider>
                <HashRouter>
                  <div className="min-h-screen flex w-full">
                    <ProtectedRoute>
                      <ClinicLayout>
                        <Routes>
                          <Route path="/" element={<Dashboard />} />
                          <Route path="/pacientes" element={<Patients />} />
                          <Route
                            path="/prontuarios"
                            element={
                              <ProtectedRoute requiredPermission="medicalRecords">
                                <MedicalRecords />
                              </ProtectedRoute>
                            }
                          />
                          <Route path="/agenda" element={<Schedule />} />
                          <Route
                            path="/relatorios"
                            element={
                              <ProtectedRoute requiredPermission="reports">
                                <Reports />
                              </ProtectedRoute>
                            }
                          />
                          <Route
                            path="/relatorios/agendamentos"
                            element={
                              <ProtectedRoute requiredPermission="reports">
                                <ReportsAppointments />
                              </ProtectedRoute>
                            }
                          />
                          <Route
                            path="/relatorios/financeiro"
                            element={
                              <ProtectedRoute requiredPermission="reports">
                                <ReportsFinancial />
                              </ProtectedRoute>
                            }
                          />
                          <Route
                            path="/receituario"
                            element={
                              <ProtectedRoute requiredPermission="medicalRecords">
                                <Prescriptions />
                              </ProtectedRoute>
                            }
                          />
                          <Route
                            path="/gestao/atendentes"
                            element={
                              <ProtectedRoute requiredPermission="userManagement">
                                <UserManagement />
                              </ProtectedRoute>
                            }
                          />
                          <Route
                            path="/gestao/horarios"
                            element={
                              <ProtectedRoute requiredPermission="scheduleManagement">
                                <ScheduleManagement />
                              </ProtectedRoute>
                            }
                          />
                          <Route
                            path="/gestao/servicos"
                            element={
                              <ProtectedRoute requiredPermission="serviceManagement">
                                <ServiceManagement />
                              </ProtectedRoute>
                            }
                          />
                          <Route path="/configuracoes" element={<Settings />} />
                          <Route
                            path="/integracoes"
                            element={
                              <ProtectedRoute requiredPermission="integrations">
                                <Integrations />
                              </ProtectedRoute>
                            }
                          />
                          <Route
                            path="/sistema/api"
                            element={
                              <ProtectedRoute requiredPermission="api">
                                <ApiManagement />
                              </ProtectedRoute>
                            }
                          />
                          <Route
                            path="/financeiro/receitas"
                            element={
                              <ProtectedRoute requiredPermission="financial">
                                <Revenue />
                              </ProtectedRoute>
                            }
                          />
                          <Route
                            path="/financeiro/despesas"
                            element={
                              <ProtectedRoute requiredPermission="financial">
                                <Expenses />
                              </ProtectedRoute>
                            }
                          />
                          <Route
                            path="/financeiro/status"
                            element={<Navigate to="/financeiro/configuracoes" replace />}
                          />
                          <Route
                            path="/financeiro/configuracoes"
                            element={
                              <ProtectedRoute requiredPermission="financial">
                                <FinancialConfigPage />
                              </ProtectedRoute>
                            }
                          />
                          <Route
                            path="/auditoria/log"
                            element={
                              <ProtectedRoute requiredPermission="audit">
                                <AuditLog />
                              </ProtectedRoute>
                            }
                          />
                          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                          <Route path="*" element={<NotFound />} />
                        </Routes>
                      </ClinicLayout>
                    </ProtectedRoute>
                  </div>
                </HashRouter>
                </SidebarProvider>
                </ExpenseCategoryConfigProvider>
                </RevenueCategoryConfigProvider>
                </ExpenseStatusConfigProvider>
                </RevenueStatusConfigProvider>
              </AppointmentStatusConfigProvider>
            </CustomizationProvider>
    </EstablishmentProvider>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
