# syntax=docker/dockerfile:1
FROM node:20-alpine AS base
RUN corepack enable

FROM base AS deps
WORKDIR /repo
COPY . .
RUN pnpm install --frozen-lockfile

FROM deps AS builder
WORKDIR /repo
RUN pnpm turbo run build --filter=@bcp/worker...

FROM base AS runner
WORKDIR /repo
ENV NODE_ENV=production
COPY --from=builder /repo/apps/worker/dist ./apps/worker/dist
COPY --from=builder /repo/node_modules ./node_modules
CMD ["node", "apps/worker/dist/index.mjs"]
