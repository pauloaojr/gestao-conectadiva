# delete-user

Remove um atendente (perfil + auth user) para liberar o e-mail.

## Deploy (obrigatório)

Para evitar 401 Unauthorized do gateway, faça o deploy com verificação JWT desabilitada no gateway. A função valida o JWT internamente com `getClaims`:

```bash
npx supabase functions deploy delete-user --no-verify-jwt
```
