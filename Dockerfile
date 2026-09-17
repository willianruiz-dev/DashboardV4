# syntax=docker/dockerfile:1
#
# Imagen de producción del Dashboard V4 (Next.js + rutas BFF).
#
# Las credenciales del API legado NO se hornean en la imagen: el servidor las lee con
# `process.env` en tiempo de ejecución, así que se pasan al contenedor (`docker run -e …`,
# `--env-file` o el `environment:` del compose). Esto permite construir y publicar la imagen
# desde GitHub sin secretos y reutilizar la misma imagen en cualquier ambiente.

# ---------- dependencias ----------
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# ---------- compilación ----------
FROM node:22-alpine AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Sin variables de entorno: si el build exigiera claves, sería un fallo de diseño.
RUN npm run build

# ---------- ejecución ----------
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0
RUN addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 nextjs

# `output: "standalone"` (next.config.mjs) ya trae el servidor y sus dependencias.
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000

# Comprobación local del contenedor: la pantalla de acceso debe responder.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD wget -q -O /dev/null http://127.0.0.1:3000/login || exit 1

CMD ["node", "server.js"]
