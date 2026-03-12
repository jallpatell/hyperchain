-- Migration script to handle the data column removal safely
-- This script will migrate existing execution data to execution_nodes table

-- First, create the execution_nodes table if it doesn't exist
CREATE TABLE IF NOT EXISTS "execution_nodes" (
	"id" serial PRIMARY KEY NOT NULL,
	"execution_id" integer NOT NULL,
	"node_id" text NOT NULL,
	"status" text NOT NULL,
	"output" jsonb,
	"error" text,
	"started_at" timestamp DEFAULT now(),
	"finished_at" timestamp
);

-- Create foreign key constraint if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'execution_nodes_execution_id_executions_id_fk'
        AND table_name = 'execution_nodes'
    ) THEN
        ALTER TABLE "execution_nodes" 
        ADD CONSTRAINT "execution_nodes_execution_id_executions_id_fk" 
        FOREIGN KEY ("execution_id") REFERENCES "public"."executions"("id") ON DELETE cascade ON UPDATE no action;
    END IF;
END $$;

-- Migrate existing data from executions.data to execution_nodes
-- This creates a summary node for each execution that had data
INSERT INTO "execution_nodes" ("execution_id", "node_id", "status", "output", "started_at", "finished_at")
SELECT 
    id as execution_id,
    'migrated-data' as node_id,
    status as status,
    data as output,
    started_at as started_at,
    finished_at as finished_at
FROM "executions" 
WHERE "data" IS NOT NULL;

-- Now we can safely drop the data column
ALTER TABLE "executions" DROP COLUMN IF EXISTS "data";

-- Add performance indexes if they don't exist
CREATE INDEX IF NOT EXISTS "idx_executions_workflow_id" ON "executions"("workflow_id");
CREATE INDEX IF NOT EXISTS "idx_execution_nodes_execution_id" ON "execution_nodes"("execution_id");
CREATE INDEX IF NOT EXISTS "idx_executions_status_started_at" ON "executions"("status", "started_at");
CREATE INDEX IF NOT EXISTS "idx_execution_nodes_status" ON "execution_nodes"("status");
CREATE INDEX IF NOT EXISTS "idx_execution_nodes_started_at" ON "execution_nodes"("started_at");
