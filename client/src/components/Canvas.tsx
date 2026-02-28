import { useState, useCallback, useRef } from "react";
import { useNavigate }  from "react-router-dom";
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
  NodeProps,
  Handle,
  Position,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { WorkflowNode, WorkflowEdge } from "@shared/schema";
import { NodeInspector } from "./NodeInspector";
import { Button } from "./ui/button";
import { Play, Save, ChevronLeft, Zap } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  useCreateWorkflow,
  useUpdateWorkflow,
  useExecuteWorkflow,
} from "@/hooks/use-workflows";
import { useExecutionMonitor } from "@/hooks/use-execution-monitor";
import { NODE_TYPES, getNodeMeta } from "../utils/nodeTypes";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "./ui/dialog";
import { Textarea } from "./ui/textarea";
import { Label } from "./ui/label";
import { navigate } from "wouter/use-browser-location";

// ─── Custom Node Component ────────────────────────────────────────────────────

function WorkflowNodeComponent({ data, selected }: NodeProps) {
  const label = (data.label as string) || "Node";
  const meta = getNodeMeta(label);
  const Icon = meta.icon;

  return (
    <div
      className={`
        relative flex items-center gap-2.5 px-3 py-2.5 rounded-xl border-2
        bg-white shadow-sm min-w-[160px] cursor-pointer select-none
        transition-all duration-150
        ${meta.borderColor}
        ${selected ? "shadow-md ring-2 ring-offset-1 ring-current" : "hover:shadow-md"}
      `}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!w-2.5 !h-2.5 !border-2 !border-white !bg-gray-400"
      />
      <Handle
        type="source"
        position={Position.Right}
        className="!w-2.5 !h-2.5 !border-2 !border-white !bg-gray-400"
      />

      {/* Icon badge */}
      <div
        className={`flex items-center justify-center w-8 h-8 rounded-lg shrink-0 ${meta.bgColor}`}
      >
        <Icon className={`w-4 h-4 ${meta.iconColor}`} />
      </div>

      {/* Label + type pill */}
      <div className="flex flex-col min-w-0">
        <span className="text-[13px] font-semibold text-gray-800 truncate leading-tight">
          {label}
        </span>
        <span className="flex items-center gap-1 mt-0.5">
          <span className={`w-1.5 h-1.5 rounded-full ${meta.dotColor}`} />
          <span className="text-[10px] text-gray-400 font-medium uppercase tracking-wide">
            {meta.type}
          </span>
        </span>
      </div>
    </div>
  );
}

// IMPORTANT: defined outside component to avoid re-registration on every render
const nodeTypes = {
  workflowNode: WorkflowNodeComponent,
};

// ─── Sidebar drag item ────────────────────────────────────────────────────────

