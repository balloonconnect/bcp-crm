# Production Deployment

BCP Studio OS supports five production deployment paths, each with
its own complete, step-by-step guide:

1. **Vercel + Railway** — the fastest path to a real production
   deployment; recommended if you're not sure which to pick.
2. **Vercel + AWS** — for teams needing AWS-native compliance and
   audit tooling.
3. **Full Docker VPS** — full control, no managed-service dependency.
4. **Cloudflare + R2** — zero storage-egress fees, a real cost
   advantage for a photo-heavy platform.
5. **Kubernetes-ready** — for teams with existing cluster
   infrastructure.

Every guide covers the same ground in that target's own specific
terms: DNS, SSL, environment variables, database migrations, storage
setup, queue setup, custom domain verification, monitoring, and
backup recovery. The full guides live in the source repository under
`docs/deployment-guides/` — this page is the map; those are the
turn-by-turn directions for whichever path you choose.

## Before you deploy

- [ ] Every required environment variable is set — see
      [Environment Variables](/docs/environment-variables).
- [ ] Object storage is provisioned — see [Storage Setup](/docs/storage-setup).
- [ ] Email sending is configured — see [Email Setup](/docs/email-setup).
- [ ] A staging environment exists and the deployment has been
      rehearsed there first — never deploy to production for the
      first time.

## After you deploy

- [ ] Visit `/health/detailed` on your API domain — every service
      should report healthy.
- [ ] Visit your status page (`status-web`) and confirm it shows the
      same information publicly.
- [ ] Confirm a test backup can be requested and approved — see
      [Backup and Restore](/docs/backup-and-restore).
