# Multi-stage build for NestJS app

# Base stage for shared dependencies and setup
FROM node:20-alpine AS base
WORKDIR /app
# OpenSSL is required for Prisma
RUN apk add --no-cache openssl

# Dependencies stage
FROM base AS deps
COPY package*.json ./
COPY prisma ./prisma/
RUN npm ci

# Development stage
FROM base AS development
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/package*.json ./
COPY --from=deps /app/prisma ./prisma
COPY . .
# Generate client for dev
RUN npx prisma generate
EXPOSE 3000 5555
CMD ["npm", "run", "start:dev"]

# Builder stage for production
FROM deps AS builder
COPY . .
RUN npx prisma generate
RUN npm run build

# Production stage
FROM base AS production
COPY package*.json ./
COPY prisma ./prisma/
# Install only production dependencies
RUN npm ci --omit=dev
COPY --from=builder /app/dist ./dist
# Generate Prisma Client in production stage
RUN npx prisma generate

EXPOSE 3000
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main"]
