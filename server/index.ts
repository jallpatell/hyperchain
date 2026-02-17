import express, { type Request, type Response, type NextFunction } from "express";
import { createServer } from "http";
import "dotenv/config";

import { registerRoutes } from "./routes";
import { serveStatic } from "./static";

const app = express();
const httpServer = createServer(app);

/**
 * Extend IncomingMessage to store raw body
 */
declare module "http" {
  interface IncomingMessage {
    rawBody?: Buffer;
  }
}

/**
 * JSON body parser with raw body capture
 */
app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  })
);

app.use(express.urlencoded({ extended: false }));

/**
 * Logger utility
 */
export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

/**
 * API request logger middleware
 */
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;

  let capturedJsonResponse: unknown;

  const originalJson = res.json.bind(res);

  res.json = (body: unknown) => {
    capturedJsonResponse = body;
    return originalJson(body);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;

    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;

      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      log(logLine);
    }
  });

  next();
});

/**
 * Bootstrap Server
 */
(async () => {
  await registerRoutes(httpServer, app);

  /**
   * Global error handler
   */
  app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    console.error("Internal Server Error:", err);

    if (res.headersSent) {
      return next(err);
    }

    return res.status(status).json({ message });
  });

  /**
   * Setup frontend
   */
  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  /**
   * Start server (Windows-safe, IPv4-safe)
   */
  const port = parseInt(process.env.PORT || "5000", 10);

  httpServer.listen(port, "127.0.0.1", () => {
    log(`Server running at http://127.0.0.1:${port}`);
  });
})();
