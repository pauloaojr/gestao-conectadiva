const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "0.0.0.0"]);

export function isLoopbackBackendUrl(url: string): boolean {
  try {
    const { hostname } = new URL(url);
    const host = hostname.toLowerCase();
    return LOOPBACK_HOSTS.has(host) || host.endsWith(".localhost");
  } catch {
    return /localhost|127\.0\.0\.1/i.test(url);
  }
}

function normalizeUrl(url: string): string {
  return url.trim().replace(/\/+$/, "");
}

/**
 * URL efetiva do backend Node para chamadas feitas pelo navegador.
 * Em produção, VITE_BACKEND_URL (build) tem prioridade sobre valor salvo no banco,
 * e URLs loopback salvas no banco são ignoradas para evitar CORS para localhost.
 */
export function resolveBackendUrl(configuredInDb?: string | null): string | null {
  const fromEnv = normalizeUrl(String(import.meta.env.VITE_BACKEND_URL ?? ""));
  if (fromEnv) return fromEnv;

  const fromDb = configuredInDb ? normalizeUrl(configuredInDb) : "";
  if (!fromDb) return null;

  if (import.meta.env.PROD && isLoopbackBackendUrl(fromDb)) {
    return null;
  }

  return fromDb;
}
