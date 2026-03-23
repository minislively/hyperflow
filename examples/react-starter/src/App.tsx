import { Fragment, useEffect, useMemo, useState } from "react";

type Locale = "ko" | "en";
type SectionId = "learn" | "reference" | "examples" | "roadmap";
type PageId =
  | "quick-start"
  | "installation"
  | "core-concepts"
  | "react-integration"
  | "customization"
  | "layouting"
  | "performance"
  | "troubleshooting"
  | "api-overview"
  | "runtime-model"
  | "viewport-selection"
  | "examples-intro"
  | "minimal-embed"
  | "host-controlled-state"
  | "roadmap";

type PageCopy = {
  navLabel: string;
  title: string;
  markdown: string;
};

type Copy = {
  brand: string;
  topNav: { learn: string; reference: string; examples: string; roadmap: string };
  lang: { ko: string; en: string };
  sidebar: string;
  pager: { previous: string; next: string };
  code: { copy: string; copied: string };
  installationGuide: {
    intro: string;
    workspaceTitle: string;
    workspaceCommands: string[];
    installTitle: string;
    installCommand: string;
    installNote: string;
    packageManagerNote: string;
    dockerNote: string;
  };
  sectionTitles: Record<SectionId, string>;
  pages: Record<PageId, PageCopy>;
};

type Block =
  | { type: "heading"; text: string }
  | { type: "paragraph"; text: string }
  | { type: "bullet-list"; items: string[] }
  | { type: "ordered-list"; items: string[] }
  | { type: "blockquote"; text: string }
  | { type: "code"; text: string };

type InlineSegment =
  | { type: "text"; text: string }
  | { type: "code"; text: string };


const locales: Locale[] = ["ko", "en"];
const sectionOrder: SectionId[] = ["learn", "reference", "examples", "roadmap"];
const sectionPages: Record<SectionId, PageId[]> = {
  learn: ["quick-start", "installation", "core-concepts", "react-integration", "customization", "layouting", "performance", "troubleshooting"],
  reference: ["api-overview", "runtime-model", "viewport-selection"],
  examples: ["examples-intro", "minimal-embed", "host-controlled-state"],
  roadmap: ["roadmap"],
};
const pageMeta: Record<PageId, { section: SectionId; slug: string | null }> = {
  "quick-start": { section: "learn", slug: null },
  installation: { section: "learn", slug: "installation" },
  "core-concepts": { section: "learn", slug: "core-concepts" },
  "react-integration": { section: "learn", slug: "react-integration" },
  customization: { section: "learn", slug: "customization" },
  layouting: { section: "learn", slug: "layouting" },
  performance: { section: "learn", slug: "performance" },
  troubleshooting: { section: "learn", slug: "troubleshooting" },
  "api-overview": { section: "reference", slug: null },
  "runtime-model": { section: "reference", slug: "runtime-model" },
  "viewport-selection": { section: "reference", slug: "viewport-selection" },
  "examples-intro": { section: "examples", slug: null },
  "minimal-embed": { section: "examples", slug: "minimal-embed" },
  "host-controlled-state": { section: "examples", slug: "host-controlled-state" },
  roadmap: { section: "roadmap", slug: null },
};
const topLevelDefaultPage: Record<SectionId, PageId> = {
  learn: "quick-start",
  reference: "api-overview",
  examples: "examples-intro",
  roadmap: "roadmap",
};

