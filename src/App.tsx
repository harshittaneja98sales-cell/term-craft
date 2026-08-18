import {
  ArrowRight,
  ArrowLeft,
  BadgeDollarSign,
  CheckCircle2,
  Clock3,
  Database,
  Download,
  FileCheck2,
  FileText,
  History,
  Mail,
  PenLine,
  Printer,
  RotateCcw,
  Save,
  ShieldCheck,
  Search,
  Target,
  Users,
  UserCheck,
  Wand2,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import additionalTemplatesRaw from "./additional-templates.json";

type TemplateKey = "saas" | "services" | "nda" | "dpa";
type ClauseKey =
  | "autoRenewal"
  | "securityAddendum"
  | "slaCredits"
  | "terminationForConvenience"
  | "ipAssignment"
  | "marketingRights"
  | "subprocessors"
  | "mutualIndemnity";
type SignatureMethod = "drawn" | "typed";

type ContractState = {
  template: TemplateKey;
  contractTitle: string;
  providerName: string;
  providerAddress: string;
  customerName: string;
  customerAddress: string;
  serviceName: string;
  planName: string;
  feeAmount: string;
  billingCycle: string;
  effectiveDate: string;
  termMonths: number;
  renewalTerm: string;
  paymentDueDays: number;
  terminationNoticeDays: number;
  governingLaw: string;
  dataRegion: string;
  supportResponse: string;
  liabilityCap: string;
  specialTerms: string;
};

type ContractSection = {
  heading: string;
  body: string;
};

type Signer = {
  id: "provider" | "customer";
  role: "Provider" | "Customer";
  name: string;
  title: string;
  email: string;
  signedAt?: string;
  signatureDataUrl?: string;
  signatureMethod?: SignatureMethod;
};

type AuditEvent = {
  id: string;
  at: string;
  actor: string;
  action: string;
  details: string;
};

type StoredDraft = {
  contract: ContractState;
  clauses?: Record<ClauseKey, boolean>;
  signers: Signer[];
  auditEvents: AuditEvent[];
};

type TemplateDownloadLead = {
  id: string;
  templatePath: string;
  templateTitle: string;
  downloadedAt: string;
  email?: string;
  emailCapturedAt?: string;
};

type LeadApiRecord = {
  id: string;
  email: string;
  templateTitle: string;
  templatePath: string;
  landingPath: string;
  downloadedAt: string;
  submittedAt: string;
  referrer: string;
  utmSource: string;
  utmMedium: string;
  utmCampaign: string;
  utmTerm: string;
  utmContent: string;
  userAgent: string;
};

type AnalyticsEventRecord = {
  id: string;
  eventName: string;
  path: string;
  templateTitle: string;
  templatePath: string;
  referrer: string;
  utmSource: string;
  utmMedium: string;
  utmCampaign: string;
  utmTerm: string;
  utmContent: string;
  metadata: Record<string, unknown>;
  userAgent: string;
  occurredAt: string;
};

type AnalyticsSummary = {
  storage: {
    provider: string;
    durable: boolean;
  };
  totalEvents: number;
  totalPageViews: number;
  totalDownloads: number;
  totalLeadCaptures: number;
  topPaths: Array<{ label: string; count: number }>;
  topTemplates: Array<{ label: string; count: number }>;
  recentEvents: AnalyticsEventRecord[];
};

type LeadCaptureResponse = {
  lead: LeadApiRecord;
  emailDelivery?: {
    provider: string;
    sent: boolean;
    skipped: boolean;
    reason?: string;
    id?: string;
  };
};

type B2BLeadGenerationForm = {
  clientName: string;
  providerName: string;
  setupFee: string;
  commissionPerBookedMeeting: string;
  targetLeadVolume: string;
  crmAccessClauses: string;
  startDate: string;
  scopeOfWork: string;
};

const STORAGE_KEY = "termcraft.contract-draft.v1";
const TEMPLATE_DOWNLOAD_LEADS_KEY = "termcraft.template-download-leads.v1";
const B2B_LEAD_GEN_PATH = "/templates/b2b-lead-generation-retainer-agreement";

const templateDefaults: Record<
  TemplateKey,
  Pick<ContractState, "contractTitle" | "serviceName" | "planName">
> = {
  saas: {
    contractTitle: "SaaS Subscription Agreement",
    serviceName: "Search intelligence platform",
    planName: "Growth",
  },
  services: {
    contractTitle: "Professional Services Agreement",
    serviceName: "Implementation and onboarding services",
    planName: "Launch package",
  },
  nda: {
    contractTitle: "Mutual Non-Disclosure Agreement",
    serviceName: "Commercial evaluation discussions",
    planName: "Mutual review",
  },
  dpa: {
    contractTitle: "Data Processing Addendum",
    serviceName: "Hosted analytics services",
    planName: "Processor addendum",
  },
};

const contractTemplates: Array<{
  key: TemplateKey;
  name: string;
  meta: string;
}> = [
  { key: "saas", name: "SaaS", meta: "Subscription terms" },
  { key: "services", name: "Services", meta: "SOW-ready" },
  { key: "nda", name: "NDA", meta: "Mutual confidentiality" },
  { key: "dpa", name: "DPA", meta: "Data processing" },
];

const clauseCatalog: Array<{
  key: ClauseKey;
  label: string;
  detail: string;
}> = [
  {
    key: "autoRenewal",
    label: "Auto-renewal",
    detail: "Renews unless notice is given before the term ends.",
  },
  {
    key: "securityAddendum",
    label: "Security addendum",
    detail: "Adds baseline safeguards, access controls, and incident notice.",
  },
  {
    key: "slaCredits",
    label: "SLA credits",
    detail: "Adds a support target and service credit remedy.",
  },
  {
    key: "terminationForConvenience",
    label: "Convenience termination",
    detail: "Allows termination after written notice.",
  },
  {
    key: "ipAssignment",
    label: "IP assignment",
    detail: "Assigns custom deliverables after payment.",
  },
  {
    key: "marketingRights",
    label: "Marketing rights",
    detail: "Permits customer logo use after approval.",
  },
  {
    key: "subprocessors",
    label: "Subprocessors",
    detail: "Requires a current list and prior notice of changes.",
  },
  {
    key: "mutualIndemnity",
    label: "Mutual indemnity",
    detail: "Adds reciprocal defense obligations.",
  },
];

const initialClauses: Record<ClauseKey, boolean> = {
  autoRenewal: true,
  securityAddendum: true,
  slaCredits: true,
  terminationForConvenience: false,
  ipAssignment: false,
  marketingRights: false,
  subprocessors: true,
  mutualIndemnity: true,
};

function createDefaultContract(): ContractState {
  return {
    template: "saas",
    ...templateDefaults.saas,
    providerName: "Northstar Analytics, Inc.",
    providerAddress: "548 Market Street, San Francisco, CA 94104",
    customerName: "Acme Growth LLC",
    customerAddress: "1200 Congress Avenue, Austin, TX 78701",
    feeAmount: "$6,000",
    billingCycle: "annually",
    effectiveDate: new Date().toISOString().slice(0, 10),
    termMonths: 12,
    renewalTerm: "successive 12-month renewal terms",
    paymentDueDays: 30,
    terminationNoticeDays: 30,
    governingLaw: "Delaware",
    dataRegion: "United States",
    supportResponse: "one business day",
    liabilityCap: "fees paid in the 12 months before the claim",
    specialTerms:
      "Customer may add up to 10 additional seats during the initial term at the same per-seat rate.",
  };
}

function createDefaultB2BLeadGenerationForm(): B2BLeadGenerationForm {
  return {
    clientName: "Acme Growth LLC",
    providerName: "Northstar Pipeline Studio",
    setupFee: "$2,500",
    commissionPerBookedMeeting: "$350",
    targetLeadVolume: "150 qualified leads per month",
    crmAccessClauses:
      "Client will provide limited CRM access for campaign setup, lead status updates, meeting attribution, and reporting. Provider may not export unrelated customer records or modify closed-won revenue fields without written approval.",
    startDate: new Date().toISOString().slice(0, 10),
    scopeOfWork:
      "Provider will research target accounts, build prospect lists, write outbound sequences, launch email and LinkedIn outreach, qualify replies, and coordinate booked sales meetings for Client.",
  };
}

function createB2BLeadGenerationContract(
  form: B2BLeadGenerationForm,
): ContractState {
  return {
    template: "services",
    contractTitle: "B2B Lead Generation Retainer Agreement",
    providerName: form.providerName,
    providerAddress: "Provider address to be inserted",
    customerName: form.clientName,
    customerAddress: "Client address to be inserted",
    serviceName: form.scopeOfWork,
    planName: "B2B lead generation retainer",
    feeAmount: `${form.setupFee} setup fee plus ${form.commissionPerBookedMeeting} per booked meeting`,
    billingCycle: "monthly",
    effectiveDate: form.startDate,
    termMonths: 3,
    renewalTerm: "successive one-month renewal terms",
    paymentDueDays: 15,
    terminationNoticeDays: 30,
    governingLaw: "Delaware",
    dataRegion: "United States",
    supportResponse: "two business days",
    liabilityCap: "fees paid in the three months before the claim",
    specialTerms: form.crmAccessClauses,
  };
}

function buildB2BLeadGenerationSections(
  contract: ContractState,
  form: B2BLeadGenerationForm,
): ContractSection[] {
  return [
    {
      heading: "Parties",
      body: `This B2B Lead Generation Retainer Agreement is entered into by ${form.providerName} ("Provider") and ${form.clientName} ("Client") as of ${formatDate(form.startDate)}.`,
    },
    {
      heading: "Scope of Work",
      body: form.scopeOfWork,
    },
    {
      heading: "Setup Fee",
      body: `Client will pay Provider a one-time setup fee of ${form.setupFee}. The setup fee covers campaign strategy, ICP review, list-building setup, messaging development, CRM configuration support, and launch preparation.`,
    },
    {
      heading: "Commission Per Booked Meeting",
      body: `Client will pay Provider ${form.commissionPerBookedMeeting} for each booked meeting that matches the agreed target profile, is accepted by Client, and is scheduled with a prospect who has expressed interest in discussing Client's products or services.`,
    },
    {
      heading: "Target Lead Volume",
      body: `Provider will use commercially reasonable efforts to source and work toward ${form.targetLeadVolume}. Lead volume is a campaign target and not a guaranteed sales outcome, pipeline amount, revenue result, or close rate.`,
    },
    {
      heading: "CRM Access",
      body: form.crmAccessClauses,
    },
    {
      heading: "Lead Qualification and Attribution",
      body: "A booked meeting is attributable to Provider when the meeting results from Provider-managed outreach, referral routing, list research, or follow-up activity during the term. Client must notify Provider of disqualified meetings within five business days after the scheduled meeting date and provide a reasonable explanation.",
    },
    {
      heading: "Client Responsibilities",
      body: "Client will provide accurate target account criteria, approved messaging inputs, product positioning, calendar availability, CRM access reasonably needed for performance, and timely feedback on lead quality. Delays caused by missing approvals or inaccessible systems may extend campaign timelines.",
    },
    {
      heading: "Payment Terms",
      body: `Provider may invoice the setup fee on execution and booked-meeting commissions monthly in arrears. Undisputed invoices are due within ${contract.paymentDueDays} days after receipt.`,
    },
    {
      heading: "Compliance",
      body: "Each party will comply with applicable outreach, privacy, marketing, platform, and anti-spam rules. Provider will not knowingly use deceptive sender identities, misleading subject lines, or prospect data obtained through unlawful means.",
    },
    {
      heading: "Term and Termination",
      body: `The initial term is ${contract.termMonths} months beginning on ${formatDate(form.startDate)}. Either party may terminate after the initial term by giving ${contract.terminationNoticeDays} days' written notice. Client remains responsible for fees earned before the termination date.`,
    },
    {
      heading: "Confidentiality",
      body: "Each party will protect non-public business, prospect, customer, financial, campaign, and technical information using reasonable care and will use that information only to perform or evaluate this agreement.",
    },
    {
      heading: "Limitation of Liability",
      body: `Except for payment obligations, confidentiality breaches, data misuse, and willful misconduct, each party's aggregate liability will not exceed ${contract.liabilityCap}. Neither party is liable for lost profits, indirect damages, or unrealized sales opportunities.`,
    },
    {
      heading: "General Terms",
      body: `This agreement is governed by the laws of ${contract.governingLaw}. Changes must be in writing and accepted by both parties. This agreement is a practical template and should be reviewed by counsel before production use.`,
    },
  ];
}

function createDefaultSigners(): Signer[] {
  return [
    {
      id: "provider",
      role: "Provider",
      name: "Avery Chen",
      title: "Chief Executive Officer",
      email: "avery@northstar.example",
    },
    {
      id: "customer",
      role: "Customer",
      name: "Jordan Lee",
      title: "VP Growth",
      email: "jordan@acmegrowth.example",
    },
  ];
}

function createAuditEvent(
  actor: string,
  action: string,
  details: string,
): AuditEvent {
  return {
    id: createId(),
    at: new Date().toISOString(),
    actor,
    action,
    details,
  };
}

function createInitialAudit(): AuditEvent[] {
  return [
    createAuditEvent("System", "Draft created", "SaaS subscription template loaded."),
  ];
}

function createId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function readStoredDraft(): StoredDraft | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as StoredDraft;
    if (!parsed.contract || !parsed.signers || !parsed.auditEvents) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

function readTemplateDownloadLeads(): TemplateDownloadLead[] {
  try {
    const raw = localStorage.getItem(TEMPLATE_DOWNLOAD_LEADS_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as TemplateDownloadLead[]) : [];
  } catch {
    return [];
  }
}

function saveTemplateDownloadLead(record: TemplateDownloadLead) {
  const leads = readTemplateDownloadLeads();
  localStorage.setItem(
    TEMPLATE_DOWNLOAD_LEADS_KEY,
    JSON.stringify([record, ...leads].slice(0, 100)),
  );
}

function updateTemplateDownloadLeadEmail(recordId: string, email: string) {
  const cleanedEmail = email.trim();
  if (!cleanedEmail) {
    return;
  }

  const leads = readTemplateDownloadLeads();
  localStorage.setItem(
    TEMPLATE_DOWNLOAD_LEADS_KEY,
    JSON.stringify(
      leads.map((lead) =>
        lead.id === recordId
          ? {
              ...lead,
              email: cleanedEmail,
              emailCapturedAt: new Date().toISOString(),
            }
          : lead,
      ),
    ),
  );
}

function getUtmParams() {
  const params = new URLSearchParams(window.location.search);

  return {
    source: params.get("utm_source") ?? "",
    medium: params.get("utm_medium") ?? "",
    campaign: params.get("utm_campaign") ?? "",
    term: params.get("utm_term") ?? "",
    content: params.get("utm_content") ?? "",
  };
}

async function submitLeadCapture({
  downloadedAt,
  email,
  templatePath,
  templateTitle,
}: {
  downloadedAt: string;
  email: string;
  templatePath: string;
  templateTitle: string;
}) {
  const response = await fetch("/api/leads", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      downloadedAt,
      email,
      landingPath: window.location.pathname,
      referrer: document.referrer,
      templatePath,
      templateTitle,
      utm: getUtmParams(),
    }),
  });

  if (!response.ok) {
    throw new Error("Lead capture request failed.");
  }

  return response.json() as Promise<LeadCaptureResponse>;
}

function sendAnalyticsEvent(
  eventName: string,
  options: {
    metadata?: Record<string, unknown>;
    templatePath?: string;
    templateTitle?: string;
  } = {},
) {
  const payload = {
    eventName,
    metadata: options.metadata ?? {},
    occurredAt: new Date().toISOString(),
    path: window.location.pathname,
    referrer: document.referrer,
    templatePath: options.templatePath ?? "",
    templateTitle: options.templateTitle ?? "",
    utm: getUtmParams(),
  };
  const body = JSON.stringify(payload);

  if ("sendBeacon" in navigator) {
    const blob = new Blob([body], { type: "application/json" });
    navigator.sendBeacon("/api/events", blob);
    return;
  }

  void fetch("/api/events", {
    body,
    headers: { "Content-Type": "application/json" },
    keepalive: true,
    method: "POST",
  }).catch(() => undefined);
}

