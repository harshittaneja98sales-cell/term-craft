import fs from "node:fs";
import path from "node:path";

const siteUrl = process.env.SITE_URL?.replace(/\/$/, "");
const sitemapBaseUrl = siteUrl || "https://usetermcraft.com";
const distDir = path.resolve(process.cwd(), "dist");
const shellPath = path.join(distDir, "index.html");
const shell = fs.readFileSync(shellPath, "utf8");

const pages = [
  {
    path: "/templates/b2b-lead-generation-retainer-agreement",
    title: "B2B Lead Generation Retainer Agreement Template | Free PDF",
    description:
      "Generate a free B2B lead generation retainer agreement PDF with setup fee, booked meeting commission, lead volume, and CRM access clauses.",
    h1: "B2B Lead Generation Retainer Agreement Template",
    intro:
      "Create a practical retainer agreement for outsourced B2B lead generation campaigns, booked meeting commissions, monthly lead targets, and CRM access rules.",
    fields: [
      "Client Name",
      "Service Provider Name",
      "Setup Fee",
      "Commission Per Booked Meeting",
      "Target Lead Volume",
      "CRM Access Clauses",
    ],
    cards: [
      ["Setup Fee", "Defines the upfront amount for campaign strategy, list setup, messaging, CRM preparation, and launch work."],
      ["Booked Meeting Commission", "States how the provider earns a commission when a qualifying prospect books a sales meeting."],
      ["Target Lead Volume", "Sets the campaign target without guaranteeing sales outcomes."],
      ["CRM Access Clauses", "Covers limited CRM permissions for setup, attribution, reporting, and campaign management."],
    ],
    faq: [
      ["What is a B2B lead generation retainer agreement?", "A services agreement that documents campaign scope, fees, meeting commission rules, targets, CRM access, and termination terms."],
      ["Is the PDF watermarked?", "No. The generated PDF is clean and unwatermarked."],
    ],
  },
  {
    path: "/templates/seo-agency-master-services-agreement",
    title: "SEO Agency Master Services Agreement Template | Free PDF",
    description:
      "Generate a free SEO agency master services agreement PDF with monthly retainer amount, baseline metrics, reporting cadence, and backlink liability waiver terms.",
    h1: "SEO Agency Master Services Agreement Template",
    intro:
      "Create an SEO agency MSA for monthly retainers, baseline performance metrics, reporting cadence, backlink risk allocation, and client approval responsibilities.",
    fields: [
      "Client Name",
      "SEO Agency Name",
      "Monthly Retainer Amount",
      "Baseline Metrics",
      "Reporting Cadence",
      "Backlink Liability Waivers",
    ],
    cards: [
      ["Monthly Retainer Amount", "Sets the recurring SEO fee and separates the retainer from tools, media spend, publisher fees, and extra development work."],
      ["Baseline Metrics", "Captures the starting point for rankings, traffic, referring domains, conversions, and technical health."],
      ["Reporting Cadence", "Defines how often the agency reports progress and what performance updates the client receives."],
      ["Backlink Liability Waivers", "Clarifies risks around third-party links, publisher decisions, algorithm changes, and prohibited link tactics."],
    ],
    faq: [
      ["What is an SEO agency master services agreement?", "A services agreement that defines recurring SEO scope, fees, reporting, approvals, disclaimers, and legal terms."],
      ["Should an SEO agreement guarantee rankings?", "Usually no. This template uses baseline metrics and effort obligations without guaranteeing rankings, traffic, leads, or revenue."],
    ],
  },
  {
    path: "/templates/digital-marketing-subcontractor-agreement",
    title: "Digital Marketing Subcontractor Agreement Template | Free PDF",
    description:
      "Generate a free digital marketing subcontractor agreement PDF with deliverables, non-solicitation language, and independent contractor status terms.",
    h1: "Digital Marketing Subcontractor Agreement Template",
    intro:
      "Create a subcontractor agreement for freelance marketers, agency partners, white-label vendors, and specialist contractors working behind an agency-client relationship.",
    fields: [
      "Agency Name",
      "Subcontractor Name",
      "Scope of Deliverables",
      "Non-Solicitation Clause",
      "Independent Contractor Status",
      "Payment Terms",
    ],
    cards: [
      ["Scope of Deliverables", "Defines the marketing tasks, campaign support, account work, reporting, or creative deliverables the subcontractor must provide."],
      ["Non-Solicitation Clause", "Helps prevent subcontractors from bypassing the agency and taking introduced clients directly."],
      ["Independent Contractor Status", "Clarifies that the subcontractor is not an employee, partner, or agent of the agency."],
      ["White-Label Client Work", "Documents how the subcontractor may interact with client accounts and client contacts."],
    ],
    faq: [
      ["What is a digital marketing subcontractor agreement?", "A contract between an agency and outside contractor that defines deliverables, client relationship rules, payment terms, confidentiality, and contractor status."],
      ["Why include a non-solicitation clause?", "It helps protect the agency from having a subcontractor directly pursue clients introduced through the agency relationship."],
    ],
  },
  {
    path: "/templates/ecommerce-web-development-contract",
    title: "E-commerce Web Development Contract Template | Free PDF",
    description:
      "Generate a free e-commerce web development contract PDF with platform, milestone payment schedule, and final IP transfer date.",
    h1: "E-commerce Web Development Contract Template",
    intro:
      "Create a web development agreement for Shopify, WooCommerce, BigCommerce, or custom e-commerce builds with milestones, payments, launch responsibilities, and final IP transfer terms.",
    fields: [
      "Client Name",
      "Developer Name",
      "E-commerce Platform",
      "Milestone Payment Schedule",
      "Final IP Transfer Date",
      "Scope of Work",
    ],
    cards: [
      ["E-commerce Platform", "Identifies the build platform, such as Shopify, WooCommerce, BigCommerce, or a custom commerce stack."],
      ["Milestone Payment Schedule", "Documents how project payments are split across signing, design approval, development handoff, and launch."],
      ["Final IP Transfer Date", "Sets the date when custom deliverables transfer to the client after payment is complete."],
      ["Launch Responsibilities", "Clarifies what the developer handles and what remains with the client or third-party platforms."],
    ],
    faq: [
      ["What is an e-commerce web development contract?", "A project agreement that defines store build scope, platform, payment milestones, acceptance, launch duties, and ownership transfer terms."],
      ["Can I download this as a PDF?", "Yes. The page instantly compiles the form fields into a clean, unwatermarked PDF."],
    ],
  },
  {
    path: "/templates/marketing-agency-mutual-nda",
    title: "Marketing Agency Mutual NDA Template | Free PDF",
    description:
      "Generate a free marketing agency mutual NDA PDF with client list protection, campaign strategy confidentiality, and non-disclosure duration terms.",
    h1: "Marketing Agency Mutual NDA Template",
    intro:
      "Create a mutual NDA for agencies, clients, partners, and contractors sharing client lists, campaign strategy, performance data, creative concepts, and confidential business information.",
    fields: [
      "Agency Name",
      "Counterparty Name",
      "Client List Protection",
      "Campaign Strategy Confidentiality",
      "Duration of Non-Disclosure",
      "Purpose of Disclosure",
    ],
    cards: [
      ["Client List Protection", "Protects client lists, prospect lists, CRM exports, audience segments, account contacts, and customer relationship information."],
      ["Campaign Strategy Confidentiality", "Covers marketing strategy, offers, hooks, funnels, keyword plans, targeting, creatives, budgets, tests, and performance benchmarks."],
      ["Duration of Non-Disclosure", "Defines how long confidentiality obligations last after information is shared."],
      ["Mutual Protection", "Applies confidentiality obligations to both parties when both sides exchange sensitive business information."],
    ],
    faq: [
      ["What is a marketing agency mutual NDA?", "A confidentiality agreement where both parties agree to protect sensitive marketing, client, campaign, business, and prospect information shared for a defined purpose."],
      ["Why include client list protection?", "Client lists and prospect data can be among an agency's most valuable assets, so a specific clause is clearer than a generic confidentiality paragraph."],
    ],
  },
];

