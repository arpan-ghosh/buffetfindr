CREATE TABLE "restaurant_feedback" (
	"id" serial PRIMARY KEY NOT NULL,
	"place_id" text NOT NULL,
	"vote" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "restaurant_submissions" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"city" text NOT NULL,
	"state" text,
	"phone" text,
	"website" text,
	"notes" text,
	"status" text DEFAULT 'pending',
	"submitted_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "restaurants" (
	"id" serial PRIMARY KEY NOT NULL,
	"place_id" text NOT NULL,
	"name" text NOT NULL,
	"address" text,
	"state" text,
	"lat" real,
	"lng" real,
	"phone" text,
	"website" text,
	"rating" real,
	"review_count" integer,
	"price_level" text,
	"business_status" text,
	"hours" jsonb,
	"hours_periods" jsonb,
	"photo_refs" jsonb,
	"types" jsonb,
	"buffet_score" integer DEFAULT 0,
	"buffet_confidence" text,
	"buffet_evidence" jsonb,
	"is_buffet" boolean DEFAULT true,
	"verified" boolean DEFAULT false,
	"active" boolean DEFAULT true,
	"scraped_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "restaurants_place_id_unique" UNIQUE("place_id")
);
--> statement-breakpoint
CREATE INDEX "idx_feedback_place_id" ON "restaurant_feedback" USING btree ("place_id");--> statement-breakpoint
CREATE INDEX "idx_restaurants_state" ON "restaurants" USING btree ("state");--> statement-breakpoint
CREATE INDEX "idx_restaurants_lat_lng" ON "restaurants" USING btree ("lat","lng");--> statement-breakpoint
CREATE INDEX "idx_restaurants_buffet_score" ON "restaurants" USING btree ("buffet_score");