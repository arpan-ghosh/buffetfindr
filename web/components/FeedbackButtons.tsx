"use client";

import { useState, useEffect } from "react";
import { ThumbsUp, ThumbsDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  placeId: string;
}

type Vote = "up" | "down" | null;

export function FeedbackButtons({ placeId }: Props) {
  const [votes, setVotes]   = useState({ up: 0, down: 0 });
  const [myVote, setMyVote] = useState<Vote>(null);
  const [loading, setLoading] = useState(false);

  // Load counts + personal vote from localStorage on mount / restaurant change
  useEffect(() => {
    const stored = localStorage.getItem(`vote_${placeId}`) as Vote;
    setMyVote(stored ?? null);

    fetch(`/api/feedback?ids=${placeId}`)
      .then(r => r.json())
      .then(data => setVotes(data[placeId] ?? { up: 0, down: 0 }))
      .catch(() => {});
  }, [placeId]);

  const vote = async (v: "up" | "down") => {
    if (loading) return;
    setLoading(true);

    // Optimistic update
    const prev = myVote;
    const next: Vote = prev === v ? null : v;

    setMyVote(next);
    setVotes(cur => {
      const updated = { ...cur };
      if (prev) updated[prev] = Math.max(0, updated[prev] - 1);
      if (next) updated[next] = updated[next] + 1;
      return updated;
    });

    if (next) localStorage.setItem(`vote_${placeId}`, next);
    else      localStorage.removeItem(`vote_${placeId}`);

    try {
      await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ place_id: placeId, vote: v, previous: prev }),
      });
    } catch {
      // Revert on failure
      setMyVote(prev);
      setVotes(cur => {
        const reverted = { ...cur };
        if (next) reverted[next] = Math.max(0, reverted[next] - 1);
        if (prev) reverted[prev] = reverted[prev] + 1;
        return reverted;
      });
    } finally {
      setLoading(false);
    }
  };

  const total = votes.up + votes.down;

  return (
    <div className="rounded-2xl border border-[var(--border)] p-4">
      <p className="text-sm font-semibold text-[var(--text)] mb-1">Is this buffet info accurate?</p>
      <p className="text-xs text-[var(--muted)] mb-3">
        Your feedback helps us remove false positives and confirm real buffets.
      </p>

      <div className="flex gap-2">
        <button
          onClick={() => vote("up")}
          disabled={loading}
          className={cn(
            "flex flex-1 flex-col items-center justify-center gap-1 rounded-xl py-3 text-sm font-semibold border transition-all",
            myVote === "up"
              ? "bg-green-500 border-green-500 text-white"
              : "border-[var(--border)] text-[var(--muted)] hover:border-green-400 hover:text-green-600 hover:bg-green-50"
          )}
        >
          <ThumbsUp size={16} />
          <span className="text-xs font-semibold leading-none">
            Yes{votes.up > 0 && <span className="ml-1 opacity-70">({votes.up})</span>}
          </span>
        </button>

        <button
          onClick={() => vote("down")}
          disabled={loading}
          className={cn(
            "flex flex-1 flex-col items-center justify-center gap-1 rounded-xl py-3 text-sm font-semibold border transition-all",
            myVote === "down"
              ? "bg-red-500 border-red-500 text-white"
              : "border-[var(--border)] text-[var(--muted)] hover:border-red-400 hover:text-red-600 hover:bg-red-50"
          )}
        >
          <ThumbsDown size={16} />
          <span className="text-xs font-semibold leading-none">
            No buffet{votes.down > 0 && <span className="ml-1 opacity-70">({votes.down})</span>}
          </span>
        </button>
      </div>

      {total > 0 && (
        <div className="mt-3">
          <div className="flex rounded-full overflow-hidden h-1.5 bg-gray-100">
            <div
              className="bg-green-400 transition-all duration-500"
              style={{ width: `${(votes.up / total) * 100}%` }}
            />
            <div
              className="bg-red-400 transition-all duration-500"
              style={{ width: `${(votes.down / total) * 100}%` }}
            />
          </div>
          <p className="text-[10px] text-[var(--muted)] mt-1.5 text-center">
            {votes.up} confirmed · {votes.down} disputed · {total} total vote{total !== 1 ? "s" : ""}
          </p>
        </div>
      )}
    </div>
  );
}
