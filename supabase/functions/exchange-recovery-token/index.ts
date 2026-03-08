/**
 * Troca token_hash de recovery (do link gerado pelo admin) por sessão.
 * Chamado pelo frontend quando o usuário abre o link de redefinir senha.
 * O POST /auth/v1/verify do cliente pode retornar 403; aqui chamamos no servidor.
 */
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Método não permitido' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  try {
    const supabaseUrl = (Deno.env.get('SUPABASE_URL') ?? '').replace(/\/$/, '')
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

    const body = await req.json().catch(() => ({}))
    const tokenHash = typeof body?.token_hash === 'string' ? body.token_hash.trim() : null
    const type = typeof body?.type === 'string' ? body.type : 'recovery'

    if (!tokenHash) {
      return new Response(
        JSON.stringify({ error: 'token_hash é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const verifyUrl = `${supabaseUrl}/auth/v1/verify`
    const payloads = [
      { token_hash: tokenHash, type },
      { token_hash: tokenHash, token: tokenHash, type },
      { token: tokenHash, type },
    ]

    const tryVerify = async (key: string, body: Record<string, unknown>) => {
      const res = await fetch(verifyUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': key,
          'Authorization': `Bearer ${key}`,
        },
        body: JSON.stringify(body),
      })
      const data = await res.json().catch(() => ({}))
      return { res, data }
    }

    let lastError: Record<string, unknown> = {}
    for (const payload of payloads) {
      const { res, data: out } = await tryVerify(anonKey, payload)
      if (res.ok && out?.access_token && out?.refresh_token) {
        return new Response(
          JSON.stringify({
            session: {
              access_token: out.access_token,
              refresh_token: out.refresh_token,
              expires_in: out.expires_in,
              expires_at: out.expires_at,
              token_type: out.token_type ?? 'bearer',
              user: out.user,
            },
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      lastError = out
      if (res.status !== 400 && res.status !== 422) break
    }
    if (serviceRoleKey) {
      for (const payload of payloads) {
        const { res, data: out } = await tryVerify(serviceRoleKey, payload)
        if (res.ok && out?.access_token && out?.refresh_token) {
          return new Response(
            JSON.stringify({
              session: {
                access_token: out.access_token,
                refresh_token: out.refresh_token,
                expires_in: out.expires_in,
                expires_at: out.expires_at,
                token_type: out.token_type ?? 'bearer',
                user: out.user,
              },
            }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
        lastError = out
      }
    }

    const errMsg = lastError?.msg ?? lastError?.error_description ?? lastError?.message ?? 'Link inválido ou expirado. Gere um novo link.'
    return new Response(
      JSON.stringify({ error: errMsg }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (e) {
    console.error('exchange-recovery-token error:', e)
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : 'Erro ao trocar token.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
