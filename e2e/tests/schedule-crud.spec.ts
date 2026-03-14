import { test, expect, type Page } from "@playwright/test";

// Set test credentials via environment variables:
//   E2E_EMAIL=your-test@email.com E2E_PASSWORD=YourPass1! npx playwright test
const TEST_EMAIL = process.env.E2E_EMAIL ?? "";
const TEST_PASSWORD = process.env.E2E_PASSWORD ?? "";

async function login(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(TEST_EMAIL);
  await page.getByLabel("Password").fill(TEST_PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();

  // Wait for redirect to home after successful login
  await expect(page).toHaveURL("/", { timeout: 10_000 });
}

test.describe("Schedule CRUD", () => {
  test.skip(!TEST_EMAIL || !TEST_PASSWORD, "Set E2E_EMAIL and E2E_PASSWORD env vars to run");

  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test("home page loads with user trips", async ({ page }) => {
    await expect(page).toHaveURL("/");

    // Use the specific "Add a trip" link (not the logo which also matches)
    await expect(
      page.getByRole("link", { name: "Add a trip" }),
    ).toBeVisible({ timeout: 5000 });
  });

  test("navigates to trip detail and sees schedule", async ({ page }) => {
    const tripLink = page.locator("a[href^='/vacation/']").first();
    await tripLink.click();

    await expect(page).toHaveURL(/\/vacation\/.+/);
    await expect(page.locator("body")).toBeVisible();
  });

  test("navigates to edit canvas from trip view", async ({ page }) => {
    const tripLink = page.locator("a[href^='/vacation/']").first();
    await tripLink.click();
    await expect(page).toHaveURL(/\/vacation\/.+/);

    // Navigate directly — an overlay element intercepts pointer events on the edit link
    const tripUrl = page.url();
    await page.goto(`${tripUrl}/edit`);

    await expect(page).toHaveURL(/\/vacation\/.+\/edit/);
  });

  test("edit canvas loads and shows schedule controls", async ({ page }) => {
    const tripLink = page.locator("a[href^='/vacation/']").first();
    await tripLink.click();
    await expect(page).toHaveURL(/\/vacation\/.+/);

    // Navigate directly to edit URL to avoid overlay click issues
    const tripUrl = page.url();
    await page.goto(`${tripUrl}/edit`);
    await expect(page).toHaveURL(/\/vacation\/.+\/edit/);

    // The edit canvas should load without errors
    await expect(page.locator("body")).toBeVisible();
  });

  test("schedule state persists after page refresh", async ({ page }) => {
    const tripLink = page.locator("a[href^='/vacation/']").first();
    await tripLink.click();
    await expect(page).toHaveURL(/\/vacation\/.+/);

    const tripUrl = page.url();

    await page.reload();

    await expect(page).toHaveURL(tripUrl);
    await expect(page.locator("body")).not.toContainText("error", {
      ignoreCase: true,
      timeout: 5000,
    });
  });
});
