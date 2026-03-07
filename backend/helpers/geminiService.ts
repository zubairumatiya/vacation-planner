import { GoogleGenAI, ThinkingLevel } from "@google/genai";
import db from "../db/db.js";
import type {
  GeminiItineraryItem,
  GeminiListPlace,
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
  listPlaces: GeminiListPlace[];
  wishList: TripList[];
}

export async function chat(
  tripId: string,
  userMessage: string,
  mode: "schedule" | "list" | null = null,
  categories?: string[],
): Promise<{ text: string; itinerary?: GeminiItineraryItem[]; question?: string }> {
  const context = await fetchTripContext(tripId);

  let systemPrompt: string;
  let effectiveMessage = userMessage;

  if (mode === "list") {
    systemPrompt = buildListSystemPrompt(context, categories ?? []);
    if (!effectiveMessage) {
      effectiveMessage = `Please recommend the top places for my trip to ${context.trip.location}.`;
    }
  } else if (mode === "schedule") {
    systemPrompt = buildSystemPrompt(context);
    if (!effectiveMessage) {
      effectiveMessage = `Please organize my list items into an optimized daily schedule for my trip.`;
    }
  } else {
    systemPrompt = buildGeneralSystemPrompt(context);
  }

  const response = await ai.models.generateContent({
    model: MODEL,
    contents: effectiveMessage,
    config: {
      systemInstruction: systemPrompt,
      thinkingConfig: { thinkingLevel: ThinkingLevel.HIGH },
    },
  });

  const text = response.text ?? "";
  const question = parseQuestion(text);
  const itinerary = parseItinerary(text);

  // Store recommended/list places
  if (itinerary.length > 0) {
    if (mode === "list") {
      await storeListPlaces(tripId, itinerary);
    } else {
      await storeRecommendedPlaces(tripId, itinerary);
    }
  }

  // Strip delimiters from the text returned to frontend
  const cleanText = text
    .replace(/====ITINERARY_START====[\s\S]*?====ITINERARY_END====/g, "")
    .replace(/====QUESTION_START====[\s\S]*?====QUESTION_END====/g, "")
    .trim();

  return {
    text: cleanText,
    itinerary: itinerary.length > 0 ? itinerary : undefined,
    question: question ?? undefined,
  };
}

