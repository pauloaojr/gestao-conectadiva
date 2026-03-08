const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function jsonResponse(data: object, status: number) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  return jsonResponse(
    {
      success: false,
      error: "Use o backend de e-mail",
      details:
        "O teste e o envio de e-mails são feitos pelo backend (pasta backend/). Configure a URL do backend na tela Integrações → Email e use os botões Testar e Enviar teste.",
    },
    200
  );
});
