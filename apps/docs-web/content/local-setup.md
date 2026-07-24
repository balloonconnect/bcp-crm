# Local Setup

Get BCP Studio OS running on your own machine for development.

## Prerequisites

- Node.js 20+
- pnpm 9+ (`corepack enable` if you don't have it)
- Docker (for PostgreSQL, Redis, and local S3-compatible storage)

## Steps

1. **Clone the repository** and install dependencies:
   ```bash
   git clone <repository-url>
   cd bcp-studio-os
   pnpm install
   ```
2. **Start local infrastructure** (PostgreSQL, Redis, MinIO for
   storage, Mailpit for email testing):
   ```bash
   docker compose up -d
   ```
3. **Copy environment files** for the apps you'll run:
   ```bash
   cp apps/api/.env.example apps/api/.env
   cp apps/worker/.env.example apps/worker/.env
   ```
   See [Environment Variables](/docs/environment-variables) for what
   each value means.
4. **Apply the database schema**:
   ```bash
   pnpm db:migrate
   ```
5. **Seed demo data** (a working demo studio with sample leads,
   clients, and events, so you're not starting from a completely
   empty database):
   ```bash
   pnpm --filter @bcp/database seed
   ```
6. **Start everything**:
   ```bash
   pnpm dev
   ```
7. Open `http://localhost:3002` for Studio Console, or
   `http://localhost:3001` for Platform Admin.

## Running just one app

`pnpm --filter @bcp/studio-web dev` (or any other app's package name)
starts only that app, useful when you're not touching the backend.

## Running tests

`pnpm test` runs every package's test suite. See the engineering
documentation (`docs/testing-guide.md`) for the full breakdown of
what's unit-tested versus what needs Docker or a real browser.
