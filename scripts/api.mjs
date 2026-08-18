import { randomUUID } from "node:crypto";
import { sendEditableVersionEmail } from "./email-service.mjs";
import {
  deleteDocument,
  getDocument,
  getDocumentStorageInfo,
  listDocuments,
  saveDocument,
} from "./document-store.mjs";
import {
  getStorageInfo,
  leadsToCsv,
  readAnalyticsEvents,
  readLeads,
  saveAnalyticsEvent,
  saveLead,
} from "./lead-store.mjs";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const adminApiKey = process.env.ADMIN_API_KEY?.trim();
const requiresAdminKey = process.env.NODE_ENV === "production" || Boolean(adminApiKey);
const supabaseUrl = process.env.SUPABASE_URL?.replace(/\/$/, "");
const supabaseAuthKey =
  process.env.SUPABASE_PUBLISHABLE_KEY?.trim() ||
  process.env.SUPABASE_ANON_KEY?.trim() ||
  "";

function cleanString(value, maxLength = 500) {
  return String(value ?? "").trim().slice(0, maxLength);
}

function cleanMetadata(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  const serialized = JSON.stringify(value);
  if (serialized.length > 4000) {
    return { truncated: true };
  }

  return JSON.parse(serialized);
}

function cleanJsonValue(value, fallback, maxLength = 800000) {
  const serialized = JSON.stringify(value ?? fallback);
  if (serialized.length > maxLength) {
    const error = new Error("Document payload is too large.");
    error.status = 413;
    throw error;
  }

  return JSON.parse(serialized);
}

function getUtm(body) {
  return {
    utmSource: cleanString(body.utm?.source ?? body.utmSource, 120),
    utmMedium: cleanString(body.utm?.medium ?? body.utmMedium, 120),
    utmCampaign: cleanString(body.utm?.campaign ?? body.utmCampaign, 160),
    utmTerm: cleanString(body.utm?.term ?? body.utmTerm, 160),
    utmContent: cleanString(body.utm?.content ?? body.utmContent, 160),
  };
}

function isAdminAuthorized(req) {
  if (!requiresAdminKey) {
    return true;
  }

  if (!adminApiKey) {
    return false;
  }

  const providedKey =
    req.get("x-admin-key") ?? cleanString(req.query?.admin_key, 300);
  return providedKey === adminApiKey;
}

function hasAuthConfig() {
  return Boolean(supabaseUrl && supabaseAuthKey);
}

function normalizeSupabaseUser(user) {
  return {
    id: cleanString(user?.id, 80),
    email: cleanString(user?.email, 254).toLowerCase(),
  };
}

function normalizeSupabaseSession(payload) {
  const user = normalizeSupabaseUser(payload?.user);
  const accessToken = cleanString(payload?.access_token, 5000);
  const refreshToken = cleanString(payload?.refresh_token, 5000);
  const expiresIn = Number(payload?.expires_in ?? 3600);

  if (!accessToken || !user.id) {
    return null;
  }

  return {
    accessToken,
    refreshToken,
    expiresAt: Math.floor(Date.now() / 1000) + (Number.isFinite(expiresIn) ? expiresIn : 3600),
    tokenType: cleanString(payload?.token_type, 80) || "bearer",
    user,
  };
}

async function supabaseAuthRequest(path, options = {}) {
  if (!hasAuthConfig()) {
    const error = new Error("Supabase Auth is not configured.");
    error.status = 503;
    throw error;
  }

  const response = await fetch(`${supabaseUrl}/auth/v1${path}`, {
    ...options,
    headers: {
      apikey: supabaseAuthKey,
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    },
  });
  const raw = await response.text();
  let data = {};

  try {
    data = raw ? JSON.parse(raw) : {};
  } catch {
    data = { message: raw };
  }

  if (!response.ok) {
    const error = new Error(
      cleanString(
        data?.msg ?? data?.error_description ?? data?.message ?? "Authentication request failed.",
        500,
      ),
    );
    error.status = response.status;
    error.payload = data;
    throw error;
  }

  return data;
}

function getBearerToken(req) {
  const authorization = req.get("authorization") ?? "";
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() ?? "";
}

