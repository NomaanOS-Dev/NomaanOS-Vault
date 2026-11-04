# =====================================================================
# Production Dockerfile for NomaanOS Vault (Default: API service)
# For web frontend, see Dockerfile.web
# =====================================================================
FROM node:20-alpine AS builder

WORKDIR /app

RUN apk add --no-cache openssl libc6-compat

COPY package.json package-lock.json ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/
COPY prisma ./prisma

RUN npm ci

COPY packages/shared ./packages/shared
COPY apps/api ./apps/api

RUN npx prisma generate --schema=prisma/schema.postgresql.prisma
RUN npm run build --workspace=@pwm/shared
RUN npm run build --workspace=@pwm/api

FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3001

RUN apk add --no-cache openssl libc6-compat curl

RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 vaultuser

COPY --from=builder --chown=vaultuser:nodejs /app/package.json /app/package-lock.json ./
COPY --from=builder --chown=vaultuser:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=vaultuser:nodejs /app/prisma ./prisma
COPY --from=builder --chown=vaultuser:nodejs /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder --chown=vaultuser:nodejs /app/packages/shared/package.json ./packages/shared/package.json
COPY --from=builder --chown=vaultuser:nodejs /app/apps/api/dist ./apps/api/dist
COPY --from=builder --chown=vaultuser:nodejs /app/apps/api/package.json ./apps/api/package.json

RUN mkdir -p /app/apps/api/storage && chown -R vaultuser:nodejs /app/apps/api/storage

USER vaultuser

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD curl -f http://localhost:3001/api/health || exit 1

CMD ["node", "apps/api/dist/index.js"]

