import { expect, test } from "@playwright/test";

test("react starter loads core UI shell", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "Design agent workflows with connected agents, tools, and review steps" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Agent builder workflow", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Agents, tools, and templates" })).toBeVisible();
  await expect(page.getByText("Workflow inspector")).toBeVisible();
  await expect(page.getByLabel("Foundation proof strip").getByText("Starter surface · bounded proof")).toBeVisible();
  await expect(page.getByRole("button", { name: /Inspect mode/i })).toBeVisible();
});

test("inspector Apply updates selected node title", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("button", { name: /Step 1 Task Brief/i }).click();
  await expect(page.getByRole("heading", { name: "Task Brief form" })).toBeVisible();

  const form = page.locator('form:has-text("Task Brief form")');
  const titleInput = form.getByLabel("Title");
  const updatedTitle = "Task Brief (E2E)";

  await titleInput.fill(updatedTitle);
  await form.getByRole("button", { name: "Apply" }).click();

  await expect(page.locator(".starter-custom-node__title", { hasText: updatedTitle })).toBeVisible();
});
