# Backend de e-mail – Clínica Pro

Servidor Node.js que envia e-mails via SMTP usando as configurações informadas pela aplicação.

## Endpoints

- `POST /api/email/test` – Envia um e-mail de teste para o remetente (valida SMTP).
  - Body: `{ "config": { "host", "port", "useTls", "username", "password", "fromName", "fromEmail" } }`

- `POST /api/email/send` – Envia um e-mail de teste para um destinatário.
  - Body: `{ "config": { ... }, "toEmail": "destino@email.com" }`

- `GET /health` – Health check.

## Uso local

```bash
cd backend
npm install
npm start
```

O servidor sobe em `http://localhost:3021`. Na tela de Integrações → Email, use a URL **http://localhost:3021** no campo "URL do backend de e-mail".

## Deploy (Railway, Render, VPS etc.)

1. Defina a variável de ambiente `PORT` (o serviço geralmente define automaticamente).
2. Faça o deploy deste diretório (ou monte apenas a pasta `backend/`).
3. Informe a URL pública (ex.: `https://seu-app.railway.app`) no campo "URL do backend de e-mail" na aplicação.

## CORS

O backend aceita requisições de qualquer origem (`cors({ origin: true })`). Em produção você pode restringir em `server.js` para o domínio do front.
