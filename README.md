# 🏥 Clinica Pro – Sistema de Gestão para Clínicas

Sistema completo para gestão de clínicas médicas: agenda, prontuários, receituário, financeiro, relatórios e integrações. Desenvolvido para médicos, recepcionistas e administradores, com controle de permissões por função (Admin, Gerente, Atendente).

---

## 🚀 Tecnologias

| Camada        | Stack |
|---------------|--------|
| **Frontend**  | React 18, TypeScript, Vite |
| **UI**        | Tailwind CSS, Radix UI (Shadcn/UI), Lucide Icons |
| **Estado**    | TanStack Query (React Query), Context API |
| **Formulários** | React Hook Form, Zod |
| **Gráficos**  | Recharts |
| **Backend**   | Node.js (Express) – e-mail SMTP, MinIO, APIs REST |
| **Infra**     | Supabase (Auth, PostgreSQL, Storage, Edge Functions) |

---

## 📋 Funcionalidades

- **Dashboard** – Visão geral e indicadores em tempo real  
- **Pacientes** – Cadastro, histórico e filtros  
- **Prontuários** – Prontuário eletrônico por paciente  
- **Agenda** – Agendamentos, horários e slots por profissional  
- **Receituário** – Emissão de receitas e documentos  
- **Relatórios** – Consultório, agendamentos e financeiro  
- **Financeiro** – Receitas, despesas e configurações (status/categorias)  
- **Gestão** – Atendentes, horários de trabalho e serviços  
- **Configurações** – Perfil (todos os usuários), personalização, estabelecimento, segurança, notificações, plano, funções e usuários (conforme permissões)  
- **Integrações** – WhatsApp (Evolution API), e-mail (SMTP), MinIO e outras  
- **Auditoria** – Log de ações do sistema  

Login, redefinição de senha e edição de e-mail de atendentes ficam alinhados entre **Authentication** e **profiles** (Supabase).

---

## 🏗️ Estrutura do Projeto

```
clinica-pro/
├── src/                 # Frontend React (Vite)
│   ├── components/
│   ├── pages/
│   ├── hooks/
│   └── services/
├── backend/             # Backend Node.js (e-mail, MinIO, APIs)
│   ├── server.js
│   └── .env.example
├── supabase/
│   ├── functions/       # Edge Functions
│   └── migrations/    # Schema do banco
├── INSTALL.md           # Deploy, migrations e Supabase
├── CREDENCIAIS.md       # Usuários de teste
└── package.json         # Frontend
```

---

## 💻 Desenvolvimento local

### Pré-requisitos

- **Node.js** 18 ou superior  
- **npm** (ou bun)  
- Projeto **Supabase** configurado (URL e chaves de API)  
- Conta e credenciais SMTP (para testar e-mail), se for usar integração de e-mail  

### 1. Clonar e instalar dependências

Na **raiz** do projeto (frontend):

```bash
npm install
# ou, em caso de conflito de peer deps:
npm install --legacy-peer-deps
```

No **backend**:

```bash
cd backend
npm install
cd ..
```

### 2. Variáveis de ambiente

#### Frontend (raiz do projeto)

Crie um arquivo `.env` na raiz com:

```env
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sua-chave-anon-public
VITE_BACKEND_URL=http://localhost:3021
```

| Variável | Onde obter |
|----------|------------|
| `VITE_SUPABASE_URL` | Supabase Dashboard → **Settings** → **API** → Project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase Dashboard → **Settings** → **API** → `anon` `public` |
| `VITE_BACKEND_URL` | URL do backend local (`http://localhost:3021`) ou URL pública em produção |

> O `VITE_BACKEND_URL` é usado pelo frontend para APIs REST, notificações e documentação de API. Sem ele, recursos que dependem do backend Node não funcionam.

#### Backend (`backend/.env`)

Copie o exemplo e preencha:

```bash
cd backend
copy .env.example .env   # Windows
# cp .env.example .env   # Linux/macOS
```

Conteúdo de referência:

```env
PORT=3021

SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_SERVICE_ROLE_KEY=sua-service-role-key
SUPABASE_ANON_KEY=sua-chave-anon-public
```

| Variável | Onde obter |
|----------|------------|
| `SUPABASE_URL` | Mesma URL do projeto Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Dashboard → **Settings** → **API** → `service_role` (não exponha no frontend) |
| `SUPABASE_ANON_KEY` | Mesma chave `anon` usada no frontend |

