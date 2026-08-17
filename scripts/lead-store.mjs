import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const primaryDataDir = process.env.DATA_DIR
  ? path.resolve(process.env.DATA_DIR)
  : process.env.NODE_ENV === "production"
    ? path.join(os.tmpdir(), "term-craft-data")
    : path.resolve(process.cwd(), "data");
const fallbackDataDir =
  process.env.NODE_ENV === "production"
    ? path.join(os.tmpdir(), "term-craft-data")
    : primaryDataDir;
let activeDataDir = primaryDataDir;
const supabaseUrl = process.env.SUPABASE_URL?.replace(/\/$/, "");
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_KEY;
const supabaseLeadsTable = process.env.SUPABASE_LEADS_TABLE ?? "leads";
const supabaseEventsTable =
  process.env.SUPABASE_EVENTS_TABLE ?? "analytics_events";
let memoryLeads = [];
let memoryEvents = [];

const leadColumns = [
  "id",
  "email",
  "templateTitle",
  "templatePath",
  "landingPath",
  "downloadedAt",
  "submittedAt",
  "referrer",
  "utmSource",
  "utmMedium",
  "utmCampaign",
  "utmTerm",
  "utmContent",
  "userAgent",
];

function hasSupabaseConfig() {
  return Boolean(supabaseUrl && supabaseKey);
}

export function getStorageInfo() {
  return {
    provider: hasSupabaseConfig() ? "supabase" : "local-json",
    durable: hasSupabaseConfig(),
  };
}

function getCandidateDataDirs() {
  return [...new Set([activeDataDir, primaryDataDir, fallbackDataDir])];
}

