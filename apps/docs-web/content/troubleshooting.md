# Troubleshooting

Common issues and how to resolve them.

## Sign-in issues

**"I never received my one-time code"** — check your spam folder
first. If it still hasn't arrived after a few minutes, request a new
one rather than waiting on an old one, which will have expired.

**"My account is locked after too many failed attempts"** — this is
intentional, protecting your account from guessing attacks. Wait for
the lockout period to pass, or use **Forgot Password** to reset and
clear it immediately.

## Gallery and photo issues

**"My uploaded photos aren't showing yet"** — large batches process
in the background; check the upload's own progress indicator. If it's
been stuck for an unusually long time, refresh the page — the upload
itself continues even if you navigate away.

**"A client says they can't access their gallery"** — confirm the
gallery's access setting (public, password, or sign-in required)
matches what you intended, and that you shared the correct link and
any password separately.

## WhatsApp issues

**"Messages aren't sending"** — check **Settings → WhatsApp** for a
clear configuration error message. A common cause is an expired
access token — see [WhatsApp Setup](/docs/whatsapp-setup) to
regenerate a permanent one.

**"I'm not receiving incoming messages"** — confirm your webhook is
still correctly configured in Meta's dashboard; Meta occasionally
requires re-verification if your webhook URL or verify token changed.

## Payment issues

**"A client's payment isn't showing as received"** — online payments
can take a few moments to confirm with the gateway; if it's been
longer than a few minutes, check your payment gateway's own dashboard
directly to confirm whether the charge actually succeeded.

## Domain and SSL issues

**"My custom domain won't verify"** — see
[Custom Domain Setup](/docs/custom-domain-setup)'s troubleshooting
note; the most common cause is a small typo in the DNS record, or DNS
changes that simply haven't propagated yet.

## Still stuck?

Check your platform's own status page for any known, ongoing
incident — many issues that feel account-specific turn out to be a
temporary, already-being-fixed platform issue. If nothing there
explains it, contact your platform admin with what you were doing
when the issue happened, and any error message you saw exactly as it
appeared.
