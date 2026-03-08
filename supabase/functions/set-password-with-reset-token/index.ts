/**
 * Define a nova senha usando o token JWT gerado pelo admin (reset_user_password).
 * Não depende do Supabase Auth verify — usa nosso próprio JWT assinado com service role.
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import * as jose from 'jsr:@panva/jose@6'

const RESET_TOKEN_EXPIRY = '1h'
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
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const body = await req.json().catch(() => ({}))
    const resetToken = typeof body?.reset_token === 'string' ? body.reset_token.trim() : null
    const newPassword = typeof body?.new_password === 'string' ? body.new_password : null

    if (!resetToken || !newPassword) {
      return new Response(
        JSON.stringify({ error: 'reset_token e new_password são obrigatórios.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (newPassword.length < 8) {
      return new Response(
        JSON.stringify({ error: 'A senha deve ter pelo menos 8 caracteres.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const secret = new TextEncoder().encode(serviceRoleKey)
    let payload: jose.JWTPayload
    try {
      const { payload: p } = await jose.jwtVerify(resetToken, secret, {
        algorithms: ['HS256'],
        maxTokenAge: RESET_TOKEN_EXPIRY,
      })
      payload = p
    } catch {
      return new Response(
        JSON.stringify({ error: 'Link inválido ou expirado. Peça um novo link ao administrador.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const purpose = payload.purpose as string | undefined
    const userId = payload.sub
    if (purpose !== 'password_reset' || !userId || typeof userId !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Token inválido.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseUrl = (Deno.env.get('SUPABASE_URL') ?? '').replace(/\/$/, '')
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      password: newPassword,
      email_confirm: true,
    })
    if (error) {
      console.error('updateUserById error:', error)
      return new Response(
        JSON.stringify({ error: error.message ?? 'Erro ao atualizar senha.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    try {
      await supabaseAdmin.auth.admin.updateUserById(userId, {
        data: { password_changed_at: new Date().toISOString().split('T')[0] },
      })
    } catch {
      // ignorar falha na metadata
    }

    // Usar e-mail canônico de auth.users para signIn (evita falha por diferença de caixa no login posterior)
    const { data: userAfterUpdate } = await supabaseAdmin.auth.admin.getUserById(userId)
    const canonicalEmail = typeof userAfterUpdate?.user?.email === 'string'
      ? userAfterUpdate.user.email.trim().toLowerCase()
      : (typeof payload.email === 'string' ? payload.email.trim().toLowerCase() : null)
    let session: { access_token: string; refresh_token: string; expires_in?: number; expires_at?: number; token_type?: string; user?: unknown } | null = null
    if (canonicalEmail) {
      const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
      const supabaseAnon = createClient(supabaseUrl, anonKey, { auth: { autoRefreshToken: false, persistSession: false } })
      const { data: signInData, error: signInError } = await supabaseAnon.auth.signInWithPassword({
        email: canonicalEmail,
        password: newPassword,
      })
      if (!signInError && signInData?.session?.access_token && signInData?.session?.refresh_token) {
        session = {
          access_token: signInData.session.access_token,
          refresh_token: signInData.session.refresh_token,
          expires_in: signInData.session.expires_in,
          expires_at: signInData.session.expires_at,
          token_type: signInData.session.token_type ?? 'bearer',
          user: signInData.session.user,
        }
      } else {
        console.warn('signInWithPassword after reset failed (password may still be set):', signInError?.message)
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: session ? 'Senha definida. Entrando...' : 'Senha definida. Faça login com seu e-mail e a nova senha.',
        session: session ?? undefined,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (e) {
    console.error('set-password-with-reset-token error:', e)
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : 'Erro ao definir senha.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
