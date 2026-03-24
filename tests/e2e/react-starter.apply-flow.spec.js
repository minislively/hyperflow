// Generated from TypeScript source by tooling/sync-ts-artifacts.mjs. Do not edit directly.

import { expect, test } from "@playwright/test";
test("react starter opens the editor-first surface at the locale root", async ({ page })=>{
    await page.goto("/ko");
    await expect(page).toHaveURL(/\/ko$/);
    await expect(page.getByRole("heading", {
        name: "바로 만져보는 HyperFlow editor"
    })).toBeVisible();
    await expect(page.getByLabel("HyperFlow 메인 editor")).toBeVisible();
    await expect(page.getByLabel("에디터 미니맵")).toBeVisible();
    await expect(page.getByRole("button", {
        name: "노드 추가"
    })).toBeVisible();
    await expect(page.getByRole("button", {
        name: "선택 삭제"
    })).toBeVisible();
    await expect(page.getByRole("button", {
        name: "맞춤 보기"
    })).toBeVisible();
    await expect(page.locator('nav[aria-label="Learn navigation"]')).toHaveCount(0);
});
test("root and legacy editor routes canonicalize to locale editor", async ({ browser })=>{
    const context = await browser.newContext({
        locale: "en-US"
    });
    const page = await context.newPage();
    await page.goto("/");
    await expect(page).toHaveURL(/\/en$/);
    await expect(page.getByRole("heading", {
        name: "Touch the HyperFlow editor first"
    })).toBeVisible();
    await page.goto("/ko/editor");
    await expect(page).toHaveURL(/\/ko$/);
    await expect(page.getByRole("heading", {
        name: "바로 만져보는 HyperFlow editor"
    })).toBeVisible();
    await context.close();
});
test("main editor lets users add, drag, connect, and delete objects", async ({ page })=>{
    await page.goto("/ko");
    await expect(page.locator("[data-node-card-id='1']")).toBeVisible();
    await page.getByRole("button", {
        name: "노드 추가"
    }).click();
    await expect(page.locator("[data-node-card-id='4']")).toBeVisible();
    const canvasBoxAfterFirstAdd = await page.getByLabel("HyperFlow 메인 editor").boundingBox();
    const nodeFourAfterFirstAdd = await page.locator("[data-node-card-id='4']").boundingBox();
    if (!canvasBoxAfterFirstAdd || !nodeFourAfterFirstAdd) throw new Error("missing canvas or node 4 after first add");
    await page.getByRole("button", {
        name: "저장"
    }).click();
    const firstSnapshotText = await page.locator(".editor-snapshot").textContent();
    if (!firstSnapshotText) throw new Error("missing snapshot text after first add");
    const firstSnapshot = JSON.parse(firstSnapshotText);
    const nodeFourSnapshot = firstSnapshot.nodes.find((node)=>node.id === 4);
    if (!nodeFourSnapshot) throw new Error("missing node 4 in snapshot");
    const nodeFourCenterX = nodeFourAfterFirstAdd.x + nodeFourAfterFirstAdd.width / 2;
    const nodeFourCenterY = nodeFourAfterFirstAdd.y + nodeFourAfterFirstAdd.height / 2;
    const canvasCenterX = canvasBoxAfterFirstAdd.x + canvasBoxAfterFirstAdd.width / 2;
    const canvasCenterY = canvasBoxAfterFirstAdd.y + canvasBoxAfterFirstAdd.height / 2;
    expect(Math.abs(nodeFourCenterX - canvasCenterX)).toBeLessThan(64);
    expect(Math.abs(nodeFourCenterY - canvasCenterY)).toBeLessThan(64);
    expect(nodeFourSnapshot.x).toBeGreaterThanOrEqual(firstSnapshot.viewport.x);
    expect(nodeFourSnapshot.y).toBeGreaterThanOrEqual(firstSnapshot.viewport.y);
    await page.getByRole("button", {
        name: "노드 추가"
    }).click();
    await expect(page.locator("[data-node-card-id='5']")).toBeVisible();
    const canvasBox = await page.getByLabel("HyperFlow 메인 editor").boundingBox();
    const nodeFourBox = await page.locator("[data-node-card-id='4']").boundingBox();
    const nodeFiveBox = await page.locator("[data-node-card-id='5']").boundingBox();
    if (!canvasBox || !nodeFourBox || !nodeFiveBox) throw new Error("new node boxes missing after add");
    const overlaps = nodeFourBox.x < nodeFiveBox.x + nodeFiveBox.width && nodeFourBox.x + nodeFourBox.width > nodeFiveBox.x && nodeFourBox.y < nodeFiveBox.y + nodeFiveBox.height && nodeFourBox.y + nodeFourBox.height > nodeFiveBox.y;
    expect(overlaps).toBeFalsy();
    expect(nodeFourBox.x).toBeGreaterThanOrEqual(canvasBox.x);
    expect(nodeFourBox.y).toBeGreaterThanOrEqual(canvasBox.y);
    expect(nodeFiveBox.x).toBeGreaterThanOrEqual(canvasBox.x);
    expect(nodeFiveBox.y).toBeGreaterThanOrEqual(canvasBox.y);
    expect(nodeFourBox.x + nodeFourBox.width).toBeLessThanOrEqual(canvasBox.x + canvasBox.width);
    expect(nodeFourBox.y + nodeFourBox.height).toBeLessThanOrEqual(canvasBox.y + canvasBox.height);
    expect(nodeFiveBox.x + nodeFiveBox.width).toBeLessThanOrEqual(canvasBox.x + canvasBox.width);
    expect(nodeFiveBox.y + nodeFiveBox.height).toBeLessThanOrEqual(canvasBox.y + canvasBox.height);
    const nodeOne = page.locator("[data-node-card-id='1']");
    const before = await nodeOne.boundingBox();
    if (!before) throw new Error("node 1 missing before drag");
    await page.mouse.move(before.x + before.width / 2, before.y + before.height / 2);
    await page.mouse.down();
    await page.mouse.move(before.x + before.width / 2 + 140, before.y + before.height / 2 + 60, {
        steps: 10
    });
    await page.mouse.up();
    await page.getByRole("button", {
        name: "저장"
    }).click();
    const snapshot = await page.locator(".editor-snapshot").textContent();
    const nodeOnePosition = snapshot?.match(/"id": 1,[\s\S]*?"x":\s*(\d+),[\s\S]*?"y":\s*(\d+)/);
    expect(nodeOnePosition).not.toBeNull();
    expect(Number(nodeOnePosition?.[1] ?? 0)).toBeGreaterThan(120);
    expect(Number(nodeOnePosition?.[2] ?? 0)).toBeGreaterThan(80);
    const primaryEdge = page.locator('.hf-edge-overlay-hit[data-edge-id="edge-a-b"]');
    const primaryEdgeBox = await primaryEdge.boundingBox();
    if (!primaryEdgeBox) throw new Error("edge path missing before reroute");
    await page.mouse.move(primaryEdgeBox.x + primaryEdgeBox.width / 2, primaryEdgeBox.y + primaryEdgeBox.height / 2);
    await page.mouse.down();
    await page.mouse.move(primaryEdgeBox.x + primaryEdgeBox.width / 2 + 56, primaryEdgeBox.y + primaryEdgeBox.height / 2 + 48, {
        steps: 10
    });
    await page.mouse.up();
    await page.getByRole("button", {
        name: "저장"
    }).click();
    await expect(page.locator(".editor-snapshot")).toContainText('"bend"');
    await page.getByRole("button", {
        name: "Connect from node 4"
    }).click();
    await page.getByRole("button", {
        name: "Connect into node 5"
    }).click();
    const newEdge = page.locator('.hf-edge-overlay-hit[data-edge-id="edge-4-5-3"]');
    await expect(newEdge).toHaveCount(1);
    await expect(page.getByText("엣지: 3")).toBeVisible();
    await page.getByRole("button", {
        name: "Connect from node 5"
    }).click();
    await page.getByRole("button", {
        name: "Connect into node 3"
    }).click();
    const secondNewEdge = page.locator('.hf-edge-overlay-hit[data-edge-id="edge-5-3-4"]');
    await expect(secondNewEdge).toHaveCount(1);
    await expect(page.getByText("엣지: 4")).toBeVisible();
    await nodeOne.click();
    await expect(page.getByRole("heading", {
        name: "Node A"
    })).toBeVisible();
    await page.getByRole("button", {
        name: "노드 삭제"
    }).click();
    await expect(nodeOne).toHaveCount(0);
});
test("editor save and restore keeps authoring state together", async ({ page })=>{
    await page.goto("/ko");
    await page.getByRole("button", {
        name: "노드 추가"
    }).click();
    await page.getByRole("button", {
        name: "저장"
    }).click();
    await expect(page.locator(".editor-snapshot")).toContainText('"id": 4');
    await page.locator("[data-node-card-id='4']").click();
    await page.getByRole("button", {
        name: "노드 삭제"
    }).click();
    await expect(page.locator("[data-node-card-id='4']")).toHaveCount(0);
    await page.getByRole("button", {
        name: "복원"
    }).click();
    await expect(page.locator("[data-node-card-id='4']")).toBeVisible();
});
test("main editor keyboard shortcuts clear selection and save snapshots", async ({ page })=>{
    await page.goto("/ko");
    await page.getByLabel("HyperFlow 메인 editor").click({
        position: {
            x: 160,
            y: 120
        }
    });
    await page.keyboard.press("n");
    await expect(page.locator("[data-node-card-id='4']")).toBeVisible();
    await expect(page.getByLabel("제목")).toBeFocused();
    await page.getByLabel("제목").fill("Shortcut Node");
    await page.keyboard.press("Enter");
    await expect(page.getByRole("heading", {
        name: "Shortcut Node"
    })).toBeVisible();
    await page.locator("[data-node-card-id='1']").click();
    await expect(page.getByRole("heading", {
        name: "Node A"
    })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByText("캔버스에서 노드나 엣지를 눌러 선택하면 여기서 현재 상태를 확인할 수 있다.")).toBeVisible();
    await page.keyboard.press("ControlOrMeta+S");
    await expect(page.locator(".editor-snapshot")).toContainText('"nodes"');
    await expect(page.locator(".editor-snapshot")).toContainText('"edges"');
});
test("main editor supports box selection and keyboard delete", async ({ page })=>{
    await page.goto("/ko");
    const nodeOne = page.locator("[data-node-card-id='1']");
    const nodeTwo = page.locator("[data-node-card-id='2']");
    const nodeOneBox = await nodeOne.boundingBox();
    const nodeTwoBox = await nodeTwo.boundingBox();
    if (!nodeOneBox || !nodeTwoBox) throw new Error("node boxes missing for selection test");
    const startX = Math.min(nodeOneBox.x, nodeTwoBox.x) - 24;
    const startY = Math.max(nodeOneBox.y + nodeOneBox.height, nodeTwoBox.y + nodeTwoBox.height) + 28;
    const endX = Math.max(nodeOneBox.x + nodeOneBox.width, nodeTwoBox.x + nodeTwoBox.width) + 24;
    const endY = Math.min(nodeOneBox.y, nodeTwoBox.y) - 18;
    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.mouse.move(endX, endY, {
        steps: 12
    });
    await page.mouse.up();
    await page.keyboard.press("Delete");
    await expect(nodeOne).toHaveCount(0);
    await expect(nodeTwo).toHaveCount(0);
});
test("main editor supports additive multi-select with shift-click", async ({ page })=>{
    await page.goto("/ko");
    const nodeOne = page.locator("[data-node-card-id='1']");
    const nodeTwo = page.locator("[data-node-card-id='2']");
    await nodeOne.click();
    await page.keyboard.down("Shift");
    await nodeTwo.click();
    await page.keyboard.up("Shift");
    await expect(page.getByRole("heading", {
        name: "2 개 노드 선택됨"
    })).toBeVisible();
    await page.keyboard.press("Delete");
    await expect(nodeOne).toHaveCount(0);
    await expect(nodeTwo).toHaveCount(0);
});
test("learn stays available as supporting docs and links back to the editor", async ({ page })=>{
    await page.goto("/ko/learn");
    await expect(page).toHaveURL(/\/ko\/learn$/);
    await expect(page.getByRole("heading", {
        name: "처음 시작하기"
    })).toBeVisible();
    await expect(page.getByRole("button", {
        name: "에디터"
    })).toBeVisible();
    await expect(page.getByRole("navigation", {
        name: "Learn navigation"
    })).toBeVisible();
    await page.getByRole("button", {
        name: "에디터"
    }).click();
    await expect(page).toHaveURL(/\/ko$/);
});
test("learn routes point conceptual pages back to the main editor", async ({ page })=>{
    await page.goto("/ko/learn/nodes-and-edges");
    await expect(page.getByRole("heading", {
        name: "노드와 엣지"
    })).toBeVisible();
    await expect(page.getByRole("button", {
        name: "메인 editor 열기"
    })).toBeVisible();
    await page.getByRole("button", {
        name: "메인 editor 열기"
    }).click();
    await expect(page).toHaveURL(/\/ko$/);
});
test("learn install page still explains the repo-first setup path", async ({ page, browser })=>{
    await page.goto("/ko/learn/installation");
    await expect(page.getByRole("heading", {
        name: "설치하기"
    })).toBeVisible();
    await expect(page.locator(".install-guide .markdown-code-block").first()).toContainText("pnpm install");
    await expect(page.locator(".install-guide .markdown-code-block").first()).toContainText("pnpm run dev:react-starter");
    await expect(page.getByText("http://localhost:5173/ko")).toBeVisible();
    await expect(page.locator(".install-guide-status")).toContainText("@hyperflow/react");
    const context = await browser.newContext({
        locale: "en-US"
    });
    const localePage = await context.newPage();
    await localePage.goto("/learn");
    await expect(localePage).toHaveURL(/\/en\/learn$/);
    await context.close();
});
