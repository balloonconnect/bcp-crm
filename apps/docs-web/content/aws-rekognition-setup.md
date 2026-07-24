# AWS Rekognition Setup

Powers face search in client galleries — clients take a selfie and
instantly find every photo they're in.

## Steps

1. **Sign in to the AWS Console** and go to **IAM**.
2. **Create a new IAM user** dedicated to this integration (never
   reuse a broader account-wide set of credentials).
3. **Attach a policy** granting only the specific Rekognition
   permissions needed: `CreateCollection`, `DeleteCollection`,
   `IndexFaces`, `SearchFacesByImage`, `DetectFaces`, `DeleteFaces`.
   Avoid the broad `AmazonRekognitionFullAccess` managed policy if you
   can — a narrower, explicitly-scoped policy is safer.
4. **Generate an access key** for this user under **Security
   credentials**.
5. **Set the following** in your environment configuration:
   - `AWS_ACCESS_KEY_ID`
   - `AWS_SECRET_ACCESS_KEY`
   - `AWS_REGION` — choose a region close to your users for lower
     latency.

[Screenshot: AWS IAM policy editor showing the scoped Rekognition permissions]

## How it works, and what's private

Each gallery gets its own isolated face collection — a search in one
gallery can never match a face indexed in a different gallery, even
within the same studio. A client's selfie is processed entirely in
memory during the search and is never saved anywhere, and searching
requires their explicit consent every time.

## Enabling it per gallery

Face search is off by default for every new gallery — turn it on from
the gallery's own settings once this integration is configured. See
[Gallery Guide](/docs/gallery-guide).

## Cost

AWS Rekognition charges per image indexed and per search — a
meaningful cost at scale, worth monitoring via AWS's own billing
dashboard, especially for studios with very large galleries.