function formatDate(value: string) {
  const parsed = new Date(value.includes("T") ? value : `${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(parsed);
}

function formatTimestamp(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(parsed);
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function typedSignatureDataUrl(name: string) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="560" height="180" viewBox="0 0 560 180"><rect width="560" height="180" fill="white"/><text x="28" y="108" font-family="Segoe Script, Bradley Hand, Brush Script MT, cursive" font-size="58" fill="#17211f">${escapeXml(
    name,
  )}</text><line x1="24" y1="136" x2="536" y2="136" stroke="#6b7280" stroke-width="2"/></svg>`;

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function buildContractSections(
  contract: ContractState,
  clauses: Record<ClauseKey, boolean>,
): ContractSection[] {
  const parties = `${contract.providerName}, with an address at ${contract.providerAddress} ("Provider"), and ${contract.customerName}, with an address at ${contract.customerAddress} ("Customer")`;
  const term = `The initial term begins on ${formatDate(
    contract.effectiveDate,
  )} and continues for ${contract.termMonths} months unless terminated earlier under this agreement.`;
  const payment = `Customer will pay Provider ${contract.feeAmount} ${contract.billingCycle} for the ${contract.planName} plan. Undisputed invoices are due within ${contract.paymentDueDays} days after receipt.`;
  const general = `This agreement is governed by the laws of ${contract.governingLaw}, without regard to conflict of law rules. Neither party may assign this agreement without the other party's prior written consent, except to an affiliate or successor in connection with a merger, reorganization, or sale of substantially all assets.`;

  const sharedSections: ContractSection[] = [
    {
      heading: "Parties",
      body: `This ${contract.contractTitle} is entered into by ${parties}.`,
    },
    {
      heading: "Fees and Payment",
      body: `${payment} Late payments may accrue interest at the maximum rate permitted by law, and Customer remains responsible for taxes other than Provider's income taxes.`,
    },
    {
      heading: "Term",
      body: clauses.autoRenewal
        ? `${term} After the initial term, this agreement renews for ${contract.renewalTerm} unless either party gives written notice of non-renewal at least ${contract.terminationNoticeDays} days before the then-current term expires.`
        : `${term} Renewal requires a written order form or other written agreement signed by both parties.`,
    },
    {
      heading: "Confidentiality",
      body: "Each party may receive confidential business, technical, product, security, or financial information from the other party. The receiving party will protect that information using at least reasonable care, use it only to perform or evaluate this agreement, and disclose it only to personnel and advisors who need to know it and are bound by confidentiality obligations.",
    },
    {
      heading: "Limitation of Liability",
      body: `Except for payment obligations, confidentiality breaches, misuse of intellectual property, and indemnity obligations, each party's aggregate liability arising out of this agreement will not exceed ${contract.liabilityCap}. Neither party will be liable for lost profits, loss of goodwill, or indirect, special, incidental, punitive, or consequential damages.`,
    },
    {
      heading: "General Terms",
      body: general,
    },
  ];

  let sections: ContractSection[];

  if (contract.template === "services") {
    sections = [
      {
        heading: "Scope of Services",
        body: `Provider will perform ${contract.serviceName} for Customer under the ${contract.planName}. Provider will use commercially reasonable efforts to meet agreed project milestones and will keep Customer informed of material scope, timing, or dependency changes.`,
      },
      {
        heading: "Acceptance",
        body: `Customer will review deliverables within ${contract.paymentDueDays} days after delivery. Deliverables are deemed accepted unless Customer identifies a material non-conformity in writing during that review period.`,
      },
      ...sharedSections,
    ];
  } else if (contract.template === "nda") {
    sections = [
      {
        heading: "Purpose",
        body: `The parties wish to exchange information for ${contract.serviceName}. Each party may disclose information to the other solely for that purpose.`,
      },
      {
        heading: "Protected Information",
        body: "Confidential information includes non-public product plans, financial information, security materials, customer information, technical information, business strategies, and any information that should reasonably be understood to be confidential given the nature of the information or the circumstances of disclosure.",
      },
      {
        heading: "Exclusions",
        body: "Confidential information does not include information that is publicly available without breach, already known without restriction, independently developed without use of confidential information, or rightfully received from a third party without a duty of confidentiality.",
      },
      {
        heading: "Return or Destruction",
        body: "Upon written request, the receiving party will return or destroy confidential information, except for archival copies maintained under standard backup systems or legal compliance policies.",
      },
      ...sharedSections.filter(
        (section) =>
          section.heading !== "Fees and Payment" &&
          section.heading !== "Term",
      ),
    ];
  } else if (contract.template === "dpa") {
    sections = [
      {
        heading: "Processing Details",
        body: `${contract.providerName} will process personal data for ${contract.customerName} only to provide ${contract.serviceName}, support the ${contract.planName}, comply with documented instructions, and meet applicable legal obligations. Primary processing will occur in ${contract.dataRegion}.`,
      },
      {
        heading: "Security Measures",
        body: "Provider will maintain administrative, technical, and organizational safeguards designed to protect personal data against unauthorized access, loss, alteration, and disclosure. Safeguards include access control, encryption in transit, logging, personnel confidentiality obligations, and incident response procedures.",
      },
      {
        heading: "Data Subject Requests",
        body: "Provider will provide reasonable assistance to Customer for data subject requests, regulatory inquiries, and data protection impact assessments to the extent Customer cannot reasonably fulfill the request through the service.",
      },
      ...sharedSections.filter((section) => section.heading !== "Fees and Payment"),
    ];
  } else {
    sections = [
      {
        heading: "Subscription Services",
        body: `Provider will make ${contract.serviceName} available to Customer under the ${contract.planName} plan. Customer may access and use the service for its internal business purposes during the term, subject to this agreement, applicable order forms, and reasonable usage limits stated in the service documentation.`,
      },
      {
        heading: "Customer Data",
        body: `Customer owns all data, content, and materials submitted to the service by or for Customer. Provider may process Customer data to provide, secure, support, and improve the service. Primary hosting and support operations will be conducted in ${contract.dataRegion}.`,
      },
      {
        heading: "Support",
        body: `Provider will provide standard support during business hours and will use commercially reasonable efforts to respond to priority support requests within ${contract.supportResponse}.`,
      },
      {
        heading: "Intellectual Property",
        body: "Provider retains all rights in the service, platform, software, documentation, know-how, templates, and related technology. Customer receives only the limited subscription rights expressly granted in this agreement.",
      },
      ...sharedSections,
    ];
  }

  if (clauses.securityAddendum && contract.template !== "dpa") {
    sections.push({
      heading: "Security Addendum",
      body: `Provider will maintain a written security program appropriate to the nature of the service and Customer data. Provider will restrict production access to authorized personnel, review access periodically, and notify Customer without undue delay after confirming a security incident affecting Customer data.`,
    });
  }

  if (clauses.slaCredits) {
    sections.push({
      heading: "Service Level Credits",
      body: `If Provider misses the stated support response target for a verified priority incident, Customer's exclusive remedy is a service credit applied to the next invoice. Credits do not apply to issues caused by Customer systems, third-party services, scheduled maintenance, beta features, or force majeure events.`,
    });
  }

  if (clauses.terminationForConvenience) {
    sections.push({
      heading: "Termination for Convenience",
      body: `Either party may terminate this agreement for convenience by giving at least ${contract.terminationNoticeDays} days' prior written notice. Customer remains responsible for fees accrued through the effective termination date and any non-cancellable commitments stated in an order form.`,
    });
  }

  if (clauses.ipAssignment) {
    sections.push({
      heading: "Custom Deliverables",
      body: "Subject to full payment, Provider assigns to Customer its rights in custom deliverables specifically created for Customer under a statement of work, excluding Provider's pre-existing materials, platform, tools, generic knowledge, and reusable components.",
    });
  }

  if (clauses.marketingRights) {
    sections.push({
      heading: "Publicity",
      body: "Provider may identify Customer as a customer and use Customer's name and logo in customer lists, pitch materials, and website references after Customer approves the first use in writing. Customer may revoke future use on written notice.",
    });
  }

  if (clauses.subprocessors) {
    sections.push({
      heading: "Subprocessors",
      body: "Provider may use subprocessors to provide the service, provided Provider remains responsible for their performance. Provider will maintain a current subprocessor list and provide notice before adding a new subprocessor that materially processes Customer data.",
    });
  }

  if (clauses.mutualIndemnity) {
    sections.push({
      heading: "Indemnity",
      body: "Each party will defend the other against third-party claims arising from its gross negligence, willful misconduct, or violation of law. Provider will defend Customer against claims that the unmodified service infringes a third party's intellectual property rights, subject to standard exclusions for Customer materials, combinations not supplied by Provider, and unauthorized use.",
    });
  }

  if (contract.specialTerms.trim()) {
    sections.push({
      heading: "Special Terms",
      body: contract.specialTerms.trim(),
    });
  }

  return sections;
}

function getContractStatus(signers: Signer[]) {
  const signedCount = signers.filter((signer) => signer.signedAt).length;
  if (signedCount === 0) {
    return "Draft";
  }

  if (signedCount === signers.length) {
    return "Executed";
  }

  return "Partially signed";
}

function downloadBlob(fileName: string, type: string, value: string) {
  const blob = new Blob([value], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function createFileSlug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "contract";
}

async function downloadContractPdf(
  contract: ContractState,
  sections: ContractSection[],
  signers: Signer[],
  status: string,
) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ format: "letter", unit: "pt" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginX = 54;
  const marginTop = 56;
  const marginBottom = 56;
  const contentWidth = pageWidth - marginX * 2;
  let y = marginTop;

  function ensureSpace(height: number) {
    if (y + height <= pageHeight - marginBottom) {
      return;
    }

    doc.addPage();
    y = marginTop;
  }

  function writeWrappedText(text: string, lineHeight: number) {
    const lines = doc.splitTextToSize(text, contentWidth) as string[];
    lines.forEach((line) => {
      ensureSpace(lineHeight);
      doc.text(line, marginX, y);
      y += lineHeight;
    });
  }

  doc.setProperties({
    title: contract.contractTitle,
    subject: `${contract.providerName} and ${contract.customerName}`,
    author: contract.providerName,
    keywords: `contract, ${status.toLowerCase()}, electronic signature`,
  });

  doc.setTextColor(82, 92, 103);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text(`Effective ${formatDate(contract.effectiveDate)}`, marginX, y);
  y += 22;

  doc.setTextColor(31, 37, 35);
  doc.setFont("times", "bold");
  doc.setFontSize(25);
  writeWrappedText(contract.contractTitle, 29);
  y += 4;

  doc.setTextColor(78, 86, 95);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  writeWrappedText(`${contract.providerName} and ${contract.customerName}`, 14);
  y += 10;

  doc.setDrawColor(31, 37, 35);
  doc.setLineWidth(1.4);
  doc.line(marginX, y, pageWidth - marginX, y);
  y += 30;

  sections.forEach((section, index) => {
    ensureSpace(82);
    doc.setTextColor(31, 37, 35);
    doc.setFont("times", "bold");
    doc.setFontSize(15);
    writeWrappedText(`${index + 1}. ${section.heading}`, 18);
    y += 3;

    doc.setTextColor(49, 55, 53);
    doc.setFont("times", "normal");
    doc.setFontSize(11.5);
    writeWrappedText(section.body, 16.5);
    y += 11;
  });

  ensureSpace(190);
  doc.setTextColor(31, 37, 35);
  doc.setFont("times", "bold");
  doc.setFontSize(16);
  doc.text("Signatures", marginX, y);
  y += 26;

  const gap = 24;
  const signatureWidth = (contentWidth - gap) / 2;
  const signatureHeight = 128;
  let rowTop = y;

  signers.forEach((signer, index) => {
    if (index > 0 && index % 2 === 0) {
      rowTop += signatureHeight + 18;
      y = rowTop;
      ensureSpace(signatureHeight);
      rowTop = y;
    }

    const x = marginX + (index % 2) * (signatureWidth + gap);
    const top = rowTop;

    doc.setDrawColor(160, 169, 181);
    doc.setLineWidth(0.8);
    doc.line(x, top + 65, x + signatureWidth, top + 65);

    if (signer.signatureDataUrl && signer.signatureMethod === "drawn") {
      try {
        doc.addImage(signer.signatureDataUrl, "PNG", x, top + 3, 150, 50);
      } catch {
        doc.setFont("times", "italic");
        doc.setFontSize(18);
        doc.text(signer.name || signer.role, x, top + 42, {
          maxWidth: signatureWidth,
        });
      }
    } else if (signer.signatureDataUrl && signer.signatureMethod === "typed") {
      doc.setTextColor(31, 37, 35);
      doc.setFont("times", "italic");
      doc.setFontSize(21);
      doc.text(signer.name || signer.role, x, top + 42, {
        maxWidth: signatureWidth,
      });
    } else {
      doc.setTextColor(135, 146, 160);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.text("Awaiting signature", x, top + 40);
    }

    doc.setTextColor(31, 37, 35);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10.5);
    doc.text(signer.name || signer.role, x, top + 84, {
      maxWidth: signatureWidth,
    });

    doc.setTextColor(78, 86, 95);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    doc.text(signer.title || signer.role, x, top + 100, {
      maxWidth: signatureWidth,
    });

    doc.setFontSize(8.5);
    doc.text(
      signer.signedAt ? `Signed ${formatTimestamp(signer.signedAt)}` : "Unsigned",
      x,
      top + 116,
      { maxWidth: signatureWidth },
    );
  });

  const pageCount = doc.getNumberOfPages();
  for (let page = 1; page <= pageCount; page += 1) {
    doc.setPage(page);
    doc.setTextColor(120, 130, 142);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text(`${page} / ${pageCount}`, pageWidth - marginX, pageHeight - 28, {
      align: "right",
    });
  }

  doc.save(`${createFileSlug(contract.contractTitle)}.pdf`);
}

function buildExportHtml(
  contract: ContractState,
  sections: ContractSection[],
  signers: Signer[],
  auditEvents: AuditEvent[],
  status: string,
) {
  const sectionHtml = sections
    .map(
      (section) => `<section>
        <h2>${escapeHtml(section.heading)}</h2>
        <p>${escapeHtml(section.body)}</p>
      </section>`,
    )
    .join("");
  const signerHtml = signers
    .map(
      (signer) => `<div class="signature">
        ${
          signer.signatureDataUrl
            ? `<img src="${signer.signatureDataUrl}" alt="${escapeHtml(
                signer.role,
              )} signature" />`
            : `<div class="signature-line"></div>`
        }
        <strong>${escapeHtml(signer.name || signer.role)}</strong>
        <span>${escapeHtml(signer.title || "")}</span>
        <span>${escapeHtml(
          signer.signedAt ? formatTimestamp(signer.signedAt) : "Unsigned",
        )}</span>
      </div>`,
    )
    .join("");
  const auditHtml = auditEvents
    .map(
      (event) => `<tr>
        <td>${escapeHtml(formatTimestamp(event.at))}</td>
        <td>${escapeHtml(event.actor)}</td>
        <td>${escapeHtml(event.action)}</td>
        <td>${escapeHtml(event.details)}</td>
      </tr>`,
    )
    .join("");

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(contract.contractTitle)}</title>
  <style>
    body { color: #202124; font-family: Georgia, "Times New Roman", serif; margin: 48px; }
    header { border-bottom: 2px solid #202124; margin-bottom: 28px; padding-bottom: 18px; }
    h1 { font-size: 30px; margin: 0 0 8px; }
    h2 { font-size: 17px; margin: 28px 0 8px; }
    p { font-size: 14px; line-height: 1.7; margin: 0; }
    .meta { color: #5f6368; font-family: Arial, sans-serif; font-size: 12px; text-transform: uppercase; }
    .signatures { display: grid; gap: 24px; grid-template-columns: repeat(2, minmax(0, 1fr)); margin-top: 36px; }
    .signature { border-top: 1px solid #9aa0a6; min-height: 150px; padding-top: 12px; }
    .signature img { display: block; height: 80px; max-width: 100%; object-fit: contain; object-position: left center; }
    .signature span { color: #5f6368; display: block; font-family: Arial, sans-serif; font-size: 12px; margin-top: 4px; }
    .signature-line { height: 80px; }
    table { border-collapse: collapse; font-family: Arial, sans-serif; font-size: 11px; margin-top: 12px; width: 100%; }
    td, th { border: 1px solid #d7dce3; padding: 8px; text-align: left; vertical-align: top; }
  </style>
</head>
<body>
  <header>
    <div class="meta">Status: ${escapeHtml(status)} | Effective ${escapeHtml(
      formatDate(contract.effectiveDate),
    )}</div>
    <h1>${escapeHtml(contract.contractTitle)}</h1>
    <p>${escapeHtml(contract.providerName)} and ${escapeHtml(
      contract.customerName,
    )}</p>
  </header>
  ${sectionHtml}
  <h2>Signatures</h2>
  <div class="signatures">${signerHtml}</div>
  <h2>Audit Trail</h2>
  <table>
    <thead><tr><th>Time</th><th>Actor</th><th>Action</th><th>Details</th></tr></thead>
    <tbody>${auditHtml}</tbody>
  </table>
</body>
</html>`;
}

function usePageMetadata({
  canonicalPath,
  description,
  title,
}: {
  canonicalPath: string;
  description: string;
  title: string;
}) {
  useEffect(() => {
    document.title = title;

    let descriptionTag = document.querySelector<HTMLMetaElement>(
      'meta[name="description"]',
    );
    if (!descriptionTag) {
      descriptionTag = document.createElement("meta");
      descriptionTag.name = "description";
      document.head.appendChild(descriptionTag);
    }
    descriptionTag.content = description;

    let canonicalTag = document.querySelector<HTMLLinkElement>(
      'link[rel="canonical"]',
    );
    if (!canonicalTag) {
      canonicalTag = document.createElement("link");
      canonicalTag.rel = "canonical";
      document.head.appendChild(canonicalTag);
    }
    canonicalTag.href = `${window.location.origin}${canonicalPath}`;
  }, [canonicalPath, description, title]);
}

function useRobotsMeta(content: string) {
  useEffect(() => {
    let robotsTag = document.querySelector<HTMLMetaElement>(
      'meta[name="robots"]',
    );
    if (!robotsTag) {
      robotsTag = document.createElement("meta");
      robotsTag.name = "robots";
      document.head.appendChild(robotsTag);
    }
    robotsTag.content = content;
  }, [content]);
}

function useJsonLd(schema: unknown | null) {
  useEffect(() => {
    const scriptId = "termcraft-structured-data";
    let schemaScript = document.querySelector<HTMLScriptElement>(
      `script#${scriptId}`,
    );

    if (!schema) {
      schemaScript?.remove();
      return;
    }

    if (!schemaScript) {
      schemaScript = document.createElement("script");
      schemaScript.id = scriptId;
      schemaScript.type = "application/ld+json";
      document.head.appendChild(schemaScript);
    }

    schemaScript.textContent = JSON.stringify(schema);
  }, [schema]);
}

type TemplateIconKey = "users" | "money" | "target" | "database";

type SeoTemplateField = {
  key: string;
  label: string;
  type?: "date" | "text";
  multiline?: boolean;
  rows?: number;
};

type SeoTemplateCard = {
  title: string;
  body: string;
};

type SeoTemplateFaq = {
  question: string;
  answer: string;
};

type SeoTemplateConfig = {
  path: string;
  title: string;
  metaDescription: string;
  h1: string;
  intro: string;
  statCards: Array<{ icon: TemplateIconKey; label: string }>;
  fields: SeoTemplateField[];
  defaultValues: Record<string, string>;
  providerNameKey: string;
  clientNameKey: string;
  contractTitle: string;
  planName: string;
  createContract: (values: Record<string, string>) => ContractState;
  buildSections: (
    contract: ContractState,
    values: Record<string, string>,
  ) => ContractSection[];
  seo: {
    coversHeading: string;
    coversIntro: string;
    cards: SeoTemplateCard[];
    whenHeading: string;
    whenBody: string;
    faqs: SeoTemplateFaq[];
  };
};

