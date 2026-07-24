# Connecting a Custom Domain via AWS Route 53

For studios whose domain is registered with, or has its DNS hosted in, a
Route 53 hosted zone.

## 1. Add the domain in BCP Studio OS

**Settings → Domains → Add domain.** Enter your domain and choose its
purpose. You'll receive a TXT verification record and a routing record
(CNAME for a subdomain, or A record(s) for an apex domain).

## 2. Add the TXT verification record

In the Route 53 console: open your **Hosted zone**, **Create record**.

| Field | Value |
|---|---|
| Record name | `_bcp-verify.gallery` (just the label — Route 53 appends the zone) |
| Record type | `TXT` |
| Value | `"the-verification-token"` (Route 53 requires TXT values in quotes) |
| TTL | 300 |
| Routing policy | Simple routing |

## 3. Add the routing record

**Subdomain** (e.g. `gallery.mystudio.com`):

| Field | Value |
|---|---|
| Record name | `gallery` |
| Record type | `CNAME` |
| Value | the CNAME target from BCP Studio OS |
| TTL | 3600 |

**Apex/root domain** (e.g. `mystudio.com`):

Route 53 supports **Alias records** at the zone apex, which behave like a
CNAME but are valid at the root — prefer this over plain A records if
your target is itself an AWS resource (e.g. an ALB or CloudFront
distribution) with an Alias target available:

| Field | Value |
|---|---|
| Record name | (leave blank for the apex) |
| Record type | `A` |
| Alias | Yes, if pointing at an AWS resource (ALB/CloudFront) — select it from the dropdown |
| Value | if not using Alias, add one A record per IP from your DNS instructions |
| Routing policy | Simple routing |

## 4. If using ACM (AWS Certificate Manager) for SSL

If your infrastructure terminates TLS via an ALB/CloudFront with an ACM
certificate rather than a certificate issued by BCP Studio OS's hosting
layer:

1. Request a certificate for your domain in **ACM** (same region as your
   ALB, or `us-east-1` specifically for CloudFront).
2. ACM will give you a **CNAME validation record** — add it in Route 53
   the same way as step 2 (Route 53 has a **Create records in Route 53**
   button right in the ACM console that does this for you automatically,
   if the zone is in the same AWS account).
3. Once ACM shows the certificate as **Issued**, attach it to your
   ALB listener (443) or CloudFront distribution.
4. Call the `markSslIssued(domainId, expiresAt)` API (or use the domain
   management UI, once wired to your ACM certificate's expiry) so BCP
   Studio OS's `sslStatus` reflects reality.

## 5. Verify and activate in BCP Studio OS

Once DNS has propagated (Route 53 changes typically apply within 60
seconds, though full internet propagation can take longer), click
**Verify domain**, then **Activate** once status shows **Verified** and
**SSL: Issued**.

## Notes on hosted zone delegation

If the domain is registered elsewhere (GoDaddy, Namecheap, etc.) but you
want to manage its DNS in Route 53, create a hosted zone for it in Route
53 first, then update the domain's **nameservers** at your registrar to
the four NS records Route 53 gives you for that hosted zone. DNS changes
in Route 53 only take effect once the registrar's nameserver delegation
points there — this is a separate step from adding individual records.
