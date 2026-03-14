import { describe, it, expect } from "vitest";
import { isValidPassword } from "../passwordUtils.js";

describe("isValidPassword", () => {
  it("accepts a valid password meeting all requirements", () => {
    expect(isValidPassword("StrongP@ss1")).toBe(true);
  });

  it("accepts a password at exactly 8 characters", () => {
    expect(isValidPassword("Aa1!xxxx")).toBe(true);
  });

  it("accepts a password at exactly 72 characters", () => {
    const pw = "Aa1!" + "x".repeat(68);
    expect(isValidPassword(pw)).toBe(true);
  });

  it("rejects a password shorter than 8 characters", () => {
    expect(isValidPassword("Aa1!xxx")).toBe(false);
  });

  it("rejects a password longer than 72 characters", () => {
    const pw = "Aa1!" + "x".repeat(69);
    expect(isValidPassword(pw)).toBe(false);
  });

  it("rejects a password missing an uppercase letter", () => {
    expect(isValidPassword("strongp@ss1")).toBe(false);
  });

  it("rejects a password missing a lowercase letter", () => {
    expect(isValidPassword("STRONGP@SS1")).toBe(false);
  });

  it("rejects a password missing a digit", () => {
    expect(isValidPassword("StrongP@ss")).toBe(false);
  });

  it("rejects a password missing a special character", () => {
    expect(isValidPassword("StrongPass1")).toBe(false);
  });

  it("rejects an empty string", () => {
    expect(isValidPassword("")).toBe(false);
  });
});
