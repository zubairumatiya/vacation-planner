import { GoogleGenAI, ThinkingLevel } from "@google/genai";
import db from "../db/db.js";
import type {
  GeminiItineraryItem,
  GeminiRecommendedPlace,
  QuestionnaireRow,
  Schedule,
  Trip,
  TripList,
} from "../types/express.js";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
const MODEL = "gemini-3-flash-preview";

interface TripContext {
  trip: Trip;
  schedule: Schedule[];
  questionnaire: QuestionnaireRow | null;
  recommendedPlaces: GeminiRecommendedPlace[];
  wishList: TripList[];
}

export async function chat(
  tripId: string,
  userMessage: string
): Promise<{ text: string; itinerary?: GeminiItineraryItem[] }> {
  const context = await fetchTripContext(tripId);
  const systemPrompt = buildSystemPrompt(context);

  const response = await ai.models.generateContent({
    model: MODEL,
    contents: userMessage,
    config: {
      systemInstruction: systemPrompt,
      thinkingConfig: { thinkingLevel: ThinkingLevel.MEDIUM },
    },
  });

  const text = response.text ?? "";
  const itinerary = parseItinerary(text);

  // Store recommended places
  if (itinerary.length > 0) {
    await storeRecommendedPlaces(tripId, itinerary);
  }

  // Strip delimiters from the text returned to frontend
  const cleanText = text
    .replace(/====ITINERARY_START====[\s\S]*?====ITINERARY_END====/g, "")
    .trim();

  return {
    text: cleanText,
    itinerary: itinerary.length > 0 ? itinerary : undefined,
  };
}

async function fetchTripContext(tripId: string): Promise<TripContext> {
  const [tripResult, scheduleResult, questionnaireResult, recResult, wishResult] =
    await Promise.all([
      db.query<Trip>("SELECT * FROM trips WHERE id = $1", [tripId]),
      db.query<Schedule>(
        "SELECT * FROM trip_schedule WHERE trip_id = $1 ORDER BY start_time ASC, sort_index ASC",
        [tripId]
      ),
      db.query<QuestionnaireRow>(
        "SELECT * FROM trip_questionnaire WHERE trip_id = $1",
        [tripId]
      ),
      db.query<GeminiRecommendedPlace>(
        "SELECT * FROM gemini_recommended_places WHERE trip_id = $1 ORDER BY recommended_at ASC",
        [tripId]
      ),
      db.query<TripList>(
        "SELECT * FROM trip_list WHERE trip_id = $1 AND item_added = false",
        [tripId]
      ),
    ]);

  return {
    trip: tripResult.rows[0],
    schedule: scheduleResult.rows,
    questionnaire: questionnaireResult.rows[0] ?? null,
    recommendedPlaces: recResult.rows,
    wishList: wishResult.rows,
  };
}