type AdditionalTemplateDefinition = {
  path: string;
  title: string;
  metaDescription: string;
  h1: string;
  intro: string;
  contractTitle: string;
  planName: string;
  templateType?: TemplateKey;
  providerNameKey: string;
  clientNameKey: string;
  scopeKey: string;
  feeKey: string;
  dateKey: string;
  termMonths?: number;
  fields: SeoTemplateField[];
  defaultValues: Record<string, string>;
  seo: SeoTemplateConfig["seo"];
};

const additionalTemplateDefinitions =
  additionalTemplatesRaw as unknown as AdditionalTemplateDefinition[];

const templateIconMap: Record<TemplateIconKey, typeof Users> = {
  users: Users,
  money: BadgeDollarSign,
  target: Target,
  database: Database,
};

function createTemplateSignerList(
  config: SeoTemplateConfig,
  values: Record<string, string>,
): Signer[] {
  return [
    {
      id: "provider",
      role: "Provider",
      name: values[config.providerNameKey] || "Service Provider",
      title: "Authorized Representative",
      email: "provider@example.com",
    },
    {
      id: "customer",
      role: "Customer",
      name: values[config.clientNameKey] || "Client",
      title: "Authorized Representative",
      email: "client@example.com",
    },
  ];
}

function getTemplateValue(
  definition: AdditionalTemplateDefinition,
  values: Record<string, string>,
  key: string,
  fallback = "",
) {
  return values[key] || definition.defaultValues[key] || fallback;
}

function createGenericTemplateContract(
  definition: AdditionalTemplateDefinition,
  values: Record<string, string>,
): ContractState {
  return {
    template: definition.templateType ?? "services",
    contractTitle: definition.contractTitle,
    providerName: getTemplateValue(
      definition,
      values,
      definition.providerNameKey,
      "Service Provider",
    ),
    providerAddress: "Provider address to be inserted",
    customerName: getTemplateValue(
      definition,
      values,
      definition.clientNameKey,
      "Client",
    ),
    customerAddress: "Client address to be inserted",
    serviceName: getTemplateValue(
      definition,
      values,
      definition.scopeKey,
      definition.planName,
    ),
    planName: definition.planName,
    feeAmount: getTemplateValue(
      definition,
      values,
      definition.feeKey,
      "Fees stated in this agreement",
    ),
    billingCycle: "as stated in this agreement",
    effectiveDate: getTemplateValue(
      definition,
      values,
      definition.dateKey,
      new Date().toISOString().slice(0, 10),
    ),
    termMonths: definition.termMonths ?? 6,
    renewalTerm: "successive one-month renewal terms unless either party gives written notice",
    paymentDueDays: 15,
    terminationNoticeDays: 30,
    governingLaw: "Delaware",
    dataRegion: "United States",
    supportResponse: "two business days",
    liabilityCap: "fees paid under this agreement in the three months before the claim",
    specialTerms: definition.seo.cards.map((card) => card.title).join(", "),
  };
}

function buildGenericTemplateSections(
  definition: AdditionalTemplateDefinition,
  contract: ContractState,
  values: Record<string, string>,
): ContractSection[] {
  const excludedKeys = new Set([
    definition.providerNameKey,
    definition.clientNameKey,
    definition.dateKey,
  ]);
  const dynamicSections = definition.fields
    .filter((field) => !excludedKeys.has(field.key))
    .map((field) => ({
      heading: field.label,
      body: getTemplateValue(
        definition,
        values,
        field.key,
        `${field.label} to be completed by the parties.`,
      ),
    }));

  return [
    {
      heading: "Parties",
      body: `This ${definition.contractTitle} is entered into by ${contract.providerName} ("Provider") and ${contract.customerName} ("Client") as of ${formatDate(contract.effectiveDate)}.`,
    },
    ...dynamicSections,
    {
      heading: "Client Responsibilities",
      body: "Client will provide timely access, approvals, information, materials, decisions, and cooperation reasonably needed for Provider to perform the services or obligations described in this agreement.",
    },
    {
      heading: "Confidentiality",
      body: "Each party will protect non-public business, customer, technical, financial, marketing, and operational information received from the other party and will use it only to perform or evaluate this agreement.",
    },
    {
      heading: "Work Product and Usage Rights",
      body: "Ownership, license, and usage rights are governed by the specific terms stated in this agreement. Provider retains pre-existing tools, templates, methods, know-how, and reusable materials unless expressly assigned in writing.",
    },
    {
      heading: "Payment Terms",
      body: `Undisputed invoices are due within ${contract.paymentDueDays} days after receipt unless a different payment schedule is stated in the agreement.`,
    },
    {
      heading: "Term and Termination",
      body: `The initial term begins on ${formatDate(contract.effectiveDate)} and continues for ${contract.termMonths} months unless completed earlier or terminated under this agreement. Either party may terminate by giving ${contract.terminationNoticeDays} days' written notice.`,
    },
    {
      heading: "Limitation of Liability",
      body: `Except for payment obligations, confidentiality breaches, IP misuse, and willful misconduct, each party's aggregate liability will not exceed ${contract.liabilityCap}.`,
    },
    {
      heading: "General Terms",
      body: `This agreement is governed by the laws of ${contract.governingLaw}. Changes must be in writing and accepted by both parties. This template is a practical first draft and should be reviewed before production use.`,
    },
  ];
}

function createAdditionalSeoTemplateConfig(
  definition: AdditionalTemplateDefinition,
): SeoTemplateConfig {
  const defaultValues = {
    ...definition.defaultValues,
    [definition.dateKey]: new Date().toISOString().slice(0, 10),
  };

  return {
    path: definition.path,
    title: definition.title,
    metaDescription: definition.metaDescription,
    h1: definition.h1,
    intro: definition.intro,
    statCards: [
      { icon: "users", label: "Party details" },
      { icon: "money", label: "Commercial terms" },
      { icon: "target", label: "Scope controls" },
      { icon: "database", label: "Key clauses" },
    ],
    fields: definition.fields,
    defaultValues,
    providerNameKey: definition.providerNameKey,
    clientNameKey: definition.clientNameKey,
    contractTitle: definition.contractTitle,
    planName: definition.planName,
    createContract: (values) =>
      createGenericTemplateContract(definition, values),
    buildSections: (contract, values) =>
      buildGenericTemplateSections(definition, contract, values),
    seo: definition.seo,
  };
}

