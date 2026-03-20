import { GoogleGenAI, type Content, ThinkingLevel } from "@google/genai";
import db from "../db/db.js";
import type {
  AiAction,
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

// ──────────────────────────────────────────────
// Main chat entry point
// ──────────────────────────────────────────────

export async function chat(
  tripId: string,
  userMessage: string,
  mode: "schedule" | "list" | null = null,
  categories?: string[],
  previousResponse?: string,
  fillInTheRest?: boolean,
): Promise<{
  text: string;
  itinerary?: AiItineraryItem[];
  actions?: AiAction[];
  rawModelResponse?: string;
  exhaustedCategories?: string[];
  scheduleUpdated?: boolean;
}> {
  const context = await fetchTripContext(tripId);
  const systemPrompt = buildSystemPrompt(
    context,
    mode,
    categories,
    fillInTheRest,
  );

  let effectiveMessage = userMessage;
  if (mode === "list" && !effectiveMessage) {
    effectiveMessage = `Please recommend the top places for my trip to ${context.trip.location}.`;
  } else if (mode === "schedule" && !effectiveMessage) {
    effectiveMessage = `Please organize my list items into an optimized daily schedule for my trip.`;
  }

  // Build contents: 2-turn history if previousResponse provided, otherwise plain string
  let contents: string | Content[];
  if (previousResponse) {
    contents = [
      { role: "model" as const, parts: [{ text: previousResponse }] },
      { role: "user" as const, parts: [{ text: effectiveMessage }] },
    ];
  } else {
    contents = effectiveMessage;
  }

  const response = await ai.models.generateContent({
    model: MODEL,
    contents,
    config: {
      systemInstruction: systemPrompt,
      thinkingConfig: { thinkingLevel: ThinkingLevel.HIGH },
    },
  });

  const rawText = response.text ?? "";
  const parsed = parseActionResponse(rawText);

  // Execute DB actions for +ADD, ~REPLACE, -REMOVE (skip in list mode — list items only go to ai_list_places)
  let scheduleUpdated = false;
  if (mode !== "list") {
    const dbActions = parsed.actions.filter(
      (a) =>
        a.symbol === "+ADD" ||
        a.symbol === "~REPLACE" ||
        a.symbol === "-REMOVE",
    );
    if (dbActions.length > 0) {
      await executeActions(tripId, dbActions);
      scheduleUpdated = true;

      // Mark matching trip_list items as added
      const addedNames = dbActions
        .filter((a) => a.symbol === "+ADD" && a.data.location)
        .map((a) => (a.data.location as string).toLowerCase());
      if (addedNames.length > 0) {
        await db.query(
          `UPDATE trip_list SET item_added = true
           WHERE trip_id = $1 AND LOWER(value) = ANY($2)`,
          [tripId, addedNames],
        );
      }
    }
  }

  // Store itinerary items for dedup tracking
  // In schedule mode, only store ?SUGGEST items (not +ADD, which come from the user's list)
  const itemsToStore =
    mode === "schedule"
      ? parsed.actions
          .filter((a) => a.symbol === "?SUGGEST")
          .map((a) => ({
            location: (a.data.location as string) ?? "",
            details: (a.data.details as string) ?? "",
            category: (a.data.category as string) ?? "",
            startTime: (a.data.startTime as string) ?? "",
            endTime: (a.data.endTime as string) ?? "",
            cost: Number(a.data.cost) || 0,
            multiDay: Boolean(a.data.multiDay),
          }))
      : parsed.itinerary;

  if (itemsToStore.length > 0) {
    if (mode === "list") {
      await storeListPlaces(tripId, itemsToStore);
    } else {
      await storeRecommendedPlaces(tripId, itemsToStore);
    }
  }

  return {
    text: parsed.text,
    itinerary: parsed.itinerary.length > 0 ? parsed.itinerary : undefined,
    actions: parsed.actions.length > 0 ? parsed.actions : undefined,
    rawModelResponse: rawText,
    exhaustedCategories:
      parsed.exhaustedCategories.length > 0
        ? parsed.exhaustedCategories
        : undefined,
    scheduleUpdated: scheduleUpdated || undefined,
  };
}

// ──────────────────────────────────────────────
// Fetch trip context
// ──────────────────────────────────────────────

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

// ──────────────────────────────────────────────
// Single unified system prompt builder
// ──────────────────────────────────────────────

function buildSystemPrompt(
  ctx: TripContext,
  mode: "schedule" | "list" | null,
  categories?: string[],
  fillInTheRest?: boolean,
): string {
  const { trip, schedule, questionnaire, recommendedPlaces, listPlaces } = ctx;

  const startDate = new Date(trip.start_date);
  const endDate = new Date(trip.end_date);
  const tripLength = Math.ceil(
    (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24),
  );

  const sections: string[] = [];

  // ── Trip details ──
  sections.push(`## Trip Details
- **Destination:** ${trip.location}
- **Dates:** ${startDate.toLocaleDateString("en-US", { timeZone: "UTC" })} to ${endDate.toLocaleDateString("en-US", { timeZone: "UTC" })} (${tripLength} days)
- **Trip Name:** ${trip.trip_name}`);

  // ── Recommendation sources ──
  sections.push(`## Recommendation Quality
Base recommendations on knowledge from: Google Reviews (prioritize high ratings with significant review counts), The Infatuation, Reddit travel subs, Rick Steves guides, and TripAdvisor consensus.`);

  // ── User notes ──
  const notesText = questionnaire?.notes || "No notes provided";
  sections.push(`## User Notes
${notesText}`);

  // ── Current schedule ──
  if (mode === "schedule" || mode === null) {
    sections.push(`## Current Schedule
${formatScheduleWithIds(schedule, trip)}`);
  }

  // ── Wish list ──
  if (mode === "schedule" || mode === null) {
    sections.push(`## User's List Items
${formatListItems(ctx)}`);
  }

  // ── Already recommended (dedup) ──
  if (mode === "list" || mode === "schedule") {
    const allPrevPlaces = [
      ...recommendedPlaces.map((p) => p.place_name),
      ...listPlaces.map((p) => p.place_name),
    ];
    if (allPrevPlaces.length > 0) {
      sections.push(`## Already Recommended (do not re-recommend)
${allPrevPlaces.join(", ")}`);
    }
  }

  // ── Mode-specific instruction ──
  if (mode === "list") {
    const cats =
      categories && categories.length > 0
        ? categories
        : [
            "Museums",
            "Nature",
            "Shopping",
            "Current Events",
            "History",
            "Nightlife",
            "Food",
            "Accommodations",
            "Art",
            "Attractions",
          ];
    const catCounts: Record<string, number> = {
      Museums: 5,
      Nature: 5,
      Shopping: 5,
      "Current Events": 5,
      History: 5,
      Nightlife: 5,
      Food: 10,
      Accommodations: 5,
      Art: 5,
      Attractions: 5,
    };
    const catList = cats
      .map((c) => `${c} - ${catCounts[c] ?? 5} items`)
      .join(", ");
    sections.push(`## Mode: List Recommendations
Recommend items per selected category: ${catList}.
If you reach a point where the "already recommended" places cover all high-quality options for a category, respond with \`!NULL category_name\` instead of forcing low-quality suggestions.
`);
  } else if (mode === "schedule") {
    let scheduleInstruction = `## Mode: Schedule
Organize the user's list items into a daily schedule. Schedule EVERY item from the user's list. Items marked 🔒 LOCKED must stay where they are.`;
    if (fillInTheRest) {
      scheduleInstruction += `\nFill remaining time slots with your own suggestions using ?SUGGEST.`;
    }
    sections.push(scheduleInstruction);
  } else {
    sections.push(`## Mode: General Assistant
Answer the user's question. Use action symbols if modifying the schedule. Use item IDs from the Current Schedule when referencing existing items.`);
  }

  // ── Action symbol reference ──
  sections.push(`## Action Symbols
Every structured item in your response MUST start with one of these symbols on its own line, followed by a JSON block on the next line(s):

\`+ADD\` — Add a new item to the schedule. JSON: { "location", "details", "category", "startTime", "endTime", "cost", "multiDay" }
\`~REPLACE\` — Update an existing schedule item by id. JSON: { "id", ...fields to update }
\`-REMOVE\` — Delete a schedule item by id. JSON: { "id" }. Cannot remove locked items.
\`?SUGGEST\` — Suggest an item (not committed to DB). JSON: same as +ADD.
\`>TEXT\` — Free-text commentary. The line(s) after >TEXT until the next symbol are plain text.
\`!NULL\` — Exhausted category. Write \`!NULL category_name\` on its own line.

Example response:
>TEXT
Here are my recommendations for your trip.

+ADD
{"location": "Museum X", "details": "Famous art museum", "category": "museum", "startTime": "2026-03-20T10:00:00Z", "endTime": "2026-03-20T12:00:00Z", "cost": 15, "multiDay": false}

?SUGGEST
{"location": "Hidden Cafe", "details": "Local favorite", "category": "restaurant", "startTime": "", "endTime": "", "cost": 10, "multiDay": false}

!NULL nightlife`);

  return sections.join("\n\n");
}

// ──────────────────────────────────────────────
// Format helpers (kept from original)
// ──────────────────────────────────────────────

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

  if (allDays.length === 0 && schedule.length === 0)
    return "No activities scheduled yet.";

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
      lines.push(
        `### ${dayLabel} (${dateKey})\n  (No activities scheduled — available for planning)`,
      );
    } else {
      lines.push(`### ${dayLabel} (${dateKey})`);
      for (const s of items) {
        const startTime = new Date(s.start_time).toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
          timeZone: "UTC",
        });
        const endTime = new Date(s.end_time).toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
          timeZone: "UTC",
        });
        const lockTag = s.is_locked ? " LOCKED" : "";
        lines.push(
          `  - [id:${s.id}] ${startTime}–${endTime}: ${s.location}${s.details ? ` (${s.details})` : ""}${lockTag}`,
        );
      }
    }
  }
  return lines.join("\n");
}

