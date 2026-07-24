# Connecting a Custom Domain via Vercel

If BCP Studio OS's web apps are deployed on Vercel (see the root
[docs/deployment.md](../../../../docs/deployment.md)), Vercel handles TLS
certificate issuance and renewal automatically once your domain's DNS
points at it — you don't need a separate certificate step.

## 1. Add the domain in BCP Studio OS

**Settings → Domains → Add domain.** Enter your domain and choose its
purpose. You'll get a TXT verification record and a routing record.

## 2. Add the domain in Vercel

In the Vercel dashboard, open the project that serves the surface you're
connecting (e.g. `gallery-web` for a Gallery domain), go to **Settings →
Domains**, and add the same domain. Vercel will show you its own required
DNS records — usually a CNAME to `cname.vercel-dns.com` for subdomains, or
an A record to `76.76.21.21` for apex domains. **Use Vercel's values for
the routing record**, not the generic ones from BCP Studio OS's DNS
instructions — Vercel needs to see traffic arrive at its edge to issue and
route the certificate correctly.

## 3. Add BCP Studio OS's TXT verification record

Add the TXT record from step 1 with your DNS provider (wherever your
domain's nameservers actually point — Vercel's own DNS management, or
your registrar/Cloudflare/Route 53). This is separate from Vercel's own
domain-ownership TXT challenge, if it shows one — you may end up adding
two TXT records at different names; that's expected, they verify
ownership for two different systems.

## 4. DNS records to add

**Subdomain:**

| Type | Name | Value | Purpose |
|---|---|---|---|
| TXT | `_bcp-verify.gallery` | (token from BCP Studio OS) | BCP Studio OS ownership verification |
| CNAME | `gallery` | `cname.vercel-dns.com` | Vercel routing (use Vercel's exact value) |

**Apex domain:**

| Type | Name | Value | Purpose |
|---|---|---|---|
| TXT | `_bcp-verify` | (token from BCP Studio OS) | BCP Studio OS ownership verification |
| A | `@` | `76.76.21.21` | Vercel routing (use Vercel's exact value — this can change, always check Vercel's dashboard) |

## 5. Verify and activate in BCP Studio OS

Once DNS propagates, click **Verify domain**, then **Activate** once
status shows **Verified**. SSL status will show **Issued** once Vercel
finishes provisioning its certificate (usually within a few minutes of
the domain showing "Valid Configuration" in Vercel's own dashboard).

## Notes

- Vercel's certificate provisioning is independent of BCP Studio OS's
  `sslStatus` field — `markSslIssued()` (the API integration point) is
  called once Vercel's status confirms the cert is live, either via a
  manual check or a future webhook integration.
- If you're running multiple surfaces (CRM + Gallery + Portal) as
  separate Vercel projects, each domain needs to be added to its
  *specific* project in Vercel, matching the `purpose` you selected in
  BCP Studio OS.
