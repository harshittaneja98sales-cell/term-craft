import fs from "node:fs/promises";
import { randomUUID } from "node:crypto";
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
const supabaseDocumentsTable =
  process.env.SUPABASE_DOCUMENTS_TABLE ?? "documents";
let memoryDocuments = [];

function hasSupabaseConfig() {
  return Boolean(supabaseUrl && supabaseKey);
}

export function getDocumentStorageInfo() {
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
    `${supabaseUrl}/rest/v1/${encodeURIComponent(supabaseDocumentsTable)}${query}`,
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
    throw new Error(`Supabase document request failed: ${response.status} ${detail}`);
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

function encodeFilter(value) {
  return encodeURIComponent(String(value ?? ""));
}

function toSupabaseDocument(document) {
  return {
    user_id: document.userId,
    title: document.title,
    template_title: document.templateTitle,
    template_path: document.templatePath,
    status: document.status,
    contract_data: document.contract,
    sections: document.sections,
    signers: document.signers,
    clauses: document.clauses,
    audit_events: document.auditEvents,
    template_values: document.templateValues,
  };
}

function fromSupabaseDocument(row) {
  return {
    id: row.id ?? "",
    userId: row.user_id ?? "",
    title: row.title ?? "",
    templateTitle: row.template_title ?? "",
    templatePath: row.template_path ?? "",
    status: row.status ?? "draft",
    contract: row.contract_data ?? {},
    sections: Array.isArray(row.sections) ? row.sections : [],
    signers: Array.isArray(row.signers) ? row.signers : [],
    clauses: row.clauses && typeof row.clauses === "object" ? row.clauses : {},
    auditEvents: Array.isArray(row.audit_events) ? row.audit_events : [],
    templateValues:
      row.template_values && typeof row.template_values === "object"
        ? row.template_values
        : {},
    createdAt: row.created_at ?? "",
    updatedAt: row.updated_at ?? row.created_at ?? "",
  };
}

async function readLocalDocuments() {
  try {
    const documents = await readJsonArray("documents.json");
    memoryDocuments = documents;
    return documents;
  } catch (error) {
    console.error(error);
    return memoryDocuments;
  }
}

async function writeLocalDocuments(documents) {
  try {
    await writeJsonArray("documents.json", documents);
    memoryDocuments = documents;
  } catch (error) {
    console.error(error);
    memoryDocuments = documents;
  }
}

export async function listDocuments(userId) {
  if (hasSupabaseConfig()) {
    const rows = await supabaseRequest(
      `?select=*&user_id=eq.${encodeFilter(userId)}&order=updated_at.desc&limit=200`,
    );
    return Array.isArray(rows) ? rows.map(fromSupabaseDocument) : [];
  }

  const documents = await readLocalDocuments();
  return documents
    .filter((document) => document.userId === userId)
    .sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)))
    .slice(0, 200);
}

export async function getDocument(userId, documentId) {
  if (hasSupabaseConfig()) {
    const rows = await supabaseRequest(
      `?select=*&user_id=eq.${encodeFilter(userId)}&id=eq.${encodeFilter(documentId)}&limit=1`,
    );
    return Array.isArray(rows) && rows[0] ? fromSupabaseDocument(rows[0]) : null;
  }

  const documents = await readLocalDocuments();
  return (
    documents.find(
      (document) => document.userId === userId && document.id === documentId,
    ) ?? null
  );
}

export async function saveDocument(document) {
  if (hasSupabaseConfig()) {
    const rows = await supabaseRequest("?select=*", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify(toSupabaseDocument(document)),
    });

    return Array.isArray(rows) && rows[0]
      ? fromSupabaseDocument(rows[0])
      : document;
  }

  const timestamp = new Date().toISOString();
  const documents = await readLocalDocuments();
  const storedDocument = {
    ...document,
    id: document.id || randomUUID(),
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  const nextDocuments = [
    storedDocument,
    ...documents.filter((item) => item.id !== storedDocument.id),
  ].slice(0, 1000);
  await writeLocalDocuments(nextDocuments);
  return storedDocument;
}

export async function deleteDocument(userId, documentId) {
  if (hasSupabaseConfig()) {
    const rows = await supabaseRequest(
      `?user_id=eq.${encodeFilter(userId)}&id=eq.${encodeFilter(documentId)}&select=id`,
      {
        method: "DELETE",
        headers: { Prefer: "return=representation" },
      },
    );
    return Array.isArray(rows) && rows.length > 0;
  }

  const documents = await readLocalDocuments();
  const nextDocuments = documents.filter(
    (document) => !(document.userId === userId && document.id === documentId),
  );
  await writeLocalDocuments(nextDocuments);
  return nextDocuments.length !== documents.length;
}