function buildSystemPrompt(ctx: TripContext): string {
  const { trip, schedule, questionnaire, recommendedPlaces, wishList } = ctx;

  const startDate = new Date(trip.start_date);
  const endDate = new Date(trip.end_date);
  const tripLength = Math.ceil(
    (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  const formattedSchedule =
    schedule.length > 0
      ? schedule
          .map((s) => {
            const date = new Date(s.start_time).toLocaleDateString("en-US", {
              weekday: "short",
              month: "short",
              day: "numeric",
            });
            const startTime = new Date(s.start_time).toLocaleTimeString("en-US", {
              hour: "numeric",
              minute: "2-digit",
            });
            const endTime = new Date(s.end_time).toLocaleTimeString("en-US", {
              hour: "numeric",
              minute: "2-digit",
            });
            return `- ${date} ${startTime}–${endTime}: ${s.location}${s.details ? ` (${s.details})` : ""}`;
          })
          .join("\n")
      : "No activities scheduled yet.";

  const recPlaceNames =
    recommendedPlaces.length > 0
      ? recommendedPlaces.map((p) => p.place_name).join(", ")
      : "None yet.";

  const wishListItems =
    wishList.length > 0
      ? wishList.map((w) => w.value).join(", ")
      : "None.";

  // Build questionnaire section
  let questionnaireSection = "No questionnaire filled out yet.";
  if (questionnaire) {
    const q = questionnaire;
    const fields = [
      q.budget && `- **Budget:** ${q.budget}`,
      q.interests && `- **Interests:** ${q.interests}`,
      q.dietary_restrictions && `- **Dietary Restrictions:** ${q.dietary_restrictions}`,
      q.pace && `- **Pace:** ${q.pace}`,
      q.traveling_with_kids_or_elderly && `- **Traveling with kids/elderly:** ${q.traveling_with_kids_or_elderly}`,
      q.accessibility_needs && `- **Accessibility Needs:** ${q.accessibility_needs}`,
      q.tour_preference && `- **Tour Preference:** ${q.tour_preference}`,
      q.accommodation_type && `- **Accommodation Type:** ${q.accommodation_type}`,
      q.must_see_experiences && `- **Must-See:** ${q.must_see_experiences}`,
      q.start_time_preference && `- **Start Time Preference:** ${q.start_time_preference}`,
    ].filter(Boolean);
    if (fields.length > 0) {
      questionnaireSection = fields.join("\n");
    }
  }

  return `You are a vacation planning AI assistant embedded in a trip planning app.

## Your Role
Help users plan the perfect trip by recommending places, activities, restaurants, and experiences. Base your recommendations on:
- Google Reviews (prioritize highly-rated places with significant review counts)
- Reddit travel recommendations and local subreddit insights
- Rick Steves travel guides and recommendations
- Local and current events happening during the trip dates (sports, concerts, festivals, fairs, cultural events, seasonal activities)
- TripAdvisor and travel blog consensus

## Trip Details
- **Destination:** ${trip.location}
- **Dates:** ${startDate.toLocaleDateString("en-US")} to ${endDate.toLocaleDateString("en-US")} (${tripLength} days)
- **Trip Name:** ${trip.trip_name}

## User Preferences (from questionnaire)
${questionnaireSection}

**Important:** The user may override any preference in their message. Always prioritize what the user says in their current message over the questionnaire.

## Current Schedule (already planned)
${formattedSchedule}

## Already Recommended Places (avoid re-recommending)
${recPlaceNames}

You have already suggested these places. Do NOT recommend them again UNLESS the place is an exceptionally strong fit for what the user is currently asking. If you do re-recommend, briefly explain why it's worth revisiting.

## User's Wish List (places they want to visit)
${wishListItems}

## Response Format
- When suggesting places or schedule items, wrap them in delimiters:

====ITINERARY_START====
[
  {
    "location": "Place Name",
    "details": "Brief description. Include practical warnings if relevant.",
    "category": "restaurant|museum|park|event|activity|landmark|nightlife|shopping",
    "startTime": "YYYY-MM-DDTHH:MM:00Z",
    "endTime": "YYYY-MM-DDTHH:MM:00Z",
    "cost": 0.00,
    "multiDay": false
  }
]
====ITINERARY_END====

- For conversational responses (questions, general advice), respond normally without delimiters.
- You can mix text and itinerary blocks in a single response.

## Recommendation Style
- Keep reasoning succinct. If a place is an obvious great choice, the reason can be omitted entirely or kept to a few words like "4.7★, 2k reviews".
- Only elaborate when the recommendation is non-obvious or niche.

## Practical Details (IMPORTANT — include in the "details" field when relevant)
Always flag these when they apply to a place:
- Cash only / does not accept credit cards
- No reservations accepted (walk-in only) or reservations required far in advance
- Weather-dependent (outdoor activity that may be cancelled)
- Seasonal closures or limited hours on certain days
- Dress code requirements
- Not wheelchair/stroller accessible (if user has accessibility needs)
- Long typical wait times or best time to avoid crowds
- Advance ticket purchase required (and how far in advance)
- Age restrictions or not kid-friendly (if traveling with kids)
- Language barriers (menu not in English, staff doesn't speak English)
- Located far from other planned activities (significant transit time)
- Alcohol not served / BYOB (if relevant to user's interests)
- Photography restrictions at the venue
- Tipping customs or service charge policies
- Safety considerations for the area (especially at night)

## Other Guidelines
- Consider travel time between locations when suggesting a day's itinerary.
- Respect the user's pace preference — don't overload a "relaxed" traveler.
- For events, include dates and ticket info.
- Use the trip's actual dates when suggesting times in the itinerary JSON.`;
}

function parseItinerary(text: string): GeminiItineraryItem[] {
  const regex = /====ITINERARY_START====([\s\S]*?)====ITINERARY_END====/g;
  const items: GeminiItineraryItem[] = [];

  let match;
  while ((match = regex.exec(text)) !== null) {
    try {
      const parsed = JSON.parse(match[1].trim());
      if (Array.isArray(parsed)) {
        for (const item of parsed) {
          items.push({
            location: item.location ?? "",
            details: item.details ?? "",
            category: item.category ?? "",
            startTime: item.startTime ?? "",
            endTime: item.endTime ?? "",
            cost: Number(item.cost) || 0,
            multiDay: Boolean(item.multiDay),
          });
        }
      }
    } catch (err) {
      console.error("[Gemini] Failed to parse itinerary block:", err);
    }
  }

  return items;
}

async function storeRecommendedPlaces(
  tripId: string,
  items: GeminiItineraryItem[]
): Promise<void> {
  const values: string[] = [];
  const params: (string | null)[] = [];
  let idx = 1;

  for (const item of items) {
    values.push(`($${idx}, $${idx + 1}, $${idx + 2})`);
    params.push(tripId, item.location, item.category || null);
    idx += 3;
  }

  if (values.length === 0) return;

  await db.query(
    `INSERT INTO gemini_recommended_places (trip_id, place_name, place_category)
     VALUES ${values.join(", ")}`,
    params
  );
}

export async function getRecommendedPlaces(
  tripId: string
): Promise<GeminiRecommendedPlace[]> {
  const result = await db.query<GeminiRecommendedPlace>(
    "SELECT * FROM gemini_recommended_places WHERE trip_id = $1 ORDER BY recommended_at DESC",
    [tripId]
  );
  return result.rows;
}

export async function clearRecommendedPlaces(tripId: string): Promise<void> {
  await db.query("DELETE FROM gemini_recommended_places WHERE trip_id = $1", [
    tripId,
  ]);
}

export async function markPlaceAdded(placeId: string): Promise<void> {
  await db.query(
    "UPDATE gemini_recommended_places SET added_to_schedule = true WHERE id = $1",
    [placeId]
  );
}
