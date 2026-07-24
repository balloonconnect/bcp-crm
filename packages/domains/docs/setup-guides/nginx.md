# Connecting a Custom Domain via Nginx (Self-Hosted)

For self-hosted deployments (see `infra/docker` and
`docker-compose.apps.yml`) where BCP Studio OS runs behind your own Nginx
reverse proxy rather than a managed platform.

## 1. Add the domain in BCP Studio OS

**Settings → Domains → Add domain.** Enter your domain and choose its
purpose. You'll receive a TXT verification record and a CNAME/A routing
record pointing at `DOMAIN_CNAME_TARGET` / `DOMAIN_APEX_IPS` (the values
your ops team configured in the API's environment — see
`apps/api/.env.example`).

## 2. Point DNS at your Nginx server

Add the TXT verification record with your DNS provider, and point the
routing record (CNAME for a subdomain, A record(s) for an apex domain) at
the public IP address(es) of the server(s) running your Nginx reverse
proxy — this should match `DOMAIN_APEX_IPS` in your API's environment
configuration.

## 3. Configure Nginx to accept the domain

Add a `server` block for the new domain, proxying to the correct upstream
app for its `purpose` (studio-web for CRM, client-portal for the portal,
gallery-web for galleries, etc — see the root `docker-compose.apps.yml`
for the app→port mapping):

```nginx
server {
    listen 80;
    server_name gallery.mystudio.com;

    # Let the ACME HTTP-01 challenge through before certbot obtains a cert.
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        return 301 https://$host$request_uri;
    }
}

server {
    listen 443 ssl http2;
    server_name gallery.mystudio.com;

    ssl_certificate     /etc/letsencrypt/live/gallery.mystudio.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/gallery.mystudio.com/privkey.pem;

    location / {
        proxy_pass http://gallery-web:3004;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Reload Nginx: `nginx -s reload`.

> **Important:** always forward the real `Host` header (`proxy_set_header
> Host $host;`, shown above) and `X-Forwarded-*` headers — BCP Studio OS's
> secure hostname middleware (see
> [../custom-domains.md](../custom-domains.md) § "Secure hostname
> middleware") validates the `Host` header it receives, so Nginx must pass
> through the domain the browser actually requested, not the upstream's
> internal service name.

## 4. Issue a certificate with certbot

```bash
certbot certonly --webroot -w /var/www/certbot \
  -d gallery.mystudio.com \
  --email ops@mystudio.com --agree-tos --no-eff-email
```

Set up certbot's renewal timer/cron (`certbot renew`) if it isn't already
running — Let's Encrypt certificates expire after 90 days.

## 5. Verify and activate in BCP Studio OS

Once DNS has propagated and Nginx is serving the domain, click **Verify
domain** in BCP Studio OS, then **Activate** once it shows **Verified**.
Record the certificate's expiry (`certbot certificates` shows it) against
the domain so BCP Studio OS's `needsSslRenewal()` check has something to
compare against — wire this up via the `markSslIssued(domainId,
expiresAt)` API call, either manually or from a certbot renewal hook.

## Multiple domains, one Nginx instance

Repeat steps 2–4 for each additional domain — Nginx's SNI-based routing
(`server_name` matching) means one reverse-proxy instance can serve any
number of studios' custom domains, each with its own certificate and
upstream target.
