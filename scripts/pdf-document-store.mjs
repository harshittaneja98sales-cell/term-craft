import fs from "node:fs/promises";
import { randomUUID } from "node:crypto";
import os from "node:os";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

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
const pdfDocumentsTable = process.env.SUPABASE_PDF_DOCUMENTS_TABLE ?? "pdf_documents";
const pdfStorageBucket = process.env.SUPABASE_PDF_BUCKET ?? "termcraft-pdfs";
let supabaseClient = null;
let memoryDocuments = [];

function hasSupabaseConfig() {
  return Boolean(supabaseUrl && supabaseKey);
}

function getSupabaseClient() {
  if (!hasSupabaseConfig()) {
    throw new Error("Supabase is not configured.");
  }

  if (!supabaseClient) {
    supabaseClient = createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }

  return supabaseClient;
}

export function getPdfDocumentStorageInfo() {
  return {
    provider: hasSupabaseConfig() ? "supabase-storage" : "local-json",
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
      await fs.mkdir(path.dirname(filePath), { recursive: true });

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

function normalizeArray(value) {
  return Array.isArray(value) ? value : [];
}

function normalizeObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function sanitizeFileName(fileName) {
  const cleaned = String(fileName ?? "uploaded.pdf")
    .trim()
    .replace(/[^\w.\-() ]+/g, "-")
    .replace(/\s+/g, " ")
    .slice(0, 140);

  return cleaned.toLowerCase().endsWith(".pdf")
    ? cleaned || "uploaded.pdf"
    : `${cleaned || "uploaded"}.pdf`;
}

function getLocalPdfPath(storagePath) {
  return path.join(activeDataDir, "pdf-documents", storagePath);
}

function toSupabasePdfDocument(document) {
  return {
    id: document.id,
    user_id: document.userId,
    title: document.title,
    file_name: document.fileName,
    file_size: document.fileSize,
    file_hash: document.fileHash,
    storage_bucket: document.storageBucket,
    storage_path: document.storagePath,
    status: document.status,
    page_count: document.pageCount,
    page_previews: document.pages,
    fields: document.fields,
    field_values: document.fieldValues,
    signing_token_hash: document.signingTokenHash,
    signing_created_at: document.signingCreatedAt || null,
    signing_expires_at: document.signingExpiresAt || null,
    signing_completed_at: document.signingCompletedAt || null,
    signing_recipient_email: document.signingRecipientEmail,
    signing_recipient_name: document.signingRecipientName,
    audit_events: document.auditEvents,
    document_hash: document.documentHash,
  };
}

function fromSupabasePdfDocument(row) {
  return {
    id: row.id ?? "",
    userId: row.user_id ?? "",
    title: row.title ?? "",
    fileName: row.file_name ?? "",
    fileSize: row.file_size ?? 0,
    fileHash: row.file_hash ?? "",
    storageBucket: row.storage_bucket ?? pdfStorageBucket,
    storagePath: row.storage_path ?? "",
    status: row.status ?? "Draft",
    pageCount: row.page_count ?? 0,
    pages: normalizeArray(row.page_previews),
    fields: normalizeArray(row.fields),
    fieldValues: normalizeObject(row.field_values),
    signingTokenHash: row.signing_token_hash ?? "",
    signingCreatedAt: row.signing_created_at ?? "",
    signingExpiresAt: row.signing_expires_at ?? "",
    signingCompletedAt: row.signing_completed_at ?? "",
    signingRecipientEmail: row.signing_recipient_email ?? "",
    signingRecipientName: row.signing_recipient_name ?? "",
    auditEvents: normalizeArray(row.audit_events),
    documentHash: row.document_hash ?? "",
    createdAt: row.created_at ?? "",
    updatedAt: row.updated_at ?? row.created_at ?? "",
  };
}

async function readLocalDocuments() {
  try {
    const documents = await readJsonArray("pdf-documents.json");
    memoryDocuments = documents;
    return documents;
  } catch (error) {
    console.error(error);
    return memoryDocuments;
  }
}

async function writeLocalDocuments(documents) {
  try {
    await writeJsonArray("pdf-documents.json", documents);
    memoryDocuments = documents;
  } catch (error) {
    console.error(error);
    memoryDocuments = documents;
  }
}

async function uploadSupabasePdf(storagePath, pdfBuffer) {
  const supabase = getSupabaseClient();
  const { error } = await supabase.storage
    .from(pdfStorageBucket)
    .upload(storagePath, pdfBuffer, {
      contentType: "application/pdf",
      upsert: true,
    });

  if (error) {
    error.status = error.statusCode ?? 502;
    throw error;
  }
}

async function downloadSupabasePdf(document) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.storage
    .from(document.storageBucket || pdfStorageBucket)
    .download(document.storagePath);

  if (error) {
    error.status = error.statusCode ?? 502;
    throw error;
  }

  return Buffer.from(await data.arrayBuffer());
}

export async function listPdfDocuments(userId) {
  if (hasSupabaseConfig()) {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from(pdfDocumentsTable)
      .select("*")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false })
      .limit(200);

    if (error) {
      error.status = error.status ?? 502;
      throw error;
    }

    return normalizeArray(data).map(fromSupabasePdfDocument);
  }

  const documents = await readLocalDocuments();
  return documents
    .filter((document) => document.userId === userId)
    .sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)))
    .slice(0, 200);
}