function SidebarNodeItem({ node }: { node: (typeof NODE_TYPES)[number] }) {
  const Icon = node.icon;
  return (
    <div
      className={`
        flex  items-center gap-2.5 px-3 py-2.5 rounded-xl border-2 bg-white
        cursor-grab active:cursor-grabbing shadow-sm hover:shadow-md
        transition-all duration-150 ${node.borderColor}
      `}
      draggable
      onDragStart={(e) =>
        e.dataTransfer.setData("application/reactflow", node.label)
      }
    >
      <div
        className={`flex items-center justify-center w-7 h-7 rounded-lg shrink-0 ${node.bgColor}`}
      >
        <Icon className={`w-3.5 h-3.5 ${node.iconColor}`} />
      </div>
      <span className="text-[13px] font-semibold text-gray-700">{node.label}</span>
    </div>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface CanvasProps {
  initialNodes?: WorkflowNode[];
  initialEdges?: WorkflowEdge[];
  workflowId?: number;
  workflowName?: string;
  onSave?: () => void;
}


function CanvasContent({
  initialNodes = [],
  initialEdges = [],
  workflowId,
  workflowName = "Untitled Workflow",
}: CanvasProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState(
    initialNodes.map((n) => ({
      ...n,
      type: "workflowNode",
      data: { ...n.data, label: n.data.label || n.type },
    }))
  );
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [selectedNode, setSelectedNode] = useState<WorkflowNode | null>(null);
  const [isInspectorOpen, setIsInspectorOpen] = useState(false);
  const [showTriggerDialog, setShowTriggerDialog] = useState(false);
  const [triggerData, setTriggerData] = useState("{}");
  const [currentExecutionId, setCurrentExecutionId] = useState<number | null>(null);

  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const { screenToFlowPosition } = useReactFlow();
  const { toast } = useToast();
  const createMutation = useCreateWorkflow();
  const updateMutation = useUpdateWorkflow();
  const executeMutation = useExecuteWorkflow();
  const executionState = useExecutionMonitor(currentExecutionId);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      const label = event.dataTransfer.getData("application/reactflow");
      if (!label) return;

      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      // Derive the canonical type from the label for consistency
      const meta = getNodeMeta(label);

      const newNode: any = {
        id: `${meta.type}-${Date.now()}`,
        type: "workflowNode",
        position,
        data: { label },
      };

      setNodes((nds) => nds.concat(newNode));
    },
    [screenToFlowPosition, setNodes]
  );

  const onNodeClick = (_: React.MouseEvent, node: Node) => {
    // Pass node.data.label as `type` so NodeInspector field-matching works
    setSelectedNode({
      id: node.id,
      type: getNodeMeta(node.data.label as string).type,
      position: node.position,
      data: node.data,
    });
    setIsInspectorOpen(true);
  };

  const handleNodeUpdate = (id: string, newData: Record<string, any>) => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === id) {
          const label = newData.label || node.data.label;
          return { ...node, data: { ...node.data, ...newData, label } };
        }
        return node;
      })
    );
  };

  const handleNodeDelete = (id: string) => {
    setNodes((nds) => nds.filter((n) => n.id !== id));
    setEdges((eds) => eds.filter((e) => e.source !== id && e.target !== id));
    setIsInspectorOpen(false);
  };

  const buildWorkflowData = () => {
    return {
      nodes: nodes.map((n) => ({
        id: n.id,
        type: getNodeMeta(n.data.label as string).type,
        position: n.position,
        data: n.data,
      })),
      edges: edges.map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        sourceHandle: e.sourceHandle || undefined,
        targetHandle: e.targetHandle || undefined,
      })),
    };
  };

  const handleSave = async () => {
    const workflowData = buildWorkflowData();

    try {
      if (workflowId) {
        await updateMutation.mutateAsync({ id: workflowId, ...workflowData });
        toast({ title: "Saved", description: "Workflow updated successfully" });
      } else {
        await createMutation.mutateAsync({ name: workflowName, ...workflowData });
        toast({ title: "Saved", description: "New workflow created" });
      }
    } catch {
      toast({
        title: "Error",
        description: "Failed to save workflow",
        variant: "destructive",
      });
    }
  };

  const handleExecute = async () => {
    if (!workflowId) {
      toast({
        title: "Save First",
        description: "Please save the workflow before executing.",
        variant: "destructive",
      });
      return;
    }
    // Show trigger data dialog
    setShowTriggerDialog(true);
  };

  const handleExecuteWithTrigger = async () => {
    if (!workflowId) return;

    try {
      const workflowData = buildWorkflowData();

      await updateMutation.mutateAsync({ id: workflowId, ...workflowData });

      let parsedTrigger: any = {};
      try {
        parsedTrigger = JSON.parse(triggerData);
      } catch {
        toast({
          title: "Invalid JSON",
          description: "Trigger data must be valid JSON",
          variant: "destructive",
        });
        return;
      }

      const result = await executeMutation.mutateAsync({
        id: workflowId,
        triggerData: parsedTrigger,
      });
      
      setCurrentExecutionId(result.executionId);
      setShowTriggerDialog(false);
      toast({
        title: "Execution Started",
        description: `Execution ${result.executionId} started. Monitor progress below.`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to execute workflow",
        variant: "destructive",
      });
    }
  };

  const redirectHome = () => navigate("/");

  return (
    <div className="flex flex-col h-screen w-full">
      {/* Header Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b bg-white shadow-sm z-10">
        <div className="flex items-center gap-3">
          <Button variant="ghost" onClick={redirectHome} size="sm">
            <ChevronLeft  className="w-4 h-4" />
          </Button>
          <span className="font-extrabold select-none text-[#EF486F] font-mono text-xl uppercase border border-1 p-2 rounded-lg cursor-default">{workflowName}</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-medium border border-green-200 cursor-default select-none">
            Active
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleSave}
            disabled={updateMutation.isPending || createMutation.isPending}
          >
            <Save className="w-4 h-4 mr-1.5" />
            {updateMutation.isPending || createMutation.isPending ? "Saving..." : "Save"}
          </Button>
          <Button size="sm" onClick={handleExecute} disabled={executeMutation.isPending}>
            <Play className="w-4 h-4 mr-1.5" />
            Execute
          </Button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Node Sidebar */}
        <div className="w-52 border-r bg-gray-50 flex flex-col gap-1.5 p-3 overflow-y-auto shrink-0">
          <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-1 px-1">
            Nodes
          </p>
          {NODE_TYPES.map((node) => (
            <SidebarNodeItem key={node.type} node={node} />
          ))}
        </div>

        {/* Canvas Area */}
        <div className="flex-1 relative" ref={reactFlowWrapper}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onDrop={onDrop}
            onDragOver={onDragOver}
            onNodeClick={onNodeClick}
            fitView
            snapToGrid
          >
            <Background variant={BackgroundVariant.Dots} gap={16} size={1} />
            <Controls />
            <MiniMap />
            <Panel position="top-center">
              <p className="text-xs text-gray-400 bg-white/80 backdrop-blur px-3 py-1 rounded-full border shadow-sm">
                Drag nodes from the left sidebar
              </p>
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

      {/* Trigger Data Dialog */}
      <Dialog open={showTriggerDialog} onOpenChange={setShowTriggerDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Execute Workflow</DialogTitle>
            <DialogDescription>
              Provide initial trigger data (JSON format) for the workflow execution.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Trigger Data (JSON)</Label>
              <Textarea
                placeholder='{"key": "value"}'
                value={triggerData}
                onChange={(e) => setTriggerData(e.target.value)}
                className="font-mono text-xs h-32"
              />
              <p className="text-xs text-muted-foreground">
                This data will be passed to webhook nodes and available to downstream nodes
              </p>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setShowTriggerDialog(false)}
              >
                Cancel
              </Button>
              <Button onClick={handleExecuteWithTrigger} disabled={executeMutation.isPending}>
                <Zap className="w-4 h-4 mr-1.5" />
                {executeMutation.isPending ? "Starting..." : "Execute"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Execution Monitor */}
      {currentExecutionId && executionState.progress && (
        <div className="fixed bottom-4 right-4 bg-white border rounded-lg shadow-lg p-4 w-96 max-h-96 overflow-y-auto z-40">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-500" />
              <span className="text-sm font-semibold">
                Execution #{currentExecutionId}
              </span>
            </div>
            <span
              className={`text-xs px-2 py-1 rounded-full font-semibold ${
                executionState.progress.status === "completed"
                  ? "bg-green-100 text-green-700"
                  : executionState.progress.status === "failed"
                  ? "bg-red-100 text-red-700"
                  : "bg-blue-100 text-blue-700"
              }`}
            >
              {executionState.progress.status.toUpperCase()}
            </span>
          </div>

          {executionState.progress.error && (
            <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
              {executionState.progress.error}
            </div>
          )}

          <div className="space-y-2">
            {executionState.progress.nodes.map((node) => (
              <div
                key={node.nodeId}
                className="text-xs border rounded p-2 bg-gray-50"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono font-semibold truncate">
                    {node.nodeId}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded text-xs font-semibold ${
                      node.status === "success"
                        ? "bg-green-100 text-green-700"
                        : node.status === "error"
                        ? "bg-red-100 text-red-700"
                        : node.status === "skipped"
                        ? "bg-gray-100 text-gray-700"
                        : node.status === "running"
                        ? "bg-blue-100 text-blue-700"
                        : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {node.status}
                  </span>
                </div>
                {node.error && (
                  <p className="text-red-600 mt-1 text-xs">{node.error}</p>
                )}
                {node.output && (
                  <pre className="mt-1 text-xs bg-white p-1 rounded border border-gray-200 overflow-auto max-h-20">
                    {JSON.stringify(node.output, null, 2).slice(0, 200)}
                    {JSON.stringify(node.output, null, 2).length > 200 && "..."}
                  </pre>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Public export ────────────────────────────────────────────────────────────

export function Canvas(props: CanvasProps) {
  return (
    <ReactFlowProvider>
      <CanvasContent {...props} />
    </ReactFlowProvider>
  );
}