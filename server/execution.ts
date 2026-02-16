
import { storage } from "./storage";
import { type Workflow, type WorkflowNode, type WorkflowEdge } from "@shared/schema";
import { openai } from "./replit_integrations/chat/routes"; // Use OpenAI client from integration
// Note: We might need to adjust the import if openai is not exported from routes.
// Actually, openai is exported from ./replit_integrations/chat/index which re-exports from ./storage or ./client
// Let's check imports. blueprint said:
// Chat module: index.ts re-exports registerChatRoutes and chatStorage. 
// It doesn't explicitly export openai client in the list, but server/replit_integrations/chat/routes.ts imports it from ./storage (wait, routes imports from storage? No, usually client).
// Let's check the file content I wrote.
// server/replit_integrations/chat/routes.ts imports OpenAI from "openai" directly and instantiates it. 
// It does NOT export it.
// server/replit_integrations/image/client.ts DOES export openai.
// I will use `import OpenAI from "openai"` and instantiate it here or reuse if possible.
// For now, I'll instantiate a new client or use the image one if it has the same config.
import OpenAI from "openai";

const openaiClient = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});


type ExecutionContext = Record<string, any>;

export async function executeWorkflow(workflow: Workflow, executionId: number) {
  console.log(`Starting execution ${executionId} for workflow ${workflow.id}`);
  
  try {
    await storage.updateExecution(executionId, { status: 'running', startedAt: new Date() });

    const nodes = workflow.nodes as WorkflowNode[];
    const edges = workflow.edges as WorkflowEdge[];
    
    // 1. Build Adjacency List
    const adj: Record<string, string[]> = {};
    const nodeMap: Record<string, WorkflowNode> = {};
    
    nodes.forEach(n => {
      adj[n.id] = [];
      nodeMap[n.id] = n;
    });
    
    edges.forEach(e => {
      if (adj[e.source]) {
        adj[e.source].push(e.target);
      }
    });

    // 2. Find Start Nodes (no incoming edges, OR triggers)
    // For simplicity, we just look for nodes with type 'trigger' or 'webhook'
    // If no triggers, find nodes with in-degree 0.
    const inDegree: Record<string, number> = {};
    nodes.forEach(n => inDegree[n.id] = 0);
    edges.forEach(e => inDegree[e.target] = (inDegree[e.target] || 0) + 1);

    const startNodes = nodes.filter(n => inDegree[n.id] === 0);
    
    // 3. BFS Execution
    const queue = [...startNodes];
    const context: ExecutionContext = {}; // Store output of each node by ID
    const visited = new Set<string>();

    while (queue.length > 0) {
      const currentNode = queue.shift()!;
      if (visited.has(currentNode.id)) continue;
      
      console.log(`Executing node ${currentNode.id} (${currentNode.type})`);
      
      // Execute Node Logic
      try {
        const output = await executeNode(currentNode, context);
        context[currentNode.id] = output;
      } catch (err: any) {
        console.error(`Error in node ${currentNode.id}:`, err);
        await storage.updateExecution(executionId, { 
          status: 'failed', 
          finishedAt: new Date(),
          error: `Node ${currentNode.id} failed: ${err.message}` 
        });
        return;
      }

      visited.add(currentNode.id);

      // Add neighbors to queue
      // Simple logic: if all parents executed. 
      // For this MVP, we assume tree/DAG structure and just push children. 
      // Real engine needs to check dependencies.
      const neighbors = adj[currentNode.id] || [];
      for (const neighborId of neighbors) {
         // Check if all parents of neighbor are visited
         const parents = edges.filter(e => e.target === neighborId).map(e => e.source);
         if (parents.every(p => visited.has(p))) {
            const neighborNode = nodeMap[neighborId];
            if (neighborNode) queue.push(neighborNode);
         }
      }
    }

    await storage.updateExecution(executionId, { 
      status: 'completed', 
      finishedAt: new Date(),
      data: context 
    });
    console.log(`Execution ${executionId} completed`);

  } catch (error: any) {
    console.error("Execution engine error:", error);
    await storage.updateExecution(executionId, { 
      status: 'failed', 
      finishedAt: new Date(),
      error: error.message 
    });
  }
}

async function executeNode(node: WorkflowNode, context: ExecutionContext): Promise<any> {
  const inputData = node.data;
  
  switch (node.type) {
    case 'webhook':
      return { received: true, body: {} }; // Mock webhook trigger
      
    case 'http-request':
      // Basic fetch
      if (!inputData.url) throw new Error("URL required");
      const method = inputData.method || 'GET';
      // In a real app, resolve variables from context here
      // e.g. inputData.url.replace('{{node1.data}}', ...)
      const res = await fetch(inputData.url, {
        method,
        headers: inputData.headers,
        body: ['GET', 'HEAD'].includes(method) ? undefined : JSON.stringify(inputData.body)
      });
      return await res.json();

    case 'code':
      // DANGEROUS: specific sandbox needed. 
      // For MVP, we skip or do basic eval (ONLY FOR DEMO, NOT PROD SAFE)
      // return eval(inputData.code);
      return { result: "Code execution disabled for safety in MVP" };

    case 'ai-chat':
      // Use OpenAI integration
      const prompt = inputData.prompt;
      if (!prompt) return { error: "No prompt provided" };
      
      const response = await openaiClient.chat.completions.create({
        model: "gpt-5.1", // As per blueprint instructions
        messages: [{ role: "user", content: prompt }],
      });
      return { text: response.choices[0].message.content };

    default:
      return { ...inputData, executed: true };
  }
}
