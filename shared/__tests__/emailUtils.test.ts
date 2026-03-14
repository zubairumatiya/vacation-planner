import { describe, it, expect } from "vitest";
import { isValidEmail } from "../emailUtils.js";

describe("isValidEmail", () => {
  it("accepts a standard email", () => {
    expect(isValidEmail("user@example.com")).toBe(true);
  });

  it("accepts an email with subdomain", () => {
    expect(isValidEmail("user@mail.example.com")).toBe(true);
  });

  it("accepts an email with dots and hyphens in local part", () => {
    expect(isValidEmail("first.last@example.com")).toBe(true);
  });

  it("rejects an empty string", () => {
    expect(isValidEmail("")).toBe(false);
  });

  it("rejects an email missing @", () => {
    expect(isValidEmail("userexample.com")).toBe(false);
  });

  it("rejects an email with double dots in domain", () => {
    expect(isValidEmail("user@example..com")).toBe(false);
  });

  it("rejects an email with leading dot before @", () => {
    expect(isValidEmail(".user@example.com")).toBe(false);
  });

  it("rejects an email with no domain extension", () => {
    expect(isValidEmail("user@example")).toBe(false);
  });
});
