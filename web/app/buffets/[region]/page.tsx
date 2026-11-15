import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { neon } from "@neondatabase/serverless";
import { snapshotBuffets } from "@/lib/snapshot";
import { Star, MapPin, ChevronRight } from "lucide-react";
import Link from "next/link";
import type { Restaurant } from "@/lib/types";
import { cityFromAddress } from "@/lib/utils";
import { REGION_DEFS, inRegion } from "@/lib/regions";

export const revalidate = 86400;

// Membership (states + bounding boxes) lives in lib/regions.ts; this is display copy only.
const REGIONS: Record<string, { label: string; description: string }> = {
  dmv:     { label: "DC, Maryland & Virginia", description: "Washington DC, Maryland, and Northern Virginia" },
  boston:  { label: "Boston", description: "Greater Boston and Massachusetts" },
  nyc:     { label: "New York City", description: "New York City and surrounding areas" },
  philly:  { label: "Philadelphia", description: "Philadelphia and Pennsylvania" },
  nj:      { label: "New Jersey", description: "New Jersey" },
  chicago: { label: "Chicago", description: "Chicago and Illinois" },
  seattle: { label: "Seattle", description: "Seattle and Washington State" },
  la:      { label: "Los Angeles", description: "Los Angeles and Southern California" },
  dallas:  { label: "Dallas–Fort Worth", description: "Dallas–Fort Worth and North Texas" },
  houston: { label: "Houston", description: "Houston and Southeast Texas" },
  miami:   { label: "Miami", description: "Miami and South Florida" },
  atlanta: { label: "Atlanta", description: "Atlanta and Georgia" },
  bayarea: { label: "San Francisco Bay Area", description: "the San Francisco Bay Area, Silicon Valley, and the East Bay" },
  phoenix: { label: "Phoenix", description: "Phoenix, Scottsdale, Tempe, and Arizona" },
  columbus:   { label: "Columbus", description: "Columbus, Dublin, and Central Ohio" },
  cleveland:  { label: "Cleveland", description: "Cleveland, Parma, Solon, and Northeast Ohio" },
  cincinnati: { label: "Cincinnati", description: "Cincinnati, West Chester, and Northern Kentucky" },
  austin:      { label: "Austin", description: "Austin, Round Rock, Cedar Park, and Central Texas" },
  sanantonio:  { label: "San Antonio", description: "San Antonio and South Central Texas" },
  sandiego:    { label: "San Diego", description: "San Diego, Mira Mesa, and North County" },
  sacramento:  { label: "Sacramento", description: "Sacramento, Roseville, Folsom, and Elk Grove" },
  lasvegas:    { label: "Las Vegas", description: "Las Vegas, Henderson, and Southern Nevada" },
  detroit:     { label: "Detroit", description: "Metro Detroit — Farmington Hills, Troy, Canton, and Novi" },
  minneapolis: { label: "Minneapolis–St. Paul", description: "Minneapolis, St. Paul, and the Twin Cities suburbs" },
  denver:      { label: "Denver", description: "Denver, Aurora, Lakewood, and the Front Range suburbs" },
  tampa:       { label: "Tampa Bay", description: "Tampa, St. Petersburg, Clearwater, and Brandon" },
  orlando:     { label: "Orlando", description: "Orlando, Kissimmee, Lake Mary, and Central Florida" },
  charlotte:   { label: "Charlotte", description: "Charlotte, Pineville, Matthews, and Fort Mill" },
  raleigh:     { label: "Raleigh–Durham", description: "Raleigh, Durham, Cary, Morrisville, and Chapel Hill" },
};

async function getBuffets(region: string): Promise<Restaurant[]> {
  try {
    const sql = neon(process.env.DATABASE_URL!);
    const rows = await sql`
      SELECT * FROM restaurants
      WHERE is_buffet = true AND state = ANY(${REGION_DEFS[region].states}::text[])
      ORDER BY buffet_score DESC
    `;
    return (rows as unknown as Restaurant[]).filter(r => inRegion(r, region));
  } catch (err) {
    console.error("[buffets] DB failed, using JSON snapshot:", err instanceof Error ? err.message : err);
    return snapshotBuffets(REGION_DEFS[region].files)
      .filter(r => inRegion(r, region))
      .sort((a, b) => (b.buffet_score ?? 0) - (a.buffet_score ?? 0));
  }
}

