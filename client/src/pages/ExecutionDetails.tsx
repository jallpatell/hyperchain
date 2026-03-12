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
      <div className="bg-muted rounded-lg border overflow-hidden">
        <div className="px-3 py-2 text-xs font-medium text-muted-foreground border-b">
          Log Output
        </div>

        <div className="max-h-80 overflow-auto">
          <pre className="text-sm font-mono p-4 whitespace-pre-wrap break-words leading-relaxed">
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

      <div className="flex-1 overflow-y-auto p-8 space-y-8">
        {/* Header */}

        <div className="flex items-center justify-between">
          <div>
            <Link href="/executions">
              <Button variant="ghost" size="sm" className="mb-3 gap-2">
                <ArrowLeft className="w-4 h-4" />
                Back to Executions
              </Button>
            </Link>

            <h1 className="text-3xl font-bold">Execution Details</h1>

            <p className="text-muted-foreground">
              Logs and results for execution #{execution.id}
            </p>
          </div>

          {getStatusBadge(execution.status)}
        </div>

        {/* Execution Overview */}

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div className="flex items-center gap-3">
              {getStatusIcon(execution.status)}

              <div>
                <CardTitle>Execution #{execution.id}</CardTitle>

                <CardDescription>
                  Workflow {execution.workflowId}
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-6 text-sm">
            <div>
              <p className="text-muted-foreground">Started</p>

              <p className="font-medium">
                {execution.startedAt
                  ? format(new Date(execution.startedAt), "MMM d HH:mm:ss")
                  : "-"}
              </p>
            </div>

            <div>
              <p className="text-muted-foreground">Finished</p>

              <p className="font-medium">
                {execution.finishedAt
                  ? format(new Date(execution.finishedAt), "MMM d HH:mm:ss")
                  : "-"}
              </p>
            </div>

            <div>
              <p className="text-muted-foreground">Duration</p>

              <p className="font-mono font-medium">
                {formatDuration(execution.startedAt, execution.finishedAt)}
              </p>
            </div>

            <div>
              <p className="text-muted-foreground">Nodes</p>

              <p className="font-medium">{nodes.length}</p>
            </div>
          </CardContent>
        </Card>

        {/* Node Logs */}

        <div className="space-y-6">
          <h2 className="text-xl font-semibold">Node Execution Logs</h2>

          {nodes.map((node: any, index: number) => (
            <Card key={node.id}>
              <CardHeader className="flex flex-row items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-md bg-muted flex items-center justify-center">
                    {getNodeIcon(node.nodeId)}
                  </div>

                  <div>
                    <CardTitle className="text-lg">
                      {node.nodeId}
                    </CardTitle>

                    <CardDescription>
                      Node #{index + 1}
                    </CardDescription>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {getStatusBadge(node.status)}

                  {node.finishedAt && (
                    <span className="text-xs font-mono text-muted-foreground">
                      {formatDuration(node.startedAt, node.finishedAt)}
                    </span>
                  )}
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Error */}

                {node.error && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm">
                    <div className="flex gap-2">
                      <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5" />

                      <div className="font-mono whitespace-pre-wrap break-words">
                        {node.error}
                      </div>
                    </div>
                  </div>
                )}

                {/* Logs */}

                {node.output && <LogBlock content={node.output} />}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
