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
| **Backend**   | Supabase (Auth, PostgreSQL, Storage, Edge Functions) |

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
- **Integrações** – WhatsApp (Evolution API), e-mail (SMTP) e outras  
- **Auditoria** – Log de ações do sistema  

Login, redefinição de senha e edição de e-mail de atendentes ficam alinhados entre **Authentication** e **profiles** (Supabase).

---

## 🏗️ Estrutura do Projeto

```
clinica-pro/
├── src/
│   ├── components/     # Componentes reutilizáveis e UI
│   ├── contexts/       # Auth, Establishment, Customization, etc.
│   ├── hooks/         # useProfiles, useSupabaseUsers, useAppointments, etc.
│   ├── pages/         # Páginas da aplicação (Dashboard, Pacientes, Agenda, etc.)
│   ├── services/      # Notificações, auditoria, etc.
│   └── lib/            # Utilitários e configurações
├── supabase/
│   ├── functions/     # Edge Functions (create-user, reset-user-password, etc.)
│   └── migrations/    # Schema do banco
├── INSTALL.md         # Guia de instalação e deploy
└── package.json
```

---

## ⚡ Início rápido

**Pré-requisitos:** Node.js 18+, npm (ou bun), conta Supabase.

```bash
# Clonar e instalar dependências
npm install
# ou, em caso de conflito de peer deps:
npm install --legacy-peer-deps

# Configurar variáveis de ambiente (Supabase)
# Copie .env.example para .env e preencha VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY

# Servidor de desenvolvimento
npm run dev
```

Build de produção:

```bash
npm run build
```

O conteúdo de produção fica em `dist/` e pode ser hospedado na Vercel, Netlify ou Supabase.

Para **instalação completa**, **migrations**, **deploy das Edge Functions** e **variáveis de ambiente**, use o [INSTALL.md](./INSTALL.md).

---

## 🔐 Credenciais e permissões

Credenciais de teste e níveis de acesso (Admin, Gerente, Atendente) estão descritos em [CREDENCIAIS.md](./CREDENCIAIS.md).

---

## 📜 Scripts

| Comando | Descrição |
|--------|-----------|
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` | Build de produção |
| `npm run preview` | Preview do build |
| `npm run lint` | Verificação ESLint |
| `npm run test` | Testes (Vitest) |

---

*Desenvolvido por Clube do Software*
