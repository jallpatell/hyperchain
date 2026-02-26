
import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import { executeWorkflow, registerSSEListener, unregisterSSEListener } from "./execution";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  // --- Workflows ---
  app.get(api.workflows.list.path, async (req, res) => {
    const workflows = await storage.getWorkflows();
    res.json(workflows);
  });

  app.get(api.workflows.get.path, async (req, res) => {
    const workflow = await storage.getWorkflow(Number(req.params.id));
    if (!workflow) {
      return res.status(404).json({ message: 'Workflow not found' });
    }
    res.json(workflow);
  });

  app.post(api.workflows.create.path, async (req, res) => {
    try {
      const input = api.workflows.create.input.parse(req.body);
      const workflow = await storage.createWorkflow(input);
      res.status(201).json(workflow);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      throw err;
    }
  });

  app.put(api.workflows.update.path, async (req, res) => {
    try {
      const input = api.workflows.update.input.parse(req.body);
      const workflow = await storage.updateWorkflow(Number(req.params.id), input);
      if (!workflow) return res.status(404).json({ message: 'Workflow not found' });
      res.json(workflow);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      throw err;
    }
  });

  app.delete(api.workflows.delete.path, async (req, res) => {
    await storage.deleteWorkflow(Number(req.params.id));
    res.status(204).send();
  });

  app.post(api.workflows.execute.path, async (req, res) => {
    const workflowId = Number(req.params.id);
    const workflow = await storage.getWorkflow(workflowId);
    if (!workflow) return res.status(404).json({ message: 'Workflow not found' });

    // Extract trigger data from request body (optional)
    const triggerData = req.body?.triggerData || undefined;

    const execution = await storage.createExecution({
      workflowId,
      status: 'pending',
      data: {}
    });

    // Run in background with trigger data
    executeWorkflow(workflow, execution.id, triggerData).catch(console.error);

    res.json({ executionId: execution.id });
  });


