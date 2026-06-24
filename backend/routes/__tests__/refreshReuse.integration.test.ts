import { describe, it, expect, vi, beforeEach } from "vitest";
import supertest from "supertest";

// Env must be set before importing the app (loginRoutes throws if SIGNATURE
// is missing, and reads SIGNATURE2 for refresh-token verification).
process.env.SIGNATURE = "test-secret";
process.env.SIGNATURE2 = "test-secret-2";
process.env.FRONTEND_URL = "http://localhost:5173";

const mockQuery = vi.fn();
const mockConnect = vi.fn();
const mockClient = { query: vi.fn(), release: vi.fn() };

vi.mock("../../db/db.js", () => ({
  default: {
    query: (...args: any[]) => mockQuery(...args),
    connect: () => mockConnect(),
  },
}));

// Refresh-token verification returns a fixed decoded payload (jti + sub).
vi.mock("jsonwebtoken", async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  return {
    ...actual,
    default: {
      ...(actual.default as object),
      verify: vi.fn(() => ({
        jti: "jti-1",
        sub: "user-1",
        exp: Math.floor(Date.now() / 1000) + 3600,
      })),
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
  Resend: vi.fn().mockImplementation(() => ({ emails: { send: vi.fn() } })),
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

const familyRevokeCall = () =>
  mockQuery.mock.calls.find((c: any[]) =>
    /SET revoked=true WHERE user_id/.test(c[0]),
  );

describe("POST /auth/refresh — reuse detection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("revokes all of the user's tokens when an already-revoked token is replayed", async () => {
    mockQuery
      .mockResolvedValueOnce({ rowCount: 0, rows: [] }) // atomic rotate: no fresh row
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ revoked: true }] }) // lookup: row exists, already revoked
      .mockResolvedValueOnce({ rowCount: 3, rows: [] }); // family revoke

    const res = await request
      .post("/auth/refresh")
      .set("Cookie", "refreshToken=stolen");

    expect(res.status).toBe(401);
    const call = familyRevokeCall();
    expect(call).toBeDefined();
    expect(call![1]).toEqual(["user-1"]);
  });

  it("does NOT revoke the family for an unknown/pruned jti (no reuse)", async () => {
    mockQuery
      .mockResolvedValueOnce({ rowCount: 0, rows: [] }) // atomic rotate: no fresh row
      .mockResolvedValueOnce({ rowCount: 0, rows: [] }); // lookup: row absent

    const res = await request
      .post("/auth/refresh")
      .set("Cookie", "refreshToken=ghost");

    expect(res.status).toBe(401);
    expect(familyRevokeCall()).toBeUndefined();
    expect(mockQuery).toHaveBeenCalledTimes(2);
  });
});
