# Custom Domain Setup

Give your studio its own branded domain — for example,
`gallery.yourstudio.com` instead of the platform's own shared domain.

## Steps

1. From Studio Console, go to **Settings → Domains** → **Add Domain**.
2. Enter the domain or subdomain you want to use.
3. The platform shows you a DNS record to add — usually a `CNAME`
   pointing at the platform's own domain, or a `TXT` record for
   verification.
4. **Add that record** in your own domain provider's DNS settings
   (GoDaddy, Namecheap, Cloudflare, or wherever your domain is
   registered).
5. Back in Studio Console, click **Verify** — this can take anywhere
   from a few minutes to a few hours, depending on how quickly your
   DNS provider propagates changes.

[Screenshot: Domain setup screen showing the DNS record to add and a Verify button]

## Once verified

Your domain automatically gets a real SSL certificate — no separate
certificate purchase or installation needed. From this point on,
galleries, e-albums, and (if enabled) your client portal are reachable
at your own domain.

## Troubleshooting verification

If verification doesn't succeed after a few hours, double-check the
exact DNS record matches what was shown (a common mistake is a typo
or an extra trailing dot) — see [Troubleshooting](/docs/troubleshooting).
