
-- CARGA DE DADOS v3.1 (CORREÇÃO DE FK) - CLÍNICA PRO
-- Foco: Especialidades Médicas e Exames - Janeiro 2026

DO $$ 
DECLARE
    admin_id UUID;
    -- IDs para os serviços
    serv_cardio_id UUID := gen_random_uuid();
    serv_dermato_id UUID := gen_random_uuid();
    serv_sangue_id UUID := gen_random_uuid();
    serv_checkup_id UUID := gen_random_uuid();
BEGIN
    -- Busca ID do administrador real que existe no banco
    SELECT user_id INTO admin_id FROM public.user_roles WHERE role = 'admin' LIMIT 1;
    
    -- Se não encontrar um admin real, o script vai falhar intencionalmente para não criar lixo, 
    -- mas vamos usar um fallback seguro se houver pelo menos um perfil
    IF admin_id IS NULL THEN
        SELECT user_id INTO admin_id FROM public.profiles LIMIT 1;
    END IF;

    IF admin_id IS NULL THEN
        RAISE EXCEPTION 'Não foi encontrado nenhum usuário no banco para vincular os dados. Por favor, crie uma conta primeiro ou faça login.';
    END IF;

    -- 1. NOVOS SERVIÇOS TÉCNICOS
    INSERT INTO public.services (id, name, description, price, duration_minutes, is_available) VALUES
    (serv_cardio_id, 'Eletrocardiograma (ECG)', 'Exame de monitoramento cardíaco.', 250.00, 20, true),
    (serv_dermato_id, 'Mapeamento de Nevos', 'Análise detalhada de manchas e pintas.', 350.00, 40, true),
    (serv_sangue_id, 'Coleta de Exames de Sangue', 'Painel completo de bio-marcadores.', 80.00, 15, true),
    (serv_checkup_id, 'Check-up Vitalidade', 'Avaliação completa anual.', 850.00, 120, true)
    ON CONFLICT DO NOTHING;

    -- 2. CARGA DE 15 NOVOS PACIENTES
    -- Nota: Removido CPFs duplicados e CPFs reais para evitar conflitos
    INSERT INTO public.patients (name, cpf, email, phone, birth_date, address_city, status, created_by, notes) VALUES
    ('Aparecida Penha', '101.202.303-91', 'cidapenha@email.com', '(11) 91001-0001', '1955-06-15', 'Osasco', 'active', admin_id, 'Paciente cardiopata, atenção redobrada.'),
    ('Enzo Gabriel', '202.303.404-92', 'enzo.kids@email.com', '(11) 92002-0002', '2018-03-22', 'Barueri', 'active', admin_id, 'Pediatria - Acompanhado pela mãe.'),
    ('Valentina Flores', '303.404.505-93', 'val.flores@email.com', '(11) 93003-0003', '1998-11-02', 'São Paulo', 'active', admin_id, 'Alergia a Dipirona.'),
    ('Seu Jorge Silva', '404.505.606-94', 'george.silva@email.com', '(11) 94004-0004', '1942-08-30', 'Jundiaí', 'active', admin_id, 'Dificuldade de locomoção.'),
    ('Marta Suplicy', '505.606.707-95', 'marta.s@email.com', '(11) 95005-0005', '1970-12-10', 'São Paulo', 'active', admin_id, NULL),
    ('Felipe Massa', '606.707.808-96', 'felipe.m@email.com', '(11) 96006-0006', '1985-04-25', 'Embu das Artes', 'active', admin_id, 'Atleta de alta performance.'),
    ('Gisele Bündchen', '707.808.909-97', 'gisele.b@email.com', '(11) 97007-0007', '1980-07-20', 'Horizontina', 'active', admin_id, 'Focar em cuidados de pele.'),
    ('Silvio Santos', '808.909.000-98', 'abravanel@email.com', '(11) 98008-0008', '1930-12-12', 'São Paulo', 'active', admin_id, 'Mestre da comunicação.'),
    ('Neymar Jr', '909.000.111-99', 'ney.pai@email.com', '(11) 99009-0009', '1992-02-05', 'Mogi das Cruzes', 'active', admin_id, 'Recuperação de lesão no tornozelo.'),
    ('Anitta Larissa', '000.111.222-90', 'anitta@email.com', '(11) 90010-0010', '1993-03-30', 'Honório Gurgel', 'active', admin_id, NULL),
    ('Whindersson Nunes', '112.223.334-91', 'whin@email.com', '(11) 91111-0011', '1995-01-05', 'Palmeira do Piauí', 'active', admin_id, 'Check-up saúde mental e física.'),
    ('Ivete Sangalo', '223.334.445-92', 'veveta@email.com', '(11) 92222-0022', '1972-05-27', 'Juazeiro', 'active', admin_id, 'Cuidado com as cordas vocais.'),
    ('Lázaro Ramos', '334.445.556-93', 'lazaro.r@email.com', '(11) 93333-0033', '1978-11-01', 'Salvador', 'active', admin_id, NULL),
    ('Taís Araújo', '445.556.667-94', 'tais.a@email.com', '(11) 94444-0044', '1978-11-25', 'Rio de Janeiro', 'active', admin_id, 'Mapeamento de pele preventivo.'),
    ('Casimiro Miguel', '556.667.778-95', 'caze@email.com', '(11) 95555-0055', '1993-10-20', 'Rio de Janeiro', 'active', admin_id, 'Check-up geral.');

    -- 4. AGENDAMENTOS INTENSIVOS (Janeiro 2026)
    -- Todos vinculados ao admin_id real para não quebrar FK, mas com nomes de médicos diferentes nos textos
    INSERT INTO public.appointments (patient_name, attendant_id, attendant_name, service_name, appointment_date, appointment_time, status, created_by)
    VALUES 
    ('Aparecida Penha', admin_id, 'Dr. Roberto Kalil', 'Eletrocardiograma (ECG)', '2026-01-02', '08:00', 'completed', admin_id),
    ('Seu Jorge Silva', admin_id, 'Dr. Roberto Kalil', 'Consulta Geral', '2026-01-05', '14:30', 'completed', admin_id),
    ('Felipe Massa', admin_id, 'Dr. Roberto Kalil', 'Check-up Vitalidade', '2026-01-15', '09:00', 'confirmed', admin_id),
    ('Silvio Santos', admin_id, 'Dr. Roberto Kalil', 'Eletrocardiograma (ECG)', '2026-01-26', '16:00', 'pending', admin_id),
    ('Gisele Bündchen', admin_id, 'Dra. Luciana Zogaib', 'Mapeamento de Nevos', '2026-01-10', '11:00', 'completed', admin_id),
    ('Anitta Larissa', admin_id, 'Dra. Luciana Zogaib', 'Consulta Geral', '2026-01-27', '13:00', 'confirmed', admin_id),
    ('Taís Araújo', admin_id, 'Dra. Luciana Zogaib', 'Mapeamento de Nevos', '2026-01-28', '15:30', 'pending', admin_id),
    ('Enzo Gabriel', admin_id, 'Enf. Marcos Paz', 'Coleta de Exames de Sangue', '2026-01-20', '07:30', 'completed', admin_id),
    ('Whindersson Nunes', admin_id, 'Enf. Marcos Paz', 'Coleta de Exames de Sangue', '2026-01-29', '07:00', 'pending', admin_id),
    ('Casimiro Miguel', admin_id, 'Enf. Marcos Paz', 'Check-up Vitalidade', '2026-01-30', '08:00', 'pending', admin_id);

    -- 5. PRONTUÁRIOS TÉCNICOS
    INSERT INTO public.medical_records (patient_id, diagnosis, notes, status, created_by)
    SELECT id, 'Arritmia Sinusal', 'Monitoramento trimestral necessário. ECG normal.', 'in_treatment', admin_id FROM public.patients WHERE cpf = '101.202.303-91' LIMIT 1;

    INSERT INTO public.medical_records (patient_id, diagnosis, notes, status, created_by)
    SELECT id, 'Dermatite de Contato', 'Suspensão de cosméticos por 15 dias.', 'starting', admin_id FROM public.patients WHERE cpf = '707.808.909-97' LIMIT 1;

    -- 6. RECEITUÁRIOS TÉCNICOS
    INSERT INTO public.prescriptions (patient_id, patient_name, attendant_id, attendant_name, medications, notes, created_by)
    SELECT id, 'Aparecida Penha', admin_id, 'Dr. Roberto Kalil', '[{"name": "Selozok 50mg", "dosage": "1x ao dia pela manhã", "duration": "Contínuo"}]'::jsonb, 'Monitorar pressão.', admin_id FROM public.patients WHERE cpf = '101.202.303-91' LIMIT 1;

END $$;
