import { expect, test } from "@playwright/test";

test("react starter loads the learn quick start surface", async ({ page }) => {
  await page.goto("/ko/learn");

  await expect(page.getByRole("heading", { name: "처음 시작하기" })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Learn navigation" })).toBeVisible();
  await expect(page.getByRole("button", { name: "학습" })).toBeVisible();
  await expect(page.getByRole("button", { name: "레퍼런스" })).toBeVisible();
  await expect(page.getByRole("button", { name: "예제" })).toBeVisible();
  await expect(page.getByRole("button", { name: "로드맵" })).toBeVisible();
  await expect(page.getByRole("button", { name: "왜 HyperFlow가 있나" })).toBeVisible();
  await expect(page.getByRole("button", { name: "설치하기" })).toBeVisible();
  await expect(page.getByRole("button", { name: "노드와 엣지" })).toBeVisible();
  await expect(page.getByRole("button", { name: "선택과 수정" })).toBeVisible();
  await expect(page.getByRole("button", { name: "뷰포트" })).toBeVisible();
  await expect(page.getByRole("button", { name: "기본 상호작용" })).toBeVisible();
  await expect(page.getByRole("button", { name: "저장과 복원" })).toBeVisible();
  await expect(page.getByRole("button", { name: "React 앱에 붙이기" })).toBeVisible();
  await expect(page.getByRole("button", { name: "자주 헷갈리는 점" })).toBeVisible();
  await expect(page.locator(".markdown-page")).toBeVisible();
  await expect(page).toHaveURL(/\/ko\/learn$/);
});

test("installation page exposes copy action for verified setup snippets", async ({ page }) => {
  await page.goto("/ko/learn/installation");

  await expect(page.getByRole("heading", { name: "설치하기" })).toBeVisible();
  await expect(page.getByRole("button", { name: "복사" }).first()).toBeVisible();
  await expect(page.locator(".install-guide .markdown-code-block").first()).toContainText("pnpm install");
  await expect(page.locator(".install-guide .markdown-code-block").first()).toContainText("pnpm run dev:react-starter");
  await expect(page.locator(".install-guide-status")).toContainText("@hyperflow/react");
  await expect(page.locator(".install-guide-status")).toContainText("외부 앱에서 pnpm add @hyperflow/react를 실행하는 단계가 아닙니다.");
  await expect(page.getByText("Docker는 나중에 toolchain 고정용으로 도입할 수 있지만")).toBeVisible();
});

test("learn comparison page renders markdown emphasis and comparison table", async ({ page }) => {
  await page.goto("/ko/learn/when-to-use");

  await expect(page.getByRole("heading", { name: "왜 HyperFlow가 있나" })).toBeVisible();
  await expect(page.locator(".markdown-page strong").first()).toContainText("React Flow로도 노드 UI를 만들 수 있는데, 왜 HyperFlow를 또 만들었지?");
  await expect(page.locator(".markdown-table")).toBeVisible();
  await expect(page.locator(".markdown-table")).toContainText("React Flow");
  await expect(page.locator(".markdown-table")).toContainText("HyperFlow");
});

test("learn nodes and editing pages show visual result previews", async ({ page }) => {
  await page.goto("/ko/learn/nodes-and-edges");

  await expect(page.getByLabel("노드와 엣지 미리보기")).toBeVisible();
  await expect(page.locator(".flow-preview-node--a")).toContainText("Node A");
  await expect(page.locator(".flow-preview-node--b")).toContainText("Node B");
  await expect(page.locator(".flow-preview-node--c")).toContainText("Node C");

  await page.goto("/ko/learn/selection-and-editing");

  await expect(page.getByLabel("선택과 수정 미리보기")).toBeVisible();
  await expect(page.locator(".flow-preview-inspector")).toContainText("Node B");
  await expect(page.locator(".flow-preview-actions")).toContainText("적용");
});

test("learn interaction and restore pages show visual result previews", async ({ page }) => {
  await page.goto("/ko/learn/basic-interactions");

  await expect(page.locator('[aria-label="기본 상호작용 live demo"]')).toBeVisible();
  await expect(page.getByRole("button", { name: "맞춤 보기" })).toBeVisible();
  await expect(page.getByText("노드를 직접 끌어서 옮기고")).toBeVisible();

  const basicCanvas = page.locator(".learn-live-canvas canvas").first();
  const basicBox = await basicCanvas.boundingBox();
  if (!basicBox) throw new Error("basic interactions canvas missing");
  await page.mouse.click(basicBox.x + basicBox.width * 0.5, basicBox.y + basicBox.height * 0.27);
  await expect(page.locator(".learn-live-inspector h3")).toContainText("Node B");

  await page.goto("/ko/learn/save-and-restore");

  await expect(page.locator('[aria-label="저장과 복원 live demo"]')).toBeVisible();
  await expect(page.getByRole("button", { name: "저장", exact: true })).toBeVisible();
  await expect(page.locator(".learn-live-saved")).toContainText("아직 저장된 스냅샷이 없다.");

  const restoreCanvas = page.locator(".learn-live-canvas canvas").first();
  const restoreBox = await restoreCanvas.boundingBox();
  if (!restoreBox) throw new Error("save-and-restore canvas missing");

  await page.mouse.move(restoreBox.x + restoreBox.width * 0.5, restoreBox.y + restoreBox.height * 0.27);
  await page.mouse.down();
  await page.mouse.move(restoreBox.x + restoreBox.width * 0.63, restoreBox.y + restoreBox.height * 0.27, { steps: 8 });
  await page.mouse.up();

  await page.getByRole("button", { name: "저장", exact: true }).click();

  await page.getByRole("button", { name: "Connect from node 1" }).click();
  await page.getByRole("button", { name: "Connect into node 3" }).click();

  await page.getByRole("button", { name: "저장", exact: true }).click();

  const savedSnapshotText = await page.locator(".learn-live-saved pre").textContent();
  if (!savedSnapshotText) throw new Error("saved snapshot text missing");
  const savedSnapshot = JSON.parse(savedSnapshotText) as {
    nodes: Array<{ id: number; title: string; x: number; y: number }>;
    edges: Array<{ source: number; target: number }>;
  };

  expect(savedSnapshot.nodes.find((node) => node.id === 2)?.x).toBeGreaterThan(320);
  expect(savedSnapshot.edges.some((edge) => edge.source === 1 && edge.target === 3)).toBeTruthy();
});

test("learn surface switches section and locale with top-level docs routes", async ({ page }) => {
  await page.goto("/ko/learn");

  await page.getByRole("button", { name: "레퍼런스" }).click();
  await expect(page.getByRole("heading", { name: "API 개요" })).toBeVisible();
  await expect(page).toHaveURL(/\/ko\/reference$/);

  await page.getByRole("button", { name: "런타임 모델" }).click();
  await expect(page.getByText("Rust + WASM core")).toBeVisible();
  await expect(page).toHaveURL(/\/ko\/reference\/runtime-model$/);

  await page.getByRole("button", { name: "English" }).click();
  await expect(page.getByRole("heading", { name: "Runtime Model" })).toBeVisible();
  await expect(page).toHaveURL(/\/en\/reference\/runtime-model$/);

  await page.getByRole("button", { name: "Examples" }).click();
  await expect(page.getByRole("heading", { name: "Examples Overview" })).toBeVisible();
  await expect(page).toHaveURL(/\/en\/examples$/);
});

test("missing locale redirects with browser language detection", async ({ browser }) => {
  const context = await browser.newContext({ locale: "en-US" });
  const page = await context.newPage();

  await page.goto("/learn");
  await expect(page).toHaveURL(/\/en\/learn$/);
  await expect(page.getByRole("heading", { name: "Getting Started" })).toBeVisible();

  await context.close();
});
