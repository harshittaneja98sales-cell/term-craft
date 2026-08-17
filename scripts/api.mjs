import { randomUUID } from "node:crypto";
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
      res.status(201).json({ lead });
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
