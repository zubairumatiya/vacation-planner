import { GoogleGenAI, ThinkingLevel } from "@google/genai";
import db from "../db/db.js";
import type {
  AiItineraryItem,
  AiListPlace,
  AiRecommendedPlace,
  QuestionnaireRow,
  Schedule,
  Trip,
  TripList,
} from "../types/app-types.js";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
const MODEL = "gemini-3-flash-preview";

interface TripContext {
  trip: Trip;
  schedule: Schedule[];
  questionnaire: QuestionnaireRow | null;
  recommendedPlaces: AiRecommendedPlace[];
  listPlaces: AiListPlace[];
  wishList: TripList[];
}

export async function chat(
  tripId: string,
  userMessage: string,
  mode: "schedule" | "list" | null = null,
  categories?: string[],
): Promise<{ text: string; itinerary?: AiItineraryItem[]; question?: string; scheduleUpdated?: boolean }> {
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

  // Parse and execute schedule modification actions (general mode only)
  let scheduleUpdated = false;
  if (mode === null) {
    const actions = parseActions(text);
    if (actions.length > 0) {
      await executeActions(tripId, actions);
      scheduleUpdated = true;
    }
  }

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
    .replace(/====ACTIONS_START====[\s\S]*?====ACTIONS_END====/g, "")
    .trim();

  return {
    text: cleanText,
    itinerary: itinerary.length > 0 ? itinerary : undefined,
    question: question ?? undefined,
    scheduleUpdated: scheduleUpdated || undefined,
  };
}

export async function scheduleListItems(
  tripId: string,
  userMessage: string,
): Promise<{
  text: string;
  recommendations: AiItineraryItem[];
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

  const listSourced: AiItineraryItem[] = [];
  const recommendations: AiItineraryItem[] = [];

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

  // Store recommendations in ai_recommended_places for sidebar
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
    db.query<AiRecommendedPlace>(
      "SELECT * FROM ai_recommended_places WHERE trip_id = $1 ORDER BY recommended_at ASC",
      [tripId],
    ),
    db.query<AiListPlace>(
      "SELECT * FROM ai_list_places WHERE trip_id = $1 ORDER BY recommended_at ASC",
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
        const lockTag = s.is_locked ? " 🔒 LOCKED" : "";
        lines.push(`  - ${startTime}–${endTime}: ${s.location}${s.details ? ` (${s.details})` : ""}${lockTag}`);
      }
    }
  }
  return lines.join("\n");
}

function formatScheduleWithIds(schedule: Schedule[], trip?: Trip): string {
  const byDate = new Map<string, Schedule[]>();
  for (const s of schedule) {
    const dateKey = new Date(s.start_time).toISOString().slice(0, 10);
    if (!byDate.has(dateKey)) byDate.set(dateKey, []);
    byDate.get(dateKey)!.push(s);
  }

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
      lines.push(`### ${dayLabel} (${dateKey})\n  (No activities scheduled — available for planning)`);
    } else {
      lines.push(`### ${dayLabel} (${dateKey})`);
      for (const s of items) {
        const startTime = new Date(s.start_time).toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
        });
        const endTime = new Date(s.end_time).toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
        });
        const lockTag = s.is_locked ? " 🔒 LOCKED" : "";
        lines.push(`  - [id:${s.id}] ${startTime}–${endTime}: ${s.location}${s.details ? ` (${s.details})` : ""}${lockTag}`);
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

// ──────────────────────────────────────────────
// Base system prompt (shared by all modes)
// ──────────────────────────────────────────────

interface BasePromptOptions {
  includeListItems: boolean;
  includeSchedule: boolean;
  includeScheduleIds: boolean;
  includeRecommendedPlaces: boolean;
}

