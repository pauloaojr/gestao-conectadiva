import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface CustomizationData {
  id: string | null;
  appName: string;
  appSubtitle: string;
  logoUrl: string;
  primaryColor: string;
  sidebarStyle: string;
  /** Se false, a tela de login não exibe a aba de cadastro. Definido pela empresa no banco. */
  allowRegistrations: boolean;
}

interface CustomizationContextType {
  customizationData: CustomizationData;
  isLoading: boolean;
  refreshCustomization: () => Promise<void>;
}

const defaultData: CustomizationData = {
  id: null,
  appName: 'Clinica Pro - Gestão Profissional',
  appSubtitle: 'Sistema de Gestão Médica',
  logoUrl: '',
  primaryColor: '#3B82F6',
  sidebarStyle: 'default',
  allowRegistrations: true,
};

const CustomizationContext = createContext<CustomizationContextType | null>(null);
const BOOTSTRAP_TIMEOUT_MS = 8000;
const RETRY_DELAY_MS = 600;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> {
  let timeoutId: number | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = window.setTimeout(
      () => reject(new Error(`${label} timeout após ${timeoutMs}ms`)),
      timeoutMs
    );
  });

  try {
    return (await Promise.race([promise, timeoutPromise])) as T;
  } finally {
    if (timeoutId !== undefined) {
      window.clearTimeout(timeoutId);
    }
  }
}

export const useCustomizationContext = () => {
  const context = useContext(CustomizationContext);
  if (!context) {
    throw new Error('useCustomizationContext must be used within a CustomizationProvider');
  }
  return context;
};

export const CustomizationProvider = ({ children }: { children: React.ReactNode }) => {
  const [customizationData, setCustomizationData] = useState<CustomizationData>(defaultData);
  const [isLoading, setIsLoading] = useState(true);

  const fetchCustomization = useCallback(async () => {
    try {
      for (let attempt = 1; attempt <= 2; attempt += 1) {
        try {
          const { data, error } = await withTimeout(
            supabase.from('customization').select('*').limit(1).maybeSingle(),
            BOOTSTRAP_TIMEOUT_MS,
            'fetchCustomization'
          );

          if (error) {
            throw error;
          }

          if (data) {
            setCustomizationData({
              id: data.id,
              appName: data.app_name || defaultData.appName,
              appSubtitle: data.app_subtitle || defaultData.appSubtitle,
              logoUrl: data.logo_url || '',
              primaryColor: data.primary_color || defaultData.primaryColor,
              sidebarStyle: data.sidebar_style || defaultData.sidebarStyle,
              allowRegistrations: data.allow_registrations !== false,
            });
          }
          return;
        } catch (attemptError) {
          if (attempt === 2) {
            throw attemptError;
          }
          await sleep(RETRY_DELAY_MS);
        }
      }
    } catch (err) {
      console.error('Error in fetchCustomization:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCustomization();
  }, [fetchCustomization]);

  useEffect(() => {
    if (customizationData.primaryColor) {
      document.documentElement.style.setProperty('--primary-hex', customizationData.primaryColor);

      // Se quiser converter para HSL para compatibilidade total com shadcn:
      const hex = customizationData.primaryColor.replace('#', '');
      const r = parseInt(hex.substring(0, 2), 16) / 255;
      const g = parseInt(hex.substring(2, 4), 16) / 255;
      const b = parseInt(hex.substring(4, 6), 16) / 255;
      const max = Math.max(r, g, b), min = Math.min(r, g, b);
      let h = 0, s, l = (max + min) / 2;
      if (max === min) { h = s = 0; } else {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
          case r: h = (g - b) / d + (g < b ? 6 : 0); break;
          case g: h = (b - r) / d + 2; break;
          case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
      }
      const hDeg = Math.round(h * 360);
      const sPct = Math.round(s * 100);
      const lPct = Math.round(l * 100);
      document.documentElement.style.setProperty('--primary', `${hDeg} ${sPct}% ${lPct}%`);
    }
  }, [customizationData.primaryColor]);

  const refreshCustomization = async () => {
    setIsLoading(true);
    await fetchCustomization();
  };

  return (
    <CustomizationContext.Provider value={{ customizationData, isLoading, refreshCustomization }}>
      {children}
    </CustomizationContext.Provider>
  );
};
