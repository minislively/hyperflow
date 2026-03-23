// Generated from TypeScript source by tooling/sync-ts-artifacts.mjs. Do not edit directly.

import { expect, test } from "@playwright/test";
test("react starter loads the learn quick start surface", async ({ page })=>{
    await page.goto("/ko/learn");
    await expect(page.getByRole("heading", {
        name: "HyperFlow 소개"
    })).toBeVisible();
    await expect(page.getByRole("navigation", {
        name: "Learn navigation"
    })).toBeVisible();
    await expect(page.getByRole("button", {
        name: "학습"
    })).toBeVisible();
    await expect(page.getByRole("button", {
        name: "레퍼런스"
    })).toBeVisible();
    await expect(page.getByRole("button", {
        name: "예제"
    })).toBeVisible();
    await expect(page.getByRole("button", {
        name: "로드맵"
    })).toBeVisible();
    await expect(page.getByRole("button", {
        name: "왜 HyperFlow가 있나"
    })).toBeVisible();
    await expect(page.getByRole("button", {
        name: "설치하기"
    })).toBeVisible();
    await expect(page.getByRole("button", {
        name: "노드와 엣지"
    })).toBeVisible();
    await expect(page.getByRole("button", {
        name: "선택과 수정"
    })).toBeVisible();
    await expect(page.getByRole("button", {
        name: "뷰포트"
    })).toBeVisible();
    await expect(page.getByRole("button", {
        name: "기본 상호작용"
    })).toBeVisible();
    await expect(page.getByRole("button", {
        name: "저장과 복원"
    })).toBeVisible();
    await expect(page.getByRole("button", {
        name: "React 앱에 붙이기"
    })).toBeVisible();
    await expect(page.getByRole("button", {
        name: "자주 헷갈리는 점"
    })).toBeVisible();
    await expect(page.locator(".markdown-page")).toBeVisible();
    await expect(page).toHaveURL(/\/ko\/learn$/);
});
test("installation page exposes copy action for verified setup snippets", async ({ page })=>{
    await page.goto("/ko/learn/installation");
    await expect(page.getByRole("heading", {
        name: "설치하기"
    })).toBeVisible();
    await expect(page.getByRole("button", {
        name: "복사"
    }).first()).toBeVisible();
    await expect(page.locator(".install-guide .markdown-code-block").first()).toContainText("pnpm install");
    await expect(page.locator(".install-guide .markdown-code-block").first()).toContainText("pnpm run dev:react-starter");
    await expect(page.locator(".install-guide .markdown-code-block").nth(1)).toContainText("@hyperflow/react 는 아직 private workspace package 입니다.");
    await expect(page.getByText("Docker는 나중에 toolchain 고정용으로 도입할 수 있지만")).toBeVisible();
});
test("learn comparison page renders markdown emphasis and comparison table", async ({ page })=>{
    await page.goto("/ko/learn/when-to-use");
    await expect(page.getByRole("heading", {
        name: "왜 HyperFlow가 있나"
    })).toBeVisible();
    await expect(page.locator(".markdown-page strong").first()).toContainText("React Flow로도 노드 UI를 만들 수 있는데, 왜 HyperFlow를 또 만들었지?");
    await expect(page.locator(".markdown-table")).toBeVisible();
    await expect(page.locator(".markdown-table")).toContainText("React Flow");
    await expect(page.locator(".markdown-table")).toContainText("HyperFlow");
});
test("learn surface switches section and locale with top-level docs routes", async ({ page })=>{
    await page.goto("/ko/learn");
    await page.getByRole("button", {
        name: "레퍼런스"
    }).click();
    await expect(page.getByRole("heading", {
        name: "API 개요"
    })).toBeVisible();
    await expect(page).toHaveURL(/\/ko\/reference$/);
    await page.getByRole("button", {
        name: "런타임 모델"
    }).click();
    await expect(page.getByText("Rust + WASM core")).toBeVisible();
    await expect(page).toHaveURL(/\/ko\/reference\/runtime-model$/);
    await page.getByRole("button", {
        name: "English"
    }).click();
    await expect(page.getByRole("heading", {
        name: "Runtime Model"
    })).toBeVisible();
    await expect(page).toHaveURL(/\/en\/reference\/runtime-model$/);
    await page.getByRole("button", {
        name: "Examples"
    }).click();
    await expect(page.getByRole("heading", {
        name: "Examples Overview"
    })).toBeVisible();
    await expect(page).toHaveURL(/\/en\/examples$/);
});
test("missing locale redirects with browser language detection", async ({ browser })=>{
    const context = await browser.newContext({
        locale: "en-US"
    });
    const page = await context.newPage();
    await page.goto("/learn");
    await expect(page).toHaveURL(/\/en\/learn$/);
    await expect(page.getByRole("heading", {
        name: "Introduction"
    })).toBeVisible();
    await context.close();
});
