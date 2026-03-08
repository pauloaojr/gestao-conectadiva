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

### 3. Backend (APIs e E-mail)
O backend Node.js (`./backend/`) fornece:
- APIs REST (Pacientes, Receitas, Despesas) – autenticadas por token
- E-mail SMTP
- Storage MinIO

Configure no `.env` do backend:
```
PORT=3021
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_SERVICE_ROLE_KEY=sua-service-role-key
```

### 4. Edge Functions (Supabase)
Edge Functions para processos críticos (criação de usuários, reset de senha):

```bash
# Deploy da função de criação de usuário
npx supabase functions deploy create-user

# Deploy da função de reset de senha
npx supabase functions deploy reset-user-password
```

> **Nota:** As APIs de Pacientes, Receitas e Despesas foram migradas para o Backend (`/api/patients`, `/api/revenue`, `/api/expenses`). As Edge Functions `api-patients`, `api-revenue` e `api-expenses` podem ser descontinuadas.

#### Notas sobre Edge Functions:
- Certifique-se de configurar as variáveis de ambiente necessárias no dashboard do Supabase (**Settings > API > Edge Functions**).
- As funções estão localizadas em `./supabase/functions/`.

### 5. Deploy do Frontend (Produção)
Para gerar o build de produção:

```bash
# Gerar a build
npm run build
```
O conteúdo será gerado na pasta `dist/`, pronto para ser hospedado no Vercel, Netlify ou no próprio Supabase Hosting.

---

## ⚡ Comandos Úteis

| Comando | Descrição |
| :--- | :--- |
| `npm run dev` | Inicia o servidor local |
| `npm run build` | Cria a versão de produção |
| `npm run lint` | Verifica erros de estilo no código |
| `npx supabase migrations list` | Lista as migrations aplicadas |
| `npx supabase stop` | Para o serviço local do Supabase |

*Desenvolvido por Club Do Software*