const baseSeoTemplateConfigs: Record<string, SeoTemplateConfig> = {
  "/templates/b2b-lead-generation-retainer-agreement": {
    path: "/templates/b2b-lead-generation-retainer-agreement",
    title: "B2B Lead Generation Retainer Agreement Template | Free PDF",
    metaDescription:
      "Generate a free B2B lead generation retainer agreement PDF with setup fee, booked meeting commission, lead volume, and CRM access clauses.",
    h1: "B2B Lead Generation Retainer Agreement Template",
    intro:
      "Create a practical retainer agreement for outsourced B2B lead generation campaigns, booked meeting commissions, monthly lead targets, and CRM access rules.",
    statCards: [
      { icon: "users", label: "Agency + client" },
      { icon: "money", label: "Retainer terms" },
      { icon: "target", label: "Lead targets" },
      { icon: "database", label: "CRM access" },
    ],
    fields: [
      { key: "clientName", label: "Client Name" },
      { key: "providerName", label: "Service Provider Name" },
      { key: "setupFee", label: "Setup Fee" },
      {
        key: "commissionPerBookedMeeting",
        label: "Commission Per Booked Meeting",
      },
      { key: "targetLeadVolume", label: "Target Lead Volume" },
      { key: "startDate", label: "Start Date", type: "date" },
      { key: "scopeOfWork", label: "Scope of Work", multiline: true, rows: 4 },
      {
        key: "crmAccessClauses",
        label: "CRM Access Clauses",
        multiline: true,
        rows: 4,
      },
    ],
    defaultValues: createDefaultB2BLeadGenerationForm(),
    providerNameKey: "providerName",
    clientNameKey: "clientName",
    contractTitle: "B2B Lead Generation Retainer Agreement",
    planName: "B2B lead generation retainer",
    createContract: (values) =>
      createB2BLeadGenerationContract(values as unknown as B2BLeadGenerationForm),
    buildSections: (contract, values) =>
      buildB2BLeadGenerationSections(
        contract,
        values as unknown as B2BLeadGenerationForm,
      ),
    seo: {
      coversHeading: "What This B2B Lead Generation Retainer Agreement Covers",
      coversIntro:
        "This B2B lead generation retainer agreement template is built for agencies, consultants, outsourced SDR teams, and appointment setting providers that charge a setup fee plus a booked meeting commission.",
      cards: [
        {
          title: "Setup Fee",
          body: "Defines the upfront amount for campaign strategy, list setup, messaging, CRM preparation, and launch work.",
        },
        {
          title: "Booked Meeting Commission",
          body: "States how the provider earns a commission when a qualifying prospect books a sales meeting.",
        },
        {
          title: "Target Lead Volume",
          body: "Sets the campaign target while making clear that lead volume is not a guaranteed revenue or close-rate outcome.",
        },
        {
          title: "CRM Access Clauses",
          body: "Covers limited CRM permissions for setup, attribution, reporting, and campaign management.",
        },
      ],
      whenHeading: "When To Use This Template",
      whenBody:
        "Use this template when a lead generation vendor is running outbound campaigns, sourcing prospects, booking sales calls, or managing a client pipeline in a CRM.",
      faqs: [
        {
          question: "What is a B2B lead generation retainer agreement?",
          answer:
            "It is a services agreement between a client and lead generation provider that documents campaign scope, fees, meeting commission rules, targets, CRM access, and termination terms.",
        },
        {
          question: "Can this template guarantee booked meetings?",
          answer:
            "The template defines meeting commission and target lead volume, but it avoids guaranteeing sales outcomes because outbound campaign results depend on market response, offer quality, and client follow-up.",
        },
        {
          question: "Is the PDF watermarked?",
          answer:
            "No. The button downloads a clean, unwatermarked PDF generated from the fields on this page.",
        },
      ],
    },
  },
  "/templates/seo-agency-master-services-agreement": {
    path: "/templates/seo-agency-master-services-agreement",
    title: "SEO Agency Master Services Agreement Template | Free PDF",
    metaDescription:
      "Generate a free SEO agency master services agreement PDF with monthly retainer amount, baseline metrics, reporting cadence, and backlink liability waiver terms.",
    h1: "SEO Agency Master Services Agreement Template",
    intro:
      "Create an SEO agency MSA for monthly retainers, baseline performance metrics, reporting cadence, backlink risk allocation, and client approval responsibilities.",
    statCards: [
      { icon: "users", label: "Agency + client" },
      { icon: "money", label: "Monthly retainer" },
      { icon: "target", label: "Baseline metrics" },
      { icon: "database", label: "Reporting cadence" },
    ],
    fields: [
      { key: "clientName", label: "Client Name" },
      { key: "agencyName", label: "SEO Agency Name" },
      { key: "monthlyRetainerAmount", label: "Monthly Retainer Amount" },
      { key: "baselineMetrics", label: "Baseline Metrics", multiline: true, rows: 4 },
      { key: "reportingCadence", label: "Reporting Cadence" },
      {
        key: "backlinkLiabilityWaivers",
        label: "Backlink Liability Waivers",
        multiline: true,
        rows: 4,
      },
      { key: "startDate", label: "Start Date", type: "date" },
      { key: "scopeOfServices", label: "Scope of Services", multiline: true, rows: 4 },
    ],
    defaultValues: {
      clientName: "Acme Growth LLC",
      agencyName: "Northstar SEO Studio",
      monthlyRetainerAmount: "$4,000 per month",
      baselineMetrics:
        "Organic sessions, target keyword rankings, indexed pages, referring domains, conversion events, and technical health score as measured during onboarding.",
      reportingCadence:
        "Monthly written report plus a 45-minute strategy review call",
      backlinkLiabilityWaivers:
        "Client acknowledges that third-party backlink placements, publisher availability, algorithm updates, and search engine actions are outside Agency's complete control. Agency will not purchase spam links or use knowingly deceptive link schemes.",
      startDate: new Date().toISOString().slice(0, 10),
      scopeOfServices:
        "Technical SEO audits, keyword research, content briefs, on-page recommendations, internal linking guidance, backlink outreach strategy, and monthly performance reporting.",
    },
    providerNameKey: "agencyName",
    clientNameKey: "clientName",
    contractTitle: "SEO Agency Master Services Agreement",
    planName: "SEO agency retainer",
    createContract: (values) => ({
      template: "services",
      contractTitle: "SEO Agency Master Services Agreement",
      providerName: values.agencyName,
      providerAddress: "Agency address to be inserted",
      customerName: values.clientName,
      customerAddress: "Client address to be inserted",
      serviceName: values.scopeOfServices,
      planName: "SEO agency retainer",
      feeAmount: values.monthlyRetainerAmount,
      billingCycle: "monthly",
      effectiveDate: values.startDate,
      termMonths: 6,
      renewalTerm: "successive one-month renewal terms",
      paymentDueDays: 15,
      terminationNoticeDays: 30,
      governingLaw: "Delaware",
      dataRegion: "United States",
      supportResponse: "two business days",
      liabilityCap: "fees paid in the three months before the claim",
      specialTerms: values.backlinkLiabilityWaivers,
    }),
    buildSections: (contract, values) => [
      {
        heading: "Parties",
        body: `This SEO Agency Master Services Agreement is entered into by ${values.agencyName} ("Agency") and ${values.clientName} ("Client") as of ${formatDate(values.startDate)}.`,
      },
      {
        heading: "Scope of SEO Services",
        body: values.scopeOfServices,
      },
      {
        heading: "Monthly Retainer Amount",
        body: `Client will pay Agency ${values.monthlyRetainerAmount}. The retainer covers the recurring SEO services described in this agreement and does not include paid media spend, third-party software, publisher fees, development costs, or out-of-scope content production unless approved in writing.`,
      },
      {
        heading: "Baseline Metrics",
        body: `The parties will use the following baseline metrics to compare SEO progress after onboarding: ${values.baselineMetrics}. Baseline metrics are reference points and do not guarantee ranking, traffic, or revenue outcomes.`,
      },
      {
        heading: "Reporting Cadence",
        body: `Agency will report performance using the following cadence: ${values.reportingCadence}. Reports may include completed work, traffic trends, ranking movement, technical issues, content opportunities, and recommended next actions.`,
      },
      {
        heading: "Backlink Liability Waiver",
        body: values.backlinkLiabilityWaivers,
      },
      {
        heading: "Client Responsibilities",
        body: "Client will provide timely access to analytics, search console, CMS, hosting, development resources, brand guidance, approvals, and subject matter expertise. Delayed access or approvals may affect timelines and campaign performance.",
      },
      {
        heading: "SEO Performance Disclaimer",
        body: "Agency does not control search engine algorithms, competitor activity, site changes made by Client or third parties, market demand, or publisher decisions. Agency will use commercially reasonable efforts but does not guarantee first-page rankings, traffic levels, leads, sales, or revenue.",
      },
      {
        heading: "Payment Terms",
        body: `Agency may invoice monthly in advance. Undisputed invoices are due within ${contract.paymentDueDays} days after receipt.`,
      },
      {
        heading: "Term and Termination",
        body: `The initial term is ${contract.termMonths} months beginning on ${formatDate(values.startDate)}. Either party may terminate after the initial term by giving ${contract.terminationNoticeDays} days' written notice.`,
      },
      {
        heading: "Confidentiality",
        body: "Each party will protect non-public SEO strategy, analytics, customer, business, and technical information using reasonable care and will use it only to perform or evaluate this agreement.",
      },
      {
        heading: "Limitation of Liability",
        body: `Except for payment obligations, confidentiality breaches, data misuse, and willful misconduct, each party's aggregate liability will not exceed ${contract.liabilityCap}.`,
      },
    ],
    seo: {
      coversHeading: "What This SEO Agency MSA Covers",
      coversIntro:
        "This SEO agency master services agreement template documents recurring SEO services, monthly retainers, baseline performance metrics, reporting cadence, and backlink risk allocation.",
      cards: [
        {
          title: "Monthly Retainer Amount",
          body: "Sets the recurring SEO fee and separates the retainer from paid tools, media spend, publisher fees, and extra development work.",
        },
        {
          title: "Baseline Metrics",
          body: "Captures the starting point for rankings, traffic, referring domains, conversions, and technical health.",
        },
        {
          title: "Reporting Cadence",
          body: "Defines how often the agency reports progress and what performance updates the client receives.",
        },
        {
          title: "Backlink Liability Waivers",
          body: "Clarifies risks around third-party links, publisher decisions, algorithm changes, and prohibited link tactics.",
        },
      ],
      whenHeading: "When To Use This Template",
      whenBody:
        "Use this template when an SEO agency provides ongoing optimization, technical audits, keyword research, content recommendations, backlink strategy, or monthly reporting for a client.",
      faqs: [
        {
          question: "What is an SEO agency master services agreement?",
          answer:
            "It is a services agreement that defines the agency-client relationship, recurring SEO scope, fees, reporting process, approvals, disclaimers, and legal terms.",
        },
        {
          question: "Should an SEO agreement guarantee rankings?",
          answer:
            "Usually no. This template includes baseline metrics and effort obligations without guaranteeing rankings, traffic, leads, or revenue.",
        },
        {
          question: "Does the PDF include a watermark?",
          answer:
            "No. The generated PDF is clean and unwatermarked.",
        },
      ],
    },
  },
  "/templates/digital-marketing-subcontractor-agreement": {
    path: "/templates/digital-marketing-subcontractor-agreement",
    title: "Digital Marketing Subcontractor Agreement Template | Free PDF",
    metaDescription:
      "Generate a free digital marketing subcontractor agreement PDF with deliverables, non-solicitation language, and independent contractor status terms.",
    h1: "Digital Marketing Subcontractor Agreement Template",
    intro:
      "Create a subcontractor agreement for freelance marketers, agency partners, white-label vendors, and specialist contractors working behind an agency-client relationship.",
    statCards: [
      { icon: "users", label: "Agency + subcontractor" },
      { icon: "target", label: "Deliverables" },
      { icon: "database", label: "Client protection" },
      { icon: "money", label: "Contractor status" },
    ],
    fields: [
      { key: "agencyName", label: "Agency Name" },
      { key: "subcontractorName", label: "Subcontractor Name" },
      { key: "paymentTerms", label: "Payment Terms" },
      { key: "startDate", label: "Start Date", type: "date" },
      {
        key: "scopeOfDeliverables",
        label: "Scope of Deliverables",
        multiline: true,
        rows: 4,
      },
      {
        key: "nonSolicitationClause",
        label: "Non-Solicitation Clause",
        multiline: true,
        rows: 4,
      },
      {
        key: "independentContractorStatus",
        label: "Independent Contractor Status",
        multiline: true,
        rows: 4,
      },
    ],
    defaultValues: {
      agencyName: "Northstar Marketing Agency",
      subcontractorName: "Brightline Ads Studio",
      paymentTerms:
        "$1,800 monthly, payable within 15 days after approved invoice",
      startDate: new Date().toISOString().slice(0, 10),
      scopeOfDeliverables:
        "Subcontractor will provide paid search campaign setup, ad copy variations, weekly optimization, conversion tracking checks, and monthly performance notes for Agency-assigned client accounts.",
      nonSolicitationClause:
        "Subcontractor will not directly solicit, contract with, or accept work from Agency clients introduced through the engagement for 12 months after the last assigned project without Agency's written consent.",
      independentContractorStatus:
        "Subcontractor is an independent contractor and controls the manner and means of performing the services. Subcontractor is not an employee, partner, franchisee, or agent of Agency and is responsible for its own taxes, insurance, tools, and personnel.",
    },
    providerNameKey: "subcontractorName",
    clientNameKey: "agencyName",
    contractTitle: "Digital Marketing Subcontractor Agreement",
    planName: "Digital marketing subcontractor services",
    createContract: (values) => ({
      template: "services",
      contractTitle: "Digital Marketing Subcontractor Agreement",
      providerName: values.subcontractorName,
      providerAddress: "Subcontractor address to be inserted",
      customerName: values.agencyName,
      customerAddress: "Agency address to be inserted",
      serviceName: values.scopeOfDeliverables,
      planName: "Digital marketing subcontractor services",
      feeAmount: values.paymentTerms,
      billingCycle: "monthly",
      effectiveDate: values.startDate,
      termMonths: 3,
      renewalTerm: "successive one-month renewal terms",
      paymentDueDays: 15,
      terminationNoticeDays: 14,
      governingLaw: "Delaware",
      dataRegion: "United States",
      supportResponse: "two business days",
      liabilityCap: "fees paid in the three months before the claim",
      specialTerms: values.nonSolicitationClause,
    }),
    buildSections: (contract, values) => [
      {
        heading: "Parties",
        body: `This Digital Marketing Subcontractor Agreement is entered into by ${values.agencyName} ("Agency") and ${values.subcontractorName} ("Subcontractor") as of ${formatDate(values.startDate)}.`,
      },
      {
        heading: "Scope of Deliverables",
        body: values.scopeOfDeliverables,
      },
      {
        heading: "Independent Contractor Status",
        body: values.independentContractorStatus,
      },
      {
        heading: "Non-Solicitation",
        body: values.nonSolicitationClause,
      },
      {
        heading: "Client Relationship and White-Label Work",
        body: "Agency owns the client relationship. Subcontractor will communicate with Agency-assigned clients only as authorized by Agency and will not represent that it has authority to bind Agency or modify client contracts.",
      },
      {
        heading: "Payment Terms",
        body: `Agency will pay Subcontractor according to the following terms: ${values.paymentTerms}. Payment is conditioned on timely delivery of approved work and a complete invoice unless otherwise required by law.`,
      },
      {
        heading: "Confidentiality",
        body: "Subcontractor will protect Agency and client confidential information, including campaign data, account access, budgets, creatives, strategy, customer data, pricing, and business processes.",
      },
      {
        heading: "Work Product",
        body: "Upon full payment, work product created specifically for Agency or its client may be used by Agency for the assigned client engagement. Subcontractor retains pre-existing tools, templates, know-how, and reusable methods.",
      },
      {
        heading: "Compliance",
        body: "Subcontractor will comply with applicable advertising platform rules, privacy laws, data handling requirements, and client account policies. Subcontractor will not knowingly use deceptive, infringing, or unlawful marketing practices.",
      },
      {
        heading: "Term and Termination",
        body: `The engagement begins on ${formatDate(values.startDate)} and continues until terminated. Either party may terminate with ${contract.terminationNoticeDays} days' written notice, subject to payment for approved work performed before termination.`,
      },
      {
        heading: "Limitation of Liability",
        body: `Except for confidentiality breaches, data misuse, non-solicitation breaches, and willful misconduct, each party's aggregate liability will not exceed ${contract.liabilityCap}.`,
      },
    ],
    seo: {
      coversHeading: "What This Digital Marketing Subcontractor Agreement Covers",
      coversIntro:
        "This digital marketing subcontractor agreement template is built for agencies hiring outside specialists while protecting client relationships, account access, deliverables, and contractor classification.",
      cards: [
        {
          title: "Scope of Deliverables",
          body: "Defines the marketing tasks, campaign support, account work, reporting, or creative deliverables the subcontractor must provide.",
        },
        {
          title: "Non-Solicitation Clause",
          body: "Helps prevent subcontractors from bypassing the agency and taking introduced clients directly.",
        },
        {
          title: "Independent Contractor Status",
          body: "Clarifies that the subcontractor is not an employee, partner, or agent of the agency.",
        },
        {
          title: "White-Label Client Work",
          body: "Documents how the subcontractor may interact with client accounts and client contacts.",
        },
      ],
      whenHeading: "When To Use This Template",
      whenBody:
        "Use this template when an agency hires a freelancer, media buyer, SEO specialist, content marketer, analytics contractor, or white-label vendor to perform work for agency clients.",
      faqs: [
        {
          question: "What is a digital marketing subcontractor agreement?",
          answer:
            "It is a contract between an agency and outside contractor that defines deliverables, client relationship rules, payment terms, confidentiality, and contractor status.",
        },
        {
          question: "Why include a non-solicitation clause?",
          answer:
            "A non-solicitation clause helps protect the agency from having a subcontractor directly pursue clients introduced through the agency relationship.",
        },
        {
          question: "Is the generated PDF free?",
          answer:
            "Yes. The download button creates a free, clean, unwatermarked PDF from the fields on the page.",
        },
      ],
    },
  },
  "/templates/ecommerce-web-development-contract": {
    path: "/templates/ecommerce-web-development-contract",
    title: "E-commerce Web Development Contract Template | Free PDF",
    metaDescription:
      "Generate a free e-commerce web development contract PDF with platform, milestone payment schedule, and final IP transfer date.",
    h1: "E-commerce Web Development Contract Template",
    intro:
      "Create a web development agreement for Shopify, WooCommerce, BigCommerce, or custom e-commerce builds with milestones, payments, launch responsibilities, and final IP transfer terms.",
    statCards: [
      { icon: "users", label: "Developer + client" },
      { icon: "database", label: "Platform details" },
      { icon: "money", label: "Milestones" },
      { icon: "target", label: "IP transfer date" },
    ],
    fields: [
      { key: "clientName", label: "Client Name" },
      { key: "developerName", label: "Developer Name" },
      { key: "ecommercePlatform", label: "E-commerce Platform" },
      { key: "startDate", label: "Start Date", type: "date" },
      {
        key: "milestonePaymentSchedule",
        label: "Milestone Payment Schedule",
        multiline: true,
        rows: 4,
      },
      {
        key: "finalIpTransferDate",
        label: "Final IP Transfer Date",
        type: "date",
      },
      { key: "scopeOfWork", label: "Scope of Work", multiline: true, rows: 4 },
    ],
    defaultValues: {
      clientName: "Acme Commerce LLC",
      developerName: "Northstar Web Studio",
      ecommercePlatform: "Shopify",
      startDate: new Date().toISOString().slice(0, 10),
      milestonePaymentSchedule:
        "40% due on signing, 30% due after design approval, 20% due after development handoff, and 10% due before production launch.",
      finalIpTransferDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 60)
        .toISOString()
        .slice(0, 10),
      scopeOfWork:
        "Developer will design and build an e-commerce storefront, configure product templates, cart and checkout settings, core pages, app integrations, analytics tags, and launch support for the selected platform.",
    },
    providerNameKey: "developerName",
    clientNameKey: "clientName",
    contractTitle: "E-commerce Web Development Contract",
    planName: "E-commerce web development project",
    createContract: (values) => ({
      template: "services",
      contractTitle: "E-commerce Web Development Contract",
      providerName: values.developerName,
      providerAddress: "Developer address to be inserted",
      customerName: values.clientName,
      customerAddress: "Client address to be inserted",
      serviceName: values.scopeOfWork,
      planName: `${values.ecommercePlatform} web development project`,
      feeAmount: values.milestonePaymentSchedule,
      billingCycle: "milestone-based",
      effectiveDate: values.startDate,
      termMonths: 4,
      renewalTerm: "monthly maintenance terms if separately agreed",
      paymentDueDays: 7,
      terminationNoticeDays: 14,
      governingLaw: "Delaware",
      dataRegion: "United States",
      supportResponse: "two business days",
      liabilityCap: "fees paid under the project before the claim",
      specialTerms: `Final IP transfer date: ${formatDate(values.finalIpTransferDate)}.`,
    }),
    buildSections: (contract, values) => [
      {
        heading: "Parties",
        body: `This E-commerce Web Development Contract is entered into by ${values.developerName} ("Developer") and ${values.clientName} ("Client") as of ${formatDate(values.startDate)}.`,
      },
      {
        heading: "Project Scope",
        body: values.scopeOfWork,
      },
      {
        heading: "E-commerce Platform",
        body: `The project will be built for ${values.ecommercePlatform}. Client is responsible for maintaining platform subscriptions, payment processor accounts, third-party app licenses, domain registrations, and hosting or platform fees unless the parties agree otherwise in writing.`,
      },
      {
        heading: "Milestone Payment Schedule",
        body: values.milestonePaymentSchedule,
      },
      {
        heading: "Final IP Transfer Date",
        body: `Subject to full payment of undisputed amounts, Developer will transfer ownership of custom project deliverables to Client on ${formatDate(values.finalIpTransferDate)}. Developer retains pre-existing code, tools, frameworks, templates, libraries, and reusable know-how.`,
      },
      {
        heading: "Client Responsibilities",
        body: "Client will provide product data, images, copy, brand assets, legal policies, tax and shipping rules, payment gateway access, approvals, and stakeholder feedback needed to complete the project.",
      },
      {
        heading: "Acceptance and Revisions",
        body: "Client will review milestone deliverables promptly. Deliverables are deemed accepted unless Client identifies material non-conformities in writing within five business days. Reasonable revisions are included only to the extent they relate to the agreed scope.",
      },
      {
        heading: "Launch and Third-Party Services",
        body: "Developer will provide commercially reasonable launch support, but third-party platform outages, payment processor issues, app defects, DNS propagation, and shipping or tax configuration errors outside Developer's control are not Developer breaches.",
      },
      {
        heading: "Payment Terms",
        body: `Undisputed milestone invoices are due within ${contract.paymentDueDays} days after receipt. Developer may pause work for overdue invoices after written notice.`,
      },
      {
        heading: "Term and Termination",
        body: `The project begins on ${formatDate(values.startDate)} and continues until completion or termination. Either party may terminate with ${contract.terminationNoticeDays} days' written notice, subject to payment for work performed and non-cancellable commitments.`,
      },
      {
        heading: "Limitation of Liability",
        body: `Except for payment obligations, confidentiality breaches, IP misuse, and willful misconduct, each party's aggregate liability will not exceed ${contract.liabilityCap}.`,
      },
    ],
    seo: {
      coversHeading: "What This E-commerce Web Development Contract Covers",
      coversIntro:
        "This e-commerce web development contract template helps developers and clients define platform scope, milestone payments, launch responsibilities, acceptance, and final IP transfer terms.",
      cards: [
        {
          title: "E-commerce Platform",
          body: "Identifies the build platform, such as Shopify, WooCommerce, BigCommerce, or a custom commerce stack.",
        },
        {
          title: "Milestone Payment Schedule",
          body: "Documents how project payments are split across signing, design approval, development handoff, and launch.",
        },
        {
          title: "Final IP Transfer Date",
          body: "Sets the date when custom deliverables transfer to the client after payment is complete.",
        },
        {
          title: "Launch Responsibilities",
          body: "Clarifies what the developer handles and what remains with the client or third-party platforms.",
        },
      ],
      whenHeading: "When To Use This Template",
      whenBody:
        "Use this template when a developer or studio is building an online store, redesigning an e-commerce site, migrating a storefront, or configuring checkout, product pages, apps, analytics, and launch support.",
      faqs: [
        {
          question: "What is an e-commerce web development contract?",
          answer:
            "It is a project agreement that defines the store build scope, platform, payment milestones, acceptance process, launch duties, and ownership transfer terms.",
        },
        {
          question: "When should IP transfer to the client?",
          answer:
            "This template ties final IP transfer to a specific date and full payment of undisputed amounts, while preserving the developer's pre-existing tools and reusable code.",
        },
        {
          question: "Can I download this as a PDF?",
          answer:
            "Yes. The page instantly compiles the form fields into a clean, unwatermarked PDF.",
        },
      ],
    },
  },
  "/templates/marketing-agency-mutual-nda": {
    path: "/templates/marketing-agency-mutual-nda",
    title: "Marketing Agency Mutual NDA Template | Free PDF",
    metaDescription:
      "Generate a free marketing agency mutual NDA PDF with client list protection, campaign strategy confidentiality, and non-disclosure duration terms.",
    h1: "Marketing Agency Mutual NDA Template",
    intro:
      "Create a mutual NDA for agencies, clients, partners, and contractors sharing client lists, campaign strategy, performance data, creative concepts, and confidential business information.",
    statCards: [
      { icon: "users", label: "Agency + counterparty" },
      { icon: "database", label: "Client list protection" },
      { icon: "target", label: "Campaign strategy" },
      { icon: "money", label: "Disclosure duration" },
    ],
    fields: [
      { key: "agencyName", label: "Agency Name" },
      { key: "counterpartyName", label: "Counterparty Name" },
      {
        key: "clientListProtection",
        label: "Client List Protection",
        multiline: true,
        rows: 4,
      },
      {
        key: "campaignStrategyConfidentiality",
        label: "Campaign Strategy Confidentiality",
        multiline: true,
        rows: 4,
      },
      { key: "nonDisclosureDuration", label: "Duration of Non-Disclosure" },
      { key: "startDate", label: "Start Date", type: "date" },
      {
        key: "purpose",
        label: "Purpose of Disclosure",
        multiline: true,
        rows: 4,
      },
    ],
    defaultValues: {
      agencyName: "Northstar Marketing Agency",
      counterpartyName: "Acme Growth LLC",
      clientListProtection:
        "Client lists, prospect lists, account contacts, audience segments, CRM exports, media buyer notes, and customer relationship information may not be copied, exported, solicited, or used outside the permitted evaluation or campaign purpose.",
      campaignStrategyConfidentiality:
        "Campaign strategy includes positioning, offers, hooks, funnels, keyword plans, audience targeting, creative concepts, budgets, performance benchmarks, testing plans, reporting dashboards, and optimization methods.",
      nonDisclosureDuration: "3 years after the last disclosure",
      startDate: new Date().toISOString().slice(0, 10),
      purpose:
        "The parties may exchange confidential information to evaluate, plan, price, deliver, or support marketing services and related agency-client opportunities.",
    },
    providerNameKey: "agencyName",
    clientNameKey: "counterpartyName",
    contractTitle: "Marketing Agency Mutual NDA",
    planName: "Mutual confidentiality",
    createContract: (values) => ({
      template: "nda",
      contractTitle: "Marketing Agency Mutual NDA",
      providerName: values.agencyName,
      providerAddress: "Agency address to be inserted",
      customerName: values.counterpartyName,
      customerAddress: "Counterparty address to be inserted",
      serviceName: values.purpose,
      planName: "Mutual confidentiality",
      feeAmount: "No fee",
      billingCycle: "not applicable",
      effectiveDate: values.startDate,
      termMonths: 36,
      renewalTerm: "not applicable",
      paymentDueDays: 0,
      terminationNoticeDays: 0,
      governingLaw: "Delaware",
      dataRegion: "United States",
      supportResponse: "not applicable",
      liabilityCap: "direct damages caused by breach of confidentiality obligations",
      specialTerms: values.clientListProtection,
    }),
    buildSections: (contract, values) => [
      {
        heading: "Parties",
        body: `This Marketing Agency Mutual NDA is entered into by ${values.agencyName} ("Agency") and ${values.counterpartyName} ("Counterparty") as of ${formatDate(values.startDate)}.`,
      },
      {
        heading: "Purpose",
        body: values.purpose,
      },
      {
        heading: "Confidential Information",
        body: "Confidential information includes non-public business, marketing, technical, financial, customer, prospect, campaign, pricing, operational, and strategic information disclosed by either party before or after the effective date.",
      },
      {
        heading: "Client List Protection",
        body: values.clientListProtection,
      },
      {
        heading: "Campaign Strategy Confidentiality",
        body: values.campaignStrategyConfidentiality,
      },
      {
        heading: "Use and Disclosure Restrictions",
        body: "The receiving party may use confidential information only for the stated purpose and may disclose it only to personnel, contractors, advisors, or representatives who need to know it and are bound by confidentiality obligations at least as protective as this agreement.",
      },
      {
        heading: "Duration of Non-Disclosure",
        body: `The non-disclosure obligations continue for ${values.nonDisclosureDuration}. Trade secrets remain protected for as long as they qualify as trade secrets under applicable law.`,
      },
      {
        heading: "Exclusions",
        body: "Confidential information does not include information that is publicly available without breach, already known without restriction, independently developed without use of confidential information, or rightfully received from a third party without confidentiality obligations.",
      },
      {
        heading: "Return or Destruction",
        body: "Upon written request, the receiving party will return or destroy confidential information, except archival copies maintained under ordinary backup, legal, compliance, or recordkeeping systems.",
      },
      {
        heading: "No License or Obligation",
        body: "No party receives ownership, license, or other rights in the other party's confidential information except the limited right to use it for the stated purpose. This agreement does not require either party to proceed with any transaction or services engagement.",
      },
      {
        heading: "Remedies",
        body: "Unauthorized use or disclosure of confidential information may cause irreparable harm. The disclosing party may seek injunctive relief in addition to other available remedies.",
      },
      {
        heading: "General Terms",
        body: `This agreement is governed by the laws of ${contract.governingLaw}. Changes must be in writing and accepted by both parties. This template should be reviewed by counsel before production use.`,
      },
    ],
    seo: {
      coversHeading: "What This Marketing Agency Mutual NDA Covers",
      coversIntro:
        "This marketing agency mutual NDA template is built for agencies and counterparties that need to share client lists, campaign strategy, performance data, creative concepts, prospect data, and other sensitive marketing information.",
      cards: [
        {
          title: "Client List Protection",
          body: "Protects client lists, prospect lists, CRM exports, audience segments, account contacts, and customer relationship information.",
        },
        {
          title: "Campaign Strategy Confidentiality",
          body: "Covers marketing strategy, offers, hooks, funnels, keyword plans, targeting, creatives, budgets, tests, and performance benchmarks.",
        },
        {
          title: "Duration of Non-Disclosure",
          body: "Defines how long confidentiality obligations last after information is shared.",
        },
        {
          title: "Mutual Protection",
          body: "Applies confidentiality obligations to both parties, which is useful when both sides exchange sensitive business information.",
        },
      ],
      whenHeading: "When To Use This Template",
      whenBody:
        "Use this template before sharing agency playbooks, pitch strategy, client lists, prospect data, campaign plans, analytics, account access, or confidential performance information with a client, partner, contractor, or acquisition prospect.",
      faqs: [
        {
          question: "What is a marketing agency mutual NDA?",
          answer:
            "It is a confidentiality agreement where both parties agree to protect sensitive marketing, client, campaign, business, and prospect information shared for a defined purpose.",
        },
        {
          question: "Why include client list protection?",
          answer:
            "Client lists and prospect data can be among an agency's most valuable assets. A specific clause makes the restriction clearer than a generic confidentiality paragraph.",
        },
        {
          question: "How long should non-disclosure last?",
          answer:
            "The right duration depends on the information and law that applies. This template lets you set the duration directly and keeps trade secrets protected while they remain trade secrets.",
        },
      ],
    },
  },
};

