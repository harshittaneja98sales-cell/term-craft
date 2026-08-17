# Term Craft

Term Craft is a SaaS contract generator and e-signature starter focused on SEO landing pages for agency contract templates.

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https%3A%2F%2Fgithub.com%2Fharshittaneja98sales-cell%2Fterm-craft)

## Render Deployment

This repo includes a `render.yaml` Blueprint for a Node web service:

- Build command used by Render: `npm ci && npm run build`
- Start command: `npm start`
- Production URL: `https://usetermcraft.com`
- Lead storage directory: `/var/data`

Because lead capture currently writes to the local filesystem, keep the service on a paid web service plan and add a persistent disk from the Render dashboard after the first deploy if you want captured emails to survive deploys and restarts. Free Render web services do not preserve local filesystem changes across deploys or restarts.

For a private GitHub repo, install Render's GitHub App on this repository before using the deploy button. After Render creates the service, add `usetermcraft.com` from the service's Custom Domains page and copy the DNS records Render provides into GoDaddy.
