import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const placeId = req.nextUrl.searchParams.get("place_id");
  if (!placeId)
    return NextResponse.json({ error: "place_id required" }, { status: 400 });

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!apiKey)
    return NextResponse.json({ error: "API key not configured" }, { status: 500 });

  const res = await fetch(
    `https://places.googleapis.com/v1/places/${placeId}?fields=reviews&key=${apiKey}&languageCode=en`,
    { next: { revalidate: 86400 } } // cache 24h
  );

  if (!res.ok)
    return NextResponse.json({ reviews: [] });

  const data = await res.json();
  const reviews = (data.reviews ?? []).slice(0, 3).map((r: Record<string, unknown>) => ({
    author:    (r.authorAttribution as Record<string, string>)?.displayName ?? "Anonymous",
    photoUrl:  (r.authorAttribution as Record<string, string>)?.photoUri ?? null,
    rating:    r.rating as number,
    text:      (r.text as Record<string, string>)?.text ?? "",
    timeAgo:   r.relativePublishTimeDescription as string ?? "",
  }));

  return NextResponse.json({ reviews });
}