### 3. Subir os servidores

Use **dois terminais** (frontend e backend em paralelo).

**Terminal 1 – Frontend** (raiz do projeto):

```bash
npm run dev
```

- Acesse: **http://localhost:8081**  
- A porta padrão está definida em `vite.config.ts` (8081).

**Terminal 2 – Backend**:

```bash
cd backend
npm run dev
```

- API em: **http://localhost:3021**  
- Health check: **http://localhost:3021/health**

### 4. Configuração no app (integrações)

Com os dois servidores rodando, configure no sistema:

1. **Integrações → E-mail**  
   - **URL do backend de e-mail:** `http://localhost:3021` (sem barra no final)  
   - Preencha host SMTP, porta, usuário e senha e use **Testar conexão**.

2. **Integrações → WhatsApp / MinIO**  
   - Conforme sua infraestrutura (Evolution API, MinIO, etc.).

> **Notificações agendadas (Edge Functions):** o scheduler roda na nuvem do Supabase. Em desenvolvimento, o teste manual em **Auditoria → Notificações → Processar pendências** usa o frontend; o envio de **e-mail** pelo scheduler em produção exige **URL pública** do backend (não `localhost`). Veja [INSTALL.md](./INSTALL.md).

### 5. Banco e Edge Functions (primeira vez)

Se o projeto Supabase ainda não tiver o schema aplicado:

```bash
npx supabase login
npx supabase link --project-ref seu-project-ref
npx supabase db push
```

Deploy das Edge Functions e demais detalhes: [INSTALL.md](./INSTALL.md).

---

## ⚡ Resumo rápido

```bash
# 1. Instalar
npm install
cd backend && npm install && cd ..

# 2. Configurar .env (raiz) e backend/.env

# 3. Terminal A – frontend
npm run dev          # http://localhost:8081

# 4. Terminal B – backend
cd backend && npm run dev   # http://localhost:3021
```

---

## 📦 Build e deploy para produção

Em produção o sistema usa **três camadas** que devem ser publicadas e configuradas juntas:

| Camada | O que publicar | Onde hospedar (exemplos) |
|--------|----------------|---------------------------|
| **Frontend** | Build estático (`dist/`) | Vercel, Netlify, Cloudflare Pages, Supabase Hosting |
| **Backend** | Pasta `backend/` (Node.js) | Railway, Render, Fly.io, VPS |
| **Supabase** | Migrations + Edge Functions | Supabase Cloud (já gerenciado) |

---

### 1. Frontend

#### Variáveis no build

As variáveis `VITE_*` são embutidas no build. Configure-as **antes** de rodar `npm run build` (arquivo `.env.production` na raiz ou painel do provedor de hospedagem):

```env
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sua-chave-anon-public
VITE_BACKEND_URL=https://seu-backend.railway.app
```

> Use a **URL pública HTTPS** do backend em `VITE_BACKEND_URL`, nunca `localhost`.

#### Gerar e validar o build

```bash
# Na raiz do projeto
npm run build
```

- Saída em **`dist/`** — publique essa pasta ou conecte o repositório ao provedor (build command: `npm run build`, output: `dist`).
- Teste local do build antes de publicar:

```bash
npm run preview
```

#### Hospedagem (Vercel / Netlify)

1. Conecte o repositório (raiz do projeto, não a pasta `backend/`).
2. Defina as três variáveis `VITE_*` no painel de **Environment Variables** (ambiente Production).
3. Build command: `npm run build` | Output directory: `dist`.
4. Após o deploy, acesse a URL do front e faça login para validar.

---

### 2. Backend (Node.js)

O backend é um serviço **separado** do frontend. Faça deploy apenas da pasta **`backend/`**.

#### Variáveis de ambiente (produção)

```env
PORT=3021
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_SERVICE_ROLE_KEY=sua-service-role-key
SUPABASE_ANON_KEY=sua-chave-anon-public
```

O provedor (Railway, Render, etc.) costuma definir `PORT` automaticamente; mantenha as chaves Supabase em **secrets**, nunca no repositório.

#### Deploy

```bash
cd backend
npm install --production
npm start
```

No painel do provedor:

- **Root directory:** `backend` (se o deploy for a partir do monorepo).
- **Start command:** `npm start` ou `node server.js`.
- Confirme o health check: `GET https://seu-backend.railway.app/health`.

Detalhes dos endpoints: [backend/README.md](./backend/README.md).

