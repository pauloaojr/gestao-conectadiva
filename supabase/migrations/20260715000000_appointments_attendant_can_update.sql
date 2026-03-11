-- Permite que o atendente (attendant_id) atualize seus agendamentos.
-- Antes: apenas created_by ou admin/manager podiam atualizar.
-- Agora: o profissional atribuído ao agendamento também pode (ex.: alterar status).

DROP POLICY IF EXISTS "Users can update own appointments or admin" ON public.appointments;

CREATE POLICY "Users can update own appointments or admin or attendant" ON public.appointments
  FOR UPDATE TO authenticated
  USING (
    created_by = auth.uid()
    OR attendant_id = auth.uid()
    OR public.is_admin_or_manager(auth.uid())
  );