export async function scheduleListItems(
  tripId: string,
  userMessage: string,
): Promise<{
  text: string;
  recommendations: GeminiItineraryItem[];
  schedule: Schedule[];
  question?: string;
}> {
  const context = await fetchTripContext(tripId);
  const systemPrompt = buildSystemPrompt(context);

  const response = await ai.models.generateContent({
    model: MODEL,
    contents: userMessage,
    config: {
      systemInstruction: systemPrompt,
      thinkingConfig: { thinkingLevel: ThinkingLevel.HIGH },
    },
  });

  const text = response.text ?? "";
  const question = parseQuestion(text);
  const itinerary = parseItinerary(text);

  const cleanText = text
    .replace(/====ITINERARY_START====[\s\S]*?====ITINERARY_END====/g, "")
    .replace(/====QUESTION_START====[\s\S]*?====QUESTION_END====/g, "")
    .trim();

  if (question || itinerary.length === 0) {
    return {
      text: cleanText,
      recommendations: [],
      schedule: context.schedule,
      question: question ?? undefined,
    };
  }

  // Build a set of the user's list item names (lowercase) for matching
  const listNameSet = new Set<string>();
  for (const w of context.wishList) {
    listNameSet.add(w.value.toLowerCase());
  }

  const listSourced: GeminiItineraryItem[] = [];
  const recommendations: GeminiItineraryItem[] = [];

  for (const item of itinerary) {
    if (listNameSet.has(item.location.toLowerCase())) {
      listSourced.push(item);
    } else {
      recommendations.push(item);
    }
  }

  // Bulk insert list-sourced items into trip_schedule
  const client = await db.connect();
  try {
    await client.query("BEGIN");

    for (const item of listSourced) {
      const cost = Number(item.cost) || 0;
      const startTime = item.startTime || new Date().toISOString();
      const endTime = item.endTime || new Date(Date.now() + 3600000).toISOString();

      await client.query(
        `INSERT INTO trip_schedule (trip_id, start_time, end_time, location, cost, details, multi_day, sort_index)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 0)`,
        [tripId, startTime, endTime, item.location, cost, item.details || "", item.multiDay || false],
      );

      // Mark the corresponding list item as added
      await client.query(
        `UPDATE trip_list SET item_added = true, last_modified = NOW()
         WHERE trip_id = $1 AND LOWER(value) = LOWER($2) AND item_added = false`,
        [tripId, item.location],
      );
    }

    // Renumber all sort indices by start_time
    await client.query(
      `WITH ordered AS (
        SELECT id, ROW_NUMBER() OVER (ORDER BY start_time ASC, sort_index ASC) AS rn
        FROM trip_schedule WHERE trip_id = $1
      )
      UPDATE trip_schedule t
      SET sort_index = ordered.rn * 1000
      FROM ordered
      WHERE t.id = ordered.id`,
      [tripId],
    );

    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }

  // Store recommendations in gemini_recommended_places for sidebar
  if (recommendations.length > 0) {
    await storeRecommendedPlaces(tripId, recommendations);
  }

  // Fetch the full updated schedule
  const scheduleResult = await db.query<Schedule>(
    "SELECT * FROM trip_schedule WHERE trip_id = $1 ORDER BY start_time ASC, sort_index ASC",
    [tripId],
  );

  return {
    text: cleanText,
    recommendations,
    schedule: scheduleResult.rows,
    question: undefined,
  };
}

async function fetchTripContext(tripId: string): Promise<TripContext> {
  const [
    tripResult,
    scheduleResult,
    questionnaireResult,
    recResult,
    listResult,
    wishResult,
  ] = await Promise.all([
    db.query<Trip>("SELECT * FROM trips WHERE id = $1", [tripId]),
    db.query<Schedule>(
      "SELECT * FROM trip_schedule WHERE trip_id = $1 ORDER BY start_time ASC, sort_index ASC",
      [tripId],
    ),
    db.query<QuestionnaireRow>(
      "SELECT * FROM trip_questionnaire WHERE trip_id = $1",
      [tripId],
    ),
    db.query<GeminiRecommendedPlace>(
      "SELECT * FROM gemini_recommended_places WHERE trip_id = $1 ORDER BY recommended_at ASC",
      [tripId],
    ),
    db.query<GeminiListPlace>(
      "SELECT * FROM gemini_list_places WHERE trip_id = $1 ORDER BY recommended_at ASC",
      [tripId],
    ),
    db.query<TripList>(
      "SELECT * FROM trip_list WHERE trip_id = $1 AND item_added = false",
      [tripId],
    ),
  ]);

  return {
    trip: tripResult.rows[0],
    schedule: scheduleResult.rows,
    questionnaire: questionnaireResult.rows[0] ?? null,
    recommendedPlaces: recResult.rows,
    listPlaces: listResult.rows,
    wishList: wishResult.rows,
  };
}

