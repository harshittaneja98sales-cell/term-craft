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
  process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
  process.env.SUPABASE_SERVICE_KEY?.trim() ||
  process.env.SUPABASE_SECRET_KEY?.trim() ||
  "";
const supabaseBillingTable =
  process.env.SUPABASE_BILLING_TABLE ?? "billing_profiles";
let memoryProfiles = [];

function hasSupabaseConfig() {
  return Boolean(supabaseUrl && supabaseKey);
}

export function getBillingStorageInfo() {
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

async function supabaseRequest(query, options = {}) {
  if (!hasSupabaseConfig()) {
    throw new Error("Supabase is not configured.");
  }

  const response = await fetch(
    `${supabaseUrl}/rest/v1/${encodeURIComponent(supabaseBillingTable)}${query}`,
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
    throw new Error(`Supabase billing request failed: ${response.status} ${detail}`);
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

function encodeFilter(value) {
  return encodeURIComponent(String(value ?? ""));
}

function normalizeTimestamp(value) {
  if (!value) {
    return null;
  }

  if (typeof value === "number") {
    return new Date(value * 1000).toISOString();
  }

  return String(value);
}

function toSupabaseProfile(profile) {
  return {
    user_id: profile.userId,
    email: profile.email,
    stripe_customer_id: profile.stripeCustomerId,
    stripe_subscription_id: profile.stripeSubscriptionId,
    plan: profile.plan,
    status: profile.status,
    price_id: profile.priceId,
    current_period_end: normalizeTimestamp(profile.currentPeriodEnd),
    cancel_at_period_end: Boolean(profile.cancelAtPeriodEnd),
    trial_end: normalizeTimestamp(profile.trialEnd),
  };
}

function fromSupabaseProfile(row) {
  return {
    userId: row.user_id ?? "",
    email: row.email ?? "",
    stripeCustomerId: row.stripe_customer_id ?? "",
    stripeSubscriptionId: row.stripe_subscription_id ?? "",
    plan: row.plan ?? "free",
    status: row.status ?? "inactive",
    priceId: row.price_id ?? "",
    currentPeriodEnd: row.current_period_end ?? "",
    cancelAtPeriodEnd: Boolean(row.cancel_at_period_end),
    trialEnd: row.trial_end ?? "",
    createdAt: row.created_at ?? "",
    updatedAt: row.updated_at ?? row.created_at ?? "",
  };
}

async function readLocalProfiles() {
  try {
    const profiles = await readJsonArray("billing-profiles.json");
    memoryProfiles = profiles;
    return profiles;
  } catch (error) {
    console.error(error);
    return memoryProfiles;
  }
}

async function writeLocalProfiles(profiles) {
  try {
    await writeJsonArray("billing-profiles.json", profiles);
    memoryProfiles = profiles;
  } catch (error) {
    console.error(error);
    memoryProfiles = profiles;
  }
}

export async function getBillingProfile(userId) {
  if (hasSupabaseConfig()) {
    const rows = await supabaseRequest(
      `?select=*&user_id=eq.${encodeFilter(userId)}&limit=1`,
    );
    return Array.isArray(rows) && rows[0] ? fromSupabaseProfile(rows[0]) : null;
  }

  const profiles = await readLocalProfiles();
  return profiles.find((profile) => profile.userId === userId) ?? null;
}

export async function getBillingProfileByCustomerId(stripeCustomerId) {
  if (!stripeCustomerId) {
    return null;
  }

  if (hasSupabaseConfig()) {
    const rows = await supabaseRequest(
      `?select=*&stripe_customer_id=eq.${encodeFilter(stripeCustomerId)}&limit=1`,
    );
    return Array.isArray(rows) && rows[0] ? fromSupabaseProfile(rows[0]) : null;
  }

  const profiles = await readLocalProfiles();
  return (
    profiles.find((profile) => profile.stripeCustomerId === stripeCustomerId) ??
    null
  );
}

export async function upsertBillingProfile(profile) {
  const existing = await getBillingProfile(profile.userId);
  const normalizedProfile = {
    ...existing,
    ...profile,
    plan: profile.plan || existing?.plan || "free",
    status: profile.status || existing?.status || "inactive",
  };

  if (hasSupabaseConfig()) {
    const rows = await supabaseRequest("?select=*", {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates,return=representation" },
      body: JSON.stringify(toSupabaseProfile(normalizedProfile)),
    });

    return Array.isArray(rows) && rows[0]
      ? fromSupabaseProfile(rows[0])
      : normalizedProfile;
  }

  const timestamp = new Date().toISOString();
  const profiles = await readLocalProfiles();
  const storedProfile = {
    ...normalizedProfile,
    createdAt: existing?.createdAt || timestamp,
    updatedAt: timestamp,
  };
  const nextProfiles = [
    storedProfile,
    ...profiles.filter((item) => item.userId !== storedProfile.userId),
  ];
  await writeLocalProfiles(nextProfiles);
  return storedProfile;
}
