import { useExecutions } from "@/hooks/use-executions";
import { Sidebar } from "@/components/Sidebar";
import { 
    Table, 
    TableBody, 
    TableCell, 
    TableHead, 
    TableHeader, 
    TableRow 
} from "@/components/ui/table";
import { format } from "date-fns";
import { CheckCircle2, XCircle, Clock, Loader2,   Webhook, Globe, Code, Bot, Database, Mail } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function Executions() {
  const { data: executions, isLoading, error } = useExecutions();

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case 'failed': return <XCircle className="w-4 h-4 text-red-500" />;
      case 'running': return <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />;
      default: return <Clock className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: string) => {
     switch(status) {
        case 'completed': return <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-200">Success</Badge>;
        case 'failed': return <Badge variant="destructive">Failed</Badge>;
        case 'running': return <Badge variant="secondary" className="animate-pulse">Running</Badge>;
        default: return <Badge variant="outline">Pending</Badge>;
     }
  };

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex-1 overflow-y-auto p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight mb-2">Execution History</h1>
          <p className="text-muted-foreground">View logs and results from past workflow runs.</p>
        </div>

        <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
          {error ? (
            <div className="p-8 text-center text-red-500">
              Error loading executions: {error.message}
            </div>
          ) : (
            <Table>
            <TableHeader className="bg-muted/30 font-extrabold text-[#000000]">
              <TableRow>
                <TableHead className="w-[100px]">Status</TableHead>
                <TableHead>Execution ID</TableHead>
                <TableHead>Workflow ID</TableHead>
                <TableHead>Started At</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead className="text-right">Action</TableHead>
                <TableHead > Workflow Name</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    Loading executions...
                  </TableCell>
                </TableRow>
              ) : executions?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12">
                    <div className="flex flex-col items-center gap-2">
                       <Clock className="w-8 h-8 text-muted-foreground/50" />
                       <p className="font-medium">No executions yet</p>
                       <p className="text-sm text-muted-foreground">Run a workflow to see it here.</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                executions?.map((execution) => (
                  <TableRow key={execution.id} className="hover:bg-muted/5">
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(execution.status)}
                        <span className="capitalize text-sm font-medium">{execution.status}</span>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono font-bold text-center  text-[#c7700c]">
                      #0{execution.id}
                    </TableCell>
                    <TableCell>
                       <Badge variant="outline" className="font-mono  text-green-600">
                          ID: {execution.workflowId}
                       </Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      {execution.startedAt ? format(new Date(execution.startedAt), "MMM d, HH:mm:ss") : "-"}
                    </TableCell>
                    <TableCell className="text-sm font-mono text-blue-600">
                      {execution.finishedAt && execution.startedAt 
                        ? `${(new Date(execution.finishedAt).getTime() - new Date(execution.startedAt).getTime())}ms` 
                        : "-"
                      }
                    </TableCell>
                    <TableCell className="text-right">
                       <Badge variant="outline" className="cursor-pointer hover:bg-muted">View Details</Badge>
                       
                    </TableCell>
                    <TableCell className="font-medium font-mono text-[#EF486F] font-extrabold text-sm">
                       {execution.name || "Unknown Workflow"}
                    </TableCell>  
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          )}
        </div>
      </div>
    </div>
  );
}
