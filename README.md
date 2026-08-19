# Term Craft

Term Craft is a SaaS contract generator and e-signature starter focused on SEO landing pages for agency contract templates.

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https%3A%2F%2Fgithub.com%2Fharshittaneja98sales-cell%2Fterm-craft)

## Render Deployment

This repo includes a `render.yaml` Blueprint for a Node web service:

- Build command used by Render: `npm ci --include=dev && npm run build`
- Start command: `npm start`
- Production URL: `https://usetermcraft.com`

The first deploy uses Render's free web service plan so the site can go live without a billing step. Lead capture, first-party analytics, accounts, and saved documents can persist in Supabase when the Supabase environment variables are configured. Without Supabase, the app falls back to local JSON files, which are not durable on Render Free.

## Durable Leads, Analytics, and Document Vault

1. Create a Supabase project.
2. Open Supabase SQL Editor and run `supabase/schema.sql`.
3. In Render, add these environment variables to the `term-craft` service:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `SUPABASE_PUBLISHABLE_KEY`
   - `ADMIN_API_KEY`
4. Redeploy the latest commit.

Production admin routes require `ADMIN_API_KEY`. `SUPABASE_PUBLISHABLE_KEY` is used for account signup/login. Never expose `SUPABASE_SERVICE_ROLE_KEY` in browser code. It is used only by the Express API.

For account confirmation links, set the Supabase Auth site URL to `https://usetermcraft.com` and add `https://usetermcraft.com/dashboard` as an allowed redirect URL.

## Stripe Test Billing

Term Craft uses Stripe Checkout for test subscription billing and Stripe Customer Portal for subscription management.

1. In Stripe test mode, create a product and recurring price.
2. In Render, add:
   - `STRIPE_SECRET_KEY`
   - `STRIPE_PRICE_ID`
   - `STRIPE_WEBHOOK_SECRET`
3. Add a Stripe webhook endpoint:
   - URL: `https://usetermcraft.com/api/webhooks/stripe`
   - Events: `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.paid`, `invoice.payment_failed`
4. Redeploy the service.

For production, prefer a restricted API key with only the permissions required for Checkout, Customers, Subscriptions, Billing Portal, and webhook-backed reads.

## Follow-up Email Delivery

The post-download modal can email the user an editable/signable workspace link through Resend.

Add these Render environment variables:

- `RESEND_API_KEY`
- `EMAIL_FROM`
- `EMAIL_REPLY_TO`

For initial testing, `EMAIL_FROM` can use `Term Craft <onboarding@resend.dev>`. For production sending from your own domain, verify `usetermcraft.com` in Resend and then use an address like `Term Craft <hello@usetermcraft.com>`.

For a private GitHub repo, install Render's GitHub App on this repository before using the deploy button. After Render creates the service, add `usetermcraft.com` from the service's Custom Domains page and copy the DNS records Render provides into GoDaddy.
