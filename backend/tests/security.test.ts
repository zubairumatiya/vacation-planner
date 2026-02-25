import { describe, it, expect, jest } from '@jest/globals';
import request from "supertest";
import express from "express";

// Mock process.env BEFORE importing routes
process.env.SIGNATURE = "test_secret";
process.env.SIGNATURE2 = "test_secret2";
process.env.FRONTEND_URL = "http://localhost:3000";
process.env.BACKEND_BASE_URL = "http://localhost:3001";
process.env.APP_NAME = "TestApp";

// Mock the modules using unstable_mockModule for ESM support
// We need to mock the path exactly as it is imported or resolved
// The routes import "../db/db.js"
jest.unstable_mockModule("../db/db", () => ({
  __esModule: true,
  default: {
    query: jest.fn(),
    connect: jest.fn(),
  },
}));

// Also mock with .js extension just in case
jest.unstable_mockModule("../db/db.js", () => ({
  __esModule: true,
  default: {
    query: jest.fn(),
    connect: jest.fn(),
  },
}));

jest.unstable_mockModule("../helpers/emailSender", () => ({
  emailSender: jest.fn(),
}));

jest.unstable_mockModule("../helpers/emailSender.js", () => ({
  emailSender: jest.fn(),
}));

// Dynamic imports
const { default: db } = await import("../db/db");
const { emailSender } = await import("../helpers/emailSender");
// We import loginRoutes which imports db.js.
// Since we mapped .js to nothing in jest.config.js, it should resolve to ../db/db (which is TS file but we mock it)
const { default: loginRoutes } = await import("../routes/loginRoutes");

const app = express();
app.use(express.json());
app.use("/", loginRoutes);

describe("Security Vulnerabilities", () => {
  describe("POST /send-password-reset-link", () => {
    it("should return 200 even if user does not exist (Vulnerability Fix)", async () => {
      // Mock db.query to return empty rows for user lookup
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (db.query as any).mockResolvedValue({ rows: [] });

      const response = await request(app)
        .post("/send-password-reset-link")
        .send({ email: "nonexistent@example.com" });

      expect(response.status).toBe(200);
      // Ensure emailSender was NOT called for non-existent user
      expect(emailSender).not.toHaveBeenCalled();
    });

    it("should return 200 if user exists", async () => {
      // Mock db.query to return a user
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (db.query as any).mockImplementation((text: string) => {
          if (text.includes("SELECT * FROM users")) {
              return Promise.resolve({ rows: [{ email: "existing@example.com" }] });
          }
          if (text.includes("INSERT INTO password_reset")) {
              return Promise.resolve({ rows: [] });
          }
          return Promise.resolve({ rows: [] });
      });

      const response = await request(app)
        .post("/send-password-reset-link")
        .send({ email: "existing@example.com" });

      expect(response.status).toBe(200);
      // Ensure emailSender WAS called
      expect(emailSender).toHaveBeenCalled();
    });
  });
});
