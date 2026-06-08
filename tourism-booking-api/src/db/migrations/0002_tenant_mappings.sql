CREATE TABLE "tenant_mappings" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"pleasanter_org_id" varchar(255) NOT NULL,
	"local_tenant_id" varchar(255) NOT NULL,
	"pleasanter_org_name" varchar(255) NOT NULL,
	"last_sync_at" timestamp DEFAULT now() NOT NULL,
	"sync_version" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"marked_deleted_at" timestamp,
	"metadata" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "tenant_mappings" ADD CONSTRAINT "tenant_mappings_local_tenant_id_fkey" FOREIGN KEY ("local_tenant_id") REFERENCES "organizations"("id") ON DELETE cascade;
--> statement-breakpoint
CREATE UNIQUE INDEX "idx_tenant_mappings_unique" ON "tenant_mappings" USING btree ("pleasanter_org_id","local_tenant_id");
--> statement-breakpoint
CREATE INDEX "idx_tenant_mappings_pleasanter_org_id" ON "tenant_mappings" USING btree ("pleasanter_org_id");
--> statement-breakpoint
CREATE INDEX "idx_tenant_mappings_local_tenant_id" ON "tenant_mappings" USING btree ("local_tenant_id");
--> statement-breakpoint
CREATE INDEX "idx_tenant_mappings_last_sync" ON "tenant_mappings" USING btree ("last_sync_at");
--> statement-breakpoint
CREATE INDEX "idx_tenant_mappings_is_active" ON "tenant_mappings" USING btree ("is_active");
