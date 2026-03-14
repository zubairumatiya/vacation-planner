import { describe, it, expect, vi } from "vitest";
import checkIndexSpacing from "../checkIndexSpacing.js";
import type { PoolClient } from "pg";
import type { ScheduleBody } from "../../types/app-types.js";

function makeBody(
  above: number | null | undefined,
  below: number | null | undefined,
  tripId = "trip-1",
  start = "2024-06-01T09:00:00Z",
): ScheduleBody {
  return {
    chunk: {
      above: above != null ? { sortIndex: above } : null,
      below: below != null ? { sortIndex: below } : null,
    },
    tripId,
    start,
  } as unknown as ScheduleBody;
}

function mockClient(queryResult = { rowCount: 1, rows: [] }) {
  return {
    query: vi.fn().mockResolvedValue(queryResult),
  } as unknown as PoolClient;
}

describe("checkIndexSpacing", () => {
  it("returns 0 when both above and below are null", async () => {
    const result = await checkIndexSpacing(makeBody(null, null), mockClient());
    expect(result).toBe(0);
  });

  it("returns below - 1000 when only above is null", async () => {
    const result = await checkIndexSpacing(
      makeBody(null, 5000),
      mockClient(),
    );
    expect(result).toBe(4000);
  });

  it("returns above + 1000 when only below is null", async () => {
    const result = await checkIndexSpacing(
      makeBody(3000, null),
      mockClient(),
    );
    expect(result).toBe(4000);
  });

  it("returns midpoint when gap > 4", async () => {
    const result = await checkIndexSpacing(
      makeBody(1000, 3000),
      mockClient(),
    );
    expect(result).toBe(2000);
  });

  it("returns midpoint for odd gap > 4 (floors)", async () => {
    const result = await checkIndexSpacing(
      makeBody(1000, 2005),
      mockClient(),
    );
    expect(result).toBe(Math.floor((1000 + 2005) / 2));
  });

  it("returns undefined when gap <= 4 and add=true", async () => {
    const result = await checkIndexSpacing(
      makeBody(1000, 1003),
      mockClient(),
      undefined,
      true,
    );
    expect(result).toBeUndefined();
  });

  it("updates DB and calls renumberIndexDb when gap <= 4 and add=false", async () => {
    const client = mockClient({ rowCount: 1, rows: [] });
    // Mock the renumber query that renumberIndexDb will call
    (client.query as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({ rowCount: 1, rows: [] }) // UPDATE sort_index
      .mockResolvedValueOnce({
        rowCount: 2,
        rows: [
          { id: "1", sort_index: 1000 },
          { id: "2", sort_index: 2000 },
        ],
      }); // renumberIndexDb CTE

    const result = await checkIndexSpacing(
      makeBody(1000, 1003),
      client,
      "trip-1",
      false,
      "item-1",
    );

    // Should have called UPDATE then the renumber CTE
    expect(client.query).toHaveBeenCalledTimes(2);
    expect(result).toEqual([
      { id: "1", sort_index: 1000 },
      { id: "2", sort_index: 2000 },
    ]);
  });

  it("returns undefined when gap <= 4, add=false, and UPDATE fails", async () => {
    const client = mockClient({ rowCount: 0, rows: [] });

    const result = await checkIndexSpacing(
      makeBody(1000, 1003),
      client,
      "trip-1",
      false,
      "item-1",
    );

    expect(result).toBeUndefined();
  });
});
