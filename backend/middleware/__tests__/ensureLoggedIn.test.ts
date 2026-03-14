import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Request, Response, NextFunction } from "express";

// Set env before module loads (SECRET is captured at import time)
process.env.SIGNATURE = "test-secret";

// Must import after env is set
const jwt = await import("jsonwebtoken");
const { default: ensureLoggedIn } = await import("../ensureLoggedIn.js");

vi.mock("jsonwebtoken", async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  return {
    ...actual,
    default: {
      ...(actual.default as object),
      verify: vi.fn(),
    },
  };
});

function createMocks(authHeader?: string) {
  const req = {
    headers: { authorization: authHeader },
  } as unknown as Request;

  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  } as unknown as Response;

  const next = vi.fn() as NextFunction;

  return { req, res, next };
}

describe("ensureLoggedIn", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("returns 401 when no Authorization header is present", () => {
    const { req, res, next } = createMocks();
    ensureLoggedIn(req as any, res as any, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: "Token not found" });
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 when token is the string "null"', () => {
    const { req, res, next } = createMocks("Bearer null");
    ensureLoggedIn(req as any, res as any, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: "Token not found" });
  });

  it('returns 401 when token is the string "undefined"', () => {
    const { req, res, next } = createMocks("Bearer undefined");
    ensureLoggedIn(req as any, res as any, next);

    expect(res.status).toHaveBeenCalledWith(401);
  });

  it("returns 401 when scheme is not Bearer", () => {
    const { req, res, next } = createMocks("Basic abc123");
    ensureLoggedIn(req as any, res as any, next);

    expect(res.status).toHaveBeenCalledWith(401);
  });

  it("calls next() and sets req.user on valid token", () => {
    const payload = { id: "user-1" };
    vi.mocked(jwt.default.verify).mockReturnValue(payload as any);

    const { req, res, next } = createMocks("Bearer valid-token");
    ensureLoggedIn(req as any, res as any, next);

    expect(next).toHaveBeenCalled();
    expect((req as any).user).toEqual(payload);
  });

  it("returns 401 with TokenExpired error on expired token", () => {
    const err = new Error("jwt expired");
    err.name = "TokenExpiredError";
    vi.mocked(jwt.default.verify).mockImplementation(() => {
      throw err;
    });

    const { req, res, next } = createMocks("Bearer expired-token");
    ensureLoggedIn(req as any, res as any, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: "TokenExpired" });
  });

  it("returns 401 with JwtError on invalid token", () => {
    const err = new Error("invalid signature");
    err.name = "JsonWebTokenError";
    vi.mocked(jwt.default.verify).mockImplementation(() => {
      throw err;
    });

    const { req, res, next } = createMocks("Bearer bad-token");
    ensureLoggedIn(req as any, res as any, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: "JwtError" });
  });
});
