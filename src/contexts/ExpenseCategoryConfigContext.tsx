import React, { createContext, useContext, useMemo } from 'react';
import {
  useFinancialCategoryConfig,
  FinancialCategoryItem,
} from '@/hooks/useFinancialCategoryConfig';

interface ExpenseCategoryConfigContextType {
  categories: FinancialCategoryItem[];
  isLoading: boolean;
  getLabel: (id: string | null) => string;
  refresh: () => Promise<void>;
}

const ExpenseCategoryConfigContext = createContext<ExpenseCategoryConfigContextType | null>(null);

export const useExpenseCategoryConfigContext = () => {
  const ctx = useContext(ExpenseCategoryConfigContext);
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

export const ExpenseCategoryConfigProvider = ({ children }: { children: React.ReactNode }) => {
  const { getExpenseCategories, getLabel: getLabelBase, isLoading, fetchCategories } = useFinancialCategoryConfig();
  const categories = useMemo(() => getExpenseCategories(), [getExpenseCategories]);
  const getLabel = useMemo(() => (id: string | null) => getLabelBase(id, 'expense'), [getLabelBase]);

  return (
    <ExpenseCategoryConfigContext.Provider
      value={{
        categories,
        isLoading,
        getLabel,
        refresh: fetchCategories,
      }}
    >
      {children}
    </ExpenseCategoryConfigContext.Provider>
  );
};
