import { Fragment, useEffect, useMemo, useState } from "react";

type Locale = "ko" | "en";
type SectionId = "learn" | "reference" | "roadmap";
type PageId = "overview" | "current-role" | "validated-slice" | "delivery-layer" | "architecture" | "roadmap";

type PageCopy = {
  navLabel: string;
  title: string;
  markdown: string;
};

type Copy = {
  brand: string;
  topNav: { learn: string; reference: string; roadmap: string };
  lang: { ko: string; en: string };
  sidebar: string;
  pager: { previous: string; next: string };
  pages: Record<PageId, PageCopy>;
};

type Block =
  | { type: "heading"; text: string }
  | { type: "paragraph"; text: string }
  | { type: "bullet-list"; items: string[] }
  | { type: "ordered-list"; items: string[] }
  | { type: "blockquote"; text: string }
  | { type: "code"; text: string };

const locales: Locale[] = ["ko", "en"];
const pageOrder: PageId[] = [
  "overview",
  "current-role",
  "validated-slice",
  "delivery-layer",
  "architecture",
  "roadmap",
];

const pageMeta: Record<PageId, { section: SectionId; slug: string | null }> = {
  overview: { section: "learn", slug: null },
  "current-role": { section: "learn", slug: "current-role" },
  "validated-slice": { section: "learn", slug: "validated-slice" },
  "delivery-layer": { section: "reference", slug: null },
  architecture: { section: "reference", slug: "architecture" },
  roadmap: { section: "roadmap", slug: null },
};

