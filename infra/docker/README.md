# infra/docker

Root-level `docker-compose.yml` (infra services: Postgres, Redis, MinIO, Mailpit) and
`docker-compose.apps.yml` (optional full-stack app overlay) live at the repo root so
`docker compose up -d` works from anywhere without `-f` flags.

This directory is reserved for additional infra assets as they're introduced in later
phases — e.g. Postgres init SQL, MinIO bucket policies, or Nginx/Caddy reverse-proxy
config for local multi-tenant domain testing.
