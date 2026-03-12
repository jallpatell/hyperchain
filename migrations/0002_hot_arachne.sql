CREATE TABLE "execution_nodes" (
	"id" serial PRIMARY KEY NOT NULL,
	"execution_id" integer NOT NULL,
	"node_id" text NOT NULL,
	"status" text NOT NULL,
	"output" jsonb,
	"error" text,
	"started_at" timestamp DEFAULT now(),
	"finished_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "execution_nodes" ADD CONSTRAINT "execution_nodes_execution_id_executions_id_fk" FOREIGN KEY ("execution_id") REFERENCES "public"."executions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "executions" DROP COLUMN "data";