function formatSchedule(schedule: Schedule[], trip?: Trip): string {
  // Build a map of date -> items
  const byDate = new Map<string, Schedule[]>();
  for (const s of schedule) {
    const dateKey = new Date(s.start_time).toISOString().slice(0, 10);
    if (!byDate.has(dateKey)) byDate.set(dateKey, []);
    byDate.get(dateKey)!.push(s);
  }

  // Generate all trip days so the AI can see empty days
  const allDays: string[] = [];
  if (trip) {
    const start = new Date(trip.start_date);
    const end = new Date(trip.end_date);
    const cursor = new Date(start);
    while (cursor <= end) {
      allDays.push(cursor.toISOString().slice(0, 10));
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
  } else {
    // Fallback: just use dates from schedule
    allDays.push(...byDate.keys());
  }

  if (allDays.length === 0 && schedule.length === 0) return "No activities scheduled yet.";

  const lines: string[] = [];
  for (const dateKey of allDays) {
    const d = new Date(dateKey + "T00:00:00Z");
    const dayLabel = d.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      timeZone: "UTC",
    });
    const items = byDate.get(dateKey);
    if (!items || items.length === 0) {
      lines.push(`### ${dayLabel}\n  (No activities scheduled — available for planning)`);
    } else {
      lines.push(`### ${dayLabel}`);
      for (const s of items) {
        const startTime = new Date(s.start_time).toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
        });
        const endTime = new Date(s.end_time).toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
        });
        lines.push(`  - ${startTime}–${endTime}: ${s.location}${s.details ? ` (${s.details})` : ""}`);
      }
    }
  }
  return lines.join("\n");
}

function formatListItems(ctx: TripContext): string {
  if (ctx.wishList.length === 0) return "No list items yet.";

  // Count occurrences of each item name to inform AI about duplicates
  const countMap = new Map<string, { count: number; details: string | null }>();
  for (const w of ctx.wishList) {
    const key = w.value.toLowerCase().trim();
    const existing = countMap.get(key);
    if (existing) {
      existing.count++;
    } else {
      countMap.set(key, { count: 1, details: w.details });
    }
  }

  const items: string[] = [];
  for (const w of ctx.wishList) {
    const key = w.value.toLowerCase().trim();
    const entry = countMap.get(key)!;
    // Only emit each unique name once
    if (entry.count === -1) continue; // already emitted
    const countNote = entry.count > 1 ? ` (×${entry.count} — can be scheduled up to ${entry.count} times)` : "";
    items.push(`- ${w.value}${entry.details ? ` — ${entry.details}` : ""}${countNote}`);
    countMap.set(key, { ...entry, count: -1 }); // mark as emitted
  }
  return items.join("\n");
}