function formatListItems(ctx: TripContext): string {
  if (ctx.wishList.length === 0) return "No list items yet.";

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
    if (entry.count === -1) continue;
    const countNote = entry.count > 1 ? ` (×${entry.count})` : "";
    items.push(
      `- ${w.value}${entry.details ? ` — ${entry.details}` : ""}${countNote}`,
    );
    countMap.set(key, { ...entry, count: -1 });
  }
  return items.join("\n");
}

// ──────────────────────────────────────────────
// Action response parser
// ──────────────────────────────────────────────

interface ParsedResponse {
  text: string;
  actions: AiAction[];
  itinerary: AiItineraryItem[];
  exhaustedCategories: string[];
}

export function parseActionResponse(rawText: string): ParsedResponse {
  const actions: AiAction[] = [];
  const itinerary: AiItineraryItem[] = [];
  const exhaustedCategories: string[] = [];
  const textParts: string[] = [];

  const lines = rawText.split("\n");
  let i = 0;

  while (i < lines.length) {
    const line = lines[i].trim();

    // Check for !NULL
    if (line.startsWith("!NULL")) {
      const cat = line.replace("!NULL", "").trim();
      if (cat) exhaustedCategories.push(cat);
      i++;
      continue;
    }

    // Check for action symbols
    const symbolMatch = line.match(
      /^(\+ADD|~REPLACE|-REMOVE|\?SUGGEST|>TEXT)$/,
    );
    if (symbolMatch) {
      const symbol = symbolMatch[1] as AiAction["symbol"];

      if (symbol === ">TEXT") {
        // Collect text until next symbol line
        i++;
        const textLines: string[] = [];
        while (i < lines.length) {
          const nextLine = lines[i].trim();
          if (/^(\+ADD|~REPLACE|-REMOVE|\?SUGGEST|>TEXT|!NULL)/.test(nextLine))
            break;
          textLines.push(lines[i]);
          i++;
        }
        const textContent = textLines.join("\n").trim();
        if (textContent) {
          textParts.push(textContent);
          actions.push({ symbol: ">TEXT", data: { text: textContent } });
        }
        continue;
      }

      // For +ADD, ~REPLACE, -REMOVE, ?SUGGEST — collect JSON block
      i++;
      const jsonLines: string[] = [];
      while (i < lines.length) {
        const nextLine = lines[i].trim();
        if (/^(\+ADD|~REPLACE|-REMOVE|\?SUGGEST|>TEXT|!NULL)/.test(nextLine))
          break;
        if (nextLine) jsonLines.push(nextLine);
        i++;
      }

      const jsonStr = jsonLines.join("\n").trim();
      if (jsonStr) {
        try {
          const data = JSON.parse(jsonStr);
          actions.push({ symbol, data });

          // Build itinerary items from +ADD and ?SUGGEST
          if (symbol === "+ADD" || symbol === "?SUGGEST") {
            itinerary.push({
              location: data.location ?? "",
              details: data.details ?? "",
              category: data.category ?? "",
              startTime: data.startTime ?? "",
              endTime: data.endTime ?? "",
              cost: Number(data.cost) || 0,
              multiDay: Boolean(data.multiDay),
            });
          }
        } catch (err) {
          console.error("[AI] Failed to parse action JSON:", err, jsonStr);
        }
      }
      continue;
    }

    // Regular text line (not prefixed by any symbol) — collect as text
    if (line) {
      textParts.push(lines[i]);
    }
    i++;
  }

  return {
    text: textParts.join("\n").trim(),
    actions,
    itinerary,
    exhaustedCategories,
  };
}

