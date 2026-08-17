import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { registerApiRoutes } from "./api.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.resolve(__dirname, "..", "dist");
const host = process.env.HOST ?? "127.0.0.1";
const port = Number(process.env.PORT ?? 4173);

const app = express();
app.use(express.json({ limit: "64kb" }));
registerApiRoutes(app);

app.use(express.static(distDir, { extensions: ["html"] }));

app.use((_req, res) => {
  res.sendFile(path.join(distDir, "index.html"));
});

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({ error: "Server error." });
});

app.listen(port, host, () => {
  console.log(`Term Craft server running at http://${host}:${port}`);
});
