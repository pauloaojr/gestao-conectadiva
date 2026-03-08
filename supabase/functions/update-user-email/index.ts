/**
 * Atualiza o e-mail do usuário em auth.users (Authentication).
 * Usado quando o administrador altera o e-mail do atendente em profiles, para manter Auth e profiles sincronizados.
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import * as jose from 'jsr:@panva/jose@6'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SUPABASE_JWT_ISSUER = () =>
  Deno.env.get('SB_JWT_ISSUER') ?? `${Deno.env.get('SUPABASE_URL')}/auth/v1`
const SUPABASE_JWT_KEYS = () =>
  jose.createRemoteJWKSet(
    new URL(`${Deno.env.get('SUPABASE_URL')}/auth/v1/.well-known/jwks.json`)
  )

function getAuthToken(req: Request): string | null {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return null
  const [bearer, token] = authHeader.trim().split(/\s+/)
  if (bearer?.toLowerCase() !== 'bearer' || !token) return null
  return token
}

async function verifySupabaseJWT(token: string): Promise<{ sub: string } | null> {
  try {
    const issuer = SUPABASE_JWT_ISSUER()
    const keys = SUPABASE_JWT_KEYS()
    const { payload } = await jose.jwtVerify(token, keys, { issuer })
    const sub = payload.sub as string | undefined
    return sub ? { sub } : null
  } catch {
    return null
  }
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
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const token = getAuthToken(req)
    if (!token) {
      return new Response(
        JSON.stringify({ error: 'Não autorizado. Envie o token no header Authorization.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const claims = await verifySupabaseJWT(token)
    if (!claims) {
      return new Response(
        JSON.stringify({
          error: 'Sua sessão expirou ou o token é inválido. Faça login novamente.',
        }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { data: userRole, error: roleError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', claims.sub)
      .maybeSingle()

    if (roleError || !userRole || !['admin', 'manager'].includes(userRole.role)) {
      return new Response(
        JSON.stringify({ error: 'Permissão negada. Apenas administradores ou gerentes podem alterar e-mail de usuários.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const body = await req.json().catch(() => ({}))
    const authUserId = typeof body?.auth_user_id === 'string' ? body.auth_user_id.trim() : null
    const newEmail = typeof body?.new_email === 'string' ? body.new_email.trim() : null

    if (!authUserId || !newEmail) {
      return new Response(
        JSON.stringify({ error: 'auth_user_id e new_email são obrigatórios.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const emailLower = newEmail.toLowerCase()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailLower)) {
      return new Response(
        JSON.stringify({ error: 'E-mail inválido.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { error } = await supabaseAdmin.auth.admin.updateUserById(authUserId, {
      email: emailLower,
      email_confirm: true,
    })

    if (error) {
      console.error('updateUserById email error:', error)
      return new Response(
        JSON.stringify({ error: error.message ?? 'Erro ao atualizar e-mail no Authentication.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ success: true, message: 'E-mail atualizado no Authentication.' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (e) {
    console.error('update-user-email error:', e)
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : 'Erro ao atualizar e-mail.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
