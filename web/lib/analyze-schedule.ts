import Anthropic from "@anthropic-ai/sdk";

export type BuffetSchedule = "BOTH" | "WEEKEND_ONLY" | "WEEKDAY_ONLY" | "DISCONTINUED" | "UNKNOWN";
export type ScheduleConfidence = "HIGH" | "MEDIUM" | "LOW";

export interface ScheduleResult {
  buffet_schedule: BuffetSchedule;
  confidence: ScheduleConfidence;
  reasoning: string;
}

interface PlaceReview {
  text?: { text: string };
  relativePublishTimeDescription?: string;
}

interface PlaceDetails {
  displayName?: { text: string };
  reviews?: PlaceReview[];
  editorialSummary?: { text: string };
  regularOpeningHours?: { weekdayDescriptions?: string[] };
}

export async function analyzeBuffetSchedule(placeId: string): Promise<ScheduleResult> {
  const googleApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? process.env.GOOGLE_MAPS_API_KEY;
  if (!googleApiKey) throw new Error("Google API key not configured");

  const url = `https://places.googleapis.com/v1/places/${placeId}?languageCode=en`;
  const placesRes = await fetch(url, {
    headers: {
      "X-Goog-Api-Key": googleApiKey,
      "X-Goog-FieldMask": "id,displayName,reviews,editorialSummary,regularOpeningHours",
    },
  });

  if (!placesRes.ok) {
    throw new Error(`Google Places API error: ${placesRes.status}`);
  }

  const place: PlaceDetails = await placesRes.json();
  const name = place.displayName?.text ?? "Unknown restaurant";
  const editorial = place.editorialSummary?.text ?? "";
  const hours = place.regularOpeningHours?.weekdayDescriptions?.join("\n") ?? "";
  const reviews = place.reviews ?? [];

  const reviewText = reviews
    .map((r, i) => {
      const text = r.text?.text ?? "";
      const when = r.relativePublishTimeDescription ?? "";
      return `[${i + 1}] (${when}): "${text}"`;
    })
    .filter(line => line.includes('"') && line.length > 20)
    .join("\n\n");

  if (!reviewText && !editorial) {
    return { buffet_schedule: "UNKNOWN", confidence: "LOW", reasoning: "No reviews or summary available." };
  }

  const anthropic = new Anthropic();

  const userContent = [
    `Restaurant: ${name}`,
    hours ? `Hours:\n${hours}` : "",
    editorial ? `Google summary: ${editorial}` : "",
    reviewText ? `\nRecent reviews (newest first):\n${reviewText}` : "",
    `\nClassify the buffet schedule. Respond with JSON only:`,
    `{`,
    `  "schedule": "BOTH" | "WEEKEND_ONLY" | "WEEKDAY_ONLY" | "DISCONTINUED" | "UNKNOWN",`,
    `  "confidence": "HIGH" | "MEDIUM" | "LOW",`,
    `  "reasoning": "1-2 sentence explanation"`,
    `}`,
    ``,
    `Rules:`,
    `- BOTH = buffet confirmed weekdays AND weekends`,
    `- WEEKEND_ONLY = buffet only Sat/Sun or just Sunday`,
    `- WEEKDAY_ONLY = buffet only Mon–Fri`,
    `- DISCONTINUED = reviews indicate buffet ended/stopped`,
    `- UNKNOWN = insufficient evidence`,
    `- Only HIGH confidence when multiple reviews clearly agree`,
    `- "no buffet" or "stopped doing buffet" → DISCONTINUED`,
  ].filter(Boolean).join("\n");

  const msg = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 512,
    system: "You classify Indian restaurant lunch buffet schedules from customer reviews. Output ONLY valid JSON, no markdown fences.",
    messages: [{ role: "user", content: userContent }],
  });

  const rawText = (msg.content[0] as { type: string; text: string }).text.trim();
  // Strip markdown code fences if present (model sometimes wraps JSON in ```json ... ```)
  const raw = rawText.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/i, "").trim();

  try {
    const parsed = JSON.parse(raw) as { schedule: BuffetSchedule; confidence: ScheduleConfidence; reasoning: string };
    const validSchedules: BuffetSchedule[] = ["BOTH", "WEEKEND_ONLY", "WEEKDAY_ONLY", "DISCONTINUED", "UNKNOWN"];
    return {
      buffet_schedule: validSchedules.includes(parsed.schedule) ? parsed.schedule : "UNKNOWN",
      confidence: parsed.confidence ?? "LOW",
      reasoning: parsed.reasoning ?? "",
    };
  } catch {
    return { buffet_schedule: "UNKNOWN", confidence: "LOW", reasoning: "Could not parse analysis response." };
  }
}
