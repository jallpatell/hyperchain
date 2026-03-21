import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import { executeWorkflow, registerSSEListener, unregisterSSEListener } from "./execution";
import crypto from "crypto";

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
    });

    // Run in background with trigger data
    executeWorkflow(workflow, execution.id, triggerData).catch(console.error);

    res.json({ executionId: execution.id });
  });


// --- Executions ---
  app.get(api.executions.list.path, async (req, res) => {
    const workflowId = req.query.workflowId ? Number(req.query.workflowId) : undefined;
    const cursor = req.query.cursor ? Number(req.query.cursor) : undefined;
    const limit = req.query.limit ? Math.min(Number(req.query.limit), 100) : 50; // Safety limit
    
    const executions = await storage.getExecutions(workflowId, cursor, limit);
    res.json(executions);
  });

  app.get(api.executions.get.path, async (req, res) => {
    const executionDetail = await storage.getExecutionDetail(Number(req.params.id));
    if (!executionDetail) return res.status(404).json({ message: 'Execution not found' });
    res.json(executionDetail);
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
    const creds = await storage.getCredentials();
    const cfgCred = creds.find((c) => c.type === "gmail-oauth-config");
    if (cfgCred && cfgCred.data) {
      const { decrypt } = await import("./crypto");
      let parsed: any;
      try {
        const decryptedStr = decrypt(cfgCred.data as string, false);
        parsed = JSON.parse(decryptedStr);
      } catch (err) {
        console.error("Failed to parse gmail-oauth-config data", err);
        parsed = {};
      }
      return {
        clientId: parsed.clientId,
        clientSecret: parsed.clientSecret,
        redirectUri: process.env.GMAIL_REDIRECT_URI || "http://localhost:5000/api/oauth/gmail/callback",
      };
    }
    const clientId = process.env.GMAIL_CLIENT_ID;
    const clientSecret = process.env.GMAIL_CLIENT_SECRET;
    const redirectUri = process.env.GMAIL_REDIRECT_URI || "http://localhost:5000/api/oauth/gmail/callback";
    if (clientId && clientSecret) return { clientId, clientSecret, redirectUri };
    return null;
  }

  // helper: load Google OAuth config for Drive/Sheets (uses same Google app)
  async function loadGoogleOAuthConfig(service: 'drive' | 'sheets') {
    const clientId = process.env.GOOGLE_CLIENT_ID || process.env.GMAIL_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET || process.env.GMAIL_CLIENT_SECRET;
    const redirectUri = process.env[`GOOGLE_${service.toUpperCase()}_REDIRECT_URI`]
      || `http://localhost:5000/api/oauth/google/${service}/callback`;
    if (clientId && clientSecret) return { clientId, clientSecret, redirectUri };
    return null;
  }

  // helper: load Slack OAuth config
  async function loadSlackOAuthConfig() {
    const clientId = process.env.SLACK_CLIENT_ID;
    const clientSecret = process.env.SLACK_CLIENT_SECRET;
    const redirectUri = process.env.SLACK_REDIRECT_URI || "http://localhost:5000/api/oauth/slack/callback";
    if (clientId && clientSecret) return { clientId, clientSecret, redirectUri };
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
          clientId: cfg.clientId,
          clientSecret: cfg.clientSecret,
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
          clientId: cfg.clientId,
          clientSecret: cfg.clientSecret,
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

  // --- Google Drive OAuth ---
  app.get("/api/oauth/google/drive/auth-url", async (req, res) => {
    const cfg = await loadGoogleOAuthConfig('drive');
    if (!cfg) return res.status(400).json({ message: "Google OAuth not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET." });
    const { getGoogleAuthUrl } = await import("./oauth");
    const { generateToken } = await import("./crypto");
    res.json({ authUrl: getGoogleAuthUrl(cfg, generateToken(), 'drive') });
  });

  app.get("/api/oauth/google/drive/callback", async (req, res) => {
    try {
      const { code, error } = req.query;
      if (error) return res.redirect(`/credentials?error=${error}`);
      if (!code) return res.redirect('/credentials?error=no_code');
      const cfg = await loadGoogleOAuthConfig('drive');
      if (!cfg) return res.redirect('/credentials?error=not_configured');
      const { exchangeGoogleServiceCode, getGoogleUserEmail } = await import("./oauth");
      const { encrypt } = await import("./crypto");
      const tokens = await exchangeGoogleServiceCode(String(code), cfg);
      const email = await getGoogleUserEmail(tokens.accessToken);
      await storage.createCredential({
        name: `Google Drive - ${email}`,
        type: 'google-drive',
        data: encrypt({ email, tokens, clientId: cfg.clientId, clientSecret: cfg.clientSecret }),
      });
      return res.redirect(`/credentials?success=true&email=${encodeURIComponent(email)}&service=Google+Drive`);
    } catch (err) {
      console.error('[oauth] Google Drive callback error:', err);
      return res.redirect(`/credentials?error=${encodeURIComponent(err instanceof Error ? err.message : 'unknown')}`);
    }
  });

  // --- Google Sheets OAuth ---
  app.get("/api/oauth/google/sheets/auth-url", async (req, res) => {
    const cfg = await loadGoogleOAuthConfig('sheets');
    if (!cfg) return res.status(400).json({ message: "Google OAuth not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET." });
    const { getGoogleAuthUrl } = await import("./oauth");
    const { generateToken } = await import("./crypto");
    res.json({ authUrl: getGoogleAuthUrl(cfg, generateToken(), 'sheets') });
  });

  app.get("/api/oauth/google/sheets/callback", async (req, res) => {
    try {
      const { code, error } = req.query;
      if (error) return res.redirect(`/credentials?error=${error}`);
      if (!code) return res.redirect('/credentials?error=no_code');
      const cfg = await loadGoogleOAuthConfig('sheets');
      if (!cfg) return res.redirect('/credentials?error=not_configured');
      const { exchangeGoogleServiceCode, getGoogleUserEmail } = await import("./oauth");
      const { encrypt } = await import("./crypto");
      const tokens = await exchangeGoogleServiceCode(String(code), cfg);
      const email = await getGoogleUserEmail(tokens.accessToken);
      await storage.createCredential({
        name: `Google Sheets - ${email}`,
        type: 'google-sheets',
        data: encrypt({ email, tokens, clientId: cfg.clientId, clientSecret: cfg.clientSecret }),
      });
      return res.redirect(`/credentials?success=true&email=${encodeURIComponent(email)}&service=Google+Sheets`);
    } catch (err) {
      console.error('[oauth] Google Sheets callback error:', err);
      return res.redirect(`/credentials?error=${encodeURIComponent(err instanceof Error ? err.message : 'unknown')}`);
    }
  });

  // --- Slack OAuth ---
  app.get("/api/oauth/slack/auth-url", async (req, res) => {
    const cfg = await loadSlackOAuthConfig();
    if (!cfg) return res.status(400).json({ message: "Slack OAuth not configured. Set SLACK_CLIENT_ID and SLACK_CLIENT_SECRET." });
    const { getSlackAuthUrl } = await import("./oauth");
    const { generateToken } = await import("./crypto");
    res.json({ authUrl: getSlackAuthUrl(cfg, generateToken()) });
  });

  app.get("/api/oauth/slack/callback", async (req, res) => {
    try {
      const { code, error } = req.query;
      if (error) return res.redirect(`/credentials?error=${error}`);
      if (!code) return res.redirect('/credentials?error=no_code');
      const cfg = await loadSlackOAuthConfig();
      if (!cfg) return res.redirect('/credentials?error=not_configured');
      const { exchangeSlackCode } = await import("./oauth");
      const { encrypt } = await import("./crypto");
      const result = await exchangeSlackCode(String(code), cfg);
      await storage.createCredential({
        name: `Slack - ${result.teamName}`,
        type: 'slack',
        data: encrypt({ accessToken: result.accessToken, teamName: result.teamName, botUserId: result.botUserId }),
      });
      return res.redirect(`/credentials?success=true&email=${encodeURIComponent(result.teamName)}&service=Slack`);
    } catch (err) {
      console.error('[oauth] Slack callback error:', err);
      return res.redirect(`/credentials?error=${encodeURIComponent(err instanceof Error ? err.message : 'unknown')}`);
    }
  });

  // --- Settings Routes ---
  app.get("/api/settings", async (req, res) => {
    try {
      const userId = req.headers['x-user-id'] as string || 'default-user';
      
      let settings = await storage.getUserSettings(userId);
      
      if (!settings) {
        const { generateToken } = await import("./crypto");
        settings = await storage.createUserSettings({
          userId,
          webhookSecret: generateToken(),
          defaultTimeout: 30,
          defaultRetryAttempts: 0,
          defaultRetryDelay: 1000,
        });
      }
      
      res.json(settings);
    } catch (err) {
      console.error('[settings] Get error:', err);
      res.status(500).json({ message: 'Failed to load settings' });
    }
  });

  app.put("/api/settings", async (req, res) => {
    try {
      const userId = req.headers['x-user-id'] as string || 'default-user';
      const updates = req.body;
      
      const settings = await storage.updateUserSettings(userId, updates);
      res.json(settings);
    } catch (err) {
      console.error('[settings] Update error:', err);
      res.status(500).json({ message: 'Failed to update settings' });
    }
  });

  app.post("/api/settings/webhook-secret", async (req, res) => {
    try {
      const userId = req.headers['x-user-id'] as string || 'default-user';
      const { generateToken } = await import("./crypto");
      
      const settings = await storage.updateUserSettings(userId, {
        webhookSecret: generateToken(),
      });
      
      res.json({ webhookSecret: settings.webhookSecret });
    } catch (err) {
      console.error('[settings] Regenerate secret error:', err);
      res.status(500).json({ message: 'Failed to regenerate webhook secret' });
    }
  });

  app.get("/api/settings/api-keys", async (req, res) => {
    try {
      const userId = req.headers['x-user-id'] as string || 'default-user';
      const keys = await storage.getApiKeys(userId);
      
      const sanitized = keys.map(k => ({
        id: k.id,
        name: k.name,
        keyPrefix: k.keyPrefix,
        lastUsedAt: k.lastUsedAt,
        createdAt: k.createdAt,
      }));
      
      res.json(sanitized);
    } catch (err) {
      console.error('[api-keys] List error:', err);
      res.status(500).json({ message: 'Failed to load API keys' });
    }
  });

  app.post("/api/settings/api-keys", async (req, res) => {
    try {
      const userId = req.headers['x-user-id'] as string || 'default-user';
      const { name } = req.body;
      
      if (!name) {
        return res.status(400).json({ message: 'Name is required' });
      }
      
      const keyValue = `hc_${crypto.randomBytes(32).toString('hex')}`;
      const keyPrefix = keyValue.substring(0, 10);
      const hashedKey = crypto.createHash('sha256').update(keyValue).digest('hex');
      
      const apiKey = await storage.createApiKey({
        userId,
        name,
        key: hashedKey,
        keyPrefix,
      });
      
      res.json({
        key: keyValue,
        apiKey: {
          id: apiKey.id,
          name: apiKey.name,
          keyPrefix: apiKey.keyPrefix,
          lastUsedAt: apiKey.lastUsedAt,
          createdAt: apiKey.createdAt,
        },
      });
    } catch (err) {
      console.error('[api-keys] Create error:', err);
      res.status(500).json({ message: 'Failed to create API key' });
    }
  });

  app.delete("/api/settings/api-keys/:id", async (req, res) => {
    try {
      await storage.deleteApiKey(Number(req.params.id));
      res.status(204).send();
    } catch (err) {
      console.error('[api-keys] Delete error:', err);
      res.status(500).json({ message: 'Failed to delete API key' });
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
