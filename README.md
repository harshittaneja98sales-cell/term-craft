# Term Craft

Term Craft is a SaaS contract generator and e-signature starter focused on SEO landing pages for agency contract templates.

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https%3A%2F%2Fgithub.com%2Fharshittaneja98sales-cell%2Fterm-craft)

## Render Deployment

This repo includes a `render.yaml` Blueprint for a Node web service:

- Build command used by Render: `npm ci --include=dev && npm run build`
- Start command: `npm start`
- Production URL: `https://usetermcraft.com`

The first deploy uses Render's free web service plan so the site can go live without a billing step. Lead capture currently writes to the local filesystem, so captured emails are not durable on the free plan. Move leads to a database or upgrade the service and add persistent storage before depending on it for production lead collection.

For a private GitHub repo, install Render's GitHub App on this repository before using the deploy button. After Render creates the service, add `usetermcraft.com` from the service's Custom Domains page and copy the DNS records Render provides into GoDaddy.
