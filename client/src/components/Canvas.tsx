import { useState, useCallback, useRef } from "react";
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  Node,
  BackgroundVariant,
  Panel,
  ReactFlowProvider,
  useReactFlow,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { WorkflowNode, WorkflowEdge } from "@shared/schema";
import { NodeInspector } from "./NodeInspector";
import { Button } from "./ui/button";
import { Plus, Play, Save, ChevronLeft, Bot, Webhook, Globe, Code, Database, Mail } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useCreateWorkflow, useUpdateWorkflow, useExecuteWorkflow } from "@/hooks/use-workflows";

// Custom Node Types could be defined here if we need specific visual rendering
// For now, default nodes styled with CSS are fine for the MVP

const nodeTypesList = [
  { type: 'webhook', label: 'Webhook', icon: Webhook, color: 'bg-emerald-500' },
  { type: 'http-request', label: 'HTTP Request', icon: Globe, color: 'bg-blue-500' },
  { type: 'code', label: 'Code', icon: Code, color: 'bg-orange-500' },
  { type: 'ai-chat', label: 'AI Chat', icon: Bot, color: 'bg-purple-500' },
  { type: 'database', label: 'Database', icon: Database, color: 'bg-indigo-500' },
  { type: 'email', label: 'Email', icon: Mail, color: 'bg-red-500' },
];

interface CanvasProps {
  initialNodes?: WorkflowNode[];
  initialEdges?: WorkflowEdge[];
  workflowId?: number;
  workflowName?: string;
  onSave?: () => void;
}

