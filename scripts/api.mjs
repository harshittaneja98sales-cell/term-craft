import { randomUUID } from "node:crypto";
import { leadsToCsv, readLeads, saveLead } from "./lead-store.mjs";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function cleanString(value, maxLength = 500) {
  return String(value ?? "").trim().slice(0, maxLength);
}

function createLeadFromRequest(req) {
  const body = req.body ?? {};
  const email = cleanString(body.email, 254).toLowerCase();

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
      utmSource: cleanString(body.utm?.source ?? body.utmSource, 120),
      utmMedium: cleanString(body.utm?.medium ?? body.utmMedium, 120),
      utmCampaign: cleanString(body.utm?.campaign ?? body.utmCampaign, 160),
      utmTerm: cleanString(body.utm?.term ?? body.utmTerm, 160),
      utmContent: cleanString(body.utm?.content ?? body.utmContent, 160),
      userAgent: cleanString(req.get("user-agent"), 500),
    },
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
      res.status(201).json({ lead });
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/leads", async (_req, res, next) => {
    try {
      const leads = await readLeads();
      res.json({ leads });
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/leads.csv", async (_req, res, next) => {
    try {
      const leads = await readLeads();
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", "attachment; filename=leads.csv");
      res.send(leadsToCsv(leads));
    } catch (error) {
      next(error);
    }
  });
}
