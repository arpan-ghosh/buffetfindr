"use client";

import { useState } from "react";
import { X, Send, CheckCircle2, UtensilsCrossed } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onClose: () => void;
}

const STATES = ["DC","MD","VA"];

export function SubmitRestaurantModal({ open, onClose }: Props) {
  const [form, setForm] = useState({ name: "", city: "", state: "MD", phone: "", website: "", notes: "" });
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.city.trim()) return;
    setStatus("submitting");
    try {
      const res = await fetch("/api/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Something went wrong.");
      }
      setStatus("success");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to submit.");
      setStatus("error");
    }
  };

  const handleClose = () => {
    onClose();
    setTimeout(() => {
      setStatus("idle");
      setErrorMsg("");
      setForm({ name: "", city: "", state: "MD", phone: "", website: "", notes: "" });
    }, 300);
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", damping: 28, stiffness: 320 }}
            className="fixed inset-x-4 top-[10%] z-50 mx-auto max-w-lg rounded-3xl bg-white shadow-2xl overflow-hidden"
          >
            {status === "success" ? (
              <div className="flex flex-col items-center gap-4 px-8 py-12 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-50">
                  <CheckCircle2 size={32} className="text-green-500" />
                </div>
                <h2 className="text-xl font-bold text-[var(--text)]">Thanks for the tip!</h2>
                <p className="text-sm text-[var(--muted)] max-w-xs">
                  We&apos;ll review <strong>{form.name}</strong> and add it to the map if it checks out.
                  Submissions usually go live within a few days.
                </p>
                <button
                  onClick={handleClose}
                  className="mt-2 rounded-xl bg-brand-500 px-6 py-2.5 text-sm font-semibold text-white hover:bg-brand-600 transition-colors"
                >
                  Done
                </button>
              </div>
            ) : (
              <>
                {/* Header */}
                <div className="flex items-center justify-between px-5 pt-5 pb-3">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-50">
                      <UtensilsCrossed size={15} className="text-brand-500" />
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-[var(--text)]">Submit a buffet</h2>
                      <p className="text-xs text-[var(--muted)]">Know a buffet we&apos;re missing? Let us know.</p>
                    </div>
                  </div>
                  <button onClick={handleClose} className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 transition-colors">
                    <X size={14} />
                  </button>
                </div>

                {/* Form */}
                <form onSubmit={submit} className="px-5 pb-5 flex flex-col gap-3">
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <label className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wide">Restaurant name *</label>
                      <input
                        required value={form.name} onChange={set("name")}
                        placeholder="e.g. Bombay Palace"
                        className="mt-1 w-full rounded-xl border border-[var(--border)] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-400 transition-all"
                      />
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <div className="flex-1">
                      <label className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wide">City *</label>
                      <input
                        required value={form.city} onChange={set("city")}
                        placeholder="e.g. Rockville"
                        className="mt-1 w-full rounded-xl border border-[var(--border)] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-400 transition-all"
                      />
                    </div>
                    <div className="w-24">
                      <label className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wide">State</label>
                      <select
                        value={form.state} onChange={set("state")}
                        className="mt-1 w-full rounded-xl border border-[var(--border)] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-400 transition-all bg-white"
                      >
                        {STATES.map(s => <option key={s}>{s}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <div className="flex-1">
                      <label className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wide">Phone</label>
                      <input
                        type="tel" value={form.phone} onChange={set("phone")}
                        placeholder="(301) 555-0123"
                        className="mt-1 w-full rounded-xl border border-[var(--border)] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-400 transition-all"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wide">Website</label>
                      <input
                        type="url" value={form.website} onChange={set("website")}
                        placeholder="https://..."
                        className="mt-1 w-full rounded-xl border border-[var(--border)] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-400 transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wide">How do you know it has a buffet?</label>
                    <textarea
                      value={form.notes} onChange={set("notes")}
                      placeholder="e.g. I go there every Sunday for their lunch buffet, $13.99"
                      rows={3}
                      className="mt-1 w-full rounded-xl border border-[var(--border)] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-400 transition-all resize-none"
                    />
                  </div>

                  {status === "error" && (
                    <p className="text-xs text-red-500 bg-red-50 rounded-xl px-3 py-2">{errorMsg}</p>
                  )}

                  <button
                    type="submit"
                    disabled={status === "submitting" || !form.name.trim() || !form.city.trim()}
                    className={cn(
                      "flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold text-white transition-all",
                      status === "submitting" || !form.name.trim() || !form.city.trim()
                        ? "bg-gray-300 cursor-not-allowed"
                        : "bg-brand-500 hover:bg-brand-600"
                    )}
                  >
                    <Send size={14} />
                    {status === "submitting" ? "Submitting…" : "Submit for review"}
                  </button>

                  <p className="text-[10px] text-center text-[var(--muted)]">
                    Submissions are reviewed before appearing on the map.
                  </p>
                </form>
              </>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
