import express from "express";
import { createServer } from "http";
import net from "net";
import { createApiApp } from "./apiApp";
import { serveStatic, setupVite } from "./vite";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => server.close(() => resolve(true)));
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) if (await isPortAvailable(port)) return port;
  throw new Error(`No available port found starting from ${startPort}`);
}

export async function createApp(server?: ReturnType<typeof createServer>) {
  const app = createApiApp();
  if (process.env.NODE_ENV === "development") await setupVite(app, server ?? createServer(app));
  else serveStatic(app);
  return app;
}

if (process.env.NETLIFY !== "true") {
  const server = createServer();
  createApp(server).then(async app => {
    const preferredPort = parseInt(process.env.PORT || "3000");
    const port = await findAvailablePort(preferredPort);
    if (port !== preferredPort) console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
    server.on("request", app);
    server.listen(port, () => console.log(`Server running on http://localhost:${port}/`));
  }).catch(console.error);
}