function buildBaseSystemPrompt(ctx: TripContext, opts: BasePromptOptions): string {
  const { trip, schedule, questionnaire, recommendedPlaces, listPlaces } = ctx;

  const startDate = new Date(trip.start_date);
  const endDate = new Date(trip.end_date);
  const tripLength = Math.ceil(
    (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24),
  );

  const questionnaireSection = buildQuestionnaireSection(questionnaire);

  const sections: string[] = [];

  // ── Iron-clad rules (top of prompt for maximum weight) ──
  sections.push(`## IRON-CLAD TRIP PLANNING RULES (NEVER VIOLATE)

These rules are absolute. Do not break them under any circumstances unless the user EXPLICITLY overrides one in their message.

### Meal Logic
1. Maximum ONE breakfast, ONE lunch, and ONE dinner restaurant per day. Never schedule two dinners or two lunches on the same day.
2. Do not schedule two full sit-down restaurant meals within 1.5 hours of each other. However, a quick dessert stop, gelato shop, pastry place, or cafe AFTER a meal IS allowed — treat these as light stops (20–30 min), not full meals.
3. Meals belong in their correct time windows:
   - Breakfast: 7:00 AM – 10:00 AM
   - Lunch: 11:30 AM – 2:00 PM
   - Dinner: 6:00 PM – 9:30 PM
   Do NOT schedule a lunch restaurant at 3 PM or a dinner restaurant at 4 PM.
4. Do not schedule a physically demanding activity (hiking, long walking tour, intense sightseeing) immediately after a sit-down meal. Allow at least 45 minutes of buffer or schedule a light transition activity (stroll, cafe, shopping).
5. If the user has dietary restrictions, every restaurant recommendation must be compatible with those restrictions. Mention compatibility in the details field.

### Time & Physics
6. NEVER schedule overlapping activities. Check start and end times for every item on the same day to ensure zero overlap.
7. Assign realistic durations to activities:
   - Museum/gallery: 1.5–3 hours
   - Quick cafe/coffee/dessert stop: 20–45 minutes
   - Sit-down restaurant meal: 1–1.5 hours (longer for fine dining)
   - Major landmark/monument: 1–2 hours
   - Park/garden: 45 min–2 hours
   - Shopping district/market: 1–2 hours
   - Nightlife venue/bar: 1.5–3 hours
   - Spa/massage: 1–2 hours
8. Always include transit time between different locations — never zero gap between activities at different places. The gap depends on transport mode and distance.
9. Do not schedule activities before a venue's typical opening hours or after closing. When unsure, use conservative defaults: museums 10 AM–5 PM, restaurants 11 AM–10 PM, shops 10 AM–7 PM, nightlife 8 PM–2 AM.
10. Schedule outdoor activities during daylight hours only. Consider approximate sunrise/sunset for the destination and time of year.

### Human Energy & Fatigue
11. Do not schedule two intensive activities back-to-back (e.g., two museums in a row, a long hike followed by an extensive walking tour). Interleave with lighter activities or rest breaks.
12. Maximum activities per day by pace preference:
    - Packed: 6–8 activities
    - Moderate: 4–5 activities
    - Relaxed: 2–3 activities
    If pace is not specified, default to Moderate.
13. Energy should flow naturally through the day: moderate energy in the morning → peak mid-morning to early afternoon → lighter/restful after lunch → build toward dinner → wind down after dinner. Do NOT schedule high-energy activities after 9 PM (except nightlife).
14. For multi-day trips, do not schedule the most exhausting days consecutively. Alternate heavy and light days when possible.
15. If the trip involves significant timezone change (6+ hours from the user's home), keep days 1 and 2 lighter than normal. Avoid early-morning activities on day 1.

### Geographic Logic
16. Do not zigzag across the city. Group activities by neighborhood or district within each day.
17. Plan each day's route as a logical geographic flow (e.g., north to south, or radiating out from a central point), not random jumps between distant areas.
18. Ensure adequate transit time exists between distant items given the user's transport mode.

### Common Sense & Safety
19. Never recommend or schedule the same place twice unless the user's list explicitly contains that place multiple times (marked with ×N).
20. Many European museums and attractions are closed on Mondays. Many restaurants are closed on Sundays. When you know or suspect a closure, note it and schedule around it.
21. Popular restaurants in tourist destinations often require advance reservations. Flag this in the details field when relevant (e.g., "Book 2–3 weeks ahead").
22. Note cash-only venues, dress codes, or other practical requirements in the details field.
23. If the user is traveling with children or elderly:
    - Do NOT schedule nightlife, bars, or clubs
    - Do NOT schedule activities requiring high physical fitness
    - Do NOT plan excessively long walking days
    - Prefer family-friendly or accessible alternatives
24. Weather-sensitive outdoor activities (boat tours, hiking, rooftop dining) should include a weather caveat in the details (e.g., "Weather permitting — have a backup plan").
25. Do NOT schedule nightlife, bars, or clubs before noon.
26. Spa, massage, or relaxation activities should be scheduled as a wind-down BEFORE dinner — not immediately after intense physical activity with no gap.
27. If the trip destination has known safety concerns for certain areas at night, do not schedule late-night activities in those areas without a warning.

### Accommodation Logic
28. If the user's list contains accommodation items (hotels, hostels, Airbnbs, etc.), they MUST be included when scheduling. Accommodations are non-negotiable — the user picked them for a reason.
29. Accommodations should be scheduled as multi-day items spanning check-in to check-out dates.
30. If there are multiple accommodations on the list and it's NOT obvious why (e.g., they are in the same city or area and would overlap in dates), ask a clarifying question using ====QUESTION_START==== before scheduling. Example: "I see two hotels — Hotel A and Hotel B. Are you staying at one for the first half and the other for the second, or choosing between them?"
31. If the reason IS obvious (different cities for different legs of the trip, or clearly for separate date ranges), schedule them without asking.

### Locked Items
32. Items marked with 🔒 LOCKED in the schedule MUST NOT be moved, rescheduled, or deleted. They are pinned to their current day and time slot. Schedule other activities around locked items. Never emit a "move", "swap_days", or "delete" action for a locked item. If the user explicitly asks to move a locked item, inform them that the item is locked and they need to unlock it first.

### Output Integrity
33. Always use the trip's actual dates (from Trip Details below) for startTime and endTime. Never use placeholder or example dates.
34. When scheduling an item from the user's list, the "location" field MUST match the user's list item name exactly (preserve original capitalization and spelling).
35. The "category" field must be one of the allowed values specified in the mode-specific instructions below. Never invent new categories.
36. Every itinerary item must have both startTime and endTime set (except in list mode, where they are empty strings).
37. Cost should be a reasonable estimate in the local currency equivalent. Use 0 for free activities. Never leave cost as null.`);

  // ── Trip Details ──
  sections.push(`## Trip Details
- **Destination:** ${trip.location}
- **Dates:** ${startDate.toLocaleDateString("en-US")} to ${endDate.toLocaleDateString("en-US")} (${tripLength} days)
- **Trip Name:** ${trip.trip_name}`);

  // ── User Preferences ──
  sections.push(`## User Preferences (from questionnaire)
${questionnaireSection}

**Important:** The user may override any preference in their message. Always prioritize what the user says in their current message over the questionnaire.`);

  // ── List Items ──
  if (opts.includeListItems) {
    sections.push(`## User's List Items
${formatListItems(ctx)}`);
  }

  // ── Schedule ──
  if (opts.includeSchedule) {
    const formatted = opts.includeScheduleIds
      ? formatScheduleWithIds(schedule, trip)
      : formatSchedule(schedule, trip);
    sections.push(`## Current Schedule
${formatted}`);
  }

  // ── Recommended Places ──
  if (opts.includeRecommendedPlaces) {
    const allPrevPlaces = [
      ...recommendedPlaces.map((p) => p.place_name),
      ...listPlaces.map((p) => p.place_name),
    ];
    const prevPlaceNames = allPrevPlaces.length > 0 ? allPrevPlaces.join(", ") : "None yet.";
    sections.push(`## Already Recommended Places (avoid re-recommending)
${prevPlaceNames}

Do NOT recommend these places again.`);
  }

  // ── Response format: Questions ──
  sections.push(`## Clarifying Questions
- If you need to ask a clarifying question before proceeding, use: ====QUESTION_START==== your question ====QUESTION_END====
- Do NOT mix question delimiters with itinerary or action delimiters in the same response.`);

  return sections.join("\n\n");
}

