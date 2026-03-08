
# 🏥 Sistema de Gestão de Clínica - Credenciais de Acesso

## 📋 Níveis de Acesso Recomendados

> **💡 NOTA IMPORTANTE:** O primeiro usuário a se cadastrar no sistema receberá automaticamente o nível de **ADMINISTRADOR**. Usuários subsequentes serão criados como **USUÁRIOS** comuns por padrão.

### 🔴 **ADMINISTRADOR** (Acesso Total)
- ✅ Dashboard
- ✅ Pacientes
- ✅ Prontuários Médicos
- ✅ Agenda
- ✅ Relatórios
- ✅ Configurações do Sistema
- ✅ Gerenciamento de Usuários

### 🟡 **GERENTE** (Acesso Operacional)
- ✅ Dashboard
- ✅ Pacientes
- ✅ Prontuários Médicos
- ✅ Agenda
- ✅ Relatórios
- ❌ Configurações do Sistema
- ❌ Gerenciamento de Usuários

### 🟢 **USUÁRIO** (Acesso Básico)
- ✅ Dashboard
- ✅ Pacientes
- ❌ Prontuários Médicos
- ✅ Agenda
- ❌ Relatórios
- ❌ Configurações do Sistema
- ❌ Gerenciamento de Usuários

---

## 🛡️ Configurações de Segurança

- **Expiração de senha:** 90 dias
- **Timeout de sessão:** 60 minutos
- **Registro de novos usuários:** Permitido (pode ser desabilitado pelos administradores)

## 📝 Como Testar o Sistema

1. **Acesse a página de login**
2. **Use qualquer uma das credenciais acima**
3. **Observe as diferenças nos menus e permissões** conforme o nível do usuário
4. **Teste funcionalidades específicas** de cada papel

### Exemplos de Teste:
- **Login como Admin** → Acesse "Configurações" → Aba "Usuários"
- **Login como Gerente** → Tente acessar "Prontuários" (deve funcionar)
- **Login como Usuário** → Tente acessar "Relatórios" (deve ser negado)

---

## ⚠️ **IMPORTANTE**

- **NÃO compartilhe essas credenciais** em ambiente de produção
- **Altere todas as senhas** antes de usar em produção
- **Desabilite usuários de teste** em ambiente real
- **Configure autenticação externa** (ex: Google, Microsoft) para maior segurança

---

## 🔄 Alteração de Senhas

Usuários podem alterar suas senhas através de:
**Configurações** → **Segurança** → **Alterar Senha**

---

*Desenvolvido por Club Do Software*
