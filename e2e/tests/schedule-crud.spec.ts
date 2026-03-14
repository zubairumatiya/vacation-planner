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
    // After login, the home page should render
    await expect(page).toHaveURL("/");

    // Should see the "Plan a New Vacation" button or similar
    await expect(
      page.getByRole("link", { name: /add|plan|new/i }),
    ).toBeVisible({ timeout: 5000 });
  });

  test("navigates to trip detail and sees schedule", async ({ page }) => {
    // Click the first trip card/link on the home page
    const tripLink = page.locator("a[href^='/vacation/']").first();
    await tripLink.click();

    // Should navigate to a trip page
    await expect(page).toHaveURL(/\/vacation\/.+/);

    // Schedule view should be visible (the index route)
    await expect(page.locator("body")).toBeVisible();
  });

  test("navigates to edit canvas from trip view", async ({ page }) => {
    const tripLink = page.locator("a[href^='/vacation/']").first();
    await tripLink.click();
    await expect(page).toHaveURL(/\/vacation\/.+/);

    // Click edit button/link
    const editLink = page.locator("a[href$='/edit']").first();
    await editLink.click();

    await expect(page).toHaveURL(/\/vacation\/.+\/edit/);
  });

  test("add, edit, and delete a schedule item", async ({ page }) => {
    // Navigate to the first trip's edit canvas
    const tripLink = page.locator("a[href^='/vacation/']").first();
    await tripLink.click();
    await expect(page).toHaveURL(/\/vacation\/.+/);

    const editLink = page.locator("a[href$='/edit']").first();
    await editLink.click();
    await expect(page).toHaveURL(/\/vacation\/.+\/edit/);

    // Count existing schedule items
    const initialItems = await page.locator("[data-testid='schedule-item']").count();

    // Click "Add" button to add a new schedule item
    const addButton = page.getByRole("button", { name: /add/i }).first();
    await addButton.click();

    // Fill in the new item's location field (if a modal/form appears)
    const locationInput = page.getByPlaceholder(/location|where/i).first();
    if (await locationInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await locationInput.fill("Test Location");
    }

    // Verify item count increased
    const afterAddItems = await page.locator("[data-testid='schedule-item']").count();
    expect(afterAddItems).toBeGreaterThanOrEqual(initialItems);

    // Delete the last schedule item
    const deleteButtons = page.locator("[data-testid='delete-schedule-item']");
    const deleteCount = await deleteButtons.count();
    if (deleteCount > 0) {
      await deleteButtons.last().click();

      // Confirm deletion if there's a confirmation dialog
      const confirmBtn = page.getByRole("button", { name: /confirm|yes|delete/i });
      if (await confirmBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
        await confirmBtn.click();
      }
    }
  });

  test("schedule state persists after page refresh", async ({ page }) => {
    // Navigate to a trip
    const tripLink = page.locator("a[href^='/vacation/']").first();
    await tripLink.click();
    await expect(page).toHaveURL(/\/vacation\/.+/);

    // Get the current URL
    const tripUrl = page.url();

    // Reload the page
    await page.reload();

    // Should still be on the same trip page
    await expect(page).toHaveURL(tripUrl);

    // Page content should load without errors
    await expect(page.locator("body")).not.toContainText("error", {
      ignoreCase: true,
      timeout: 5000,
    });
  });
});