// ──────────────────────────────────────────────
// Mode-specific prompt builders
// ──────────────────────────────────────────────

function buildSystemPrompt(ctx: TripContext): string {
  const base = buildBaseSystemPrompt(ctx, {
    includeListItems: true,
    includeSchedule: true,
    includeScheduleIds: false,
    includeRecommendedPlaces: true,
  });

  const { trip, questionnaire } = ctx;
  const schedulingRules = buildSchedulingRules(questionnaire);

  return `${base}

## Your Role
You are a trip organizer and logistics planner. Your primary job is to take the user's existing list items and organize them into an optimized daily schedule. You are NOT primarily a place recommender — the user has already chosen their places in list mode. Your job is logistics and scheduling.

**CRITICAL: You MUST schedule EVERY item from the user's list. Do NOT leave any list items unscheduled. Every single item must appear in the itinerary JSON with a startTime and endTime. If there are more items than comfortably fit, spread them across all available days — but never omit any.**

However, you CAN and SHOULD recommend places if:
- The user's pace preference is "Packed" but the current schedule looks light
- There are obvious gaps (e.g., no restaurants picked but user loves food)
- Something is a true must-see/must-eat for ${trip.location} that would be a mistake to skip
- The user explicitly asks for recommendations

When you do recommend, clearly label those items as recommendations so the user knows they weren't on their original list.

## Scheduling Constraints
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

### Pacing & Flow
- Morning activities → lunch → afternoon activities → dinner → evening/nightlife
- Spread activities evenly across trip days — don't front-load or back-load
- **PRIORITIZE EMPTY DAYS:** When adding new items, fill days that have NO activities first before adding more to days that already have items. Any day marked "(No activities scheduled — available for planning)" should be filled before adding extra items to busy days.

${schedulingRules}

**LOCKED ITEMS:** Items marked 🔒 LOCKED in the Current Schedule are pinned — do NOT reschedule, move, or remove them. Plan around them.

**CRITICAL DUPLICATE RULES:**
- Each list item can only appear in the schedule as many times as it appears in the list. If an item appears once in the list (no ×N marker), it can only be scheduled ONCE total. If it says "×2", it can be scheduled up to 2 times.
- Count how many times each item already appears in the Current Schedule above. Subtract that from the allowed count. If the remaining count is 0, do NOT schedule that item again.
- Compare place names case-insensitively — if a list item's name matches (or closely matches) a scheduled item's location, count it as already scheduled.
- If rearranging existing items would significantly improve the schedule (e.g., better proximity grouping), you may suggest changes in your text response — but do NOT include already-scheduled items in the itinerary JSON unless the user explicitly asks to reschedule.

## Response Format
When scheduling items or making recommendations, wrap them in delimiters:

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
- You can mix text and itinerary blocks in a single response.
- In your text response, briefly explain WHY you organized the schedule this way (proximity, time-of-day logic, etc.).

## Recommendation Style
- Keep reasoning succinct for scheduled items.
- For recommendations (items not from the user's list), explain why it's worth adding in the details field — but do NOT prefix the location name or details with "Recommendation:" or any label. The system will handle labeling automatically.`;
}

