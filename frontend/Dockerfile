# Multi-stage build for the Next.js frontend, producing a minimal
# standalone runtime image. NEXT_PUBLIC_AI_PROXY_URL is a build-time-baked
# public env var (Next.js inlines NEXT_PUBLIC_* at build time), so it must
# be supplied as a build arg / build-time env, not just a runtime env var.

FROM node:22-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-slim AS builder
WORKDIR /app
ARG NEXT_PUBLIC_AI_PROXY_URL=http://localhost:8000
ENV NEXT_PUBLIC_AI_PROXY_URL=${NEXT_PUBLIC_AI_PROXY_URL}
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:22-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Standalone output already contains a minimal node_modules subset + server.js
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

EXPOSE 3000
CMD ["node", "server.js"]
