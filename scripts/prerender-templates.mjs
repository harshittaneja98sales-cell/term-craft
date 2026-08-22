import fs from "node:fs";
import path from "node:path";

const siteUrl = process.env.SITE_URL?.replace(/\/$/, "");
const sitemapBaseUrl = siteUrl || "https://usetermcraft.com";
const schemaBaseUrl = sitemapBaseUrl.replace(/\/$/, "");
const distDir = path.resolve(process.cwd(), "dist");
const shellPath = path.join(distDir, "index.html");
const shell = fs.readFileSync(shellPath, "utf8");
const additionalTemplateDefinitions = JSON.parse(
  fs.readFileSync(
    path.resolve(process.cwd(), "src", "additional-templates.json"),
    "utf8",
  ),
);

const basePages = [
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

function mapAdditionalTemplatePage(definition) {
  return {
    path: definition.path,
    title: definition.title,
    description: definition.metaDescription,
    h1: definition.h1,
    intro: definition.intro,
    fields: definition.fields.map((field) => field.label),
    cards: definition.seo.cards.map((card) => [card.title, card.body]),
    faq: definition.seo.faqs.map((faq) => [faq.question, faq.answer]),
  };
}

const pages = [
  ...basePages,
  ...additionalTemplateDefinitions.map((definition) =>
    mapAdditionalTemplatePage(definition),
  ),
];

const relatedPageLimit = 8;
const relatedStopWords = new Set([
  "a",
  "an",
  "and",
  "agreement",
  "agreements",
  "contract",
  "contracts",
  "for",
  "free",
  "pdf",
  "template",
  "templates",
  "the",
  "to",
  "with",
]);

const relatedCategoryMatchers = [
  {
    key: "marketing-agency",
    label: "Marketing & Agency",
    pattern: /lead|seo|marketing|social|ppc|affiliate|copywriting|agency|retainer|subcontractor/i,
  },
  {
    key: "creative-media",
    label: "Creative & Media",
    pattern: /ugc|creator|video|graphic|photography|licensing|production|creative|media/i,
  },
  {
    key: "web-saas-software",
    label: "Web, SaaS & Software",
    pattern: /saas|software|shopify|webflow|web|ecommerce|development|store|sla|service-level/i,
  },
  {
    key: "contractor-services",
    label: "Contractor & Services",
    pattern: /contractor|subcontractor|assistant|consultant|services|advisory|sow|scope-of-work/i,
  },
  {
    key: "confidentiality-commercial",
    label: "Confidentiality & Commercial",
    pattern: /nda|confidential|confidentiality|referral|advisory|lease|commercial|client-list/i,
  },
  {
    key: "property-construction",
    label: "Property & Construction",
    pattern: /construction|lien|hvac|property|lease|subcontractor/i,
  },
];

function escapeHtml(value) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function getPageSearchText(page) {
  return [
    page.path,
    page.title,
    page.description,
    page.h1,
    page.intro,
    ...(page.fields ?? []),
    ...(page.cards ?? []).flat(),
  ]
    .join(" ")
    .toLowerCase();
}

function tokenizeRelatedText(value) {
  return new Set(
    value
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((token) => token.length > 2 && !relatedStopWords.has(token)),
  );
}

function getPageCategoryKeys(page) {
  const text = getPageSearchText(page);
  const matches = relatedCategoryMatchers
    .filter((category) => category.pattern.test(text))
    .map((category) => category.key);

  return matches.length ? matches : ["general-business"];
}

function getPageCategoryLabels(page) {
  const keys = getPageCategoryKeys(page);
  const labels = keys
    .map((key) => relatedCategoryMatchers.find((category) => category.key === key)?.label)
    .filter(Boolean);

  return labels.length ? labels : ["General Business"];
}

function getRelatedPages(page, limit = relatedPageLimit) {
  const currentTokens = tokenizeRelatedText(getPageSearchText(page));
  const currentCategories = new Set(getPageCategoryKeys(page));
  const currentFieldTokens = tokenizeRelatedText((page.fields ?? []).join(" "));

  return pages
    .map((candidate, index) => {
      if (candidate.path === page.path) {
        return { score: -1, candidate, index };
      }

      const candidateTokens = tokenizeRelatedText(getPageSearchText(candidate));
      const candidateCategories = new Set(getPageCategoryKeys(candidate));
      const candidateFieldTokens = tokenizeRelatedText((candidate.fields ?? []).join(" "));
      let score = 0;

      for (const category of candidateCategories) {
        if (currentCategories.has(category)) {
          score += 24;
        }
      }

      for (const token of candidateTokens) {
        if (currentTokens.has(token)) {
          score += 4;
        }
      }

      for (const token of candidateFieldTokens) {
        if (currentFieldTokens.has(token)) {
          score += 3;
        }
      }

      return { score, candidate, index };
    })
    .filter((item) => item.score >= 0)
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, limit)
    .map((item) => item.candidate);
}

