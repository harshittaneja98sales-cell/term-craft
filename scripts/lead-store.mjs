import fs from "node:fs/promises";
import path from "node:path";

const dataDir = process.env.DATA_DIR
  ? path.resolve(process.env.DATA_DIR)
  : path.resolve(process.cwd(), "data");
const leadsPath = path.join(dataDir, "leads.json");

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

async function ensureStore() {
  await fs.mkdir(dataDir, { recursive: true });

  try {
    await fs.access(leadsPath);
  } catch {
    await fs.writeFile(leadsPath, "[]\n", "utf8");
  }
}

export async function readLeads() {
  await ensureStore();
  const raw = await fs.readFile(leadsPath, "utf8");

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function saveLead(lead) {
  await ensureStore();
  const leads = await readLeads();
  const nextLeads = [lead, ...leads].slice(0, 5000);
  await fs.writeFile(leadsPath, `${JSON.stringify(nextLeads, null, 2)}\n`, "utf8");
  return lead;
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
