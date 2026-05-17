import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { neon } from "@neondatabase/serverless";
import { Star, MapPin, Phone, Clock, Navigation2, Globe, ChevronLeft } from "lucide-react";
import Link from "next/link";
import type { Restaurant } from "@/lib/types";
import { cityFromAddress, isOpenNow } from "@/lib/utils";

export const revalidate = 86400; // ISR — rebuild at most once per day

const DAY_ORDER = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];

async function getRestaurant(placeId: string): Promise<Restaurant | null> {
  const sql = neon(process.env.DATABASE_URL!);
  const rows = await sql`SELECT * FROM restaurants WHERE place_id = ${placeId} AND is_buffet = true LIMIT 1`;
  return (rows[0] as unknown as Restaurant) ?? null;
}

function parseAddress(address: string) {
  const parts = address.split(",").map(s => s.trim());
  const street = parts[0] ?? "";
  const city   = parts[1] ?? "";
  const stateZip = parts[2] ?? "";
  const [state, postalCode] = stateZip.split(" ");
  return { street, city, state: state ?? "", postalCode: postalCode ?? "" };
}

const REGION_LABELS: Record<string, string> = {
  MD: "Maryland", VA: "Virginia", DC: "Washington DC", MA: "Massachusetts",
  NY: "New York",  PA: "Pennsylvania", NJ: "New Jersey", IL: "Illinois", WA: "Washington",
};

const STATE_REGION: Record<string, string> = {
  MD: "dmv", VA: "dmv", DC: "dmv", MA: "boston", NY: "nyc",
  PA: "philly", NJ: "nj", IL: "chicago", WA: "seattle",
};

const REGION_NAMES: Record<string, string> = {
  dmv: "DMV Area", boston: "Boston", nyc: "NYC", philly: "Philly",
  nj: "New Jersey", chicago: "Chicago", seattle: "Seattle",
};

export async function generateMetadata({ params }: { params: Promise<{ place_id: string }> }): Promise<Metadata> {
  const { place_id } = await params;
  const r = await getRestaurant(place_id);
  if (!r) return { title: "Restaurant Not Found | BuffetFindr" };

  const city = cityFromAddress(r.address ?? "");
  const region = REGION_LABELS[r.state] ?? r.state;
  const title = `${r.name} — Indian Buffet in ${city}, ${r.state} | BuffetFindr`;
  const description = `${r.name} is an Indian buffet restaurant in ${city}, ${region}. ${r.rating ? `Rated ${r.rating}/5 from ${r.review_count?.toLocaleString()} reviews. ` : ""}Find hours, photos, and directions.`;
  const ogImage = r.photo_refs?.[0]
    ? `https://www.buffetfindr.com/api/photo?ref=${encodeURIComponent(r.photo_refs[0])}&w=800`
    : "https://www.buffetfindr.com/icon.png";

  return {
    title,
    description,
    openGraph: { title, description, images: [ogImage], type: "website", siteName: "BuffetFindr" },
    twitter:   { card: "summary_large_image", title, description, images: [ogImage] },
    alternates: { canonical: `https://www.buffetfindr.com/restaurant/${place_id}` },
  };
}

