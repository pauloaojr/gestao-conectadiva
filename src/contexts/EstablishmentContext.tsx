
import React, { createContext, useContext, useState } from 'react';

interface EstablishmentData {
  companyName: string;
  tradeName: string;
  cnpj: string;
  subheadline: string;
  address: {
    street: string;
    number: string;
    complement: string;
    neighborhood: string;
    city: string;
    state: string;
    zipCode: string;
  };
  contact: {
    phone: string;
    whatsapp: string;
    email: string;
    website: string;
  };
  description: string;
  logo: string;
}

interface EstablishmentContextType {
  establishmentData: EstablishmentData;
  updateEstablishmentData: (data: Partial<EstablishmentData>) => void;
}

const EstablishmentContext = createContext<EstablishmentContextType | null>(null);

export const useEstablishment = () => {
  const context = useContext(EstablishmentContext);
  if (!context) {
    throw new Error('useEstablishment must be used within an EstablishmentProvider');
  }
  return context;
};

export const EstablishmentProvider = ({ children }: { children: React.ReactNode }) => {
  const [establishmentData, setEstablishmentData] = useState<EstablishmentData>(() => {
    // Try to load from localStorage first
    const stored = localStorage.getItem('clinic_establishment');
    if (stored) {
      return JSON.parse(stored);
    }

    // Default mock data
    return {
      companyName: "Clínica de Psicologia Bem-Estar Ltda",
      tradeName: "Clinica Pro - Gestão Profissional",
      cnpj: "12.345.678/0001-90",
      subheadline: "Sistema de Gestão Médica",
      address: {
        street: "Rua das Flores",
        number: "123",
        complement: "Sala 205",
        neighborhood: "Centro",
        city: "São Paulo",
        state: "SP",
        zipCode: "01234-567"
      },
      contact: {
        phone: "(11) 3456-7890",
        whatsapp: "(11) 99876-5432",
        email: "contato@clinicapro.com.br",
        website: "https://www.clinicapro.com.br"
      },
      description: "Clínica especializada em atendimento psicológico com foco no bem-estar e desenvolvimento pessoal. Nossa equipe oferece tratamentos personalizados em um ambiente acolhedor e profissional.",
      logo: ""
    };
  });

  const updateEstablishmentData = (data: Partial<EstablishmentData>) => {
    const newData = { ...establishmentData, ...data };
    setEstablishmentData(newData);
    localStorage.setItem('clinic_establishment', JSON.stringify(newData));
  };

  return (
    <EstablishmentContext.Provider value={{ establishmentData, updateEstablishmentData }}>
      {children}
    </EstablishmentContext.Provider>
  );
};
