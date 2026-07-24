# Deployment Guide: Kubernetes-Ready Deployment

The manifests in [`k8s/`](../../k8s/) are real and applyable — this
guide walks through what they assume, what you still need to provide,
and why the web apps deliberately aren't included as cluster
Deployments.

## Why the Next.js apps aren't in `k8s/`

`studio-web`, `platform-admin`, `client-portal`, `gallery-web`,
`marketing-web`, `docs-web`, and `status-web` are all stateless
Next.js apps that benefit enormously from Vercel/Cloudflare Pages'
edge CDN, automatic preview deploys, and zero-ops SSL — running them
inside the same cluster as `api`/`worker` trades that away for no real
benefit, since they don't share `api`/`worker`'s actual reason for
needing a cluster (queue consumption, long-lived stateful connections
to Postgres/Redis). If your organization has a hard requirement that
*everything* run in-cluster (data residency, no third-party PaaS
allowed), every app already has its own `Dockerfile` — containerizing
them as additional Deployments is straightforward, just not included
here since it's the less common case for this specific set of apps.

## 1. Cluster prerequisites

- A cluster with an ingress controller installed (nginx-ingress or
  equivalent) and **cert-manager** for automatic Let's Encrypt
  certificates.
- `kubectl` access configured against your cluster.
- A container registry your cluster can pull from (ECR, GCR, Docker
  Hub, or a self-hosted registry).

## 2. Database and Redis — managed, not in-cluster

Run PostgreSQL and Redis as managed services (RDS, Cloud SQL, managed
Redis) rather than as StatefulSets in this same cluster. Stateful data
you can't casually redeploy deserves a managed service's own backup/
failover story, independent of whatever happens to your application
cluster — this is a deliberate choice, not an oversight; `k8s/` has no
Postgres/Redis manifests for exactly this reason.

## 3. Object storage and CDN

Same as every other guide — S3, R2, or GCS all work identically
through `@bcp/storage`'s `StorageClient`. Put a CDN in front (Cloud
CDN, CloudFront, or R2's own built-in edge network) the same way as
the AWS or Cloudflare guides.

## 4. Apply the manifests

```bash
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/configmap.yaml   # edit values first — see the file's own comments
# create your real secret.yaml from k8s/secret.example.yaml — never commit it
kubectl apply -f k8s/secret.yaml
kubectl apply -f k8s/api-deployment.yaml
kubectl apply -f k8s/worker-deployment.yaml
kubectl apply -f k8s/ingress.yaml     # edit hostnames first
```

## 5. DNS and SSL

Point your domains at the ingress controller's own external IP/
load-balancer hostname (`kubectl get ingress -n bcp-studio-os` shows
it once provisioned). cert-manager's `letsencrypt-prod` ClusterIssuer
(referenced in `ingress.yaml`'s annotation — create this ClusterIssuer
once per cluster if it doesn't already exist) handles certificate
issuance and renewal automatically from that point on.

## 6. Domain verification for studio custom domains

Identical application-level flow (`StudioDomain`) as every other
guide. Once verified, add the domain as an additional `host` entry
under `ingress.yaml`'s `tls.hosts` and a corresponding `rules` entry
routing to whichever Service serves it, then `kubectl apply` again —
cert-manager issues a certificate for the new host automatically.

## 7. Database migrations

Run as a Kubernetes Job (not part of the Deployment's own startup
command — see
[docs/database-migrations-and-rollback.md](../database-migrations-and-rollback.md)
for why), triggered by CI before rolling out a new `api`/`worker`
image tag:

```bash
kubectl run migrate --rm -i --restart=Never \
  --image=${CONTAINER_REGISTRY}/bcp-api:latest \
  --namespace=bcp-studio-os \
  --env-from=configMapRef:bcp-config,secretRef:bcp-secrets \
  --command -- pnpm --filter @bcp/database exec prisma migrate deploy
```

## 8. Queue setup and worker scaling

Nothing beyond `worker-deployment.yaml`'s own HPA — see that file's
own comments on why it scales on CPU today and how to upgrade to
genuine queue-depth-based scaling via KEDA's BullMQ scaler.

## 9. Horizontal API scaling

`api-deployment.yaml`'s HPA already does this — 2 to 10 replicas on
70% CPU utilization, a real, working starting point tunable once you
have production traffic data.

## 10. Monitoring

Kubernetes' own liveness/readiness probes (already configured in
`api-deployment.yaml`, pointing at Prompt 46's real `/health` and
`/health/ready` endpoints) handle pod-level health; wire your
cluster's own Prometheus/Grafana stack to also scrape
`/health/detailed` for the richer per-service breakdown, and point an
external uptime monitor at `/status/public` exactly as every other
guide.

## 11. Rollback

```bash
kubectl rollout undo deployment/bcp-api -n bcp-studio-os
kubectl rollout undo deployment/bcp-worker -n bcp-studio-os
```

Kubernetes keeps the previous ReplicaSet around by default, making
this a genuinely fast, safe rollback for the *application* — but it
does not roll back a database migration. See
[docs/database-migrations-and-rollback.md](../database-migrations-and-rollback.md)
for that harder, genuinely separate problem.

## 12. Backup recovery

Whichever managed Postgres you chose in step 2 — restore through its
own console/CLI. For the platform's own application-level encrypted
studio backups, see
[docs/backup-recovery-checklist.md](../backup-recovery-checklist.md).
