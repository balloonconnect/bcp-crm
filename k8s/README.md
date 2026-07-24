# Kubernetes manifests

Real, applyable manifests for the "Kubernetes-ready deployment" target
— `api` and `worker` as separately-scaled Deployments, an HPA for
each, an Ingress handling SSL termination and custom-domain routing,
and Config/Secret templates. The web apps (`studio-web`,
`platform-admin`, `client-portal`, `gallery-web`, `marketing-web`,
`docs-web`, `status-web`) are Next.js apps best run on Vercel/Cloudflare
Pages even in a Kubernetes-based deployment (see
[docs/deployment-guides/kubernetes.md](../docs/deployment-guides/kubernetes.md)
for why) — they're not included here as Deployments, though nothing
prevents containerizing them with their own existing Dockerfiles if a
fully cluster-hosted deployment is genuinely required.

## Apply order

```bash
kubectl apply -f namespace.yaml
kubectl apply -f configmap.yaml
kubectl apply -f secret.yaml          # your own filled-in copy of secret.example.yaml — never commit the real one
kubectl apply -f api-deployment.yaml
kubectl apply -f worker-deployment.yaml
kubectl apply -f ingress.yaml
```

## What's genuinely here versus what needs your own values

- `${CONTAINER_REGISTRY}` in both Deployment manifests needs
  substituting for your actual registry (or use `envsubst`/Kustomize/
  Helm to template it — these are deliberately plain manifests, not a
  Helm chart, so the shape is inspectable without a templating
  engine in the way).
- `api.example.com` etc. in `ingress.yaml` need your actual domains.
- The worker's HPA scales on CPU as an honest starting point — BullMQ
  has no HTTP endpoint to scrape for real queue depth, so a production
  deployment should add
  [KEDA's BullMQ scaler](https://keda.sh/docs/latest/scalers/redis-lists/)
  for genuine queue-depth-based autoscaling. Not wired here — stated
  directly rather than implied as already handled.

See [docs/deployment-guides/kubernetes.md](../docs/deployment-guides/kubernetes.md)
for the full walkthrough: DNS, SSL, environment variables, database
migration, storage setup, queue setup, domain verification,
monitoring, and backup recovery, all in the Kubernetes context
specifically.
