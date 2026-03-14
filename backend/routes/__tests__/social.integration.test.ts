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

// Mock jwt to return user-1 by default
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

vi.mock("dotenv", () => ({ default: { config: vi.fn() } }));
vi.mock("../../helpers/emailSender.js", () => ({ default: vi.fn() }));
vi.mock("../../helpers/refreshGoogleToken.js", () => ({ default: vi.fn() }));
vi.mock("@google/genai", () => ({
  GoogleGenAI: vi.fn().mockImplementation(() => ({
    models: { generateContent: vi.fn() },
  })),
}));
vi.mock("resend", () => ({
  Resend: vi.fn().mockImplementation(() => ({
    emails: { send: vi.fn() },
  })),
}));
vi.mock("bcrypt", () => ({
  default: { hash: vi.fn(), compare: vi.fn(), genSalt: vi.fn() },
}));
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

describe("Social Routes Integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockConnect.mockResolvedValue(mockClient);
    mockClient.query.mockResolvedValue({ rowCount: 1, rows: [] });
  });

  // ─── Follow Request State Machine ─────────────

  describe("POST /follow/:userId", () => {
    it("creates a pending follow request", async () => {
      // No existing friendship
      mockQuery.mockResolvedValueOnce({ rows: [] });

      // Transaction: BEGIN, INSERT follows, INSERT notifications, COMMIT
      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({ rows: [{ id: "follow-1" }] }) // INSERT follows
        .mockResolvedValueOnce({ rows: [] }) // INSERT notification
        .mockResolvedValueOnce({ rows: [] }); // COMMIT

      const res = await request
        .post("/follow/user-2")
        .set("Authorization", "Bearer valid-token");

      expect(res.status).toBe(201);
      expect(res.body.message).toBe("Friend request sent");
    });

    it("rejects self-follow", async () => {
      const res = await request
        .post("/follow/user-1") // same as authenticated user
        .set("Authorization", "Bearer valid-token");

      expect(res.status).toBe(400);
      expect(res.body.message).toContain("Cannot send friend request to yourself");
    });

    it("rejects duplicate pending request", async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: "follow-1", status: "pending" }],
      });

      const res = await request
        .post("/follow/user-2")
        .set("Authorization", "Bearer valid-token");

      expect(res.status).toBe(409);
      expect(res.body.message).toContain("already pending");
    });

    it("rejects when already friends", async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: "follow-1", status: "accepted" }],
      });

      const res = await request
        .post("/follow/user-2")
        .set("Authorization", "Bearer valid-token");

      expect(res.status).toBe(409);
      expect(res.body.message).toContain("Already friends");
    });

    it("allows re-request after decline", async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: "follow-1", status: "declined" }],
      });

      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({ rows: [] }) // UPDATE follows
        .mockResolvedValueOnce({ rows: [] }) // INSERT notification
        .mockResolvedValueOnce({ rows: [] }); // COMMIT

      const res = await request
        .post("/follow/user-2")
        .set("Authorization", "Bearer valid-token");

      expect(res.status).toBe(200);
      expect(res.body.message).toBe("Friend request sent");
    });
  });

  // ─── Notification Action Handling ─────────────

  describe("PATCH /notifications/:id", () => {
    it("accepts a follow request and updates friendship status", async () => {
      // Verify notification belongs to user
      mockQuery.mockResolvedValueOnce({
        rows: [{
          id: "notif-1",
          type: "follow_request",
          reference_id: "follow-1",
          from_user_id: "user-2",
          metadata: null,
        }],
      });

      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({ rows: [] }) // UPDATE notification status
        .mockResolvedValueOnce({ rows: [] }) // UPDATE follows status
        .mockResolvedValueOnce({ rows: [] }); // COMMIT

      const res = await request
        .patch("/notifications/notif-1")
        .set("Authorization", "Bearer valid-token")
        .send({ action: "accepted" });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe("Notification accepted");

      // Verify follows table was updated to accepted
      expect(mockClient.query).toHaveBeenCalledWith(
        "UPDATE follows SET status = $1 WHERE id = $2",
        ["accepted", "follow-1"],
      );
    });

    it("accepts a trip invitation and adds user to trip with correct role", async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{
          id: "notif-2",
          type: "trip_invitation",
          reference_id: "trip-1",
          from_user_id: "user-2",
          metadata: { role: "editor" },
        }],
      });

      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({ rows: [] }) // UPDATE notification
        .mockResolvedValueOnce({ rows: [] }) // INSERT user_trips
        .mockResolvedValueOnce({ rows: [] }); // COMMIT

      const res = await request
        .patch("/notifications/notif-2")
        .set("Authorization", "Bearer valid-token")
        .send({ action: "accepted" });

      expect(res.status).toBe(200);

      // Verify user was added to trip as editor
      expect(mockClient.query).toHaveBeenCalledWith(
        "INSERT INTO user_trips (user_id, trip_id, role) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING",
        ["user-1", "trip-1", "editor"],
      );
    });

    it("declining a trip invitation does NOT add user to trip", async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{
          id: "notif-2",
          type: "trip_invitation",
          reference_id: "trip-1",
          from_user_id: "user-2",
          metadata: { role: "editor" },
        }],
      });

      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({ rows: [] }) // UPDATE notification
        .mockResolvedValueOnce({ rows: [] }); // COMMIT

      const res = await request
        .patch("/notifications/notif-2")
        .set("Authorization", "Bearer valid-token")
        .send({ action: "declined" });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe("Notification declined");

      // Should NOT have called INSERT INTO user_trips
      const insertCalls = mockClient.query.mock.calls.filter(
        (call: any) => typeof call[0] === "string" && call[0].includes("INSERT INTO user_trips"),
      );
      expect(insertCalls).toHaveLength(0);
    });

    it("returns 400 for invalid action", async () => {
      const res = await request
        .patch("/notifications/notif-1")
        .set("Authorization", "Bearer valid-token")
        .send({ action: "invalid" });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("Invalid action");
    });

    it("returns 404 when notification not found", async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const res = await request
        .patch("/notifications/nonexistent")
        .set("Authorization", "Bearer valid-token")
        .send({ action: "accepted" });

      expect(res.status).toBe(404);
    });

    it("defaults to reader role when trip invitation has no editor role", async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{
          id: "notif-3",
          type: "trip_invitation",
          reference_id: "trip-2",
          from_user_id: "user-2",
          metadata: { role: "viewer" }, // not "editor", should default to "reader"
        }],
      });

      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({ rows: [] }) // UPDATE notification
        .mockResolvedValueOnce({ rows: [] }) // INSERT user_trips
        .mockResolvedValueOnce({ rows: [] }); // COMMIT

      const res = await request
        .patch("/notifications/notif-3")
        .set("Authorization", "Bearer valid-token")
        .send({ action: "accepted" });

      expect(res.status).toBe(200);

      // Should default to "reader" role
      expect(mockClient.query).toHaveBeenCalledWith(
        "INSERT INTO user_trips (user_id, trip_id, role) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING",
        ["user-1", "trip-2", "reader"],
      );
    });

    it("declining a follow request does NOT create friendship", async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{
          id: "notif-4",
          type: "follow_request",
          reference_id: "follow-2",
          from_user_id: "user-3",
          metadata: null,
        }],
      });

      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({ rows: [] }) // UPDATE notification status
        .mockResolvedValueOnce({ rows: [] }) // UPDATE follows status to declined
        .mockResolvedValueOnce({ rows: [] }); // COMMIT

      const res = await request
        .patch("/notifications/notif-4")
        .set("Authorization", "Bearer valid-token")
        .send({ action: "declined" });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe("Notification declined");

      // Verify follows was set to declined, not accepted
      expect(mockClient.query).toHaveBeenCalledWith(
        "UPDATE follows SET status = $1 WHERE id = $2",
        ["declined", "follow-2"],
      );
    });
  });
});
