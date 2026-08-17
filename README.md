# Term Craft

Term Craft is a SaaS contract generator and e-signature starter focused on SEO landing pages for agency contract templates.

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https%3A%2F%2Fgithub.com%2Fharshittaneja98sales-cell%2Fterm-craft)

## Render Deployment

This repo includes a `render.yaml` Blueprint for a Node web service:

- Build command: `npm install && npm run build`
- Start command: `npm start`
- Production URL: `https://usetermcraft.com`
- Lead storage directory: `/var/data`
- Persistent disk: `lead-data`, 1 GB

Because lead capture currently writes to the local filesystem, the service uses Render's `starter` plan with a persistent disk. Free Render web services do not preserve local filesystem changes across deploys or restarts.

For a private GitHub repo, install Render's GitHub App on this repository before using the deploy button. After Render creates the service, add the DNS records it provides in GoDaddy for `usetermcraft.com`.
