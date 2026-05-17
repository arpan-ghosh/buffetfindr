import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { Restaurant } from "./types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function slugify(str: string) {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function photoUrl(ref: string, apiKey: string, width = 600) {
  return `https://places.googleapis.com/v1/${ref}/media?maxWidthPx=${width}&key=${apiKey}`;
}

export function priceLabel(level?: string | number | null) {
  if (!level) return null;
  const n = typeof level === "string" ? level.length : level;
  return "$".repeat(Math.min(n, 4));
}

export function isOpenNow(restaurant: Restaurant): boolean | null {
  if (!restaurant.hours?.length) return null;
  const now = new Date();
  const dayNames = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
  const today = dayNames[now.getDay()];
  const todayHours = restaurant.hours.find(h => h.startsWith(today));
  if (!todayHours) return null;
  if (todayHours.includes("Closed")) return false;
  const match = todayHours.match(/(\d+:\d+\s*[AP]M)\s*[–-]\s*(\d+:\d+\s*[AP]M)/i);
  if (!match) return null;
  const parse = (t: string) => {
    const [time, period] = t.trim().split(/\s+/);
    let [h, m] = time.split(":").map(Number);
    if (period?.toUpperCase() === "PM" && h !== 12) h += 12;
    if (period?.toUpperCase() === "AM" && h === 12) h = 0;
    return h * 60 + m;
  };
  const cur = now.getHours() * 60 + now.getMinutes();
  return cur >= parse(match[1]) && cur <= parse(match[2]);
}

export function cityFromAddress(address: string) {
  const parts = address.split(",");
  return parts.length >= 2 ? parts[parts.length - 3]?.trim() ?? parts[0] : parts[0];
}
