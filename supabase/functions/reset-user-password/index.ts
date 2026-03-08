import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import * as jose from 'jsr:@panva/jose@6'

const RESET_TOKEN_EXPIRY = '1h'

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
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    // Create admin client with service role
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    // Verify the requesting user is authenticated (JWT via JWKS, compatible with new signing keys)
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

    const requestingUserId = claims.sub

    // Check if requesting user is admin or manager
    const { data: userRole, error: roleError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', requestingUserId)
      .maybeSingle()

    if (roleError) {
      console.error('Role check error:', roleError)
    }

    if (!userRole || !['admin', 'manager'].includes(userRole.role)) {
      return new Response(
        JSON.stringify({ error: 'Permissão negada. Apenas administradores podem resetar senhas.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get user data from request body (userId, email, newPassword, redirectTo, onlyGenerateLink)
    const { userId, email, newPassword, redirectTo, onlyGenerateLink } = await req.json()

    let targetAuthUserId: string | null = userId || null
    let targetEmail: string | null = (email && typeof email === 'string' && email.trim()) ? String(email).trim() : null

    // Se tiver email, buscar usuário em auth por email para garantir que atualizamos a conta certa
    if (targetEmail) {
      const { data: listData } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 })
      const userByEmail = listData?.users?.find(
        (u) => u.email?.toLowerCase() === targetEmail!.toLowerCase()
      )
      if (userByEmail) {
        targetAuthUserId = userByEmail.id
      }
    }

    if (!targetAuthUserId) {
      return new Response(
        JSON.stringify({
          error: 'Usuário não encontrado. Informe o ID do usuário (auth) ou o e-mail.',
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Obter e-mail canônico de auth.users (evita "user email not found" quando profile tem e-mail diferente)
    const { data: authUserData, error: authUserError } = await supabaseAdmin.auth.admin.getUserById(targetAuthUserId)
    if (authUserError) {
      console.error('getUserById error:', authUserError)
      return new Response(
        JSON.stringify({ error: authUserError.message || 'Erro ao buscar usuário no auth.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    const authEmail: string | null = authUserData?.user?.email?.trim() || null

    const justLink = !!onlyGenerateLink
    const passwordToSet = newPassword || crypto.randomUUID().slice(0, 12)

    // Gerar o link ANTES de qualquer updateUserById — atualizar o usuário pode invalidar tokens de recovery
    const appOrigin = (typeof redirectTo === 'string' && redirectTo.trim()) ? String(redirectTo).trim() : null
    const redirectUrl = appOrigin ? (appOrigin.endsWith('/') ? appOrigin : `${appOrigin}/`) : null

    let recoveryLink: string | null = null
    let recoveryError: string | null = null
    if (authEmail && redirectUrl && justLink) {
      try {
        const secret = new TextEncoder().encode(serviceRoleKey)
        const jwt = await new jose.SignJWT({ email: authEmail, purpose: 'password_reset' })
          .setSubject(targetAuthUserId)
          .setExpirationTime(RESET_TOKEN_EXPIRY)
          .setIssuedAt()
          .setProtectedHeader({ alg: 'HS256' })
          .sign(secret)
        const appBase = redirectUrl.replace(/\/+$/, '')
        recoveryLink = `${appBase}/#/redefinir-senha?reset_token=${encodeURIComponent(jwt)}`
      } catch (err) {
        console.error('JWT sign error:', err)
        recoveryError = err instanceof Error ? err.message : 'Erro ao gerar link.'
      }
    } else if (authEmail) {
      const baseUrl = supabaseUrl.replace(/\/$/, '')
      const adminUrl = `${baseUrl}/auth/v1/admin/generate_link`
      const body: Record<string, unknown> = { type: 'magiclink', email: authEmail }
      if (redirectUrl) body.redirect_to = redirectUrl

      const apiRes = await fetch(adminUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${serviceRoleKey}`,
          'apikey': serviceRoleKey,
        },
        body: JSON.stringify(body),
      })
      const rawApi = await apiRes.json().catch(() => ({}))
      const apiActionLink = typeof rawApi?.action_link === 'string' ? rawApi.action_link.trim() : null
      const apiHashedToken = typeof rawApi?.hashed_token === 'string' ? rawApi.hashed_token.trim() : null

      if (!apiRes.ok) {
        recoveryError = rawApi?.msg ?? rawApi?.error_description ?? rawApi?.message ?? 'Erro ao gerar link.'
        console.error('generate_link API error:', apiRes.status, rawApi)
      } else if (apiActionLink) {
        recoveryLink = apiActionLink.startsWith('http')
          ? apiActionLink
          : `${baseUrl}/${String(apiActionLink).replace(/^\//, '')}`
      } else if (apiHashedToken && redirectUrl) {
        const redirectParam = `&redirect_to=${encodeURIComponent(redirectUrl)}`
        recoveryLink = `${baseUrl}/auth/v1/verify?token=${encodeURIComponent(apiHashedToken)}&type=magiclink${redirectParam}`
      } else {
        recoveryError = 'Resposta da API sem action_link.'
        console.error('generate_link response:', JSON.stringify(rawApi))
      }
    } else {
      recoveryError = 'Usuário no auth não possui e-mail cadastrado (conta apenas com telefone). Não é possível gerar link de recuperação por e-mail.'
    }

    if (!justLink) {
      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
        targetAuthUserId,
        { password: passwordToSet }
      )
      if (updateError) {
        console.error('Update password error:', updateError)
        return new Response(
          JSON.stringify({ error: updateError.message }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      const { error: confirmError } = await supabaseAdmin.auth.admin.updateUserById(
        targetAuthUserId,
        { email_confirm: true }
      )
      if (confirmError) console.warn('Email confirm update warning (password was still updated):', confirmError.message)
    } else {
      // Não alterar o usuário quando só geramos o link — updateUserById invalida o token de recovery
    }

    if (justLink) {
      return new Response(
        JSON.stringify({
          success: true,
          recoveryLink: recoveryLink || undefined,
          recoveryError: recoveryError || undefined,
          message: recoveryLink ? 'Link de redefinição gerado.' : (recoveryError || 'Não foi possível gerar o link.')
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!newPassword) {
      return new Response(
        JSON.stringify({
          success: true,
          newPassword: passwordToSet,
          message: 'Senha resetada com sucesso',
          recoveryLink: recoveryLink || undefined
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Senha atualizada com sucesso',
        recoveryLink: recoveryLink || undefined
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
