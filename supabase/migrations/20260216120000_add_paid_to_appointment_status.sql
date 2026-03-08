-- Adicionar status "Pago" aos agendamentos (idempotente: não falha se já existir)
ALTER TYPE public.appointment_status ADD VALUE IF NOT EXISTS 'paid';
