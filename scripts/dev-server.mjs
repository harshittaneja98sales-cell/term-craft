import fs from "node:fs/promises";
import express from "express";
import { createServer as createViteServer } from "vite";
import { registerApiRoutes } from "./api.mjs";

const host = "127.0.0.1";
const port = Number(process.env.PORT ?? 5173);

const app = express();
app.use(express.json({ limit: "64kb" }));
registerApiRoutes(app);

const vite = await createViteServer({
  appType: "custom",
  server: {
    host,
    middlewareMode: true,
  },
});

app.use(vite.middlewares);

app.use(async (req, res, next) => {
  try {
    const template = await fs.readFile("index.html", "utf8");
    const html = await vite.transformIndexHtml(req.originalUrl, template);
    res.status(200).set({ "Content-Type": "text/html" }).end(html);
  } catch (error) {
    vite.ssrFixStacktrace(error);
    next(error);
  }
});

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({ error: "Server error." });
});

app.listen(port, host, () => {
  console.log(`Term Craft dev server running at http://${host}:${port}`);
});
