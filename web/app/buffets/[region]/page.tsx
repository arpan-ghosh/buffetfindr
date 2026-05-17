import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { neon } from "@neondatabase/serverless";
import { Star, MapPin, ChevronRight } from "lucide-react";
import Link from "next/link";
import type { Restaurant } from "@/lib/types";
import { cityFromAddress } from "@/lib/utils";

export const revalidate = 86400;

const REGIONS: Record<string, { label: string; states: string[]; description: string }> = {
  dmv:     { label: "DC, Maryland & Virginia", states: ["DC","MD","VA"], description: "Washington DC, Maryland, and Northern Virginia" },
  boston:  { label: "Boston",                  states: ["MA"],           description: "Greater Boston and Massachusetts" },
  nyc:     { label: "New York City",            states: ["NY"],           description: "New York City and surrounding areas" },
  philly:  { label: "Philadelphia",             states: ["PA"],           description: "Philadelphia and Pennsylvania" },
  nj:      { label: "New Jersey",               states: ["NJ"],           description: "New Jersey" },
  chicago: { label: "Chicago",                  states: ["IL"],           description: "Chicago and Illinois" },
  seattle: { label: "Seattle",                  states: ["WA"],           description: "Seattle and Washington State" },
};

async function getBuffets(states: string[]): Promise<Restaurant[]> {
  const sql = neon(process.env.DATABASE_URL!);
  const rows = await sql`
    SELECT * FROM restaurants
    WHERE is_buffet = true AND state = ANY(${states}::text[])
    ORDER BY buffet_score DESC
  `;
  return rows as unknown as Restaurant[];
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
  if (!config) notFound();

  const buffets = await getBuffets(config.states);

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
