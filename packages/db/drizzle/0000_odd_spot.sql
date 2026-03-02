CREATE TABLE "councils" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"region" text NOT NULL,
	"website_url" text,
	"transparency_url" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "councils_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "data_sources" (
	"id" serial PRIMARY KEY NOT NULL,
	"council_id" integer NOT NULL,
	"source_url" text NOT NULL,
	"file_type" text NOT NULL,
	"financial_year" text,
	"month" integer,
	"year" integer,
	"file_hash" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"row_count" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" serial PRIMARY KEY NOT NULL,
	"council_id" integer NOT NULL,
	"data_source_id" integer NOT NULL,
	"directorate" text,
	"service" text,
	"division" text,
	"responsible_unit" text,
	"expense_type" text,
	"payment_date" date,
	"transaction_number" text,
	"net_amount" numeric(15, 2) NOT NULL,
	"supplier_name" text,
	"supplier_name_normalized" text,
	"financial_year" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "uq_payments_council_txn" UNIQUE("council_id","transaction_number")
);
--> statement-breakpoint
CREATE TABLE "pcard_transactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"council_id" integer NOT NULL,
	"data_source_id" integer NOT NULL,
	"transaction_date" date,
	"amount" numeric(15, 2) NOT NULL,
	"expense_description" text,
	"supplier_name" text,
	"supplier_name_normalized" text,
	"directorate" text,
	"composite_hash" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "uq_pcard_hash" UNIQUE("council_id","composite_hash")
);
--> statement-breakpoint
CREATE TABLE "scrape_jobs" (
	"id" serial PRIMARY KEY NOT NULL,
	"council_id" integer NOT NULL,
	"status" text DEFAULT 'running' NOT NULL,
	"job_type" text NOT NULL,
	"files_discovered" integer DEFAULT 0,
	"files_processed" integer DEFAULT 0,
	"rows_inserted" integer DEFAULT 0,
	"rows_skipped" integer DEFAULT 0,
	"errors" jsonb,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "anomalies" (
	"id" serial PRIMARY KEY NOT NULL,
	"council_id" integer NOT NULL,
	"anomaly_type" text NOT NULL,
	"severity" text NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"period_start" date,
	"period_end" date,
	"related_entity" text,
	"metrics" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "data_sources" ADD CONSTRAINT "data_sources_council_id_councils_id_fk" FOREIGN KEY ("council_id") REFERENCES "public"."councils"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_council_id_councils_id_fk" FOREIGN KEY ("council_id") REFERENCES "public"."councils"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_data_source_id_data_sources_id_fk" FOREIGN KEY ("data_source_id") REFERENCES "public"."data_sources"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pcard_transactions" ADD CONSTRAINT "pcard_transactions_council_id_councils_id_fk" FOREIGN KEY ("council_id") REFERENCES "public"."councils"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pcard_transactions" ADD CONSTRAINT "pcard_transactions_data_source_id_data_sources_id_fk" FOREIGN KEY ("data_source_id") REFERENCES "public"."data_sources"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scrape_jobs" ADD CONSTRAINT "scrape_jobs_council_id_councils_id_fk" FOREIGN KEY ("council_id") REFERENCES "public"."councils"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "anomalies" ADD CONSTRAINT "anomalies_council_id_councils_id_fk" FOREIGN KEY ("council_id") REFERENCES "public"."councils"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_data_sources_council" ON "data_sources" USING btree ("council_id");--> statement-breakpoint
CREATE INDEX "idx_data_sources_hash" ON "data_sources" USING btree ("file_hash");--> statement-breakpoint
CREATE INDEX "idx_payments_council_date" ON "payments" USING btree ("council_id","payment_date");--> statement-breakpoint
CREATE INDEX "idx_payments_supplier" ON "payments" USING btree ("supplier_name_normalized");--> statement-breakpoint
CREATE INDEX "idx_payments_council_directorate" ON "payments" USING btree ("council_id","directorate");--> statement-breakpoint
CREATE INDEX "idx_payments_amount" ON "payments" USING btree ("net_amount");--> statement-breakpoint
CREATE INDEX "idx_pcard_council_date" ON "pcard_transactions" USING btree ("council_id","transaction_date");--> statement-breakpoint
CREATE INDEX "idx_pcard_supplier" ON "pcard_transactions" USING btree ("supplier_name_normalized");--> statement-breakpoint
CREATE INDEX "idx_scrape_jobs_council" ON "scrape_jobs" USING btree ("council_id");--> statement-breakpoint
CREATE INDEX "idx_anomalies_council" ON "anomalies" USING btree ("council_id");--> statement-breakpoint
CREATE INDEX "idx_anomalies_type" ON "anomalies" USING btree ("anomaly_type");--> statement-breakpoint
CREATE INDEX "idx_anomalies_severity" ON "anomalies" USING btree ("severity");