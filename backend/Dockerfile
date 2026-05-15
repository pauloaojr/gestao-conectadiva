# Backend Clínica Pro – Node.js (e-mail, APIs, notificações)
# Build: docker build -t clinica_pro_backend:latest -f Dockerfile .

FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

COPY . .

ENV NODE_ENV=production
ENV PORT=3021

EXPOSE 3021

HEALTHCHECK --interval=30s --timeout=5s --retries=3 --start-period=15s \
  CMD wget -qO- http://127.0.0.1:3021/health >/dev/null 2>&1 || exit 1

CMD ["node", "server.js"]