const copyByLocale: Record<Locale, Copy> = {
  ko: {
    brand: "HyperFlow",
    topNav: { learn: "학습", reference: "레퍼런스", roadmap: "로드맵" },
    lang: { ko: "한국어", en: "English" },
    sidebar: "탐색",
    pager: { previous: "이전", next: "다음" },
    pages: {
      overview: {
        navLabel: "HyperFlow란",
        title: "HyperFlow란",
        markdown: `HyperFlow는 완성된 workflow 제품이 아니라, 다른 제품 안에서 workflow/node-editor 경험을 만들기 위한 기반이다.

## 지금 이해해야 할 핵심
- 제품팀이 재사용할 수 있는 검증된 canvas/runtime slice를 제공한다.
- 호스트 앱이 상태와 제품 결정을 계속 소유한다.
- 현재는 basic node editor foundation에서 workflow-builder layer로 확장되는 중이다.

> 지금은 "무엇을 이미 증명했는가"를 정직하게 설명하는 단계다.`,
      },
      "current-role": {
        navLabel: "현재 역할",
        title: "현재 역할",
        markdown: `현재 HyperFlow가 실제로 증명하는 범위는 full workflow builder보다 훨씬 더 좁고 정직하다.

## Today
- validated canvas engine
- viewport handling
- selection
- host-controlled updates

## Not yet
- palette flow
- edge authoring
- templates
- collaboration
- full application shell`,
      },
      "validated-slice": {
        navLabel: "검증된 slice",
        title: "검증된 slice",
        markdown: `현재 repo는 완성형 editor product가 아니라, 한정된 기술 slice를 증명한다.

1. Rust core가 viewport, culling, hit-testing, rendering prep을 담당한다.
2. WASM bindings가 엔진을 TypeScript surface로 연결한다.
3. 얇은 React APIs가 host-controlled state와 selection을 전달한다.
4. 성능 개선은 large-surface responsiveness에 집중되어 있다.`,
      },
      "delivery-layer": {
        navLabel: "React delivery layer",
        title: "React delivery layer",
        markdown: `React layer는 intentionally thin 하다.

- 호스트 앱이 nodes와 selection을 소유한다.
- React layer는 canvas/runtime 위의 얇은 seam만 제공한다.
- 제품별 UI는 이후에 이 레이어 위로 올려야 한다.

Authoring UI를 과장해서 보여주기보다, 현재 가능한 seam을 정직하게 보여주는 것이 우선이다.`,
      },
      architecture: {
        navLabel: "런타임 아키텍처",
        title: "런타임 아키텍처",
        markdown: [
          "HyperFlow는 TypeScript 제품 요구에서 출발했고, 그래프 복잡도가 커지면서 성능에 민감한 부분을 Rust + WASM으로 이동시켰다.",
          "",
          "```text",
          "TypeScript / React surface",
          "↓",
          "Thin SDK seams",
          "↓",
          "Rust + WASM core",
          "```",
          "",
          "이 구조는 기술 과시가 아니라, 제품 요구 때문에 생긴 결과다.",
        ].join("\n"),
      },
      roadmap: {
        navLabel: "로드맵",
        title: "로드맵",
        markdown: `다음 단계는 한 번에 다 가는 것이 아니라, 이해 가능한 레이어 순서대로 쌓는 것이다.

1. 사용자가 즉시 이해할 수 있는 basic node-editor foundation
2. 그 위에 올라가는 workflow-builder semantics
3. 마지막에 custom templates와 domain-specific starter

> workflow builder 커스텀 템플릿은 후속 스코프다.`,
      },
    },
  },
  en: {
    brand: "HyperFlow",
    topNav: { learn: "Learn", reference: "Reference", roadmap: "Roadmap" },
    lang: { ko: "한국어", en: "English" },
    sidebar: "Navigation",
    pager: { previous: "Previous", next: "Next" },
    pages: {
      overview: {
        navLabel: "What HyperFlow is",
        title: "What HyperFlow is",
        markdown: `HyperFlow is not a finished workflow product. It is a foundation for building workflow and node-editor experiences inside other products.

## What matters right now
- It provides a validated canvas/runtime slice for product teams.
- It keeps the host app in control of state and product decisions.
- It is evolving from a basic node-editor foundation toward workflow-builder layers later.

> Right now the priority is to explain only what the repo can already prove.`,
      },
      "current-role": {
        navLabel: "Current role",
        title: "Current role",
        markdown: `The current role of HyperFlow is much narrower and more honest than a full workflow builder.

## Today
- validated canvas engine
- viewport handling
- selection
- host-controlled updates

## Not yet
- palette flow
- edge authoring
- templates
- collaboration
- full application shell`,
      },
      "validated-slice": {
        navLabel: "Validated slice",
        title: "Validated slice",
        markdown: `The current repo proves a bounded technical slice rather than a complete editor product.

1. Rust core for viewport, culling, hit-testing, and rendering prep.
2. WASM bindings that bridge the engine into TypeScript surfaces.
3. Thin React APIs for host-controlled state and selection.
4. Performance work focused on large-surface responsiveness.`,
      },
      "delivery-layer": {
        navLabel: "React delivery layer",
        title: "React delivery layer",
        markdown: `The React layer is intentionally thin.

- Host apps own nodes and selection.
- The React layer exposes thin seams around the canvas/runtime.
- Product-specific UI should be added later on top of this base.

Showing the seam honestly matters more than pretending the final authoring UI is already done.`,
      },
      architecture: {
        navLabel: "Runtime architecture",
        title: "Runtime architecture",
        markdown: [
          "HyperFlow started from TypeScript product needs and moved performance-critical work into Rust + WASM as graph complexity grew.",
          "",
          "```text",
          "TypeScript / React surface",
          "↓",
          "Thin SDK seams",
          "↓",
          "Rust + WASM core",
          "```",
          "",
          "This structure is the consequence of product needs, not a technology gimmick.",
        ].join("\n"),
      },
      roadmap: {
        navLabel: "Roadmap",
        title: "Roadmap",
        markdown: `The next steps should be layered in an order users can understand.

1. A basic node-editor foundation users can understand immediately
2. Workflow-builder semantics layered on top of that foundation
3. Custom templates and domain-specific starters later

> Workflow-builder custom templates are a later scope.`,
      },
    },
  },
};

function detectPreferredLocale(): Locale {
  if (typeof navigator === "undefined") {
    return "ko";
  }

  const candidates = [...(navigator.languages ?? []), navigator.language].filter(Boolean).map((value) => value.toLowerCase());
  return candidates.some((value) => value.startsWith("ko")) ? "ko" : "en";
}

function buildPagePath(locale: Locale, pageId: PageId): string {
  const { section, slug } = pageMeta[pageId];
  if (section === "roadmap") {
    return `/${locale}/roadmap`;
  }
  return slug ? `/${locale}/${section}/${slug}` : `/${locale}/${section}`;
}