function buildSystemPrompt(ctx: TripContext): string {
  const { trip, schedule, questionnaire, recommendedPlaces, listPlaces, wishList } = ctx;

  const startDate = new Date(trip.start_date);
  const endDate = new Date(trip.end_date);
  const tripLength = Math.ceil(
    (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24),
  );

  const formattedSchedule = formatSchedule(schedule, trip);
  const formattedListItems = formatListItems(ctx);

  const recPlaceNames =
    recommendedPlaces.length > 0
      ? recommendedPlaces.map((p) => p.place_name).join(", ")
      : "None yet.";

  const questionnaireSection = buildQuestionnaireSection(questionnaire);
  const schedulingRules = buildSchedulingRules(questionnaire);

  return `You are a trip organizer and logistics planner embedded in a trip planning app.

## Your Role
Your primary job is to take the user's existing list items and organize them into an optimized daily schedule. You are NOT primarily a place recommender — the user has already chosen their places in list mode. Your job is logistics and scheduling.

However, you CAN and SHOULD recommend places if:
- The user's pace preference is "Packed" but the current schedule looks light
- There are obvious gaps (e.g., no restaurants picked but user loves food)
- Something is a true must-see/must-eat for ${trip.location} that would be a mistake to skip
- The user explicitly asks for recommendations

When you do recommend, clearly label those items as recommendations so the user knows they weren't on their original list.

## Scheduling Constraints (CRITICAL)
Apply ALL of the following when organizing the schedule:

### Proximity & Routing
- Group nearby activities together to minimize transit time
- Plan routes that flow geographically (don't zigzag across the city)
- Cluster activities by neighborhood/district when possible

### Transport-Aware Timing
${questionnaire?.transport_mode ? `The user is getting around by: **${questionnaire.transport_mode}**` : "Transport mode not specified — assume a mix of walking and public transit."}
- Walking: keep activities within ~15-20 min walk of each other, or allow extra buffer
- Public transit: add 15-30 min buffer for transfers/waiting
- Rental car: more flexibility on distance, but factor in parking time
- Taxi/rideshare: moderate flexibility, 10-15 min buffer between distant spots
- Bicycle: similar to walking radius but faster, factor in bike parking/docking

### Time-of-Day Logic
- Schedule museums, landmarks, and indoor attractions during standard opening hours (typically 9/10 AM – 5/6 PM)
- Schedule restaurants at appropriate meal times (breakfast 7-9, lunch 12-2, dinner 7-9:30)
- Schedule nightlife, bars, and evening entertainment after 8 PM
- Schedule outdoor activities when weather and daylight are favorable
- Parks and markets are best in the morning

### Pacing & Flow
- Morning activities → lunch → afternoon activities → dinner → evening/nightlife
- Include buffer time between activities for transit + rest
- Don't schedule back-to-back intensive activities (e.g., two long museum visits)
- Spread activities evenly across trip days — don't front-load or back-load
- **PRIORITIZE EMPTY DAYS:** When adding new items, fill days that have NO activities first before adding more to days that already have items. Look at the Current Schedule section — any day marked "(No activities scheduled — available for planning)" should be filled before adding extra items to busy days.
- NEVER place the same restaurant or venue in consecutive time slots or on the same day. A place can ONLY appear multiple times if the user's list contains multiple entries of that item (marked with ×N). Otherwise, each place appears exactly once.

### Practical Awareness
- Flag places that need advance reservations and suggest booking timeline
- Note cash-only venues, dress codes, or seasonal closures in details
- If a place has limited hours or is closed on certain days, schedule accordingly
- Consider likely queue times for popular attractions

${schedulingRules}

## Trip Details
- **Destination:** ${trip.location}
- **Dates:** ${startDate.toLocaleDateString("en-US")} to ${endDate.toLocaleDateString("en-US")} (${tripLength} days)
- **Trip Name:** ${trip.trip_name}

## User Preferences (from questionnaire)
${questionnaireSection}

**Important:** The user may override any preference in their message. Always prioritize what the user says in their current message over the questionnaire.

## User's List Items (TO BE SCHEDULED)
These are the items the user wants to do. Your main job is to schedule the ones that are NOT already in the current schedule below:
${formattedListItems}

## Current Schedule (already planned — work around these)
${formattedSchedule}

**CRITICAL DUPLICATE RULES:**
- Each list item can only appear in the schedule as many times as it appears in the list. If an item appears once in the list (no ×N marker), it can only be scheduled ONCE total. If it says "×2", it can be scheduled up to 2 times.
- Count how many times each item already appears in the Current Schedule above. Subtract that from the allowed count. If the remaining count is 0, do NOT schedule that item again.
- Compare place names case-insensitively — if a list item's name matches (or closely matches) a scheduled item's location, count it as already scheduled.
- If rearranging existing items would significantly improve the schedule (e.g., better proximity grouping), you may suggest changes in your text response — but do NOT include already-scheduled items in the itinerary JSON unless the user explicitly asks to reschedule.

## Already Recommended Places (avoid re-recommending)
${recPlaceNames}

## Response Format
- When scheduling items or making recommendations, wrap them in delimiters:

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

- Use the trip's actual dates for startTime/endTime.
- If you need to ask a clarifying question, use: ====QUESTION_START==== your question ====QUESTION_END====
- You can mix text and itinerary blocks in a single response.
- Do NOT mix question delimiters with itinerary delimiters in the same response.
- In your text response, briefly explain WHY you organized the schedule this way (proximity, time-of-day logic, etc.).

## Recommendation Style
- Keep reasoning succinct for scheduled items.
- For recommendations (items not from the user's list), explain why it's worth adding in the details field — but do NOT prefix the location name or details with "Recommendation:" or any label. The system will handle labeling automatically.`;
}

