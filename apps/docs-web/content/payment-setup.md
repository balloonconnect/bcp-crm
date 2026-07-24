# Payment Setup

Accept online payments directly through invoice links.

## Steps

1. **Create a Razorpay account** at
   [razorpay.com](https://razorpay.com) (the platform's primary
   supported gateway) and complete their KYC verification — this can
   take a few business days for a new business.
2. **Generate API keys** from Razorpay's dashboard under
   **Settings → API Keys**.
3. **Set the following** in your environment configuration:
   - `RAZORPAY_KEY_ID`
   - `RAZORPAY_KEY_SECRET`
4. Once set, every invoice you send automatically includes a **Pay
   Now** option your clients can use directly.

[Screenshot: Razorpay API keys page in their dashboard]

## Manual payments still work without this

Payment setup is entirely optional — studios can record cash, bank
transfer, or any other manual payment method regardless of whether
online payments are configured. See [Billing Guide](/docs/billing-guide).

## Testing

Razorpay provides test-mode API keys that simulate payments without
moving real money — use these while you're setting things up, and
switch to live keys only once you're ready to accept real payments.
