# Free image generation

Image generation uses Cloudflare Workers AI FLUX.1 schnell. There is no OpenAI fallback. Existing images remain readable without provider credentials.

## Setup

1. Create a Cloudflare account and keep the Workers Free plan. Do not upgrade Workers or enable prepaid AI Gateway billing for this integration.
2. Open Workers AI → Use REST API. Create an API token restricted to this account with Workers AI Read, Workers AI Edit, and Billing Read permissions. Billing Read is needed to check account subscriptions before inference; Billing Write is not needed.
3. Put the token in the server-only `CLOUDFLARE_API_TOKEN` environment variable and the account ID in `CLOUDFLARE_ACCOUNT_ID`. For local development use the ignored `.env.local`; for Vercel use project environment settings and redeploy. Never use a `NEXT_PUBLIC_` prefix or commit the token.

The API refuses inference when credentials are missing, billing cannot be read, subscription results are incomplete, or any active subscription is paid/unknown (even if its base price is zero). This conservative check may also block accounts with unrelated paid subscriptions; use a separate free account in that case.

Workers Free provides a shared daily allowance, not unlimited image generation. Exhausting it stops requests rather than upgrading the plan. Changes to account subscriptions must not be made while image generation is running. Firebase storage/read/write usage is separate from the image provider's free allowance.

References:
- https://developers.cloudflare.com/workers-ai/platform/pricing/
- https://developers.cloudflare.com/workers-ai/get-started/rest-api/
- https://developers.cloudflare.com/workers-ai/models/flux-1-schnell/
- https://developers.cloudflare.com/api/resources/accounts/subresources/subscriptions/methods/get/
