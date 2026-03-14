import { describe, it, expect, vi, beforeEach } from "vitest";
import supertest from "supertest";

// Set env before imports
process.env.SIGNATURE = "test-secret";
process.env.FRONTEND_URL = "http://localhost:5173";

// Mock db
const mockQuery = vi.fn();
const mockConnect = vi.fn();
const mockClient = {
  query: vi.fn(),
  release: vi.fn(),
};

vi.mock("../../db/db.js", () => ({
  default: {
    query: (...args: any[]) => mockQuery(...args),
    connect: () => mockConnect(),
  },
}));

// Mock jwt to always pass auth
vi.mock("jsonwebtoken", async (importOriginal) => {
  const actual = await importOriginal<typeof import("jsonwebtoken")>();
  return {
    ...actual,
    default: {
      ...actual.default,
      verify: vi.fn(() => ({ id: "user-1" })),
    },
  };
});

// Mock dotenv to prevent .env loading errors
vi.mock("dotenv", () => ({
  default: { config: vi.fn() },
}));

// Mock external services to prevent import errors
vi.mock("../../helpers/emailSender.js", () => ({
  default: vi.fn(),
}));

vi.mock("../../helpers/refreshGoogleToken.js", () => ({
  default: vi.fn(),
}));

// Mock checkIndexSpacing (already unit tested)
const mockCheckIndexSpacing = vi.fn();
vi.mock("../../helpers/checkIndexSpacing.js", () => ({
  default: (...args: any[]) => mockCheckIndexSpacing(...args),
}));

// Mock renumberIndexDb (already unit tested)
const mockRenumberIndexDb = vi.fn();
vi.mock("../../helpers/renumberIndexDb.js", () => ({
  default: (...args: any[]) => mockRenumberIndexDb(...args),
}));

// Mock Google GenAI
vi.mock("@google/genai", () => ({
  GoogleGenAI: vi.fn().mockImplementation(() => ({
    models: { generateContent: vi.fn() },
  })),
}));

// Mock resend
vi.mock("resend", () => ({
  Resend: vi.fn().mockImplementation(() => ({
    emails: { send: vi.fn() },
  })),
}));

// Mock bcrypt
vi.mock("bcrypt", () => ({
  default: {
    hash: vi.fn(),
    compare: vi.fn(),
    genSalt: vi.fn(),
  },
}));

// Mock obscenity
vi.mock("obscenity", () => ({
  RegExpMatcher: vi.fn().mockImplementation(() => ({
    hasMatch: vi.fn(() => false),
  })),
  TextCensor: vi.fn().mockImplementation(() => ({})),
  englishDataset: { build: vi.fn(() => ({})) },
  englishRecommendedTransformers: [],
}));

const { default: app } = await import("../../app.js");
const request = supertest(app);

// Fixed timestamp for stateAwareConfirmation matching
const FIXED_TS = "2024-01-15T12:00:00.000Z";

