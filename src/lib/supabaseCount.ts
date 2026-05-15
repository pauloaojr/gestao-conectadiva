import type { PostgrestError } from "@supabase/supabase-js";

type CountResult = PromiseLike<{
  count: number | null;
  error: PostgrestError | null;
}>;

/**
 * Contagem exata via GET com range(0,0).
 * Evita `head: true` (requisição HEAD), que pode falhar atrás de alguns proxies em produção.
 */
export async function fetchExactCount(run: () => CountResult): Promise<number> {
  const { count, error } = await run();
  if (error) {
    console.error("fetchExactCount:", error);
    return 0;
  }
  return count ?? 0;
}
