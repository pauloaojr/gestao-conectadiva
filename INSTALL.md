# 🛠️ Guia de Instalação e Deploy - Clinica Pro

Este guia detalha o processo de configuração do ambiente local e o deploy das infraestruturas no Supabase.

## 💻 Instalação Local

### 1. Pré-requisitos
- Node.js (v18 ou superior)
- npm ou bun
- Supabase CLI (para deploy de banco e funções)

### 2. Passos para Instalação
Clone o repositório e execute os comandos abaixo na raiz do projeto:

```bash
# Instalar dependências
npm install

ou

npm install --legacy-peer-deps

# Iniciar o servidor de desenvolvimento
npm run dev
```

---

## ☁️ Guia de Infraestrutura (Supabase)

### 1. Login na CLI
Antes de qualquer comando, você precisa estar autenticado:
```bash
npx supabase login
```

### 2. Migrations (Banco de Dados)
Para aplicar o esquema do banco de dados em um novo projeto Supabase:

```bash
# Vincular o projeto local ao projeto remoto
# Você precisará do Reference ID do projeto (encontrado nas configurações do dashboard do Supabase)
npx supabase link --project-ref seu-project-id

#npx supabase link --project-ref ejvdepwhywlsyvuuhrlc

# Enviar todas as migrations locais para o banco remoto
npx supabase db push
```

### 3. Backend (APIs, E-mail e Notificações)
O backend Node.js (`./backend/`) fornece:
- APIs REST (Pacientes, Receitas, Despesas) – autenticadas por token
- API de dispatch de notificações (WhatsApp, E-mail)
- E-mail SMTP
- Storage MinIO

Configure no `.env` do backend:
```
PORT=3021
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_SERVICE_ROLE_KEY=sua-service-role-key
SUPABASE_ANON_KEY=sua-anon-key
```

> **SUPABASE_ANON_KEY:** Necessário para validar o JWT do frontend nas notificações. Encontre em **Supabase Dashboard > Settings > API > anon public**.

Para que o frontend use o backend nas notificações, adicione no `.env` da raiz do projeto:
```
VITE_BACKEND_URL=http://localhost:3021
```
(Em produção, use a URL do seu backend.)

### 4. Edge Functions (Supabase)
Edge Functions para processos críticos (criação de usuários, reset de senha, agendamento de notificações):

```bash
# Deploy da função de criação de usuário
npx supabase functions deploy create-user

# Deploy da função de reset de senha
npx supabase functions deploy reset-user-password

# Deploy do scheduler de notificações (lembretes, contas, aniversários)
npx supabase functions deploy notification-scheduler
```

> **Nota:** As APIs de Pacientes, Receitas e Despesas estão no Backend (`/api/patients`, `/api/revenue`, `/api/expenses`). As Edge Functions correspondentes foram removidas.

#### notification-scheduler (opcional)
O scheduler envia lembretes de consulta, contas vencendo/vencidas e aniversários. Por padrão, ele usa Evolution API e SMTP diretamente. Para delegar o envio ao backend Node.js:

1. Crie um token em **Configurações > API** (tabela `api_tokens`).
2. Configure os **secrets** da Edge Function no dashboard do Supabase:
   - `NOTIFICATIONS_BACKEND_URL` – URL do backend (ex: `https://seu-backend.com`)
   - `NOTIFICATIONS_API_KEY` – valor do token criado

Se essas variáveis não estiverem definidas, o scheduler usa o fallback local (Evolution API e SMTP configurados no Supabase).

#### Cron automático (notification-scheduler)
O cron executa o scheduler a cada 15 minutos via `pg_cron` + `pg_net`. Antes de aplicar a migration `20260708100000_cron_notification_scheduler.sql`, crie os secrets no **Vault** (Dashboard > SQL Editor):

