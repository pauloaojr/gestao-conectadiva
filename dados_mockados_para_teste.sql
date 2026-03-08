
-- DADOS MOCKADOS ADICIONAIS - CLÍNICA PRO
-- Janeiro 2026

DO $$ 
DECLARE
    admin_id UUID;
    atendente_ana_id UUID := gen_random_uuid();
    atendente_marcus_id UUID := gen_random_uuid();
    servico_pilates_id UUID := gen_random_uuid();
    servico_massagem_id UUID := gen_random_uuid();
BEGIN
    -- Busca ID do administrador atual
    SELECT user_id INTO admin_id FROM public.user_roles WHERE role = 'admin' LIMIT 1;
    IF admin_id IS NULL THEN
        admin_id := '11111111-1111-1111-1111-111111111111';
    END IF;

    -- 1. NOVOS ATENDENTES (Apenas perfis para visualização na UI)
    -- Nota: Estes não conseguem logar sem um auth.user correspondente, mas servem para testar a listagem
    INSERT INTO public.profiles (id, user_id, name, email, position, phone, is_active) VALUES
    (gen_random_uuid(), atendente_ana_id, 'Ana Paula Silva', 'ana.paula@clinicapro.com', 'Fisioterapeuta Sênior', '(11) 91234-5678', true),
    (gen_random_uuid(), atendente_marcus_id, 'Marcus Vinícius', 'marcus.v@clinicapro.com', 'Nutricionista', '(11) 98765-4321', true)
    ON CONFLICT DO NOTHING;

    INSERT INTO public.user_roles (user_id, role) VALUES
    (atendente_ana_id, 'manager'),
    (atendente_marcus_id, 'user')
    ON CONFLICT DO NOTHING;

    -- 2. NOVOS SERVIÇOS
    INSERT INTO public.services (id, name, description, price, duration_minutes, is_available) VALUES
    (servico_pilates_id, 'Pilates Clínico', 'Sessão individual de pilates para fortalecimento.', 120.00, 50, true),
    (servico_massagem_id, 'Drenagem Linfática', 'Massagem especializada para redução de edemas.', 160.00, 60, true)
    ON CONFLICT DO NOTHING;

    -- 3. CARGA DE PACIENTES (Mais 10 pacientes)
    INSERT INTO public.patients (name, cpf, email, phone, birth_date, address_city, status, created_by) VALUES
    ('Beatriz Mendes', '111.222.333-44', 'beatriz.m@exemplo.com', '(11) 90000-1111', '1995-10-12', 'São Paulo', 'active', admin_id),
    ('Ricardo Santos', '222.333.444-55', 'ricardo.s@exemplo.com', '(11) 90000-2222', '1982-04-30', 'Guarulhos', 'active', admin_id),
    ('Juliana Lopes', '333.444.555-66', 'juliana.l@exemplo.com', '(11) 90000-3333', '1990-07-15', 'Osasco', 'active', admin_id),
    ('Fernando Lima', '444.555.666-77', 'fernando.l@exemplo.com', '(11) 90000-4444', '1975-12-05', 'São Bernardo', 'active', admin_id),
    ('Camila Oliveira', '555.666.777-88', 'camila.o@exemplo.com', '(11) 90000-5555', '1988-02-20', 'São Caetano', 'active', admin_id),
    ('Gustavo Diniz', '666.777.888-99', 'gustavo.d@exemplo.com', '(11) 90000-6666', '1993-09-08', 'Santo André', 'active', admin_id),
    ('Tatiana Souza', '777.888.999-00', 'tatiana.s@exemplo.com', '(11) 90000-7777', '1980-01-25', 'Barueri', 'active', admin_id),
    ('Henrique Vaz', '888.999.000-11', 'henrique.v@exemplo.com', '(11) 90000-8888', '1968-06-14', 'Mogi das Cruzes', 'active', admin_id),
    ('Isabela Ferreira', '999.000.111-22', 'isabela.f@exemplo.com', '(11) 90000-9999', '2002-03-18', 'Jundiaí', 'active', admin_id),
    ('Marcelo Alencar', '000.111.222-33', 'marcelo.a@exemplo.com', '(11) 90000-0000', '1979-11-22', 'Santana de Parnaíba', 'active', admin_id);

    -- 4. CARGA DE AGENDAMENTOS (Janeiro 2026 - Datas variadas)
    -- Agendamentos para a Ana Paula
    INSERT INTO public.appointments (patient_name, attendant_id, attendant_name, service_name, appointment_date, appointment_time, status, created_by)
    SELECT p.name, atendente_ana_id, 'Ana Paula Silva', 'Pilates Clínico', '2026-01-05', '08:00', 'completed', admin_id FROM public.patients p WHERE p.cpf = '111.222.333-44';
    
    INSERT INTO public.appointments (patient_name, attendant_id, attendant_name, service_name, appointment_date, appointment_time, status, created_by)
    SELECT p.name, atendente_ana_id, 'Ana Paula Silva', 'Pilates Clínico', '2026-01-07', '09:00', 'completed', admin_id FROM public.patients p WHERE p.cpf = '222.333.444-55';

    -- Agendamentos para o Marcus
    INSERT INTO public.appointments (patient_name, attendant_id, attendant_name, service_name, appointment_date, appointment_time, status, created_by)
    SELECT p.name, atendente_marcus_id, 'Marcus Vinícius', 'Nutrição', '2026-01-10', '14:00', 'confirmed', admin_id FROM public.patients p WHERE p.cpf = '333.444.555-66';

    -- Agendamentos Pendentes e Futuros
    INSERT INTO public.appointments (patient_name, attendant_id, attendant_name, service_name, appointment_date, appointment_time, status, created_by)
    SELECT p.name, admin_id, 'Dr. Administrador', 'Consulta Geral', '2026-01-27', '10:00', 'confirmed', admin_id FROM public.patients p WHERE p.cpf = '444.555.666-77';

    INSERT INTO public.appointments (patient_name, attendant_id, attendant_name, service_name, appointment_date, appointment_time, status, created_by)
    SELECT p.name, atendente_ana_id, 'Ana Paula Silva', 'Massagem Especializada', '2026-01-29', '15:00', 'pending', admin_id FROM public.patients p WHERE p.cpf = '555.666.777-88';

    INSERT INTO public.appointments (patient_name, attendant_id, attendant_name, service_name, appointment_date, appointment_time, status, created_by)
    SELECT p.name, atendente_marcus_id, 'Marcus Vinícius', 'Nutrição', '2026-01-30', '11:00', 'pending', admin_id FROM public.patients p WHERE p.cpf = '666.777.888-99';

    -- 5. MAIS PRONTUÁRIOS
    INSERT INTO public.medical_records (patient_id, diagnosis, notes, status, created_by)
    SELECT id, 'Início de tratamento postural', 'Paciente apresenta escoliose leve, focar em core.', 'in_treatment', admin_id FROM public.patients WHERE cpf = '111.222.333-44';

    INSERT INTO public.medical_records (patient_id, diagnosis, notes, status, created_by)
    SELECT id, 'Reeducação alimentar', 'Paciente busca perda de peso e ganho de massa magra.', 'starting', admin_id FROM public.patients WHERE cpf = '333.444.555-66';

