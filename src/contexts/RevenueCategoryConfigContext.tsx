import React, { createContext, useContext, useMemo } from 'react';
import {
  useFinancialCategoryConfig,
  FinancialCategoryItem,
} from '@/hooks/useFinancialCategoryConfig';

interface RevenueCategoryConfigContextType {
  categories: FinancialCategoryItem[];
  isLoading: boolean;
  getLabel: (id: string | null) => string;
  refresh: () => Promise<void>;
}

const RevenueCategoryConfigContext = createContext<RevenueCategoryConfigContextType | null>(null);

export const useRevenueCategoryConfigContext = () => {
  const ctx = useContext(RevenueCategoryConfigContext);
  if (!ctx) {
    return {
      categories: [] as FinancialCategoryItem[],
      isLoading: false,
      getLabel: (_id: string | null) => '—',
      refresh: async () => {},
    };
  }
  return ctx;
};

export const RevenueCategoryConfigProvider = ({ children }: { children: React.ReactNode }) => {
  const { getRevenueCategories, getLabel: getLabelBase, isLoading, fetchCategories } = useFinancialCategoryConfig();
  const categories = useMemo(() => getRevenueCategories(), [getRevenueCategories]);
  const getLabel = useMemo(() => (id: string | null) => getLabelBase(id, 'revenue'), [getLabelBase]);

  return (
    <RevenueCategoryConfigContext.Provider
      value={{
        categories,
        isLoading,
        getLabel,
        refresh: fetchCategories,
      }}
    >
      {children}
    </RevenueCategoryConfigContext.Provider>
  );
};