```sql
-- URL base do projeto (Settings > API > Project URL)
SELECT vault.create_secret(
  'https://SEU_PROJECT_REF.supabase.co',
  'notification_scheduler_base_url'
);

-- Token que deve ser igual ao CRON_SCHEDULER_TOKEN da Edge Function
-- Gere um token seguro (ex: openssl rand -hex 32)
SELECT vault.create_secret(
  'SEU_TOKEN_SEGURO',
  'cron_scheduler_token'
);
```

Depois, configure o mesmo valor em **Edge Functions > notification-scheduler > Secrets**:
- `CRON_SCHEDULER_TOKEN` = mesmo valor usado em `cron_scheduler_token` acima

Após aplicar a migration (`npx supabase db push`), o job aparece em **Integrations > Cron** no Dashboard.

#### Notas sobre Edge Functions:
- Certifique-se de configurar as variáveis de ambiente necessárias no dashboard do Supabase (**Settings > API > Edge Functions** ou **secrets**).
- As funções estão localizadas em `./supabase/functions/`.

### 5. Deploy do Frontend (Produção)
Para gerar o build de produção:

```bash
# Gerar a build
npm run build
```
O conteúdo será gerado na pasta `dist/`, pronto para ser hospedado no Vercel, Netlify ou no próprio Supabase Hosting.

### 6. Validação (Parte 4 – Migração de notificações)

Checklist para garantir que o fluxo de notificações está funcionando após a migração (frontend → backend, scheduler → backend).

#### 6.1 Backend – endpoint de dispatch
```bash
# Teste com X-API-Key (token da tabela api_tokens)
curl -X POST http://localhost:3021/api/notifications/dispatch \
  -H "Content-Type: application/json" \
  -H "X-API-Key: SEU_TOKEN_API" \
  -d '{
    "service": "financeiro",
    "eventKey": "conta_criada",
    "recipient": { "patientId": "UUID_DO_PACIENTE" },
    "context": {
      "paciente_nome": "Nome Teste",
      "descricao_conta": "Consulta",
      "valor": 100,
      "data_vencimento": "2025-03-10",
      "status_pagamento": "pending"
    },
    "dedupeKey": "teste:manual:1"
  }'
```

Resposta esperada: `{ "ok": true, "message": "Dispatch processado." }` (200).

#### 6.2 Frontend
- [ ] `.env` com `VITE_BACKEND_URL=http://localhost:3021` (ou URL do backend)
- [ ] Ao disparar notificação (ex.: criar receita, confirmar agenda), console mostra `[notificações] ✓ Enviado via backend`

#### 6.3 Scheduler
- [ ] `notification-scheduler` com secrets: `NOTIFICATIONS_BACKEND_URL`, `NOTIFICATIONS_API_KEY`, `CRON_SCHEDULER_TOKEN`
- [ ] Cron configurado (Integrations > Cron) e Vault com `notification_scheduler_base_url` e `cron_scheduler_token`
- [ ] Log de Auditoria (aba Notificações) mostra envios com `status: success` ou `failed` (com `error_message` para debug)

#### 6.4 conta_criada (2h após criação)
- [ ] Regra em Configurações > Notificações com evento "Conta criada", timing "Depois" e 2 horas
- [ ] Criar receita vinculada a paciente com telefone
- [ ] Aguardar ~2h; na próxima execução do cron, verificar Log de Auditoria

#### 6.5 Deduplicação
- [ ] Não deve haver envio duplicado para o mesmo `dedupe_key` – conferir em `notification_dispatch_logs` (só um `status = 'success'` por dedupe_key/canal).

---

## ⚡ Comandos Úteis

| Comando | Descrição |
| :--- | :--- |
| `npm run dev` | Inicia o servidor local |
| `npm run build` | Cria a versão de produção |
| `npm run test` | Executa os testes (vitest) |
| `npm run lint` | Verifica erros de estilo no código |
| `npx supabase db push` | Aplica migrations no banco remoto |
| `npx supabase migrations list` | Lista as migrations aplicadas |
| `npx supabase stop` | Para o serviço local do Supabase |

*Desenvolvido por Club Do Software*
