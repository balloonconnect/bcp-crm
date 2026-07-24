# Connecting a Custom Domain via Cloudflare

For studios whose domain's nameservers point at Cloudflare (the most
common setup for `mystudio.com`-style domains).

## 1. Add the domain in BCP Studio OS

In your studio's **Settings → Domains**, choose **Add domain**, enter your
domain (e.g. `gallery.mystudio.com`), and pick which surface it's for
(CRM, Client Portal, Gallery, Enquiry Form, or Root Website). You'll get
back a TXT verification record and a routing record (CNAME for a
subdomain, or A records for an apex/root domain) — this is the
`GET /domains/:id/dns-instructions` response, shown to you as a table.

## 2. Add the TXT verification record

In the Cloudflare dashboard: **DNS → Records → Add record**.

| Field | Value |
|---|---|
| Type | `TXT` |
| Name | `_bcp-verify` (Cloudflare appends your zone automatically — enter just the subdomain part shown) |
| Content | the verification token from step 1 |
| TTL | Auto |
| Proxy status | **DNS only** (grey cloud) — TXT records aren't proxied anyway, but leave it grey to be safe |

## 3. Add the routing record

**Subdomain** (e.g. `gallery.mystudio.com`):

| Field | Value |
|---|---|
| Type | `CNAME` |
| Name | `gallery` (just the subdomain label) |
| Target | the CNAME target shown in BCP Studio OS |
| Proxy status | **DNS only** (grey cloud) — see note below |

**Apex/root domain** (e.g. `mystudio.com`):

Cloudflare supports **CNAME flattening** at the apex, so you can actually
use a CNAME-style record even at the root:

| Field | Value |
|---|---|
| Type | `CNAME` (Cloudflare flattens this automatically at the apex) |
| Name | `@` |
| Target | the CNAME target shown in BCP Studio OS |

If you'd rather use A records instead, add one A record per IP address
shown in your DNS instructions, all with **Name: @**.

### About the orange cloud (Cloudflare proxy)

Leave routing records **DNS only (grey cloud)** while verification is
pending. Once your domain shows **Active** with **SSL: Issued** in BCP
Studio OS, you can switch to **Proxied (orange cloud)** if you want
Cloudflare's CDN/WAF in front of your studio — just make sure Cloudflare's
SSL/TLS mode is set to **Full (strict)** under **SSL/TLS → Overview**, so
Cloudflare validates the certificate on the origin side too, not just
terminates TLS at the edge.

## 4. Verify

Back in BCP Studio OS, click **Verify domain**. DNS propagation on
Cloudflare is usually fast (seconds to a couple of minutes), but our
retry schedule will keep checking automatically (1m, 5m, 15m, 30m, 1h, …)
if the first check is too early.

## 5. Activate

Once status shows **Verified** and **SSL: Issued**, click **Activate**.
Your domain now serves traffic.

## Troubleshooting

- **Verification keeps failing** — double check you copied the TXT value
  exactly (no extra quotes; Cloudflare adds its own quoting in the UI,
  don't add more) and that the record's **Name** doesn't accidentally
  include your full domain twice (Cloudflare auto-appends the zone).
- **"Too many redirects" after activating with the orange cloud on** —
  your Cloudflare SSL/TLS mode is probably set to **Flexible**; switch to
  **Full (strict)**.
