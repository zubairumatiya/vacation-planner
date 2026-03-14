import { describe, it, expect, vi, beforeEach } from "vitest";
import stateAwareConfirmation from "../stateAwareConfirmation.js";
import type { NextFunction } from "express";

// Mock db module
vi.mock("../../db/db.js", () => ({
  default: { query: vi.fn() },
}));

// Import after mocking
const db = (await import("../../db/db.js")).default;

function createMocks(
  path: string,
  method: string,
  body: Record<string, unknown> = {},
  paramId = "item-1",
) {
  const req = {
    path,
    method,
    body,
    params: { id: paramId },
  } as any;

  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  } as any;

  const next = vi.fn() as NextFunction;
  return { req, res, next };
}

describe("stateAwareConfirmation", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("calls next() when lastModified matches (no conflict)", async () => {
    const timestamp = "2024-06-01T12:00:00.000Z";
    vi.mocked(db.query).mockResolvedValue({
      rowCount: 1,
      rows: [{ last_modified: new Date(timestamp), trip_id: "trip-1" }],
    } as any);

    const { req, res, next } = createMocks(
      "/schedule/item-1",
      "PATCH",
      { lastModified: timestamp },
    );

    await stateAwareConfirmation(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it("returns 409 with newData when lastModified is stale", async () => {
    const staleTimestamp = "2024-06-01T11:00:00.000Z";
    const currentTimestamp = "2024-06-01T12:00:00.000Z";

    // First query: get the item (stale)
    vi.mocked(db.query).mockResolvedValueOnce({
      rowCount: 1,
      rows: [{ last_modified: new Date(currentTimestamp), trip_id: "trip-1" }],
    } as any);

    // Second query: get all items for the trip (refresh data)
    vi.mocked(db.query).mockResolvedValueOnce({
      rowCount: 2,
      rows: [
        { id: "item-1", location: "Tokyo", sort_index: 1000 },
        { id: "item-2", location: "Kyoto", sort_index: 2000 },
      ],
    } as any);

    const { req, res, next } = createMocks(
      "/schedule/item-1",
      "PATCH",
      { lastModified: staleTimestamp, tripId: "trip-1" },
    );

    await stateAwareConfirmation(req, res, next);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Conflict detected",
        newData: expect.any(Array),
      }),
    );
    expect(next).not.toHaveBeenCalled();
  });

  it("returns 404 with deletedId for DELETE on missing item", async () => {
    vi.mocked(db.query).mockResolvedValue({
      rowCount: 0,
      rows: [],
    } as any);

    const { req, res, next } = createMocks(
      "/schedule/item-1",
      "DELETE",
      {},
    );

    await stateAwareConfirmation(req, res, next);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ deletedId: "item-1", queryComplete: "true" }),
    );
  });

  it("calls next() for unrecognized path patterns", async () => {
    const { req, res, next } = createMocks(
      "/some-other-route",
      "PATCH",
      {},
    );

    await stateAwareConfirmation(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(db.query).not.toHaveBeenCalled();
  });

  it("handles /list/ paths the same way as /schedule/", async () => {
    const timestamp = "2024-06-01T12:00:00.000Z";
    vi.mocked(db.query).mockResolvedValue({
      rowCount: 1,
      rows: [{ last_modified: new Date(timestamp), trip_id: "trip-1" }],
    } as any);

    const { req, res, next } = createMocks(
      "/list/item-1",
      "PATCH",
      { lastModified: timestamp },
    );

    await stateAwareConfirmation(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(db.query).toHaveBeenCalledWith(
      "SELECT * FROM trip_list WHERE id=$1",
      ["item-1"],
    );
  });

  it("calls next(err) on database error", async () => {
    const dbError = new Error("connection refused");
    vi.mocked(db.query).mockRejectedValue(dbError);

    const { req, res, next } = createMocks(
      "/schedule/item-1",
      "PATCH",
      { lastModified: "2024-06-01T12:00:00.000Z" },
    );

    await stateAwareConfirmation(req, res, next);
    expect(next).toHaveBeenCalledWith(dbError);
  });
});