const additionalSeoTemplateConfigs = Object.fromEntries(
  additionalTemplateDefinitions.map((definition) => [
    definition.path,
    createAdditionalSeoTemplateConfig(definition),
  ]),
) as Record<string, SeoTemplateConfig>;

const seoTemplateConfigs: Record<string, SeoTemplateConfig> = {
  ...baseSeoTemplateConfigs,
  ...additionalSeoTemplateConfigs,
};

const seoTemplateList = Object.values(seoTemplateConfigs);

function getTemplateTags(config: SeoTemplateConfig) {
  const ignoredKeys = new Set([
    config.providerNameKey,
    config.clientNameKey,
    "startDate",
    "effectiveDate",
    "expirationDate",
  ]);

  return config.fields
    .filter(
      (field) =>
        !ignoredKeys.has(field.key) &&
        !field.key.toLowerCase().endsWith("name") &&
        !field.key.toLowerCase().includes("date"),
    )
    .slice(0, 4)
    .map((field) => field.label);
}

function getRelatedTemplates(config: SeoTemplateConfig) {
  return seoTemplateList
    .filter((template) => template.path !== config.path)
    .slice(0, 4);
}

function absoluteUrl(origin: string, pagePath: string) {
  return pagePath === "/" ? origin : `${origin}${pagePath}`;
}

function createTemplateStructuredData(
  config: SeoTemplateConfig,
  relatedTemplates: SeoTemplateConfig[],
  origin: string,
) {
  const siteUrl = origin.replace(/\/$/, "");
  const pageUrl = absoluteUrl(siteUrl, config.path);
  const organizationId = `${siteUrl}/#organization`;
  const websiteId = `${siteUrl}/#website`;
  const webpageId = `${pageUrl}#webpage`;
  const templateId = `${pageUrl}#template`;
  const breadcrumbId = `${pageUrl}#breadcrumb`;
  const faqId = `${pageUrl}#faq`;
  const relatedListId = `${pageUrl}#related-templates`;

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": organizationId,
        name: "Term Craft",
        url: siteUrl,
      },
      {
        "@type": "WebSite",
        "@id": websiteId,
        name: "Term Craft",
        url: siteUrl,
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
            item: siteUrl,
          },
          {
            "@type": "ListItem",
            position: 2,
            name: "Template Hub",
            item: absoluteUrl(siteUrl, "/templates"),
          },
          {
            "@type": "ListItem",
            position: 3,
            name: config.h1.replace(" Template", ""),
            item: pageUrl,
          },
        ],
      },
      {
        "@type": "WebPage",
        "@id": webpageId,
        url: pageUrl,
        name: config.h1,
        headline: config.h1,
        description: config.metaDescription,
        isPartOf: { "@id": websiteId },
        publisher: { "@id": organizationId },
        breadcrumb: { "@id": breadcrumbId },
        mainEntity: { "@id": templateId },
        hasPart: [{ "@id": faqId }, { "@id": relatedListId }],
        relatedLink: relatedTemplates.map((template) =>
          absoluteUrl(siteUrl, template.path),
        ),
      },
      {
        "@type": "DigitalDocument",
        "@id": templateId,
        name: config.contractTitle,
        headline: config.h1,
        description: config.intro,
        url: pageUrl,
        inLanguage: "en-US",
        encodingFormat: "application/pdf",
        isAccessibleForFree: true,
        creator: { "@id": organizationId },
        provider: { "@id": organizationId },
        about: config.seo.cards.map((card) => ({
          "@type": "Thing",
          name: card.title,
          description: card.body,
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
        name: `${config.contractTitle} FAQ`,
        mainEntity: config.seo.faqs.map((faq) => ({
          "@type": "Question",
          name: faq.question,
          acceptedAnswer: {
            "@type": "Answer",
            text: faq.answer,
          },
        })),
      },
      {
        "@type": "ItemList",
        "@id": relatedListId,
        name: "Related Contract Templates",
        itemListElement: relatedTemplates.map((template, index) => ({
          "@type": "ListItem",
          position: index + 1,
          name: template.h1.replace(" Template", ""),
          url: absoluteUrl(siteUrl, template.path),
        })),
      },
    ],
  };
}

function createDirectoryStructuredData(origin: string) {
  const siteUrl = origin.replace(/\/$/, "");
  const pageUrl = absoluteUrl(siteUrl, "/templates");
  const organizationId = `${siteUrl}/#organization`;
  const websiteId = `${siteUrl}/#website`;
  const itemListId = `${pageUrl}#template-list`;

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": organizationId,
        name: "Term Craft",
        url: siteUrl,
      },
      {
        "@type": "WebSite",
        "@id": websiteId,
        name: "Term Craft",
        url: siteUrl,
        publisher: { "@id": organizationId },
      },
      {
        "@type": "CollectionPage",
        "@id": `${pageUrl}#webpage`,
        url: pageUrl,
        name: "Free B2B Contract Template Directory Hub",
        headline: "Free B2B Contract Template Directory Hub",
        description:
          "Browse free B2B contract templates with dynamic form fields, instant PDFs, internal links, and structured data.",
        isPartOf: { "@id": websiteId },
        publisher: { "@id": organizationId },
        mainEntity: { "@id": itemListId },
      },
      {
        "@type": "ItemList",
        "@id": itemListId,
        name: "Term Craft Contract Templates",
        numberOfItems: seoTemplateList.length,
        itemListElement: seoTemplateList.map((template, index) => ({
          "@type": "ListItem",
          position: index + 1,
          name: template.h1.replace(" Template", ""),
          url: absoluteUrl(siteUrl, template.path),
        })),
      },
    ],
  };
}

function TemplateBreadcrumbs({ config }: { config: SeoTemplateConfig }) {
  return (
    <nav className="breadcrumbs" aria-label="Breadcrumb">
      <a href="/">Home</a>
      <ArrowRight size={13} />
      <a href="/templates">Template Hub</a>
      <ArrowRight size={13} />
      <span>{config.h1.replace(" Template", "")}</span>
    </nav>
  );
}

function PublicHeader() {
  const currentPath = typeof window !== "undefined" ? window.location.pathname : "/";

  return (
    <header className="topbar template-topbar no-print">
      <a className="brand brand-link" href="/" aria-label="Term Craft home">
        <div className="brand-mark" aria-hidden="true">
          <FileCheck2 size={22} />
        </div>
        <div>
          <strong>Term Craft</strong>
          <span>B2B Workflow & Compliance Engine</span>
        </div>
      </a>

      <nav className="public-nav" aria-label="Primary navigation">
        <a className={currentPath === "/" ? "active" : ""} href="/">Home</a>
        <a className={currentPath.startsWith("/templates") ? "active" : ""} href="/templates">Template Hub</a>
        <a className={currentPath === "/builder" ? "active" : ""} href="/builder">Contract Studio</a>
        <a className={currentPath === "/privacy" ? "active" : ""} href="/privacy">Privacy</a>
        <a className="button primary" href="/builder">
          <Wand2 size={16} />
          <span>New Contract</span>
        </a>
      </nav>
    </header>
  );
}

function PublicFooter() {
  return (
    <footer className="public-footer no-print">
      <div className="public-footer-inner">
        <div>
          <a className="footer-brand" href="/">
            <FileCheck2 size={18} />
            <span>Term Craft</span>
          </a>
          <p>
            Free B2B contract templates with instant PDF downloads and signing
            workflow capture.
          </p>
        </div>

        <nav aria-label="Template footer links">
          <strong>Contract templates</strong>
          {seoTemplateList.map((template) => (
            <a key={template.path} href={template.path}>
              {template.h1.replace(" Template", "")}
            </a>
          ))}
        </nav>

        <nav aria-label="Product footer links">
          <strong>Term Craft</strong>
          <a href="/templates">Template directory</a>
          <a href="/builder">Contract Studio</a>
          <a href="/privacy">Privacy Policy</a>
        </nav>
      </div>
    </footer>
  );
}

function HomePage() {
  const featuredTemplates = seoTemplateList.slice(0, 3);
  const [searchFilter, setSearchFilter] = useState("");

  usePageMetadata({
    canonicalPath: "/",
    title: "Free B2B Contract Templates & Compliance Workflow | Term Craft",
    description:
      "Generate clean, unwatermarked contract PDFs from free templates for marketing agencies, SEO retainers, lead generation, subcontractors, NDAs, and web development.",
  });

  const filteredFeatured = seoTemplateList.filter((t) => {
    if (!searchFilter.trim()) return true;
    const q = searchFilter.toLowerCase();
    return t.h1.toLowerCase().includes(q) || t.intro.toLowerCase().includes(q);
  });

  return (
    <div className="public-page">
      <PublicHeader />

      <main>
        <section className="home-hero">
          <div className="home-hero-inner">
            <div className="hero-copy">
              <div className="template-kicker">✨ Programmatic SEO Native B2B Engine</div>
              <h1>Generate Clean B2B Contracts & Compliance Workflows</h1>
              <p>
                Select a niche B2B agreement, customize core dynamic clauses (GDPR, SOC2, SLA credits, Auto-renewal shields), preview in real-time, and download unwatermarked PDFs.
              </p>
              <div className="hero-actions">
                <a className="button primary" href="/templates">
                  <FileText size={18} />
                  <span>Browse All Templates</span>
                </a>
                <a className="button secondary" href="/builder">
                  <PenLine size={18} />
                  <span>Open Contract Studio</span>
                </a>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginTop: '16px', color: 'var(--muted)', fontSize: '13px', fontWeight: 600 }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}><ShieldCheck size={16} color="var(--teal)" /> 100% Free Unwatermarked PDF</span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}><CheckCircle2 size={16} color="var(--teal)" /> Audit Trail Logging</span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}><UserCheck size={16} color="var(--teal)" /> E-Signature Verification</span>
              </div>
            </div>

            <div className="hero-document" aria-hidden="true">
              <div className="mini-document">
                <div className="mini-document-meta">B2B Compliance | Clean PDF</div>
                <h2>Marketing Agency Mutual NDA</h2>
                <p>
                  Client list protection, campaign strategy confidentiality, SLA compliance, and duration of non-disclosure.
                </p>
                <div className="mini-lines">
                  <span />
                  <span />
                  <span />
                  <span />
                </div>
                <div className="mini-signatures">
                  <span />
                  <span />
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="home-section">
          <div className="home-section-header">
            <div>
              <h2>Featured B2B Templates</h2>
              <p>
                Engineered for programmatic SEO acquisition, instant form generation, and compliance legal drafting.
              </p>
            </div>
            <a className="text-link" href="/templates">
              View all templates
              <ArrowRight size={16} />
            </a>
          </div>

          <div style={{ marginBottom: '20px', maxWidth: '440px', position: 'relative' }}>
            <Search size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }} />
            <input
              type="text"
              placeholder="Search templates (e.g. SEO, SLA, Retainer, NDA)..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              style={{ paddingLeft: '40px' }}
            />
          </div>

          <div className="template-link-grid">
            {filteredFeatured.slice(0, 6).map((template) => (
              <TemplateLinkCard key={template.path} template={template} />
            ))}
          </div>
        </section>

        <section className="home-band">
          <div>
            <h2>Programmatic SEO & Organic Growth Engine</h2>
            <p>
              Every document landing page features clean HTML pre-rendering, targeted metadata, structured schema, internal link graphs, and one-click PDF generation.
            </p>
          </div>
          <a className="button primary" href="/templates">
            <Search size={18} />
            <span>Explore Directory</span>
          </a>
        </section>
      </main>
      <PublicFooter />
    </div>
  );
}

function TemplatesDirectoryPage() {
  const [activeCategory, setActiveCategory] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const structuredData = useMemo(() => {
    if (typeof window === "undefined") {
      return null;
    }

    return createDirectoryStructuredData(window.location.origin);
  }, []);

  usePageMetadata({
    canonicalPath: "/templates",
    title: "Contract Template Directory Hub | Term Craft",
    description:
      "Browse the central Term Craft template hub with free B2B contract templates, dynamic form fields, instant PDFs, internal links, and schema-ready SEO pages.",
  });
  useJsonLd(structuredData);

  const filteredTemplates = seoTemplateList.filter((t) => {
    const q = searchTerm.toLowerCase();
    const matchesSearch =
      !searchTerm.trim() ||
      t.h1.toLowerCase().includes(q) ||
      t.intro.toLowerCase().includes(q) ||
      t.title.toLowerCase().includes(q) ||
      getTemplateTags(t).some((tag) => tag.toLowerCase().includes(q));
    const selectedCategory = templateHubCategories.find(
      (category) => category.key === activeCategory,
    );
    const matchesCategory =
      activeCategory === "all" || !selectedCategory || selectedCategory.match(t);

    return matchesSearch && matchesCategory;
  });
  const featuredTemplates = getHighIntentTemplates();

  return (
    <div className="public-page">
      <PublicHeader />

      <main className="templates-directory">
        <section className="directory-hub-hero">
          <div className="directory-header">
            <div className="template-kicker">Central template hub</div>
            <h1>Free B2B Contract Template Directory Hub</h1>
            <p>
              Browse every Term Craft template from one SEO hub. Each page
              includes focused dynamic fields, instant unwatermarked PDF
              generation, internal links, and structured data.
            </p>
          </div>

          <div className="directory-hub-panel">
            <div className="directory-search">
              <Search size={18} />
              <input
                type="text"
                placeholder="Search by use case, e.g. UGC, Shopify, PPC, NDA..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="directory-stats" aria-label="Template directory stats">
              <div>
                <strong>{seoTemplateList.length}</strong>
                <span>Templates</span>
              </div>
              <div>
                <strong>{templateHubCategories.length}</strong>
                <span>Categories</span>
              </div>
              <div>
                <strong>PDF</strong>
                <span>No watermark</span>
              </div>
            </div>
          </div>
        </section>

        <section className="directory-category-grid" aria-label="Template categories">
          <button
            className={activeCategory === "all" ? "active" : ""}
            type="button"
            onClick={() => setActiveCategory("all")}
          >
            <strong>All Templates</strong>
            <span>{seoTemplateList.length} documents across the full library.</span>
          </button>
          {templateHubCategories.map((category) => (
            <button
              className={activeCategory === category.key ? "active" : ""}
              key={category.key}
              type="button"
              onClick={() => setActiveCategory(category.key)}
            >
              <strong>{category.label}</strong>
              <span>
                {getCategoryTemplates(category).length} templates.{" "}
                {category.description}
              </span>
            </button>
          ))}
        </section>

        <section className="directory-featured" aria-labelledby="high-intent-title">
          <div className="home-section-header">
            <div>
              <h2 id="high-intent-title">High-Intent Template Pages</h2>
              <p>
                Start with the templates most likely to match commercial search
                intent and bottom-funnel contract needs.
              </p>
            </div>
          </div>
          <div className="template-link-grid">
            {featuredTemplates.map((template) => (
              <TemplateLinkCard key={template.path} template={template} />
            ))}
          </div>
        </section>

        <section className="directory-results-header" aria-live="polite">
          <div>
            <h2>All Contract Templates</h2>
            <p>
              Showing {filteredTemplates.length} of {seoTemplateList.length} templates.
            </p>
          </div>
          {(searchTerm || activeCategory !== "all") ? (
            <button
              className="button secondary"
              type="button"
              onClick={() => {
                setActiveCategory("all");
                setSearchTerm("");
              }}
            >
              Clear filters
            </button>
          ) : null}
        </section>

        <section className="template-link-grid directory-grid" aria-label="Contract templates">
          {filteredTemplates.length > 0 ? (
            filteredTemplates.map((template) => (
              <TemplateLinkCard key={template.path} template={template} />
            ))
          ) : (
            <div className="empty-state" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '32px' }}>
              <p>No contract templates match "{searchTerm}".</p>
              <button
                className="button secondary"
                onClick={() => {
                  setActiveCategory("all");
                  setSearchTerm("");
                }}
                style={{ marginTop: '12px' }}
              >
                Clear filters
              </button>
            </div>
          )}
        </section>

        <section className="directory-seo-copy">
          <h2>Programmatic Compliance Architecture</h2>
          <p>
            Each template is built around specific search intent queries and only
            asks for the fields needed to generate a useful legal first draft. The
            pages are designed for fast scanning, internal linking, and direct
            PDF generation.
          </p>
        </section>
      </main>
      <PublicFooter />
    </div>
  );
}

