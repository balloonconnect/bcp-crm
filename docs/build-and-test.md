# Build & Test Commands

All commands are run from the repo root and orchestrated by Turborepo, which caches task output and only re-runs what changed (locally, and remotely if you configure Vercel Remote Cache / self-hosted remote cache).

## Build

```bash
pnpm build                                   # build every app & package
pnpm turbo run build --filter=@bcp/studio-web         # build one app (+ its dependencies)
pnpm turbo run build --filter=./packages/*             # build only shared packages
pnpm turbo run build --filter=...@bcp/api               # build api and everything that depends on it
```

## Dev

```bash
pnpm dev                                      # run every app in parallel, no caching
pnpm turbo run dev --filter=@bcp/api                    # run a single app
```

## Lint & format

```bash
pnpm lint                                      # ESLint across the workspace
pnpm lint:fix                                    # ESLint with --fix
pnpm format                                       # Prettier write
pnpm format:check                                  # Prettier check (used in CI)
```

## Type checking

```bash
pnpm typecheck                                    # tsc --noEmit across every workspace package
```

## Tests

```bash
pnpm test                                          # run all test suites once (Vitest)
pnpm test:watch                                      # watch mode, scoped per package
pnpm turbo run test --filter=@bcp/api                          # test a single package/app
```

Test setup notes:
- Apps and Node packages use **Vitest**.
- Database-touching tests should point `DATABASE_URL` at a disposable Postgres (e.g. a `docker compose` instance dedicated to CI) — never the shared dev database.
- No test suites contain business-feature assertions yet; this phase only wires up the runner and config per package (`vitest.config.ts` alongside each `package.json` script).

## Database-specific commands

```bash
pnpm db:generate      # regenerate the Prisma client after a schema change
pnpm db:migrate         # create + apply a new local migration
pnpm db:studio           # open Prisma Studio
```

## Cleaning

```bash
pnpm clean            # removes build outputs, .turbo caches, and node_modules everywhere
```

## Turborepo cache

Turborepo hashes each task's inputs (source files, `.env` files listed in `turbo.json`'s `globalDependencies`, and task-level `inputs`) to decide whether to replay a cached result or re-run. If a build/test succeeds once and nothing relevant changed, subsequent runs return instantly from cache — including across CI runs if remote caching is configured.

To force a clean run ignoring cache:

```bash
pnpm turbo run build --force
```