---

### 3. Supabase (banco e Edge Functions)

Na máquina de deploy (com Supabase CLI autenticada):

```bash
npx supabase login
npx supabase link --project-ref seu-project-ref
npx supabase db push
```

Edge Functions essenciais:

```bash
npx supabase functions deploy create-user --project-ref seu-project-ref
npx supabase functions deploy reset-user-password --project-ref seu-project-ref
npx supabase functions deploy update-user-email --project-ref seu-project-ref
npx supabase functions deploy trigger-notification-scheduler --project-ref seu-project-ref
npx supabase functions deploy notification-scheduler --project-ref seu-project-ref
```

#### Secrets da `notification-scheduler`

No **Supabase Dashboard → Edge Functions → notification-scheduler → Secrets**:

| Secret | Valor |
|--------|--------|
| `CRON_SCHEDULER_TOKEN` | Token seguro (ex.: `openssl rand -hex 32`) |
| `NOTIFICATIONS_BACKEND_URL` | URL pública do backend (ex.: `https://seu-backend.railway.app`) |
| `NOTIFICATIONS_API_KEY` | Token criado em **Configurações → API** (`api_tokens`) |

O mesmo `CRON_SCHEDULER_TOKEN` deve estar no Vault se usar o cron automático — veja [INSTALL.md](./INSTALL.md).

---

### 4. Configuração no app (após o deploy)

Com front e backend no ar:

1. **Integrações → E-mail**  
   - **URL do backend de e-mail:** `https://seu-backend.railway.app` (URL pública, sem barra final).  
   - SMTP e **Testar conexão**.

2. **Integrações → WhatsApp / MinIO**  
   - URLs e credenciais de produção (Evolution API, MinIO, etc.).

3. **Configurações → API** (se usar scheduler via backend)  
   - Crie um token e use o mesmo valor em `NOTIFICATIONS_API_KEY` da Edge Function.

> **E-mail nas notificações agendadas:** o scheduler roda na nuvem Supabase e só alcança o backend por **URL pública**. `localhost` funciona apenas no teste manual pelo navegador (Integrações / Auditoria).

---

### 5. Checklist de produção

- [ ] Migrations aplicadas (`npx supabase db push`)
- [ ] Edge Functions publicadas (`notification-scheduler`, `trigger-notification-scheduler`, etc.)
- [ ] Backend no ar e `GET /health` respondendo
- [ ] Frontend buildado com `VITE_BACKEND_URL` apontando para o backend público
- [ ] Integrações → E-mail com URL pública do backend + SMTP testado
- [ ] Secrets do scheduler: `CRON_SCHEDULER_TOKEN`, `NOTIFICATIONS_BACKEND_URL`, `NOTIFICATIONS_API_KEY` (se aplicável)
- [ ] Cron/Vault configurado (opcional) — [INSTALL.md](./INSTALL.md)
- [ ] Teste de notificação e conferência em **Auditoria → Notificações**

Validação detalhada (curl, deduplicação, eventos): seção 6 do [INSTALL.md](./INSTALL.md).

---

## 📜 Scripts

### Frontend (raiz)

| Comando | Descrição |
|--------|-----------|
| `npm run dev` | Servidor de desenvolvimento (porta 8081) |
| `npm run build` | Build de produção |
| `npm run preview` | Preview do build |
| `npm run lint` | ESLint |
| `npm run test` | Testes (Vitest) |

### Backend (`backend/`)

| Comando | Descrição |
|--------|-----------|
| `npm run dev` | Servidor Node (porta 3021, padrão) |
| `npm start` | Igual ao `dev` |

---

## 🔐 Credenciais e permissões

Usuários de teste e níveis de acesso (Admin, Gerente, Atendente): [CREDENCIAIS.md](./CREDENCIAIS.md).

---

## 📚 Documentação adicional

| Arquivo | Conteúdo |
|--------|----------|
| [INSTALL.md](./INSTALL.md) | Migrations, deploy Supabase, Edge Functions, cron de notificações |
| [backend/README.md](./backend/README.md) | Endpoints do backend, deploy do serviço de e-mail |
| [CREDENCIAIS.md](./CREDENCIAIS.md) | Logins de desenvolvimento |
| [docs/MEMORIA-PROJETO.md](./docs/MEMORIA-PROJETO.md) | Memória do projeto (ambiente, SSH, notas para o time/IA) |

---

*Desenvolvido por Clube do Software*