function TemplateLinkCard({ template }: { template: SeoTemplateConfig }) {
  const tags = getTemplateTags(template);

  return (
    <article className="template-link-card">
      <div className="template-link-icon" aria-hidden="true">
        <FileText size={22} />
      </div>
      <h3>{template.h1.replace(" Template", "")}</h3>
      <p>{template.intro}</p>
      <div className="template-tag-list">
        {tags.map((tag) => (
          <span key={tag}>{tag}</span>
        ))}
      </div>
      <a className="template-card-link" href={template.path}>
        Open template
        <ArrowRight size={16} />
      </a>
    </article>
  );
}

type TemplateHubCategory = {
  description: string;
  key: string;
  label: string;
  match: (template: SeoTemplateConfig) => boolean;
};

const templateHubCategories: TemplateHubCategory[] = [
  {
    key: "marketing",
    label: "Marketing & Agencies",
    description: "Retainers, PPC, SEO, social, affiliate, and lead generation agreements.",
    match: (template) =>
      /lead|seo|marketing|social|ppc|affiliate|copywriting/i.test(
        `${template.path} ${template.title}`,
      ),
  },
  {
    key: "creative",
    label: "Creative & Media",
    description: "UGC, video, design, photography, creator, and production contracts.",
    match: (template) =>
      /ugc|creator|video|graphic|photography|copywriting/i.test(
        `${template.path} ${template.title}`,
      ),
  },
  {
    key: "web-saas",
    label: "Web, SaaS & Software",
    description: "SaaS SLAs, software SOWs, Shopify, Webflow, and web development projects.",
    match: (template) =>
      /saas|software|shopify|webflow|web-development|ecommerce/i.test(
        `${template.path} ${template.title}`,
      ),
  },
  {
    key: "contractors",
    label: "Contractors & Services",
    description: "Independent contractor, subcontractor, virtual assistant, and service agreements.",
    match: (template) =>
      /contractor|subcontractor|assistant|services|consultant/i.test(
        `${template.path} ${template.title}`,
      ),
  },
  {
    key: "property",
    label: "Property & Construction",
    description: "Commercial lease, lien waiver, HVAC, construction, and trade documents.",
    match: (template) =>
      /lease|lien|construction|hvac/i.test(`${template.path} ${template.title}`),
  },
  {
    key: "confidentiality",
    label: "NDA & Advisory",
    description: "Mutual NDA, one-way NDA, advisory, referral, and sensitive business terms.",
    match: (template) =>
      /nda|advisory|referral|confidential|affiliate/i.test(
        `${template.path} ${template.title}`,
      ),
  },
];

function getCategoryTemplates(category: TemplateHubCategory) {
  return seoTemplateList.filter((template) => category.match(template));
}

function getHighIntentTemplates() {
  const priorityPaths = [
    "/templates/b2b-lead-generation-retainer-agreement",
    "/templates/ugc-creator-agreement",
    "/templates/social-media-management-contract",
    "/templates/ppc-management-agreement",
    "/templates/saas-service-level-agreement",
    "/templates/shopify-store-setup-agreement",
  ];

  return priorityPaths
    .map((path) => seoTemplateConfigs[path])
    .filter(Boolean);
}

function PrivacyPage() {
  usePageMetadata({
    canonicalPath: "/privacy",
    title: "Privacy Policy | Term Craft",
    description:
      "Privacy policy for Term Craft contract templates, PDF downloads, and lead capture forms.",
  });

  return (
    <div className="public-page">
      <PublicHeader />
      <main className="legal-page">
        <div className="template-kicker">Privacy</div>
        <h1>Privacy Policy</h1>
        <p>
          Term Craft collects only the information needed to provide free
          contract templates, PDF downloads, and optional follow-up for editable
          or signable versions.
        </p>

        <section>
          <h2>Information We Collect</h2>
          <p>
            If you submit the post-download form, we collect your email address,
            the template you downloaded, the page path, timestamp, referrer, and
            UTM parameters when present. We also collect first-party analytics
            events such as page views and template PDF downloads. We do not
            submit the filled contract terms to the lead capture API.
          </p>
        </section>

        <section>
          <h2>How We Use Information</h2>
          <p>
            We use captured emails to follow up about editable or signable
            versions of downloaded templates, understand which template pages are
            working, measure download intent, and improve the product.
          </p>
        </section>

        <section>
          <h2>Local Drafts</h2>
          <p>
            Some draft and signature data may be stored in your browser local
            storage so the app can preserve your work on the same device.
          </p>
        </section>

        <section>
          <h2>Contact</h2>
          <p>
            Replace this section with your business contact email before public
            launch.
          </p>
        </section>
      </main>
      <PublicFooter />
    </div>
  );
}

