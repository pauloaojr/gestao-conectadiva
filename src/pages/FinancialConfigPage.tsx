import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FinancialStatusSettings } from "@/components/settings/FinancialStatusSettings";
import { FinancialCategorySettings } from "@/components/settings/FinancialCategorySettings";
import { ListOrdered, FolderTree } from "lucide-react";

const FinancialConfigPage = () => {
  return (
    <div className="p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Configurações do Financeiro</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Configure status e categorias para Receitas e Despesas.
        </p>
      </div>
      <Tabs defaultValue="categorias" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="categorias" className="flex items-center gap-2">
            <FolderTree className="w-4 h-4" />
            Categorias
          </TabsTrigger>
          <TabsTrigger value="status" className="flex items-center gap-2">
            <ListOrdered className="w-4 h-4" />
            Status
          </TabsTrigger>
        </TabsList>
        <TabsContent value="categorias" className="mt-6">
          <FinancialCategorySettings />
        </TabsContent>
        <TabsContent value="status" className="mt-6">
          <FinancialStatusSettings />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default FinancialConfigPage;
