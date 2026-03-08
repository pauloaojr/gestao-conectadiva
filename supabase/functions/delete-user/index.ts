import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Não autorizado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const token = authHeader.replace(/bearer /i, '').trim()
    if (!token) {
      return new Response(
        JSON.stringify({ error: 'Token inválido' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate JWT using getClaims (works with new JWT signing keys; use with --no-verify-jwt deploy)
    const supabaseAnon = createClient(supabaseUrl, supabaseAnonKey)
    const { data: claimsData, error: claimsError } = await supabaseAnon.auth.getClaims(token)
    const requestingUserId = claimsData?.claims?.sub
    if (claimsError || !requestingUserId) {
      return new Response(
        JSON.stringify({
          error: 'Sua sessão expirou ou o token é inválido.',
          details: claimsError?.message || 'Invalid token'
        }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    const { data: userRole, error: roleError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', requestingUserId)
      .maybeSingle()

    if (roleError || !userRole || !['admin', 'manager'].includes(userRole.role)) {
      return new Response(
        JSON.stringify({ error: 'Permissão negada. Apenas administradores podem remover atendentes.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { profile_id } = await req.json()

    if (!profile_id) {
      return new Response(
        JSON.stringify({ error: 'ID do perfil é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get profile to obtain auth user_id (do not delete the current user)
    const { data: profile, error: profileFetchError } = await supabaseAdmin
      .from('profiles')
      .select('user_id')
      .eq('id', profile_id)
      .single()

    if (profileFetchError || !profile) {
      return new Response(
        JSON.stringify({ error: 'Perfil não encontrado.' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const authUserId = profile.user_id

    if (authUserId === requestingUserId) {
      return new Response(
        JSON.stringify({ error: 'Você não pode remover seu próprio usuário.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 1. Remove from user_roles
    await supabaseAdmin.from('user_roles').delete().eq('user_id', authUserId)

    // 2. Remove profile
    const { error: deleteProfileError } = await supabaseAdmin
      .from('profiles')
      .delete()
      .eq('id', profile_id)

    if (deleteProfileError) {
      console.error('Profile delete error:', deleteProfileError)
      return new Response(
        JSON.stringify({ error: 'Erro ao remover perfil. ' + deleteProfileError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 3. Remove auth user so the email can be reused
    const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(authUserId)

    if (authDeleteError) {
      console.error('Auth delete error:', authDeleteError)
      // Profile already deleted; we still return success but log the auth cleanup failure
      // so the email might remain blocked until manual fix
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Atendente removido do sistema com sucesso.'
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Erro interno no servidor',
        details: error
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
