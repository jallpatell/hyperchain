-- Production-grade indexes for execution tables
-- These indexes are critical for performance with large datasets

-- Index for workflow_id lookups in executions table
CREATE INDEX idx_executions_workflow_id ON executions(workflow_id);

-- Index for execution_id lookups in execution_nodes table (critical for loading nodes)
CREATE INDEX idx_execution_nodes_execution_id ON execution_nodes(execution_id);

-- Composite index for execution status and time (useful for filtering)
CREATE INDEX idx_executions_status_started_at ON executions(status, started_at);

-- Index for execution node status queries
CREATE INDEX idx_execution_nodes_status ON execution_nodes(status);

-- Index for execution node timing queries
CREATE INDEX idx_execution_nodes_started_at ON execution_nodes(started_at);