// ──────────────────────────────────────────────
// Execute DB actions
// ──────────────────────────────────────────────

async function executeActions(
  tripId: string,
  actions: AiAction[],
): Promise<void> {
  const client = await db.connect();
  try {
    await client.query("BEGIN");

    for (const action of actions) {
      const d = action.data as Record<string, unknown>;

      switch (action.symbol) {
        case "+ADD": {
          if (!d.location || !d.startTime || !d.endTime) break;
          await client.query(
            `INSERT INTO trip_schedule (trip_id, start_time, end_time, location, cost, details, multi_day, sort_index)
             VALUES ($1, $2, $3, $4, $5, $6, $7, 0)`,
            [
              tripId,
              d.startTime,
              d.endTime,
              d.location,
              Number(d.cost) || 0,
              (d.details as string) || "",
              Boolean(d.multiDay),
            ],
          );
          break;
        }
        case "~REPLACE": {
          if (!d.id) break;
          const fields: string[] = [];
          const values: unknown[] = [];
          let idx = 1;

          if (d.location !== undefined) {
            fields.push(`location = $${idx++}`);
            values.push(d.location);
          }
          if (d.details !== undefined) {
            fields.push(`details = $${idx++}`);
            values.push(d.details);
          }
          if (d.startTime !== undefined) {
            fields.push(`start_time = $${idx++}`);
            values.push(d.startTime);
          }
          if (d.endTime !== undefined) {
            fields.push(`end_time = $${idx++}`);
            values.push(d.endTime);
          }
          if (d.cost !== undefined) {
            fields.push(`cost = $${idx++}`);
            values.push(Number(d.cost) || 0);
          }
          if (d.multiDay !== undefined) {
            fields.push(`multi_day = $${idx++}`);
            values.push(Boolean(d.multiDay));
          }

          if (fields.length === 0) break;
          fields.push("last_modified = NOW()");
          values.push(d.id, tripId);

          await client.query(
            `UPDATE trip_schedule SET ${fields.join(", ")} WHERE id = $${idx++} AND trip_id = $${idx}`,
            values,
          );
          break;
        }
        case "-REMOVE": {
          if (!d.id) break;
          await client.query(
            "DELETE FROM trip_schedule WHERE id = $1 AND trip_id = $2 AND is_locked = false",
            [d.id, tripId],
          );
          break;
        }
      }
    }

    // Renumber sort indices
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

// ──────────────────────────────────────────────
// Store / retrieve / manage recommendations
// ──────────────────────────────────────────────

async function storeRecommendedPlaces(
  tripId: string,
  items: AiItineraryItem[],
): Promise<void> {
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

export async function getListPlaces(tripId: string): Promise<AiListPlace[]> {
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

export async function markPlaceAdded(
  placeId: string,
  added = true,
): Promise<void> {
  await db.query(
    "UPDATE ai_recommended_places SET added_to_schedule = $2 WHERE id = $1",
    [placeId, added],
  );
}

export async function markPlaceAddedByName(
  tripId: string,
  placeName: string,
): Promise<void> {
  await db.query(
    "UPDATE ai_recommended_places SET added_to_schedule = true WHERE trip_id = $1 AND place_name = $2",
    [tripId, placeName],
  );
  await db.query(
    "UPDATE ai_list_places SET added_to_schedule = true WHERE trip_id = $1 AND place_name = $2",
    [tripId, placeName],
  );
}

export async function clearListPlaces(tripId: string): Promise<void> {
  await db.query("DELETE FROM ai_list_places WHERE trip_id = $1", [tripId]);
}

export async function markListPlaceAdded(
  placeId: string,
  added = true,
): Promise<void> {
  await db.query(
    "UPDATE ai_list_places SET added_to_schedule = $2 WHERE id = $1",
    [placeId, added],
  );
}
