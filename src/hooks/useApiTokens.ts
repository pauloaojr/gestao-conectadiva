import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export type ApiToken = {
  id: string;
  name: string;
  tokenPrefix: string;
  isActive: boolean;
  createdAt: string;
};

async function sha256(text: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function generateToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return "clp_" + Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function rowToToken(row: {
  id: string;
  name: string;
  token_prefix: string;
  is_active: boolean;
  created_at: string;
}): ApiToken {
  return {
    id: row.id,
    name: row.name,
    tokenPrefix: row.token_prefix,
    isActive: row.is_active,
    createdAt: row.created_at,
  };
}

export const useApiTokens = () => {
  const { toast } = useToast();
  const [tokens, setTokens] = useState<ApiToken[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTokens = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const { data, error: fetchError } = await supabase
        .from("api_tokens")
        .select("id, name, token_prefix, is_active, created_at")
        .order("created_at", { ascending: false });

      if (fetchError) throw fetchError;
      setTokens((data ?? []).map(rowToToken));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erro ao carregar tokens.";
      console.error("Error fetching api_tokens:", err);
      setError(message);
      setTokens([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTokens();
  }, [fetchTokens]);

  const createToken = useCallback(
    async (name: string): Promise<string | null> => {
      try {
        const rawToken = generateToken();
        const tokenHash = await sha256(rawToken);
        const tokenPrefix = rawToken.slice(0, 12) + "…";

        const { data, error: insertError } = await supabase
          .from("api_tokens")
          .insert({ name, token_hash: tokenHash, token_prefix: tokenPrefix })
          .select("id, name, token_prefix, is_active, created_at")
          .single();

        if (insertError) throw insertError;
        if (data) setTokens((prev) => [rowToToken(data), ...prev]);
        toast({ title: "Token criado", description: "Copie o token agora. Ele não será exibido novamente." });
        return rawToken;
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Não foi possível criar o token.";
        toast({ title: "Erro", description: message, variant: "destructive" });
        return null;
      }
    },
    [toast]
  );

  const revokeToken = useCallback(
    async (id: string) => {
      try {
        const { error: updateError } = await supabase
          .from("api_tokens")
          .update({ is_active: false })
          .eq("id", id);

        if (updateError) throw updateError;
        setTokens((prev) => prev.map((t) => (t.id === id ? { ...t, isActive: false } : t)));
        toast({ title: "Token revogado", description: "O token não poderá mais ser usado." });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Não foi possível revogar o token.";
        toast({ title: "Erro", description: message, variant: "destructive" });
      }
    },
    [toast]
  );

  return { tokens, isLoading, error, fetchTokens, createToken, revokeToken };
};
