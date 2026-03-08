import {
  NotificationEventKey,
  NotificationService,
} from "@/hooks/useNotificationSettings";
import {
  getCurrentDateByTimezone,
  getCurrentMonthByTimezone,
  getCurrentTimeByTimezone,
  getCurrentWeekdayByTimezone,
  getFirstName,
  getGreetingByTimezone,
} from "@/lib/notificationRuntimePlaceholders";

export const EVENT_OPTIONS: Record<
  NotificationService,
  { value: NotificationEventKey; label: string }[]
> = {
  agenda: [
    { value: "agendamento_criado", label: "Agendamento criado" },
    { value: "agendamento_confirmado", label: "Agendamento confirmado" },
    { value: "agendamento_cancelado", label: "Agendamento cancelado" },
    { value: "lembrete_consulta", label: "Lembrete de consulta" },
  ],
  financeiro: [
    { value: "conta_criada", label: "Conta criada" },
    { value: "conta_vencendo", label: "Conta vencendo" },
    { value: "conta_vencida", label: "Conta vencida" },
    { value: "pagamento_confirmado", label: "Pagamento confirmado" },
  ],
  aniversario: [{ value: "aniversario", label: "Aniversário" }],
};

export const PLACEHOLDERS: Record<NotificationService, string[]> = {
  agenda: [
    "{{saudacao}}",
    "{{paciente_primeiro_nome}}",
    "{{data_atual}}",
    "{{dia_semana_atual}}",
    "{{hora_atual}}",
    "{{mes_atual}}",
    "{{paciente_nome}}",
    "{{profissional_nome}}",
    "{{servico_nome}}",
    "{{data_agendamento}}",
    "{{hora_agendamento}}",
  ],
  financeiro: [
    "{{saudacao}}",
    "{{paciente_primeiro_nome}}",
    "{{data_atual}}",
    "{{dia_semana_atual}}",
    "{{hora_atual}}",
    "{{mes_atual}}",
    "{{paciente_nome}}",
    "{{descricao_conta}}",
    "{{valor}}",
    "{{data_vencimento}}",
    "{{status_pagamento}}",
  ],
  aniversario: [
    "{{saudacao}}",
    "{{data_atual}}",
    "{{dia_semana_atual}}",
    "{{hora_atual}}",
    "{{mes_atual}}",
    "{{paciente_nome}}",
    "{{paciente_primeiro_nome}}",
    "{{profissional_nome}}",
    "{{profissional_primeiro_nome}}",
  ],
};

export function buildSampleContext(
  timezone?: string | null
): Record<NotificationService, Record<string, string>> {
  const saudacao = getGreetingByTimezone(new Date(), timezone);
  const dataAtual = getCurrentDateByTimezone(new Date(), timezone);
  const diaSemanaAtual = getCurrentWeekdayByTimezone(new Date(), timezone);
  const horaAtual = getCurrentTimeByTimezone(new Date(), timezone);
  const mesAtual = getCurrentMonthByTimezone(new Date(), timezone);
  const pacienteAgenda = "Maria Silva";
  const pacienteFinanceiro = "João Souza";

  return {
    agenda: {
      saudacao,
      paciente_primeiro_nome: getFirstName(pacienteAgenda),
      data_atual: dataAtual,
      dia_semana_atual: diaSemanaAtual,
      hora_atual: horaAtual,
      mes_atual: mesAtual,
      paciente_nome: pacienteAgenda,
      profissional_nome: "Dra. Fernanda",
      servico_nome: "Consulta de Retorno",
      data_agendamento: "15/03/2026",
      hora_agendamento: "14:30",
    },
    financeiro: {
      saudacao,
      paciente_primeiro_nome: getFirstName(pacienteFinanceiro),
      data_atual: dataAtual,
      dia_semana_atual: diaSemanaAtual,
      hora_atual: horaAtual,
      mes_atual: mesAtual,
      paciente_nome: pacienteFinanceiro,
      descricao_conta: "Mensalidade Terapia",
      valor: "250,00",
      data_vencimento: "20/03/2026",
      status_pagamento: "Pendente",
    },
    aniversario: {
      saudacao,
      data_atual: dataAtual,
      dia_semana_atual: diaSemanaAtual,
      hora_atual: horaAtual,
      mes_atual: mesAtual,
      paciente_nome: pacienteAgenda,
      paciente_primeiro_nome: getFirstName(pacienteAgenda),
      profissional_nome: "Dra. Fernanda",
      profissional_primeiro_nome: "Fernanda",
    },
  };
}

export function extractTemplateTokens(message: string): string[] {
  const regex = /\{\{([a-zA-Z0-9_]+)\}\}/g;
  const found = new Set<string>();
  let match: RegExpExecArray | null;

  while ((match = regex.exec(message)) !== null) {
    found.add(`{{${match[1]}}}`);
  }

  return Array.from(found);
}

export function renderTemplatePreview(
  template: string,
  context: Record<string, string>
): string {
  return template.replace(/\{\{([a-zA-Z0-9_]+)\}\}/g, (_, key: string) => {
    const value = context[key];
    return value ?? `{{${key}}}`;
  });
}
