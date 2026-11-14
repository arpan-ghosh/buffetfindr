import { NextRequest, NextResponse } from "next/server";

const KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

// Google Places photo resource names expire, so the refs stored in the DB go stale.
// When Google rejects one, we look up the place's current photo names and serve the
// photo at the same position instead. Fresh names are cached per server instance.
const FRESH_TTL_MS = 30 * 60 * 1000;
const freshNames = new Map<string, { names: string[]; at: number }>();

// Every request here is a paid Google call, so only well-formed photo resource names
// and the widths the apps actually request are passed upstream.
const REF_RE = /^places\/[A-Za-z0-9_-]{10,255}\/photos\/[A-Za-z0-9_-]{10,1024}$/;
// web: 200 (thumbnails), 420 (carousel), 800 (detail); mobile: 200, 600 (default).
const ALLOWED_WIDTHS = [200, 420, 600, 800];
const MAX_PHOTO_INDEX = 20;

/** Snaps any requested width to the nearest allowed one (default 600). */
function clampWidth(raw: string | null): number {
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return 600;
  return ALLOWED_WIDTHS.reduce((best, w) => (Math.abs(w - n) < Math.abs(best - n) ? w : best));
}

async function fetchPhoto(name: string, w: number) {
  return fetch(`https://places.googleapis.com/v1/${name}/media?maxWidthPx=${w}&key=${KEY}`);
}

async function freshPhotoNames(placeId: string): Promise<string[]> {
  const hit = freshNames.get(placeId);
  if (hit && Date.now() - hit.at < FRESH_TTL_MS) return hit.names;

  const res = await fetch(`https://places.googleapis.com/v1/places/${placeId}`, {
    headers: { "X-Goog-Api-Key": KEY ?? "", "X-Goog-FieldMask": "photos.name" },
  });
  if (!res.ok) return [];
  const data = await res.json();
  const names: string[] = (data.photos ?? []).map((p: { name: string }) => p.name);
  freshNames.set(placeId, { names, at: Date.now() });
  return names;
}

// Proxies Google Places photo requests so the API key never leaves the server.
// Usage: /api/photo?ref=places/ChIJ.../photos/AXCi2Q...&w=600&i=2
// `i` is the photo's index in the restaurant's photo list (used if the ref has expired).
export async function GET(req: NextRequest) {
  const ref = req.nextUrl.searchParams.get("ref");
  const w   = clampWidth(req.nextUrl.searchParams.get("w"));
  const rawI = Math.trunc(Number(req.nextUrl.searchParams.get("i") ?? "0")) || 0;
  const i   = Math.min(Math.max(rawI, 0), MAX_PHOTO_INDEX);

  if (!ref) return NextResponse.json({ error: "Missing ref" }, { status: 400 });
  if (!REF_RE.test(ref)) return NextResponse.json({ error: "Invalid ref" }, { status: 400 });

  let upstream = await fetchPhoto(ref, w);

  if (!upstream.ok) {
    const placeId = ref.match(/^places\/([^/]+)\/photos\//)?.[1];
    if (placeId) {
      const names = await freshPhotoNames(placeId);
      const name = names[i] ?? names[0];
      if (name) upstream = await fetchPhoto(name, w);
    }
  }

  if (!upstream.ok) return NextResponse.json({ error: "Photo not found" }, { status: 404 });

  const buf = await upstream.arrayBuffer();
  return new NextResponse(buf, {
    headers: {
      "Content-Type": upstream.headers.get("Content-Type") ?? "image/jpeg",
      "Cache-Control": "no-store",
    },
  });
}
