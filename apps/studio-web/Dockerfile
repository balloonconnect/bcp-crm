# syntax=docker/dockerfile:1
FROM node:20-alpine AS base
RUN corepack enable

FROM base AS deps
WORKDIR /repo
COPY . .
RUN pnpm install --frozen-lockfile

FROM deps AS builder
WORKDIR /repo
RUN pnpm turbo run build --filter=@bcp/studio-web...

FROM base AS runner
WORKDIR /repo
ENV NODE_ENV=production
COPY --from=builder /repo/apps/studio-web/.next ./apps/studio-web/.next
COPY --from=builder /repo/apps/studio-web/public ./apps/studio-web/public
COPY --from=builder /repo/node_modules ./node_modules
COPY --from=builder /repo/apps/studio-web/package.json ./apps/studio-web/package.json
COPY --from=builder /repo/package.json ./package.json
COPY --from=builder /repo/pnpm-workspace.yaml ./pnpm-workspace.yaml
EXPOSE 3002
CMD ["pnpm", "--filter", "@bcp/studio-web", "start"]
