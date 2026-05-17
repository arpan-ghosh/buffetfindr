"use client";

import { Search, SlidersHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  state: string;
  confidence: string;
  search: string;
  onStateChange: (s: string) => void;
  onConfidenceChange: (c: string) => void;
  onSearchChange: (s: string) => void;
}

const STATES = [
  { value: "all", label: "All" },
  { value: "maryland", label: "Maryland" },
  { value: "virginia", label: "Virginia" },
  { value: "dc", label: "DC" },
];

const CONFIDENCE = [
  { value: "", label: "All" },
  { value: "HIGH", label: "Verified" },
  { value: "MEDIUM", label: "Likely" },
];

export function FilterBar({ state, confidence, search, onStateChange, onConfidenceChange, onSearchChange }: Props) {
  return (
    <div className="flex flex-col gap-2">
      {/* Search */}
      <div className="relative">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
        <input
          type="text"
          placeholder="Search restaurants..."
          value={search}
          onChange={e => onSearchChange(e.target.value)}
          className="w-full rounded-xl bg-white border border-[var(--border)] pl-9 pr-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-400 transition-all placeholder:text-[var(--muted)]"
        />
      </div>

      {/* State pills */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar">
        {STATES.map(s => (
          <button
            key={s.value}
            onClick={() => onStateChange(s.value)}
            className={cn(
              "flex-shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all",
              state === s.value
                ? "bg-brand-500 text-white shadow-sm"
                : "bg-white border border-[var(--border)] text-[var(--muted)] hover:border-brand-300"
            )}
          >
            {s.label}
          </button>
        ))}

        <div className="h-4 w-px bg-[var(--border)] self-center mx-1 flex-shrink-0" />

        {CONFIDENCE.map(c => (
          <button
            key={c.value}
            onClick={() => onConfidenceChange(c.value)}
            className={cn(
              "flex-shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all",
              confidence === c.value
                ? "bg-[var(--text)] text-white shadow-sm"
                : "bg-white border border-[var(--border)] text-[var(--muted)] hover:border-gray-400"
            )}
          >
            {c.label}
          </button>
        ))}
      </div>
    </div>
  );
}
