import { useParams, Link } from "wouter";
import { useExecution } from "@/hooks/use-executions";
import { Sidebar } from "@/components/Sidebar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  CheckCircle,
  XCircle,
  Clock,
  Loader2,
  Webhook,
  Globe,
  Code,
  Bot,
  Database,
  Mail,
  AlertTriangle,
} from "lucide-react";
import { format } from "date-fns";

export default function ExecutionDetails() {
  const params = useParams();
  const executionId = parseInt(params.id || "0");

  const { data: executionDetail, isLoading, error } = useExecution(executionId);

  const execution = executionDetail?.execution;
  const nodes = executionDetail?.nodes || [];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case "failed":
        return <XCircle className="w-5 h-5 text-red-500" />;
      case "running":
        return <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />;
      default:
        return <Clock className="w-5 h-5 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return (
          <Badge
            variant="outline"
            className="bg-green-500/10 text-green-600 border-green-200"
          >
            Success
          </Badge>
        );
      case "failed":
        return <Badge variant="destructive">Failed</Badge>;
      case "running":
        return (
          <Badge variant="secondary" className="animate-pulse">
            Running
          </Badge>
        );
      default:
        return <Badge variant="outline">Pending</Badge>;
    }
  };

  const getNodeIcon = (nodeId: string) => {
    if (nodeId.includes("webhook")) return <Webhook className="w-4 h-4" />;
    if (nodeId.includes("http")) return <Globe className="w-4 h-4" />;
    if (nodeId.includes("code")) return <Code className="w-4 h-4" />;
    if (nodeId.includes("ai")) return <Bot className="w-4 h-4" />;
    if (nodeId.includes("database")) return <Database className="w-4 h-4" />;
    if (nodeId.includes("email")) return <Mail className="w-4 h-4" />;
    return <Code className="w-4 h-4" />;
  };

  const formatDuration = (start: any, end: any) => {
    if (!start) return "-";
    if (!end) return "Running...";

    const duration = new Date(end).getTime() - new Date(start).getTime();

    if (duration < 1000) return `${duration}ms`;
    if (duration < 60000) return `${(duration / 1000).toFixed(1)}s`;
    return `${(duration / 60000).toFixed(1)}m`;
  };

  const LogBlock = ({ content }: { content: any }) => {
    const formatted =
      typeof content === "string"
        ? content
        : JSON.stringify(content, null, 2);

    return (
      <div className="bg-muted/50 rounded-lg border overflow-hidden">
        <div className="px-4 py-2 bg-muted border-b flex items-center justify-between">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Output
          </span>
          <Badge variant="secondary" className="text-xs">
            {typeof content === "string" ? "Text" : "JSON"}
          </Badge>
        </div>

        <div className="max-h-96 overflow-auto">
          <pre className="text-xs font-mono p-4 whitespace-pre-wrap break-words leading-relaxed">
            {formatted}
          </pre>
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex h-screen bg-background">
        <Sidebar />

        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin mr-3" />
          Loading execution...
        </div>
      </div>
    );
  }

  if (error || !execution) {
    return (
      <div className="flex h-screen bg-background">
        <Sidebar />

        <div className="flex-1 flex items-center justify-center text-red-500">
          Failed to load execution
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header with back button and status */}
        <div className="border-b border-border bg-card px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/executions">
                <Button variant="ghost" size="sm" className="gap-2">
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </Button>
              </Link>
              <div className="h-6 w-px bg-border" />
              <div>
                <h1 className="text-xl font-bold">Execution #{execution.id}</h1>
                <p className="text-sm text-muted-foreground">
                  {execution.name || `Workflow ${execution.workflowId}`}
                </p>
              </div>
            </div>
            {getStatusBadge(execution.status)}
          </div>
        </div>

        {/* Main scrollable content */}
        <div className="flex-1 overflow-y-auto p-8 space-y-6">
          {/* Execution Overview Card */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                {getStatusIcon(execution.status)}
                <div>
                  <CardTitle>Execution Overview</CardTitle>
                  <CardDescription>
                    Workflow ID: {execution.workflowId}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              {execution.error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex gap-3">
                    <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="font-semibold text-sm text-red-900 mb-1">Execution Failed</p>
                      <p className="font-mono text-sm text-red-700 whitespace-pre-wrap break-words">
                        {execution.error}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Started</p>
                  <p className="font-medium text-sm">
                    {execution.startedAt
                      ? format(new Date(execution.startedAt), "MMM d, HH:mm:ss")
                      : "-"}
                  </p>
                </div>

                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Finished</p>
                  <p className="font-medium text-sm">
                    {execution.finishedAt
                      ? format(new Date(execution.finishedAt), "MMM d, HH:mm:ss")
                      : "-"}
                  </p>
                </div>

                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Duration</p>
                  <Badge variant="secondary" className="font-mono w-fit">
                    {formatDuration(execution.startedAt, execution.finishedAt)}
                  </Badge>
                </div>

                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Total Nodes</p>
                  <p className="font-semibold text-sm">{nodes.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Node Execution Logs */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Node Execution Logs</h2>
              <Badge variant="outline" className="font-mono">
                {nodes.length} {nodes.length === 1 ? 'node' : 'nodes'}
              </Badge>
            </div>

            {nodes.length === 0 ? (
              <Card>
                <CardContent className="py-12">
                  <div className="flex flex-col items-center gap-3 text-center">
                    <Clock className="w-12 h-12 text-muted-foreground/50" />
                    <div>
                      <p className="font-semibold">No node logs available</p>
                      <p className="text-sm text-muted-foreground">
                        This execution has no recorded node activity.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              nodes.map((node: any, index: number) => (
                <Card key={node.id} className="overflow-hidden">
                  <CardHeader className="bg-muted/30">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-background border border-border flex items-center justify-center">
                          {getNodeIcon(node.nodeId)}
                        </div>
                        <div>
                          <CardTitle className="text-base">
                            {node.nodeId}
                          </CardTitle>
                          <CardDescription className="text-xs">
                            Step {index + 1} of {nodes.length}
                          </CardDescription>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        {node.finishedAt && (
                          <Badge variant="secondary" className="font-mono text-xs">
                            {formatDuration(node.startedAt, node.finishedAt)}
                          </Badge>
                        )}
                        {getStatusBadge(node.status)}
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="pt-4 space-y-4">
                    {node.error && (
                      <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                        <div className="flex gap-2">
                          <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                          <div className="flex-1">
                            <p className="font-semibold text-xs text-red-900 mb-1">Node Error</p>
                            <p className="font-mono text-xs text-red-700 whitespace-pre-wrap break-words">
                              {node.error}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {node.output && <LogBlock content={node.output} />}

                    {!node.output && !node.error && (
                      <p className="text-sm text-muted-foreground italic">No output recorded</p>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
