# WhatsApp Setup

Connect WhatsApp so your studio can send and receive messages,
reminders, and campaigns directly from BCP Studio OS.

## What you'll need

- A Meta Business account
- A WhatsApp Business phone number (a number not already active on
  the regular WhatsApp app)

## Steps

1. **Create a Meta Business app** at
   [developers.facebook.com](https://developers.facebook.com) and add
   the WhatsApp product to it.
2. **Add your phone number** in the WhatsApp product's setup flow and
   verify it via the SMS/call code Meta sends.
3. **Generate a permanent access token** — Meta's setup flow gives you
   a temporary token first; generate a permanent one from your
   System User settings so it doesn't expire.
4. **Copy your Phone Number ID and Access Token** from the WhatsApp
   product's dashboard.
5. **In Platform Admin** (or your own studio settings, if
   self-service integration is enabled), enter:
   - WhatsApp API URL
   - Access Token
   - Phone Number ID
   - A verify token of your own choosing (any random string)
6. **In Meta's dashboard**, configure your webhook:
   - Callback URL: `https://<your-api-domain>/webhooks/whatsapp`
   - Verify Token: the same value you chose in step 5
   - Subscribe to the `messages` field.
7. Meta sends a verification request to your callback URL
   immediately — if it succeeds, your integration is live.

[Screenshot: Meta WhatsApp Business webhook configuration screen]

## Testing it

Send a test message to your own WhatsApp number from Studio Console's
**WhatsApp** section — you should receive it within seconds, and any
reply you send back should appear in your studio's inbox.

## Templates

WhatsApp requires pre-approved message templates for anything sent
outside a 24-hour conversation window (like a booking confirmation or
reminder). Submit your templates for approval in Meta's dashboard —
approval usually takes a few hours to a day.
