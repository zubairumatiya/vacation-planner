import { describe, it, expect, beforeAll } from "vitest";

// The module instantiates GoogleGenAI at import time using GEMINI_API_KEY.
// Set a dummy value so the constructor doesn't throw; no network/DB is touched
// because we only call the pure parser.
let parseActionResponse: typeof import("../aiService.js").parseActionResponse;

beforeAll(async () => {
  process.env.GEMINI_API_KEY = process.env.GEMINI_API_KEY || "test-key";
  ({ parseActionResponse } = await import("../aiService.js"));
});

describe("parseActionResponse format tolerance", () => {
  it("parses symbol + JSON on the same line, multiple per line", () => {
    const raw =
      '?SUGGEST {"location": "El Fogón", "category": "Food", "cost": "Moderate", "multiDay": false} ' +
      '?SUGGEST {"location": "Don Andres", "category": "Food", "cost": "Moderate", "multiDay": false}';
    const r = parseActionResponse(raw);
    expect(r.itinerary.map((i) => i.location)).toEqual([
      "El Fogón",
      "Don Andres",
    ]);
    // qualitative cost coerces to 0 rather than NaN
    expect(r.itinerary[0].cost).toBe(0);
    // the raw symbols must not leak into the displayed text
    expect(r.text).not.toContain("?SUGGEST");
  });

  it("still parses the canonical symbol-on-its-own-line form", () => {
    const raw = '?SUGGEST\n{"location": "Museum X", "cost": 15}';
    const r = parseActionResponse(raw);
    expect(r.itinerary).toHaveLength(1);
    expect(r.itinerary[0].location).toBe("Museum X");
    expect(r.itinerary[0].cost).toBe(15);
  });

  it("drops a stray trailing JSON document instead of rendering it", () => {
    const raw =
      '?SUGGEST {"location": "Francis", "cost": 0}\n\n' +
      '{\n "trip_name": "Surprise Trip",\n "recommendations": { "Food": [] }\n}';
    const r = parseActionResponse(raw);
    expect(r.itinerary.map((i) => i.location)).toEqual(["Francis"]);
    expect(r.text).not.toContain("trip_name");
    expect(r.text).toBe("");
  });

  it("parses currency-formatted cost strings", () => {
    const raw = '?SUGGEST\n{"location": "X", "cost": "$1,200"}';
    const r = parseActionResponse(raw);
    expect(r.itinerary[0].cost).toBe(1200);
  });

  it("keeps >TEXT prose and real text, strips id tags", () => {
    const raw = ">TEXT\nHere are some ideas [id:abc] for you.";
    const r = parseActionResponse(raw);
    expect(r.text).toBe("Here are some ideas for you.");
  });
});
