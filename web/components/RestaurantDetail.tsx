"use client";

import { useState, useEffect } from "react";
import {
  X, MapPin, Phone, ExternalLink, Star, Clock,
  Navigation2, ChevronDown, CheckCircle2, Circle,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { Restaurant } from "@/lib/types";
import { isOpenNow, photoUrl, cn } from "@/lib/utils";
import { FeedbackButtons } from "./FeedbackButtons";

interface Props {
  restaurant: Restaurant | null;
  onClose: () => void;
}

const DAY_ORDER = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];

const BUFFET_STAPLES = [
  "Butter Chicken","Chana Masala","Dal Makhani","Saag Paneer",
  "Biryani","Tandoori Chicken","Naan","Samosa",
  "Raita","Gulab Jamun","Kheer","Aloo Gobi",
];

function HoursTable({ hours }: { hours: string[] }) {
  const today = new Date().toLocaleDateString("en-US", { weekday: "long" });
  const sorted = DAY_ORDER.map(d => hours.find(h => h.startsWith(d)) ?? `${d}: Closed`);
  return (
    <div className="flex flex-col gap-1.5">
      {sorted.map(line => {
        const [day, ...rest] = line.split(": ");
        const isToday = day === today;
        return (
          <div
            key={day}
            className={cn(
              "flex justify-between text-sm gap-4",
              isToday ? "font-semibold text-[var(--text)]" : "text-[var(--muted)]"
            )}
          >
            <span className="w-10 flex-shrink-0">{day.slice(0, 3)}</span>
            <span className="text-right flex-1">{rest.join(": ") || "Closed"}</span>
            {isToday && <span className="badge-open text-[10px] self-center">Today</span>}
          </div>
        );
      })}
    </div>
  );
}

