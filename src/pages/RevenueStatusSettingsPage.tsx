import { FinancialStatusSettings } from "@/components/settings/FinancialStatusSettings";

const RevenueStatusSettingsPage = () => {
  return (
    <div className="p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Status Financeiro</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Configure os status de Receita e Despesa. Defina em &quot;Aplica-se a&quot; se cada status vale para Receita, Despesa ou Ambos.
        </p>
      </div>
      <FinancialStatusSettings />
    </div>
  );
};

export default RevenueStatusSettingsPage;
