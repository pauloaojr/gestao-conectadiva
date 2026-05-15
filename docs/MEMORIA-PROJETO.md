# Memória do projeto – Clínica Pro

Documento de referência para o time e para o assistente de IA. Atualize quando mudar algo relevante no ambiente ou na infraestrutura.

---

## Ambiente do desenvolvedor (Paulo – Windows)

### Git push e passphrase SSH

**Problema comum:** `git push` pedia passphrase da chave `id_ed25519` a cada vez.

**Causa:** serviço `ssh-agent` parado ou chave não carregada no agente. O Git já usa OpenSSH do Windows (`core.sshCommand` = `C:/Windows/System32/OpenSSH/ssh.exe`).

**Configuração aplicada (2026):**

| Item | Valor / ação |
|------|----------------|
| Serviço | `ssh-agent` → **StartupType: Automatic**, sempre **Running** |
| Chave SSH | `C:\Users\paulo\.ssh\id_ed25519` |
| `~/.ssh/config` | `Host *` com `AddKeysToAgent yes` e `IdentityFile ~/.ssh/id_ed25519` |
| Perfil PowerShell | `~\OneDrive\Documentos\WindowsPowerShell\Microsoft.PowerShell_profile.ps1` inicia o `ssh-agent` se estiver parado |
| Script admin (reconfigurar) | `scripts/setup-ssh-agent.ps1` — executar **como Administrador** |

**Se voltar a pedir passphrase** (ex.: após reiniciar o PC):

```powershell
Start-Service ssh-agent
ssh-add C:\Users\paulo\.ssh\id_ed25519
```

**Remoto Git:** `github.com:pauloaojr/gestao-conectadiva.git` (branch `main`).

---

## Desenvolvimento local (resumo)

| Serviço | URL / porta |
|---------|-------------|
| Frontend (Vite) | http://localhost:8081 — `npm run dev` na raiz |
| Backend Node | http://localhost:3021 — `cd backend && npm run dev` |
| Health backend | http://localhost:3021/health |

Variáveis principais: ver [README.md](../README.md) (seções desenvolvimento e produção).

---

## Notificações e e-mail

- Teste de SMTP em **Integrações → E-mail** funciona no navegador com `http://localhost:3021`.
- **Edge Function `notification-scheduler`** roda na nuvem Supabase: precisa de **URL pública** do backend para e-mail (não `localhost`).
- Logs de envio: **Auditoria → Notificações**; erros de `Connection refused` + localhost incluem dica no `error_message`.

---

## Deploy Portainer (produção)

- Stack: `docker/portainer-stack.yml` — rede `minha_rede`, Traefik, domínios exemplo `clinica.conectadiva.com.br` + `api-clinica.conectadiva.com.br`.
- Imagens: `clinica_pro_frontend:latest`, `clinica_pro_backend:latest` — build com `scripts/build-docker-images.ps1`.
- MinIO e Evolution **não** entram na stack do app. Guia completo: [DEPLOY-PORTAINER.md](./DEPLOY-PORTAINER.md).

---

## Onde documentar mudanças futuras

Adicione novas entradas neste arquivo (com data) ou crie seções. A regra do Cursor em `.cursor/rules/memoria-projeto.mdc` resume pontos críticos para o agente.