export async function getPdfDocument(userId, documentId) {
  if (hasSupabaseConfig()) {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from(pdfDocumentsTable)
      .select("*")
      .eq("user_id", userId)
      .eq("id", documentId)
      .maybeSingle();

    if (error) {
      error.status = error.status ?? 502;
      throw error;
    }

    return data ? fromSupabasePdfDocument(data) : null;
  }

  const documents = await readLocalDocuments();
  return (
    documents.find(
      (document) => document.userId === userId && document.id === documentId,
    ) ?? null
  );
}

export async function getPdfDocumentBySigningTokenHash(tokenHash) {
  if (!tokenHash) {
    return null;
  }

  if (hasSupabaseConfig()) {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from(pdfDocumentsTable)
      .select("*")
      .eq("signing_token_hash", tokenHash)
      .maybeSingle();

    if (error) {
      error.status = error.status ?? 502;
      throw error;
    }

    return data ? fromSupabasePdfDocument(data) : null;
  }

  const documents = await readLocalDocuments();
  return (
    documents.find((document) => document.signingTokenHash === tokenHash) ?? null
  );
}

export async function savePdfDocument(document, pdfBuffer) {
  const timestamp = new Date().toISOString();
  const documentId = document.id || randomUUID();
  const fileName = sanitizeFileName(document.fileName);
  const storagePath = `${document.userId}/${documentId}/${fileName}`;
  const nextDocument = {
    ...document,
    id: documentId,
    fileName,
    storageBucket: pdfStorageBucket,
    storagePath,
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  if (hasSupabaseConfig()) {
    await uploadSupabasePdf(storagePath, pdfBuffer);
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from(pdfDocumentsTable)
      .upsert(toSupabasePdfDocument(nextDocument), { onConflict: "id" })
      .select("*")
      .single();

    if (error) {
      error.status = error.status ?? 502;
      throw error;
    }

    return fromSupabasePdfDocument(data);
  }

  const documents = await readLocalDocuments();
  const filePath = getLocalPdfPath(storagePath);
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, pdfBuffer);
  const nextDocuments = [
    nextDocument,
    ...documents.filter((item) => item.id !== nextDocument.id),
  ].slice(0, 1000);
  await writeLocalDocuments(nextDocuments);
  return nextDocument;
}

export async function updatePdfDocument(document) {
  if (!document?.id || !document?.userId) {
    throw new Error("PDF document id and user id are required.");
  }

  const nextDocument = {
    ...document,
    updatedAt: new Date().toISOString(),
  };

  if (hasSupabaseConfig()) {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from(pdfDocumentsTable)
      .update(toSupabasePdfDocument(nextDocument))
      .eq("id", nextDocument.id)
      .eq("user_id", nextDocument.userId)
      .select("*")
      .single();

    if (error) {
      error.status = error.status ?? 502;
      throw error;
    }

    return fromSupabasePdfDocument(data);
  }

  const documents = await readLocalDocuments();
  const nextDocuments = documents.map((item) =>
    item.id === nextDocument.id && item.userId === nextDocument.userId
      ? nextDocument
      : item,
  );
  await writeLocalDocuments(nextDocuments);
  return (
    nextDocuments.find(
      (item) => item.id === nextDocument.id && item.userId === nextDocument.userId,
    ) ?? nextDocument
  );
}

export async function readPdfDocumentFile(document) {
  if (hasSupabaseConfig()) {
    return downloadSupabasePdf(document);
  }

  return fs.readFile(getLocalPdfPath(document.storagePath));
}

export async function deletePdfDocument(userId, documentId) {
  const document = await getPdfDocument(userId, documentId);

  if (!document) {
    return false;
  }

  if (hasSupabaseConfig()) {
    const supabase = getSupabaseClient();
    if (document.storagePath) {
      await supabase.storage
        .from(document.storageBucket || pdfStorageBucket)
        .remove([document.storagePath]);
    }

    const { error } = await supabase
      .from(pdfDocumentsTable)
      .delete()
      .eq("user_id", userId)
      .eq("id", documentId);

    if (error) {
      error.status = error.status ?? 502;
      throw error;
    }

    return true;
  }

  const documents = await readLocalDocuments();
  const nextDocuments = documents.filter(
    (item) => !(item.userId === userId && item.id === documentId),
  );
  await writeLocalDocuments(nextDocuments);
  await fs.rm(getLocalPdfPath(document.storagePath), { force: true }).catch(() => undefined);
  return nextDocuments.length !== documents.length;
}
