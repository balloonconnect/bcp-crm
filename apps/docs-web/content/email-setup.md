# Email Setup

Connect an email provider so the platform can send quotations,
invoices, notifications, and campaigns.

## Steps

1. **Choose an SMTP provider** — any standard SMTP service works
   (Amazon SES, SendGrid, Postmark, or your own mail server).
2. **Get your SMTP credentials** from your provider — host, port,
   username, and password.
3. **Set the following** in your environment configuration (Platform
   Admin → System Config, or your deployment's environment variables):
   - `SMTP_HOST`
   - `SMTP_PORT`
   - `SMTP_USER`
   - `SMTP_PASSWORD`
   - `EMAIL_FROM` — the address your emails will be sent from
4. **Verify your sending domain** with your provider (SPF, DKIM, and
   ideally DMARC records) — this significantly reduces the chance of
   your emails landing in spam. Your provider's own dashboard will
   walk you through the exact DNS records to add.
5. **Send a test email** from Platform Admin's provider test tool to
   confirm everything is working.

[Screenshot: Email provider configuration screen with a "Send test email" button]

## Bounce and complaint handling

The platform automatically tracks bounced emails and stops sending to
an address that bounces repeatedly, so your sending reputation stays
healthy without you needing to manage a suppression list by hand.

## Local development

Local development uses [Mailpit](http://localhost:8025) automatically
— every email sent locally is caught there instead of actually being
delivered, so you can preview exactly what a client would receive
without spamming a real inbox.
