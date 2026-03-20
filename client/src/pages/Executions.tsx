import { useExecutions } from '@/hooks/use-executions';
import { Sidebar } from '@/components/Sidebar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';
import { CheckCircle, XCircle, Clock, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Link } from 'wouter';

export default function Executions() {
    const { data: executions, isLoading, error } = useExecutions();

    const formatDuration = (startedAt: string | Date | null, finishedAt: string | Date | null) => {
        if (!startedAt) return '-';
        if (!finishedAt) return 'Running...';
        
        const start = new Date(startedAt);
        const end = new Date(finishedAt);
        const duration = end.getTime() - start.getTime();
        
        if (duration < 1000) return `${duration}ms`;
        if (duration < 60000) return `${(duration / 1000).toFixed(1)}s`;
        return `${(duration / 60000).toFixed(1)}m`;
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'completed':
                return <CheckCircle className="w-4 h-4 text-green-500" />;
            case 'failed':
                return <XCircle className="w-4 h-4 text-red-500" />;
            case 'running':
                return <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />;
            default:
                return <Clock className="w-4 h-4 text-muted-foreground" />;
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'completed':
                return (
                    <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-200">
                        Success
                    </Badge>
                );
            case 'failed':
                return <Badge variant="destructive">Failed</Badge>;
            case 'running':
                return (
                    <Badge variant="secondary" className="animate-pulse">
                        Running
                    </Badge>
                );
            default:
                return <Badge variant="outline">Pending</Badge>;
        }
    };

    return (
        <div className="flex h-screen bg-background">
            <Sidebar />
            <div className="flex-1 flex flex-col overflow-hidden">
                {/* Horizontal scroll container at top */}
                <div className="border-b border-border bg-card px-8 py-4 overflow-x-auto">
                    <div className="flex items-center gap-4 min-w-max">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                            <span className="text-sm font-medium">Live Executions</span>
                        </div>
                        <div className="h-4 w-px bg-border" />
                        <div className="text-sm text-muted-foreground">
                            Total: <span className="font-semibold text-foreground">{executions?.length || 0}</span>
                        </div>
                        <div className="h-4 w-px bg-border" />
                        <div className="text-sm text-muted-foreground">
                            Running: <span className="font-semibold text-blue-600">{executions?.filter(e => e.status === 'running').length || 0}</span>
                        </div>
                        <div className="h-4 w-px bg-border" />
                        <div className="text-sm text-muted-foreground">
                            Completed: <span className="font-semibold text-green-600">{executions?.filter(e => e.status === 'completed').length || 0}</span>
                        </div>
                        <div className="h-4 w-px bg-border" />
                        <div className="text-sm text-muted-foreground">
                            Failed: <span className="font-semibold text-red-600">{executions?.filter(e => e.status === 'failed').length || 0}</span>
                        </div>
                    </div>
                </div>

                {/* Main content area */}
                <div className="flex-1 overflow-y-auto p-8">
                    <div className="mb-8">
                        <h1 className="text-3xl font-bold tracking-tight mb-2">Execution History</h1>
                        <p className="text-muted-foreground">View logs and results from past workflow runs.</p>
                    </div>

                    <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
                        {error ? (
                            <div className="p-8 text-center text-red-500">Error loading executions: {error.message}</div>
                        ) : (
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader className="bg-muted/30">
                                        <TableRow>
                                            <TableHead className="w-[120px] font-semibold">Status</TableHead>
                                            <TableHead className="font-semibold">Execution ID</TableHead>
                                            <TableHead className="font-semibold">Workflow</TableHead>
                                            <TableHead className="font-semibold">Started At</TableHead>
                                            <TableHead className="font-semibold">Duration</TableHead>
                                            <TableHead className="font-semibold">Error</TableHead>
                                            <TableHead className="text-right font-semibold">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {isLoading ? (
                                            <TableRow>
                                                <TableCell colSpan={7} className="text-center py-12">
                                                    <div className="flex flex-col items-center gap-3">
                                                        <Loader2 className="w-8 h-8 text-primary animate-spin" />
                                                        <p className="text-muted-foreground">Loading executions...</p>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ) : executions?.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={7} className="text-center py-12">
                                                    <div className="flex flex-col items-center gap-3">
                                                        <Clock className="w-12 h-12 text-muted-foreground/50" />
                                                        <div>
                                                            <p className="font-semibold text-lg mb-1">No executions yet</p>
                                                            <p className="text-sm text-muted-foreground">
                                                                Run a workflow to see execution history here.
                                                            </p>
                                                        </div>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            executions?.map((execution) => (
                                                <TableRow key={execution.id} className="hover:bg-muted/5 transition-colors">
                                                    <TableCell>
                                                        <div className="flex items-center gap-2">
                                                            {getStatusIcon(execution.status)}
                                                            {getStatusBadge(execution.status)}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge variant="outline" className="font-mono font-semibold">
                                                            #{execution.id}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex flex-col gap-1">
                                                            <span className="font-medium text-sm">
                                                                {execution.name || 'Unnamed Workflow'}
                                                            </span>
                                                            <span className="text-xs text-muted-foreground font-mono">
                                                                ID: {execution.workflowId}
                                                            </span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-sm">
                                                        {execution.startedAt
                                                            ? format(new Date(execution.startedAt), 'MMM d, HH:mm:ss')
                                                            : '-'}
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge variant="secondary" className="font-mono text-xs">
                                                            {formatDuration(execution.startedAt, execution.finishedAt)}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="max-w-xs">
                                                        {execution.error ? (
                                                            <div className="flex items-start gap-2">
                                                                <XCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                                                                <span className="text-xs text-red-600 line-clamp-2">
                                                                    {execution.error}
                                                                </span>
                                                            </div>
                                                        ) : (
                                                            <span className="text-muted-foreground text-sm">—</span>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <Link href={`/executions/viewdetails/${execution.id}`}>
                                                            <Badge 
                                                                variant="outline" 
                                                                className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
                                                            >
                                                                View Details
                                                            </Badge>
                                                        </Link>
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
