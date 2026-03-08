type PlaceholderValue = string | number | null | undefined;

export type FinancialPlaceholderContext = {
  valor?: PlaceholderValue;
  data_vencimento?: PlaceholderValue;
  status_pagamento?: PlaceholderValue;
};

export function formatBrazilianNumberNoCurrency(value: PlaceholderValue): string {
  const raw = String(value ?? "").trim();
  if (!raw) return "";

  const normalized =
    raw.includes(",") && raw.includes(".")
      ? raw.replace(/\./g, "").replace(",", ".")
      : raw.includes(",")
      ? raw.replace(",", ".")
      : raw;
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed)) return raw;

  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(parsed);
}

export function formatDateToBrazilian(value: PlaceholderValue): string {
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  const isoMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    return `${isoMatch[3]}/${isoMatch[2]}/${isoMatch[1]}`;
  }
  return raw;
}

export function normalizeFinancialContextPlaceholders<T extends Record<string, unknown>>(
  context: T,
  statusLabel?: string
): T {
  return {
    ...context,
    valor: formatBrazilianNumberNoCurrency(context.valor as PlaceholderValue),
    data_vencimento: formatDateToBrazilian(context.data_vencimento as PlaceholderValue),
    status_pagamento:
      statusLabel?.trim() || String((context as FinancialPlaceholderContext).status_pagamento ?? ""),
  } as T;
}
