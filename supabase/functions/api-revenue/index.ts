import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-api-key",
  "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
};

type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

function jsonResponse(data: Json, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function errorResponse(message: string, status: number) {
  return jsonResponse({ error: message }, status);
}

async function sha256(text: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function validateApiToken(
  req: Request,
  supabase: ReturnType<typeof createClient>
): Promise<boolean> {
  const apiKey = req.headers.get("x-api-key");
  const authHeader = req.headers.get("authorization");
  const token =
    apiKey ?? (authHeader?.startsWith("Bearer ") ? authHeader.slice(7).trim() : null);
  if (!token) return false;

  const hash = await sha256(token);
  const { data, error } = await supabase
    .from("api_tokens")
    .select("id")
    .eq("token_hash", hash)
    .eq("is_active", true)
    .maybeSingle();

  return !error && !!data;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    if (!serviceRoleKey) {
      console.error("SUPABASE_SERVICE_ROLE_KEY ausente");
      return errorResponse("Configuração do servidor inválida", 500);
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
      global: { headers: { Authorization: `Bearer ${serviceRoleKey}` } },
    });

    const isValid = await validateApiToken(req, supabase);
    if (!isValid) return errorResponse("Token de API inválido ou expirado", 401);

    const url = new URL(req.url);
    const id = url.searchParams.get("id");
    const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1", 10));
    const limit = Math.min(50, Math.max(1, parseInt(url.searchParams.get("limit") ?? "20", 10)));
    const search = url.searchParams.get("search")?.trim() ?? "";
    const offset = (page - 1) * limit;

    switch (req.method) {
      case "GET": {
        if (id) {
          const { data, error } = await supabase
            .from("revenue")
            .select("*")
            .eq("id", id)
            .maybeSingle();

          if (error) {
            console.error("Error fetching revenue:", error);
            return errorResponse("Erro ao buscar receita", 500);
          }
          if (!data) return errorResponse("Receita não encontrada", 404);
          return jsonResponse(data);
        }

        let query = supabase
          .from("revenue")
          .select("id, amount, description, revenue_date, status, patient_id, patient_name, category_id, created_at, updated_at", { count: "exact" });

        if (search) {
          const term = search.replace(/[%_]/g, "\\$&");
          query = query.or(`description.ilike.%${term}%,patient_name.ilike.%${term}%`);
        }

        const { data, error, count } = await query
          .order("revenue_date", { ascending: false })
          .range(offset, offset + limit - 1);

        if (error) {
          console.error("Error listing revenue:", error);
          return errorResponse("Erro ao listar receitas", 500);
        }

        return jsonResponse({
          data: data ?? [],
          meta: { page, limit, total: count ?? 0, total_pages: Math.ceil((count ?? 0) / limit) },
        });
      }

      case "POST": {
        const body = await req.json().catch(() => ({})) as Record<string, unknown>;
        const amount = body.amount as number | undefined;
        if (amount === undefined || typeof amount !== "number" || amount < 0) {
          return errorResponse("Campo 'amount' é obrigatório e deve ser um número >= 0", 400);
        }

        const insert: Record<string, unknown> = {
          amount,
          description: (body.description as string) ?? "",
          revenue_date: body.revenue_date ?? new Date().toISOString().slice(0, 10),
          status: body.status ?? "pending",
          patient_id: body.patient_id ?? null,
          patient_name: body.patient_name ?? null,
          category_id: body.category_id ?? null,
        };

        const { data, error } = await supabase
          .from("revenue")
          .insert(insert)
          .select()
          .single();

        if (error) {
          console.error("Error creating revenue:", error);
          return jsonResponse(
            { error: "Erro ao criar receita", details: error.message, code: error.code },
            500
          );
        }
        return jsonResponse(data, 201);
      }

      case "PUT":
      case "PATCH": {
        if (!id) return errorResponse("Parâmetro 'id' é obrigatório para atualização", 400);

        const body = await req.json().catch(() => ({})) as Record<string, unknown>;
        const update: Record<string, unknown> = {};
        const allowed = ["amount", "description", "revenue_date", "status", "patient_id", "patient_name", "category_id"];
        for (const k of allowed) {
          if (body[k] !== undefined) update[k] = body[k];
        }

        if (Object.keys(update).length === 0) {
          return errorResponse("Nenhum campo para atualizar", 400);
        }

        const { data, error } = await supabase
          .from("revenue")
          .update(update)
          .eq("id", id)
          .select()
          .maybeSingle();

        if (error) {
          console.error("Error updating revenue:", error);
          return jsonResponse(
            { error: "Erro ao atualizar receita", details: error.message, code: error.code },
            500
          );
        }
        if (!data) return errorResponse("Receita não encontrada", 404);
        return jsonResponse(data);
      }

      case "DELETE": {
        if (!id) return errorResponse("Parâmetro 'id' é obrigatório para exclusão", 400);

        const { data: deleted, error } = await supabase
          .from("revenue")
          .delete()
          .eq("id", id)
          .select("id");

        if (error) {
          console.error("Error deleting revenue:", error);
          return jsonResponse(
            { error: "Erro ao excluir receita", details: error.message, code: error.code },
            500
          );
        }
        if (!deleted || deleted.length === 0) return errorResponse("Receita não encontrada", 404);
        return jsonResponse({ message: "Receita excluída com sucesso" }, 200);
      }

      default:
        return errorResponse("Método não permitido", 405);
    }
  } catch (err) {
    console.error("Unexpected error:", err);
    return errorResponse("Erro interno no servidor", 500);
  }
});
