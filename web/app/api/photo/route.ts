import { NextRequest, NextResponse } from "next/server";

// Proxies Google Places photo requests so the API key never leaves the server.
// Usage: /api/photo?ref=places/ChIJ.../photos/AXCi2Q...&w=600
export async function GET(req: NextRequest) {
  const ref = req.nextUrl.searchParams.get("ref");
  const w   = req.nextUrl.searchParams.get("w") ?? "600";

  if (!ref) return NextResponse.json({ error: "Missing ref" }, { status: 400 });

  const url = `https://places.googleapis.com/v1/${ref}/media`
    + `?maxWidthPx=${w}&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`;

  const upstream = await fetch(url);
  if (!upstream.ok) return NextResponse.json({ error: "Photo not found" }, { status: 404 });

  const buf = await upstream.arrayBuffer();
  return new NextResponse(buf, {
    headers: {
      "Content-Type": upstream.headers.get("Content-Type") ?? "image/jpeg",
      "Cache-Control": "no-store",
    },
  });
}
