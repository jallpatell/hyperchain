
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
    res.json(credentials);
  });

  app.post(api.credentials.create.path, async (req, res) => {
    try {
      const input = api.credentials.create.input.parse(req.body);
      const credential = await storage.createCredential(input);
      res.status(201).json(credential);
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


  // Seed Data
  if ((await storage.getWorkflows()).length === 0) {
    console.log("Seeding database with example workflows...");
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

    await storage.createWorkflow({
      name: "AI Summarizer",
      description: "Summarize text using AI",
      isActive: true,
      nodes: [
        {
          id: "node-1",
          type: "webhook",
          position: { x: 100, y: 100 },
          data: { path: "/summarize" }
        },
        {
          id: "node-2",
          type: "ai-chat",
          position: { x: 400, y: 100 },
          data: { prompt: "Summarize the following text: {{node-1.body.text}}" }
        }
      ],
      edges: [
        { id: "edge-1", source: "node-1", target: "node-2" }
      ]
    });
  }

  return httpServer;
}
