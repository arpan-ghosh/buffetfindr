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

// Google place ids are URL-safe base64-ish tokens. Checked here as well as in the API
// route because the id is interpolated into a paid upstream URL.
export const PLACE_ID_RE = /^[A-Za-z0-9_-]{10,255}$/;

const GOOGLE_TIMEOUT_MS = 10_000;
const ANTHROPIC_TIMEOUT_MS = 20_000;

/**
 * Makes up to one paid Google Places call and one paid Anthropic call.
 * Throws on any upstream failure or unusable model output, so callers never
 * persist a failure as if it were a real classification.
 */
export async function analyzeBuffetSchedule(placeId: string): Promise<ScheduleResult> {
  if (!PLACE_ID_RE.test(placeId)) throw new Error("Invalid place_id");

  const googleApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? process.env.GOOGLE_MAPS_API_KEY;
  if (!googleApiKey) throw new Error("Google API key not configured");

  const url = `https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}?languageCode=en`;
  const placesRes = await fetch(url, {
    signal: AbortSignal.timeout(GOOGLE_TIMEOUT_MS),
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

  // One retry at most (SDK default is two) and a hard timeout, to bound spend and duration.
  const anthropic = new Anthropic({ maxRetries: 1, timeout: ANTHROPIC_TIMEOUT_MS });

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

  const first = msg.content[0];
  if (!first || first.type !== "text") throw new Error("Anthropic returned no text content");
  const rawText = first.text.trim();
  // Strip markdown code fences if present (model sometimes wraps JSON in ```json ... ```)
  const raw = rawText.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/i, "").trim();

  let parsed: { schedule?: BuffetSchedule; confidence?: ScheduleConfidence; reasoning?: string };
  try {
    parsed = JSON.parse(raw);
  } catch {
    // Thrown (not returned as UNKNOWN) so a garbled reply is not cached as a real result.
    throw new Error("Could not parse analysis response");
  }

  const validSchedules: BuffetSchedule[] = ["BOTH", "WEEKEND_ONLY", "WEEKDAY_ONLY", "DISCONTINUED", "UNKNOWN"];
  const validConfidence: ScheduleConfidence[] = ["HIGH", "MEDIUM", "LOW"];
  if (!parsed || !validSchedules.includes(parsed.schedule as BuffetSchedule)) {
    throw new Error("Analysis response had no valid schedule");
  }
  return {
    buffet_schedule: parsed.schedule as BuffetSchedule,
    confidence: validConfidence.includes(parsed.confidence as ScheduleConfidence) ? (parsed.confidence as ScheduleConfidence) : "LOW",
    reasoning: typeof parsed.reasoning === "string" ? parsed.reasoning.slice(0, 500) : "",
  };
}
