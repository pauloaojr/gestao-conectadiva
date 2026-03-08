import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ ok: false, error: "Method not allowed" }, 405);
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const schedulerToken = Deno.env.get("CRON_SCHEDULER_TOKEN");
    if (!supabaseUrl || !anonKey || !serviceRoleKey || !schedulerToken) {
      return jsonResponse(
        {
          ok: false,
          error:
            "SUPABASE_URL/SUPABASE_ANON_KEY/SUPABASE_SERVICE_ROLE_KEY/CRON_SCHEDULER_TOKEN ausentes.",
        },
        500
      );
    }

    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.replace(/^Bearer\s+/i, "").trim();
    if (!token) {
      return jsonResponse({ ok: false, error: "Unauthorized" }, 401);
    }

    const authClient = createClient(supabaseUrl, anonKey);
    const { data: userData, error: userError } = await authClient.auth.getUser(token);
    if (userError || !userData?.user) {
      return jsonResponse({ ok: false, error: "Unauthorized" }, 401);
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const { data: roleData, error: roleError } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id)
      .maybeSingle();

    if (roleError) {
      return jsonResponse({ ok: false, error: "Erro ao validar permissões." }, 500);
    }

    const userRole = roleData?.role ?? "user";
    if (userRole !== "admin" && userRole !== "manager") {
      return jsonResponse({ ok: false, error: "Forbidden" }, 403);
    }

    const response = await fetch(
      `${supabaseUrl}/functions/v1/notification-scheduler`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-scheduler-token": schedulerToken,
        },
        body: JSON.stringify({ trigger: "manual" }),
      }
    );

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const status = response.status;
      let msg = data?.error || data?.message || response.statusText || "Falha ao acionar scheduler.";
      if (status === 503) {
        msg += " (503: a função notification-scheduler pode estar em crash ou timeout — veja os logs no Dashboard do Supabase)";
      }
      return jsonResponse(
        { ok: false, error: msg },
        status >= 500 ? 500 : status
      );
    }

    return jsonResponse(data, 200);
  } catch (error: any) {
    return jsonResponse(
      { ok: false, error: error?.message || "Erro inesperado ao acionar scheduler." },
      500
    );
  }
});
