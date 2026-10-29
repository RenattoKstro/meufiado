import fs from "node:fs";
import path from "node:path";

const outputPath = path.resolve("dist/index.js");
const runtime = `import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const publishRoot = path.resolve(process.env.STATIC_PUBLISH_DIR || "dist/public");
const indexPath = path.join(publishRoot, "index.html");
const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

function requestedFile(requestUrl) {
  try {
    const pathname = decodeURIComponent(new URL(requestUrl || "/", "http://localhost").pathname);
    const relativePath = pathname.replace(/^\\/+/, "");
    const candidate = path.resolve(publishRoot, relativePath);
    if (candidate !== publishRoot && !candidate.startsWith(publishRoot + path.sep)) return null;
    return candidate;
  } catch {
    return null;
  }
}

const server = http.createServer((request, response) => {
  const candidate = requestedFile(request.url);
  const filePath = candidate && fs.existsSync(candidate) && fs.statSync(candidate).isFile() ? candidate : indexPath;
  if (!fs.existsSync(filePath)) {
    response.writeHead(503, { "content-type": "text/plain; charset=utf-8" });
    response.end("Static build not found");
    return;
  }
  const extension = path.extname(filePath).toLowerCase();
  response.writeHead(200, {
    "content-type": contentTypes[extension] || "application/octet-stream",
    "cache-control": filePath === indexPath ? "no-cache" : "public, max-age=31536000, immutable",
  });
  fs.createReadStream(filePath).pipe(response);
});

const port = Number(process.env.PORT || 3000);
server.listen(port, "0.0.0.0", () => console.log("Meu Fiado static server listening on port " + port));
`;

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, runtime, "utf8");
console.log(`Wrote ${path.relative(process.cwd(), outputPath)}`);