function escapeHtml(value) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function getRelatedPages(page) {
  return pages.filter((candidate) => candidate.path !== page.path).slice(0, 4);
}

function renderStaticContent(page) {
  const relatedPages = getRelatedPages(page);

  return `
    <main class="template-page-shell">
      <section class="template-workbench" aria-labelledby="template-title">
        <div class="template-form-panel">
          <div class="template-kicker">Free PDF template</div>
          <nav class="breadcrumbs" aria-label="Breadcrumb">
            <a href="/">Home</a>
            <span>→</span>
            <a href="/templates">Templates</a>
            <span>→</span>
            <span>${escapeHtml(page.h1.replace(" Template", ""))}</span>
          </nav>
          <h1 id="template-title">${escapeHtml(page.h1)}</h1>
          <p>${escapeHtml(page.intro)}</p>
          <div class="template-fields">
            ${page.fields
              .map((field) => `<label class="field"><span>${escapeHtml(field)}</span><input /></label>`)
              .join("")}
          </div>
          <button class="button primary full-width template-download" type="button">Download Free PDF</button>
        </div>
        <article class="document">
          <header class="document-header">
            <div class="document-meta"><span>Draft</span><span>Free PDF</span></div>
            <h1>${escapeHtml(page.h1.replace(" Template", ""))}</h1>
            <p>Generate, preview, and download a clean contract PDF.</p>
          </header>
          <div class="document-body">
            ${page.cards
              .map(([title, body], index) => `<section class="document-section"><h2>${index + 1}. ${escapeHtml(title)}</h2><p>${escapeHtml(body)}</p></section>`)
              .join("")}
          </div>
        </article>
      </section>
      <section class="seo-content-section">
        <div class="seo-content-inner">
          <h2>What This Template Covers</h2>
          <p>${escapeHtml(page.description)}</p>
          <div class="seo-card-grid">
            ${page.cards
              .map(([title, body]) => `<article><h3>${escapeHtml(title)}</h3><p>${escapeHtml(body)}</p></article>`)
              .join("")}
          </div>
          <h2>FAQ</h2>
          <div class="faq-list">
            ${page.faq
              .map(([question, answer]) => `<article><h3>${escapeHtml(question)}</h3><p>${escapeHtml(answer)}</p></article>`)
              .join("")}
          </div>
          <section class="related-templates" aria-labelledby="related-templates-title">
            <div class="related-template-header">
              <div>
                <h2 id="related-templates-title">Related Contract Templates</h2>
                <p>Keep building the same agreement stack with adjacent agency, marketing, and web service documents.</p>
              </div>
              <a class="text-link" href="/templates">View all templates →</a>
            </div>
            <div class="template-link-grid related-template-grid">
              ${relatedPages.map((relatedPage) => renderTemplateCard(relatedPage)).join("")}
            </div>
          </section>
        </div>
      </section>
    </main>
  `;
}

