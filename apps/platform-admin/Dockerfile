# syntax=docker/dockerfile:1
FROM node:20-alpine AS base
RUN corepack enable

FROM base AS deps
WORKDIR /repo
COPY . .
RUN pnpm install --frozen-lockfile

FROM deps AS builder
WORKDIR /repo
RUN pnpm turbo run build --filter=@bcp/platform-admin...

FROM base AS runner
WORKDIR /repo
ENV NODE_ENV=production
COPY --from=builder /repo/apps/platform-admin/.next ./apps/platform-admin/.next
COPY --from=builder /repo/apps/platform-admin/public ./apps/platform-admin/public
COPY --from=builder /repo/node_modules ./node_modules
COPY --from=builder /repo/apps/platform-admin/package.json ./apps/platform-admin/package.json
COPY --from=builder /repo/package.json ./package.json
COPY --from=builder /repo/pnpm-workspace.yaml ./pnpm-workspace.yaml
EXPOSE 3001
CMD ["pnpm", "--filter", "@bcp/platform-admin", "start"]