function buildListSystemPrompt(ctx: TripContext, categories: string[]): string {
  const { trip, questionnaire, recommendedPlaces, listPlaces, wishList } = ctx;

  const startDate = new Date(trip.start_date);
  const endDate = new Date(trip.end_date);
  const tripLength = Math.ceil(
    (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24),
  );

  const allPrevPlaces = [
    ...recommendedPlaces.map((p) => p.place_name),
    ...listPlaces.map((p) => p.place_name),
  ];
  const prevPlaceNames = allPrevPlaces.length > 0 ? allPrevPlaces.join(", ") : "None yet.";

  const wishListItems =
    wishList.length > 0 ? wishList.map((w) => w.value).join(", ") : "None.";

  const questionnaireSection = buildQuestionnaireSection(questionnaire);
  const categoryList = categories.length > 0 ? categories.join(", ") : "Accommodation, Food, Activities";

  return `You are a vacation planning AI assistant embedded in a trip planning app. The user wants a curated list of the best places — NOT a scheduled itinerary.

## Your Role
Recommend the top 10 best places for each of the following categories: ${categoryList}.
Base your recommendations on:
- Google Reviews (prioritize highly-rated places with significant review counts)
- The Infatuation restaurant reviews (if available)
- Reddit travel recommendations and local subreddit insights
- Rick Steves travel guides and recommendations
- TripAdvisor and travel blog consensus

## Trip Details
- **Destination:** ${trip.location}
- **Dates:** ${startDate.toLocaleDateString("en-US")} to ${endDate.toLocaleDateString("en-US")} (${tripLength} days)
- **Trip Name:** ${trip.trip_name}

## User Preferences (from questionnaire)
${questionnaireSection}

**Important:** The user may override any preference in their message.

## Already Recommended Places (avoid re-recommending)
${prevPlaceNames}

Do NOT recommend these places again.

## User's Wish List
${wishListItems}

## Response Format
Wrap your list recommendations in delimiters:

====ITINERARY_START====
[
  {
    "location": "Place Name",
    "details": "Brief description. Include practical info.",
    "category": "accommodation|restaurant|cafe|activity|landmark|nightlife|shopping|market",
    "startTime": "",
    "endTime": "",
    "cost": 0.00,
    "multiDay": false
  }
]
====ITINERARY_END====

- Group items by category in the JSON array.
- Do NOT include startTime/endTime — leave them as empty strings.
- If you need to ask a clarifying question, use: ====QUESTION_START==== your question ====QUESTION_END====
- After listing the top 10 per category, add a note asking if the user wants more suggestions.

## Recommendation Style
- Keep descriptions succinct. Include star rating and review count when notable (e.g., "4.7★, 2k reviews").
- Flag practical details (cash only, reservations needed, etc.) in the details field.`;
}

function buildGeneralSystemPrompt(ctx: TripContext): string {
  const { trip, schedule, questionnaire, wishList } = ctx;

  const startDate = new Date(trip.start_date);
  const endDate = new Date(trip.end_date);
  const tripLength = Math.ceil(
    (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24),
  );

  const formattedSchedule = formatSchedule(schedule, trip);
  const formattedListItems = formatListItems(ctx);
  const questionnaireSection = buildQuestionnaireSection(questionnaire);

  return `You are a helpful trip planning assistant embedded in a trip planning app. The user is asking a general question about their trip. Answer helpfully and concisely.

## Trip Details
- **Destination:** ${trip.location}
- **Dates:** ${startDate.toLocaleDateString("en-US")} to ${endDate.toLocaleDateString("en-US")} (${tripLength} days)
- **Trip Name:** ${trip.trip_name}

## User Preferences (from questionnaire)
${questionnaireSection}

## User's List Items
${formattedListItems}

## Current Schedule
${formattedSchedule}

## Response Guidelines
- Answer the user's question directly using the trip context above.
- If the user references specific items from their list or schedule, use the data above to respond accurately.
- You may suggest places or schedule changes if relevant to the question.
- If suggesting places, you can use the itinerary format:

====ITINERARY_START====
[
  {
    "location": "Place Name",
    "details": "Brief description.",
    "category": "restaurant|museum|park|event|activity|landmark|nightlife|shopping",
    "startTime": "",
    "endTime": "",
    "cost": 0.00,
    "multiDay": false
  }
]
====ITINERARY_END====

- If you need to ask a clarifying question, use: ====QUESTION_START==== your question ====QUESTION_END====
- Keep responses concise and helpful.`;
}