function renderStaticContent(page) {
  const relatedPages = getRelatedPages(page);
  const categoryLabels = getPageCategoryLabels(page).slice(0, 3);

  return `
    <main class="template-page-shell">
      <section class="template-workbench" aria-labelledby="template-title">
        <div class="template-form-panel">
          <div class="template-kicker">Free PDF template</div>
          <nav class="breadcrumbs" aria-label="Breadcrumb">
            <a href="/">Home</a>
            <span>→</span>
            <a href="/templates">Template Hub</a>
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
          <section class="related-contracts" aria-labelledby="related-contracts-title">
            <div class="related-contracts-header">
              <div>
                <div class="template-kicker">Sibling internal links</div>
                <h2 id="related-contracts-title">Related Contracts</h2>
                <p>Continue through adjacent templates selected by business category, shared form fields, and contract intent.</p>
                <div class="related-category-list" aria-label="Template cluster">
                  ${categoryLabels.map((label) => `<span>${escapeHtml(label)}</span>`).join("")}
                </div>
              </div>
              <a class="text-link" href="/templates">View all templates</a>
            </div>
            <div class="template-link-grid related-contract-grid">
              ${relatedPages.map((relatedPage) => renderTemplateCard(relatedPage)).join("")}
            </div>
            <nav class="sibling-link-list" aria-label="More related contract links">
              ${relatedPages.map((relatedPage) => `<a href="${relatedPage.path}">${escapeHtml(relatedPage.h1.replace(" Template", ""))}</a>`).join("")}
            </nav>
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
        <a href="/templates">Template Hub</a>
        <a href="/builder">Contract Studio</a>
        <a href="/dashboard">Vault</a>
        <a href="/billing">Billing</a>
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
          <a href="/dashboard">Document Vault</a>
          <a href="/billing">Billing</a>
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

const directoryHubCategories = [
  {
    label: "Marketing & Agencies",
    description: "Retainers, PPC, SEO, social, affiliate, and lead generation agreements.",
    pattern: /lead|seo|marketing|social|ppc|affiliate|copywriting/i,
  },
  {
    label: "Creative & Media",
    description: "UGC, video, design, photography, creator, and production contracts.",
    pattern: /ugc|creator|video|graphic|photography|copywriting/i,
  },
  {
    label: "Web, SaaS & Software",
    description: "SaaS SLAs, software SOWs, Shopify, Webflow, and web development projects.",
    pattern: /saas|software|shopify|webflow|web-development|ecommerce/i,
  },
  {
    label: "Contractors & Services",
    description: "Independent contractor, subcontractor, virtual assistant, and service agreements.",
    pattern: /contractor|subcontractor|assistant|services|consultant/i,
  },
  {
    label: "Property & Construction",
    description: "Commercial lease, lien waiver, HVAC, construction, and trade documents.",
    pattern: /lease|lien|construction|hvac/i,
  },
  {
    label: "NDA & Advisory",
    description: "Mutual NDA, one-way NDA, advisory, referral, and sensitive business terms.",
    pattern: /nda|advisory|referral|confidential|affiliate/i,
  },
];

function categoryPageCount(category) {
  return pages.filter((page) =>
    category.pattern.test(`${page.path} ${page.title}`),
  ).length;
}

function getHighIntentPages() {
  const priorityPaths = [
    "/templates/b2b-lead-generation-retainer-agreement",
    "/templates/ugc-creator-agreement",
    "/templates/social-media-management-contract",
    "/templates/ppc-management-agreement",
    "/templates/saas-service-level-agreement",
    "/templates/shopify-store-setup-agreement",
  ];

  return priorityPaths
    .map((pagePath) => pages.find((page) => page.path === pagePath))
    .filter(Boolean);
}

function renderTemplatesDirectoryStaticContent() {
  return `
    <main class="templates-directory">
      <section class="directory-hub-hero">
        <div class="directory-header">
          <div class="template-kicker">Central template hub</div>
          <h1>Free B2B Contract Template Directory Hub</h1>
          <p>Browse every Term Craft template from one SEO hub. Each page includes focused dynamic fields, instant unwatermarked PDF generation, internal links, and structured data.</p>
        </div>
        <div class="directory-hub-panel">
          <div class="directory-search">
            <span aria-hidden="true"></span>
            <input type="text" placeholder="Search by use case, e.g. UGC, Shopify, PPC, NDA..." />
          </div>
          <div class="directory-stats" aria-label="Template directory stats">
            <div><strong>${pages.length}</strong><span>Templates</span></div>
            <div><strong>${directoryHubCategories.length}</strong><span>Categories</span></div>
            <div><strong>PDF</strong><span>No watermark</span></div>
          </div>
        </div>
      </section>
      <section class="directory-category-grid" aria-label="Template categories">
        <a href="/templates"><strong>All Templates</strong><span>${pages.length} documents across the full library.</span></a>
        ${directoryHubCategories
          .map((category) => `<a href="/templates"><strong>${escapeHtml(category.label)}</strong><span>${categoryPageCount(category)} templates. ${escapeHtml(category.description)}</span></a>`)
          .join("")}
      </section>
      <section class="directory-featured" aria-labelledby="high-intent-title">
        <div class="home-section-header">
          <div>
            <h2 id="high-intent-title">High-Intent Template Pages</h2>
            <p>Start with the templates most likely to match commercial search intent and bottom-funnel contract needs.</p>
          </div>
        </div>
        <div class="template-link-grid">
          ${getHighIntentPages().map((page) => renderTemplateCard(page)).join("")}
        </div>
      </section>
      <section class="directory-results-header">
        <div>
          <h2>All Contract Templates</h2>
          <p>Showing ${pages.length} of ${pages.length} templates.</p>
        </div>
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
        <h2>Account Vault</h2>
        <p>If you create an account and save a document to your vault, we store the contract draft, selected template, signer details, and audit events needed to reload that document for your account.</p>
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

function absoluteUrl(pagePath) {
  return pagePath === "/" ? schemaBaseUrl : `${schemaBaseUrl}${pagePath}`;
}

function serializeJsonLd(schema) {
  return JSON.stringify(schema).replace(/</g, "\\u003c");
}

function buildGenericStructuredData(page) {
  const pageUrl = absoluteUrl(page.path);
  const organizationId = `${schemaBaseUrl}/#organization`;
  const websiteId = `${schemaBaseUrl}/#website`;
  const pageType = page.path === "/templates" ? "CollectionPage" : "WebPage";
  const templateList =
    page.path === "/templates"
      ? {
          "@type": "ItemList",
          "@id": `${pageUrl}#template-list`,
          name: "Term Craft Contract Templates",
          numberOfItems: pages.length,
          itemListElement: pages.map((templatePage, index) => ({
            "@type": "ListItem",
            position: index + 1,
            name: templatePage.h1.replace(" Template", ""),
            url: absoluteUrl(templatePage.path),
          })),
        }
      : null;

  const graph = [
    {
      "@type": "Organization",
      "@id": organizationId,
      name: "Term Craft",
      url: schemaBaseUrl,
    },
    {
      "@type": "WebSite",
      "@id": websiteId,
      name: "Term Craft",
      url: schemaBaseUrl,
      publisher: { "@id": organizationId },
    },
    {
      "@type": pageType,
      "@id": `${pageUrl}#webpage`,
      url: pageUrl,
      name: page.h1,
      headline: page.h1,
      description: page.description,
      isPartOf: { "@id": websiteId },
      publisher: { "@id": organizationId },
      ...(templateList ? { mainEntity: { "@id": templateList["@id"] } } : {}),
    },
  ];

  if (templateList) {
    graph.push(templateList);
  }

  return {
    "@context": "https://schema.org",
    "@graph": graph,
  };
}

function buildTemplateStructuredData(page) {
  const relatedPages = getRelatedPages(page);
  const pageUrl = absoluteUrl(page.path);
  const organizationId = `${schemaBaseUrl}/#organization`;
  const websiteId = `${schemaBaseUrl}/#website`;
  const templateName = page.h1.replace(" Template", "");
  const templateId = `${pageUrl}#template`;
  const breadcrumbId = `${pageUrl}#breadcrumb`;
  const faqId = `${pageUrl}#faq`;
  const relatedListId = `${pageUrl}#related-contracts`;

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": organizationId,
        name: "Term Craft",
        url: schemaBaseUrl,
      },
      {
        "@type": "WebSite",
        "@id": websiteId,
        name: "Term Craft",
        url: schemaBaseUrl,
        publisher: { "@id": organizationId },
      },
      {
        "@type": "BreadcrumbList",
        "@id": breadcrumbId,
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "Home",
            item: schemaBaseUrl,
          },
          {
            "@type": "ListItem",
            position: 2,
            name: "Template Hub",
            item: absoluteUrl("/templates"),
          },
          {
            "@type": "ListItem",
            position: 3,
            name: templateName,
            item: pageUrl,
          },
        ],
      },
      {
        "@type": "WebPage",
        "@id": `${pageUrl}#webpage`,
        url: pageUrl,
        name: page.h1,
        headline: page.h1,
        description: page.description,
        isPartOf: { "@id": websiteId },
        publisher: { "@id": organizationId },
        breadcrumb: { "@id": breadcrumbId },
        mainEntity: { "@id": templateId },
        hasPart: [{ "@id": faqId }, { "@id": relatedListId }],
        relatedLink: relatedPages.map((relatedPage) =>
          absoluteUrl(relatedPage.path),
        ),
      },
      {
        "@type": "DigitalDocument",
        "@id": templateId,
        name: templateName,
        headline: page.h1,
        description: page.intro,
        url: pageUrl,
        inLanguage: "en-US",
        encodingFormat: "application/pdf",
        isAccessibleForFree: true,
        creator: { "@id": organizationId },
        provider: { "@id": organizationId },
        about: page.cards.map(([title, body]) => ({
          "@type": "Thing",
          name: title,
          description: body,
        })),
        offers: {
          "@type": "Offer",
          url: pageUrl,
          price: "0",
          priceCurrency: "USD",
          availability: "https://schema.org/InStock",
        },
      },
      {
        "@type": "FAQPage",
        "@id": faqId,
        url: `${pageUrl}#faq`,
        name: `${templateName} FAQ`,
        mainEntity: page.faq.map(([question, answer]) => ({
          "@type": "Question",
          name: question,
          acceptedAnswer: {
            "@type": "Answer",
            text: answer,
          },
        })),
      },
      {
        "@type": "ItemList",
        "@id": relatedListId,
        name: "Related Contracts",
        itemListElement: relatedPages.map((relatedPage, index) => ({
          "@type": "ListItem",
          position: index + 1,
          name: relatedPage.h1.replace(" Template", ""),
          url: absoluteUrl(relatedPage.path),
        })),
      },
    ],
  };
}

function renderHtml(page, staticContent = renderStaticContent(page)) {
  const canonical = siteUrl
    ? `<link rel="canonical" href="${siteUrl}${page.path}" />`
    : "";
  const schema =
    page.path.startsWith("/templates/") && Array.isArray(page.faq)
      ? buildTemplateStructuredData(page)
      : buildGenericStructuredData(page);

  return shell
    .replace(/<title>.*?<\/title>/, `<title>${escapeHtml(page.title)}</title>`)
    .replace(
      "</head>",
      `<meta name="description" content="${escapeHtml(page.description)}" />${canonical}<script id="termcraft-structured-data" type="application/ld+json">${serializeJsonLd(schema)}</script></head>`,
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
  title: "Contract Template Directory Hub | Term Craft",
  description:
    "Browse the central Term Craft template hub with free B2B contract templates, dynamic form fields, instant PDFs, internal links, and schema-ready SEO pages.",
  h1: "Free B2B Contract Template Directory Hub",
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
Disallow: /dashboard
Disallow: /billing
Disallow: /login

Sitemap: ${sitemapBaseUrl}/sitemap.xml
`;
fs.writeFileSync(path.join(distDir, "robots.txt"), robots);