function renderPublicHeaderStatic() {
  return `
    <header class="topbar template-topbar no-print">
      <a class="brand brand-link" href="/" aria-label="Term Craft home">
        <div class="brand-mark" aria-hidden="true">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><path d="m9 15 2 2 4-4"/></svg>
        </div>
        <div>
          <strong>Term Craft</strong>
          <span>B2B Workflow & Compliance Engine</span>
        </div>
      </a>
      <nav class="public-nav" aria-label="Primary navigation">
        <a href="/">Home</a>
        <a href="/templates">Templates</a>
        <a href="/builder">Contract Studio</a>
        <a href="/privacy">Privacy</a>
        <a class="button primary" href="/builder" style="margin-left: 6px;">New Contract</a>
      </nav>
    </header>
  `;
}

function renderPublicFooterStatic() {
  return `
    <footer class="public-footer no-print">
      <div class="public-footer-inner">
        <div>
          <a class="footer-brand" href="/">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><path d="m9 15 2 2 4-4"/></svg>
            <span>Term Craft</span>
          </a>
          <p>Free B2B contract templates with instant PDF downloads and signing workflow capture.</p>
        </div>
        <nav aria-label="Template footer links">
          <strong>Contract templates</strong>
          ${pages.map((page) => `<a href="${page.path}">${escapeHtml(page.h1.replace(" Template", ""))}</a>`).join("")}
        </nav>
        <nav aria-label="Product footer links">
          <strong>Term Craft</strong>
          <a href="/templates">Template directory</a>
          <a href="/builder">Contract Studio</a>
          <a href="/privacy">Privacy Policy</a>
        </nav>
      </div>
    </footer>
  `;
}

