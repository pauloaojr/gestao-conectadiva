export const DEFAULT_ESTABLISHMENT_TIMEZONE = "GMT-3";

export type RuntimeTemplateContext = Record<
  string,
  string | number | null | undefined
>;

type RuntimePlaceholderOptions = {
  timezone?: string | null;
};

const WEEKDAY_NAMES = [
  "domingo",
  "segunda-feira",
  "terça-feira",
  "quarta-feira",
  "quinta-feira",
  "sexta-feira",
  "sábado",
];

const MONTH_NAMES = [
  "janeiro",
  "fevereiro",
  "março",
  "abril",
  "maio",
  "junho",
  "julho",
  "agosto",
  "setembro",
  "outubro",
  "novembro",
  "dezembro",
];

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

function parseGmtOffsetMinutes(timezone: string): number | null {
  const normalized = timezone.trim().toUpperCase();
  const match = normalized.match(/^GMT\s*([+-])\s*(\d{1,2})(?::?(\d{2}))?$/);
  if (!match) return null;

  const sign = match[1] === "-" ? -1 : 1;
  const hours = Number.parseInt(match[2], 10);
  const minutes = match[3] ? Number.parseInt(match[3], 10) : 0;
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
  if (hours > 14 || minutes > 59) return null;

  return sign * (hours * 60 + minutes);
}

function parseOffsetFromShortOffsetLabel(label: string): number | null {
  const match = label.match(/^GMT([+-])(\d{1,2})(?::?(\d{2}))?$/i);
  if (!match) return null;
  const sign = match[1] === "-" ? -1 : 1;
  const hours = Number.parseInt(match[2], 10);
  const minutes = match[3] ? Number.parseInt(match[3], 10) : 0;
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
  return sign * (hours * 60 + minutes);
}

function isValidIanaTimezone(timezone: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: timezone }).format(new Date());
    return true;
  } catch {
    return false;
  }
}

export function normalizeTimezoneConfig(
  timezone?: string | null
): string {
  const value = (timezone || "").trim();
  if (!value) return DEFAULT_ESTABLISHMENT_TIMEZONE;
  if (parseGmtOffsetMinutes(value) !== null) return value.toUpperCase().replace(/\s+/g, "");
  if (isValidIanaTimezone(value)) return value;
  return DEFAULT_ESTABLISHMENT_TIMEZONE;
}

export function getDatePartsByTimezone(date: Date, timezone?: string | null) {
  const normalizedTimezone = normalizeTimezoneConfig(timezone);
  const gmtOffsetMinutes = parseGmtOffsetMinutes(normalizedTimezone);

  if (gmtOffsetMinutes !== null) {
    const shifted = new Date(date.getTime() + gmtOffsetMinutes * 60 * 1000);
    return {
      year: shifted.getUTCFullYear(),
      month: shifted.getUTCMonth() + 1,
      day: shifted.getUTCDate(),
      weekday: shifted.getUTCDay(),
      hour: shifted.getUTCHours(),
      minute: shifted.getUTCMinutes(),
    };
  }

  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: normalizedTimezone,
      year: "numeric",
      month: "numeric",
      day: "numeric",
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).formatToParts(date);

    const read = (type: string) =>
      Number.parseInt(parts.find((part) => part.type === type)?.value || "", 10);
    const weekdayRaw = parts.find((part) => part.type === "weekday")?.value || "Sun";
    const weekday =
      weekdayRaw === "Mon"
        ? 1
        : weekdayRaw === "Tue"
        ? 2
        : weekdayRaw === "Wed"
        ? 3
        : weekdayRaw === "Thu"
        ? 4
        : weekdayRaw === "Fri"
        ? 5
        : weekdayRaw === "Sat"
        ? 6
        : 0;

    return {
      year: read("year"),
      month: read("month"),
      day: read("day"),
      weekday,
      hour: read("hour"),
      minute: read("minute"),
    };
  } catch {
    return getDatePartsByTimezone(date, DEFAULT_ESTABLISHMENT_TIMEZONE);
  }
}

function getOffsetMinutesForInstant(date: Date, timezone?: string | null): number {
  const normalizedTimezone = normalizeTimezoneConfig(timezone);
  const staticOffset = parseGmtOffsetMinutes(normalizedTimezone);
  if (staticOffset !== null) return staticOffset;

  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: normalizedTimezone,
      timeZoneName: "shortOffset",
      hour: "2-digit",
      minute: "2-digit",
    }).formatToParts(date);
    const label = parts.find((part) => part.type === "timeZoneName")?.value || "";
    const dynamicOffset = parseOffsetFromShortOffsetLabel(label);
    if (dynamicOffset !== null) return dynamicOffset;
  } catch {
    return parseGmtOffsetMinutes(DEFAULT_ESTABLISHMENT_TIMEZONE) ?? -180;
  }

  return parseGmtOffsetMinutes(DEFAULT_ESTABLISHMENT_TIMEZONE) ?? -180;
}

