CREATE TABLE "audit_logs" (
	"id" bigint PRIMARY KEY NOT NULL,
	"operation_type" varchar(50) NOT NULL,
	"resource_type" varchar(100) NOT NULL,
	"resource_id" varchar(255) NOT NULL,
	"actor_type" varchar(50) DEFAULT 'user' NOT NULL,
	"actor_id" varchar(255),
	"before_state" text,
	"after_state" text,
	"description" text,
	"operation_timestamp" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "schedules" ADD COLUMN "timezone" varchar(50) DEFAULT 'UTC' NOT NULL;--> statement-breakpoint
CREATE INDEX "idx_audit_logs_resource" ON "audit_logs" USING btree ("resource_type","resource_id");--> statement-breakpoint
CREATE INDEX "idx_audit_logs_timestamp" ON "audit_logs" USING btree ("operation_timestamp");--> statement-breakpoint
CREATE INDEX "idx_audit_logs_operation_type" ON "audit_logs" USING btree ("operation_type");--> statement-breakpoint
CREATE INDEX "idx_audit_logs_actor" ON "audit_logs" USING btree ("actor_type","actor_id");--> statement-breakpoint
CREATE INDEX "idx_audit_logs_created_at" ON "audit_logs" USING btree ("created_at");