function getRouteFromPath(pathname: string): { locale: Locale; pageId: PageId } {
  const segments = pathname.split("/").filter(Boolean);

  let locale: Locale = detectPreferredLocale();
  let sectionIndex = 0;
  if (locales.includes(segments[0] as Locale)) {
    locale = segments[0] as Locale;
    sectionIndex = 1;
  }

  const section = segments[sectionIndex];
  const sub = segments[sectionIndex + 1];

  switch (section) {
    case "learn":
      switch (sub) {
        case undefined:
        case "overview":
          return { locale, pageId: "overview" };
        case "current-role":
          return { locale, pageId: "current-role" };
        case "validated-slice":
          return { locale, pageId: "validated-slice" };
        case "delivery-layer":
          return { locale, pageId: "delivery-layer" };
        case "architecture":
          return { locale, pageId: "architecture" };
        case "roadmap":
          return { locale, pageId: "roadmap" };
        default:
          return { locale, pageId: "overview" };
      }
    case "reference":
      switch (sub) {
        case undefined:
        case "delivery-layer":
          return { locale, pageId: "delivery-layer" };
        case "architecture":
          return { locale, pageId: "architecture" };
        default:
          return { locale, pageId: "delivery-layer" };
      }
    case "roadmap":
      return { locale, pageId: "roadmap" };
    default:
      return { locale, pageId: "overview" };
  }
}

function navigateTo(locale: Locale, pageId: PageId, replace = false) {
  const path = buildPagePath(locale, pageId);
  if (replace) {
    window.history.replaceState(null, "", path);
    return;
  }
  window.history.pushState(null, "", path);
}

function parseMarkdown(markdown: string): Block[] {
  const lines = markdown.trim().split(/\r?\n/);
  const blocks: Block[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i].trimEnd();

    if (!line.trim()) {
      i += 1;
      continue;
    }

    if (line.startsWith("```")) {
      i += 1;
      const codeLines: string[] = [];
      while (i < lines.length && !lines[i].trimStart().startsWith("```")) {
        codeLines.push(lines[i]);
        i += 1;
      }
      i += 1;
      blocks.push({ type: "code", text: codeLines.join("\n") });
      continue;
    }

    if (line.startsWith("## ")) {
      blocks.push({ type: "heading", text: line.slice(3).trim() });
      i += 1;
      continue;
    }

    if (line.startsWith("> ")) {
      blocks.push({ type: "blockquote", text: line.slice(2).trim() });
      i += 1;
      continue;
    }

    if (line.startsWith("- ")) {
      const items: string[] = [];
      while (i < lines.length && lines[i].trimStart().startsWith("- ")) {
        items.push(lines[i].trimStart().slice(2).trim());
        i += 1;
      }
      blocks.push({ type: "bullet-list", items });
      continue;
    }

    if (/^\d+\.\s/.test(line.trimStart())) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s/.test(lines[i].trimStart())) {
        items.push(lines[i].trimStart().replace(/^\d+\.\s/, "").trim());
        i += 1;
      }
      blocks.push({ type: "ordered-list", items });
      continue;
    }

    const paragraphLines: string[] = [line.trim()];
    i += 1;
    while (i < lines.length) {
      const next = lines[i].trim();
      if (!next || next.startsWith("## ") || next.startsWith("> ") || next.startsWith("- ") || /^\d+\.\s/.test(next) || next.startsWith("```")) {
        break;
      }
      paragraphLines.push(next);
      i += 1;
    }
    blocks.push({ type: "paragraph", text: paragraphLines.join(" ") });
  }

  return blocks;
}