function buildQuestionnaireSection(questionnaire: QuestionnaireRow | null): string {
  if (!questionnaire) return "No questionnaire filled out yet.";
  const q = questionnaire;
  const fields = [
    q.budget && `- **Budget:** ${q.budget}`,
    q.interests && `- **Interests:** ${q.interests}`,
    q.dietary_restrictions &&
      `- **Dietary Restrictions:** ${q.dietary_restrictions}`,
    q.pace && `- **Pace:** ${q.pace}`,
    q.traveling_with_kids_or_elderly &&
      `- **Traveling with kids/elderly:** ${q.traveling_with_kids_or_elderly}`,
    q.accessibility_needs &&
      `- **Accessibility Needs:** ${q.accessibility_needs}`,
    q.tour_preference && `- **Tour Preference:** ${q.tour_preference}`,
    q.accommodation_type &&
      `- **Accommodation Type:** ${q.accommodation_type}`,
    q.must_see_experiences && `- **Must-See:** ${q.must_see_experiences}`,
    q.start_time_preference &&
      `- **Start Time Preference:** ${q.start_time_preference}`,
    q.transport_mode && `- **Transport Mode:** ${q.transport_mode}`,
  ].filter(Boolean);
  return fields.length > 0 ? fields.join("\n") : "No questionnaire filled out yet.";
}

