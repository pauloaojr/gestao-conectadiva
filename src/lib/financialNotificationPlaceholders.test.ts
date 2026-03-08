import { describe, expect, it } from "vitest";
import {
  formatBrazilianNumberNoCurrency,
  formatDateToBrazilian,
  normalizeFinancialContextPlaceholders,
} from "./financialNotificationPlaceholders";

describe("financialNotificationPlaceholders", () => {
  describe("formatBrazilianNumberNoCurrency", () => {
    it("formata valor inteiro", () => {
      expect(formatBrazilianNumberNoCurrency(130)).toBe("130,00");
    });

    it("formata valor decimal com ponto", () => {
      expect(formatBrazilianNumberNoCurrency("130.5")).toBe("130,50");
    });

    it("formata valor decimal com vírgula", () => {
      expect(formatBrazilianNumberNoCurrency("130,5")).toBe("130,50");
    });

    it("mantém milhar brasileiro", () => {
      expect(formatBrazilianNumberNoCurrency("1.234,56")).toBe("1.234,56");
    });

    it("retorna valor original quando inválido", () => {
      expect(formatBrazilianNumberNoCurrency("abc")).toBe("abc");
    });
  });

  describe("formatDateToBrazilian", () => {
    it("converte data ISO para dd/MM/yyyy", () => {
      expect(formatDateToBrazilian("2026-02-27")).toBe("27/02/2026");
    });

    it("mantém formato não ISO", () => {
      expect(formatDateToBrazilian("27/02/2026")).toBe("27/02/2026");
    });
  });

  describe("normalizeFinancialContextPlaceholders", () => {
    it("normaliza contexto financeiro com label traduzida", () => {
      const result = normalizeFinancialContextPlaceholders(
        {
          valor: "130",
          data_vencimento: "2026-02-27",
          status_pagamento: "pending",
          qualquer: "x",
        },
        "Pendente"
      );

      expect(result.valor).toBe("130,00");
      expect(result.data_vencimento).toBe("27/02/2026");
      expect(result.status_pagamento).toBe("Pendente");
      expect(result.qualquer).toBe("x");
    });

    it("mantém status original quando label não for informada", () => {
      const result = normalizeFinancialContextPlaceholders({
        valor: "130",
        data_vencimento: "2026-02-27",
        status_pagamento: "pending",
      });

      expect(result.status_pagamento).toBe("pending");
    });
  });
});
