import { expect, test } from "@playwright/test";

test("react starter opens the editor-first surface at the locale root", async ({ page }) => {
  await page.goto("/ko");

  await expect(page).toHaveURL(/\/ko$/);
  await expect(page.getByRole("heading", { name: "바로 만져보는 HyperFlow editor" })).toBeVisible();
  await expect(page.getByLabel("HyperFlow 메인 editor")).toBeVisible();
  await expect(page.getByLabel("에디터 미니맵")).toBeVisible();
  await expect(page.getByRole("button", { name: "노드 추가" })).toBeVisible();
  await expect(page.getByRole("button", { name: "선택 삭제" })).toBeVisible();
  await expect(page.getByRole("button", { name: "맞춤 보기" })).toBeVisible();
  await expect(page.locator('nav[aria-label="Learn navigation"]')).toHaveCount(0);
});

test("root and legacy editor routes canonicalize to locale editor", async ({ browser }) => {
  const context = await browser.newContext({ locale: "en-US" });
  const page = await context.newPage();

  await page.goto("/");
  await expect(page).toHaveURL(/\/en$/);
  await expect(page.getByRole("heading", { name: "Touch the HyperFlow editor first" })).toBeVisible();

  await page.goto("/ko/editor");
  await expect(page).toHaveURL(/\/ko$/);
  await expect(page.getByRole("heading", { name: "바로 만져보는 HyperFlow editor" })).toBeVisible();

  await context.close();
});

test("main editor lets users add, drag, connect, and delete objects", async ({ page }) => {
  await page.goto("/ko");

  await expect(page.locator("[data-node-card-id='1']")).toBeVisible();

  await page.getByRole("button", { name: "노드 추가" }).click();
  await expect(page.locator("[data-node-card-id='4']")).toBeVisible();

  const nodeOne = page.locator("[data-node-card-id='1']");
  const before = await nodeOne.boundingBox();
  if (!before) throw new Error("node 1 missing before drag");

  await page.mouse.move(before.x + before.width / 2, before.y + before.height / 2);
  await page.mouse.down();
  await page.mouse.move(before.x + before.width / 2 + 140, before.y + before.height / 2 + 60, { steps: 10 });
  await page.mouse.up();

  await page.getByRole("button", { name: "저장" }).click();
  const snapshot = await page.locator(".editor-snapshot").textContent();
  const nodeOnePosition = snapshot?.match(/"id": 1,[\s\S]*?"x":\s*(\d+),[\s\S]*?"y":\s*(\d+)/);
  expect(nodeOnePosition).not.toBeNull();
  expect(Number(nodeOnePosition?.[1] ?? 0)).toBeGreaterThan(120);
  expect(Number(nodeOnePosition?.[2] ?? 0)).toBeGreaterThan(80);

  await page.getByRole("button", { name: "Connect from node 3" }).click();
  await page.getByRole("button", { name: "Connect into node 4" }).click();
  const newEdge = page.locator('.hf-edge-overlay-hit[data-edge-id="edge-3-4-3"]');
  await expect(newEdge).toBeVisible();

  await newEdge.click({ force: true });
  await expect(page.getByRole("heading", { name: "선택된 엣지" })).toBeVisible();
  await page.getByRole("button", { name: "엣지 삭제" }).click();
  await expect(newEdge).toHaveCount(0);

  await nodeOne.click();
  await expect(page.getByRole("heading", { name: "Node A" })).toBeVisible();
  await page.getByRole("button", { name: "노드 삭제" }).click();
  await expect(nodeOne).toHaveCount(0);
});

test("editor save and restore keeps authoring state together", async ({ page }) => {
  await page.goto("/ko");

  await page.getByRole("button", { name: "노드 추가" }).click();
  await page.getByRole("button", { name: "저장" }).click();
  await expect(page.locator(".editor-snapshot")).toContainText('"id": 4');

  await page.locator("[data-node-card-id='4']").click();
  await page.getByRole("button", { name: "노드 삭제" }).click();
  await expect(page.locator("[data-node-card-id='4']")).toHaveCount(0);

  await page.getByRole("button", { name: "복원" }).click();
  await expect(page.locator("[data-node-card-id='4']")).toBeVisible();
});

test("learn stays available as supporting docs and links back to the editor", async ({ page }) => {
  await page.goto("/ko/learn");

  await expect(page).toHaveURL(/\/ko\/learn$/);
  await expect(page.getByRole("heading", { name: "처음 시작하기" })).toBeVisible();
  await expect(page.getByRole("button", { name: "에디터" })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Learn navigation" })).toBeVisible();

  await page.getByRole("button", { name: "에디터" }).click();
  await expect(page).toHaveURL(/\/ko$/);
});

test("learn routes point conceptual pages back to the main editor", async ({ page }) => {
  await page.goto("/ko/learn/nodes-and-edges");

  await expect(page.getByRole("heading", { name: "노드와 엣지" })).toBeVisible();
  await expect(page.getByRole("button", { name: "메인 editor 열기" })).toBeVisible();

  await page.getByRole("button", { name: "메인 editor 열기" }).click();
  await expect(page).toHaveURL(/\/ko$/);
});

test("learn install page still explains the repo-first setup path", async ({ page, browser }) => {
  await page.goto("/ko/learn/installation");

  await expect(page.getByRole("heading", { name: "설치하기" })).toBeVisible();
  await expect(page.locator(".install-guide .markdown-code-block").first()).toContainText("pnpm install");
  await expect(page.locator(".install-guide .markdown-code-block").first()).toContainText("pnpm run dev:react-starter");
  await expect(page.getByText("http://localhost:5173/ko")).toBeVisible();
  await expect(page.locator(".install-guide-status")).toContainText("@hyperflow/react");

  const context = await browser.newContext({ locale: "en-US" });
  const localePage = await context.newPage();
  await localePage.goto("/learn");
  await expect(localePage).toHaveURL(/\/en\/learn$/);
  await context.close();
});
