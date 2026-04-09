# ─── Stage 1: Build ───────────────────────────────────────────
FROM node:22-alpine AS builder

WORKDIR /app

# Copiar manifiestos de dependencias
COPY package*.json ./
COPY prisma ./prisma/

# Instalar TODAS las dependencias (incluyendo devDeps para tsc)
RUN npm ci

# Copiar el resto del código fuente
COPY . .

# Build: genera el cliente de Prisma y compila TypeScript
RUN npm run build

# ─── Stage 2: Runtime ─────────────────────────────────────────
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Solo copiar lo necesario para producción
COPY package*.json ./
COPY prisma ./prisma/

# Instalar solo dependencias de producción
RUN npm ci --omit=dev

# Copiar los archivos compilados
COPY --from=builder /app/dist ./dist

# Copiar archivos estáticos del frontend
COPY --from=builder /app/public ./public

# Generar cliente de Prisma en el runtime image
RUN npx prisma generate

EXPOSE 3000

CMD ["node", "dist/server.js"]