function AdminLeadsPage() {
  const [leads, setLeads] = useState<LeadApiRecord[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null);
  const [adminKey, setAdminKey] = useState(() => {
    try {
      return sessionStorage.getItem("termcraft.admin-key") ?? "";
    } catch {
      return "";
    }
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  usePageMetadata({
    canonicalPath: "/admin/leads",
    title: "Lead Dashboard | Term Craft",
    description: "Internal lead dashboard for Term Craft.",
  });
  useRobotsMeta("noindex,nofollow");

  function adminHeaders() {
    return adminKey ? { "x-admin-key": adminKey } : undefined;
  }

  async function loadDashboard() {
    setIsLoading(true);
    setError("");

    try {
      const headers = adminHeaders();
      const [leadsResponse, analyticsResponse] = await Promise.all([
        fetch("/api/leads", { headers }),
        fetch("/api/analytics", { headers }),
      ]);

      if (leadsResponse.status === 401 || analyticsResponse.status === 401) {
        setError("Enter the admin API key to view private lead data.");
        setLeads([]);
        setAnalytics(null);
        return;
      }

      if (!leadsResponse.ok || !analyticsResponse.ok) {
        throw new Error("Could not load dashboard data.");
      }

      const data = (await leadsResponse.json()) as { leads: LeadApiRecord[] };
      const analyticsData = (await analyticsResponse.json()) as AnalyticsSummary;
      setLeads(Array.isArray(data.leads) ? data.leads : []);
      setAnalytics(analyticsData);
    } catch {
      setError("Lead API is unavailable. Run the app with npm run dev or npm start.");
    } finally {
      setIsLoading(false);
    }
  }

  async function exportCsv() {
    try {
      const response = await fetch("/api/leads.csv", { headers: adminHeaders() });
      if (response.status === 401) {
        setError("Enter the admin API key before exporting leads.");
        return;
      }

      if (!response.ok) {
        throw new Error("CSV export failed.");
      }

      const csv = await response.text();
      downloadBlob("term-craft-leads.csv", "text/csv;charset=utf-8", csv);
    } catch {
      setError("Could not export leads.");
    }
  }

  useEffect(() => {
    void loadDashboard();
  }, []);

  return (
    <div className="public-page">
      <PublicHeader />

      <main className="admin-page">
        <section className="admin-header">
          <div>
            <div className="template-kicker">Admin</div>
            <h1>Lead Dashboard</h1>
            <p>
              Captured emails from the post-download modal, grouped with the
              template and attribution details.
            </p>
          </div>
          <div className="admin-actions">
            <button
              className="button secondary"
              type="button"
              onClick={loadDashboard}
            >
              <RotateCcw size={17} />
              <span>Refresh</span>
            </button>
            <button className="button primary" type="button" onClick={exportCsv}>
              <Download size={17} />
              <span>Export CSV</span>
            </button>
          </div>
        </section>

        <form
          className="admin-key-form"
          onSubmit={(event) => {
            event.preventDefault();
            try {
              sessionStorage.setItem("termcraft.admin-key", adminKey);
            } catch {
              // Session storage can be unavailable in strict browser modes.
            }
            void loadDashboard();
          }}
        >
          <Field label="Admin API key">
            <input
              type="password"
              placeholder="Only required if ADMIN_API_KEY is set"
              value={adminKey}
              onChange={(event) => setAdminKey(event.target.value)}
            />
          </Field>
          <button className="button secondary" type="submit">
            <ShieldCheck size={17} />
            <span>Apply key</span>
          </button>
        </form>

        <section className="admin-metrics">
          <Metric label="Total leads" value={`${leads.length}`} />
          <Metric
            label="Latest"
            value={leads[0]?.submittedAt ? formatTimestamp(leads[0].submittedAt) : "None"}
          />
          <Metric
            label="Templates"
            value={`${new Set(leads.map((lead) => lead.templatePath)).size}`}
          />
          <Metric
            label="Page views"
            value={`${analytics?.totalPageViews ?? 0}`}
          />
          <Metric
            label="PDF downloads"
            value={`${analytics?.totalDownloads ?? 0}`}
          />
          <Metric
            label="Storage"
            value={analytics?.storage.durable ? "Supabase" : "Local JSON"}
          />
        </section>

        {error ? <div className="admin-alert">{error}</div> : null}

        {analytics ? (
          <section className="admin-analytics-grid">
            <AnalyticsPanel title="Top Pages" rows={analytics.topPaths} />
            <AnalyticsPanel title="Top Templates" rows={analytics.topTemplates} />
            <div className="admin-analytics-panel">
              <h2>Recent Events</h2>
              {analytics.recentEvents.length === 0 ? (
                <p>No events captured yet.</p>
              ) : (
                <ul>
                  {analytics.recentEvents.slice(0, 8).map((event) => (
                    <li key={event.id}>
                      <strong>{event.eventName.replace(/_/g, " ")}</strong>
                      <span>{event.path || event.templateTitle || "Unknown"}</span>
                      <small>{formatTimestamp(event.occurredAt)}</small>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        ) : null}

        <section className="leads-table-wrap">
          {isLoading ? (
            <div className="empty-state">Loading leads...</div>
          ) : leads.length === 0 ? (
            <div className="empty-state">
              No leads captured yet. Download a template PDF, submit the modal
              email field, then refresh.
            </div>
          ) : (
            <table className="leads-table">
              <thead>
                <tr>
                  <th>Email</th>
                  <th>Template</th>
                  <th>Submitted</th>
                  <th>UTM</th>
                  <th>Referrer</th>
                </tr>
              </thead>
              <tbody>
                {leads.map((lead) => (
                  <tr key={lead.id}>
                    <td>{lead.email}</td>
                    <td>
                      <strong>{lead.templateTitle}</strong>
                      <span>{lead.templatePath}</span>
                    </td>
                    <td>{formatTimestamp(lead.submittedAt)}</td>
                    <td>
                      {[lead.utmSource, lead.utmMedium, lead.utmCampaign]
                        .filter(Boolean)
                        .join(" / ") || "Direct"}
                    </td>
                    <td>{lead.referrer || "None"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </main>
    </div>
  );
}

function AnalyticsPanel({
  rows,
  title,
}: {
  rows: Array<{ label: string; count: number }>;
  title: string;
}) {
  return (
    <div className="admin-analytics-panel">
      <h2>{title}</h2>
      {rows.length === 0 ? (
        <p>No data captured yet.</p>
      ) : (
        <ul>
          {rows.map((row) => (
            <li key={row.label}>
              <strong>{row.label}</strong>
              <span>{row.count}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function SeoTemplatePage({ config }: { config: SeoTemplateConfig }) {
  const [values, setValues] = useState<Record<string, string>>(
    config.defaultValues,
  );
  const [postDownloadOpen, setPostDownloadOpen] = useState(false);
  const [downloadContext, setDownloadContext] = useState<{
    downloadedAt: string;
    id: string;
  } | null>(null);
  const contract = useMemo(() => config.createContract(values), [config, values]);
  const sections = useMemo(
    () => config.buildSections(contract, values),
    [config, contract, values],
  );
  const signers = useMemo(
    () => createTemplateSignerList(config, values),
    [config, values],
  );
  const auditEvents = useMemo(
    () => [
      createAuditEvent(
        "Template generator",
        "Preview generated",
        `${config.contractTitle} template rendered.`,
      ),
    ],
    [config.contractTitle],
  );
  const relatedTemplates = useMemo(() => getRelatedTemplates(config), [config]);
  const structuredData = useMemo(() => {
    if (typeof window === "undefined") {
      return null;
    }

    return createTemplateStructuredData(
      config,
      relatedTemplates,
      window.location.origin,
    );
  }, [config, relatedTemplates]);

  usePageMetadata({
    canonicalPath: config.path,
    title: config.title,
    description: config.metaDescription,
  });
  useJsonLd(structuredData);

  function updateValue(key: string, value: string) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  async function downloadTemplatePdf() {
    await downloadContractPdf(contract, sections, signers, "Draft");
    const downloadedAt = new Date().toISOString();
    const leadRecord: TemplateDownloadLead = {
      id: createId(),
      templatePath: config.path,
      templateTitle: config.contractTitle,
      downloadedAt,
    };
    saveTemplateDownloadLead(leadRecord);
    sendAnalyticsEvent("template_pdf_downloaded", {
      metadata: { downloadedAt },
      templatePath: config.path,
      templateTitle: config.contractTitle,
    });
    setDownloadContext({ downloadedAt, id: leadRecord.id });
    setPostDownloadOpen(true);
  }

  return (
    <div className="seo-template-page">
      <PublicHeader />

      <main className="template-page-shell">
        <section className="template-workbench" aria-labelledby="template-title">
          <div className="template-form-panel">
            <div className="template-kicker">Free PDF template</div>
            <TemplateBreadcrumbs config={config} />
            <h1 id="template-title">{config.h1}</h1>
            <p>{config.intro}</p>

            <div className="template-stat-grid" aria-label="Template details">
              {config.statCards.map((stat) => {
                const Icon = templateIconMap[stat.icon];

                return (
                  <div key={stat.label}>
                    <Icon size={18} />
                    <span>{stat.label}</span>
                  </div>
                );
              })}
            </div>

            <div className="template-fields">
              {config.fields.map((field) => (
                <Field key={field.key} label={field.label}>
                  {field.multiline ? (
                    <textarea
                      rows={field.rows ?? 4}
                      value={values[field.key] ?? ""}
                      onChange={(event) =>
                        updateValue(field.key, event.target.value)
                      }
                    />
                  ) : (
                    <input
                      type={field.type ?? "text"}
                      value={values[field.key] ?? ""}
                      onChange={(event) =>
                        updateValue(field.key, event.target.value)
                      }
                    />
                  )}
                </Field>
              ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <button
                className="button primary template-download"
                type="button"
                onClick={downloadTemplatePdf}
              >
                <Download size={18} />
                <span>Download PDF</span>
              </button>
              <a
                className="button secondary template-download"
                href="/builder"
                style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <Wand2 size={18} />
                <span>Open Studio</span>
              </a>
            </div>
          </div>

          <div className="template-preview-panel">
            <ContractDocument
              auditEvents={auditEvents}
              contract={contract}
              sections={sections}
              showAudit={false}
              signers={signers}
              status="Draft"
            />
          </div>
        </section>

        <section className="seo-content-section">
          <div className="seo-content-inner">
            <h2>{config.seo.coversHeading}</h2>
            <p>{config.seo.coversIntro}</p>

            <div className="seo-card-grid">
              {config.seo.cards.map((card) => (
                <article key={card.title}>
                  <h3>{card.title}</h3>
                  <p>{card.body}</p>
                </article>
              ))}
            </div>

            <h2>{config.seo.whenHeading}</h2>
            <p>{config.seo.whenBody}</p>

            <h2>FAQ</h2>
            <div className="faq-list">
              {config.seo.faqs.map((faq) => (
                <article key={faq.question}>
                  <h3>{faq.question}</h3>
                  <p>{faq.answer}</p>
                </article>
              ))}
            </div>

            <section className="related-templates" aria-labelledby="related-templates-title">
              <div className="related-template-header">
                <div>
                  <h2 id="related-templates-title">Related Contract Templates</h2>
                  <p>
                    Keep building the same agreement stack with adjacent agency,
                    marketing, and web service documents.
                  </p>
                </div>
                <a className="text-link" href="/templates">
                  View all templates
                  <ArrowRight size={16} />
                </a>
              </div>

              <div className="template-link-grid related-template-grid">
                {relatedTemplates.map((template) => (
                  <TemplateLinkCard key={template.path} template={template} />
                ))}
              </div>
            </section>
          </div>
        </section>
      </main>
      <PublicFooter />

      <PostDownloadModal
        isOpen={postDownloadOpen}
        templateTitle={config.contractTitle}
        onClose={() => setPostDownloadOpen(false)}
        onSubmitEmail={async (email) => {
          if (downloadContext) {
            updateTemplateDownloadLeadEmail(downloadContext.id, email);
          }

          try {
            const result = await submitLeadCapture({
              downloadedAt:
                downloadContext?.downloadedAt ?? new Date().toISOString(),
              email,
              templatePath: config.path,
              templateTitle: config.contractTitle,
            });
            return result.emailDelivery?.sent ? "emailed" : "saved";
          } catch {
            return "local";
          }
        }}
      />
    </div>
  );
}

function PostDownloadModal({
  isOpen,
  onClose,
  onSubmitEmail,
  templateTitle,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSubmitEmail: (email: string) => Promise<"emailed" | "saved" | "local">;
  templateTitle: string;
}) {
  const [email, setEmail] = useState("");
  const [submitState, setSubmitState] = useState<
    "idle" | "submitting" | "emailed" | "saved" | "local"
  >("idle");

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setSubmitState("idle");
  }, [isOpen, templateTitle]);

  if (!isOpen) {
    return null;
  }

  async function submitEmail(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitState("submitting");
    const result = await onSubmitEmail(email);
    setSubmitState(result);
  }

  return (
    <div
      className="modal-backdrop no-print"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <section
        className="post-download-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="post-download-title"
      >
        <button
          className="modal-close"
          type="button"
          title="Close"
          onClick={onClose}
        >
          <X size={18} />
        </button>

        <div className="modal-icon" aria-hidden="true">
          <FileCheck2 size={24} />
        </div>

        <div className="modal-copy">
          <span>Your PDF is downloading</span>
          <h2 id="post-download-title">Want this signed online?</h2>
          <p>
            Turn your {templateTitle.toLowerCase()} into an editable signing
            workflow with signer details, signature capture, audit trail, and
            export controls.
          </p>
        </div>

        <form className="modal-email-form" onSubmit={submitEmail}>
          <label className="field">
            <span>Send me the editable/signable version</span>
            <input
              type="email"
              placeholder="you@example.com"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </label>
          <button
            className="button secondary full-width"
            disabled={submitState === "submitting"}
            type="submit"
          >
            <Mail size={17} />
            <span>
              {submitState === "submitting"
                ? "Saving..."
                : submitState === "emailed"
                  ? "Email Sent"
                  : submitState === "saved"
                  ? "Request Saved"
                  : submitState === "local"
                    ? "Saved Locally"
                    : "Save Request"}
            </span>
          </button>
        </form>

        {submitState === "emailed" ? (
          <p className="modal-status success">
            Sent. Check your inbox for the editable signing workspace link.
          </p>
        ) : null}
        {submitState === "saved" ? (
          <p className="modal-status success">
            Saved. Email delivery is not configured yet, but this lead is now
            available in the admin dashboard.
          </p>
        ) : null}
        {submitState === "local" ? (
          <p className="modal-status local">
            Saved in this browser. Start the API server to capture leads in the
            dashboard.
          </p>
        ) : null}

        <a className="button primary full-width" href="/builder">
          <PenLine size={17} />
          <span>Create Free Signing Link</span>
        </a>
      </section>
    </div>
  );
}

function B2BLeadGenerationRetainerPage() {
  const [form, setForm] = useState<B2BLeadGenerationForm>(
    createDefaultB2BLeadGenerationForm,
  );
  const contract = useMemo(() => createB2BLeadGenerationContract(form), [form]);
  const sections = useMemo(
    () => buildB2BLeadGenerationSections(contract, form),
    [contract, form],
  );
  const signers = useMemo<Signer[]>(
    () => [
      {
        id: "provider",
        role: "Provider",
        name: form.providerName,
        title: "Authorized Representative",
        email: "provider@example.com",
      },
      {
        id: "customer",
        role: "Customer",
        name: form.clientName,
        title: "Authorized Representative",
        email: "client@example.com",
      },
    ],
    [form.clientName, form.providerName],
  );
  const auditEvents = useMemo(
    () => [
      createAuditEvent(
        "Template generator",
        "Preview generated",
        "B2B lead generation retainer agreement template rendered.",
      ),
    ],
    [],
  );

  usePageMetadata({
    canonicalPath: B2B_LEAD_GEN_PATH,
    title: "B2B Lead Generation Retainer Agreement Template | Free PDF",
    description:
      "Generate a free B2B lead generation retainer agreement PDF with setup fee, booked meeting commission, lead volume, and CRM access clauses.",
  });

  function updateForm<K extends keyof B2BLeadGenerationForm>(
    key: K,
    value: B2BLeadGenerationForm[K],
  ) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function downloadTemplatePdf() {
    await downloadContractPdf(contract, sections, signers, "Draft");
  }

  return (
    <div className="seo-template-page">
      <header className="topbar template-topbar no-print">
        <a className="brand brand-link" href="/" aria-label="Term Craft home">
          <div className="brand-mark" aria-hidden="true">
            <FileCheck2 size={22} />
          </div>
          <div>
            <strong>Term Craft</strong>
            <span>Free contract templates</span>
          </div>
        </a>

        <div className="topbar-actions">
          <a className="button secondary" href="/">
            <ArrowLeft size={17} />
            <span>Builder</span>
          </a>
          <button
            className="button primary"
            type="button"
            onClick={downloadTemplatePdf}
          >
            <Download size={17} />
            <span>Download Free PDF</span>
          </button>
        </div>
      </header>

      <main className="template-page-shell">
        <section className="template-workbench" aria-labelledby="template-title">
          <div className="template-form-panel">
            <div className="template-kicker">Free PDF template</div>
            <h1 id="template-title">
              B2B Lead Generation Retainer Agreement Template
            </h1>
            <p>
              Create a practical retainer agreement for outsourced B2B lead
              generation campaigns, booked meeting commissions, monthly lead
              targets, and CRM access rules.
            </p>

            <div className="template-stat-grid" aria-label="Template details">
              <div>
                <Users size={18} />
                <span>Agency + client</span>
              </div>
              <div>
                <BadgeDollarSign size={18} />
                <span>Retainer terms</span>
              </div>
              <div>
                <Target size={18} />
                <span>Lead targets</span>
              </div>
              <div>
                <Database size={18} />
                <span>CRM access</span>
              </div>
            </div>

            <div className="template-fields">
              <Field label="Client Name">
                <input
                  value={form.clientName}
                  onChange={(event) =>
                    updateForm("clientName", event.target.value)
                  }
                />
              </Field>
              <Field label="Service Provider Name">
                <input
                  value={form.providerName}
                  onChange={(event) =>
                    updateForm("providerName", event.target.value)
                  }
                />
              </Field>
              <div className="form-grid compact">
                <Field label="Setup Fee">
                  <input
                    value={form.setupFee}
                    onChange={(event) =>
                      updateForm("setupFee", event.target.value)
                    }
                  />
                </Field>
                <Field label="Commission Per Booked Meeting">
                  <input
                    value={form.commissionPerBookedMeeting}
                    onChange={(event) =>
                      updateForm(
                        "commissionPerBookedMeeting",
                        event.target.value,
                      )
                    }
                  />
                </Field>
              </div>
              <div className="form-grid compact">
                <Field label="Target Lead Volume">
                  <input
                    value={form.targetLeadVolume}
                    onChange={(event) =>
                      updateForm("targetLeadVolume", event.target.value)
                    }
                  />
                </Field>
                <Field label="Start Date">
                  <input
                    type="date"
                    value={form.startDate}
                    onChange={(event) =>
                      updateForm("startDate", event.target.value)
                    }
                  />
                </Field>
              </div>
              <Field label="Scope of Work">
                <textarea
                  rows={4}
                  value={form.scopeOfWork}
                  onChange={(event) =>
                    updateForm("scopeOfWork", event.target.value)
                  }
                />
              </Field>
              <Field label="CRM Access Clauses">
                <textarea
                  rows={4}
                  value={form.crmAccessClauses}
                  onChange={(event) =>
                    updateForm("crmAccessClauses", event.target.value)
                  }
                />
              </Field>
            </div>

            <button
              className="button primary full-width template-download"
              type="button"
              onClick={downloadTemplatePdf}
            >
              <Download size={18} />
              <span>Download Free PDF</span>
            </button>
          </div>

          <div className="template-preview-panel">
            <ContractDocument
              auditEvents={auditEvents}
              contract={contract}
              sections={sections}
              showAudit={false}
              signers={signers}
              status="Draft"
            />
          </div>
        </section>

        <section className="seo-content-section">
          <div className="seo-content-inner">
            <h2>What This B2B Lead Generation Retainer Agreement Covers</h2>
            <p>
              This B2B lead generation retainer agreement template is built for
              agencies, consultants, outsourced SDR teams, and appointment
              setting providers that charge a setup fee plus a booked meeting
              commission. It turns the commercial terms into a downloadable PDF
              agreement that can be reviewed before sending to a client.
            </p>

            <div className="seo-card-grid">
              <article>
                <h3>Setup Fee</h3>
                <p>
                  Defines the upfront amount for campaign strategy, list setup,
                  messaging, CRM preparation, and launch work.
                </p>
              </article>
              <article>
                <h3>Booked Meeting Commission</h3>
                <p>
                  States how the provider earns a commission when a qualifying
                  prospect books a sales meeting.
                </p>
              </article>
              <article>
                <h3>Target Lead Volume</h3>
                <p>
                  Sets the campaign target while making clear that lead volume is
                  not a guaranteed revenue or close-rate outcome.
                </p>
              </article>
              <article>
                <h3>CRM Access Clauses</h3>
                <p>
                  Covers limited CRM permissions for setup, attribution,
                  reporting, and campaign management.
                </p>
              </article>
            </div>

            <h2>When To Use This Template</h2>
            <p>
              Use this template when a lead generation vendor is running outbound
              campaigns, sourcing prospects, booking sales calls, or managing a
              client pipeline in a CRM. It is especially useful when payment is
              split between a setup fee and performance-based meeting
              commissions.
            </p>

            <h2>FAQ</h2>
            <div className="faq-list">
              <article>
                <h3>What is a B2B lead generation retainer agreement?</h3>
                <p>
                  It is a services agreement between a client and lead generation
                  provider that documents campaign scope, fees, meeting
                  commission rules, targets, CRM access, and termination terms.
                </p>
              </article>
              <article>
                <h3>Can this template guarantee booked meetings?</h3>
                <p>
                  The template defines meeting commission and target lead volume,
                  but it avoids guaranteeing sales outcomes because outbound
                  campaign results depend on market response, offer quality, and
                  client follow-up.
                </p>
              </article>
              <article>
                <h3>Is the PDF watermarked?</h3>
                <p>
                  No. The button downloads a clean, unwatermarked PDF generated
                  from the fields on this page.
                </p>
              </article>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

function ContractBuilderApp() {
  const storedDraft = useMemo(readStoredDraft, []);
  const [contract, setContract] = useState<ContractState>(
    () => storedDraft?.contract ?? createDefaultContract(),
  );
  const [clauses, setClauses] =
    useState<Record<ClauseKey, boolean>>(
      () => storedDraft?.clauses ?? initialClauses,
    );
  const [signers, setSigners] = useState<Signer[]>(
    () => storedDraft?.signers ?? createDefaultSigners(),
  );
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>(
    () => storedDraft?.auditEvents ?? createInitialAudit(),
  );
  const [activeSignerId, setActiveSignerId] =
    useState<Signer["id"]>("provider");
  const [pendingSignature, setPendingSignature] = useState<{
    dataUrl: string;
    method: SignatureMethod;
  } | null>(null);
  const [consentChecked, setConsentChecked] = useState(false);

  const sections = useMemo(
    () => buildContractSections(contract, clauses),
    [contract, clauses],
  );
  const status = getContractStatus(signers);
  const signedCount = signers.filter((signer) => signer.signedAt).length;
  const activeSigner =
    signers.find((signer) => signer.id === activeSignerId) ?? signers[0];

  useEffect(() => {
    const draft: StoredDraft = { contract, clauses, signers, auditEvents };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
  }, [contract, clauses, signers, auditEvents]);

  useEffect(() => {
    setPendingSignature(null);
    setConsentChecked(false);
  }, [activeSignerId]);

  function addAudit(actor: string, action: string, details: string) {
    setAuditEvents((current) => [createAuditEvent(actor, action, details), ...current]);
  }

  function updateContract<K extends keyof ContractState>(
    key: K,
    value: ContractState[K],
  ) {
    setContract((current) => ({ ...current, [key]: value }));
  }

  function updateTemplate(template: TemplateKey) {
    setContract((current) => ({
      ...current,
      template,
      ...templateDefaults[template],
    }));
    addAudit("System", "Template changed", contractTemplates.find((item) => item.key === template)?.name ?? template);
  }

  function updateSigner<K extends keyof Signer>(
    signerId: Signer["id"],
    key: K,
    value: Signer[K],
  ) {
    setSigners((current) =>
      current.map((signer) =>
        signer.id === signerId ? { ...signer, [key]: value } : signer,
      ),
    );
  }

  function saveDraft() {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ contract, clauses, signers, auditEvents }),
    );
    addAudit("System", "Draft saved", `${contract.contractTitle} saved locally.`);
  }

  function resetWorkspace() {
    if (!window.confirm("Reset the current draft and signatures?")) {
      return;
    }

    setContract(createDefaultContract());
    setClauses(initialClauses);
    setSigners(createDefaultSigners());
    setAuditEvents(createInitialAudit());
    setActiveSignerId("provider");
  }

  function signContract() {
    if (!pendingSignature || !consentChecked || !activeSigner) {
      return;
    }

    const signedAt = new Date().toISOString();
    setSigners((current) =>
      current.map((signer) =>
        signer.id === activeSigner.id
          ? {
              ...signer,
              signedAt,
              signatureDataUrl: pendingSignature.dataUrl,
              signatureMethod: pendingSignature.method,
            }
          : signer,
      ),
    );
    addAudit(
      activeSigner.name || activeSigner.role,
      "Signed contract",
      `${activeSigner.role} applied a ${pendingSignature.method} e-signature.`,
    );
    setPendingSignature(null);
    setConsentChecked(false);
  }

  function clearSignature(signerId: Signer["id"]) {
    const signer = signers.find((item) => item.id === signerId);
    setSigners((current) =>
      current.map((item) =>
        item.id === signerId
          ? {
              ...item,
              signedAt: undefined,
              signatureDataUrl: undefined,
              signatureMethod: undefined,
            }
          : item,
      ),
    );
    addAudit(
      "System",
      "Signature cleared",
      `${signer?.role ?? "Signer"} signature removed from draft.`,
    );
  }

  async function copyInviteLink() {
    const inviteUrl = `${window.location.href.split("#")[0]}#signing`;
    try {
      await navigator.clipboard.writeText(inviteUrl);
      addAudit("System", "Signing link copied", inviteUrl);
    } catch {
      addAudit("System", "Signing link prepared", inviteUrl);
    }
  }

  function printContract() {
    addAudit("System", "Print opened", "Browser print dialog requested.");
    window.setTimeout(() => window.print(), 50);
  }

  function downloadHtml() {
    const exportEvent = createAuditEvent(
      "System",
      "HTML exported",
      "Signed contract package downloaded.",
    );
    const nextAuditEvents = [exportEvent, ...auditEvents];
    const html = buildExportHtml(
      contract,
      sections,
      signers,
      nextAuditEvents,
      status,
    );
    downloadBlob(
      `${contract.contractTitle.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.html`,
      "text/html;charset=utf-8",
      html,
    );
    setAuditEvents(nextAuditEvents);
  }

  async function downloadPdf() {
    await downloadContractPdf(contract, sections, signers, status);
    addAudit(
      "System",
      "PDF downloaded",
      "Clean unwatermarked PDF downloaded.",
    );
  }

  function downloadEvidence() {
    const exportEvent = createAuditEvent(
      "System",
      "Evidence exported",
      "Audit evidence JSON downloaded.",
    );
    const nextAuditEvents = [exportEvent, ...auditEvents];
    downloadBlob(
      `${contract.contractTitle.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-evidence.json`,
      "application/json;charset=utf-8",
      JSON.stringify(
        { contract, clauses, signers, auditEvents: nextAuditEvents, status },
        null,
        2,
      ),
    );
    setAuditEvents(nextAuditEvents);
  }

  return (
    <div className="app">
      <header className="topbar no-print">
        <a className="brand brand-link" href="/" aria-label="Term Craft home">
          <div className="brand-mark" aria-hidden="true">
            <FileCheck2 size={22} />
          </div>
          <div>
            <strong>Term Craft</strong>
            <span>Contract Studio</span>
          </div>
        </a>

        <nav className="public-nav" style={{ margin: '0 12px 0 auto' }}>
          <a href="/">Home</a>
          <a href="/templates">Template Hub</a>
          <a href="/admin/leads">Admin</a>
        </nav>

        <div className="topbar-actions">
          <StatusPill status={status} />
          <button className="button secondary" type="button" onClick={saveDraft}>
            <Save size={17} />
            <span>Save</span>
          </button>
          <button
            className="button secondary"
            type="button"
            onClick={printContract}
          >
            <Printer size={17} />
            <span>Print</span>
          </button>
          <button
            className="button primary"
            type="button"
            onClick={downloadPdf}
          >
            <Download size={17} />
            <span>Download PDF</span>
          </button>
        </div>
      </header>

      <div className="workspace">
        <aside className="builder-panel no-print" aria-label="Contract builder">
          <section className="panel">
            <PanelTitle icon={<Wand2 size={18} />} title="Generator" />
            <div className="template-grid" role="list">
              {contractTemplates.map((template) => (
                <button
                  className={`template-option ${
                    contract.template === template.key ? "active" : ""
                  }`}
                  key={template.key}
                  type="button"
                  onClick={() => updateTemplate(template.key)}
                >
                  <span>{template.name}</span>
                  <small>{template.meta}</small>
                </button>
              ))}
            </div>
          </section>

          <section className="panel core-input-panel">
            <PanelTitle icon={<FileText size={18} />} title="Input Form" />
            <div className="core-field-stack">
              <Field label="Client Name">
                <input
                  placeholder="Acme Growth LLC"
                  value={contract.customerName}
                  onChange={(event) =>
                    updateContract("customerName", event.target.value)
                  }
                />
              </Field>
              <Field label="Service Provider Name">
                <input
                  placeholder="Northstar Analytics, Inc."
                  value={contract.providerName}
                  onChange={(event) =>
                    updateContract("providerName", event.target.value)
                  }
                />
              </Field>
              <div className="form-grid compact">
                <Field label="Payment Amount">
                  <input
                    placeholder="$6,000"
                    value={contract.feeAmount}
                    onChange={(event) =>
                      updateContract("feeAmount", event.target.value)
                    }
                  />
                </Field>
                <Field label="Start Date">
                  <input
                    type="date"
                    value={contract.effectiveDate}
                    onChange={(event) =>
                      updateContract("effectiveDate", event.target.value)
                    }
                  />
                </Field>
              </div>
              <Field label="Scope of Work">
                <textarea
                  rows={5}
                  placeholder="Describe the subscription, deliverables, or services."
                  value={contract.serviceName}
                  onChange={(event) =>
                    updateContract("serviceName", event.target.value)
                  }
                />
              </Field>
            </div>
          </section>

          <section className="panel advanced-panel">
            <details>
              <summary>
                <span>Advanced Terms</span>
                <small>Addresses, billing, legal defaults</small>
              </summary>
              <div className="advanced-content">
                <div className="form-grid">
                  <Field label="Title">
                    <input
                      value={contract.contractTitle}
                      onChange={(event) =>
                        updateContract("contractTitle", event.target.value)
                      }
                    />
                  </Field>
                  <Field label="Provider address">
                    <input
                      value={contract.providerAddress}
                      onChange={(event) =>
                        updateContract("providerAddress", event.target.value)
                      }
                    />
                  </Field>
                  <Field label="Client address">
                    <input
                      value={contract.customerAddress}
                      onChange={(event) =>
                        updateContract("customerAddress", event.target.value)
                      }
                    />
                  </Field>
                  <Field label="Plan">
                    <input
                      value={contract.planName}
                      onChange={(event) =>
                        updateContract("planName", event.target.value)
                      }
                    />
                  </Field>
                  <Field label="Billing">
                    <select
                      value={contract.billingCycle}
                      onChange={(event) =>
                        updateContract("billingCycle", event.target.value)
                      }
                    >
                      <option value="monthly">Monthly</option>
                      <option value="quarterly">Quarterly</option>
                      <option value="annually">Annually</option>
                      <option value="one-time">One-time</option>
                    </select>
                  </Field>
                  <Field label="Term months">
                    <input
                      min={1}
                      type="number"
                      value={contract.termMonths}
                      onChange={(event) =>
                        updateContract("termMonths", Number(event.target.value))
                      }
                    />
                  </Field>
                  <Field label="Notice days">
                    <input
                      min={0}
                      type="number"
                      value={contract.terminationNoticeDays}
                      onChange={(event) =>
                        updateContract(
                          "terminationNoticeDays",
                          Number(event.target.value),
                        )
                      }
                    />
                  </Field>
                  <Field label="Payment days">
                    <input
                      min={0}
                      type="number"
                      value={contract.paymentDueDays}
                      onChange={(event) =>
                        updateContract(
                          "paymentDueDays",
                          Number(event.target.value),
                        )
                      }
                    />
                  </Field>
                  <Field label="Governing law">
                    <input
                      value={contract.governingLaw}
                      onChange={(event) =>
                        updateContract("governingLaw", event.target.value)
                      }
                    />
                  </Field>
                  <Field label="Data region">
                    <input
                      value={contract.dataRegion}
                      onChange={(event) =>
                        updateContract("dataRegion", event.target.value)
                      }
                    />
                  </Field>
                  <Field label="Support target">
                    <input
                      value={contract.supportResponse}
                      onChange={(event) =>
                        updateContract("supportResponse", event.target.value)
                      }
                    />
                  </Field>
                  <Field label="Liability cap">
                    <input
                      value={contract.liabilityCap}
                      onChange={(event) =>
                        updateContract("liabilityCap", event.target.value)
                      }
                    />
                  </Field>
                  <Field label="Renewal term">
                    <input
                      value={contract.renewalTerm}
                      onChange={(event) =>
                        updateContract("renewalTerm", event.target.value)
                      }
                    />
                  </Field>
                </div>
                <Field label="Special terms">
                  <textarea
                    rows={4}
                    value={contract.specialTerms}
                    onChange={(event) =>
                      updateContract("specialTerms", event.target.value)
                    }
                  />
                </Field>
              </div>
            </details>
          </section>

          <section className="panel">
            <PanelTitle icon={<ShieldCheck size={18} />} title="Clauses" />
            <div className="clause-list">
              {clauseCatalog.map((clause) => (
                <label className="clause-row" key={clause.key}>
                  <span>
                    <strong>{clause.label}</strong>
                    <small>{clause.detail}</small>
                  </span>
                  <input
                    checked={clauses[clause.key]}
                    type="checkbox"
                    onChange={(event) =>
                      setClauses((current) => ({
                        ...current,
                        [clause.key]: event.target.checked,
                      }))
                    }
                  />
                </label>
              ))}
            </div>
          </section>
        </aside>

        <main className="document-stage">
          <div className="stage-toolbar no-print">
            <div>
              <strong>Document Preview</strong>
              <span>{sections.length} sections</span>
            </div>
            <div className="toolbar-actions">
              <button
                className="icon-button"
                title="Download HTML backup"
                type="button"
                onClick={downloadHtml}
              >
                <Download size={18} />
              </button>
              <button
                className="icon-button"
                title="Download evidence"
                type="button"
                onClick={downloadEvidence}
              >
                <History size={18} />
              </button>
              <button
                className="icon-button"
                title="Reset draft"
                type="button"
                onClick={resetWorkspace}
              >
                <RotateCcw size={18} />
              </button>
            </div>
          </div>

          <ContractDocument
            auditEvents={auditEvents}
            contract={contract}
            sections={sections}
            signers={signers}
            status={status}
          />
        </main>

        <aside
          className="signature-panel no-print"
          id="signing"
          aria-label="Signature workflow"
        >
          <section className="panel status-panel">
            <PanelTitle icon={<CheckCircle2 size={18} />} title="Status" />
            <div className="metric-grid">
              <Metric label="State" value={status} />
              <Metric label="Signed" value={`${signedCount}/${signers.length}`} />
              <Metric label="Value" value={contract.feeAmount} />
              <Metric label="Term" value={`${contract.termMonths} mo`} />
            </div>
          </section>

          <section className="panel">
            <PanelTitle icon={<UserCheck size={18} />} title="Signers" />
            <div className="signer-list">
              {signers.map((signer) => (
                <button
                  className={`signer-row ${
                    activeSignerId === signer.id ? "active" : ""
                  } ${signer.signedAt ? "signed" : ""}`}
                  key={signer.id}
                  type="button"
                  onClick={() => setActiveSignerId(signer.id)}
                >
                  <span>
                    <strong>{signer.role}</strong>
                    <small>{signer.name || "Unnamed signer"}</small>
                  </span>
                  {signer.signedAt ? (
                    <CheckCircle2 size={18} />
                  ) : (
                    <Clock3 size={18} />
                  )}
                </button>
              ))}
            </div>
            <button
              className="button secondary full-width"
              type="button"
              onClick={copyInviteLink}
            >
              <Mail size={17} />
              <span>Copy link</span>
            </button>
          </section>

          <section className="panel signing-room">
            <PanelTitle icon={<PenLine size={18} />} title="Signing Room" />
            <div className="form-stack">
              <Field label="Signer">
                <select
                  value={activeSignerId}
                  onChange={(event) =>
                    setActiveSignerId(event.target.value as Signer["id"])
                  }
                >
                  {signers.map((signer) => (
                    <option key={signer.id} value={signer.id}>
                      {signer.role}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Name">
                <input
                  value={activeSigner.name}
                  onChange={(event) =>
                    updateSigner(activeSigner.id, "name", event.target.value)
                  }
                />
              </Field>
              <Field label="Title">
                <input
                  value={activeSigner.title}
                  onChange={(event) =>
                    updateSigner(activeSigner.id, "title", event.target.value)
                  }
                />
              </Field>
              <Field label="Email">
                <input
                  type="email"
                  value={activeSigner.email}
                  onChange={(event) =>
                    updateSigner(activeSigner.id, "email", event.target.value)
                  }
                />
              </Field>
            </div>

            <SignatureCapture
              resetKey={`${activeSigner.id}-${activeSigner.signedAt ?? "open"}`}
              signerName={activeSigner.name}
              onSignatureChange={(dataUrl, method) =>
                setPendingSignature(
                  dataUrl && method ? { dataUrl, method } : null,
                )
              }
            />

            <label className="consent-row">
              <input
                checked={consentChecked}
                type="checkbox"
                onChange={(event) => setConsentChecked(event.target.checked)}
              />
              <span>I agree to sign electronically as {activeSigner.name}.</span>
            </label>

            <div className="signature-actions">
              <button
                className="button primary full-width"
                disabled={!pendingSignature || !consentChecked}
                type="button"
                onClick={signContract}
              >
                <PenLine size={17} />
                <span>Apply signature</span>
              </button>
              {activeSigner.signedAt ? (
                <button
                  className="button ghost full-width"
                  type="button"
                  onClick={() => clearSignature(activeSigner.id)}
                >
                  <RotateCcw size={17} />
                  <span>Clear signature</span>
                </button>
              ) : null}
            </div>
          </section>

          <section className="panel">
            <PanelTitle icon={<History size={18} />} title="Audit Trail" />
            <div className="audit-list">
              {auditEvents.slice(0, 7).map((event) => (
                <div className="audit-row" key={event.id}>
                  <strong>{event.action}</strong>
                  <span>{event.actor}</span>
                  <small>{formatTimestamp(event.at)}</small>
                </div>
              ))}
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}

function PanelTitle({
  icon,
  title,
}: {
  icon: React.ReactNode;
  title: string;
}) {
  return (
    <div className="panel-title">
      {icon}
      <h2>{title}</h2>
    </div>
  );
}

function Field({
  children,
  label,
}: {
  children: React.ReactNode;
  label: string;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  return (
    <div className={`status-pill ${status.toLowerCase().replace(/\s+/g, "-")}`}>
      <span aria-hidden="true" />
      {status}
    </div>
  );
}

function ContractDocument({
  auditEvents,
  contract,
  sections,
  showAudit = true,
  signers,
  status,
}: {
  auditEvents: AuditEvent[];
  contract: ContractState;
  sections: ContractSection[];
  showAudit?: boolean;
  signers: Signer[];
  status: string;
}) {
  return (
    <article className="document" id="contract-document">
      <header className="document-header">
        <div className="document-meta">
          <span>{status}</span>
          <span>Effective {formatDate(contract.effectiveDate)}</span>
        </div>
        <h1>{contract.contractTitle}</h1>
        <p>
          {contract.providerName} and {contract.customerName}
        </p>
      </header>

      <div className="document-body">
        {sections.map((section, index) => (
          <section className="document-section" key={`${section.heading}-${index}`}>
            <h2>
              {index + 1}. {section.heading}
            </h2>
            <p>{section.body}</p>
          </section>
        ))}
      </div>

      <section className="signature-block">
        <h2>Signatures</h2>
        <div className="signature-grid">
          {signers.map((signer) => (
            <div className="signature-card" key={signer.id}>
              <div className="signature-image">
                {signer.signatureDataUrl ? (
                  <img
                    alt={`${signer.role} signature`}
                    src={signer.signatureDataUrl}
                  />
                ) : (
                  <span>Awaiting signature</span>
                )}
              </div>
              <strong>{signer.name || signer.role}</strong>
              <span>{signer.title}</span>
              <small>
                {signer.signedAt
                  ? `${signer.role} signed ${formatTimestamp(signer.signedAt)}`
                  : `${signer.role} unsigned`}
              </small>
            </div>
          ))}
        </div>
      </section>

      {showAudit ? (
        <section className="evidence-table">
          <h2>Audit Trail</h2>
          <table>
            <thead>
              <tr>
                <th>Time</th>
                <th>Actor</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {auditEvents.slice(0, 10).map((event) => (
                <tr key={event.id}>
                  <td>{formatTimestamp(event.at)}</td>
                  <td>{event.actor}</td>
                  <td>{event.action}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ) : null}

      <footer className="document-footer">
        Generated draft for counsel review before production use.
      </footer>
    </article>
  );
}

function SignatureCapture({
  onSignatureChange,
  resetKey,
  signerName,
}: {
  onSignatureChange: (dataUrl: string | null, method: SignatureMethod | null) => void;
  resetKey: string;
  signerName: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawing = useRef(false);
  const lastPoint = useRef<{ x: number; y: number } | null>(null);
  const [mode, setMode] = useState<SignatureMethod>("drawn");
  const [typedName, setTypedName] = useState(signerName);
  const [hasInk, setHasInk] = useState(false);

  useEffect(() => {
    setTypedName(signerName);
  }, [signerName]);

  useEffect(() => {
    clearCanvas();
    onSignatureChange(null, null);
  }, [resetKey]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const ratio = window.devicePixelRatio || 1;
      canvas.width = Math.max(1, Math.floor(rect.width * ratio));
      canvas.height = Math.max(1, Math.floor(rect.height * ratio));
      const context = canvas.getContext("2d");
      if (!context) {
        return;
      }

      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      context.lineCap = "round";
      context.lineJoin = "round";
      context.lineWidth = 2.8;
      context.strokeStyle = "#18231f";
    };

    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  useEffect(() => {
    if (mode === "typed") {
      const cleaned = typedName.trim();
      onSignatureChange(
        cleaned ? typedSignatureDataUrl(cleaned) : null,
        cleaned ? "typed" : null,
      );
    } else if (!hasInk) {
      onSignatureChange(null, null);
    }
  }, [mode, typedName, hasInk]);

  function clearCanvas() {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) {
      return;
    }

    context.clearRect(0, 0, canvas.width, canvas.height);
    setHasInk(false);
  }

  function pointFromEvent(event: React.PointerEvent<HTMLCanvasElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
  }

  function startDrawing(event: React.PointerEvent<HTMLCanvasElement>) {
    if (mode !== "drawn") {
      return;
    }

    event.currentTarget.setPointerCapture(event.pointerId);
    drawing.current = true;
    const point = pointFromEvent(event);
    lastPoint.current = point;

    const context = event.currentTarget.getContext("2d");
    if (!context) {
      return;
    }

    context.beginPath();
    context.arc(point.x, point.y, 1.4, 0, Math.PI * 2);
    context.fillStyle = "#18231f";
    context.fill();
    setHasInk(true);
  }

  function draw(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current || mode !== "drawn") {
      return;
    }

    const context = event.currentTarget.getContext("2d");
    const previous = lastPoint.current;
    const next = pointFromEvent(event);
    if (!context || !previous) {
      return;
    }

    context.beginPath();
    context.moveTo(previous.x, previous.y);
    context.lineTo(next.x, next.y);
    context.stroke();
    lastPoint.current = next;
    setHasInk(true);
  }

  function stopDrawing(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current || mode !== "drawn") {
      return;
    }

    drawing.current = false;
    lastPoint.current = null;
    onSignatureChange(event.currentTarget.toDataURL("image/png"), "drawn");
  }

  return (
    <div className="signature-capture">
      <div className="segmented-control" aria-label="Signature mode">
        <button
          className={mode === "drawn" ? "active" : ""}
          type="button"
          onClick={() => setMode("drawn")}
        >
          Draw
        </button>
        <button
          className={mode === "typed" ? "active" : ""}
          type="button"
          onClick={() => setMode("typed")}
        >
          Type
        </button>
      </div>

      {mode === "drawn" ? (
        <div className="canvas-wrap">
          <canvas
            aria-label="Draw signature"
            ref={canvasRef}
            onPointerCancel={stopDrawing}
            onPointerDown={startDrawing}
            onPointerLeave={stopDrawing}
            onPointerMove={draw}
            onPointerUp={stopDrawing}
          />
          {!hasInk ? <span>Sign here</span> : null}
          <button
            className="canvas-clear"
            title="Clear signature"
            type="button"
            onClick={() => {
              clearCanvas();
              onSignatureChange(null, null);
            }}
          >
            <RotateCcw size={15} />
          </button>
        </div>
      ) : (
        <div className="typed-signature">
          <input
            value={typedName}
            onChange={(event) => setTypedName(event.target.value)}
          />
          <div>{typedName || "Typed signature"}</div>
        </div>
      )}
    </div>
  );
}

function App() {
  const pathname = window.location.pathname.replace(/\/$/, "");
  const seoTemplateConfig = seoTemplateConfigs[pathname];
  const analyticsTemplatePath = seoTemplateConfig?.path ?? "";
  const analyticsTemplateTitle = seoTemplateConfig?.contractTitle ?? "";

  useEffect(() => {
    if (pathname.startsWith("/admin")) {
      return;
    }

    sendAnalyticsEvent("page_view", {
      templatePath: analyticsTemplatePath,
      templateTitle: analyticsTemplateTitle,
    });
  }, [analyticsTemplatePath, analyticsTemplateTitle, pathname]);

  if (pathname === "") {
    return <HomePage />;
  }

  if (pathname === "/templates") {
    return <TemplatesDirectoryPage />;
  }

  if (pathname === "/builder") {
    return <ContractBuilderApp />;
  }

  if (pathname === "/privacy") {
    return <PrivacyPage />;
  }

  if (pathname === "/admin/leads") {
    return <AdminLeadsPage />;
  }

  if (seoTemplateConfig) {
    return <SeoTemplatePage config={seoTemplateConfig} />;
  }

  return <HomePage />;
}

export default App;