async function ensureStore(fileName) {
  let lastError;

  for (const candidateDir of getCandidateDataDirs()) {
    const filePath = path.join(candidateDir, fileName);

    try {
      await fs.mkdir(candidateDir, { recursive: true });

      try {
        await fs.access(filePath);
      } catch {
        await fs.writeFile(filePath, "[]\n", "utf8");
      }

      activeDataDir = candidateDir;
      return filePath;
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError;
}

async function readJsonArray(fileName) {
  const filePath = await ensureStore(fileName);
  const raw = await fs.readFile(filePath, "utf8");

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeJsonArray(fileName, records) {
  const filePath = await ensureStore(fileName);
  await fs.writeFile(filePath, `${JSON.stringify(records, null, 2)}\n`, "utf8");
}

async function readLocalLeads() {
  try {
    return await readJsonArray("leads.json");
  } catch (error) {
    console.error(error);
    return memoryLeads;
  }
}

async function saveLocalLead(lead) {
  try {
    const leads = await readJsonArray("leads.json");
    const nextLeads = [lead, ...leads].slice(0, 5000);
    await writeJsonArray("leads.json", nextLeads);
    memoryLeads = nextLeads;
  } catch (error) {
    console.error(error);
    memoryLeads = [lead, ...memoryLeads].slice(0, 5000);
  }

  return lead;
}

async function readLocalEvents(limit = 1000) {
  try {
    const events = await readJsonArray("analytics-events.json");
    return events.slice(0, limit);
  } catch (error) {
    console.error(error);
    return memoryEvents.slice(0, limit);
  }
}

async function saveLocalEvent(event) {
  try {
    const events = await readJsonArray("analytics-events.json");
    const nextEvents = [event, ...events].slice(0, 10000);
    await writeJsonArray("analytics-events.json", nextEvents);
    memoryEvents = nextEvents;
  } catch (error) {
    console.error(error);
    memoryEvents = [event, ...memoryEvents].slice(0, 10000);
  }

  return event;
}

async function supabaseRequest(table, query, options = {}) {
  if (!hasSupabaseConfig()) {
    throw new Error("Supabase is not configured.");
  }

  const response = await fetch(
    `${supabaseUrl}/rest/v1/${encodeURIComponent(table)}${query}`,
    {
      ...options,
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
        "Content-Type": "application/json",
        ...(options.headers ?? {}),
      },
    },
  );

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Supabase request failed: ${response.status} ${detail}`);
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

function toSupabaseLead(lead) {
  return {
    id: lead.id,
    email: lead.email,
    template_title: lead.templateTitle,
    template_path: lead.templatePath,
    landing_path: lead.landingPath,
    downloaded_at: lead.downloadedAt || null,
    submitted_at: lead.submittedAt || new Date().toISOString(),
    referrer: lead.referrer,
    utm_source: lead.utmSource,
    utm_medium: lead.utmMedium,
    utm_campaign: lead.utmCampaign,
    utm_term: lead.utmTerm,
    utm_content: lead.utmContent,
    user_agent: lead.userAgent,
  };
}

function fromSupabaseLead(row) {
  return {
    id: row.id ?? "",
    email: row.email ?? "",
    templateTitle: row.template_title ?? "",
    templatePath: row.template_path ?? "",
    landingPath: row.landing_path ?? "",
    downloadedAt: row.downloaded_at ?? "",
    submittedAt: row.submitted_at ?? "",
    referrer: row.referrer ?? "",
    utmSource: row.utm_source ?? "",
    utmMedium: row.utm_medium ?? "",
    utmCampaign: row.utm_campaign ?? "",
    utmTerm: row.utm_term ?? "",
    utmContent: row.utm_content ?? "",
    userAgent: row.user_agent ?? "",
  };
}

function toSupabaseEvent(event) {
  return {
    id: event.id,
    event_name: event.eventName,
    path: event.path,
    template_title: event.templateTitle,
    template_path: event.templatePath,
    referrer: event.referrer,
    utm_source: event.utmSource,
    utm_medium: event.utmMedium,
    utm_campaign: event.utmCampaign,
    utm_term: event.utmTerm,
    utm_content: event.utmContent,
    metadata: event.metadata ?? {},
    user_agent: event.userAgent,
    occurred_at: event.occurredAt || new Date().toISOString(),
  };
}

function fromSupabaseEvent(row) {
  return {
    id: row.id ?? "",
    eventName: row.event_name ?? "",
    path: row.path ?? "",
    templateTitle: row.template_title ?? "",
    templatePath: row.template_path ?? "",
    referrer: row.referrer ?? "",
    utmSource: row.utm_source ?? "",
    utmMedium: row.utm_medium ?? "",
    utmCampaign: row.utm_campaign ?? "",
    utmTerm: row.utm_term ?? "",
    utmContent: row.utm_content ?? "",
    metadata: row.metadata && typeof row.metadata === "object" ? row.metadata : {},
    userAgent: row.user_agent ?? "",
    occurredAt: row.occurred_at ?? "",
  };
}

async function readSupabaseLeads() {
  const rows = await supabaseRequest(
    supabaseLeadsTable,
    "?select=*&order=submitted_at.desc&limit=5000",
  );
  return Array.isArray(rows) ? rows.map(fromSupabaseLead) : [];
}

async function saveSupabaseLead(lead) {
  const rows = await supabaseRequest(supabaseLeadsTable, "?select=*", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify(toSupabaseLead(lead)),
  });

  return Array.isArray(rows) && rows[0] ? fromSupabaseLead(rows[0]) : lead;
}

async function readSupabaseEvents(limit = 1000) {
  const rows = await supabaseRequest(
    supabaseEventsTable,
    `?select=*&order=occurred_at.desc&limit=${limit}`,
  );
  return Array.isArray(rows) ? rows.map(fromSupabaseEvent) : [];
}

async function saveSupabaseEvent(event) {
  const rows = await supabaseRequest(supabaseEventsTable, "?select=*", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify(toSupabaseEvent(event)),
  });

  return Array.isArray(rows) && rows[0] ? fromSupabaseEvent(rows[0]) : event;
}

export async function readLeads() {
  if (hasSupabaseConfig()) {
    try {
      return await readSupabaseLeads();
    } catch (error) {
      console.error(error);
    }
  }

  return readLocalLeads();
}

export async function saveLead(lead) {
  if (hasSupabaseConfig()) {
    try {
      return await saveSupabaseLead(lead);
    } catch (error) {
      console.error(error);
    }
  }

  return saveLocalLead(lead);
}

export async function readAnalyticsEvents(limit = 1000) {
  if (hasSupabaseConfig()) {
    try {
      return await readSupabaseEvents(limit);
    } catch (error) {
      console.error(error);
    }
  }

  return readLocalEvents(limit);
}

export async function saveAnalyticsEvent(event) {
  if (hasSupabaseConfig()) {
    try {
      return await saveSupabaseEvent(event);
    } catch (error) {
      console.error(error);
    }
  }

  return saveLocalEvent(event);
}

function csvEscape(value) {
  const text = String(value ?? "");
  if (!/[",\n\r]/.test(text)) {
    return text;
  }

  return `"${text.replace(/"/g, '""')}"`;
}

export function leadsToCsv(leads) {
  const header = leadColumns.join(",");
  const rows = leads.map((lead) =>
    leadColumns.map((column) => csvEscape(lead[column])).join(","),
  );

  return [header, ...rows].join("\n");
}