export function RestaurantDetail({ restaurant: r, onClose }: Props) {
  const [visited, setVisited]           = useState(false);
  const [evidenceOpen, setEvidenceOpen] = useState(false);

  const open   = r ? isOpenNow(r) : null;
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";
  const photos = r?.photo_refs?.map(ref => photoUrl(ref, apiKey, 800)) ?? [];
  const mapsUrl = r
    ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(r.address ?? r.name)}`
    : "#";

  // Load visited state from localStorage whenever the restaurant changes
  useEffect(() => {
    if (!r) return;
    setVisited(localStorage.getItem(`visited_${r.place_id}`) === "true");
    setEvidenceOpen(false);
  }, [r?.place_id]);

  const toggleVisited = () => {
    if (!r) return;
    const next = !visited;
    setVisited(next);
    localStorage.setItem(`visited_${r.place_id}`, String(next));
  };

  return (
    <AnimatePresence>
      {r && (
        <>
          {/* Backdrop — mobile only */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-30 bg-black/20 backdrop-blur-[2px] md:hidden"
          />

          {/* Panel */}
          <motion.div
            key={r.place_id}
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 320 }}
            className="fixed top-0 right-0 bottom-0 z-40 w-full md:w-[420px] bg-white shadow-2xl flex flex-col overflow-hidden"
          >

            {/* ── Hero photo ── */}
            <div className="relative h-52 flex-shrink-0 bg-gradient-to-br from-brand-100 to-amber-50">
              <div className="absolute inset-0 flex items-center justify-center text-6xl select-none">🍛</div>
              {photos[0] && (
                <img
                  src={photos[0]} alt={r.name}
                  className="absolute inset-0 h-full w-full object-cover"
                  onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />

              <button
                onClick={onClose}
                className="absolute top-4 right-4 flex h-8 w-8 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm hover:bg-black/60 transition-colors"
              >
                <X size={16} />
              </button>

              <div className="absolute bottom-3 left-3 flex gap-2">
                {open === true  && <span className="badge-open shadow-sm">Open Now</span>}
                {open === false && <span className="badge-closed shadow-sm">Closed</span>}
                {r.buffet_confidence === "HIGH" && (
                  <span className="badge bg-brand-500 text-white shadow-sm">Verified Buffet</span>
                )}
              </div>
            </div>

            {/* ── Extra photo strip ── */}
            {photos.length > 1 && (
              <div className="flex gap-2 px-3 py-2 overflow-x-auto no-scrollbar bg-white border-b border-[var(--border)]">
                {photos.slice(1).map((url, i) => (
                  <div key={i} className="relative h-14 w-20 flex-shrink-0 rounded-lg overflow-hidden bg-gray-100">
                    <img
                      src={url} alt=""
                      className="h-full w-full object-cover"
                      loading="lazy"
                      onError={e => { (e.target as HTMLImageElement).parentElement!.style.display = "none"; }}
                    />
                  </div>
                ))}
              </div>
            )}

            {/* ── Scrollable content ── */}
            <div className="flex-1 overflow-y-auto">
              <div className="px-5 py-4 flex flex-col gap-5">

                {/* Name + rating */}
                <div>
                  <h2 className="text-xl font-bold leading-tight text-[var(--text)]">{r.name}</h2>
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    {r.rating && (
                      <div className="flex items-center gap-1">
                        <Star size={13} className="fill-amber-400 text-amber-400" />
                        <span className="text-sm font-semibold">{r.rating}</span>
                        {r.review_count && (
                          <span className="text-xs text-[var(--muted)]">({r.review_count.toLocaleString()} reviews)</span>
                        )}
                      </div>
                    )}
                    <span className={cn("badge", r.buffet_confidence === "HIGH" ? "badge-high" : "badge-medium")}>
                      {r.buffet_score}% match
                    </span>
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex gap-2">
                  <a
                    href={mapsUrl} target="_blank" rel="noopener noreferrer"
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-600 transition-colors"
                  >
                    <Navigation2 size={14} /> Directions
                  </a>
                  {r.phone && (
                    <a
                      href={`tel:${r.phone}`}
                      className="flex items-center justify-center gap-1.5 rounded-xl border border-[var(--border)] bg-white px-4 py-2.5 text-sm font-semibold text-[var(--text)] hover:bg-gray-50 transition-colors"
                    >
                      <Phone size={14} /> Call
                    </a>
                  )}
                  {r.website && (
                    <a
                      href={r.website} target="_blank" rel="noopener noreferrer"
                      className="flex items-center justify-center rounded-xl border border-[var(--border)] bg-white px-3 py-2.5 text-[var(--text)] hover:bg-gray-50 transition-colors"
                    >
                      <ExternalLink size={14} />
                    </a>
                  )}
                </div>

                {/* Community feedback */}
                <FeedbackButtons placeId={r.place_id} />

                {/* Address */}
                <div className="flex gap-3 items-start">
                  <div className="mt-0.5 h-8 w-8 flex-shrink-0 flex items-center justify-center rounded-full bg-gray-50">
                    <MapPin size={15} className="text-[var(--muted)]" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)] mb-0.5">Address</p>
                    <p className="text-sm text-[var(--text)]">{r.address}</p>
                  </div>
                </div>

                {/* What to expect */}
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)] mb-2">
                    What you&apos;ll typically find 🍽️
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {BUFFET_STAPLES.map(dish => (
                      <span
                        key={dish}
                        className="rounded-full bg-amber-50 border border-amber-100 px-2.5 py-1 text-xs font-medium text-amber-800"
                      >
                        {dish}
                      </span>
                    ))}
                  </div>
                  <p className="text-[10px] text-[var(--muted)] mt-2">
                    Common items at Indian buffets — may vary by restaurant.
                  </p>
                </div>

                {/* Hours */}
                {r.hours?.length > 0 && (
                  <div className="flex gap-3 items-start">
                    <div className="mt-0.5 h-8 w-8 flex-shrink-0 flex items-center justify-center rounded-full bg-gray-50">
                      <Clock size={15} className="text-[var(--muted)]" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)] mb-2">Hours</p>
                      <HoursTable hours={r.hours} />
                    </div>
                  </div>
                )}

                {/* Been here tracker */}
                <div className="rounded-2xl border border-[var(--border)] p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-[var(--text)]">
                        {visited ? "You've been here! 🎉" : "Have you visited?"}
                      </p>
                      <p className="text-xs text-[var(--muted)] mt-0.5">
                        {visited ? "Marked as visited on this device" : "Track the buffets you've tried"}
                      </p>
                    </div>
                    <button
                      onClick={toggleVisited}
                      className={cn(
                        "flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold transition-all",
                        visited
                          ? "bg-green-500 text-white hover:bg-green-600"
                          : "border border-[var(--border)] text-[var(--muted)] hover:border-green-400 hover:text-green-600"
                      )}
                    >
                      {visited
                        ? <><CheckCircle2 size={15} /> Visited</>
                        : <><Circle size={15} /> Mark visited</>
                      }
                    </button>
                  </div>
                  <p className="text-[10px] text-[var(--muted)] mt-3 pt-3 border-t border-[var(--border)]">
                    Google & Apple sign-in coming soon to sync across devices.
                  </p>
                </div>

                {/* Buffet evidence — collapsible, at the bottom */}
                {r.buffet_evidence?.length > 0 && (
                  <div className="rounded-2xl border border-[var(--border)] overflow-hidden">
                    <button
                      onClick={() => setEvidenceOpen(o => !o)}
                      className="w-full flex items-center justify-between px-4 py-3 text-sm text-[var(--muted)] hover:bg-gray-50 transition-colors"
                    >
                      <span className="font-medium">Why we think it&apos;s a buffet</span>
                      <motion.span animate={{ rotate: evidenceOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
                        <ChevronDown size={15} />
                      </motion.span>
                    </button>
                    <AnimatePresence initial={false}>
                      {evidenceOpen && (
                        <motion.div
                          initial={{ height: 0 }}
                          animate={{ height: "auto" }}
                          exit={{ height: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <ul className="flex flex-col gap-1.5 px-4 pb-4 border-t border-[var(--border)] pt-3">
                            {r.buffet_evidence.map((e, i) => (
                              <li key={i} className="flex items-start gap-2 text-xs text-[var(--muted)]">
                                <span className="mt-1.5 h-1 w-1 flex-shrink-0 rounded-full bg-brand-300" />
                                {e}
                              </li>
                            ))}
                          </ul>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}

                <p className="text-[10px] text-[var(--muted)] pb-2">Data sourced from Google Places · {r.state}</p>

              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
