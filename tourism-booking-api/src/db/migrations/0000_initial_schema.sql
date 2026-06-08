CREATE TABLE "activities" (
	"id" bigint PRIMARY KEY NOT NULL,
	"host_id" bigint NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text NOT NULL,
	"category" varchar(100) NOT NULL,
	"price_per_person" numeric(10, 2) NOT NULL,
	"currency" varchar(3) DEFAULT 'USD' NOT NULL,
	"max_capacity" integer NOT NULL,
	"duration" integer NOT NULL,
	"location" varchar(255) NOT NULL,
	"latitude" numeric(10, 8),
	"longitude" numeric(11, 8),
	"main_image" text,
	"status" varchar(50) DEFAULT 'active' NOT NULL,
	"deleted_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bookings" (
	"id" bigint PRIMARY KEY NOT NULL,
	"guest_id" bigint NOT NULL,
	"schedule_id" bigint NOT NULL,
	"activity_id" bigint NOT NULL,
	"quantity" integer NOT NULL,
	"booking_date" date NOT NULL,
	"status" varchar(50) DEFAULT 'pending' NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" bigint PRIMARY KEY NOT NULL,
	"booking_id" bigint NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"currency" varchar(3) DEFAULT 'USD' NOT NULL,
	"payment_method" varchar(50) NOT NULL,
	"status" varchar(50) DEFAULT 'pending' NOT NULL,
	"transaction_id" varchar(255),
	"processed_at" timestamp,
	"failure_reason" text,
	"metadata" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reviews" (
	"id" bigint PRIMARY KEY NOT NULL,
	"booking_id" bigint NOT NULL,
	"activity_id" bigint NOT NULL,
	"guest_id" bigint NOT NULL,
	"rating" integer NOT NULL,
	"title" varchar(255) NOT NULL,
	"comment" text,
	"verified" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "rating_range" CHECK (rating >= 1 AND rating <= 5)
);
--> statement-breakpoint
CREATE TABLE "schedules" (
	"id" bigint PRIMARY KEY NOT NULL,
	"activity_id" bigint NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"start_time" varchar(5) NOT NULL,
	"end_time" varchar(5) NOT NULL,
	"total_slots" integer NOT NULL,
	"booked_slots" integer DEFAULT 0 NOT NULL,
	"operator_id" bigint NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "booked_slots_le_total_slots" CHECK (booked_slots <= total_slots)
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" bigint PRIMARY KEY NOT NULL,
	"email" varchar(255) NOT NULL,
	"password_hash" varchar(255) NOT NULL,
	"first_name" varchar(255) NOT NULL,
	"last_name" varchar(255) NOT NULL,
	"phone" varchar(20),
	"profile_image" text,
	"bio" text,
	"deleted_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "activities" ADD CONSTRAINT "activities_host_id_fkey" FOREIGN KEY ("host_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_guest_id_fkey" FOREIGN KEY ("guest_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_schedule_id_fkey" FOREIGN KEY ("schedule_id") REFERENCES "public"."schedules"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_activity_id_fkey" FOREIGN KEY ("activity_id") REFERENCES "public"."activities"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_activity_id_fkey" FOREIGN KEY ("activity_id") REFERENCES "public"."activities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_guest_id_fkey" FOREIGN KEY ("guest_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schedules" ADD CONSTRAINT "schedules_activity_id_fkey" FOREIGN KEY ("activity_id") REFERENCES "public"."activities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schedules" ADD CONSTRAINT "schedules_operator_id_fkey" FOREIGN KEY ("operator_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_activities_host_id" ON "activities" USING btree ("host_id");--> statement-breakpoint
CREATE INDEX "idx_activities_status" ON "activities" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_activities_deleted_at" ON "activities" USING btree ("deleted_at");--> statement-breakpoint
CREATE INDEX "idx_activities_category" ON "activities" USING btree ("category");--> statement-breakpoint
CREATE INDEX "idx_bookings_guest_id" ON "bookings" USING btree ("guest_id");--> statement-breakpoint
CREATE INDEX "idx_bookings_schedule_id" ON "bookings" USING btree ("schedule_id");--> statement-breakpoint
CREATE INDEX "idx_bookings_activity_id" ON "bookings" USING btree ("activity_id");--> statement-breakpoint
CREATE INDEX "idx_bookings_status" ON "bookings" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_bookings_booking_date" ON "bookings" USING btree ("booking_date");--> statement-breakpoint
CREATE INDEX "idx_payments_booking_id" ON "payments" USING btree ("booking_id");--> statement-breakpoint
CREATE INDEX "idx_payments_status" ON "payments" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_payments_transaction_id" ON "payments" USING btree ("transaction_id");--> statement-breakpoint
CREATE INDEX "idx_payments_processed_at" ON "payments" USING btree ("processed_at");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_reviews_unique_booking" ON "reviews" USING btree ("booking_id");--> statement-breakpoint
CREATE INDEX "idx_reviews_activity_id" ON "reviews" USING btree ("activity_id");--> statement-breakpoint
CREATE INDEX "idx_reviews_guest_id" ON "reviews" USING btree ("guest_id");--> statement-breakpoint
CREATE INDEX "idx_reviews_rating" ON "reviews" USING btree ("rating");--> statement-breakpoint
CREATE INDEX "idx_schedules_activity_id" ON "schedules" USING btree ("activity_id");--> statement-breakpoint
CREATE INDEX "idx_schedules_activity_booked_slots" ON "schedules" USING btree ("activity_id","booked_slots");--> statement-breakpoint
CREATE INDEX "idx_schedules_operator_id" ON "schedules" USING btree ("operator_id");--> statement-breakpoint
CREATE INDEX "idx_schedules_is_deleted" ON "schedules" USING btree ("is_deleted");--> statement-breakpoint
CREATE INDEX "idx_schedules_start_date" ON "schedules" USING btree ("start_date");--> statement-breakpoint
CREATE INDEX "idx_users_email" ON "users" USING btree ("email");--> statement-breakpoint
CREATE INDEX "idx_users_deleted_at" ON "users" USING btree ("deleted_at");