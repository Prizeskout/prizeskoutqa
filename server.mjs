/**
 * Node.js HTTP server for PipeOps deployment.
 * Wraps the TanStack Start / Cloudflare Worker fetch handler for Node.js.
 * Static assets are served directly; everything else goes through the SSR handler.
 */

import { createServer } from "node:http";
import { createReadStream, statSync } from "node:fs";
import { join, extname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const STATIC_DIR = join(__dirname, "dist", "client");
const PORT = parseInt(process.env.PORT ?? "3000", 10);

// Import the compiled SSR worker handler
const { default: worker } = await import("./dist/server/index.js");

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".mjs": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".json": "application/json",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".otf": "font/otf",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".pdf": "application/pdf",
  ".txt": "text/plain; charset=utf-8",
};

function mime(filepath) {
  return MIME[extname(filepath).toLowerCase()] ?? "application/octet-stream";
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);

  // The finalized landing-page artifact is intentionally served verbatim at
  // the public root. Application routes continue through the SSR handler.
  if (
    (req.method === "GET" || req.method === "HEAD") &&
    (url.pathname === "/" || url.pathname === "/index.html")
  ) {
    const landingPath = join(STATIC_DIR, "prizeskout-landing.html");
    try {
      const stat = statSync(landingPath);
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.setHeader("Content-Length", stat.size);
      res.setHeader("Cache-Control", "no-cache, must-revalidate");
      res.setHeader("X-PrizeSkout-Landing", "finalized-preview-20260825");
      if (req.method === "HEAD") {
        res.end();
      } else {
        createReadStream(landingPath).pipe(res);
      }
      return;
    } catch {
      // Fall through to SSR if the artifact is missing from the build.
    }
  }

  // --- Static file serving ---
  const staticPath = join(STATIC_DIR, url.pathname);
  try {
    const stat = statSync(staticPath);
    if (stat.isFile()) {
      const isAsset = url.pathname.startsWith("/assets/");
      res.setHeader("Content-Type", mime(staticPath));
      res.setHeader("Content-Length", stat.size);
      res.setHeader(
        "Cache-Control",
        isAsset ? "public, max-age=31536000, immutable" : "public, max-age=3600"
      );
      createReadStream(staticPath).pipe(res);
      return;
    }
  } catch {
    // Not a static file — fall through to SSR
  }

  // --- SSR via the Worker fetch handler ---
  const headers = new Headers();
  for (const [key, val] of Object.entries(req.headers)) {
    if (val !== undefined) {
      headers.set(key, Array.isArray(val) ? val.join(", ") : val);
    }
  }

  const hasBody = req.method !== "GET" && req.method !== "HEAD";
  const bodyInit = hasBody
    ? new ReadableStream({
        start(ctrl) {
          req.on("data", (chunk) => ctrl.enqueue(chunk));
          req.on("end", () => ctrl.close());
          req.on("error", (err) => ctrl.error(err));
        },
      })
    : undefined;

  const request = new Request(url.toString(), {
    method: req.method,
    headers,
    body: bodyInit,
    // required for Node.js 18+ streaming body
    ...(hasBody ? { duplex: "half" } : {}),
  });

  try {
    const response = await worker.fetch(request, process.env);

    res.statusCode = response.status;
    res.statusMessage = response.statusText ?? "";

    response.headers.forEach((value, key) => {
      // Skip headers that Node.js sets automatically
      if (key.toLowerCase() !== "transfer-encoding") {
        res.setHeader(key, value);
      }
    });

    if (response.body) {
      const reader = response.body.getReader();
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          res.write(value);
        }
      } finally {
        reader.releaseLock();
      }
    }

    res.end();
  } catch (err) {
    console.error("[server] SSR error:", err);
    if (!res.headersSent) {
      res.statusCode = 500;
      res.setHeader("Content-Type", "text/plain");
    }
    res.end("Internal Server Error");
  }
});

server.listen(PORT, () => {
  console.log(`PrizeSkout server listening on :${PORT}`);
});
