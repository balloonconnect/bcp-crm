# syntax=docker/dockerfile:1
FROM node:20-alpine AS base
RUN corepack enable

FROM base AS deps
WORKDIR /repo
COPY . .
RUN pnpm install --frozen-lockfile

FROM deps AS builder
WORKDIR /repo
RUN pnpm turbo run build --filter=@bcp/status-web...

FROM base AS runner
WORKDIR /repo
ENV NODE_ENV=production
COPY --from=builder /repo/apps/status-web/.next ./apps/status-web/.next
COPY --from=builder /repo/apps/status-web/public ./apps/status-web/public
COPY --from=builder /repo/node_modules ./node_modules
COPY --from=builder /repo/apps/status-web/package.json ./apps/status-web/package.json
COPY --from=builder /repo/package.json ./package.json
COPY --from=builder /repo/pnpm-workspace.yaml ./pnpm-workspace.yaml
EXPOSE 3006
CMD ["pnpm", "--filter", "@bcp/status-web", "start"]
