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
  - `ADMIN_API_KEY`

The included `render.yaml` defines these settings as a Render Blueprint.

## Durable Lead Storage

The app can run without Supabase, but Render Free does not provide durable local storage. For production lead capture:

1. Create a Supabase project.
2. Open the Supabase SQL Editor.
3. Run `supabase/schema.sql` from this repo.
4. In Render > term-craft > Environment, add:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `ADMIN_API_KEY`
5. Redeploy the service.

Production admin routes require `ADMIN_API_KEY`. The service role key must stay server-side. Do not put it in frontend code or public docs.

## GoDaddy DNS

After the Render service is live, add `usetermcraft.com` as a custom domain in Render. Render will show the exact DNS records to add in GoDaddy.

In GoDaddy:

1. Open your domain portfolio.
2. Select `usetermcraft.com`.
3. Open DNS records.
4. Add or edit the records Render gives you.
5. Wait for DNS propagation and SSL issuance.

Use `https://usetermcraft.com/sitemap.xml` in Google Search Console after DNS is live.
