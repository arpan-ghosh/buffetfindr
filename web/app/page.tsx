"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import dynamic from "next/dynamic";
import { motion, AnimatePresence } from "framer-motion";
import { Map, List, Loader2, Info, X, ChevronLeft, ChevronRight } from "lucide-react";
import { RestaurantCard } from "@/components/RestaurantCard";
import { FilterBar } from "@/components/FilterBar";
import { RestaurantDetail } from "@/components/RestaurantDetail";
import { SubmitRestaurantModal } from "@/components/SubmitRestaurantModal";
import type { Restaurant } from "@/lib/types";

const RestaurantMap = dynamic(
  () => import("@/components/RestaurantMap").then(m => m.RestaurantMap),
  { ssr: false }
);

export default function Home() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"map" | "list">("map");
  const [selected, setSelected]     = useState<string | null>(null);
  const [submitOpen, setSubmitOpen] = useState(false);
  const cardScrollRef = useRef<HTMLDivElement>(null);
  const [infoOpen, setInfoOpen]     = useState(false);
  const [state, setState] = useState("all");
  const [confidence, setConfidence] = useState("");
  const [search, setSearch] = useState("");

  const fetchRestaurants = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ state, min_score: "30" });
    if (confidence) params.set("confidence", confidence);
    if (search)     params.set("search", search);
    const res = await fetch(`/api/restaurants?${params}`);
    const data = await res.json();
    setRestaurants(data.restaurants ?? []);
    setLoading(false);
  }, [state, confidence, search]);

  useEffect(() => { fetchRestaurants(); }, [fetchRestaurants]);

  const selectedRestaurant = restaurants.find(r => r.place_id === selected) ?? null;

  return (
    <div className="relative h-dvh w-full overflow-hidden bg-[var(--bg)]">

      {/* ── Map (always rendered underneath) ───────────────────────── */}
      <RestaurantMap
        restaurants={restaurants}
        selected={selected}
        onSelect={id => setSelected(id)}
      />

      {/* ── Restaurant detail sidebar ────────────────────────────────── */}
      <RestaurantDetail
        restaurant={selectedRestaurant}
        onClose={() => setSelected(null)}
      />

      {/* ── Submit a buffet FAB ──────────────────────────────────────── */}
      <button
        onClick={() => setSubmitOpen(true)}
        className="fixed bottom-6 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 rounded-full bg-[var(--text)] px-4 py-2.5 text-sm font-semibold text-white shadow-lg hover:bg-gray-800 transition-all hover:scale-105 active:scale-95"
        style={{ bottom: view === "map" ? "calc(240px + 1.5rem)" : "1.5rem" }}
      >
        <span className="text-base leading-none">+</span> Know a buffet we&apos;re missing?
      </button>

      {/* ── Submit modal ─────────────────────────────────────────────── */}
      <SubmitRestaurantModal open={submitOpen} onClose={() => setSubmitOpen(false)} />

      {/* ── Header ──────────────────────────────────────────────────── */}
      <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-4 pt-safe pt-4 pb-2">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🍛</span>
          <div>
            <h1 className="text-base font-bold leading-none text-[var(--text)]">Buffet Findr</h1>
            <p className="text-[10px] text-[var(--muted)] leading-none mt-0.5">
              {loading ? "Loading…" : `${restaurants.length} buffets in DMV`}
            </p>
          </div>
          <button
            onClick={() => setInfoOpen(true)}
            aria-label="About this app"
            className="ml-0.5 p-1 rounded-full text-[var(--muted)] hover:text-[var(--text)] hover:bg-black/5 transition-colors"
          >
            <Info size={15} />
          </button>
        </div>

        {/* View toggle */}
        <div className="flex rounded-xl overflow-hidden border border-[var(--border)] bg-white shadow-sm">
          <button
            onClick={() => setView("map")}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold transition-colors ${
              view === "map" ? "bg-brand-500 text-white" : "text-[var(--muted)]"
            }`}
          >
            <Map size={13} /> Map
          </button>
          <button
            onClick={() => setView("list")}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold transition-colors ${
              view === "list" ? "bg-brand-500 text-white" : "text-[var(--muted)]"
            }`}
          >
            <List size={13} /> List
          </button>
        </div>
      </div>

      {/* ── List view overlay ────────────────────────────────────────── */}
      <AnimatePresence>
        {view === "list" && (
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 300 }}
            className="absolute inset-0 z-10 flex flex-col bg-[var(--bg)]"
          >
            {/* Spacer for header */}
            <div className="h-16 flex-shrink-0" />

            {/* Filters */}
            <div className="px-4 pt-3 pb-2 bg-[var(--bg)] sticky top-16 z-10">
              <FilterBar
                state={state}
                confidence={confidence}
                search={search}
                onStateChange={setState}
                onConfidenceChange={setConfidence}
                onSearchChange={setSearch}
              />
            </div>

            {/* List */}
            {loading ? (
              <div className="flex-1 flex items-center justify-center">
                <Loader2 size={24} className="animate-spin text-brand-500" />
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto px-4 pb-8 pt-1">
                <div className="flex flex-col gap-2 max-w-2xl mx-auto">
                  {restaurants.map(r => (
                    <RestaurantCard
                      key={r.place_id}
                      restaurant={r}
                      selected={selected === r.place_id}
                      onClick={() => setSelected(r.place_id)}
                    />
                  ))}
                  {restaurants.length === 0 && (
                    <div className="py-16 text-center text-[var(--muted)]">
                      No buffets found for this filter.
                    </div>
                  )}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Bottom sheet: selected restaurant (map mode) ─────────────── */}
      <AnimatePresence>
        {view === "map" && (
          <motion.div
            initial={{ y: 0 }}
            animate={{ y: 0 }}
            className="absolute bottom-0 left-0 right-0 z-20 flex flex-col"
          >
            {/* Filter bar always visible on map */}
            <div className="px-4 pb-2 pt-2">
              <FilterBar
                state={state}
                confidence={confidence}
                search={search}
                onStateChange={setState}
                onConfidenceChange={setConfidence}
                onSearchChange={setSearch}
              />
            </div>

            {/* Horizontal card scroll with arrow nav */}
            <div className="relative">
              {/* Left arrow */}
              <button
                onClick={() => cardScrollRef.current?.scrollBy({ left: -290, behavior: "smooth" })}
                className="absolute left-1 top-1/2 -translate-y-1/2 z-10 hidden md:flex h-8 w-8 items-center justify-center rounded-full bg-white shadow-card text-[var(--text)] hover:shadow-card-hover transition-shadow"
                style={{ bottom: "1.5rem" }}
              >
                <ChevronLeft size={16} />
              </button>

              <div
                ref={cardScrollRef}
                className="flex gap-3 px-10 pb-6 overflow-x-auto no-scrollbar"
                style={{ scrollSnapType: "x mandatory" }}
              >
                {loading ? (
                  <div className="min-w-[260px] h-[200px] rounded-2xl bg-white shadow-card flex items-center justify-center">
                    <Loader2 size={20} className="animate-spin text-brand-500" />
                  </div>
                ) : (
                  restaurants.slice(0, 40).map(r => (
                    <div key={r.place_id} style={{ scrollSnapAlign: "start" }}>
                      <RestaurantCard
                        restaurant={r}
                        selected={selected === r.place_id}
                        compact
                        onClick={() => setSelected(r.place_id)}
                      />
                    </div>
                  ))
                )}
              </div>

              {/* Right arrow */}
              <button
                onClick={() => cardScrollRef.current?.scrollBy({ left: 290, behavior: "smooth" })}
                className="absolute right-1 top-1/2 -translate-y-1/2 z-10 hidden md:flex h-8 w-8 items-center justify-center rounded-full bg-white shadow-card text-[var(--text)] hover:shadow-card-hover transition-shadow"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Info sheet ──────────────────────────────────────────────── */}
      <AnimatePresence>
        {infoOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-30 bg-black/40"
              onClick={() => setInfoOpen(false)}
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
              className="absolute bottom-0 left-0 right-0 z-40 rounded-t-2xl bg-white px-5 pt-5 pb-safe pb-8 shadow-2xl max-h-[85dvh] overflow-y-auto"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">🍛</span>
                  <div>
                    <h2 className="text-base font-bold text-[var(--text)]">Buffet Findr</h2>
                    <p className="text-[11px] text-[var(--muted)]">DC · Maryland · Virginia</p>
                  </div>
                </div>
                <button
                  onClick={() => setInfoOpen(false)}
                  className="p-1.5 rounded-full hover:bg-black/5 text-[var(--muted)] transition-colors"
                >
                  <X size={16} />
                </button>
              </div>

              <p className="text-sm text-[var(--text)] leading-relaxed mb-5">
                Buffet Findr maps every Indian restaurant buffet in the DMV area — DC, Maryland, and Virginia. Restaurants are sourced from Google Places and scored based on reviews, website mentions, and search signals.
              </p>

              <div className="flex flex-col gap-4">
                <Section title="Confidence levels">
                  <Tip color="bg-green-500"  label="High"   text="Multiple reviews + website confirmation. Safe to visit." />
                  <Tip color="bg-yellow-400" label="Medium" text="Some evidence of a buffet. Worth calling ahead." />
                </Section>

                <Section title="How to use">
                  <Tip icon="📍" text="Tap a pin on the map to see restaurant details." />
                  <Tip icon="👆" text="Swipe the cards at the bottom of the map to browse nearby buffets." />
                  <Tip icon="🔍" text="Use the search bar to find a specific restaurant by name." />
                  <Tip icon="🗺️" text="Switch between Map and List view using the toggle in the top right." />
                  <Tip icon="📍" text="Filter by state (DC / MD / VA) or confidence level using the filter bar." />
                </Section>

                <Section title="Know one we missed?">
                  <p className="text-sm text-[var(--muted)] leading-relaxed">
                    Tap the <span className="font-semibold text-[var(--text)]">+ Know a buffet we&apos;re missing?</span> button at the bottom of the screen to submit a restaurant. We review all submissions.
                  </p>
                </Section>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)] mb-2">{title}</p>
      <div className="flex flex-col gap-2">{children}</div>
    </div>
  );
}

function Tip({ icon, color, label, text }: { icon?: string; color?: string; label?: string; text: string }) {
  return (
    <div className="flex items-start gap-2.5">
      {color ? (
        <span className={`mt-0.5 h-2.5 w-2.5 flex-shrink-0 rounded-full ${color}`} />
      ) : (
        <span className="flex-shrink-0 text-base leading-none">{icon}</span>
      )}
      <p className="text-sm text-[var(--text)] leading-snug">
        {label && <span className="font-semibold">{label} — </span>}
        {text}
      </p>
    </div>
  );
}
