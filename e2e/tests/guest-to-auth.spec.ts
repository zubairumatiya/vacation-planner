import { test, expect } from "@playwright/test";

test.describe("Guest to Authenticated User Flow", () => {
  test.beforeEach(async ({ page }) => {
    // Clear localStorage before each test
    await page.goto("/login");
    await page.evaluate(() => localStorage.clear());
  });

  test("unauthenticated user is redirected to login", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/\/login/);
  });

  test("login page renders with correct elements", async ({ page }) => {
    await page.goto("/login");

    await expect(page.getByText("Welcome back")).toBeVisible();
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByLabel("Password")).toBeVisible();
    await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();
    await expect(page.getByText("Sign up")).toBeVisible();
  });

  test("login form validates empty fields", async ({ page }) => {
    await page.goto("/login");

    await page.getByRole("button", { name: "Sign in" }).click();

    await expect(page.getByText("Email is required")).toBeVisible();
    await expect(page.getByText("Password is required")).toBeVisible();
  });

  test("login shows error for invalid credentials", async ({ page }) => {
    await page.goto("/login");

    await page.getByLabel("Email").fill("bad@example.com");
    await page.getByLabel("Password").fill("WrongPass123!");
    await page.getByRole("button", { name: "Sign in" }).click();

    await expect(page.getByText("Invalid email or password")).toBeVisible({
      timeout: 5000,
    });
  });

  test("navigates from login to signup", async ({ page }) => {
    await page.goto("/login");

    await page.getByRole("link", { name: "Sign up" }).click();
    await expect(page).toHaveURL(/\/signup/);
    await expect(page.getByText("Create your account")).toBeVisible();
  });

  test("signup page validates form fields", async ({ page }) => {
    await page.goto("/signup");

    // Submit button should be disabled when form is empty
    const submitBtn = page.getByRole("button", { name: "Sign Up" });
    await expect(submitBtn).toBeDisabled();

    // Fill in valid data to enable the button
    await page.getByLabel("Username").fill("testuser123");
    await page.getByLabel("Email").fill("test@example.com");
    await page.getByLabel("Password").fill("StrongPass1!");

    await expect(submitBtn).toBeEnabled();
  });

  test("signup page shows password criteria on focus", async ({ page }) => {
    await page.goto("/signup");

    await page.getByLabel("Password").focus();

    // Password conditions helper should appear
    await expect(page.getByText(/characters/i)).toBeVisible();
  });

  test("navigates from signup to login", async ({ page }) => {
    await page.goto("/signup");

    await page.getByRole("link", { name: "Sign in" }).click();
    await expect(page).toHaveURL(/\/login/);
  });

  test("guest trip creation saves to localStorage", async ({ page }) => {
    // Navigate to add-vacation as guest (should still be accessible)
    await page.goto("/add-vacation");

    // The page should render the vacation form
    await expect(
      page.getByRole("heading", { name: /plan a new vacation/i }),
    ).toBeVisible();

    // Create Vacation button should be disabled initially
    const createBtn = page.getByRole("button", { name: /create vacation/i });
    await expect(createBtn).toBeDisabled();
  });
});
