import { expect, test } from "@playwright/test";

test("react starter loads a paged learn surface", async ({ page }) => {
  await page.goto("/ko/learn");

  await expect(page.getByRole("heading", { name: "HyperFlow란" })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Learn navigation" })).toBeVisible();
  await expect(page.getByRole("button", { name: "한국어" })).toBeVisible();
  await expect(page.getByRole("button", { name: "English" })).toBeVisible();
  await expect(page.getByRole("button", { name: "HyperFlow란" })).toBeVisible();
  await expect(page.locator(".markdown-page")).toBeVisible();
  await expect(page.locator(".starter-canvas")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Apply" })).toHaveCount(0);
  await expect(page).toHaveURL(/\/ko\/learn$/);
});

test("learn page switches sections and locale with localized paths", async ({ page }) => {
  await page.goto("/ko/learn");

  await page.getByRole("button", { name: "런타임 아키텍처" }).click();
  await expect(page.getByRole("heading", { name: "런타임 아키텍처" })).toBeVisible();
  await expect(page.getByText("Rust + WASM core")).toBeVisible();
  await expect(page).toHaveURL(/\/ko\/reference\/architecture$/);

  await page.getByRole("button", { name: "English" }).click();
  await expect(page.getByRole("heading", { name: "Runtime architecture" })).toBeVisible();
  await expect(page.getByRole("button", { name: "What HyperFlow is" })).toBeVisible();
  await expect(page).toHaveURL(/\/en\/reference\/architecture$/);

  await page.getByRole("button", { name: "Next" }).click();
  await expect(page.getByRole("heading", { name: "Roadmap" })).toBeVisible();
  await expect(page).toHaveURL(/\/en\/roadmap$/);
});

test("missing locale redirects with browser language detection", async ({ browser }) => {
  const context = await browser.newContext({ locale: "en-US" });
  const page = await context.newPage();

  await page.goto("/learn");
  await expect(page).toHaveURL(/\/en\/learn$/);
  await expect(page.getByRole("heading", { name: "What HyperFlow is" })).toBeVisible();

  await context.close();
});