function buildListSystemPrompt(ctx: TripContext, categories: string[]): string {
  const base = buildBaseSystemPrompt(ctx, {
    includeListItems: true,
    includeSchedule: false,
    includeScheduleIds: false,
    includeRecommendedPlaces: true,
  });

  const categoryList = categories.length > 0 ? categories.join(", ") : "Accommodation, Food, Activities";

  return `${base}

## Your Role
You are a vacation place recommender. The user wants a curated list of the best places — NOT a scheduled itinerary.

Recommend the top 10 best places for each of the following categories: ${categoryList}.
Base your recommendations on:
- Google Reviews (prioritize highly-rated places with significant review counts)
- The Infatuation restaurant reviews (if available)
- Reddit travel recommendations and local subreddit insights
- Rick Steves travel guides and recommendations
- TripAdvisor and travel blog consensus

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
- After listing the top 10 per category, add a note asking if the user wants more suggestions.

## Recommendation Style
- Keep descriptions succinct. Include star rating and review count when notable (e.g., "4.7★, 2k reviews").
- Flag practical details (cash only, reservations needed, etc.) in the details field.`;
}

function buildGeneralSystemPrompt(ctx: TripContext): string {
  const base = buildBaseSystemPrompt(ctx, {
    includeListItems: true,
    includeSchedule: true,
    includeScheduleIds: true,
    includeRecommendedPlaces: false,
  });

  return `${base}

## Your Role
You are a helpful trip planning assistant. The user is asking a general question or requesting changes to their trip. Answer helpfully and concisely.

## Response Guidelines
- Answer the user's question directly using the trip context above.
- If the user references specific items from their list or schedule, use the data above to respond accurately.
- You may suggest places or schedule changes if relevant to the question.
- If suggesting NEW places to add, use the itinerary format:

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

## Schedule Modification Actions
When the user asks to MODIFY their existing schedule (move items, swap days, delete items, change times, etc.), you MUST emit an actions block so the app can make the changes automatically. Use the item IDs from the Current Schedule above.

====ACTIONS_START====
[
  {
    "type": "move",
    "id": "item-uuid",
    "startTime": "YYYY-MM-DDTHH:MM:00Z",
    "endTime": "YYYY-MM-DDTHH:MM:00Z"
  },
  {
    "type": "swap_days",
    "date1": "YYYY-MM-DD",
    "date2": "YYYY-MM-DD"
  },
  {
    "type": "delete",
    "id": "item-uuid"
  },
  {
    "type": "update_details",
    "id": "item-uuid",
    "details": "Updated description text"
  },
  {
    "type": "add",
    "location": "Place Name",
    "details": "Brief description.",
    "startTime": "YYYY-MM-DDTHH:MM:00Z",
    "endTime": "YYYY-MM-DDTHH:MM:00Z",
    "cost": 0.00,
    "multiDay": false
  }
]
====ACTIONS_END====

### Action type reference:
- **move**: Reschedule an item to a new date/time. Requires "id", "startTime", "endTime". Use this when the user asks to move an item to a different day or time slot. Preserve the original duration unless the user says otherwise.
- **swap_days**: Swap ALL items between two dates. Requires "date1" and "date2" (YYYY-MM-DD format). Each item on date1 gets moved to date2 at the same time-of-day, and vice versa. Use this when the user says things like "switch Monday and Tuesday" or "swap the 15th and 16th".
- **delete**: Remove an item from the schedule. Requires "id". Use this when the user asks to remove, cancel, or drop an activity.
- **update_details**: Change the details/description of an item. Requires "id" and "details". Use this when the user wants to update notes about an activity.
- **add**: Add a NEW activity directly to the schedule. Requires "location", "startTime", "endTime". Optional: "details", "cost", "multiDay". Use this when the user asks to add more items/activities to a specific day, fill gaps in their schedule, or says things like "add more activities for Monday". Choose places appropriate for the destination, user preferences, and time of day. Use the trip's actual dates.

### Rules for actions:
- NEVER move, delete, or reschedule items marked 🔒 LOCKED. They are pinned to their current time slot. If the user asks to move a locked item, tell them to unlock it first.
- When using "swap_days", if ANY item on either day is locked, do NOT swap. Inform the user which items are locked.
- ALWAYS use the exact item IDs shown in the Current Schedule for move/delete/update_details. Never guess or fabricate IDs.
- For "add" actions, you do NOT need an ID — just provide the location and times.
- You can combine multiple actions in one block (e.g., move several items and add new ones).
- When swapping days, use a single swap_days action — do NOT emit individual move actions for each item.
- When moving items, maintain sensible time-of-day logic (meals at meal times, etc.) unless the user specifies exact times.
- When adding items, avoid conflicts with existing scheduled items on that day. Check the Current Schedule above and slot new items into free time periods.
- You can mix actions with text explanation. Briefly explain what you changed and why.
- Do NOT mix ACTIONS and QUESTION delimiters in the same response.
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

function parseItinerary(text: string): AiItineraryItem[] {
  const regex = /====ITINERARY_START====([\s\S]*?)====ITINERARY_END====/g;
  const items: AiItineraryItem[] = [];

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
      console.error("[AI] Failed to parse itinerary block:", err);
    }
  }

  return items;
}

function parseQuestion(text: string): string | null {
  const match = /====QUESTION_START====([\s\S]*?)====QUESTION_END====/.exec(text);
  return match ? match[1].trim() : null;
}

interface ScheduleAction {
  type: "move" | "swap_days" | "delete" | "update_details" | "add";
  id?: string;
  location?: string;
  startTime?: string;
  endTime?: string;
  date1?: string;
  date2?: string;
  details?: string;
  cost?: number;
  multiDay?: boolean;
}

function parseActions(text: string): ScheduleAction[] {
  const regex = /====ACTIONS_START====([\s\S]*?)====ACTIONS_END====/g;
  const actions: ScheduleAction[] = [];

  let match;
  while ((match = regex.exec(text)) !== null) {
    try {
      const parsed = JSON.parse(match[1].trim());
      if (Array.isArray(parsed)) {
        for (const a of parsed) {
          if (a.type && ["move", "swap_days", "delete", "update_details", "add"].includes(a.type)) {
            actions.push(a as ScheduleAction);
          }
        }
      }
    } catch (err) {
      console.error("[AI] Failed to parse actions block:", err);
    }
  }

  return actions;
}

async function executeActions(tripId: string, actions: ScheduleAction[]): Promise<void> {
  const client = await db.connect();
  try {
    await client.query("BEGIN");

    for (const action of actions) {
      switch (action.type) {
        case "move": {
          if (!action.id || !action.startTime || !action.endTime) break;
          await client.query(
            `UPDATE trip_schedule SET start_time = $1, end_time = $2, last_modified = NOW()
             WHERE id = $3 AND trip_id = $4 AND is_locked = false`,
            [action.startTime, action.endTime, action.id, tripId],
          );
          break;
        }
        case "swap_days": {
          if (!action.date1 || !action.date2) break;
          const d1 = action.date1;
          const d2 = action.date2;
          // Skip swap if any item on either day is locked
          const lockedCheck = await client.query(
            `SELECT COUNT(*) as cnt FROM trip_schedule
             WHERE trip_id = $1 AND is_locked = true
             AND (start_time::date = $2::date OR start_time::date = $3::date)`,
            [tripId, d1, d2],
          );
          if (parseInt(lockedCheck.rows[0].cnt) > 0) break;
          const dayDiff = (new Date(d2 + "T00:00:00Z").getTime() - new Date(d1 + "T00:00:00Z").getTime()) / 86400000;
          // Collect IDs for each date first to avoid overlap issues
          const d1Items = await client.query(
            "SELECT id FROM trip_schedule WHERE trip_id = $1 AND start_time::date = $2::date",
            [tripId, d1],
          );
          const d2Items = await client.query(
            "SELECT id FROM trip_schedule WHERE trip_id = $1 AND start_time::date = $2::date",
            [tripId, d2],
          );
          const d1Ids = d1Items.rows.map((r: { id: string }) => r.id);
          const d2Ids = d2Items.rows.map((r: { id: string }) => r.id);
          if (d1Ids.length > 0) {
            await client.query(
              `UPDATE trip_schedule
               SET start_time = start_time + INTERVAL '1 day' * $1,
                   end_time = end_time + INTERVAL '1 day' * $1,
                   last_modified = NOW()
               WHERE id = ANY($2::uuid[])`,
              [dayDiff, d1Ids],
            );
          }
          if (d2Ids.length > 0) {
            await client.query(
              `UPDATE trip_schedule
               SET start_time = start_time - INTERVAL '1 day' * $1,
                   end_time = end_time - INTERVAL '1 day' * $1,
                   last_modified = NOW()
               WHERE id = ANY($2::uuid[])`,
              [dayDiff, d2Ids],
            );
          }
          break;
        }
        case "delete": {
          if (!action.id) break;
          await client.query(
            "DELETE FROM trip_schedule WHERE id = $1 AND trip_id = $2 AND is_locked = false",
            [action.id, tripId],
          );
          break;
        }
        case "update_details": {
          if (!action.id || action.details === undefined) break;
          await client.query(
            `UPDATE trip_schedule SET details = $1, last_modified = NOW()
             WHERE id = $2 AND trip_id = $3`,
            [action.details, action.id, tripId],
          );
          break;
        }
        case "add": {
          if (!action.location || !action.startTime || !action.endTime) break;
          await client.query(
            `INSERT INTO trip_schedule (trip_id, start_time, end_time, location, cost, details, multi_day, sort_index)
             VALUES ($1, $2, $3, $4, $5, $6, $7, 0)`,
            [tripId, action.startTime, action.endTime, action.location, action.cost || 0, action.details || "", action.multiDay || false],
          );
          break;
        }
      }
    }

    // Renumber sort indices after all actions
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
}

async function storeRecommendedPlaces(
  tripId: string,
  items: AiItineraryItem[],
): Promise<void> {
  // Fetch existing place names to skip duplicates
  const existing = await db.query<{ place_name: string }>(
    "SELECT place_name FROM ai_recommended_places WHERE trip_id = $1",
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
    `INSERT INTO ai_recommended_places (trip_id, place_name, place_category, start_time, end_time, cost, details)
     VALUES ${values.join(", ")}`,
    params,
  );
}

async function storeListPlaces(
  tripId: string,
  items: AiItineraryItem[],
): Promise<void> {
  // Fetch existing place names to skip duplicates
  const existing = await db.query<{ place_name: string }>(
    "SELECT place_name FROM ai_list_places WHERE trip_id = $1",
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
    `INSERT INTO ai_list_places (trip_id, place_name, place_category, details, cost)
     VALUES ${values.join(", ")}`,
    params,
  );
}

export async function getRecommendedPlaces(
  tripId: string,
): Promise<AiRecommendedPlace[]> {
  const result = await db.query<AiRecommendedPlace>(
    "SELECT * FROM ai_recommended_places WHERE trip_id = $1 ORDER BY recommended_at DESC",
    [tripId],
  );
  return result.rows;
}

export async function getListPlaces(
  tripId: string,
): Promise<AiListPlace[]> {
  const result = await db.query<AiListPlace>(
    "SELECT * FROM ai_list_places WHERE trip_id = $1 ORDER BY recommended_at DESC",
    [tripId],
  );
  return result.rows;
}

export async function clearRecommendedPlaces(tripId: string): Promise<void> {
  await db.query("DELETE FROM ai_recommended_places WHERE trip_id = $1", [
    tripId,
  ]);
}

export async function markPlaceAdded(placeId: string, added = true): Promise<void> {
  await db.query(
    "UPDATE ai_recommended_places SET added_to_schedule = $2 WHERE id = $1",
    [placeId, added],
  );
}

export async function markPlaceAddedByName(tripId: string, placeName: string): Promise<void> {
  await db.query(
    "UPDATE ai_recommended_places SET added_to_schedule = true WHERE trip_id = $1 AND place_name = $2",
    [tripId, placeName],
  );
  await db.query(
    "UPDATE ai_list_places SET added_to_schedule = true WHERE trip_id = $1 AND place_name = $2",
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
  await db.query("DELETE FROM ai_list_places WHERE trip_id = $1", [tripId]);
}

export async function markListPlaceAdded(placeId: string, added = true): Promise<void> {
  await db.query(
    "UPDATE ai_list_places SET added_to_schedule = $2 WHERE id = $1",
    [placeId, added],
  );
}
