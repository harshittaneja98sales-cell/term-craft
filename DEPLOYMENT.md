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
  - `DATA_DIR=/var/data`
- Persistent disk:
  - Mount path: `/var/data`
  - Size: `1 GB`

The included `render.yaml` defines these settings as a Render Blueprint.

## GoDaddy DNS

After the Render service is live, add `usetermcraft.com` as a custom domain in Render. Render will show the exact DNS records to add in GoDaddy.

In GoDaddy:

1. Open your domain portfolio.
2. Select `usetermcraft.com`.
3. Open DNS records.
4. Add or edit the records Render gives you.
5. Wait for DNS propagation and SSL issuance.

Use `https://usetermcraft.com/sitemap.xml` in Google Search Console after DNS is live.
