# syntax=docker/dockerfile:1
FROM node:20-alpine AS base
RUN corepack enable

FROM base AS deps
WORKDIR /repo
COPY . .
RUN pnpm install --frozen-lockfile

FROM deps AS builder
WORKDIR /repo
RUN pnpm turbo run build --filter=@bcp/gallery-web...

FROM base AS runner
WORKDIR /repo
ENV NODE_ENV=production
COPY --from=builder /repo/apps/gallery-web/.next ./apps/gallery-web/.next
COPY --from=builder /repo/apps/gallery-web/public ./apps/gallery-web/public
COPY --from=builder /repo/node_modules ./node_modules
COPY --from=builder /repo/apps/gallery-web/package.json ./apps/gallery-web/package.json
COPY --from=builder /repo/package.json ./package.json
COPY --from=builder /repo/pnpm-workspace.yaml ./pnpm-workspace.yaml
EXPOSE 3004
CMD ["pnpm", "--filter", "@bcp/gallery-web", "start"]