END $$;

-- DADOS FICTÍCIOS PARA CLÍNICA PRO - JANEIRO 2026
-- Este script insere dados de teste para demonstração

DO $$ 
DECLARE
    admin_id UUID;
    atendente_1_id UUID := '00000000-0000-0000-0000-000000000001';
    atendente_2_id UUID := '00000000-0000-0000-0000-000000000002';
    paciente_1_id UUID := gen_random_uuid();
    paciente_2_id UUID := gen_random_uuid();
    paciente_3_id UUID := gen_random_uuid();
    paciente_4_id UUID := gen_random_uuid();
    paciente_5_id UUID := gen_random_uuid();
    servico_1_id UUID := gen_random_uuid();
    servico_2_id UUID := gen_random_uuid();
    servico_3_id UUID := gen_random_uuid();
    horario_1_id UUID := gen_random_uuid();
    horario_2_id UUID := gen_random_uuid();
    horario_3_id UUID := gen_random_uuid();
BEGIN
    -- Tenta pegar o ID do primeiro usuário admin se existir, senão usa um fixo
    SELECT user_id INTO admin_id FROM public.user_roles WHERE role = 'admin' LIMIT 1;
    IF admin_id IS NULL THEN
        admin_id := '11111111-1111-1111-1111-111111111111';
    END IF;

    -- 1. SERVIÇOS
    INSERT INTO public.services (id, name, description, price, duration_minutes, is_available) VALUES
    (servico_1_id, 'Consulta Geral', 'Avaliação inicial e acompanhamento de rotina.', 150.00, 30, true),
    (servico_2_id, 'Fisioterapia Especializada', 'Sessão de fisioterapia com foco em reabilitação motora.', 200.00, 60, true),
    (servico_3_id, 'Nutrição', 'Plano alimentar e orientações nutricionais.', 180.00, 45, true);

    -- 2. HORÁRIOS (Time Slots)
    INSERT INTO public.time_slots (id, "time", days, is_available) VALUES
    (horario_1_id, '08:00', ARRAY['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta'], true),
    (horario_2_id, '10:00', ARRAY['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta'], true),
    (horario_3_id, '14:00', ARRAY['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta'], true);

    -- 3. PACIENTES
    INSERT INTO public.patients (id, name, cpf, phone, email, status, birth_date, address_city, created_by) VALUES
    (paciente_1_id, 'João Silva', '123.456.789-01', '(11) 98888-7777', 'joao.silva@email.com', 'active', '1985-05-20', 'São Paulo', admin_id),
    (paciente_2_id, 'Maria Oliveira', '234.567.890-12', '(11) 97777-6666', 'maria.oliveira@email.com', 'active', '1992-08-15', 'São Bernardo do Campo', admin_id),
    (paciente_3_id, 'Carlos Santos', '345.678.901-23', '(11) 96666-5555', 'carlos.santos@email.com', 'active', '1978-03-10', 'Santo André', admin_id),
    (paciente_4_id, 'Ana Costa', '456.789.012-34', '(11) 95555-4444', 'ana.costa@email.com', 'active', '2000-11-25', 'São Caetano do Sul', admin_id),
    (paciente_5_id, 'Pedro Rocha', '567.890.123-45', '(11) 94444-3333', 'pedro.rocha@email.com', 'active', '1965-01-12', 'Diadema', admin_id);

    -- 4. ATENDENTES (Extras se necessário, geralmente via profiles)
    -- Nota: Inserir em profiles sem auth.users pode causar problemas de RLS se não houver o usuário correspondente.
    -- Vamos assumir que o usuário admim é o atendente principal para os registros fictícios.

    -- 5. AGENDAMENTOS (Janeiro 2026)
    INSERT INTO public.appointments (patient_id, patient_name, attendant_id, attendant_name, service_id, service_name, appointment_date, appointment_time, status, created_by) VALUES
    (paciente_1_id, 'João Silva', admin_id, 'Dr. Administrador', servico_1_id, 'Consulta Geral', '2026-01-12', '08:00', 'completed', admin_id),
    (paciente_2_id, 'Maria Oliveira', admin_id, 'Dr. Administrador', servico_2_id, 'Fisioterapia Especializada', '2026-01-15', '10:00', 'confirmed', admin_id),
    (paciente_3_id, 'Carlos Santos', admin_id, 'Dr. Administrador', servico_1_id, 'Consulta Geral', '2026-01-20', '14:00', 'pending', admin_id),
    (paciente_4_id, 'Ana Costa', admin_id, 'Dr. Administrador', servico_3_id, 'Nutrição', '2026-01-25', '09:00', 'pending', admin_id),
    (paciente_5_id, 'Pedro Rocha', admin_id, 'Dr. Administrador', servico_2_id, 'Fisioterapia Especializada', '2026-01-28', '11:00', 'pending', admin_id);

    -- 6. PRONTUÁRIOS (Medical Records)
    INSERT INTO public.medical_records (patient_id, diagnosis, notes, status, created_by) VALUES
    (paciente_1_id, 'Hipertensão leve', 'Paciente apresenta melhora após início do tratamento.', 'in_treatment', admin_id),
    (paciente_2_id, 'Recuperação pós-cirúrgica no joelho', 'Iniciado protocolo de fisioterapia 2x por semana.', 'in_treatment', admin_id),
    (paciente_5_id, 'Dores lombares crônicas', 'Paciente relata melhora na postura corporativa.', 'starting', admin_id);

    -- 7. RECEITUÁRIOS (Prescriptions)
    INSERT INTO public.prescriptions (patient_id, patient_name, attendant_id, attendant_name, medications, notes, created_by) VALUES
    (paciente_1_id, 'João Silva', admin_id, 'Dr. Administrador', '[{"name": "Losartana 50mg", "dosage": "1 comprimido ao dia", "duration": "Contínuo"}]'::jsonb, 'Evitar excesso de sal e gordura.', admin_id),
    (paciente_5_id, 'Pedro Rocha', admin_id, 'Dr. Administrador', '[{"name": "Ibuprofeno 600mg", "dosage": "1 comprimido a cada 12h", "duration": "5 dias"}]'::jsonb, 'Tomar após as refeições.', admin_id);

END $$;