export async function generateMetadata({ params }: { params: Promise<{ region: string }> }): Promise<Metadata> {
  const { region } = await params;
  const config = REGIONS[region];
  if (!config) return { title: "Not Found | BuffetFindr" };

  const title = `Indian Buffets in ${config.label} | BuffetFindr`;
  const description = `Find the best Indian buffet restaurants in ${config.description}. Verified lunch and dinner buffets with hours, ratings, and directions.`;
  return {
    title,
    description,
    openGraph: { title, description, type: "website", siteName: "BuffetFindr" },
    alternates: { canonical: `https://www.buffetfindr.com/buffets/${region}` },
  };
}

export default async function RegionPage({ params }: { params: Promise<{ region: string }> }) {
  const { region } = await params;
  const config = REGIONS[region];
  if (!config || !REGION_DEFS[region]) notFound();

  const buffets = await getBuffets(region);

  return (
    <div className="min-h-dvh bg-[var(--bg)] font-[family-name:var(--font-geist-sans)]">

      {/* Header */}
      <header className="sticky top-0 z-10 bg-white/90 backdrop-blur-sm border-b border-[var(--border)] px-4 py-3 flex items-center gap-3">
        <Link href="/" className="flex items-center gap-2 text-sm text-[var(--muted)] hover:text-[var(--text)] transition-colors">
          <img src="/icon.png" alt="BuffetFindr" className="w-6 h-6 rounded-lg object-cover" />
          <span className="font-semibold">BuffetFindr</span>
        </Link>
        <span className="text-[var(--border)]">/</span>
        <span className="text-sm font-semibold text-[var(--text)]">{config.label}</span>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-8">

        {/* Title block */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-[var(--text)] mb-2">
            Indian Buffets in {config.label}
          </h1>
          <p className="text-sm text-[var(--muted)] leading-relaxed">
            {buffets.length} Indian buffet restaurants in {config.description}, sourced from Google Places and verified by score and reviews.
          </p>
        </div>

        {/* Open in map CTA */}
        <Link
          href={`/?region=${region}`}
          className="flex items-center justify-between rounded-2xl bg-brand-500 text-white px-5 py-4 mb-6 hover:bg-brand-600 transition-colors group"
        >
          <div>
            <p className="font-semibold text-sm">View on interactive map</p>
            <p className="text-xs text-white/80 mt-0.5">See all {buffets.length} buffets with pins, hours & photos</p>
          </div>
          <ChevronRight size={18} className="group-hover:translate-x-0.5 transition-transform" />
        </Link>

        {/* Restaurant list */}
        <div className="flex flex-col gap-3">
          {buffets.map(r => {
            const city = cityFromAddress(r.address ?? "");
            return (
              <Link
                key={r.place_id}
                href={`/restaurant/${r.place_id}`}
                className="flex items-start gap-3 rounded-2xl bg-white border border-[var(--border)] p-4 hover:border-brand-300 hover:shadow-sm transition-all group"
              >
                {/* Thumbnail */}
                <div className="h-14 w-14 flex-shrink-0 rounded-xl overflow-hidden bg-amber-50 flex items-center justify-center text-2xl">
                  {r.photo_refs?.[0]
                    ? <img src={`/api/photo?ref=${encodeURIComponent(r.photo_refs[0])}&w=200`} alt="" className="h-full w-full object-cover" loading="lazy" />
                    : "🍛"}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <h2 className="text-sm font-semibold text-[var(--text)] leading-tight group-hover:text-brand-600 transition-colors truncate">
                      {r.name}
                    </h2>
                    {r.buffet_confidence === "HIGH" && (
                      <span className="badge badge-high flex-shrink-0">Verified</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    {r.rating && (
                      <div className="flex items-center gap-1">
                        <Star size={11} className="fill-amber-400 text-amber-400" />
                        <span className="text-xs font-medium">{r.rating}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1 text-xs text-[var(--muted)]">
                      <MapPin size={11} />
                      <span className="truncate">{city}, {r.state}</span>
                    </div>
                  </div>
                </div>

                <ChevronRight size={14} className="text-[var(--muted)] mt-1 flex-shrink-0 group-hover:text-brand-500 transition-colors" />
              </Link>
            );
          })}
        </div>

        <p className="text-[11px] text-[var(--muted)] text-center mt-8 pb-4">
          Data sourced from Google Places · <Link href="/privacy" className="underline">Privacy</Link>
        </p>
      </div>
    </div>
  );
}