function buildSchedulingRules(questionnaire: QuestionnaireRow | null): string {
  if (!questionnaire?.start_time_preference && !questionnaire?.pace) return "";

  return `## CRITICAL SCHEDULING RULES
- "Early bird" means the user wants to start at 7 AM. "Mid-morning" means start at 9-10 AM. "Late riser" means start at 11 AM or later.
- The FIRST activity of each day must NOT start before the user's preferred start time. No exceptions unless the user explicitly asks for an early start in their message.
- **Packed:** Schedule activities every ~1 hour from the user's start time until evening (~9 PM). Fill every slot.
- **Moderate:** Schedule 4-5 activities per day with 1.5-2 hour gaps between them for rest and exploration.
- **Relaxed:** Schedule 2-3 activities per day with generous free time between them.`;
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

function parseQuestion(text: string): string | null {
  const match = /====QUESTION_START====([\s\S]*?)====QUESTION_END====/.exec(text);
  return match ? match[1].trim() : null;
}

async function storeRecommendedPlaces(
  tripId: string,
  items: GeminiItineraryItem[],
): Promise<void> {
  // Fetch existing place names to skip duplicates
  const existing = await db.query<{ place_name: string }>(
    "SELECT place_name FROM gemini_recommended_places WHERE trip_id = $1",
    [tripId],
  );
  const existingNames = new Set(
    existing.rows.map((r) => r.place_name.toLowerCase().trim()),
  );

  const values: string[] = [];
  const params: (string | number | null)[] = [];
  let idx = 1;

  for (const item of items) {
    if (existingNames.has(item.location.toLowerCase().trim())) continue;
    values.push(
      `($${idx}, $${idx + 1}, $${idx + 2}, $${idx + 3}, $${idx + 4}, $${idx + 5}, $${idx + 6})`,
    );
    params.push(
      tripId,
      item.location,
      item.category || null,
      item.startTime || null,
      item.endTime || null,
      item.cost || 0,
      item.details || null,
    );
    idx += 7;
  }

  if (values.length === 0) return;

  await db.query(
    `INSERT INTO gemini_recommended_places (trip_id, place_name, place_category, start_time, end_time, cost, details)
     VALUES ${values.join(", ")}`,
    params,
  );
}

async function storeListPlaces(
  tripId: string,
  items: GeminiItineraryItem[],
): Promise<void> {
  // Fetch existing place names to skip duplicates
  const existing = await db.query<{ place_name: string }>(
    "SELECT place_name FROM gemini_list_places WHERE trip_id = $1",
    [tripId],
  );
  const existingNames = new Set(
    existing.rows.map((r) => r.place_name.toLowerCase().trim()),
  );

  const values: string[] = [];
  const params: (string | number | null)[] = [];
  let idx = 1;

  for (const item of items) {
    if (existingNames.has(item.location.toLowerCase().trim())) continue;
    values.push(
      `($${idx}, $${idx + 1}, $${idx + 2}, $${idx + 3}, $${idx + 4})`,
    );
    params.push(
      tripId,
      item.location,
      item.category || null,
      item.details || null,
      item.cost || 0,
    );
    idx += 5;
  }

  if (values.length === 0) return;

  await db.query(
    `INSERT INTO gemini_list_places (trip_id, place_name, place_category, details, cost)
     VALUES ${values.join(", ")}`,
    params,
  );
}

export async function getRecommendedPlaces(
  tripId: string,
): Promise<GeminiRecommendedPlace[]> {
  const result = await db.query<GeminiRecommendedPlace>(
    "SELECT * FROM gemini_recommended_places WHERE trip_id = $1 ORDER BY recommended_at DESC",
    [tripId],
  );
  return result.rows;
}

export async function getListPlaces(
  tripId: string,
): Promise<GeminiListPlace[]> {
  const result = await db.query<GeminiListPlace>(
    "SELECT * FROM gemini_list_places WHERE trip_id = $1 ORDER BY recommended_at DESC",
    [tripId],
  );
  return result.rows;
}

export async function clearRecommendedPlaces(tripId: string): Promise<void> {
  await db.query("DELETE FROM gemini_recommended_places WHERE trip_id = $1", [
    tripId,
  ]);
}

export async function markPlaceAdded(placeId: string, added = true): Promise<void> {
  await db.query(
    "UPDATE gemini_recommended_places SET added_to_schedule = $2 WHERE id = $1",
    [placeId, added],
  );
}

export async function markPlaceAddedByName(tripId: string, placeName: string): Promise<void> {
  await db.query(
    "UPDATE gemini_recommended_places SET added_to_schedule = true WHERE trip_id = $1 AND place_name = $2",
    [tripId, placeName],
  );
  await db.query(
    "UPDATE gemini_list_places SET added_to_schedule = true WHERE trip_id = $1 AND place_name = $2",
    [tripId, placeName],
  );
  // Also mark one corresponding trip_list item as added so the AI
  // doesn't see it as "still to be scheduled" on subsequent requests
  await db.query(
    `UPDATE trip_list SET item_added = true, last_modified = NOW()
     WHERE id = (
       SELECT id FROM trip_list
       WHERE trip_id = $1 AND LOWER(value) = LOWER($2) AND item_added = false
       ORDER BY created_at ASC LIMIT 1
     )`,
    [tripId, placeName],
  );
}

export async function clearListPlaces(tripId: string): Promise<void> {
  await db.query("DELETE FROM gemini_list_places WHERE trip_id = $1", [tripId]);
}

export async function markListPlaceAdded(placeId: string, added = true): Promise<void> {
  await db.query(
    "UPDATE gemini_list_places SET added_to_schedule = $2 WHERE id = $1",
    [placeId, added],
  );
}
