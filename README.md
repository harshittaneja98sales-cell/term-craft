# Term Craft

Term Craft is a SaaS contract generator and e-signature starter focused on SEO landing pages for agency contract templates.

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https%3A%2F%2Fgithub.com%2Fharshittaneja98sales-cell%2Fterm-craft)

## Render Deployment

This repo includes a `render.yaml` Blueprint for a Node web service:

- Build command used by Render: `npm ci --include=dev && npm run build`
- Start command: `npm start`
- Production URL: `https://usetermcraft.com`

The first deploy uses Render's free web service plan so the site can go live without a billing step. Lead capture and first-party analytics can persist in Supabase when the Supabase environment variables are configured. Without Supabase, the app falls back to local JSON files, which are not durable on Render Free.

## Durable Leads and Analytics

1. Create a Supabase project.
2. Open Supabase SQL Editor and run `supabase/schema.sql`.
3. In Render, add these environment variables to the `term-craft` service:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `ADMIN_API_KEY`
4. Redeploy the latest commit.

Production admin routes require `ADMIN_API_KEY`. Never expose `SUPABASE_SERVICE_ROLE_KEY` in browser code. It is used only by the Express API.

For a private GitHub repo, install Render's GitHub App on this repository before using the deploy button. After Render creates the service, add `usetermcraft.com` from the service's Custom Domains page and copy the DNS records Render provides into GoDaddy.
