# syntax=docker/dockerfile:1
FROM node:20-alpine AS base
RUN corepack enable

FROM base AS deps
WORKDIR /repo
COPY . .
RUN pnpm install --frozen-lockfile

FROM deps AS builder
WORKDIR /repo
RUN pnpm turbo run build --filter=@bcp/client-portal...

FROM base AS runner
WORKDIR /repo
ENV NODE_ENV=production
COPY --from=builder /repo/apps/client-portal/.next ./apps/client-portal/.next
COPY --from=builder /repo/apps/client-portal/public ./apps/client-portal/public
COPY --from=builder /repo/node_modules ./node_modules
COPY --from=builder /repo/apps/client-portal/package.json ./apps/client-portal/package.json
COPY --from=builder /repo/package.json ./package.json
COPY --from=builder /repo/pnpm-workspace.yaml ./pnpm-workspace.yaml
EXPOSE 3003
CMD ["pnpm", "--filter", "@bcp/client-portal", "start"]