function renderHomeStaticContent() {
  return `
    <main>
      <section class="home-hero">
        <div class="home-hero-inner">
          <div class="hero-copy">
            <div class="template-kicker">✨ Programmatic SEO Native B2B Engine</div>
            <h1>Generate Clean B2B Contracts & Compliance Workflows</h1>
            <p>Select a niche B2B agreement, customize core dynamic clauses (GDPR, SOC2, SLA credits, Auto-renewal shields), preview in real-time, and download unwatermarked PDFs.</p>
            <div class="hero-actions">
              <a class="button primary" href="/templates">Browse All Templates</a>
              <a class="button secondary" href="/builder">Open Contract Studio</a>
            </div>
            <div style="display: flex; align-items: center; gap: 20px; margin-top: 16px; color: var(--muted); font-size: 13px; font-weight: 600;">
              <span>🛡️ 100% Free Unwatermarked PDF</span>
              <span>✔️ Audit Trail Logging</span>
              <span>👤 E-Signature Verification</span>
            </div>
          </div>
          <div class="hero-document" aria-hidden="true">
            <div class="mini-document">
              <div class="mini-document-meta">B2B Compliance | Clean PDF</div>
              <h2>Marketing Agency Mutual NDA</h2>
              <p>Client list protection, campaign strategy confidentiality, SLA compliance, and duration of non-disclosure.</p>
              <div class="mini-lines"><span></span><span></span><span></span><span></span></div>
              <div class="mini-signatures"><span></span><span></span></div>
            </div>
          </div>
        </div>
      </section>
      <section class="home-section">
        <div class="home-section-header">
          <div>
            <h2>Featured B2B Templates</h2>
            <p>Engineered for programmatic SEO acquisition, instant form generation, and compliance legal drafting.</p>
          </div>
          <a class="text-link" href="/templates">View all templates →</a>
        </div>
        <div class="template-link-grid">
          ${pages
            .slice(0, 3)
            .map((page) => renderTemplateCard(page))
            .join("")}
        </div>
      </section>
      <section class="home-band">
        <div>
          <h2>Programmatic SEO & Organic Growth Engine</h2>
          <p>Every document landing page features clean HTML pre-rendering, targeted metadata, structured schema, internal link graphs, and one-click PDF generation.</p>
        </div>
        <a class="button primary" href="/templates">Explore Directory</a>
      </section>
    </main>
  `;
}

function renderTemplatesDirectoryStaticContent() {
  return `
    <main class="templates-directory">
      <section class="directory-header">
        <div class="template-kicker">Template directory</div>
        <h1>Free B2B Contract Templates with Instant PDF Download</h1>
        <p>Choose a legal template, fill in the core terms, preview the agreement, and download a clean PDF without any watermark.</p>
      </section>
      <section class="template-link-grid directory-grid" aria-label="Contract templates">
        ${pages.map((page) => renderTemplateCard(page)).join("")}
      </section>
      <section class="directory-seo-copy">
        <h2>Programmatic Compliance Architecture</h2>
        <p>Each template is built around specific search intent queries and only asks for the fields needed to generate a useful legal first draft.</p>
      </section>
    </main>
  `;
}

function renderPrivacyStaticContent() {
  return `
    <main class="legal-page">
      <div class="template-kicker">Privacy</div>
      <h1>Privacy Policy</h1>
      <p>Term Craft collects only the information needed to provide free contract templates, PDF downloads, and optional follow-up for editable or signable versions.</p>
      <section>
        <h2>Information We Collect</h2>
        <p>If you submit the post-download form, we collect your email address, the template you downloaded, the page path, timestamp, referrer, and UTM parameters when present. We also collect first-party analytics events such as page views and template PDF downloads. We do not submit the filled contract terms to the lead capture API.</p>
      </section>
      <section>
        <h2>How We Use Information</h2>
        <p>We use captured emails to follow up about editable or signable versions of downloaded templates, understand which template pages are working, measure download intent, and improve the product.</p>
      </section>
      <section>
        <h2>Local Drafts</h2>
        <p>Some draft and signature data may be stored in your browser local storage so the app can preserve your work on the same device.</p>
      </section>
    </main>
  `;
}

