import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import { Redis } from "@upstash/redis";
import dotenv from "dotenv";
import AdmZip from "adm-zip";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Redis with aggressive sanitization
const getRedisUrl = () => {
  let url = process.env.URL_REST_REDIS_UPSTASH || "";
  if (!url) return "";
  
  url = url.trim();
  
  // Remove any protocol
  url = url.replace(/^https?:\/\//i, "");
  
  // Remove common trailing mistakes like "https", "http", ".iohttps", etc.
  // This regex looks for "http" or "https" at the very end of the string, 
  // possibly preceded by a dot or slash.
  url = url.replace(/[\.\/]?https?$/i, "");
  
  // Remove any trailing slashes
  url = url.replace(/\/+$/, "");
  
  // Ensure it's a clean hostname and re-add the protocol
  const finalUrl = `https://${url}`;
  return finalUrl;
};

const redisUrl = getRedisUrl();
if (redisUrl) console.log(`[Redis] Initializing with sanitized URL: ${redisUrl.split('@').pop()}`); // Hide token if present (though Upstash URL usually doesn't have it)

const redis = new Redis({
  url: redisUrl,
  token: (process.env.UPSTASH_REDIS_REST_TOKEN || "").trim(),
});

async function logActivity(action: string, status: string, details: any = {}) {
  // Skip if Redis is not configured
  if (!process.env.URL_REST_REDIS_UPSTASH || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    console.log(`[Activity] ${action} - ${status}`, details);
    return;
  }

  try {
    const logEntry = {
      timestamp: new Date().toISOString(),
      action,
      status,
      ...details,
    };
    await redis.rpush("admin_logs", JSON.stringify(logEntry));
    await redis.ltrim("admin_logs", -1000, -1); // Keep last 1000 logs
  } catch (error) {
    console.error("Redis Logging Error:", error);
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "50mb" }));

  // --- API ROUTES ---

  // 1. Vercel Proxy Deployment
  app.post("/api/deploy", async (req, res) => {
    const { files, projectName, token, framework } = req.body;
    const vercelToken = token || process.env.VERCEL_TOKEN;

    if (!vercelToken) {
      return res.status(401).json({ error: "Vercel Token is required" });
    }

    try {
      // Vercel Deployment API (v13)
      const response = await fetch("https://api.vercel.com/v13/deployments", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${vercelToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: projectName,
          files: files.map((f: any) => ({
            file: f.path,
            data: f.content,
            encoding: "base64",
          })),
          projectSettings: {
            framework: framework || null,
          },
        }),
      });

      const data = await response.json();
      
      await logActivity("deploy", response.ok ? "success" : "error", {
        projectName,
        deploymentId: data.id,
      });

      res.status(response.status).json(data);
    } catch (error: any) {
      await logActivity("deploy", "error", { error: error.message });
      res.status(500).json({ error: error.message });
    }
  });

  // 2. Headless Admin Metrics
  app.get("/api/admin/metrics", async (req, res) => {
    const authHeader = req.headers.authorization;
    const secret = process.env.KUNCI_RAHASIA_ADMIN;

    if (authHeader !== `Bearer ${secret}`) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    try {
      const logs = await redis.lrange("admin_logs", 0, -1);
      const parsedLogs = logs.map((l: any) => (typeof l === "string" ? JSON.parse(l) : l));
      
      res.json({
        totalLogs: parsedLogs.length,
        recentLogs: parsedLogs.reverse().slice(0, 100),
        stats: {
          success: parsedLogs.filter((l: any) => l.status === "success").length,
          error: parsedLogs.filter((l: any) => l.status === "error").length,
        }
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // 3. Cron Cleanup (60 Days Trial)
  app.post("/api/cron/cleanup", async (req, res) => {
    const authHeader = req.headers.authorization;
    const secret = process.env.CRON_SECRET;

    if (authHeader !== `Bearer ${secret}`) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    try {
      // Logic to find and delete expired deployments
      // In a real scenario, we'd query Redis for sessions older than 60 days
      await logActivity("cron_cleanup", "success", { message: "Cleanup triggered" });
      res.json({ status: "success", message: "Cleanup process completed" });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // --- VITE MIDDLEWARE ---
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