async function authenticateRequest(req) {
  const token = getBearerToken(req);

  if (!token) {
    const error = new Error("Sign in required.");
    error.status = 401;
    throw error;
  }

  const user = await supabaseAuthRequest("/user", {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
  });

  const normalizedUser = normalizeSupabaseUser(user);
  if (!normalizedUser.id) {
    const error = new Error("Invalid session.");
    error.status = 401;
    throw error;
  }

  return normalizedUser;
}

function requireAdmin(req, res) {
  if (isAdminAuthorized(req)) {
    return true;
  }

  res.status(401).json({ error: "Admin key required." });
  return false;
}

function createLeadFromRequest(req) {
  const body = req.body ?? {};
  const email = cleanString(body.email, 254).toLowerCase();
  const utm = getUtm(body);

  if (!emailPattern.test(email)) {
    return {
      error: {
        status: 400,
        payload: { error: "A valid email address is required." },
      },
    };
  }

  return {
    lead: {
      id: randomUUID(),
      email,
      templateTitle: cleanString(body.templateTitle, 160),
      templatePath: cleanString(body.templatePath, 240),
      landingPath: cleanString(body.landingPath, 240),
      downloadedAt: cleanString(body.downloadedAt, 80) || new Date().toISOString(),
      submittedAt: new Date().toISOString(),
      referrer: cleanString(body.referrer, 500),
      ...utm,
      userAgent: cleanString(req.get("user-agent"), 500),
    },
  };
}

function createAnalyticsEventFromRequest(req) {
  const body = req.body ?? {};
  const eventName = cleanString(body.eventName, 80);
  const utm = getUtm(body);

  if (!eventName) {
    return {
      error: {
        status: 400,
        payload: { error: "Event name is required." },
      },
    };
  }

  return {
    event: {
      id: randomUUID(),
      eventName,
      path: cleanString(body.path, 240),
      templateTitle: cleanString(body.templateTitle, 160),
      templatePath: cleanString(body.templatePath, 240),
      referrer: cleanString(body.referrer, 500),
      ...utm,
      metadata: cleanMetadata(body.metadata),
      userAgent: cleanString(req.get("user-agent"), 500),
      occurredAt: cleanString(body.occurredAt, 80) || new Date().toISOString(),
    },
  };
}

function createDocumentFromRequest(req, user) {
  const body = req.body ?? {};
  const title = cleanString(body.title, 180);
  const contract = cleanJsonValue(body.contract, {});
  const sections = cleanJsonValue(body.sections, []);
  const signers = cleanJsonValue(body.signers, []);
  const clauses = cleanJsonValue(body.clauses, {});
  const auditEvents = cleanJsonValue(body.auditEvents, []);
  const templateValues = cleanJsonValue(body.templateValues, {});

  if (!title) {
    return {
      error: {
        status: 400,
        payload: { error: "Document title is required." },
      },
    };
  }

  if (!contract || typeof contract !== "object" || Array.isArray(contract)) {
    return {
      error: {
        status: 400,
        payload: { error: "Contract data is required." },
      },
    };
  }

  return {
    document: {
      id: cleanString(body.id, 80),
      userId: user.id,
      title,
      templateTitle: cleanString(body.templateTitle, 180),
      templatePath: cleanString(body.templatePath, 240),
      status: cleanString(body.status, 60) || "draft",
      contract,
      sections: Array.isArray(sections) ? sections : [],
      signers: Array.isArray(signers) ? signers : [],
      clauses: clauses && typeof clauses === "object" && !Array.isArray(clauses) ? clauses : {},
      auditEvents: Array.isArray(auditEvents) ? auditEvents : [],
      templateValues:
        templateValues && typeof templateValues === "object" && !Array.isArray(templateValues)
          ? templateValues
          : {},
    },
  };
}

function sendApiError(res, error) {
  const status = Number(error?.status ?? 500);
  res.status(status >= 400 && status < 600 ? status : 500).json({
    error: cleanString(error?.message, 500) || "Server error.",
  });
}

function incrementCount(map, key) {
  const label = key || "Unknown";
  map.set(label, (map.get(label) ?? 0) + 1);
}

function topCounts(map, limit = 8) {
  return [...map.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([label, count]) => ({ label, count }));
}

