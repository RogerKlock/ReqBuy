# ── Stage 1: Build ──────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Copia apenas os arquivos de dependência para cache eficiente
COPY package.json package-lock.json ./

# Instala todas as deps (incluindo devDependencies para compilar TS)
RUN npm ci

# Copia o código do backend e compila
COPY backend/ ./backend/
RUN npm run build

# ── Stage 2: Runtime ────────────────────────────────────────────
FROM node:20-alpine

WORKDIR /app

# Copia apenas package files e instala só dependências de produção
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Copia o build compilado do stage anterior
COPY --from=builder /app/backend/dist ./backend/dist

# Variáveis de ambiente (sobrescritas pelo Render)
ENV NODE_ENV=production
ENV PORT=3001

EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3001/api/v1/auth/me || exit 1

CMD ["node", "backend/dist/server.js"]