export default async function RestaurantPage({ params }: { params: Promise<{ place_id: string }> }) {
  const { place_id } = await params;
  const r = await getRestaurant(place_id);
  if (!r) notFound();

  const city      = cityFromAddress(r.address ?? "");
  const region    = STATE_REGION[r.state];
  const open      = isOpenNow(r);
  const addr      = parseAddress(r.address ?? "");
  const photos    = r.photo_refs?.slice(0, 5) ?? [];
  const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(r.address ?? r.name)}`;
  const mapsUrl   = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(r.name)}&query_place_id=${place_id}`;
  const today     = new Date().toLocaleDateString("en-US", { weekday: "long" });
  const hours     = DAY_ORDER.map(d => r.hours?.find(h => h.startsWith(d)) ?? `${d}: Closed`);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Restaurant",
    name: r.name,
    address: {
      "@type": "PostalAddress",
      streetAddress: addr.street,
      addressLocality: addr.city || city,
      addressRegion: r.state,
      postalCode: addr.postalCode,
      addressCountry: "US",
    },
    ...(r.phone   ? { telephone: r.phone }   : {}),
    ...(r.website ? { url: r.website }       : {}),
    ...(r.lat && r.lng ? { geo: { "@type": "GeoCoordinates", latitude: r.lat, longitude: r.lng } } : {}),
    ...(r.rating  ? { aggregateRating: { "@type": "AggregateRating", ratingValue: String(r.rating), reviewCount: String(r.review_count ?? 0) } } : {}),
    servesCuisine: "Indian",
    priceRange: r.price_level?.includes("MODERATE") ? "$$" : r.price_level?.includes("EXPENSIVE") ? "$$$" : "$",
    ...(photos[0] ? { image: `https://www.buffetfindr.com/api/photo?ref=${encodeURIComponent(photos[0])}&w=800` } : {}),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <div className="min-h-dvh bg-[var(--bg)] font-[family-name:var(--font-geist-sans)]">

        {/* Header */}
        <header className="sticky top-0 z-10 bg-white/90 backdrop-blur-sm border-b border-[var(--border)] px-4 py-3 flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2 text-sm text-[var(--muted)] hover:text-[var(--text)] transition-colors">
            <ChevronLeft size={16} />
            <img src="/icon.png" alt="BuffetFindr" className="w-6 h-6 rounded-lg object-cover" />
            <span className="font-semibold">BuffetFindr</span>
          </Link>
          {region && (
            <>
              <span className="text-[var(--border)]">/</span>
              <Link href={`/buffets/${region}`} className="text-sm text-[var(--muted)] hover:text-[var(--text)] transition-colors">
                {REGION_NAMES[region]}
              </Link>
            </>
          )}
        </header>

        {/* Hero */}
        <div className="relative h-56 sm:h-72 bg-gradient-to-br from-orange-100 to-amber-50 overflow-hidden">
          <div className="absolute inset-0 flex items-center justify-center text-7xl select-none">🍛</div>
          {photos[0] && (
            <img
              src={`/api/photo?ref=${encodeURIComponent(photos[0])}&w=800`}
              alt={r.name}
              className="absolute inset-0 h-full w-full object-cover"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
          <div className="absolute bottom-4 left-4 flex gap-2 flex-wrap">
            {open === true  && <span className="badge-open shadow">Open Now</span>}
            {open === false && <span className="badge-closed shadow">Closed</span>}
            {r.buffet_confidence === "HIGH" && <span className="badge bg-brand-500 text-white shadow">Verified Buffet</span>}
          </div>
        </div>

        {/* Photo strip */}
        {photos.length > 1 && (
          <div className="flex gap-2 px-4 py-2 overflow-x-auto bg-white border-b border-[var(--border)]">
            {photos.slice(1).map((ref, i) => (
              <div key={i} className="h-16 w-24 flex-shrink-0 rounded-xl overflow-hidden bg-gray-100">
                <img src={`/api/photo?ref=${encodeURIComponent(ref)}&w=200`} alt="" className="h-full w-full object-cover" loading="lazy" />
              </div>
            ))}
          </div>
        )}

        {/* Content */}
        <div className="max-w-2xl mx-auto px-4 py-6 flex flex-col gap-6">

          {/* Name + rating */}
          <div>
            <h1 className="text-2xl font-bold text-[var(--text)] leading-tight">{r.name}</h1>
            <div className="flex items-center gap-3 mt-2 flex-wrap">
              {r.rating && (
                <div className="flex items-center gap-1">
                  <Star size={14} className="fill-amber-400 text-amber-400" />
                  <span className="font-semibold text-sm">{r.rating}</span>
                  {r.review_count && <span className="text-xs text-[var(--muted)]">({r.review_count.toLocaleString()} reviews)</span>}
                </div>
              )}
              <span className={`badge ${r.buffet_confidence === "HIGH" ? "badge-high" : "badge-medium"}`}>
                {r.buffet_confidence === "HIGH" ? "Verified buffet" : "Likely buffet"}
              </span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-2 flex-wrap">
            <a href={directionsUrl} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 rounded-xl bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-600 transition-colors">
              <Navigation2 size={14} /> Directions
            </a>
            <a href={mapsUrl} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 rounded-xl border border-[var(--border)] bg-white px-5 py-2.5 text-sm font-semibold text-[var(--text)] hover:bg-gray-50 transition-colors">
              <img src="/google-maps-icon.svg" alt="" className="h-4 w-4" /> Google Maps
            </a>
            {r.phone && (
              <a href={`tel:${r.phone}`}
                className="flex items-center gap-2 rounded-xl border border-[var(--border)] bg-white px-5 py-2.5 text-sm font-semibold text-[var(--text)] hover:bg-gray-50 transition-colors">
                <Phone size={14} /> Call
              </a>
            )}
            {r.website && (
              <a href={r.website} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2 rounded-xl border border-[var(--border)] bg-white px-4 py-2.5 text-sm font-semibold text-[var(--text)] hover:bg-gray-50 transition-colors">
                <Globe size={14} /> Website
              </a>
            )}
          </div>

          {/* Address */}
          <div className="flex gap-3 items-start p-4 rounded-2xl bg-white border border-[var(--border)]">
            <MapPin size={16} className="text-brand-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-[var(--text)]">{r.address}</p>
              <p className="text-xs text-[var(--muted)] mt-0.5">{city}, {REGION_LABELS[r.state] ?? r.state}</p>
            </div>
          </div>

          {/* Hours */}
          {hours.length > 0 && (
            <div className="p-4 rounded-2xl bg-white border border-[var(--border)]">
              <div className="flex items-center gap-2 mb-3">
                <Clock size={15} className="text-[var(--muted)]" />
                <p className="text-sm font-semibold text-[var(--text)]">Hours</p>
              </div>
              <div className="flex flex-col gap-1.5">
                {hours.map(line => {
                  const [day, ...rest] = line.split(": ");
                  const isToday = day === today;
                  return (
                    <div key={day} className={`flex justify-between text-sm gap-4 ${isToday ? "font-semibold text-[var(--text)]" : "text-[var(--muted)]"}`}>
                      <span className="w-10 flex-shrink-0">{day.slice(0, 3)}</span>
                      <span className="text-right flex-1">{rest.join(": ") || "Closed"}</span>
                      {isToday && <span className="badge-open text-[10px] self-center">Today</span>}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Buffet evidence */}
          {r.buffet_evidence?.length > 0 && (
            <div className="p-4 rounded-2xl bg-white border border-[var(--border)]">
              <p className="text-sm font-semibold text-[var(--text)] mb-2">Why we listed this as a buffet</p>
              <ul className="flex flex-col gap-1.5">
                {r.buffet_evidence.map((e, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-[var(--muted)]">
                    <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-brand-400" />
                    {e}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Back to map CTA */}
          <div className="rounded-2xl border border-[var(--border)] bg-white p-5 text-center">
            <p className="text-sm text-[var(--muted)] mb-3">Find more Indian buffets near you</p>
            <Link href="/" className="inline-flex items-center gap-2 rounded-xl bg-brand-500 px-6 py-2.5 text-sm font-semibold text-white hover:bg-brand-600 transition-colors">
              Open BuffetFindr Map →
            </Link>
          </div>

          <p className="text-[11px] text-[var(--muted)] text-center pb-4">
            Data sourced from Google Places · <Link href="/privacy" className="underline">Privacy</Link>
          </p>
        </div>
      </div>
    </>
  );
}
