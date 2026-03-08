import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

    // Verify the requesting user is authenticated and has admin/manager role
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Não autorizado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verify user and check role using admin client
    const token = authHeader.replace(/bearer /i, '').trim()
    const { data: { user: requestingUser }, error: userError } = await supabaseAdmin.auth.getUser(token)

    if (userError || !requestingUser) {
      console.error('User verification error:', userError)
      return new Response(
        JSON.stringify({
          error: 'Sua sessão expirou ou o token é inválido.',
          details: userError?.message || 'User not found'
        }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if requesting user is admin or manager
    const { data: userRole, error: roleError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', requestingUser.id)
      .maybeSingle()

    if (roleError) {
      console.error('Role check error:', roleError)
    }

    if (!userRole || !['admin', 'manager'].includes(userRole.role)) {
      return new Response(
        JSON.stringify({ error: 'Permissão negada. Apenas administradores podem criar atendentes.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get user data from request body
    const {
      name,
      email,
      phone,
      position,
      cpf,
      rg,
      cnpj,
      birth_date,
      education,
      gender,
      marital_status,
      notes,
      professional_document,
      professional_document_name,
      professional_document_storage_key,
      address_label,
      address_cep,
      address_street,
      address_number,
      address_complement,
      address_state,
      address_country,
      service_area,
      professional_council,
      bank_name,
      bank_agency,
      bank_account,
      bank_holder,
      pix_key,
      contract_status,
      contract_document,
      contract_document_name,
      contract_document_storage_key,
      work_days,
      avatar_url,
      avatar_storage_key,
      role
    } = await req.json()

    if (!name || !email) {
      return new Response(
        JSON.stringify({ error: 'Nome e email são obrigatórios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Generate a random password (user will need to reset it)
    const tempPassword = crypto.randomUUID()

    // Create auth user using admin API
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true, // Auto-confirm the email
      user_metadata: { name }
    })

    if (authError) {
      console.error('Auth error:', authError)
      return new Response(
        JSON.stringify({ error: authError.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const newUserId = authData.user.id

    // The trigger should create the profile automatically, but let's update it with additional info
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({
        name,
        phone: phone || null,
        position: position || null,
        cpf: cpf || null,
        rg: rg || null,
        cnpj: cnpj || null,
        birth_date: birth_date || null,
        education: education || null,
        gender: gender || null,
        marital_status: marital_status || null,
        notes: notes || null,
        professional_document: professional_document || null,
        professional_document_name: professional_document_name || null,
        professional_document_storage_key: professional_document_storage_key || null,
        address_label: address_label || null,
        address_cep: address_cep || null,
        address_street: address_street || null,
        address_number: address_number || null,
        address_complement: address_complement || null,
        address_state: address_state || null,
        address_country: address_country || null,
        service_area: service_area || null,
        professional_council: professional_council || null,
        bank_name: bank_name || null,
        bank_agency: bank_agency || null,
        bank_account: bank_account || null,
        bank_holder: bank_holder || null,
        pix_key: pix_key || null,
        contract_status: contract_status || 'sem_contrato',
        contract_document: contract_document || null,
        contract_document_name: contract_document_name || null,
        contract_document_storage_key: contract_document_storage_key || null,
        work_days: work_days || [],
        avatar_url: avatar_url || null,
        avatar_storage_key: avatar_storage_key || null,
        is_active: true
      })
      .eq('user_id', newUserId)

    if (profileError) {
      console.error('Profile update error:', profileError)
    }

    // Update role if specified (different from default 'user')
    if (role && role !== 'user') {
      const { error: roleError } = await supabaseAdmin
        .from('user_roles')
        .update({ role })
        .eq('user_id', newUserId)

      if (roleError) {
        console.error('Role update error:', roleError)
      }
    }

    // Fetch the created profile
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('user_id', newUserId)
      .single()

    return new Response(
      JSON.stringify({
        success: true,
        profile,
        message: `Atendente ${name} criado com sucesso. Senha temporária: ${tempPassword}`
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