function CanvasContent({ initialNodes = [], initialEdges = [], workflowId, workflowName = "Untitled Workflow" }: CanvasProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState(
    initialNodes.map(n => ({ 
      ...n, 
      data: { ...n.data, label: n.data.label || n.type } 
    }))
  );
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [selectedNode, setSelectedNode] = useState<WorkflowNode | null>(null);
  const [isInspectorOpen, setIsInspectorOpen] = useState(false);
  
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const { screenToFlowPosition } = useReactFlow();
  const { toast } = useToast();

  const createMutation = useCreateWorkflow();
  const updateMutation = useUpdateWorkflow();
  const executeMutation = useExecuteWorkflow();

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges],
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const type = event.dataTransfer.getData('application/reactflow');
      if (typeof type === 'undefined' || !type) return;

      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });
      
      const newNode: Node = {
        id: `${type}-${Date.now()}`,
        type: 'default', // Using default for MVP, but styled
        position,
        data: { label: type },
        className: 'min-w-[150px] font-medium'
      };

      setNodes((nds) => nds.concat(newNode));
    },
    [screenToFlowPosition, setNodes],
  );

  const onNodeClick = (_: React.MouseEvent, node: Node) => {
    setSelectedNode({
        id: node.id,
        type: node.data.label as string || 'default', // Using label as type for simplification in MVP
        position: node.position,
        data: node.data
    });
    setIsInspectorOpen(true);
  };

  const handleNodeUpdate = (id: string, newData: Record<string, any>) => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === id) {
          // If label changed in data, update the display label too
          const label = newData.label || node.data.label;
          return { 
            ...node, 
            data: { ...node.data, ...newData, label } 
          };
        }
        return node;
      })
    );
  };

  const handleNodeDelete = (id: string) => {
    setNodes((nds) => nds.filter((n) => n.id !== id));
    setEdges((eds) => eds.filter((e) => e.source !== id && e.target !== id));
  };

  const handleSave = async () => {
    // Transform React Flow nodes/edges back to schema format
    const workflowData = {
      nodes: nodes.map(n => ({
        id: n.id,
        type: n.data.label as string, // simplified type tracking
        position: n.position,
        data: n.data
      })),
      edges: edges.map(e => ({
        id: e.id,
        source: e.source,
        target: e.target,
        sourceHandle: e.sourceHandle || undefined,
        targetHandle: e.targetHandle || undefined
      }))
    };

    try {
      if (workflowId) {
        await updateMutation.mutateAsync({ id: workflowId, ...workflowData });
        toast({ title: "Saved", description: "Workflow updated successfully" });
      } else {
        await createMutation.mutateAsync({ 
          name: workflowName, 
          ...workflowData 
        });
        toast({ title: "Saved", description: "New workflow created" });
      }
    } catch (error) {
      toast({ 
        title: "Error", 
        description: "Failed to save workflow", 
        variant: "destructive" 
      });
    }
  };

  const handleExecute = async () => {
    if (!workflowId) {
        toast({ title: "Save First", description: "Please save the workflow before executing.", variant: "destructive" });
        return;
    }
    try {
        await executeMutation.mutateAsync(workflowId);
        toast({ title: "Executed", description: "Workflow execution started." });
    } catch (error) {
        toast({ title: "Error", description: "Failed to start execution", variant: "destructive" });
    }
  };

  return (
    <div className="flex h-screen w-full flex-col">
        {/* Header Toolbar */}
        <div className="h-16 border-b border-border bg-card px-6 flex items-center justify-between z-10">
            <div className="flex items-center gap-4">
               <h2 className="font-semibold text-lg">{workflowName}</h2>
               <div className="px-2 py-0.5 rounded-full bg-green-500/10 text-green-600 text-xs font-medium border border-green-200">
                  Active
               </div>
            </div>
            <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={handleSave} disabled={updateMutation.isPending || createMutation.isPending}>
                    <Save className="w-4 h-4 mr-2" />
                    {updateMutation.isPending || createMutation.isPending ? "Saving..." : "Save"}
                </Button>
                <Button size="sm" onClick={handleExecute} disabled={!workflowId || executeMutation.isPending}>
                    <Play className="w-4 h-4 mr-2" />
                    Execute
                </Button>
            </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
            {/* Node Sidebar */}
            <div className="w-48 border-r border-border bg-card p-4 flex flex-col gap-4 overflow-y-auto z-10">
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                    Nodes
                </div>
                {nodeTypesList.map((node) => (
                    <div
                        key={node.type}
                        className="flex items-center gap-3 p-3 rounded-lg border border-border bg-background cursor-grab hover:border-primary/50 hover:shadow-sm transition-all active:cursor-grabbing"
                        onDragStart={(event) => event.dataTransfer.setData('application/reactflow', node.label)}
                        draggable
                    >
                        <div className={`w-8 h-8 rounded-md flex items-center justify-center ${node.color} text-white`}>
                            <node.icon className="w-4 h-4" />
                        </div>
                        <span className="text-sm font-medium">{node.label}</span>
                    </div>
                ))}
            </div>

            {/* Canvas Area */}
            <div className="flex-1 h-full relative" ref={reactFlowWrapper}>
                <ReactFlow
                    nodes={nodes}
                    edges={edges}
                    onNodesChange={onNodesChange}
                    onEdgesChange={onEdgesChange}
                    onConnect={onConnect}
                    onInit={setReactFlowInstance => console.log('flow loaded:', setReactFlowInstance)}
                    onDrop={onDrop}
                    onDragOver={onDragOver}
                    onNodeClick={onNodeClick}
                    fitView
                    snapToGrid
                >
                    <Controls />
                    <MiniMap />
                    <Background variant={BackgroundVariant.Dots} gap={12} size={1} />
                    <Panel position="top-right" className="bg-background/80 p-2 rounded-lg border border-border text-xs text-muted-foreground backdrop-blur-sm">
                       Drag nodes from left sidebar
                    </Panel>
                </ReactFlow>
            </div>
        </div>

        <NodeInspector 
            node={selectedNode}
            isOpen={isInspectorOpen}
            onClose={() => setIsInspectorOpen(false)}
            onUpdate={handleNodeUpdate}
            onDelete={handleNodeDelete}
        />
    </div>
  );
}

export function Canvas(props: CanvasProps) {
    return (
        <ReactFlowProvider>
            <CanvasContent {...props} />
        </ReactFlowProvider>
    );
}
