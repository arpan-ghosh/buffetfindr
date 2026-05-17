import { pgTable, serial, text, real, integer, boolean, jsonb, timestamp, index, smallint } from "drizzle-orm/pg-core";

export const restaurants = pgTable("restaurants", {
  id:               serial("id").primaryKey(),
  place_id:         text("place_id").unique().notNull(),
  name:             text("name").notNull(),
  address:          text("address"),
  state:            text("state"),
  lat:              real("lat"),
  lng:              real("lng"),
  phone:            text("phone"),
  website:          text("website"),
  rating:           real("rating"),
  review_count:     integer("review_count"),
  price_level:      text("price_level"),
  business_status:  text("business_status"),
  hours:            jsonb("hours").$type<string[]>(),
  hours_periods:    jsonb("hours_periods"),
  photo_refs:       jsonb("photo_refs").$type<string[]>(),
  types:            jsonb("types").$type<string[]>(),
  buffet_score:     integer("buffet_score").default(0),
  buffet_confidence: text("buffet_confidence"),
  buffet_evidence:  jsonb("buffet_evidence").$type<string[]>(),
  is_buffet:        boolean("is_buffet").default(true),
  verified:         boolean("verified").default(false),
  active:           boolean("active").default(true),
  scraped_at:       timestamp("scraped_at", { withTimezone: true }),
  created_at:       timestamp("created_at", { withTimezone: true }).defaultNow(),
  updated_at:       timestamp("updated_at", { withTimezone: true }).defaultNow(),
}, (t) => [
  index("idx_restaurants_state").on(t.state),
  index("idx_restaurants_lat_lng").on(t.lat, t.lng),
  index("idx_restaurants_buffet_score").on(t.buffet_score),
]);

export const restaurantFeedback = pgTable("restaurant_feedback", {
  id:         serial("id").primaryKey(),
  place_id:   text("place_id").notNull(),
  vote:       text("vote").notNull(),             // "up" | "down"
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow(),
}, (t) => [
  index("idx_feedback_place_id").on(t.place_id),
]);

export const restaurantSubmissions = pgTable("restaurant_submissions", {
  id:           text("id").primaryKey(),
  name:         text("name").notNull(),
  city:         text("city").notNull(),
  state:        text("state"),
  phone:        text("phone"),
  website:      text("website"),
  notes:        text("notes"),
  status:       text("status").default("pending"),
  submitted_at: timestamp("submitted_at", { withTimezone: true }).defaultNow(),
});