const copyByLocale: Record<Locale, Copy> = {
  ko: {
    brand: "HyperFlow",
    topNav: { learn: "학습", reference: "레퍼런스", examples: "예제", roadmap: "로드맵" },
    lang: { ko: "한국어", en: "English" },
    sidebar: "탐색",
    pager: { previous: "이전", next: "다음" },
    code: { copy: "복사", copied: "복사됨" },
    installationGuide: {
      intro: "지금 기준으로는 pnpm workspace 개발 흐름만 검증되어 있다. 먼저 repo를 pnpm으로 설치하고 starter를 띄우는 경로를 기준으로 이해하는 것이 가장 정확하다.",
      workspaceTitle: "검증된 workspace 설치 경로",
      workspaceCommands: ["pnpm install", "pnpm run dev:react-starter"],
      installTitle: "현재 package 상태",
      installCommand: "@hyperflow/react 는 아직 private workspace package 입니다.",
      installNote: "설치만으로 완성형 에디터가 생기지 않는다. 먼저 host app state와 inspector 구조를 직접 올려야 한다.",
      packageManagerNote: "npm / yarn / bun 설치 탭은 React Flow 스타일 참고용이었지만, 현재 repo 기준으로는 실제 지원 상태를 과장하므로 제거했다.",
      dockerNote: "Docker는 나중에 toolchain 고정용으로 도입할 수 있지만, 지금 repo에는 Dockerfile이나 공식 컨테이너 워크플로우가 없다.",
    },
    sectionTitles: {
      learn: "학습",
      reference: "레퍼런스",
      examples: "예제",
      roadmap: "로드맵",
    },
    pages: {
      "quick-start": {
        navLabel: "빠른 시작",
        title: "빠른 시작",
        markdown: `HyperFlow는 프론트엔드 팀이 자기 제품 안에 node-editor와 workflow surface를 넣을 때 사용하는 foundation이다. 완성된 workflow SaaS나 full editor shell로 읽으면 바로 헷갈린다.

## 30초 이해
- host app이 상태를 소유한다.
- HyperFlow는 canvas/runtime seam을 제공한다.
- inspector, toolbar, persistence는 host app이 만든다.
- 현재 repo는 narrow validated slice를 증명한다.

## 프론트엔드 팀 기준 사용 흐름
1. \`@hyperflow/react\`를 설치한다.
2. host app에서 \`nodes\`, \`selection\`, \`viewport\`를 만든다.
3. \`HyperFlowPocCanvas\`에 그 상태를 전달한다.
4. 선택된 node를 읽어 inspector UI를 만든다.
5. 변경은 host state commit으로 반영한다.

## 먼저 확인할 문서
1. 설치 환경
2. 핵심 개념
3. React 연동
4. 커스터마이징
5. 레이아웃
6. 성능
7. 문제 해결`,
      },
      installation: {
        navLabel: "설치 환경",
        title: "설치 환경",
        markdown: `설치는 시작점일 뿐이고, 중요한 건 설치 직후 어떤 mental model로 붙이느냐다.

## 필요한 환경
- Node.js 24 계열
- pnpm workspace
- React 19
- React DOM 19

## 설치 후 바로 해야 할 일
- host app에서 node data와 selection state를 잡는다.
- inspector UI는 직접 만든다.
- HyperFlow는 canvas/runtime seam부터 붙인다.

## 같이 이해해야 할 레이어
- \`@hyperflow/react\`: React-facing seam
- \`@hyperflow/sdk\`: current engine contract
- Rust + WASM core: viewport / culling / hit-test path

## 로컬에서 확인할 경로
- workspace 루트에서 \`pnpm install\`
- 이어서 \`pnpm run dev:react-starter\`
- 브라우저에서 \`http://localhost:5173/ko/learn\`

## 설치 후 기대해야 하는 것
- 설치만으로 full editor shell이 생기지 않는다.
- Learn에서 mental model을 먼저 잡는 게 더 중요하다.
- 지금 starter는 onboarding과 reference를 위한 surface다.`,
      },
      "core-concepts": {
        navLabel: "핵심 개념",
        title: "핵심 개념",
        markdown: `HyperFlow를 읽을 때 가장 먼저 고정해야 하는 mental model은 아래 네 가지다.

## 1. Foundation, not full product
- HyperFlow는 editor product 자체가 아니다.
- host product 안에 들어가는 foundation이다.

## 2. Host-controlled state
- nodes, selection, persistence는 host가 소유한다.
- HyperFlow는 그 상태를 그리는 seam과 runtime path를 제공한다.

## 3. Thin React surface
- React layer는 host app을 대체하지 않는다.
- app shell, form, permissions, persistence는 host 앱 몫이다.

## 4. Narrow validated slice
- viewport
- culling
- selection
- runtime responsiveness

## 실무 체크
- “무엇을 그릴지”는 host가 결정한다.
- “어떻게 빨리 그릴지”는 HyperFlow가 돕는다.
- “완성된 editor UX”는 아직 별도 제품 레이어다.`,
      },
      "react-integration": {
        navLabel: "React 연동",
        title: "React 연동",
        markdown: `프론트엔드 팀은 HyperFlow를 standalone app이 아니라 host app 안에 심는 library로 읽는 게 가장 쉽다.

## 가장 단순한 코드 shape
~~~tsx
import {
  HyperFlowPocCanvas,
  createPocViewport,
  useWorkflowNodesState,
  useWorkflowSelection,
  useSelectedNode,
  updateNodeData,
} from "@hyperflow/react";
~~~

## 사용 순서
1. host app이 \`nodes\`를 만든다.
2. host app이 \`selection\`을 만든다.
3. \`HyperFlowPocCanvas\`에 \`nodes\`, \`viewport\`, \`selectedNodeId\`를 전달한다.
4. inspector는 \`useSelectedNode(...)\`로 현재 노드를 읽는다.
5. 수정은 \`updateNodeData(...)\`로 commit한다.

## 이 패턴이 중요한 이유
- HyperFlow가 form library를 강제하지 않는다.
- HyperFlow가 persistence architecture를 대신하지 않는다.
- React layer는 canvas/runtime 연결이 중심이다.

## 최소 mental model
~~~text
host state
↓
React adapter
↓
runtime-backed canvas
~~~`,
      },
      customization: {
        navLabel: "커스터마이징",
        title: "커스터마이징",
        markdown: `HyperFlow에서 커스터마이징은 “완성된 editor를 테마 변경한다”가 아니라, host app이 필요한 제품 레이어를 직접 올리는 방식이다.

## 지금 가능한 커스터마이징
- host-owned inspector
- host-owned toolbar
- host-owned selection behavior
- package-level custom node renderer seam

## 커스터마이징 예시
~~~tsx
<HyperFlowPocCanvas
  nodes={nodes}
  viewport={viewport}
  selectedNodeId={selection.nodeId}
  onNodeSelect={(nodeId) => onSelectionChange({ nodeId })}
  nodeRenderers={{
    "task-brief": TaskBriefNode,
  }}
  getNodeRendererKey={(node) => (node.id === 1 ? "task-brief" : null)}
/>
~~~

## 아직 아닌 것
- broad palette system
- full node registry platform
- template marketplace style customization

## 실무 해석
- node 모양을 바꾸는 것보다 먼저 state ownership을 설계해야 한다.
- inspector UX는 host app 도메인에 맞춰 따로 설계하는 편이 자연스럽다.
- 현재 seam은 “필요한 만큼 올려붙이는” 방향에 가깝다.`,
      },
      layouting: {
        navLabel: "레이아웃",
        title: "레이아웃",
        markdown: `레이아웃은 많은 프론트엔드 팀이 가장 먼저 묻는 질문이다. 현재 HyperFlow는 complete auto-layout engine을 제공한다고 약속하지 않는다.

## 현재 현실
- node 위치값은 host가 소유한다.
- HyperFlow는 주어진 node positions를 기반으로 viewport / culling / rendering을 수행한다.

## 그래서 실무에서는
- 간단한 고정 layout을 직접 넣거나
- 외부 layout 계산 결과를 nodes에 반영하거나
- host app의 도메인 규칙으로 좌표를 만든다

## mental model
~~~text
host calculates positions
↓
HyperFlow receives nodes with x/y/width/height
↓
runtime computes visibility and hit-test
~~~

## 아직 아닌 것
- complete auto-layout system
- opinionated workflow-template layout engine
- drag authoring complete UX

## 지금 추천하는 접근
1. 고정 fixture 좌표로 시작한다.
2. 필요하면 host app에서 layout 계산을 추가한다.
3. HyperFlow는 rendering / visibility / hit-test 쪽에 집중해서 본다.`,
      },
      performance: {
        navLabel: "성능",
        title: "성능",
        markdown: `성능은 현재 HyperFlow가 가장 명확하게 증명하는 영역 중 하나다. 특히 large-surface viewport responsiveness를 먼저 봐야 한다.

## 현재 집중점
- large-surface viewport responsiveness
- culling
- hit-testing
- Rust + WASM backed runtime path

## 아직 구분해서 봐야 할 것
- 성능이 좋다고 full editor UX가 완성된 것은 아니다.
- runtime strength와 product-shell maturity는 다른 문제다.

## 프론트엔드 팀이 봐야 할 관찰 포인트
- viewport 이동 때 체감 버벅임이 줄어드는가
- visible culling이 runtime path에서 처리되는가
- React shell 문제와 runtime path 문제를 분리해서 볼 수 있는가`,
      },
      troubleshooting: {
        navLabel: "문제 해결",
        title: "문제 해결",
        markdown: `프론트엔드 사용자가 초반에 가장 헷갈리는 지점은 기대치 mismatch다.

## 자주 생기는 오해
- React Flow처럼 모든 authoring 기능이 이미 있는 줄 아는 경우
- workflow builder template이 이미 있는 줄 아는 경우
- React wrapper가 product shell까지 포함한다고 해석하는 경우
- layout engine이 내장되어 있다고 생각하는 경우
- 설치하면 바로 완성된 editor가 나온다고 생각하는 경우

## 지금 기준으로 읽는 법
- Learn: 개념과 현재 역할
- Reference: 현재 seam과 runtime model
- Examples: host app 관점의 최소 사용 예시

## 막힐 때 확인할 질문
1. 이 기능이 현재 validated slice 안에 있나?
2. 이 책임이 host app 쪽인가, HyperFlow 쪽인가?
3. 지금 필요한 것은 shell UX인가, runtime 성능인가?`,
      },
      "api-overview": {
        navLabel: "API 개요",
        title: "API 개요",
        markdown: `Reference는 현재 공개적으로 이해해야 하는 seam만 얇게 설명한다.

## 현재 reference에서 중요한 것
- React delivery layer
- runtime contract
- viewport/selection semantics

## 아직 아닌 것
- extensive authoring API catalogue
- broad component library
- template marketplace style reference`,
      },
      "runtime-model": {
        navLabel: "런타임 모델",
        title: "런타임 모델",
        markdown: `HyperFlow의 핵심 구조는 TypeScript/React surface 위에 Rust + WASM runtime을 둔 형태다.

~~~text
TypeScript / React surface
↓
Thin SDK seams
↓
Rust + WASM core
~~~

이 구조는 기술 과시가 아니라, large graph responsiveness 요구에서 나온 결과다.`,
      },
      "viewport-selection": {
        navLabel: "Viewport와 Selection",
        title: "Viewport와 Selection",
        markdown: `현재 slice를 이해할 때 viewport와 selection은 중요한 seam이다.

- viewport update path
- visible culling
- selection handoff
- host-driven data updates

프론트엔드 팀은 이 부분을 editor shell과 분리해서 생각해야 한다.`,
      },
      "examples-intro": {
        navLabel: "예제 개요",
        title: "예제 개요",
        markdown: `Examples는 React Flow examples처럼 “무엇을 할 수 있는지”를 보여주되, 없는 기능을 가장하지 않아야 한다.

## 지금 예시가 보여줘야 하는 것
- minimal embed
- host-controlled state
- runtime seam 이해

## 나중 예시로 갈 것
- workflow builder shell
- domain-specific starter
- custom template stories`,
      },
      "minimal-embed": {
        navLabel: "최소 임베드",
        title: "최소 임베드",
        markdown: `첫 예시는 화려한 demo보다, 프론트엔드 팀이 가장 빨리 이해할 수 있는 minimal embed가 좋다.

## 핵심 질문
- 기존 React app 안에 어떻게 넣는가?
- host state는 어떻게 유지하는가?
- canvas/runtime layer는 어디까지 맡기는가?`,
      },
      "host-controlled-state": {
        navLabel: "호스트 제어 상태",
        title: "호스트 제어 상태",
        markdown: `HyperFlow examples에서 반복해서 보여줘야 하는 메시지는 host-controlled state다.

- app state ownership stays in the host
- HyperFlow does not replace product state architecture
- integration seams matter more than fake product chrome`,
      },
      roadmap: {
        navLabel: "로드맵",
        title: "로드맵",
        markdown: `다음 단계는 React Flow 같은 이해 가능한 learning path를 만든 뒤에 쌓아야 한다.

1. 프론트엔드 팀이 바로 이해하는 Learn / Reference / Examples structure
2. basic node-editor foundation examples
3. workflow-builder semantics
4. custom templates and domain starters later

> workflow builder custom templates는 여전히 후속 스코프다.`,
      },
    },
  },
  en: {
    brand: "HyperFlow",
    topNav: { learn: "Learn", reference: "Reference", examples: "Examples", roadmap: "Roadmap" },
    lang: { ko: "한국어", en: "English" },
    sidebar: "Navigation",
    pager: { previous: "Previous", next: "Next" },
    code: { copy: "Copy", copied: "Copied" },
    installationGuide: {
      intro: "Today the only verified development flow is the pnpm workspace path. The most accurate way to learn HyperFlow is to install the repo with pnpm and run the starter from there.",
      workspaceTitle: "Verified workspace setup",
      workspaceCommands: ["pnpm install", "pnpm run dev:react-starter"],
      installTitle: "Current package status",
      installCommand: "@hyperflow/react is still a private workspace package.",
      installNote: "Installation does not give you a full editor shell automatically. You still need host-owned state and inspector UI.",
      packageManagerNote: "The npm / yarn / bun tabs matched the React Flow docs pattern, but they overstated actual support for this repo, so they were removed.",
      dockerNote: "Docker could be added later for toolchain pinning, but there is no Dockerfile or official container workflow in this repo today.",
    },
    sectionTitles: {
      learn: "Learn",
      reference: "Reference",
      examples: "Examples",
      roadmap: "Roadmap",
    },
    pages: {
      "quick-start": {
        navLabel: "Quick Start",
        title: "Quick Start",
        markdown: `HyperFlow is a foundation that frontend teams use when they need node-editor and workflow surfaces inside their own products. If you read it as a finished workflow SaaS or full authoring shell, the repo becomes confusing immediately.

## 30-second model
- the host app owns state
- HyperFlow provides canvas/runtime seams
- the host app owns inspector, toolbar, and persistence
- the current repo proves a narrow validated slice

## How frontend teams usually use it
1. install \`@hyperflow/react\`
2. create \`nodes\`, \`selection\`, and \`viewport\` in the host app
3. render \`HyperFlowPocCanvas\`
4. build product-specific UI around that seam

## Suggested reading order
1. Quick Start
2. Installation
3. Core Concepts
4. React Integration
5. Customization
6. Layouting
7. Performance`,
      },
      installation: {
        navLabel: "Installation",
        title: "Installation",
        markdown: `Installation is only the first step. The more important part is how you frame HyperFlow once the package is in your React app.

## Required environment
- Node.js 24 line
- pnpm workspace
- React 19
- React DOM 19

## What to do right after install
- create host-owned node and selection state
- build your own inspector UI
- start by embedding the canvas/runtime seam

## Layers to understand
- \`@hyperflow/react\`: React-facing seam
- \`@hyperflow/sdk\`: current engine contract
- Rust + WASM core: viewport / culling / hit-test path

## Local verification path
- run \`pnpm install\` from the workspace root
- then run \`pnpm run dev:react-starter\`
- open \`http://localhost:5173/en/learn\` in the browser

## What installation does not give you
- it does not generate a full editor shell
- it does not replace host state architecture
- it does not remove the need for product-specific inspector UX`,
      },
      "core-concepts": {
        navLabel: "Core Concepts",
        title: "Core Concepts",
        markdown: `Four ideas matter most when reading HyperFlow docs.

## 1. Foundation, not full product
- HyperFlow is not the editor product itself.
- It is the foundation inside a host product.

## 2. Host-controlled state
- nodes, selection, and persistence stay in the host app
- HyperFlow exposes canvas/runtime seams

## 3. Thin React surface
- the React layer does not replace your app shell
- it stays small on purpose

## 4. Narrow validated slice
- viewport
- culling
- selection
- runtime responsiveness

## Practical check
- the host decides what to render
- HyperFlow helps render and reason about it efficiently
- complete authoring UX is still a separate layer`,
      },
      "react-integration": {
        navLabel: "React Integration",
        title: "React Integration",
        markdown: `Frontend teams should read HyperFlow as something embedded into an existing React app.

## The smallest usage shape
~~~tsx
import {
  HyperFlowPocCanvas,
  createPocViewport,
  useWorkflowNodesState,
  useWorkflowSelection,
  useSelectedNode,
  updateNodeData,
} from "@hyperflow/react";
~~~

## The usual flow
1. the host app creates \`nodes\`
2. the host app creates \`selection\`
3. \`HyperFlowPocCanvas\` receives \`nodes\`, \`viewport\`, and \`selectedNodeId\`
4. an inspector derives the selected node through \`useSelectedNode(...)\`
5. updates commit through \`updateNodeData(...)\`

## Important framing
- HyperFlow does not force a form library
- HyperFlow does not replace persistence architecture
- the React layer is mainly a canvas/runtime connection seam

## Minimal mental model
~~~text
host state
↓
React adapter
↓
runtime-backed canvas
~~~`,
      },
      customization: {
        navLabel: "Customization",
        title: "Customization",
        markdown: `Customization should be understood as host-level product layering, not as a complete built-in editor framework.

## What is customizable today
- host-owned inspector
- host-owned toolbar
- host-owned selection behavior
- package-level custom node renderer seam

## Example
~~~tsx
<HyperFlowPocCanvas
  nodes={nodes}
  viewport={viewport}
  selectedNodeId={selection.nodeId}
  onNodeSelect={(nodeId) => onSelectionChange({ nodeId })}
  nodeRenderers={{
    "task-brief": TaskBriefNode,
  }}
  getNodeRendererKey={(node) => (node.id === 1 ? "task-brief" : null)}
/>
~~~

## What is not here yet
- broad palette systems
- full node registry platforms
- template marketplace style customization

## Practical reading
- design state ownership before styling node chrome
- build the inspector in host space
- use the seams to add only what your product needs`,
      },
      layouting: {
        navLabel: "Layouting",
        title: "Layouting",
        markdown: `Layouting is one of the first questions frontend teams ask. HyperFlow does not currently promise a complete layout engine.

## Current reality
- node positions belong to the host
- HyperFlow renders and computes visibility from the positions it receives

## In practice
- keep a fixed layout for simple cases
- feed positions from an external layout step
- compute coordinates from your domain rules in the host app

## Mental model
~~~text
host calculates positions
↓
HyperFlow receives nodes with x/y/width/height
↓
runtime computes visibility and hit-test
~~~

## Not promised yet
- complete auto-layout
- opinionated workflow-template layout engine
- complete drag-authoring UX

## Recommended approach today
1. start with fixed fixture coordinates
2. add host-side layout calculation if needed
3. evaluate HyperFlow primarily on rendering / visibility / hit-test behavior`,
      },
      performance: {
        navLabel: "Performance",
        title: "Performance",
        markdown: `Performance is one of the clearest things HyperFlow can prove today.

## Current focus
- large-surface viewport responsiveness
- culling
- hit-testing
- Rust + WASM backed runtime paths

## What to separate mentally
- runtime strength does not automatically mean the product shell is mature
- performance maturity and authoring maturity are different layers

## What frontend teams should inspect
- whether viewport movement stays responsive
- whether culling lives in the runtime path
- whether React shell issues are being confused with engine issues`,
      },
      troubleshooting: {
        navLabel: "Troubleshooting",
        title: "Troubleshooting",
        markdown: `The most common early problem is expectation mismatch.

## Common misunderstandings
- assuming HyperFlow already has all React Flow-style authoring features
- assuming workflow builder templates already exist
- assuming the React wrapper includes the full product shell
- assuming a layout engine is already bundled
- assuming installation immediately gives you a full editor

## How to read the docs
- Learn: concepts and current role
- Reference: current seams and runtime model
- Examples: minimal host-app usage

## Questions to ask when blocked
1. is this feature part of the validated slice?
2. does this responsibility belong to the host app or HyperFlow?
3. is the current problem shell UX or runtime behavior?`,
      },
      "api-overview": {
        navLabel: "API Overview",
        title: "API Overview",
        markdown: `Reference should stay narrow and honest.

## What matters now
- React delivery layer
- runtime contract
- viewport and selection semantics

## What it is not yet
- an extensive authoring API catalogue
- a broad component library
- a template marketplace style reference`,
      },
      "runtime-model": {
        navLabel: "Runtime Model",
        title: "Runtime Model",
        markdown: `The core structure places a Rust + WASM runtime under a TypeScript/React surface.

~~~text
TypeScript / React surface
↓
Thin SDK seams
↓
Rust + WASM core
~~~

This is a product-driven structure, not a technology gimmick.`,
      },
      "viewport-selection": {
        navLabel: "Viewport & Selection",
        title: "Viewport & Selection",
        markdown: `Viewport and selection are part of the currently validated slice.

- viewport update path
- visible culling
- selection handoff
- host-driven data updates

Frontend teams should think about these separately from a future authoring shell.`,
      },
      "examples-intro": {
        navLabel: "Examples Overview",
        title: "Examples Overview",
        markdown: `Examples should follow the same honesty rule as the rest of the docs.

## What examples should show now
- minimal embed
- host-controlled state
- runtime seam understanding

## What examples can show later
- workflow builder shell
- domain-specific starters
- custom template stories`,
      },
      "minimal-embed": {
        navLabel: "Minimal Embed",
        title: "Minimal Embed",
        markdown: `The first example should be a minimal embed that frontend teams can understand immediately.

## The core questions
- how does this fit into an existing React app?
- where does host state live?
- what does HyperFlow own versus the host app?`,
      },
      "host-controlled-state": {
        navLabel: "Host-controlled State",
        title: "Host-controlled State",
        markdown: `One message should repeat across examples: host-controlled state.

- app state ownership stays in the host
- HyperFlow does not replace product state architecture
- integration seams matter more than fake product chrome`,
      },
      roadmap: {
        navLabel: "Roadmap",
        title: "Roadmap",
        markdown: `The next steps should be layered after the docs and learning path become understandable.

1. Learn / Reference / Examples structure that frontend teams can navigate immediately
2. basic node-editor foundation examples
3. workflow-builder semantics
4. custom templates and domain starters later

> Workflow-builder custom templates remain later scope.`,
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

  const section = segments[sectionIndex] as SectionId | undefined;
  const sub = segments[sectionIndex + 1];

  switch (section) {
    case "learn":
      switch (sub) {
        case undefined:
        case "quick-start":
          return { locale, pageId: "quick-start" };
        case "installation":
          return { locale, pageId: "installation" };
        case "core-concepts":
          return { locale, pageId: "core-concepts" };
        case "react-integration":
          return { locale, pageId: "react-integration" };
        case "customization":
          return { locale, pageId: "customization" };
        case "layouting":
          return { locale, pageId: "layouting" };
        case "performance":
          return { locale, pageId: "performance" };
        case "troubleshooting":
          return { locale, pageId: "troubleshooting" };
        default:
          return { locale, pageId: "quick-start" };
      }
    case "reference":
      switch (sub) {
        case undefined:
        case "api-overview":
          return { locale, pageId: "api-overview" };
        case "runtime-model":
          return { locale, pageId: "runtime-model" };
        case "viewport-selection":
          return { locale, pageId: "viewport-selection" };
        default:
          return { locale, pageId: "api-overview" };
      }
    case "examples":
      switch (sub) {
        case undefined:
        case "examples-overview":
          return { locale, pageId: "examples-intro" };
        case "minimal-embed":
          return { locale, pageId: "minimal-embed" };
        case "host-controlled-state":
          return { locale, pageId: "host-controlled-state" };
        default:
          return { locale, pageId: "examples-intro" };
      }
    case "roadmap":
      return { locale, pageId: "roadmap" };
    default:
      return { locale, pageId: "quick-start" };
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

    if (line.startsWith("```") || line.startsWith("~~~")) {
      const fence = line.startsWith("```") ? "```" : "~~~";
      i += 1;
      const codeLines: string[] = [];
      while (i < lines.length && !lines[i].trimStart().startsWith(fence)) {
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
      if (!next || next.startsWith("## ") || next.startsWith("> ") || next.startsWith("- ") || /^\d+\.\s/.test(next) || next.startsWith("```") || next.startsWith("~~~")) {
        break;
      }
      paragraphLines.push(next);
      i += 1;
    }
    blocks.push({ type: "paragraph", text: paragraphLines.join(" ") });
  }

  return blocks;
}

async function copyText(text: string) {
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  if (typeof document !== "undefined") {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "absolute";
    textarea.style.left = "-9999px";
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand("copy");
    document.body.removeChild(textarea);
  }
}

function parseInlineSegments(text: string): InlineSegment[] {
  const segments: InlineSegment[] = [];
  const pattern = /`([^`]+)`/g;
  let lastIndex = 0;

  for (const match of text.matchAll(pattern)) {
    const start = match.index ?? 0;
    if (start > lastIndex) {
      segments.push({ type: "text", text: text.slice(lastIndex, start) });
    }
    segments.push({ type: "code", text: match[1] });
    lastIndex = start + match[0].length;
  }

  if (lastIndex < text.length) {
    segments.push({ type: "text", text: text.slice(lastIndex) });
  }

  return segments.length > 0 ? segments : [{ type: "text", text }];
}

function InlineMarkdown({ text }: { text: string }) {
  const segments = useMemo(() => parseInlineSegments(text), [text]);

  return (
    <>
      {segments.map((segment, index) =>
        segment.type === "code" ? (
          <code key={`${segment.type}-${index}`} className="markdown-inline-code">
            {segment.text}
          </code>
        ) : (
          <Fragment key={`${segment.type}-${index}`}>{segment.text}</Fragment>
        ),
      )}
    </>
  );
}

function CommandGuide({ copy, guide }: { copy: Copy["code"]; guide: Copy["installationGuide"] }) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  useEffect(() => {
    if (copiedKey === null) return;
    const timeout = window.setTimeout(() => setCopiedKey(null), 1600);
    return () => window.clearTimeout(timeout);
  }, [copiedKey]);

  async function handleCopy(text: string, key: string) {
    await copyText(text);
    setCopiedKey(key);
  }

  return (
    <section className="install-guide" aria-label="Installation guide">
      <p className="install-guide-intro">
        <InlineMarkdown text={guide.intro} />
      </p>

      <section className="command-card">
        <div className="command-card-header">
          <h3>{guide.workspaceTitle}</h3>
          <button
            type="button"
            className="markdown-copy-button"
            onClick={() => handleCopy(guide.workspaceCommands.join("\n"), "workspace")}
          >
            {copiedKey === "workspace" ? copy.copied : copy.copy}
          </button>
        </div>
        <pre className="markdown-code-block">
          <code>{guide.workspaceCommands.join("\n")}</code>
        </pre>
      </section>

      <section className="command-card">
        <div className="command-card-header">
          <h3>{guide.installTitle}</h3>
          <button
            type="button"
            className="markdown-copy-button"
            onClick={() => handleCopy(guide.installCommand, "package")}
          >
            {copiedKey === "package" ? copy.copied : copy.copy}
          </button>
        </div>
        <pre className="markdown-code-block">
          <code>{guide.installCommand}</code>
        </pre>
      </section>

      <blockquote className="install-guide-note">
        <InlineMarkdown text={guide.installNote} />
      </blockquote>
      <p className="install-guide-meta">{guide.packageManagerNote}</p>
      <p className="install-guide-meta">{guide.dockerNote}</p>
    </section>
  );
}

function MarkdownPage({ markdown, copy }: { markdown: string; copy: Copy["code"] }) {
  const blocks = useMemo(() => parseMarkdown(markdown), [markdown]);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  useEffect(() => {
    setCopiedIndex(null);
  }, [markdown]);

  useEffect(() => {
    if (copiedIndex === null) return;
    const timeout = window.setTimeout(() => setCopiedIndex(null), 1600);
    return () => window.clearTimeout(timeout);
  }, [copiedIndex]);

  return (
    <div className="markdown-page">
      {blocks.map((block, index) => {
        const key = `${block.type}-${index}`;
        switch (block.type) {
          case "heading":
            return (
              <h3 key={key}>
                <InlineMarkdown text={block.text} />
              </h3>
            );
          case "paragraph":
            return (
              <p key={key}>
                <InlineMarkdown text={block.text} />
              </p>
            );
          case "bullet-list":
            return (
              <ul key={key}>
                {block.items.map((item) => (
                  <li key={item}>
                    <InlineMarkdown text={item} />
                  </li>
                ))}
              </ul>
            );
          case "ordered-list":
            return (
              <ol key={key}>
                {block.items.map((item) => (
                  <li key={item}>
                    <InlineMarkdown text={item} />
                  </li>
                ))}
              </ol>
            );
          case "blockquote":
            return (
              <blockquote key={key}>
                <InlineMarkdown text={block.text} />
              </blockquote>
            );
          case "code":
            return (
              <div key={key} className="markdown-code-shell">
                <div className="markdown-code-toolbar">
                  <button
                    type="button"
                    className="markdown-copy-button"
                    onClick={async () => {
                      await copyText(block.text);
                      setCopiedIndex(index);
                    }}
                  >
                    {copiedIndex === index ? copy.copied : copy.copy}
                  </button>
                </div>
                <pre className="markdown-code-block">
                  <code>{block.text}</code>
                </pre>
              </div>
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
    typeof window === "undefined" ? { locale: "ko", pageId: "quick-start" } : getRouteFromPath(window.location.pathname),
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
  const copy = copyByLocale[locale];
  const current = copy.pages[currentPage];
  const currentSection = pageMeta[currentPage].section;
  const visiblePages = sectionPages[currentSection];
  const currentIndex = visiblePages.indexOf(currentPage);
  const previousPage = currentIndex > 0 ? visiblePages[currentIndex - 1] : null;
  const nextPage = currentIndex < visiblePages.length - 1 ? visiblePages[currentIndex + 1] : null;

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
              {sectionOrder.map((sectionId) => (
                <button
                  key={sectionId}
                  type="button"
                  className={currentSection === sectionId ? "is-active" : ""}
                  onClick={() => goToPage(topLevelDefaultPage[sectionId])}
                >
                  {copy.topNav[sectionId]}
                </button>
              ))}
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
          <p className="learn-sidebar-title">{copy.sectionTitles[currentSection]}</p>
          {visiblePages.map((pageId, index) => (
            <button key={pageId} type="button" className={currentPage === pageId ? "is-active" : ""} onClick={() => goToPage(pageId)}>
              <span className="learn-sidebar-index">{String(index + 1).padStart(2, "0")}</span>
              <span>{copy.pages[pageId].navLabel}</span>
            </button>
          ))}
        </nav>

        <article className="learn-content">
          <section className="learn-page-header">
            <p className="learn-eyebrow">{copy.sectionTitles[currentSection]}</p>
            <h1>{current.title}</h1>
          </section>

          {currentPage === "installation" ? <CommandGuide copy={copy.code} guide={copy.installationGuide} /> : null}

          <MarkdownPage markdown={current.markdown} copy={copy.code} />

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
