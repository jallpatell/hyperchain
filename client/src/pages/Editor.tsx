import { useParams } from "wouter";
import { Canvas } from "@/components/Canvas";
import { useWorkflow } from "@/hooks/use-workflows";
import { Loader2 } from "lucide-react";

export default function Editor() {
  const { id } = useParams();
  const workflowId = Number(id);
  const { data: workflow, isLoading, error } = useWorkflow(workflowId);

  if (isLoading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-muted-foreground font-medium">Loading Workflow...</p>
        </div>
      </div>
    );
  }

  if (error || !workflow) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-background">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Error Loading Workflow</h2>
          <p className="text-muted-foreground">The workflow could not be found or failed to load.</p>
        </div>
      </div>
    );
  }

  return (
    <Canvas 
      initialNodes={workflow.nodes} 
      initialEdges={workflow.edges}
      workflowId={workflow.id}
      workflowName={workflow.name}
    />
  );
}
