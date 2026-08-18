import express from "express";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { registerApiRoutes } from "./api.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.resolve(__dirname, "..", "dist");
const host = process.env.HOST ?? "0.0.0.0";
const port = Number(process.env.PORT ?? 4173);

const app = express();
app.use(express.json({ limit: "64kb" }));
registerApiRoutes(app);

app.use((req, res, next) => {
  if (req.method !== "GET" && req.method !== "HEAD") {
    next();
    return;
  }

  const normalizedPath =
    req.path === "/" ? "/" : req.path.replace(/\/+$/, "");
  const relativePath =
    normalizedPath === "/"
      ? "index.html"
      : path.join(...normalizedPath.slice(1).split("/"), "index.html");
  const filePath = path.resolve(distDir, relativePath);
  const rootIndexPath = path.join(distDir, "index.html");

  if (
    filePath !== rootIndexPath &&
    !filePath.startsWith(`${distDir}${path.sep}`)
  ) {
    next();
    return;
  }

  if (fs.existsSync(filePath)) {
    res.sendFile(filePath);
    return;
  }

  next();
});

app.use(express.static(distDir, { extensions: ["html"], redirect: false }));

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