function renderTemplateCard(page) {
  return `
    <article class="template-link-card">
      <div class="template-link-icon" aria-hidden="true"></div>
      <h3>${escapeHtml(page.h1.replace(" Template", ""))}</h3>
      <p>${escapeHtml(page.intro)}</p>
      <div class="template-tag-list">
        ${page.fields
          .slice(2, 6)
          .map((field) => `<span>${escapeHtml(field)}</span>`)
          .join("")}
      </div>
      <a class="template-card-link" href="${page.path}">Open template</a>
    </article>
  `;
}

function renderHtml(page, staticContent = renderStaticContent(page)) {
  const canonical = siteUrl
    ? `<link rel="canonical" href="${siteUrl}${page.path}" />`
    : "";
  const schema = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: page.h1,
    description: page.description,
    url: siteUrl ? `${siteUrl}${page.path}` : page.path,
  };

  return shell
    .replace(/<title>.*?<\/title>/, `<title>${escapeHtml(page.title)}</title>`)
    .replace(
      "</head>",
      `<meta name="description" content="${escapeHtml(page.description)}" />${canonical}<script type="application/ld+json">${JSON.stringify(schema)}</script></head>`,
    )
    .replace(
      '<div id="root"></div>',
      `<div id="root">${renderPublicHeaderStatic()}${staticContent}${renderPublicFooterStatic()}</div>`,
    );
}

for (const page of pages) {
  const routeDir = path.join(distDir, page.path);
  fs.mkdirSync(routeDir, { recursive: true });
  fs.writeFileSync(path.join(routeDir, "index.html"), renderHtml(page));
}

const homePage = {
  path: "/",
  title: "Free B2B Contract Templates & Compliance Workflow | Term Craft",
  description:
    "Generate clean, unwatermarked contract PDFs from free templates for marketing agencies, SEO retainers, lead generation, subcontractors, NDAs, and web development.",
  h1: "Generate Clean B2B Contracts & Compliance Workflows",
};

const templatesDirectoryPage = {
  path: "/templates",
  title: "Free Contract Template Directory | Term Craft",
  description:
    "Browse free contract templates for lead generation retainers, SEO agency MSAs, subcontractor agreements, e-commerce web development contracts, and marketing agency NDAs.",
  h1: "Free contract templates with instant PDF download.",
};

const privacyPage = {
  path: "/privacy",
  title: "Privacy Policy | Term Craft",
  description:
    "Privacy policy for Term Craft contract templates, PDF downloads, and lead capture forms.",
  h1: "Privacy Policy",
};

fs.writeFileSync(shellPath, renderHtml(homePage, renderHomeStaticContent()));

const templatesDir = path.join(distDir, "templates");
fs.mkdirSync(templatesDir, { recursive: true });
fs.writeFileSync(
  path.join(templatesDir, "index.html"),
  renderHtml(templatesDirectoryPage, renderTemplatesDirectoryStaticContent()),
);

const privacyDir = path.join(distDir, "privacy");
fs.mkdirSync(privacyDir, { recursive: true });
fs.writeFileSync(
  path.join(privacyDir, "index.html"),
  renderHtml(privacyPage, renderPrivacyStaticContent()),
);

const sitemapPages = [homePage, templatesDirectoryPage, privacyPage, ...pages];
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemapPages
  .map(
    (page) =>
      `  <url><loc>${sitemapBaseUrl}${page.path === "/" ? "" : page.path}</loc></url>`,
  )
  .join("\n")}
</urlset>
`;
fs.writeFileSync(path.join(distDir, "sitemap.xml"), sitemap);

const robots = `User-agent: *
Allow: /
Disallow: /admin

Sitemap: ${sitemapBaseUrl}/sitemap.xml
`;
fs.writeFileSync(path.join(distDir, "robots.txt"), robots);