function MarkdownPage({ markdown }: { markdown: string }) {
  const blocks = useMemo(() => parseMarkdown(markdown), [markdown]);

  return (
    <div className="markdown-page">
      {blocks.map((block, index) => {
        const key = `${block.type}-${index}`;

        switch (block.type) {
          case "heading":
            return <h3 key={key}>{block.text}</h3>;
          case "paragraph":
            return <p key={key}>{block.text}</p>;
          case "bullet-list":
            return (
              <ul key={key}>
                {block.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            );
          case "ordered-list":
            return (
              <ol key={key}>
                {block.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ol>
            );
          case "blockquote":
            return <blockquote key={key}>{block.text}</blockquote>;
          case "code":
            return (
              <pre key={key} className="markdown-code-block">
                <code>{block.text}</code>
              </pre>
            );
          default:
            return <Fragment key={key} />;
        }
      })}
    </div>
  );
}

export function App() {
  const [route, setRoute] = useState<{ locale: Locale; pageId: PageId }>(() =>
    typeof window === "undefined" ? { locale: "ko", pageId: "overview" } : getRouteFromPath(window.location.pathname),
  );

  useEffect(() => {
    const syncFromLocation = () => {
      const nextRoute = getRouteFromPath(window.location.pathname);
      setRoute(nextRoute);
      const canonical = buildPagePath(nextRoute.locale, nextRoute.pageId);
      if (window.location.pathname !== canonical) {
        navigateTo(nextRoute.locale, nextRoute.pageId, true);
      }
    };

    syncFromLocation();
    window.addEventListener("popstate", syncFromLocation);
    return () => window.removeEventListener("popstate", syncFromLocation);
  }, []);

  const { locale, pageId: currentPage } = route;
  const currentSection = pageMeta[currentPage].section;
  const copy = copyByLocale[locale];
  const currentIndex = pageOrder.indexOf(currentPage);
  const current = copy.pages[currentPage];
  const previousPage = currentIndex > 0 ? pageOrder[currentIndex - 1] : null;
  const nextPage = currentIndex < pageOrder.length - 1 ? pageOrder[currentIndex + 1] : null;

  const goToPage = (pageId: PageId) => {
    setRoute({ locale, pageId });
    navigateTo(locale, pageId);
  };

  const switchLocale = (nextLocale: Locale) => {
    setRoute({ locale: nextLocale, pageId: currentPage });
    navigateTo(nextLocale, currentPage);
  };

  return (
    <main className="learn-shell">
      <header className="learn-topbar">
        <div className="learn-topbar-inner">
          <div className="learn-brand">{copy.brand}</div>
          <div className="learn-topbar-right">
            <nav className="learn-topnav" aria-label="Primary">
              <button type="button" onClick={() => goToPage("overview")} className={currentSection === "learn" ? "is-active" : ""}>
                {copy.topNav.learn}
              </button>
              <button
                type="button"
                onClick={() => goToPage("delivery-layer")}
                className={currentSection === "reference" ? "is-active" : ""}
              >
                {copy.topNav.reference}
              </button>
              <button type="button" onClick={() => goToPage("roadmap")} className={currentSection === "roadmap" ? "is-active" : ""}>
                {copy.topNav.roadmap}
              </button>
            </nav>
            <div className="lang-toggle" aria-label="Language toggle">
              <button type="button" className={locale === "ko" ? "is-active" : ""} onClick={() => switchLocale("ko")}>
                {copy.lang.ko}
              </button>
              <button type="button" className={locale === "en" ? "is-active" : ""} onClick={() => switchLocale("en")}>
                {copy.lang.en}
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="learn-layout">
        <nav className="learn-sidebar" aria-label="Learn navigation">
          <p className="learn-sidebar-title">{copy.sidebar}</p>
          {pageOrder.map((pageId, index) => (
            <button key={pageId} type="button" className={currentPage === pageId ? "is-active" : ""} onClick={() => goToPage(pageId)}>
              <span className="learn-sidebar-index">{String(index + 1).padStart(2, "0")}</span>
              <span>{copy.pages[pageId].navLabel}</span>
            </button>
          ))}
        </nav>

        <article className="learn-content">
          <section className="learn-page-header">
            <p className="learn-eyebrow">{copy.brand}</p>
            <h1>{current.title}</h1>
          </section>

          <MarkdownPage markdown={current.markdown} />

          <div className="learn-pager" aria-label="Pagination">
            <button type="button" disabled={!previousPage} onClick={() => previousPage && goToPage(previousPage)}>
              {copy.pager.previous}
            </button>
            <button type="button" disabled={!nextPage} onClick={() => nextPage && goToPage(nextPage)}>
              {copy.pager.next}
            </button>
          </div>
        </article>
      </div>
    </main>
  );
}
