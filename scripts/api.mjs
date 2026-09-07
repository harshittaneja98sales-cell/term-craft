import { createHash, randomBytes, randomUUID } from "node:crypto";
import { sendEditableVersionEmail } from "./email-service.mjs";
import {
  deleteDocument,
  getDocument,
  getDocumentBySigningTokenHash,
  getDocumentStorageInfo,
  listDocuments,
  saveDocument,
  updateDocument,
} from "./document-store.mjs";
import {
  createBillingPortalSession,
  createSubscriptionCheckoutSession,
  getBillingStatus,
  getStripeConfigStatus,
  handleStripeWebhook,
} from "./stripe-service.mjs";
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

function cleanSigningToken(value) {
  const token = cleanString(value, 160);
  return /^[a-zA-Z0-9_-]{24,160}$/.test(token) ? token : "";
}

function createSigningToken() {
  return randomBytes(32).toString("base64url");
}

function hashSigningToken(token) {
  return createHash("sha256").update(token).digest("hex");
}

function getSiteUrl(req) {
  if (process.env.SITE_URL) {
    return process.env.SITE_URL.replace(/\/$/, "");
  }

  const protocol = cleanString(req.get("x-forwarded-proto"), 20) || req.protocol || "https";
  const host = cleanString(req.get("host"), 240);
  return `${protocol}://${host}`.replace(/\/$/, "");
}

function getAuthRedirectPath(req) {
  return `${getSiteUrl(req)}/dashboard`;
}

function createRedirectPath(path, redirectTo) {
  const separator = path.includes("?") ? "&" : "?";
  return `${path}${separator}redirect_to=${encodeURIComponent(redirectTo)}`;
}

function getRequestIp(req) {
  const forwardedFor = cleanString(req.get("x-forwarded-for"), 500);
  return forwardedFor.split(",")[0]?.trim() || cleanString(req.ip, 80) || "unknown";
}

function createAuditRecord(actor, action, details) {
  return {
    id: randomUUID(),
    actor: cleanString(actor, 180),
    action: cleanString(action, 180),
    details: cleanString(details, 1000),
    at: new Date().toISOString(),
  };
}

function getDocumentSigningStatus(signers, fallback = "Draft") {
  const signerList = Array.isArray(signers) ? signers : [];
  const signedCount = signerList.filter((signer) => signer?.signedAt).length;

  if (signedCount === 0) {
    return fallback;
  }

  if (signedCount === signerList.length) {
    return "Executed";
  }

  return fallback === "Sent" || fallback === "Viewed" ? fallback : "Partially signed";
}

function createDocumentHash(document) {
  const snapshot = {
    contract: document.contract,
    sections: document.sections,
    signers: document.signers,
    status: document.status,
  };

  return createHash("sha256").update(JSON.stringify(snapshot)).digest("hex");
}

function getSigningRecipientId(document) {
  return cleanString(document?.templateValues?.signingRecipientId, 80) || "customer";
}

function isSigningLinkExpired(document) {
  const expiresAt = cleanString(document?.templateValues?.signingExpiresAt, 80);

  if (!expiresAt) {
    return false;
  }

  const expires = Date.parse(expiresAt);
  return Number.isFinite(expires) && expires < Date.now();
}

function sanitizeSharedDocument(document) {
  const { signingTokenHash, ...safeTemplateValues } = document.templateValues ?? {};

  return {
    ...document,
    userId: "",
    templateValues: safeTemplateValues,
  };
}