// --- Executions ---
  app.get(api.executions.list.path, async (req, res) => {
    const workflowId = req.query.workflowId ? Number(req.query.workflowId) : undefined;
    const executions = await storage.getExecutions(workflowId);
    res.json(executions);
  });

  app.get(api.executions.get.path, async (req, res) => {
    const execution = await storage.getExecution(Number(req.params.id));
    if (!execution) return res.status(404).json({ message: 'Execution not found' });
    res.json(execution);
  });

  // SSE stream endpoint for execution progress
  app.get("/api/executions/:id/stream", (req, res) => {
    const executionId = Number(req.params.id);

    // Set up SSE headers
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
      "Access-Control-Allow-Origin": "*",
    });

    // Create a writer function that sends SSE data
    const writer = (data: string) => {
      res.write(data);
    };

    // Register listener
    registerSSEListener(executionId, writer);

    // Handle client disconnect
    req.on("close", () => {
      unregisterSSEListener(executionId, writer);
      res.end();
    });

    res.on("error", () => {
      unregisterSSEListener(executionId, writer);
      res.end();
    });
  });


  // --- Credentials ---
  app.get(api.credentials.list.path, async (req, res) => {
    const credentials = await storage.getCredentials();
    // Don't send encrypted data to frontend
    res.json(credentials.map(c => ({
      id: c.id,
      name: c.name,
      type: c.type,
      createdAt: c.createdAt,
    })));
  });

  app.post(api.credentials.create.path, async (req, res) => {
    try {
      const input = api.credentials.create.input.parse(req.body);
      const { encrypt } = await import("./crypto");
      
      // Encrypt sensitive data before storing
      const encryptedData = encrypt(JSON.parse(input.data as any));
      
      const credential = await storage.createCredential({
        ...input,
        data: encryptedData,
      });
      
      res.status(201).json({
        id: credential.id,
        name: credential.name,
        type: credential.type,
        createdAt: credential.createdAt,
      });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      throw err;
    }
  });

  app.delete(api.credentials.delete.path, async (req, res) => {
    await storage.deleteCredential(Number(req.params.id));
    res.status(204).send();
  });

  // helper that prefers a 'gmail-oauth-config' credential but falls back to env vars
  async function loadGmailOAuthConfig() {
    // look for a dedicated config credential
    const creds = await storage.getCredentials();
    const cfgCred = creds.find((c) => c.type === "gmail-oauth-config");
    if (cfgCred && cfgCred.data) {
      const { decrypt } = await import("./crypto");
      let parsed: any;
      try {
        // data is encrypted string
        parsed = JSON.parse(decrypt(cfgCred.data as string));
      } catch (err) {
        console.error("Failed to parse gmail-oauth-config data", err);
        parsed = {};
      }
      console.log("[oauth] using DB config, clientId starts with", parsed.clientId?.slice(0,10));
      return {
        clientId: parsed.clientId,
        clientSecret: parsed.clientSecret,
        redirectUri:
          parsed.redirectUri ||
          process.env.GMAIL_REDIRECT_URI ||
          "http://localhost:5000/api/oauth/gmail/callback",
      };
    }

    // fallback to environment variables
    const clientId = process.env.GMAIL_CLIENT_ID;
    const clientSecret = process.env.GMAIL_CLIENT_SECRET;
    const redirectUri = process.env.GMAIL_REDIRECT_URI || "http://localhost:5000/api/oauth/gmail/callback";
    if (clientId && clientSecret) {
      console.log("[oauth] using env config, clientId starts with", clientId?.slice(0,10));
      return { clientId, clientSecret, redirectUri };
    }

    return null;
  }

  // --- OAuth Routes ---
  app.get("/api/oauth/gmail/auth-url", async (req, res) => {
    const cfg = await loadGmailOAuthConfig();
    if (!cfg) {
      return res.status(400).json({
        message: "Gmail OAuth is not configured. Add a Gmail OAuth App credential or set GMAIL_CLIENT_ID/GMAIL_CLIENT_SECRET env vars.",
      });
    }

    const { getGmailAuthUrl } = await import("./oauth");
    const { generateToken } = await import("./crypto");
    const state = generateToken();

    // Store state in memory (in production, use Redis or database)
    const authUrl = getGmailAuthUrl(cfg, state);

    res.json({ authUrl, state });
  });

  app.post("/api/oauth/gmail/callback", async (req, res) => {
    try {
      const { code } = req.body;
      if (!code) {
        return res.status(400).json({ message: "Missing authorization code" });
      }

      const cfg = await loadGmailOAuthConfig();
      if (!cfg) {
        return res.status(400).json({
          message: "Gmail OAuth is not configured",
        });
      }

      const { exchangeGmailCode } = await import("./oauth");
      const { encrypt } = await import("./crypto");
      const tokens = await exchangeGmailCode(code, {
        clientId: cfg.clientId,
        clientSecret: cfg.clientSecret,
        redirectUri: cfg.redirectUri,
      });

      // Get user email from Gmail
      const emailResponse = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
        headers: { Authorization: `Bearer ${tokens.accessToken}` },
      });

      if (!emailResponse.ok) {
        throw new Error("Failed to get user email");
      }

      const userInfo = (await emailResponse.json()) as { email: string };

      // Store credential
      const credential = await storage.createCredential({
        name: `Gmail - ${userInfo.email}`,
        type: "gmail-oauth",
        data: encrypt({
          email: userInfo.email,
          tokens,
          clientId,
          clientSecret,
        }),
      });

      res.json({
        credentialId: credential.id,
        email: userInfo.email,
        message: "Gmail account connected successfully",
      });
    } catch (err) {
      console.error("[oauth] Gmail callback error:", err);
      res.status(500).json({
        message: err instanceof Error ? err.message : "OAuth redirect failed",
      });
    }
  });

  // Handle OAuth callback from Google (GET request with code in query params)
  app.get("/api/oauth/gmail/callback", async (req, res) => {
    try {
      const { code, error, state } = req.query;

      if (error) {
        return res.status(400).send(`
          <html>
            <body>
              <h1>Authentication Failed</h1>
              <p>Error: ${error}</p>
              <p>You can close this window and try again.</p>
            </body>
          </html>
        `);
      }

      if (!code) {
        return res.status(400).send(`
          <html>
            <body>
              <h1>Authentication Failed</h1>
              <p>No authorization code received.</p>
            </body>
          </html>
        `);
      }

      const cfg = await loadGmailOAuthConfig();
      if (!cfg) {
        return res.status(400).send(`
          <html>
            <body>
              <h1>Configuration Error</h1>
              <p>Gmail OAuth is not configured on the server.</p>
            </body>
          </html>
        `);
      }

      const { exchangeGmailCode } = await import("./oauth");
      const { encrypt } = await import("./crypto");
      const tokens = await exchangeGmailCode(String(code), {
        clientId: cfg.clientId,
        clientSecret: cfg.clientSecret,
        redirectUri: cfg.redirectUri,
      });

      // Get user email from Gmail
      const emailResponse = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
        headers: { Authorization: `Bearer ${tokens.accessToken}` },
      });

      if (!emailResponse.ok) {
        throw new Error("Failed to get user email");
      }

      const userInfo = (await emailResponse.json()) as { email: string };

      // Store credential
      const credential = await storage.createCredential({
        name: `Gmail - ${userInfo.email}`,
        type: "gmail-oauth",
        data: encrypt({
          email: userInfo.email,
          tokens,
          clientId,
          clientSecret,
        }),
      });

      // Redirect back to credentials page with success message
      return res.redirect(
        `/credentials?success=true&credentialId=${credential.id}&email=${encodeURIComponent(userInfo.email)}`
      );
    } catch (err) {
      console.error("[oauth] Gmail callback error:", err);
      const errorMsg = err instanceof Error ? err.message : "Unknown error";
      return res.status(500).send(`
        <html>
          <body>
            <h1>Authentication Failed</h1>
            <p>Error: ${errorMsg}</p>
            <p><a href="/credentials">Return to Credentials</a></p>
          </body>
        </html>
      `);
    }
  });


  // Seed Data
  if ((await storage.getWorkflows()).length === 0) {
    console.log("Seeding database with example workflows...");

    // Example 1: Simple Webhook to HTTP
    await storage.createWorkflow({
      name: "Simple Webhook to HTTP",
      description: "Trigger a request when webhook is called",
      isActive: true,
      nodes: [
        {
          id: "node-1",
          type: "webhook",
          position: { x: 100, y: 100 },
          data: { path: "/my-webhook" }
        },
        {
          id: "node-2",
          type: "http-request",
          position: { x: 400, y: 100 },
          data: { url: "https://jsonplaceholder.typicode.com/todos/1", method: "GET" }
        }
      ],
      edges: [
        { id: "edge-1", source: "node-1", target: "node-2" }
      ]
    });

    // Example 2: Webhook → Code Transformation → Email
    await storage.createWorkflow({
      name: "Data Processing Pipeline",
      description: "Process data with code, then send email notification",
      isActive: true,
      nodes: [
        {
          id: "webhook",
          type: "webhook",
          position: { x: 50, y: 150 },
          data: {}
        },
        {
          id: "code",
          type: "code",
          position: { x: 320, y: 150 },
          data: {
            code: `
const data = $inputs.webhook;
const processed = {
  timestamp: new Date().toISOString(),
  itemCount: Array.isArray(data.body?.items) ? data.body.items.length : 0,
  summary: "Data processed successfully"
};
return processed;
            `
          }
        },
        {
          id: "email",
          type: "email",
          position: { x: 590, y: 150 },
          data: {
            to: "user@example.com",
            subject: "Workflow Notification: {{code.summary}}",
            body: "Processed {{code.itemCount}} items at {{code.timestamp}}"
          }
        }
      ],
      edges: [
        { id: "edge-1", source: "webhook", target: "code" },
        { id: "edge-2", source: "code", target: "email" }
      ]
    });

    // Example 3: Webhook → HTTP → AI Chat
    await storage.createWorkflow({
      name: "AI Content Generator",
      description: "Fetch content and enhance it with AI",
      isActive: true,
      nodes: [
        {
          id: "webhook",
          type: "webhook",
          position: { x: 50, y: 300 },
          data: {}
        },
        {
          id: "http",
          type: "http-request",
          position: { x: 320, y: 300 },
          data: {
            url: "https://jsonplaceholder.typicode.com/posts/1",
            method: "GET"
          }
        },
        {
          id: "ai",
          type: "ai-chat",
          position: { x: 590, y: 300 },
          data: {
            prompt: "Summarize this in 2 sentences: {{http.body.body}}",
            model: "claude-3-haiku-20250101"
          }
        }
      ],
      edges: [
        { id: "edge-1", source: "webhook", target: "http" },
        { id: "edge-2", source: "http", target: "ai" }
      ]
    });
  }

  return httpServer;
}
