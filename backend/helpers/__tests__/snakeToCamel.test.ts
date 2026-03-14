import { describe, it, expect } from "vitest";
import { snakeToCamel } from "../snakeToCamel.js";

describe("snakeToCamel", () => {
  it("converts single-underscore keys to camelCase", () => {
    const rows = [{ sort_index: 1000 }];
    snakeToCamel(rows);
    expect(rows[0]).toEqual({ sortIndex: 1000 });
  });

  it("converts keys with multiple underscores", () => {
    const rows = [{ last_modified: "2024-01-01" }];
    snakeToCamel(rows);
    expect(rows[0]).toEqual({ lastModified: "2024-01-01" });
  });

  it("leaves already-camelCase keys untouched", () => {
    const rows = [{ tripName: "Tokyo" }];
    snakeToCamel(rows);
    expect(rows[0]).toEqual({ tripName: "Tokyo" });
  });

  it("handles empty array without error", () => {
    const rows: Record<string, unknown>[] = [];
    snakeToCamel(rows);
    expect(rows).toEqual([]);
  });

  it("mutates rows in place", () => {
    const rows = [{ trip_id: "abc" }];
    const ref = rows[0];
    snakeToCamel(rows);
    expect(ref).toBe(rows[0]);
    expect(ref).toEqual({ tripId: "abc" });
  });

  it("handles multiple rows", () => {
    const rows = [
      { trip_id: "a", start_time: "09:00" },
      { trip_id: "b", start_time: "10:00" },
    ];
    snakeToCamel(rows);
    expect(rows[0]).toEqual({ tripId: "a", startTime: "09:00" });
    expect(rows[1]).toEqual({ tripId: "b", startTime: "10:00" });
  });
});