async function loadSigningDocument(token) {
  const cleanedToken = cleanSigningToken(token);

  if (!cleanedToken) {
    const error = new Error("Invalid signing link.");
    error.status = 400;
    throw error;
  }

  const document = await getDocumentBySigningTokenHash(hashSigningToken(cleanedToken));

  if (!document) {
    const error = new Error("Signing link not found.");
    error.status = 404;
    throw error;
  }

  if (isSigningLinkExpired(document)) {
    const error = new Error("This signing link has expired.");
    error.status = 410;
    throw error;
  }

  return document;
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

      const payload = await supabaseAuthRequest(
        createRedirectPath("/signup", getAuthRedirectPath(req)),
        {
          method: "POST",
          body: JSON.stringify({ email, password }),
        },
      );
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

  app.post("/api/auth/resend-confirmation", async (req, res) => {
    try {
      const email = cleanString(req.body?.email, 254).toLowerCase();

      if (!emailPattern.test(email)) {
        res.status(400).json({ error: "Enter a valid email address." });
        return;
      }

      await supabaseAuthRequest(
        createRedirectPath("/resend", getAuthRedirectPath(req)),
        {
          method: "POST",
          body: JSON.stringify({ email, type: "signup" }),
        },
      );

      res.json({ ok: true });
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

  app.get("/api/billing/config", (_req, res) => {
    res.json(getStripeConfigStatus());
  });

  app.get("/api/billing/status", async (req, res) => {
    try {
      const user = await authenticateRequest(req);
      const billing = await getBillingStatus(user);
      res.json({ billing, config: getStripeConfigStatus() });
    } catch (error) {
      sendApiError(res, error);
    }
  });

  app.post("/api/billing/checkout", async (req, res) => {
    try {
      const user = await authenticateRequest(req);
      const session = await createSubscriptionCheckoutSession(user);
      res.status(201).json({ url: session.url });
    } catch (error) {
      sendApiError(res, error);
    }
  });

  app.post("/api/billing/portal", async (req, res) => {
    try {
      const user = await authenticateRequest(req);
      const returnPath = cleanString(req.body?.returnPath, 240);
      const session = await createBillingPortalSession(user, returnPath);
      res.status(201).json({ url: session.url });
    } catch (error) {
      sendApiError(res, error);
    }
  });

  app.post("/api/webhooks/stripe", async (req, res) => {
    try {
      const signature = req.get("stripe-signature") ?? "";
      const event = await handleStripeWebhook(req.rawBody ?? Buffer.from(""), signature);
      res.json({ received: true, type: event.type });
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

  app.post("/api/signing-links", async (req, res) => {
    try {
      const user = await authenticateRequest(req);
      const result = createDocumentFromRequest(req, user);
      if (result.error) {
        res.status(result.error.status).json(result.error.payload);
        return;
      }

      const providerSigner = result.document.signers.find(
        (signer) => signer?.id === "provider",
      );

      if (!providerSigner?.signedAt || !providerSigner?.signatureDataUrl) {
        res.status(400).json({
          error: "Apply the provider signature before creating a client signing link.",
        });
        return;
      }

      const token = createSigningToken();
      const now = new Date();
      const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();
      const document = {
        ...result.document,
        status: "Sent",
        templateValues: {
          ...(result.document.templateValues ?? {}),
          signingCreatedAt: now.toISOString(),
          signingExpiresAt: expiresAt,
          signingRecipientId: "customer",
          signingStatus: "sent",
          signingTokenHash: hashSigningToken(token),
        },
        auditEvents: [
          createAuditRecord(
            user.email || "Sender",
            "Client signing link created",
            `Signing link created for ${result.document.contract?.customerName ?? "client"} and expires ${expiresAt}.`,
          ),
          ...(Array.isArray(result.document.auditEvents) ? result.document.auditEvents : []),
        ],
      };

      const savedDocument = await saveDocument(document);
      const url = `${getSiteUrl(req)}/sign/${token}`;

      await saveAnalyticsEvent({
        id: randomUUID(),
        eventName: "signing_link_created",
        path: cleanString(req.body?.templatePath, 240) || "/builder",
        templateTitle: cleanString(req.body?.templateTitle, 160),
        templatePath: cleanString(req.body?.templatePath, 240),
        referrer: cleanString(req.get("referer"), 500),
        utmSource: "",
        utmMedium: "",
        utmCampaign: "",
        utmTerm: "",
        utmContent: "",
        metadata: { documentId: savedDocument.id, userId: user.id },
        userAgent: cleanString(req.get("user-agent"), 500),
        occurredAt: new Date().toISOString(),
      });

      res.status(201).json({
        document: sanitizeSharedDocument(savedDocument),
        link: {
          expiresAt,
          url,
        },
        storage: getDocumentStorageInfo(),
      });
    } catch (error) {
      sendApiError(res, error);
    }
  });

  app.get("/api/signing-links/:token", async (req, res) => {
    try {
      const document = await loadSigningDocument(req.params.token);
      res.json({
        document: sanitizeSharedDocument(document),
        recipientId: getSigningRecipientId(document),
      });
    } catch (error) {
      sendApiError(res, error);
    }
  });

  app.post("/api/signing-links/:token/sign", async (req, res) => {
    try {
      const document = await loadSigningDocument(req.params.token);
      const body = req.body ?? {};
      const recipientId = getSigningRecipientId(document);
      const signerName = cleanString(body.name, 160);
      const signerTitle = cleanString(body.title, 160);
      const signerEmail = cleanString(body.email, 254).toLowerCase();
      const signatureDataUrl = cleanString(body.signatureDataUrl, 700000);
      const signatureMethod = cleanString(body.signatureMethod, 40);
      const consent = Boolean(body.consent);

      if (!signerName || !emailPattern.test(signerEmail)) {
        res.status(400).json({ error: "Signer name and valid email are required." });
        return;
      }

      if (!consent || !signatureDataUrl) {
        res.status(400).json({ error: "Electronic signature consent and signature are required." });
        return;
      }

      if (!["drawn", "typed"].includes(signatureMethod)) {
        res.status(400).json({ error: "Invalid signature method." });
        return;
      }

      if (
        !signatureDataUrl.startsWith("data:image/png") &&
        !signatureDataUrl.startsWith("data:image/svg+xml")
      ) {
        res.status(400).json({ error: "Invalid signature format." });
        return;
      }

      const signerIndex = document.signers.findIndex(
        (signer) => signer?.id === recipientId,
      );

      if (signerIndex === -1) {
        res.status(400).json({ error: "Signing recipient is not available." });
        return;
      }

      if (document.signers[signerIndex]?.signedAt) {
        res.json({
          document: sanitizeSharedDocument(document),
          status: "already_signed",
        });
        return;
      }

      const signedAt = new Date().toISOString();
      const nextSigners = document.signers.map((signer, index) =>
        index === signerIndex
          ? {
              ...signer,
              email: signerEmail,
              name: signerName,
              signedAt,
              signatureDataUrl,
              signatureMethod,
              title: signerTitle || signer.title || signer.role,
            }
          : signer,
      );
      const nextStatus = getDocumentSigningStatus(nextSigners, "Sent");
      const nextDocumentSnapshot = {
        ...document,
        signers: nextSigners,
        status: nextStatus,
      };
      const documentHash = createDocumentHash(nextDocumentSnapshot);
      const nextDocument = {
        ...nextDocumentSnapshot,
        auditEvents: [
          createAuditRecord(
            signerEmail,
            "Client countersigned",
            `Signed from ${getRequestIp(req)} using ${cleanString(req.get("user-agent"), 240)}. Document SHA-256: ${documentHash}.`,
          ),
          ...(Array.isArray(document.auditEvents) ? document.auditEvents : []),
        ],
        templateValues: {
          ...(document.templateValues ?? {}),
          signingCompletedAt: nextStatus === "Executed" ? signedAt : "",
          signingStatus: nextStatus === "Executed" ? "signed" : "partially_signed",
        },
      };

      const savedDocument = await updateDocument(nextDocument);

      await saveAnalyticsEvent({
        id: randomUUID(),
        eventName: "document_countersigned",
        path: "/sign",
        templateTitle: cleanString(document.templateTitle, 160),
        templatePath: cleanString(document.templatePath, 240),
        referrer: cleanString(req.get("referer"), 500),
        utmSource: "",
        utmMedium: "",
        utmCampaign: "",
        utmTerm: "",
        utmContent: "",
        metadata: { documentHash, documentId: document.id },
        userAgent: cleanString(req.get("user-agent"), 500),
        occurredAt: signedAt,
      });

      res.json({
        document: sanitizeSharedDocument(savedDocument),
        documentHash,
        status: "signed",
      });
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
