# Deploy no Portainer (Docker Swarm + Traefik)

Guia para publicar **Clínica Pro** no mesmo padrão da stack Perfex: Swarm, rede externa `minha_rede`, Traefik com Let's Encrypt.

**Fora desta stack:** Supabase (banco/auth), MinIO e Evolution API (stacks ou serviços separados).

---

## Visão geral

| Serviço | Imagem | Domínio (exemplo) | Porta interna |
|---------|--------|-------------------|---------------|
| Frontend | `clinica_pro_frontend:latest` | `clinica.conectadiva.com.br` | 80 |
| Backend | `clinica_pro_backend:latest` | `api-clinica.conectadiva.com.br` | 3021 |

Arquivos:

- `Dockerfile` (raiz) – build do React + Nginx  
- `backend/Dockerfile` – API Node  
- `docker/portainer-stack.yml` – stack para colar no Portainer  
- `docker/portainer-stack.env.example` – variáveis do backend  

---

## 1. DNS

Crie registros **A** (ou CNAME) apontando para o IP do cluster Swarm:

| Host | Aponta para |
|------|-------------|
| `clinica.conectadiva.com.br` | IP do servidor |
| `api-clinica.conectadiva.com.br` | IP do servidor |

Ajuste os domínios em `docker/portainer-stack.yml` nos labels `Host(...)` se usar outros nomes.

---

## 2. Construir as imagens (no nó manager)

As variáveis `VITE_*` entram **no build** do frontend (ficam gravadas no `dist`).

### Configurar variáveis uma vez (recomendado)

Na raiz do projeto, crie `.env.production` (não vai para o Git):

```bash
cp .env.production.example .env.production
nano .env.production   # preencha URL Supabase, anon key e URL pública do backend
```

Exemplo:

```env
VITE_SUPABASE_URL=https://SEU_PROJECT_REF.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sua-chave-anon-public
VITE_BACKEND_URL=https://api-clinica.conectadiva.com.br
```

Depois, **todo build** usa esse arquivo automaticamente.

### Build com script (recomendado)

**Linux (servidor):**

```bash
cd /opt/clinica-pro
chmod +x scripts/build-docker-images.sh
./scripts/build-docker-images.sh
```

**Windows:**

```powershell
copy .env.production.example .env.production
# edite .env.production
.\scripts\build-docker-images.ps1
```

### Build manual (alternativa)

Com `.env.production` na raiz, basta:

```bash
docker build -t clinica_pro_frontend:latest .
docker build -t clinica_pro_backend:latest -f backend/Dockerfile backend/
```

O Dockerfile copia `.env.production` e o Vite lê no `npm run build`.

Ou passe `--build-arg` manualmente (sobrescreve o arquivo):

```bash
docker build -t clinica_pro_frontend:latest \
  --build-arg VITE_SUPABASE_URL=https://... \
  --build-arg VITE_SUPABASE_PUBLISHABLE_KEY=... \
  --build-arg VITE_BACKEND_URL=https://api-clinica.conectadiva.com.br \
  .
```

Confirme:

```bash
docker images | grep clinica_pro
```

> Em cluster com vários nós, as imagens precisam existir no nó onde o serviço roda (geralmente **manager**), ou use um registry privado e altere `image:` na stack para `seu-registry/clinica_pro_frontend:tag`.

---

## 3. Supabase (antes ou depois do deploy)

Na sua máquina de desenvolvimento:

```bash
npx supabase login
npx supabase link --project-ref SEU_PROJECT_REF
npx supabase db push
npx supabase functions deploy notification-scheduler --project-ref SEU_PROJECT_REF
npx supabase functions deploy trigger-notification-scheduler --project-ref SEU_PROJECT_REF
# ... demais functions conforme INSTALL.md
```

**Secrets** da `notification-scheduler`:

| Secret | Valor |
|--------|--------|
| `NOTIFICATIONS_BACKEND_URL` | `https://api-clinica.conectadiva.com.br` |
| `NOTIFICATIONS_API_KEY` | Token de **Configurações → API** |
| `CRON_SCHEDULER_TOKEN` | Token seguro (igual ao Vault/cron, se usar) |

---

## 4. Criar a stack no Portainer

1. **Stacks** → **Add stack**  
2. Nome sugerido: `clinica-pro`  
3. Cole o conteúdo de `docker/portainer-stack.yml`  
4. Em **Environment variables**, adicione (ver `docker/portainer-stack.env.example`):

   - `SUPABASE_URL`  
   - `SUPABASE_SERVICE_ROLE_KEY`  
   - `SUPABASE_ANON_KEY`  

5. **Deploy the stack**

### Pré-requisitos na infra

- Rede overlay **`minha_rede`** já criada (`external: true`)  
- **Traefik** na mesma rede, com:
  - entrypoint `websecure`  
  - cert resolver `letsencryptresolver` (mesmos nomes da stack Perfex)  

---

## 5. Configuração no aplicativo

Após o deploy:

1. Acesse `https://clinica.conectadiva.com.br` e faça login.  
2. **Integrações → E-mail**  
   - URL do backend: `https://api-clinica.conectadiva.com.br`  
   - SMTP + **Testar conexão**  
3. **Integrações → WhatsApp / MinIO** – URLs dos serviços que você já mantém separados.  
4. **Configurações → API** – token para o scheduler, se usar `NOTIFICATIONS_API_KEY`.  

---

## 6. Validação

| Teste | URL / ação |
|-------|------------|
| Frontend | `https://clinica.conectadiva.com.br` |
| Backend health | `https://api-clinica.conectadiva.com.br/health` |
| E-mail | Integrações → teste SMTP |
| Notificações | Auditoria → Processar pendências (e logs) |

---

## 7. Atualizar versão

No manager, na pasta do código atualizado:

```bash
git pull
./scripts/build-docker-images.sh   # usa .env.production já configurado

# Forçar atualização dos serviços
docker service update --force clinica-pro_clinica_pro_frontend
docker service update --force clinica-pro_clinica_pro_backend
```

O prefixo `clinica-pro_` depende do nome da stack no Portainer.

---

## Troubleshooting

| Problema | Causa provável |
|----------|----------------|
| 404 no front ao atualizar página | Nginx sem `try_files` – use o `docker/nginx.conf` do repositório |
| Front chama `localhost` na API | `VITE_BACKEND_URL` errado no **build** – refaça a imagem do frontend |
| E-mail falha no scheduler | `NOTIFICATIONS_BACKEND_URL` no Supabase deve ser URL pública HTTPS |
| 502 no Traefik | Serviço não na rede `minha_rede` ou porta errada nos labels |
| Imagem não encontrada | Build não foi feito no nó manager ou tag diferente da stack |

---

## Personalizar domínios

Edite em `docker/portainer-stack.yml`:

```yaml
# Frontend
- traefik.http.routers.clinica_pro_frontend.rule=Host(`seu-dominio-app.com.br`)

# Backend
- traefik.http.routers.clinica_pro_backend.rule=Host(`seu-dominio-api.com.br`)
```

`VITE_BACKEND_URL` no build do front deve ser **exatamente** a URL HTTPS do backend.
