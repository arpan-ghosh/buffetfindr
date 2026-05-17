"use client";

import { MapPin, Star } from "lucide-react";
import { motion } from "framer-motion";
import type { Restaurant } from "@/lib/types";
import { cn, isOpenNow, cityFromAddress, photoUrl } from "@/lib/utils";

interface Props {
  restaurant: Restaurant;
  selected?: boolean;
  onClick?: () => void;
  compact?: boolean;
}

export function RestaurantCard({ restaurant: r, selected, onClick, compact }: Props) {
  const open = isOpenNow(r);
  const city = cityFromAddress(r.address ?? "");
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";
  const photo = r.photo_refs?.[0] ? photoUrl(r.photo_refs[0], apiKey, compact ? 400 : 200) : null;

  // ── Compact vertical card (bottom sheet scroll) ──────────────────────────
  if (compact) {
    return (
      <motion.div
        whileTap={{ scale: 0.97 }}
        onClick={onClick}
        className={cn(
          "relative flex flex-col overflow-hidden rounded-2xl bg-white shadow-card cursor-pointer flex-shrink-0",
          "h-[200px] w-[260px]",
          selected && "ring-2 ring-brand-500"
        )}
      >
        <div className="relative h-[120px] flex-shrink-0 bg-gradient-to-br from-brand-100 to-amber-50">
            <div className="absolute inset-0 flex items-center justify-center text-3xl">🍛</div>
          {photo && (
            <img
              src={photo} alt={r.name}
              className="absolute inset-0 h-full w-full object-cover"
              loading="lazy"
              onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
          <div className="absolute bottom-2 left-2 flex gap-1">
            {open === true  && <span className="badge-open">Open</span>}
            {open === false && <span className="badge-closed">Closed</span>}
            {r.buffet_confidence === "HIGH" && <span className="badge bg-brand-500 text-white">Verified</span>}
          </div>
        </div>
        <div className="flex flex-col gap-0.5 p-3 flex-1 min-h-0">
          <h3 className="font-semibold text-sm line-clamp-1 text-[var(--text)]">{r.name}</h3>
          <div className="flex items-center gap-1 text-[var(--muted)]">
            <MapPin size={10} className="flex-shrink-0" />
            <span className="text-xs truncate">{city}, {r.state}</span>
          </div>
          {r.rating && (
            <div className="flex items-center gap-1 mt-auto pt-1">
              <Star size={10} className="fill-amber-400 text-amber-400" />
              <span className="text-xs font-semibold">{r.rating}</span>
              {r.review_count && (
                <span className="text-xs text-[var(--muted)]">({r.review_count.toLocaleString()})</span>
              )}
            </div>
          )}
        </div>
      </motion.div>
    );
  }

  // ── Horizontal row card (list view) ─────────────────────────────────────
  return (
    <motion.div
      whileTap={{ scale: 0.995 }}
      onClick={onClick}
      className={cn(
        "flex gap-4 p-3 rounded-2xl bg-white shadow-card cursor-pointer transition-shadow duration-150",
        "hover:shadow-card-hover active:scale-[0.998]",
        selected && "ring-2 ring-brand-500"
      )}
    >
      {/* Square thumbnail */}
      <div className="relative h-[88px] w-[88px] flex-shrink-0 rounded-xl overflow-hidden bg-gradient-to-br from-brand-100 to-amber-50">
        <div className="absolute inset-0 flex items-center justify-center text-3xl">🍛</div>
        {photo && (
          <img
            src={photo} alt={r.name}
            className="absolute inset-0 h-full w-full object-cover"
            loading="lazy"
            onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
          />
        )}
      </div>

      {/* Text column */}
      <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
        <div className="flex flex-col gap-0.5">
          <h3 className="font-semibold text-[15px] leading-snug line-clamp-1 text-[var(--text)]">
            {r.name}
          </h3>
          <div className="flex items-center gap-1 text-[var(--muted)]">
            <MapPin size={11} className="flex-shrink-0" />
            <span className="text-xs truncate">{r.address}</span>
          </div>
        </div>

        {/* Badges row */}
        <div className="flex items-center gap-2 flex-wrap mt-2">
          {r.rating && (
            <div className="flex items-center gap-0.5">
              <Star size={11} className="fill-amber-400 text-amber-400" />
              <span className="text-xs font-semibold text-[var(--text)]">{r.rating}</span>
              {r.review_count && (
                <span className="text-xs text-[var(--muted)]">({r.review_count.toLocaleString()})</span>
              )}
            </div>
          )}
          {open === true  && <span className="badge-open">Open</span>}
          {open === false && <span className="badge-closed">Closed</span>}
          {r.buffet_confidence === "HIGH"
            ? <span className="badge-high">Verified Buffet</span>
            : <span className="badge-medium">Likely Buffet</span>
          }
        </div>
      </div>
    </motion.div>
  );
}
