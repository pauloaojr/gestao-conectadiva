import React, { createContext, useContext, useMemo } from 'react';
import {
  useFinancialStatusConfig,
  FinancialStatusConfigItem,
} from '@/hooks/useFinancialStatusConfig';

interface ExpenseStatusConfigContextType {
  statuses: FinancialStatusConfigItem[];
  isLoading: boolean;
  getLabel: (key: string) => string;
  refresh: () => Promise<void>;
}

const ExpenseStatusConfigContext = createContext<ExpenseStatusConfigContextType | null>(null);

export const useExpenseStatusConfigContext = () => {
  const ctx = useContext(ExpenseStatusConfigContext);
  if (!ctx) {
    return {
      statuses: [] as FinancialStatusConfigItem[],
      isLoading: false,
      getLabel: (key: string) => key,
      refresh: async () => {},
    };
  }
  return ctx;
};

export const ExpenseStatusConfigProvider = ({ children }: { children: React.ReactNode }) => {
  const { getExpenseStatuses, getLabel: getLabelBase, isLoading, fetchStatuses } = useFinancialStatusConfig();
  const statuses = useMemo(() => getExpenseStatuses(), [getExpenseStatuses]);
  const getLabel = useMemo(() => (key: string) => getLabelBase(key, 'expense'), [getLabelBase]);

  return (
    <ExpenseStatusConfigContext.Provider
      value={{ statuses, isLoading, getLabel, refresh: fetchStatuses }}
    >
      {children}
    </ExpenseStatusConfigContext.Provider>
  );
};