function buildAnalyticsSummary(events) {
  const pathCounts = new Map();
  const templateCounts = new Map();
  const totalPageViews = events.filter((event) => event.eventName === "page_view")
    .length;
  const totalDownloads = events.filter(
    (event) => event.eventName === "template_pdf_downloaded",
  ).length;
  const totalLeadCaptures = events.filter(
    (event) => event.eventName === "lead_captured",
  ).length;

  for (const event of events) {
    if (event.eventName === "page_view") {
      incrementCount(pathCounts, event.path);
    }

    if (event.templateTitle) {
      incrementCount(templateCounts, event.templateTitle);
    }
  }

  return {
    storage: getStorageInfo(),
    totalEvents: events.length,
    totalPageViews,
    totalDownloads,
    totalLeadCaptures,
    topPaths: topCounts(pathCounts),
    topTemplates: topCounts(templateCounts),
    recentEvents: events.slice(0, 20),
  };
}

export function registerApiRoutes(app) {
  app.get("/api/auth/config", (_req, res) => {
    res.json({ enabled: hasAuthConfig() });
  });

  app.post("/api/auth/signup", async (req, res) => {
    try {
      const email = cleanString(req.body?.email, 254).toLowerCase();
      const password = cleanString(req.body?.password, 200);

      if (!emailPattern.test(email) || password.length < 8) {
        res.status(400).json({
          error: "Enter a valid email and a password with at least 8 characters.",
        });
        return;
      }

      const payload = await supabaseAuthRequest("/signup", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      const session = normalizeSupabaseSession(payload);
      res.status(201).json({
        session,
        user: normalizeSupabaseUser(payload?.user),
        confirmationRequired: !session,
      });
    } catch (error) {
      sendApiError(res, error);
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const email = cleanString(req.body?.email, 254).toLowerCase();
      const password = cleanString(req.body?.password, 200);

      if (!emailPattern.test(email) || !password) {
        res.status(400).json({ error: "Email and password are required." });
        return;
      }

      const payload = await supabaseAuthRequest("/token?grant_type=password", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      const session = normalizeSupabaseSession(payload);

      if (!session) {
        res.status(401).json({ error: "Could not create a session." });
        return;
      }

      res.json({ session });
    } catch (error) {
      sendApiError(res, error);
    }
  });

  app.post("/api/auth/refresh", async (req, res) => {
    try {
      const refreshToken = cleanString(req.body?.refreshToken, 5000);

      if (!refreshToken) {
        res.status(400).json({ error: "Refresh token is required." });
        return;
      }

      const payload = await supabaseAuthRequest("/token?grant_type=refresh_token", {
        method: "POST",
        body: JSON.stringify({ refresh_token: refreshToken }),
      });
      const session = normalizeSupabaseSession(payload);

      if (!session) {
        res.status(401).json({ error: "Could not refresh the session." });
        return;
      }

      res.json({ session });
    } catch (error) {
      sendApiError(res, error);
    }
  });

  app.get("/api/auth/user", async (req, res) => {
    try {
      const user = await authenticateRequest(req);
      res.json({ user });
    } catch (error) {
      sendApiError(res, error);
    }
  });

  app.post("/api/auth/logout", async (req, res) => {
    try {
      const token = getBearerToken(req);

      if (token && hasAuthConfig()) {
        await supabaseAuthRequest("/logout", {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        });
      }

      res.status(204).send();
    } catch (error) {
      sendApiError(res, error);
    }
  });

  app.get("/api/documents", async (req, res) => {
    try {
      const user = await authenticateRequest(req);
      const documents = await listDocuments(user.id);
      res.json({ documents, storage: getDocumentStorageInfo() });
    } catch (error) {
      sendApiError(res, error);
    }
  });

  app.post("/api/documents", async (req, res) => {
    try {
      const user = await authenticateRequest(req);
      const result = createDocumentFromRequest(req, user);
      if (result.error) {
        res.status(result.error.status).json(result.error.payload);
        return;
      }

      const document = await saveDocument(result.document);
      await saveAnalyticsEvent({
        id: randomUUID(),
        eventName: "document_saved",
        path: cleanString(req.body?.templatePath, 240) || cleanString(req.body?.template_path, 240),
        templateTitle: cleanString(req.body?.templateTitle, 160),
        templatePath: cleanString(req.body?.templatePath, 240),
        referrer: cleanString(req.get("referer"), 500),
        utmSource: "",
        utmMedium: "",
        utmCampaign: "",
        utmTerm: "",
        utmContent: "",
        metadata: { documentId: document.id, userId: user.id },
        userAgent: cleanString(req.get("user-agent"), 500),
        occurredAt: new Date().toISOString(),
      });
      res.status(201).json({ document, storage: getDocumentStorageInfo() });
    } catch (error) {
      sendApiError(res, error);
    }
  });

  app.get("/api/documents/:id", async (req, res) => {
    try {
      const user = await authenticateRequest(req);
      const document = await getDocument(user.id, cleanString(req.params.id, 80));

      if (!document) {
        res.status(404).json({ error: "Document not found." });
        return;
      }

      res.json({ document, storage: getDocumentStorageInfo() });
    } catch (error) {
      sendApiError(res, error);
    }
  });

  app.delete("/api/documents/:id", async (req, res) => {
    try {
      const user = await authenticateRequest(req);
      const deleted = await deleteDocument(user.id, cleanString(req.params.id, 80));

      if (!deleted) {
        res.status(404).json({ error: "Document not found." });
        return;
      }

      res.status(204).send();
    } catch (error) {
      sendApiError(res, error);
    }
  });

  app.post("/api/leads", async (req, res, next) => {
    try {
      const result = createLeadFromRequest(req);
      if (result.error) {
        res.status(result.error.status).json(result.error.payload);
        return;
      }

      const lead = await saveLead(result.lead);
      await saveAnalyticsEvent({
        id: randomUUID(),
        eventName: "lead_captured",
        path: lead.landingPath,
        templateTitle: lead.templateTitle,
        templatePath: lead.templatePath,
        referrer: lead.referrer,
        utmSource: lead.utmSource,
        utmMedium: lead.utmMedium,
        utmCampaign: lead.utmCampaign,
        utmTerm: lead.utmTerm,
        utmContent: lead.utmContent,
        metadata: { leadId: lead.id },
        userAgent: lead.userAgent,
        occurredAt: lead.submittedAt,
      });

      const emailDelivery = await sendEditableVersionEmail(lead);
      await saveAnalyticsEvent({
        id: randomUUID(),
        eventName: emailDelivery.sent
          ? "editable_email_sent"
          : emailDelivery.skipped
            ? "editable_email_skipped"
            : "editable_email_failed",
        path: lead.landingPath,
        templateTitle: lead.templateTitle,
        templatePath: lead.templatePath,
        referrer: lead.referrer,
        utmSource: lead.utmSource,
        utmMedium: lead.utmMedium,
        utmCampaign: lead.utmCampaign,
        utmTerm: lead.utmTerm,
        utmContent: lead.utmContent,
        metadata: {
          leadId: lead.id,
          provider: emailDelivery.provider,
          reason: emailDelivery.reason ?? "",
          sent: emailDelivery.sent,
        },
        userAgent: lead.userAgent,
        occurredAt: new Date().toISOString(),
      });

      res.status(201).json({ emailDelivery, lead });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/events", async (req, res, next) => {
    try {
      const result = createAnalyticsEventFromRequest(req);
      if (result.error) {
        res.status(result.error.status).json(result.error.payload);
        return;
      }

      const event = await saveAnalyticsEvent(result.event);
      res.status(202).json({ event });
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/leads", async (req, res, next) => {
    try {
      if (!requireAdmin(req, res)) {
        return;
      }

      const leads = await readLeads();
      res.json({ leads, storage: getStorageInfo() });
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/leads.csv", async (req, res, next) => {
    try {
      if (!requireAdmin(req, res)) {
        return;
      }

      const leads = await readLeads();
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", "attachment; filename=leads.csv");
      res.send(leadsToCsv(leads));
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/analytics", async (req, res, next) => {
    try {
      if (!requireAdmin(req, res)) {
        return;
      }

      const events = await readAnalyticsEvents(5000);
      res.json(buildAnalyticsSummary(events));
    } catch (error) {
      next(error);
    }
  });
}
