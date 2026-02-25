import { useWorkflows, useCreateWorkflow, useDeleteWorkflow } from "@/hooks/use-workflows";
import { Sidebar } from "@/components/Sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Link } from "wouter";
import { 
  Plus, 
  Search, 
  MoreVertical, 
  Play, 
  Clock, 
  GitBranch 
} from "lucide-react";
import { 
  DropdownMenu, 
  DropdownMenuTrigger, 
  DropdownMenuContent, 
  DropdownMenuItem,
  DropdownMenuSeparator 
} from "@/components/ui/dropdown-menu";
import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

export default function Workflows() {
  const { data: workflows, isLoading } = useWorkflows();
  const createMutation = useCreateWorkflow();
  const deleteMutation = useDeleteWorkflow();
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newWorkflowName, setNewWorkflowName] = useState("");
  const [newWorkflowDescription, setNewWorkflowDescription] = useState("");

  const filteredWorkflows = workflows?.filter(w => 
    w.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCreate = async () => {
    if (!newWorkflowName.trim()) return;
    try {
        await createMutation.mutateAsync({ name: newWorkflowName, description: newWorkflowDescription, nodes: [], edges: [] });
        setIsCreateOpen(false);
        setNewWorkflowName("");
        setNewWorkflowDescription("");
        setSearchTerm("");
    } catch (e) {
        console.error(e);
    }
  };

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="p-8 pb-4">
          <div className="flex items-center justify-between mb-8">
            <div>
               <h1 className="text-3xl font-bold tracking-tight text-foreground">Workflows</h1>
               <p className="text-muted-foreground mt-1">Create and Manage AI Automations.</p>
            </div>
            <Button onClick={() => setIsCreateOpen(true)} className="gap-2  shadow-primary/20">
              <Plus className="w-4 h-4" />
              New Workflow
            </Button>
          </div>

          <div className="relative mb-6">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Search workflows..." 
              className="pl-10 max-w-md bg-card"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-8 pb-8">
          {isLoading ? (
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
               {[1,2,3].map(i => (
                 <div key={i} className="h-48 rounded-xl bg-card border border-border animate-pulse" />
               ))}
             </div>
          ) : filteredWorkflows?.length === 0 ? (
             <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed border-border rounded-xl bg-muted/20">
                <GitBranch className="w-12 h-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium">No workflows found</h3>
                <p className="text-muted-foreground mb-4">Create your first workflow to get started</p>
                <Button variant="outline" onClick={() => setIsCreateOpen(true)}>Create Workflow</Button>
             </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredWorkflows?.map((workflow) => (
                <div 
                  key={workflow.id} 
                  className="group bg-card rounded-xl border border-border shadow-sm hover:shadow-md hover:border-primary/50 transition-all duration-200 flex flex-col"
                >
                  <div className="p-6 flex-1">
                    <div className="flex items-start justify-between mb-4">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${workflow.isActive ? 'bg-green-100 text-green-600' : 'bg-muted text-muted-foreground'}`}>
                        <GitBranch className="w-5 h-5" />
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 -mr-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>Duplicate</DropdownMenuItem>
                          <DropdownMenuItem>Export JSON</DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            className="text-destructive focus:text-destructive"
                            onClick={() => deleteMutation.mutate(workflow.id)}
                          >
                            Delete                                             
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>      
                    
                    <a href={`/workflow/${workflow.id}`} target="_blank" rel="noopener noreferrer">
                      <h3 className="font-semibold text-lg mb-2 group-hover:text-primary transition-colors cursor-pointer">
                        {workflow.name}
                      </h3>
                    </a>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {workflow.description || "No description provided."}
                    </p>
                  </div>

                  <div className="px-6 py-4 border-t border-border bg-muted/10 flex items-center justify-between text-xs text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" />
                      Updated {workflow.updatedAt ? formatDistanceToNow(new Date(workflow.updatedAt), { addSuffix: true }) : 'Never'}
                    </div>
                    <div className="flex items-center gap-2">
                       {workflow.isActive && (
                         <span className="flex h-2 w-2 rounded-full bg-green-500" />
                       )}
                       <span>{workflow.isActive ? 'Active' : 'Inactive'}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Workflow</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4 border border-1px border-gray-200 rounded-md p-4">
            <div className="space-y-2">
              <Label htmlFor="name">Workflow Name</Label>
              <Input 
                id="name" 
                placeholder="My Awesome Workflow" 
                value={newWorkflowName}
                onChange={(e) => setNewWorkflowName(e.target.value)}
              /> 
            </div>
          <div className="mb-10">
                <Label htmlFor="description" > Workflow Description</Label>
              <Input 
                id="description" 
                placeholder="Workflow descrition (Optional)" 
                value={newWorkflowDescription}
                onChange={(e) => setNewWorkflowDescription(e.target.value)}
              />
          </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={createMutation.isPending || !newWorkflowName}>
              {createMutation.isPending ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
