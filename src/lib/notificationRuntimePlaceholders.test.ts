import { describe, expect, it } from "vitest";
import {
  getCurrentDateInGMTMinus3,
  getCurrentDateByTimezone,
  getCurrentMonthInGMTMinus3,
  getCurrentTimeInGMTMinus3,
  getCurrentTimeByTimezone,
  getCurrentWeekdayInGMTMinus3,
  getGreetingByTimezone,
  getFirstName,
  getGreetingByGMTMinus3,
  withRuntimePlaceholders,
} from "@/lib/notificationRuntimePlaceholders";

describe("notificationRuntimePlaceholders", () => {
  it("retorna saudacao correta por faixa de horario em GMT-3", () => {
    expect(getGreetingByGMTMinus3(new Date("2026-03-15T13:00:00.000Z"))).toBe(
      "Bom dia"
    );
    expect(getGreetingByGMTMinus3(new Date("2026-03-15T16:00:00.000Z"))).toBe(
      "Boa tarde"
    );
    expect(getGreetingByGMTMinus3(new Date("2026-03-15T02:00:00.000Z"))).toBe(
      "Boa noite"
    );
  });

  it("formata data, hora, dia da semana e mes no timezone GMT-3", () => {
    const referenceDate = new Date("2026-03-15T13:05:00.000Z");

    expect(getCurrentDateInGMTMinus3(referenceDate)).toBe("15/03/2026");
    expect(getCurrentTimeInGMTMinus3(referenceDate)).toBe("10:05");
    expect(getCurrentWeekdayInGMTMinus3(referenceDate).toLowerCase()).toContain(
      "domingo"
    );
    expect(getCurrentMonthInGMTMinus3(referenceDate).toLowerCase()).toContain(
      "mar"
    );
  });

  it("respeita timezone configurado em GMT customizado", () => {
    const referenceDate = new Date("2026-03-15T13:05:00.000Z");

    expect(getCurrentTimeByTimezone(referenceDate, "GMT+2")).toBe("15:05");
    expect(getCurrentDateByTimezone(referenceDate, "GMT+2")).toBe("15/03/2026");
    expect(getGreetingByTimezone(referenceDate, "GMT+2")).toBe("Boa tarde");
  });

  it("aplica cortes de saudacao corretamente no GMT-3", () => {
    expect(getGreetingByTimezone(new Date("2026-03-15T14:59:00.000Z"), "GMT-3")).toBe(
      "Bom dia"
    );
    expect(getGreetingByTimezone(new Date("2026-03-15T15:00:00.000Z"), "GMT-3")).toBe(
      "Boa tarde"
    );
    expect(getGreetingByTimezone(new Date("2026-03-15T20:59:00.000Z"), "GMT-3")).toBe(
      "Boa tarde"
    );
    expect(getGreetingByTimezone(new Date("2026-03-15T21:00:00.000Z"), "GMT-3")).toBe(
      "Boa noite"
    );
  });

  it("aplica cortes de saudacao corretamente no IANA America/Sao_Paulo", () => {
    expect(
      getGreetingByTimezone(new Date("2026-03-15T14:59:00.000Z"), "America/Sao_Paulo")
    ).toBe("Bom dia");
    expect(
      getGreetingByTimezone(new Date("2026-03-15T15:00:00.000Z"), "America/Sao_Paulo")
    ).toBe("Boa tarde");
    expect(
      getGreetingByTimezone(new Date("2026-03-15T20:59:00.000Z"), "America/Sao_Paulo")
    ).toBe("Boa tarde");
    expect(
      getGreetingByTimezone(new Date("2026-03-15T21:00:00.000Z"), "America/Sao_Paulo")
    ).toBe("Boa noite");
  });

  it("respeita timezone configurado em formato IANA", () => {
    const referenceDate = new Date("2026-03-15T13:05:00.000Z");
    expect(getCurrentTimeByTimezone(referenceDate, "America/Sao_Paulo")).toBe("10:05");
    expect(getGreetingByTimezone(referenceDate, "America/Sao_Paulo")).toBe("Bom dia");
  });

  it("faz fallback para GMT-3 quando timezone invalido", () => {
    const referenceDate = new Date("2026-03-15T13:05:00.000Z");
    expect(getCurrentTimeByTimezone(referenceDate, "fuso-invalido")).toBe("10:05");
  });

  it("extrai primeiro nome corretamente", () => {
    expect(getFirstName("Maria Silva")).toBe("Maria");
    expect(getFirstName("  João   Souza  ")).toBe("João");
    expect(getFirstName("")).toBe("");
  });

  it("injeta placeholders dinamicos faltantes no contexto", () => {
    const context = withRuntimePlaceholders({
      paciente_nome: "Carla Dias",
    });

    expect(String(context.saudacao || "").length).toBeGreaterThan(0);
    expect(String(context.data_atual || "").length).toBeGreaterThan(0);
    expect(String(context.dia_semana_atual || "").length).toBeGreaterThan(0);
    expect(String(context.hora_atual || "").length).toBeGreaterThan(0);
    expect(String(context.mes_atual || "").length).toBeGreaterThan(0);
    expect(context.paciente_primeiro_nome).toBe("Carla");
  });

  it("nao sobrescreve placeholders que ja vieram preenchidos", () => {
    const context = withRuntimePlaceholders({
      paciente_nome: "Pedro Souza",
      paciente_primeiro_nome: "Pedrinho",
      saudacao: "Ola",
      data_atual: "01/01/2026",
      dia_semana_atual: "quinta-feira",
      hora_atual: "08:00",
      mes_atual: "janeiro",
    });

    expect(context.paciente_primeiro_nome).toBe("Pedrinho");
    expect(context.saudacao).toBe("Ola");
    expect(context.data_atual).toBe("01/01/2026");
    expect(context.dia_semana_atual).toBe("quinta-feira");
    expect(context.hora_atual).toBe("08:00");
    expect(context.mes_atual).toBe("janeiro");
  });
});
