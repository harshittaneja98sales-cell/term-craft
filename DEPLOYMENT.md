# Term Craft Deployment

## Recommended Launch Path

Use Render for the first launch because this app includes a Node/Express API for lead capture.

## Render Settings

- Service type: Web Service
- Build command: `npm install && npm run build`
- Start command: `npm start`
- Environment variables:
  - `NODE_ENV=production`
  - `SITE_URL=https://usetermcraft.com`
  - `SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `SUPABASE_PUBLISHABLE_KEY`
  - `ADMIN_API_KEY`
  - `RESEND_API_KEY`
  - `EMAIL_FROM`
  - `EMAIL_REPLY_TO`

The included `render.yaml` defines these settings as a Render Blueprint.

## Durable Lead, Analytics, and Vault Storage

The app can run without Supabase, but Render Free does not provide durable local storage. For production lead capture, analytics, accounts, and saved documents:

1. Create a Supabase project.
2. Open the Supabase SQL Editor.
3. Run `supabase/schema.sql` from this repo.
4. In Render > term-craft > Environment, add:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `SUPABASE_PUBLISHABLE_KEY`
   - `ADMIN_API_KEY`
5. Redeploy the service.

Production admin routes require `ADMIN_API_KEY`. `SUPABASE_PUBLISHABLE_KEY` powers account signup/login. The service role key must stay server-side. Do not put it in frontend code or public docs.

In Supabase > Authentication > URL Configuration, set the Site URL to `https://usetermcraft.com` and add `https://usetermcraft.com/dashboard` as a redirect URL so signup confirmation emails return users to the app.

## Email Delivery

Term Craft sends the editable/signable workspace link through Resend when `RESEND_API_KEY` is configured.

1. Create or open a Resend account.
2. Create an API key.
3. In Render > term-craft > Environment, add:
   - `RESEND_API_KEY`
   - `EMAIL_FROM`
   - `EMAIL_REPLY_TO`
4. Redeploy the service.

For testing, `EMAIL_FROM=Term Craft <onboarding@resend.dev>` can be used. Before real traffic, verify `usetermcraft.com` in Resend and switch `EMAIL_FROM` to your own sender, such as `Term Craft <hello@usetermcraft.com>`.

## GoDaddy DNS

After the Render service is live, add `usetermcraft.com` as a custom domain in Render. Render will show the exact DNS records to add in GoDaddy.

In GoDaddy:

1. Open your domain portfolio.
2. Select `usetermcraft.com`.
3. Open DNS records.
4. Add or edit the records Render gives you.
5. Wait for DNS propagation and SSL issuance.

Use `https://usetermcraft.com/sitemap.xml` in Google Search Console after DNS is live.