export function parseDateTimeInTimezone(
  dateISO: string,
  time: string,
  timezone?: string | null
): Date | null {
  const dateMatch = dateISO.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const timeMatch = time.match(/^(\d{2}):(\d{2})(?::(\d{2}))?$/);
  if (!dateMatch || !timeMatch) return null;

  const year = Number.parseInt(dateMatch[1], 10);
  const month = Number.parseInt(dateMatch[2], 10);
  const day = Number.parseInt(dateMatch[3], 10);
  const hour = Number.parseInt(timeMatch[1], 10);
  const minute = Number.parseInt(timeMatch[2], 10);
  const second = Number.parseInt(timeMatch[3] || "0", 10);

  if (
    !Number.isFinite(year) ||
    !Number.isFinite(month) ||
    !Number.isFinite(day) ||
    !Number.isFinite(hour) ||
    !Number.isFinite(minute) ||
    !Number.isFinite(second)
  ) {
    return null;
  }

  let utcMs = Date.UTC(year, month - 1, day, hour, minute, second);
  const normalizedTimezone = normalizeTimezoneConfig(timezone);

  for (let attempt = 0; attempt < 4; attempt += 1) {
    const offsetMinutes = getOffsetMinutesForInstant(new Date(utcMs), normalizedTimezone);
    const adjustedUtcMs =
      Date.UTC(year, month - 1, day, hour, minute, second) - offsetMinutes * 60 * 1000;
    if (Math.abs(adjustedUtcMs - utcMs) < 1000) {
      utcMs = adjustedUtcMs;
      break;
    }
    utcMs = adjustedUtcMs;
  }

  const parsed = new Date(utcMs);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function getGreetingByTimezone(
  date: Date = new Date(),
  timezone?: string | null
): string {
  const { hour } = getDatePartsByTimezone(date, timezone);
  if (hour >= 5 && hour < 12) return "Bom dia";
  if (hour >= 12 && hour < 18) return "Boa tarde";
  return "Boa noite";
}

export function getGreetingByGMTMinus3(date: Date = new Date()): string {
  return getGreetingByTimezone(date, DEFAULT_ESTABLISHMENT_TIMEZONE);
}

export function getCurrentDateByTimezone(
  date: Date = new Date(),
  timezone?: string | null
): string {
  const { day, month, year } = getDatePartsByTimezone(date, timezone);
  return `${pad2(day)}/${pad2(month)}/${year}`;
}

export function getCurrentDateInGMTMinus3(date: Date = new Date()): string {
  return getCurrentDateByTimezone(date, DEFAULT_ESTABLISHMENT_TIMEZONE);
}

export function getCurrentWeekdayByTimezone(
  date: Date = new Date(),
  timezone?: string | null
): string {
  const { weekday } = getDatePartsByTimezone(date, timezone);
  return WEEKDAY_NAMES[weekday] || WEEKDAY_NAMES[0];
}

export function getCurrentWeekdayInGMTMinus3(date: Date = new Date()): string {
  return getCurrentWeekdayByTimezone(date, DEFAULT_ESTABLISHMENT_TIMEZONE);
}

export function getCurrentTimeByTimezone(
  date: Date = new Date(),
  timezone?: string | null
): string {
  const { hour, minute } = getDatePartsByTimezone(date, timezone);
  return `${pad2(hour)}:${pad2(minute)}`;
}

export function getCurrentTimeInGMTMinus3(date: Date = new Date()): string {
  return getCurrentTimeByTimezone(date, DEFAULT_ESTABLISHMENT_TIMEZONE);
}

export function getCurrentMonthByTimezone(
  date: Date = new Date(),
  timezone?: string | null
): string {
  const { month } = getDatePartsByTimezone(date, timezone);
  return MONTH_NAMES[Math.max(0, Math.min(11, month - 1))];
}

export function getCurrentMonthInGMTMinus3(date: Date = new Date()): string {
  return getCurrentMonthByTimezone(date, DEFAULT_ESTABLISHMENT_TIMEZONE);
}

export function getFirstName(fullName: string): string {
  const trimmed = fullName.trim();
  if (!trimmed) return "";
  const [firstName] = trimmed.split(/\s+/);
  return firstName || "";
}

export function withRuntimePlaceholders(
  context: RuntimeTemplateContext,
  options?: RuntimePlaceholderOptions
): RuntimeTemplateContext {
  const timezone = normalizeTimezoneConfig(options?.timezone);
  const hasGreeting = String(context.saudacao ?? "").trim() !== "";
  const hasCurrentDate = String(context.data_atual ?? "").trim() !== "";
  const hasCurrentWeekday = String(context.dia_semana_atual ?? "").trim() !== "";
  const hasCurrentTime = String(context.hora_atual ?? "").trim() !== "";
  const hasCurrentMonth = String(context.mes_atual ?? "").trim() !== "";
  const hasFirstName = String(context.paciente_primeiro_nome ?? "").trim() !== "";

  const patientName = String(context.paciente_nome ?? "").trim();

  return {
    ...context,
    saudacao: hasGreeting ? context.saudacao : getGreetingByTimezone(new Date(), timezone),
    data_atual: hasCurrentDate ? context.data_atual : getCurrentDateByTimezone(new Date(), timezone),
    dia_semana_atual: hasCurrentWeekday
      ? context.dia_semana_atual
      : getCurrentWeekdayByTimezone(new Date(), timezone),
    hora_atual: hasCurrentTime ? context.hora_atual : getCurrentTimeByTimezone(new Date(), timezone),
    mes_atual: hasCurrentMonth ? context.mes_atual : getCurrentMonthByTimezone(new Date(), timezone),
    paciente_primeiro_nome: hasFirstName
      ? context.paciente_primeiro_nome
      : getFirstName(patientName),
  };
}
