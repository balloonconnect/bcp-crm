# Security

How BCP Studio OS protects your studio's data and your clients' data.

## Your data is isolated

Your studio's data is never visible to any other studio on the
platform — this is enforced at the database level itself, not just by
what the interface happens to show you, and it's automatically
tested to make sure it stays that way as the platform grows.

## Your account

- **Passwords** are never stored in a readable form, anywhere.
- **Two-factor authentication** is available on every account — turn
  it on from **Settings → Security**.
- **Unusual sign-ins** (a new device or location) trigger an alert to
  your account's email so you know immediately if something looks
  off.
- **Session management** — see every device currently signed in to
  your account from **Settings → Security → Active Sessions**, and
  sign any of them out remotely.

[Screenshot: Active sessions list with a "Sign out" button per device]

## Your clients' data

- Client photos are never publicly reachable by guessing a URL —
  every access goes through a time-limited, signed link.
- Face search (if you use it) requires a client's explicit consent
  every time, and their selfie is never stored.
- A client's contract signature requires the same one-time-code
  verification your own account uses — no signature is accepted from
  a typed name alone.

## Payment and financial data

Card details are never handled directly by this platform — payments
go through your configured payment gateway (Razorpay), which is
independently certified for handling that data securely.

## What we never log

Passwords, one-time codes, access tokens, payment credentials, and
signed photo/download links are never written to any log file,
anywhere in the platform, under any circumstances.

## Reporting a security concern

If you believe you've found a security issue, contact your platform
admin directly rather than testing it further yourself.