describe("Vacation Routes Integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockConnect.mockResolvedValue(mockClient);
    mockClient.query.mockResolvedValue({ rowCount: 1, rows: [] });
  });

  // ─── POST /add-vacation ───────────────────────

  describe("POST /add-vacation", () => {
    const validBody = {
      tripname: "Tokyo Trip",
      location: "Tokyo, Japan",
      startDate: "2024-06-01",
      endDate: "2024-06-10",
      gId: "place-123",
      gVp: { south: 35.5, west: 139.5, north: 35.8, east: 139.9 },
    };

    it("creates a trip and returns success", async () => {
      mockQuery
        .mockResolvedValueOnce({ rowCount: 1, rows: [{ id: "trip-1" }] }) // INSERT trip
        .mockResolvedValueOnce({ rowCount: 1, rows: [] }); // INSERT user_trips

      const res = await request
        .post("/add-vacation")
        .set("Authorization", "Bearer valid-token")
        .send(validBody);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe("success");
      expect(mockQuery).toHaveBeenCalledTimes(2);
    });

    it("returns 400 when required fields are missing", async () => {
      const res = await request
        .post("/add-vacation")
        .set("Authorization", "Bearer valid-token")
        .send({ tripname: "Test" });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain("Invalid input");
    });

    it("returns 400 when startDate is after endDate", async () => {
      const res = await request
        .post("/add-vacation")
        .set("Authorization", "Bearer valid-token")
        .send({ ...validBody, startDate: "2024-06-10", endDate: "2024-06-01" });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain("Invalid date");
    });

    it("returns 401 without auth token", async () => {
      const res = await request
        .post("/add-vacation")
        .send(validBody);

      expect(res.status).toBe(401);
    });
  });

  // ─── PATCH /add-vacation/:tripId ──────────────

  describe("PATCH /add-vacation/:tripId", () => {
    const validBody = {
      tripname: "Updated Trip",
      location: "Osaka, Japan",
      startDate: "2024-06-01",
      endDate: "2024-06-15",
      gId: "place-789",
      gVp: { south: 34.6, west: 135.4, north: 34.7, east: 135.6 },
    };

    it("updates trip and returns success", async () => {
      // ensureOwnerOnly middleware query
      mockQuery
        .mockResolvedValueOnce({ rowCount: 1, rows: [{ role: "owner" }] })
        // UPDATE trips
        .mockResolvedValueOnce({ rowCount: 1, rows: [{ id: "trip-1" }] });

      const res = await request
        .patch("/add-vacation/trip-1")
        .set("Authorization", "Bearer valid-token")
        .send(validBody);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe("success");
    });

    it("returns 400 when required fields are missing", async () => {
      mockQuery.mockResolvedValueOnce({ rowCount: 1, rows: [{ role: "owner" }] });

      const res = await request
        .patch("/add-vacation/trip-1")
        .set("Authorization", "Bearer valid-token")
        .send({ tripname: "Only name" });

      expect(res.status).toBe(400);
    });

    it("returns 400 when startDate is after endDate", async () => {
      mockQuery.mockResolvedValueOnce({ rowCount: 1, rows: [{ role: "owner" }] });

      const res = await request
        .patch("/add-vacation/trip-1")
        .set("Authorization", "Bearer valid-token")
        .send({ ...validBody, startDate: "2024-06-15", endDate: "2024-06-01" });

      expect(res.status).toBe(400);
    });

    it("returns 403 when user is not trip owner", async () => {
      mockQuery.mockResolvedValueOnce({ rowCount: 0, rows: [] });

      const res = await request
        .patch("/add-vacation/trip-1")
        .set("Authorization", "Bearer valid-token")
        .send(validBody);

      expect(res.status).toBe(403);
    });
  });

  // ─── DELETE /delete-vacation/:tripId ──────────

  describe("DELETE /delete-vacation/:tripId", () => {
    it("deletes trip and returns success", async () => {
      mockQuery
        .mockResolvedValueOnce({ rowCount: 1, rows: [{ role: "owner" }] }) // ensureOwnerOnly
        .mockResolvedValueOnce({ rowCount: 1, rows: [{ id: "trip-1" }] }); // DELETE trips

      const res = await request
        .delete("/delete-vacation/trip-1")
        .set("Authorization", "Bearer valid-token");

      expect(res.status).toBe(200);
      expect(res.body.message).toBe("success");
    });

    it("returns 403 when user is not trip owner", async () => {
      mockQuery.mockResolvedValueOnce({ rowCount: 0, rows: [] });

      const res = await request
        .delete("/delete-vacation/trip-1")
        .set("Authorization", "Bearer valid-token");

      expect(res.status).toBe(403);
    });

    it("returns 401 without auth token", async () => {
      const res = await request
        .delete("/delete-vacation/trip-1");

      expect(res.status).toBe(401);
    });
  });

  // ─── POST /migrate-guest-trip ─────────────────

  describe("POST /migrate-guest-trip", () => {
    const validBody = {
      tripName: "Guest Trip",
      location: "Kyoto, Japan",
      startDate: "2024-07-01",
      endDate: "2024-07-05",
      gId: "place-456",
      gVp: { south: 34.9, west: 135.7, north: 35.1, east: 135.8 },
      isPublic: false,
      isOpenInvite: false,
      schedule: [
        {
          startTime: "2024-07-01T09:00:00Z",
          endTime: "2024-07-01T10:00:00Z",
          location: "Kinkaku-ji",
          details: "Golden Pavilion",
          cost: 500,
          multiDay: false,
          sortIndex: 0,
        },
      ],
      list: [
        { value: "Try matcha", fromGoogle: null, details: null, itemAdded: false },
      ],
    };

    it("migrates guest trip with schedule and list items", async () => {
      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({ rowCount: 1, rows: [{ id: "trip-new" }] }) // INSERT trip
        .mockResolvedValueOnce({ rowCount: 1, rows: [] }) // INSERT user_trips
        .mockResolvedValueOnce({ rowCount: 1, rows: [] }) // INSERT schedule item
        .mockResolvedValueOnce({ rowCount: 1, rows: [] }) // INSERT list item
        .mockResolvedValueOnce({ rows: [] }); // COMMIT

      const res = await request
        .post("/migrate-guest-trip")
        .set("Authorization", "Bearer valid-token")
        .send(validBody);

      expect(res.status).toBe(200);
      expect(res.body.tripId).toBe("trip-new");
      expect(mockClient.query).toHaveBeenCalledTimes(6);
    });

    it("handles empty schedule and list arrays", async () => {
      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({ rowCount: 1, rows: [{ id: "trip-new" }] }) // INSERT trip
        .mockResolvedValueOnce({ rowCount: 1, rows: [] }) // INSERT user_trips
        .mockResolvedValueOnce({ rows: [] }); // COMMIT

      const res = await request
        .post("/migrate-guest-trip")
        .set("Authorization", "Bearer valid-token")
        .send({ ...validBody, schedule: [], list: [] });

      expect(res.status).toBe(200);
      expect(res.body.tripId).toBe("trip-new");
    });

    it("returns 400 when required fields are missing", async () => {
      const res = await request
        .post("/migrate-guest-trip")
        .set("Authorization", "Bearer valid-token")
        .send({ tripName: "Incomplete" });

      expect(res.status).toBe(400);
    });

    it("returns 401 without auth token", async () => {
      const res = await request
        .post("/migrate-guest-trip")
        .send(validBody);

      expect(res.status).toBe(401);
    });
  });

  // ─── POST /schedule/:tripId ───────────────────

  describe("POST /schedule/:tripId", () => {
    const scheduleBody = {
      start: "2024-06-01T09:00:00Z",
      end: "2024-06-01T10:00:00Z",
      location: "Senso-ji Temple",
      details: "Morning visit",
      cost: "500",
      multiDay: false,
      chunk: { above: { sortIndex: 0 } },
      tripId: "trip-1",
    };

    it("adds a schedule item and returns it", async () => {
      // ensureOwnership middleware
      mockQuery.mockResolvedValueOnce({ rowCount: 1, rows: [{ role: "owner" }] });
      // checkIndexSpacing returns a numeric sort index
      mockCheckIndexSpacing.mockResolvedValueOnce(1000);

      const addedItem = {
        id: "sched-1",
        trip_id: "trip-1",
        location: "Senso-ji Temple",
        start_time: "2024-06-01T09:00:00Z",
        end_time: "2024-06-01T10:00:00Z",
        cost: 500,
        sort_index: 1000,
        last_modified: FIXED_TS,
      };

      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({ rowCount: 1, rows: [addedItem] }) // INSERT
        .mockResolvedValueOnce({ rowCount: 1, rows: [addedItem] }) // SELECT by id
        .mockResolvedValueOnce({ rows: [] }); // COMMIT

      const res = await request
        .post("/schedule/trip-1")
        .set("Authorization", "Bearer valid-token")
        .send(scheduleBody);

      expect(res.status).toBe(200);
      expect(res.body.addedItem).toBeDefined();
    });

    it("returns renumbered schedule when gap is too small", async () => {
      mockQuery.mockResolvedValueOnce({ rowCount: 1, rows: [{ role: "owner" }] });
      // checkIndexSpacing returns undefined → needs renumber
      mockCheckIndexSpacing.mockResolvedValueOnce(undefined);

      const insertedRow = {
        id: "sched-2",
        trip_id: "trip-1",
        location: "Senso-ji Temple",
        sort_index: 1,
      };

      const renumberedRows = [
        { id: "sched-1", trip_id: "trip-1", sort_index: 1000 },
        { id: "sched-2", trip_id: "trip-1", sort_index: 2000 },
      ];

      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({ rowCount: 1, rows: [insertedRow] }) // INSERT
        .mockResolvedValueOnce({ rows: [] }); // COMMIT

      mockRenumberIndexDb.mockResolvedValueOnce(renumberedRows);

      const res = await request
        .post("/schedule/trip-1")
        .set("Authorization", "Bearer valid-token")
        .send(scheduleBody);

      expect(res.status).toBe(200);
      expect(res.body.newlyIndexedSchedule).toBeDefined();
      expect(mockRenumberIndexDb).toHaveBeenCalledTimes(1);
    });

    it("returns 403 when user is a reader", async () => {
      mockQuery.mockResolvedValueOnce({ rowCount: 0, rows: [] });

      const res = await request
        .post("/schedule/trip-1")
        .set("Authorization", "Bearer valid-token")
        .send(scheduleBody);

      expect(res.status).toBe(403);
    });

    it("returns 401 without auth token", async () => {
      const res = await request
        .post("/schedule/trip-1")
        .send(scheduleBody);

      expect(res.status).toBe(401);
    });
  });

  // ─── PATCH /schedule/:id ──────────────────────

  describe("PATCH /schedule/:id", () => {
    const updateBody = {
      start: "2024-06-01T10:00:00Z",
      end: "2024-06-01T11:00:00Z",
      location: "Updated Location",
      details: "Updated details",
      cost: "750",
      multiDay: false,
      chunk: { above: { sortIndex: 500 } },
      tripId: "trip-1",
      lastModified: FIXED_TS,
    };

    it("updates a schedule item and returns it", async () => {
      // ensureOwnership middleware
      mockQuery
        .mockResolvedValueOnce({ rowCount: 1, rows: [{ role: "owner" }] })
        // stateAwareConfirmation: SELECT item
        .mockResolvedValueOnce({
          rowCount: 1,
          rows: [{ id: "sched-1", last_modified: FIXED_TS, trip_id: "trip-1" }],
        });

      // checkIndexSpacing returns numeric sort index
      mockCheckIndexSpacing.mockResolvedValueOnce(1500);

      const updatedRow = {
        id: "sched-1",
        location: "Updated Location",
        details: "Updated details",
        start_time: "2024-06-01T10:00:00Z",
        end_time: "2024-06-01T11:00:00Z",
        cost: 750,
        sort_index: 1500,
        last_modified: "2024-01-15T12:01:00.000Z",
      };

      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({ rowCount: 1, rows: [updatedRow] }) // UPDATE
        .mockResolvedValueOnce({ rows: [] }); // COMMIT

      const res = await request
        .patch("/schedule/sched-1")
        .set("Authorization", "Bearer valid-token")
        .send(updateBody);

      expect(res.status).toBe(200);
      expect(res.body.updatedData).toBeDefined();
    });

    it("returns 409 when lastModified is stale", async () => {
      // ensureOwnership
      mockQuery
        .mockResolvedValueOnce({ rowCount: 1, rows: [{ role: "owner" }] })
        // stateAwareConfirmation: item has DIFFERENT last_modified
        .mockResolvedValueOnce({
          rowCount: 1,
          rows: [{ id: "sched-1", last_modified: "2024-01-16T00:00:00.000Z", trip_id: "trip-1" }],
        })
        // stateAwareConfirmation: refresh data query
        .mockResolvedValueOnce({
          rowCount: 2,
          rows: [
            { id: "sched-1", sort_index: 1000 },
            { id: "sched-2", sort_index: 2000 },
          ],
        });

      const res = await request
        .patch("/schedule/sched-1")
        .set("Authorization", "Bearer valid-token")
        .send(updateBody);

      expect(res.status).toBe(409);
      expect(res.body.newData).toBeDefined();
    });
  });

  // ─── DELETE /schedule/:id ─────────────────────

  describe("DELETE /schedule/:id", () => {
    it("deletes a schedule item and returns it", async () => {
      const deletedItem = {
        id: "sched-1",
        trip_id: "trip-1",
        location: "Senso-ji",
        sort_index: 1000,
        last_modified: FIXED_TS,
      };

      mockQuery
        // ensureOwnership
        .mockResolvedValueOnce({ rowCount: 1, rows: [{ role: "owner" }] })
        // stateAwareConfirmation: SELECT item
        .mockResolvedValueOnce({
          rowCount: 1,
          rows: [{ id: "sched-1", last_modified: FIXED_TS, trip_id: "trip-1" }],
        })
        // DELETE RETURNING *
        .mockResolvedValueOnce({ rowCount: 1, rows: [deletedItem] });

      const res = await request
        .delete("/schedule/sched-1")
        .set("Authorization", "Bearer valid-token")
        .send({ tripId: "trip-1", lastModified: FIXED_TS });

      expect(res.status).toBe(200);
      expect(res.body.deletedData).toBeDefined();
    });

    it("returns 404 when item already deleted (stateAwareConfirmation)", async () => {
      mockQuery
        .mockResolvedValueOnce({ rowCount: 1, rows: [{ role: "owner" }] })
        // stateAwareConfirmation: item not found + DELETE method
        .mockResolvedValueOnce({ rowCount: 0, rows: [] });

      const res = await request
        .delete("/schedule/sched-gone")
        .set("Authorization", "Bearer valid-token")
        .send({ tripId: "trip-1", lastModified: FIXED_TS });

      expect(res.status).toBe(404);
      expect(res.body.deletedId).toBe("sched-gone");
    });

    it("returns 403 when user is a reader", async () => {
      mockQuery.mockResolvedValueOnce({ rowCount: 0, rows: [] });

      const res = await request
        .delete("/schedule/sched-1")
        .set("Authorization", "Bearer valid-token")
        .send({ tripId: "trip-1", lastModified: FIXED_TS });

      expect(res.status).toBe(403);
    });
  });

  // ─── POST /list/:tripId ──────────────────────

  describe("POST /list/:tripId", () => {
    it("adds a list item and returns it", async () => {
      const newItem = {
        id: "list-1",
        value: "Visit Fushimi Inari",
        from_google: null,
        details: null,
        item_added: false,
        last_modified: FIXED_TS,
      };

      mockQuery
        .mockResolvedValueOnce({ rowCount: 1, rows: [{ role: "owner" }] }) // ensureOwnership
        .mockResolvedValueOnce({ rowCount: 1, rows: [newItem] }); // INSERT RETURNING

      const res = await request
        .post("/list/trip-1")
        .set("Authorization", "Bearer valid-token")
        .send({ value: "Visit Fushimi Inari", tripId: "trip-1" });

      expect(res.status).toBe(200);
      expect(res.body.data).toBeDefined();
      expect(res.body.data.value).toBe("Visit Fushimi Inari");
    });

    it("adds a list item with fromGoogle field", async () => {
      const newItem = {
        id: "list-2",
        value: "Kinkaku-ji",
        from_google: "ChIJ-e0bz5MIAWARjhsFGMdMu2c",
        details: null,
        item_added: false,
        last_modified: FIXED_TS,
      };

      mockQuery
        .mockResolvedValueOnce({ rowCount: 1, rows: [{ role: "owner" }] })
        .mockResolvedValueOnce({ rowCount: 1, rows: [newItem] });

      const res = await request
        .post("/list/trip-1")
        .set("Authorization", "Bearer valid-token")
        .send({
          value: "Kinkaku-ji",
          fromGoogle: "ChIJ-e0bz5MIAWARjhsFGMdMu2c",
          tripId: "trip-1",
        });

      expect(res.status).toBe(200);
      expect(res.body.data.fromGoogle).toBe("ChIJ-e0bz5MIAWARjhsFGMdMu2c");
    });

    it("returns 403 when user is a reader", async () => {
      mockQuery.mockResolvedValueOnce({ rowCount: 0, rows: [] });

      const res = await request
        .post("/list/trip-1")
        .set("Authorization", "Bearer valid-token")
        .send({ value: "Test", tripId: "trip-1" });

      expect(res.status).toBe(403);
    });
  });

  // ─── PATCH /check-list-item/:itemId ───────────

  describe("PATCH /check-list-item/:itemId", () => {
    it("toggles item_added and returns updated item", async () => {
      const updatedItem = {
        id: "list-1",
        value: "Visit Fushimi Inari",
        item_added: true,
        last_modified: FIXED_TS,
      };

      mockQuery
        .mockResolvedValueOnce({ rowCount: 1, rows: [{ role: "owner" }] }) // ensureOwnership
        .mockResolvedValueOnce({ rowCount: 1, rows: [updatedItem] }); // UPDATE RETURNING

      const res = await request
        .patch("/check-list-item/list-1")
        .set("Authorization", "Bearer valid-token")
        .send({ newValue: true, tripId: "trip-1" });

      expect(res.status).toBe(200);
      expect(res.body.data).toBeDefined();
    });
  });

  // ─── DELETE /list/:itemId ─────────────────────

  describe("DELETE /list/:itemId", () => {
    it("deletes a list item by id", async () => {
      const deletedItem = {
        id: "list-1",
        value: "Visit Fushimi Inari",
        from_google: null,
      };

      mockQuery
        .mockResolvedValueOnce({ rowCount: 1, rows: [{ role: "owner" }] }) // ensureOwnership
        .mockResolvedValueOnce({ rowCount: 1, rows: [deletedItem] }); // DELETE RETURNING

      const res = await request
        .delete("/list/list-1")
        .set("Authorization", "Bearer valid-token")
        .send({ isGoogleId: false, tripId: "trip-1" });

      expect(res.status).toBe(200);
      expect(res.body.deletedData).toBeDefined();
      expect(res.body.deletedData).toHaveLength(1);
    });

    it("deletes a list item by Google place ID", async () => {
      const deletedItem = {
        id: "list-2",
        value: "Kinkaku-ji",
        from_google: "ChIJ-googleid",
      };

      mockQuery
        .mockResolvedValueOnce({ rowCount: 1, rows: [{ role: "owner" }] })
        .mockResolvedValueOnce({ rowCount: 1, rows: [deletedItem] });

      const res = await request
        .delete("/list/ChIJ-googleid")
        .set("Authorization", "Bearer valid-token")
        .send({ isGoogleId: true, tripId: "trip-1" });

      expect(res.status).toBe(200);
      expect(res.body.deletedData).toBeDefined();
    });

    it("returns 403 when user is a reader", async () => {
      mockQuery.mockResolvedValueOnce({ rowCount: 0, rows: [] });

      const res = await request
        .delete("/list/list-1")
        .set("Authorization", "Bearer valid-token")
        .send({ isGoogleId: false, tripId: "trip-1" });

      expect(res.status).toBe(403);
    });
  });
});
