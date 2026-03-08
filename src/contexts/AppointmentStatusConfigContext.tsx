import React, { createContext, useContext } from 'react';
import { useAppointmentStatusConfig, AppointmentStatusConfigItem } from '@/hooks/useAppointmentStatusConfig';

interface AppointmentStatusConfigContextType {
  statuses: AppointmentStatusConfigItem[];
  isLoading: boolean;
  getLabel: (key: string) => string;
  refresh: () => Promise<void>;
}

const AppointmentStatusConfigContext = createContext<AppointmentStatusConfigContextType | null>(null);

export const useAppointmentStatusConfigContext = () => {
  const ctx = useContext(AppointmentStatusConfigContext);
  if (!ctx) {
    return {
      statuses: [],
      isLoading: false,
      getLabel: (key: string) => key,
      refresh: async () => {},
    };
  }
  return ctx;
};

export const AppointmentStatusConfigProvider = ({ children }: { children: React.ReactNode }) => {
  const { statuses, isLoading, getLabel, fetchStatuses } = useAppointmentStatusConfig();

  return (
    <AppointmentStatusConfigContext.Provider
      value={{
        statuses,
        isLoading,
        getLabel,
        refresh: fetchStatuses,
      }}
    >
      {children}
    </AppointmentStatusConfigContext.Provider>
  );
};
