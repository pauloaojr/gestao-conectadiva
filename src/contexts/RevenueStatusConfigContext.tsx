import React, { createContext, useContext, useMemo } from 'react';
import {
  useFinancialStatusConfig,
  FinancialStatusConfigItem,
} from '@/hooks/useFinancialStatusConfig';

interface RevenueStatusConfigContextType {
  statuses: FinancialStatusConfigItem[];
  isLoading: boolean;
  getLabel: (key: string) => string;
  refresh: () => Promise<void>;
}

const RevenueStatusConfigContext = createContext<RevenueStatusConfigContextType | null>(null);

export const useRevenueStatusConfigContext = () => {
  const ctx = useContext(RevenueStatusConfigContext);
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

export const RevenueStatusConfigProvider = ({ children }: { children: React.ReactNode }) => {
  const { getRevenueStatuses, getLabel: getLabelBase, isLoading, fetchStatuses } = useFinancialStatusConfig();
  const statuses = useMemo(() => getRevenueStatuses(), [getRevenueStatuses]);
  const getLabel = useMemo(() => (key: string) => getLabelBase(key, 'revenue'), [getLabelBase]);

  return (
    <RevenueStatusConfigContext.Provider
      value={{
        statuses,
        isLoading,
        getLabel,
        refresh: fetchStatuses,
      }}
    >
      {children}
    </RevenueStatusConfigContext.Provider>
  );
};
