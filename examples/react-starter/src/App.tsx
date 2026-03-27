import { Fragment, memo, useCallback, useDeferredValue, useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction } from "react";
import {
  buildPocSvgCurvePath,
  HyperFlowPocCanvas,
  type HyperFlowPocNodeRendererProps,
  createPocEngine,
  createPocViewport,
  fitPocViewportToNodes,
  getPocNodeCenter,
  projectPocResolvedEdgeCurve,
  projectPocNodesToRuntimeNodes,
  resolvePocEdgeAnchorsBatch,
  resolvePocRenderableEdgesBatch,
  resolvePocNodeAnchors,
  updateNodeData,
  useWorkflowEdgesState,
  useSelectedNode,
  useWorkflowNodesState,
  useWorkflowSelection,
  type PocEdge,
  type PocEngine,
  type PocMetrics,
  type PocNode,
  type PocResolvedNodeAnchors,
  type PocViewport,
} from "@hyperflow/react";
import {
  editorPerfBaselines,
  evaluatePerfBaseline,
  formatPerfBaselineTarget,
  maxPerfRecentInteractionWindow,
  type EditorInteractionPhase,
  type EditorPerfReadout,
} from "./perf-baseline.js";

type Locale = "ko" | "en";
type SectionId = "learn" | "reference" | "examples" | "roadmap";
type PageId =
  | "what-is-hyperflow"
  | "when-to-use"
  | "installation"
  | "nodes-and-edges"
  | "selection-and-editing"
  | "viewport"
  | "basic-interactions"
  | "save-and-restore"
  | "add-to-react-app"
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

type Route =
  | {
      locale: Locale;
      kind: "editor";
    }
  | {
      locale: Locale;
      kind: "docs";
      pageId: PageId;
    };

type PerfCaptureBridgeWindow = Window & typeof globalThis & {
  __HF_CAPTURE_EDITOR_PERF__?: boolean;
  __HF_EDITOR_PERF_READOUT__?: EditorPerfReadout;
  __HF_EDITOR_PERF_GRAPH_PRESET__?: EditorGraphPreset;
};

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
    packageStatusTitle: string;
    packageStatusLines: string[];
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
  | { type: "table"; headers: string[]; rows: string[][] }
  | { type: "code"; text: string };

type InlineSegment =
  | { type: "text"; text: string }
  | { type: "bold"; text: string }
  | { type: "code"; text: string };

type LearnDemoNode = PocNode<{
  title: string;
  note: string;
}>;

type LearnDemoEdge = PocEdge<"default">;

type EditorGraphPreset = "starter" | "benchmark";


const locales: Locale[] = ["ko", "en"];
const sectionOrder: SectionId[] = ["learn", "reference", "examples", "roadmap"];
const sectionPages: Record<SectionId, PageId[]> = {
  learn: [
    "what-is-hyperflow",
    "installation",
    "when-to-use",
    "nodes-and-edges",
    "selection-and-editing",
    "basic-interactions",
    "viewport",
    "save-and-restore",
    "add-to-react-app",
    "layouting",
    "performance",
    "troubleshooting",
  ],
  reference: ["api-overview", "runtime-model", "viewport-selection"],
  examples: ["examples-intro", "minimal-embed", "host-controlled-state"],
  roadmap: ["roadmap"],
};
const pageMeta: Record<PageId, { section: SectionId; slug: string | null }> = {
  "what-is-hyperflow": { section: "learn", slug: null },
  "when-to-use": { section: "learn", slug: "when-to-use" },
  installation: { section: "learn", slug: "installation" },
  "nodes-and-edges": { section: "learn", slug: "nodes-and-edges" },
  "selection-and-editing": { section: "learn", slug: "selection-and-editing" },
  viewport: { section: "learn", slug: "viewport" },
  "basic-interactions": { section: "learn", slug: "basic-interactions" },
  "save-and-restore": { section: "learn", slug: "save-and-restore" },
  "add-to-react-app": { section: "learn", slug: "add-to-react-app" },
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
  learn: "what-is-hyperflow",
  reference: "api-overview",
  examples: "examples-intro",
  roadmap: "roadmap",
};

const learnDemoCanvas = { width: 720, height: 360 } as const;
const mainEditorCanvas = { width: 1280, height: 720 } as const;

function useCanvasDimensions(initialSize: { width: number; height: number }) {
  const frameRef = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState(initialSize);

  useEffect(() => {
    const element = frameRef.current;
    if (!element) return;

    const update = () => {
      const nextWidth = Math.max(320, Math.round(element.clientWidth));
      const nextHeight = Math.max(320, Math.round(element.clientHeight));
      setSize((current) =>
        current.width === nextWidth && current.height === nextHeight
          ? current
          : { width: nextWidth, height: nextHeight },
      );
    };

    update();
    const resizeObserver = new ResizeObserver(update);
    resizeObserver.observe(element);
    return () => resizeObserver.disconnect();
  }, []);

  return [frameRef, size] as const;
}
const initialLearnDemoNodes: LearnDemoNode[] = [
  {
    id: 1,
    type: "input",
    position: { x: 80, y: 80 },
    size: { width: 180, height: 96 },
    data: { title: "Node A", note: "Start here" },
  },
  {
    id: 2,
    type: "transform",
    position: { x: 320, y: 80 },
    size: { width: 180, height: 96 },
    data: { title: "Node B", note: "Update this node" },
  },
  {
    id: 3,
    type: "output",
    position: { x: 560, y: 80 },
    size: { width: 180, height: 96 },
    data: { title: "Node C", note: "Final output" },
  },
];

const initialLearnDemoEdges: LearnDemoEdge[] = [
  { id: "edge-a-b", source: 1, target: 2, type: "default" },
  { id: "edge-b-c", source: 2, target: 3, type: "default" },
];

function cloneLearnDemoNodes() {
  return initialLearnDemoNodes.map((node) => ({
    ...node,
    position: { ...node.position },
    size: { ...node.size },
    data: { ...node.data },
  }));
}

function cloneLearnDemoEdges() {
  return initialLearnDemoEdges.map((edge) => ({
    ...edge,
    bend: edge.bend ? { ...edge.bend } : edge.bend ?? null,
  }));
}

function createBenchmarkGraph() {
  const rows = 7;
  const columns = 12;
  const nodes: LearnDemoNode[] = [];
  const edges: LearnDemoEdge[] = [];
  const nodeWidth = 180;
  const nodeHeight = 96;
  const stepX = 250;
  const stepY = 154;

  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const nodeId = row * columns + column + 1;
      nodes.push({
        id: nodeId,
        type: column === 0 ? "input" : column === columns - 1 ? "output" : "transform",
        position: { x: 80 + column * stepX, y: 80 + row * stepY },
        size: { width: nodeWidth, height: nodeHeight },
        data: {
          title: `Node ${nodeId}`,
          note: column === 0 ? "Benchmark input" : column === columns - 1 ? "Benchmark output" : "Benchmark step",
        },
      });
    }
  }

  const pushEdge = (source: number, target: number) => {
    edges.push({
      id: `edge-${source}-${target}-${edges.length + 1}`,
      source,
      target,
      type: "default",
      bend: null,
    });
  };

  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns - 1; column += 1) {
      const currentId = row * columns + column + 1;
      const rightId = currentId + 1;
      pushEdge(currentId, rightId);

      if (row < rows - 1 && column % 2 === 0) {
        const lowerRightId = (row + 1) * columns + column + 2;
        pushEdge(currentId, lowerRightId);
      }

      if (row > 0 && column % 3 === 1) {
        const upperRightId = (row - 1) * columns + column + 2;
        pushEdge(currentId, upperRightId);
      }
    }
  }

  return { nodes, edges };
}

function getEditorNodeAnchorPreferences() {
  return {
    preferredInputSide: "left" as const,
    preferredOutputSide: "right" as const,
  };
}

function getNextLearnDemoNodeId(nodes: LearnDemoNode[]) {
  return nodes.reduce((maxId, node) => Math.max(maxId, Number(node.id)), 0) + 1;
}

function createLearnDemoNode(
  nodeId: number,
  options: {
    position?: LearnDemoNode["position"];
    index?: number;
  } = {},
): LearnDemoNode {
  const fallbackIndex = options.index ?? Math.max(nodeId - 1, 0);
  const position = options.position ?? { x: 120 + fallbackIndex * 220, y: 220 };

  return {
    id: nodeId,
    type: "default",
    position,
    size: { width: 180, height: 96 },
    data: {
      title: `Node ${String.fromCharCode(64 + Math.min(nodeId, 26))}`,
      note: "New node",
    },
  };
}

function findNextNodePlacement<TData>(
  nodes: Array<PocNode<TData>>,
  viewport: PocViewport,
  size: PocNode<TData>["size"] = { width: 180, height: 96 },
) {
  const safeScreenPadding = {
    left: 72,
    right: 232,
    top: 56,
    bottom: 152,
  };
  const minX = Math.max(24, viewport.x + safeScreenPadding.left / viewport.zoom);
  const minY = Math.max(24, viewport.y + safeScreenPadding.top / viewport.zoom);
  const maxX = Math.max(minX, viewport.x + viewport.width / viewport.zoom - size.width - safeScreenPadding.right / viewport.zoom);
  const maxY = Math.max(minY, viewport.y + viewport.height / viewport.zoom - size.height - safeScreenPadding.bottom / viewport.zoom);
  const baseX = Math.min(maxX, Math.max(minX, viewport.x + viewport.width / viewport.zoom / 2 - size.width / 2));
  const baseY = Math.min(maxY, Math.max(minY, viewport.y + viewport.height / viewport.zoom / 2 - size.height / 2));
  const stepX = size.width + 84;
  const stepY = size.height + 56;
  const overlapPadding = 28;
  const screenInset = 12;

  const reservedScreenRegions = [
    { left: 12, top: 12, right: 92, bottom: 92 },
    { left: 12, top: viewport.height - 184, right: 376, bottom: viewport.height - 12 },
    { left: viewport.width - 220, top: viewport.height - 156, right: viewport.width - 12, bottom: viewport.height - 12 },
  ];

  const overlapsExistingNode = (position: PocNode<TData>["position"]) =>
    nodes.some((node) => {
      const nextLeft = position.x - overlapPadding;
      const nextTop = position.y - overlapPadding;
      const nextRight = position.x + size.width + overlapPadding;
      const nextBottom = position.y + size.height + overlapPadding;
      const currentLeft = node.position.x;
      const currentTop = node.position.y;
      const currentRight = node.position.x + node.size.width;
      const currentBottom = node.position.y + node.size.height;

      return nextLeft < currentRight && nextRight > currentLeft && nextTop < currentBottom && nextBottom > currentTop;
    });

  const overlapsEditorChrome = (position: PocNode<TData>["position"]) => {
    const screenLeft = (position.x - viewport.x) * viewport.zoom - screenInset;
    const screenTop = (position.y - viewport.y) * viewport.zoom - screenInset;
    const screenRight = screenLeft + size.width * viewport.zoom + screenInset * 2;
    const screenBottom = screenTop + size.height * viewport.zoom + screenInset * 2;

    return reservedScreenRegions.some((region) =>
      screenLeft < region.right && screenRight > region.left && screenTop < region.bottom && screenBottom > region.top,
    );
  };

  const preferredOffsets = [
    { x: 0, y: 0 },
    { x: -stepX, y: 0 },
    { x: 0, y: -stepY },
    { x: 0, y: stepY },
    { x: stepX, y: 0 },
    { x: -stepX, y: -stepY },
    { x: -stepX, y: stepY },
    { x: stepX, y: -stepY },
    { x: stepX, y: stepY },
    { x: -stepX * 2, y: 0 },
    { x: 0, y: -stepY * 2 },
    { x: 0, y: stepY * 2 },
    { x: stepX * 2, y: 0 },
  ];

  for (const offset of preferredOffsets) {
    const candidate = {
      x: Math.min(maxX, Math.max(minX, baseX + offset.x)),
      y: Math.min(maxY, Math.max(minY, baseY + offset.y)),
    };

    if (!overlapsExistingNode(candidate) && !overlapsEditorChrome(candidate)) {
      return candidate;
    }
  }

  for (let radius = 2; radius <= 6; radius += 1) {
    for (let row = -radius; row <= radius; row += 1) {
      for (let column = -radius; column <= radius; column += 1) {
        if (Math.max(Math.abs(column), Math.abs(row)) !== radius) continue;

        const candidate = {
          x: Math.min(maxX, Math.max(minX, baseX + column * stepX)),
          y: Math.min(maxY, Math.max(minY, baseY + row * stepY)),
        };

        if (!overlapsExistingNode(candidate) && !overlapsEditorChrome(candidate)) {
          return candidate;
        }
      }
    }
  }

  return { x: baseX, y: baseY };
}

function applyNodePositionUpdates<TData>(
  setNodes: Dispatch<SetStateAction<Array<PocNode<TData>>>>,
  updates: Array<{ nodeId: number; nextPosition: PocNode<TData>["position"] }>,
) {
  if (updates.length === 0) return;
  const updatesById = new Map(updates.map((update) => [Number(update.nodeId), update.nextPosition]));
  setNodes((current) =>
    current.map((node) => {
      const nextPosition = updatesById.get(Number(node.id));
      if (!nextPosition) return node;
      return {
        ...node,
        position: nextPosition,
      };
    }),
  );
}

function appendLearnDemoEdge(
  current: LearnDemoEdge[],
  sourceNodeId: number,
  targetNodeId: number,
  options: { toggleExisting: boolean },
) {
  const duplicateIndex = current.findIndex(
    (edge) => Number(edge.source) === Number(sourceNodeId) && Number(edge.target) === Number(targetNodeId),
  );
  if (duplicateIndex >= 0) {
    return options.toggleExisting ? current.filter((_, index) => index !== duplicateIndex) : current;
  }

  return [
    ...current,
    {
      id: `edge-${sourceNodeId}-${targetNodeId}-${current.length + 1}`,
      source: sourceNodeId,
      target: targetNodeId,
      type: "default",
      bend: null,
    },
  ];
}

function reconnectLearnDemoEdge(
  current: LearnDemoEdge[],
  edgeId: string,
  next: { sourceNodeId?: number; targetNodeId?: number },
) {
  const existing = current.find((edge) => edge.id === edgeId);
  if (!existing) return current;

  const nextSourceNodeId = Number(next.sourceNodeId ?? existing.source);
  const nextTargetNodeId = Number(next.targetNodeId ?? existing.target);
  if (nextSourceNodeId === Number(existing.source) && nextTargetNodeId === Number(existing.target)) {
    return current;
  }
  if (nextSourceNodeId === nextTargetNodeId) return current;

  return current
    .filter(
      (edge) =>
        edge.id === edgeId ||
        Number(edge.source) !== nextSourceNodeId ||
        Number(edge.target) !== nextTargetNodeId,
    )
    .map((edge) =>
      edge.id === edgeId
        ? {
            ...edge,
            source: nextSourceNodeId,
            target: nextTargetNodeId,
            bend: null,
          }
        : edge,
    );
}

function getEditorRouteLabel(locale: Locale) {
  return locale === "ko" ? "에디터" : "Editor";
}

const copyByLocale: Record<Locale, Copy> = {
  ko: {
    brand: "HyperFlow",
    topNav: { learn: "학습", reference: "레퍼런스", examples: "예제", roadmap: "로드맵" },
    lang: { ko: "한국어", en: "English" },
    sidebar: "탐색",
    pager: { previous: "이전", next: "다음" },
    code: { copy: "복사", copied: "복사됨" },
    installationGuide: {
      intro:
        "지금 이 페이지에서 해야 할 일은 단순하다. **repo root에서 `pnpm install`을 실행하고, 바로 `pnpm run dev:react-starter`로 메인 editor를 여는 것**이 현재 검증된 시작점이다.",
      workspaceTitle: "검증된 workspace 설치 경로",
      workspaceCommands: ["pnpm install", "pnpm run dev:react-starter"],
      packageStatusTitle: "`@hyperflow/react`는 지금 어떤 상태인가",
      packageStatusLines: [
        "`@hyperflow/react`는 아직 private workspace package 입니다.",
        "즉 지금은 외부 앱에서 `pnpm add @hyperflow/react`를 실행하는 단계가 아닙니다.",
        "먼저 이 repo를 로컬에서 실행하고 메인 editor와 Learn 문서로 현재 제공 범위를 이해하는 단계입니다.",
      ],
      installNote:
        "설치 직후에는 locale-aware **메인 editor surface**를 먼저 열어 보는 편이 맞다. Learn은 그 다음에 `/ko/learn`에서 supporting docs로 읽으면 된다.",
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
      "what-is-hyperflow": {
        navLabel: "처음 시작하기",
        title: "처음 시작하기",
        markdown: `HyperFlow Learn의 첫 페이지는 아키텍처 용어보다도 **설치 후 무엇이 보이고, 무엇을 하게 되는지**부터 설명해야 한다.

## HyperFlow를 가장 쉽게 이해하는 방법
HyperFlow는 프론트엔드 팀이 **기존 React 제품 안에 node editor 화면을 넣을 때** 보는 선택지다.

처음에는 이렇게 이해하면 된다.
- 화면에는 node와 edge가 보인다.
- 사용자는 node를 선택하고 움직이고 연결하는 행동을 기대한다.
- 제품 팀은 그 화면을 자기 React 앱 안에 붙여야 한다.

## 설치 후 무엇이 보이나
현재 repo에서 먼저 떠야 하는 것은 localized **메인 editor surface**다. Learn은 그 editor를 읽는 supporting docs로 따라오는 구조가 맞다.

실제로 editor를 붙였을 때 사용자가 기대하는 첫 화면은 보통 이렇다.
- 중앙에 node와 edge가 있는 canvas
- 선택 가능한 node
- pan / zoom / fit 같은 viewport controls
- 필요하면 오른쪽 inspector나 상단 toolbar

## 지금 초보자가 먼저 이해해야 할 것
- HyperFlow는 아직 완성형 editor product가 아니다.
- 대신 React Flow를 비교 기준으로 삼아 basic editor capability를 맞춰 가는 중이다.
- 그래서 Learn도 먼저 **보이는 화면과 상호작용**부터 설명한다.

## 이 문서를 읽는 추천 순서
1. 설치하기
2. 왜 HyperFlow가 있나
3. 노드와 엣지
4. 선택과 수정
5. 기본 상호작용
6. 뷰포트
7. 저장과 복원
8. React 앱에 붙이기
9. 위치와 레이아웃
10. 성능 이해하기
11. 자주 헷갈리는 점`,
      },
      "when-to-use": {
        navLabel: "왜 HyperFlow가 있나",
        title: "왜 HyperFlow가 있나",
        markdown: `HyperFlow를 이해하는 가장 쉬운 방법은 이 질문부터 보는 것이다.

> **"React Flow로도 노드 UI를 만들 수 있는데, 왜 HyperFlow를 또 만들었지?"**

짧게 말하면 이렇다.

- **React Flow는 노드 에디터를 빨리 만드는 데 강하다.**
- **HyperFlow는 기존 서비스 안에서 editor의 상태, 성능, 캔버스 동작을 더 직접 통제하려는 상황에서 나온 쪽이다.**

## React Flow를 쓰다가 답답해지는 순간
- 에디터 상태를 서비스 코드 안에서 계속 직접 다뤄야 할 때
- 캔버스 움직임과 나머지 화면 UI를 나눠서 보고 싶을 때
- 그래프가 커질수록 pan / zoom / selection 반응성이 더 중요해질 때
- 데모용 편집기가 아니라 **제품 안에 들어가는 화면**을 만들고 싶을 때

## 그래서 HyperFlow는 무엇을 먼저 풀려고 했나
HyperFlow는 "예제 많은 완성형 에디터"부터 만든 게 아니다.
먼저 아래 문제를 풀려고 했다.

1. **제품 상태를 앱 코드에서 계속 직접 들고 간다**
2. **화면 UI와 캔버스 동작을 분리해서 본다**
3. **큰 화면에서도 viewport 반응성을 먼저 챙긴다**

즉 HyperFlow는 React Flow를 무조건 대체하려고 나온 게 아니라,
**React Flow로 빠르게 시작한 뒤 더 깊은 제품 구조가 필요해질 때의 다른 출발점**에 가깝다.

## 한 줄 차이
| 질문 | React Flow | HyperFlow |
| --- | --- | --- |
| 무엇에 더 가깝나 | 노드 에디터를 빨리 만드는 툴킷 | 제품 안에 심는 editor foundation |
| 먼저 잘하는 것 | broad authoring UI, examples, interaction 패턴 | 서비스 상태와 캔버스 동작을 더 직접 통제 |
| 잘 맞는 상황 | 범용 편집기를 빨리 시작할 때 | 기존 React 제품 안에 editor 화면을 붙일 때 |
| 지금 기대해야 할 것 | 넓은 authoring 예제 | 더 좁지만 구조적인 기반 |

## 언제 HyperFlow를 보면 되나
- "일단 에디터를 빨리 띄우고 싶다"면 React Flow가 더 자연스럽다.
- "기존 제품 안에서 상태와 성능을 더 직접 통제해야 한다"면 HyperFlow를 볼 이유가 있다.

## React Flow랑 같이 쓰는 건가?
아니다. 기본적으로는 **같이 쓰는 전제가 아니라 비교해서 선택하는 대상**으로 읽는 편이 맞다.

- HyperFlow 안에 React Flow가 들어 있는 것도 아니다.
- React Flow 기능이 HyperFlow 안에 자동으로 따라오는 것도 아니다.
- 둘 다 비슷한 문제를 다른 방식으로 푸는 별도 선택지에 가깝다.
- 나중에 migration 이야기는 할 수 있어도, 현재 문서 기준 기본 가정은 “둘 중 무엇을 기준으로 갈지 고른다”에 더 가깝다.

## 아직 기대하면 안 되는 것
- React Flow 수준의 broad authoring parity
- 설치만으로 바로 완성형 editor shell이 나오는 경험
- ready-made workflow builder template
- built-in auto-layout engine`,
      },
      installation: {
        navLabel: "설치하기",
        title: "설치하기",
        markdown: `설치는 복잡하게 생각할 필요 없다. 지금은 **외부 앱에 패키지를 붙이는 단계가 아니라, 이 repo를 로컬에서 실행하는 단계**다.

## 필요한 환경
- Node.js 24 계열
- pnpm workspace
- React 19
- React DOM 19

## 지금 바로 하는 순서
1. workspace 루트에서 \`pnpm install\`
2. 이어서 \`pnpm run dev:react-starter\`
3. 브라우저에서 \`http://localhost:5173/ko\`

## 설치 후 처음 확인할 것
- 메인 editor가 뜨는가
- 설치 명령이 정상 동작하는가
- 이후 Learn 문서에서 node / edge / interaction 개념을 따라갈 수 있는가

## 여기서 헷갈리면 안 되는 것
- 지금은 외부 앱에서 \`pnpm add @hyperflow/react\`를 하는 단계가 아니다.
- 지금은 repo를 로컬에서 실행해서 Learn과 Examples를 보는 단계다.
- \`@hyperflow/react\`는 아직 private workspace package다.

## 설치가 바로 해주지 않는 것
- 완성형 editor shell을 자동으로 만들어주지는 않는다.
- workflow builder template를 바로 주지는 않는다.
- React Flow 수준의 broad authoring parity를 바로 주지는 않는다.

## 지금 이 페이지의 목적
지금 단계에서 설치는 “기능이 다 된다”를 확인하는 절차가 아니라,
**메인 editor를 먼저 띄우고, Learn 문서를 supporting docs로 따라가는 진입점**에 가깝다.`,
      },
      "nodes-and-edges": {
        navLabel: "노드와 엣지",
        title: "노드와 엣지",
        markdown: `설치 후 editor 화면을 떠올릴 때 가장 먼저 보이는 것은 **박스와 선**이다. 다만 이 페이지의 그림보다 중요한 것은 \`/:locale\` 메인 editor에서 직접 만져보는 경험이다.

## 메인 editor에서 먼저 보이는 것
- canvas 위에 node 박스가 보인다
- node 사이를 잇는 edge가 보인다
- 이 둘이 합쳐져 하나의 flow처럼 읽힌다

## 노드
사용자는 먼저 node를 **화면 위 박스**로 본다. 그 이해부터 시작하면 된다.
그 다음 단계에서, 이 박스가 실제로는 아래처럼 **데이터 한 덩어리**와 연결된다고 이해하면 된다.

~~~ts
{
  id: 1,
  type: "default",
  position: { x: 120, y: 80 },
  size: { width: 180, height: 96 },
  data: { title: "Node A" }
}
~~~

## 엣지
엣지는 두 node 사이를 잇는 선이다.
초보자는 먼저 **"어떤 박스가 어떤 박스와 연결되어 있는가"** 를 화면에서 읽을 수 있으면 된다.
그 다음에야 이 선이 관계 데이터와 이어진다고 생각하면 된다.

## 지금 HyperFlow에서 먼저 이해할 것
- 화면에서는 box와 line이 먼저 보인다.
- 그 아래에는 node/edge 데이터가 있다.
- 실제 조작은 \`/:locale\` 메인 editor에서, 이 Learn 페이지는 supporting docs에서 읽는 편이 맞다.

## 프론트 팀이 실제로 해야 하는 일
- node id와 \`position\` / \`size\`를 만든다.
- edge source / target을 정한다.
- 화면에 보이는 박스와 선이 이 데이터의 시각화라는 점을 이해한다.

## 아직 기대하면 안 되는 것
- React Flow 수준의 broad edge authoring UX
- 설치 직후 바로 완성된 custom node library
- built-in workflow semantics

## 초보자 체크
- "내가 지금 보는 박스는 무엇을 뜻하지?"
- "이 선은 단순 장식이 아니라 실제 연결을 뜻하나?"

이 두 질문을 먼저 구분하면 문서가 훨씬 덜 헷갈린다.`,
      },
      "selection-and-editing": {
        navLabel: "선택과 수정",
        title: "선택과 수정",
        markdown: `초보자가 editor를 처음 만지면 제일 먼저 하는 행동은 결국 두 가지다. **하나를 고르고, 값을 바꾼다.** 이 감각도 메인 editor에서 먼저 느끼고, 이 페이지에서 설명으로 정리하는 순서가 맞다.

1. **선택한다**
2. **수정한다**

## 일반적인 흐름
1. canvas에서 node를 클릭한다.
2. 선택 상태가 화면에 보인다.
3. inspector나 side panel이 열린다.
4. 사용자가 값을 바꾼다.
5. 변경 결과가 다시 화면에 반영된다.

## 왜 이게 중요하나
초보자는 아키텍처보다 먼저 **"클릭하면 무엇이 열리고, 어디서 값을 바꾸는가"** 를 이해해야 한다.

- 선택 시작점: canvas
- 수정 시작점: inspector
- 결과 반영: 다시 node 화면

## React Flow와 닿는 지점
React Flow도 결국 선택과 수정이 핵심이다.
HyperFlow도 초보자 기준에서는 먼저 이 루프를 같은 식으로 이해하는 게 맞다.

## 프론트 팀이 실제로 해야 하는 일
- 클릭 후 어떤 node가 선택됐는지 읽는다.
- inspector를 띄우거나 값을 채운다.
- 변경값을 다시 node 데이터에 반영한다.

## 화면에서는 어떻게 보이나
- 사용자가 node를 클릭하면 선택 상태가 보인다
- inspector나 side panel이 열리거나 값이 채워진다
- 수정 후 다시 node 데이터에 반영된다

## 아직 기대하면 안 되는 것
- 모든 편집 UX가 기본 제공되는 것
- built-in workflow-specific inspector
- form library가 강제되는 것

## 초보자 체크
- 클릭했을 때 선택 결과가 바로 보이나?
- 어디서 값을 바꾸는지 바로 이해되나?
- 수정 후 다시 node에 반영되나?`,
      },
      viewport: {
        navLabel: "뷰포트",
        title: "뷰포트",
        markdown: `React Flow Learn도 viewport를 따로 설명한다. 그만큼 editor를 쓸 때는 **화면이 지금 어디를 보고 있는지**를 이해하는 게 중요하다. 실제 pan/zoom 감각은 메인 editor에서 먼저 확인하는 편이 낫다.

## 뷰포트가 뜻하는 것
- 지금 화면이 어느 좌표 범위를 보고 있는가
- pan / zoom / fit view가 어떻게 움직이는가
- 큰 그래프에서도 반응성이 유지되는가

## 사용자는 화면에서 어떻게 느끼나
- 드래그하면 캔버스가 움직인다
- 스크롤하거나 제스처를 쓰면 확대/축소된다
- fit view를 누르면 전체 흐름이 다시 보인다

## 왜 HyperFlow에서 더 중요하게 보나
HyperFlow는 바로 이 지점에서 강점을 만들려고 시작했다.
특히 문서에서 계속 말하는 culling, hit-test, responsiveness는 대부분 viewport 경험과 연결된다.

## 프론트 팀이 실제로 해야 하는 일
- pan / zoom / fit을 어떤 방식으로 노출할지 정한다.
- viewport 저장이 필요한지 판단한다.
- 버벅임이 UI 문제인지 canvas/runtime 문제인지 분리해서 본다.

## 아직 기대하면 안 되는 것
- viewport만 좋으면 editor parity가 끝난다는 생각
- product-shell maturity와 runtime maturity를 같은 문제로 보는 것

## 초보자 기준 관찰 포인트
- pan 할 때 버벅이지 않는가
- zoom 해도 선택과 hit-test가 어긋나지 않는가
- 큰 surface에서도 필요한 것만 그리는가

## 쉬운 해석
뷰포트는 그냥 "카메라"라고 생각하면 된다.
HyperFlow는 이 카메라가 큰 화면에서도 덜 버벅이도록 runtime 쪽을 더 강하게 본다.`,
      },
      "basic-interactions": {
        navLabel: "기본 상호작용",
        title: "기본 상호작용",
        markdown: `React Flow를 대체할 수 있다고 말하려면, 먼저 사용자가 익숙하게 생각하는 editor 행동이 되는지부터 보여줘야 한다.

## 사용자가 먼저 기대하는 것
- node 추가
- node 선택
- node 이동
- edge 연결
- 값 수정
- 삭제
- 저장 후 다시 열기

## 지금 문서에서 중요한 포인트
현재 HyperFlow는 이 전체를 이미 완성했다고 주장하면 안 된다.
대신 **이 상호작용 목록이 앞으로 맞춰야 하는 기준선**이라는 걸 먼저 이해하는 게 중요하다.

## 설치 직후 사용자가 궁금해하는 것
- node를 직접 움직일 수 있나?
- edge를 연결할 수 있나?
- 선택한 결과가 바로 화면에 보이나?
- 저장하고 다시 열 수 있나?

## 왜 이 목록이 중요하나
사용자는 “이걸로 뭘 할 수 있지?”보다,
“내가 아는 node editor처럼 기본 행동이 되나?”를 먼저 본다.
그래서 이 목록이 HyperFlow의 learn path에서도 앞에 와야 한다.

## React Flow parity v1 체크리스트
| 기능 | 왜 중요한가 |
| --- | --- |
| 노드 렌더링 | 그래프 데이터를 바로 볼 수 있어야 한다 |
| 엣지 렌더링 | 관계를 화면에서 이해할 수 있어야 한다 |
| 노드 선택 | 거의 모든 편집 흐름의 시작점이다 |
| 노드 이동 | 사용자는 직접 조작을 기대한다 |
| 노드 연결 | 기본 authoring 동작으로 여겨진다 |
| 뷰포트 pan / zoom / fit | 큰 surface에서는 필수다 |
| 저장 / 복원 | 데모와 실제 제품을 가르는 기준이다 |

## 현재 읽는 법
- 이 표는 "이미 다 된다"는 뜻이 아니다.
- 이 표는 "HyperFlow가 다음에 맞춰야 하는 최소선"에 가깝다.
- 초보자는 여기서 지금 되는 것과 아직 안 되는 것을 같이 읽어야 한다.

## 지금 데모에서 먼저 해볼 것
- 캔버스 안의 **노드 추가** 버튼으로 viewport 중심에 새 node를 넣어 본다
- node를 직접 잡아서 움직여 본다
- 빈 공간을 움직여서 화면을 pan 해본다
- 오른쪽 점을 누르고 다른 node의 왼쪽 점을 눌러 edge 연결을 만들어 본다
- node나 edge를 선택한 뒤 **선택 삭제**로 지워 본다

## 이 페이지가 증명하려는 것
- HyperFlow도 이제 "직접 만져보는 기본 editor 조작"을 Learn 안에서 보여줄 수 있다는 점
- 하지만 이것이 곧 broad React Flow parity를 의미하지는 않는다는 점

## 실무 체크리스트
- 선택은 되는가
- 이동은 되는가
- 연결은 되는가
- 수정이 다시 반영되는가
- 저장/복원이 가능한가
- 지금 데모에서 무엇이 되고, 아직 무엇이 안 되는지 문서가 솔직한가

이 다섯 가지가 beginner에게는 가장 현실적인 기준이다.`,
      },
      "save-and-restore": {
        navLabel: "저장과 복원",
        title: "저장과 복원",
        markdown: `node editor를 실제 제품에 넣으려면 결국 저장과 복원이 필요하다.

## 왜 중요한가
- 사용자는 만든 화면을 다시 열 수 있어야 한다.
- 제품 팀은 node / edge / viewport를 persistence와 연결해야 한다.
- 여기서부터 단순 데모와 실제 제품의 차이가 커진다.

## 화면 기준으로 보면
- 오늘 편집한 흐름을 내일 다시 열 수 있어야 한다.
- 다시 열었을 때 node 위치와 연결이 그대로 있어야 한다.
- 가능하면 같은 확대 상태나 보고 있던 위치도 돌아오는 편이 좋다.

## 초보자 기준 mental model
저장 대상은 보통 세 덩어리다.

1. nodes
2. edges
3. viewport

## HyperFlow 쪽에서 먼저 봐야 하는 것
- 저장 포맷에 nodes / edges / viewport가 같이 들어가는가
- 복원 후 화면이 일관되게 돌아오는가
- selection과 inspector가 어색하게 꼬이지 않는가

## 프론트 팀이 실제로 해야 하는 일
- nodes / edges / viewport를 어떤 저장 포맷으로 둘지 정한다.
- autosave인지, 명시적 저장인지 정한다.
- restore 후 어떤 화면 상태까지 되돌릴지 정한다.

## 쉬운 결론
저장과 복원은 부가 기능이 아니라,
**"이게 진짜 제품 안에 들어가나"를 보여주는 핵심 개념**이다.`,
      },
      "add-to-react-app": {
        navLabel: "React 앱에 붙이기",
        title: "React 앱에 붙이기",
        markdown: `이 페이지는 어려운 내부 구조 설명보다, **기존 React 앱에 HyperFlow를 어떤 순서로 붙이는지**를 코드로 이해하기 위한 페이지다.

## 최소 코드 shape
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

## 가장 짧은 사용 예시
~~~tsx
import { useState } from "react";
import {
  HyperFlowPocCanvas,
  createPocViewport,
  updateNodeData,
  useSelectedNode,
  useWorkflowNodesState,
  useWorkflowSelection,
  type PocNode,
} from "@hyperflow/react";

const initialNodes: PocNode[] = [
  {
    id: 1,
    type: "default",
    position: { x: 80, y: 80 },
    size: { width: 180, height: 96 },
    data: { title: "Node A" },
  },
  {
    id: 2,
    type: "default",
    position: { x: 360, y: 80 },
    size: { width: 180, height: 96 },
    data: { title: "Node B" },
  },
];

export function Example() {
  const [nodes, setNodes] = useWorkflowNodesState(initialNodes);
  const [selection, , onSelectionChange] = useWorkflowSelection({ nodeId: null });
  const selectedNode = useSelectedNode({ nodes, selection });
  const [viewport] = useState(() => createPocViewport(0, 0, 1));

  function renameSelectedNode() {
    if (!selectedNode) return;

    updateNodeData(setNodes, selectedNode.id, (node) => ({
      data: { ...node.data, title: "Renamed node" },
    }));
  }

  return (
    <>
      <HyperFlowPocCanvas
        nodes={nodes}
        viewport={viewport}
        selectedNodeId={selection.nodeId}
        onNodeSelect={(nodeId) => onSelectionChange({ nodeId })}
      />

      <button type="button" onClick={renameSelectedNode} disabled={!selectedNode}>
        Rename selected node
      </button>
    </>
  );
}
~~~

## 이 코드를 보면 바로 이해해야 하는 것
- \`nodes\`는 React state로 들고 있다.
- canvas는 \`HyperFlowPocCanvas\`가 렌더링한다.
- 클릭으로 선택된 node id를 읽는다.
- 수정은 \`updateNodeData(...)\`로 다시 반영한다.

## 보통 붙이는 순서
1. React state에 nodes를 둔다.
2. selection state를 만든다.
3. viewport를 만든다.
4. canvas에 넘긴다.
5. selected node를 읽는다.
6. 버튼이나 inspector에서 값을 바꾼다.
7. \`updateNodeData(...)\`로 commit한다.

## 중요한 점
- HyperFlow는 form library를 강제하지 않는다.
- 저장은 여전히 네 앱 쪽에서 정해야 한다.
- 지금 React layer는 "canvas를 붙이는 시작점" 정도로 이해하면 충분하다.`,
      },
      layouting: {
        navLabel: "위치와 레이아웃",
        title: "위치와 레이아웃",
        markdown: `레이아웃은 많은 프론트엔드 팀이 가장 먼저 묻는 질문이다. 현재 HyperFlow는 complete auto-layout engine을 제공한다고 약속하지 않는다.

## 현재 현실
- node의 \`position\`과 \`size\`는 host가 소유한다.
- HyperFlow는 editor-friendly node를 받은 뒤 runtime geometry로 projection해서 viewport / culling / rendering을 수행한다.

## 그래서 실무에서는
- 간단한 고정 layout을 직접 넣거나
- 외부 layout 계산 결과를 nodes에 반영하거나
- host app의 도메인 규칙으로 좌표를 만든다

## mental model
~~~text
host calculates positions
↓
HyperFlow receives nodes with position/size
↓
projects them to runtime x/y/width/height
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
        navLabel: "성능 이해하기",
        title: "성능 이해하기",
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
        navLabel: "자주 헷갈리는 점",
        title: "자주 헷갈리는 점",
        markdown: `초보자가 가장 먼저 막히는 이유는 기대치가 어긋나기 때문이다.

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
- canvas/runtime layer는 어디까지 맡기는가?

## 가장 작은 예시
~~~tsx
import { useState } from "react";
import {
  HyperFlowPocCanvas,
  createPocViewport,
  useWorkflowNodesState,
  useWorkflowSelection,
  type PocNode,
} from "@hyperflow/react";

const nodes: PocNode[] = [
  {
    id: 1,
    type: "default",
    position: { x: 64, y: 64 },
    size: { width: 180, height: 96 },
    data: { title: "Node A" },
  },
];

export function MinimalEmbed() {
  const [workflowNodes] = useWorkflowNodesState(nodes);
  const [selection, , onSelectionChange] = useWorkflowSelection({ nodeId: null });
  const [viewport] = useState(() => createPocViewport(0, 0, 1));

  return (
    <HyperFlowPocCanvas
      nodes={workflowNodes}
      viewport={viewport}
      selectedNodeId={selection.nodeId}
      onNodeSelect={(nodeId) => onSelectionChange({ nodeId })}
    />
  );
}
~~~

## 이 예시의 의미
- canvas를 띄우는 데 필요한 최소 shape만 남겼다.
- node 추가/선택 흐름을 React state와 연결하는 법을 보여준다.
- inspector 없이도 먼저 canvas seam을 이해할 수 있다.`,
      },
      "host-controlled-state": {
        navLabel: "호스트 제어 상태",
        title: "호스트 제어 상태",
        markdown: `HyperFlow examples에서 반복해서 보여줘야 하는 메시지는 host-controlled state다.

- app state ownership stays in the host
- HyperFlow does not replace product state architecture
- integration seams matter more than fake product chrome

## 상태를 직접 쥐는 예시
~~~tsx
const [nodes, setNodes] = useWorkflowNodesState(initialNodes);
const [selection, , onSelectionChange] = useWorkflowSelection({ nodeId: null });
const selectedNode = useSelectedNode({ nodes, selection });

function renameSelectedNode(nextTitle: string) {
  if (!selectedNode) return;

  updateNodeData(setNodes, selectedNode.id, (node) => ({
    data: { ...node.data, title: nextTitle },
  }));
}
~~~

## 이 페이지에서 먼저 봐야 할 것
- 선택 상태도 React 쪽에서 들고 있다.
- 수정 반영도 React state update로 끝난다.
- HyperFlow가 제품 상태 구조를 대신 가져가지는 않는다.`,
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
      intro:
        "Do not overthink installation yet. **The verified starting point today is to run `pnpm install` at the repo root and then `pnpm run dev:react-starter` to open the main editor**.",
      workspaceTitle: "Verified workspace setup",
      workspaceCommands: ["pnpm install", "pnpm run dev:react-starter"],
      packageStatusTitle: "What is the current state of `@hyperflow/react`?",
      packageStatusLines: [
        "`@hyperflow/react` is still a private workspace package.",
        "That means this is not yet the stage where you run `pnpm add @hyperflow/react` in an external app.",
        "First you run this repo locally and use the main editor plus Learn docs to understand the current surface.",
      ],
      installNote:
        "Right after setup, it is better to open the locale-aware **main editor surface** first. Learn comes next as supporting docs at `/en/learn`.",
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
      "what-is-hyperflow": {
        navLabel: "Getting Started",
        title: "Getting Started",
        markdown: `The first Learn page should not start with architecture jargon. It should start with **what you see after setup and what kind of editor experience HyperFlow is trying to support**.

## The easiest way to understand HyperFlow
HyperFlow is something a frontend team evaluates when they want to **put a node-editor screen inside an existing React product**.

At the beginning, you can think of it like this.
- there are nodes and edges on a canvas
- users expect to select, move, and connect nodes
- the product team still has to fit that editor into a real React app

## What you see after setup
Today the repo should open a localized **main editor surface** first. Learn follows as supporting docs for understanding what that editor is doing.

When HyperFlow is embedded into a real editor surface, the first screen people usually expect looks like this.
- a central canvas with nodes and edges
- selectable nodes
- viewport controls like pan / zoom / fit
- sometimes a right inspector or top toolbar

## What beginners should understand first
- HyperFlow is not a finished editor product yet.
- It is currently moving toward a React Flow-like baseline for basic editor capabilities.
- That is why Learn now explains the visible screen and interactions before deeper integration details.

## Suggested reading order
1. Installation
2. Why HyperFlow Exists
3. Nodes and Edges
4. Selection and Editing
5. Basic Interactions
6. The Viewport
7. Save and Restore
8. Add to a React App
9. Layout and Positioning
10. Understand Performance
11. Common Confusion`,
      },
      "when-to-use": {
        navLabel: "Why HyperFlow Exists",
        title: "Why HyperFlow Exists",
        markdown: `The easiest way to understand HyperFlow is to start with this question.

> **"If React Flow already exists, why build HyperFlow at all?"**

The short answer is this.

- **React Flow is strong when you want to build a node editor quickly.**
- **HyperFlow comes from the point where a team needs more direct control over editor state, performance, and canvas behavior inside an existing product.**

## Where React Flow starts to feel limiting
- your service code has to keep handling editor state directly
- you want a clearer separation between canvas behavior and the rest of the UI
- pan / zoom / selection responsiveness matters more as graphs grow
- you are building a product surface, not just a demo editor

## So what was HyperFlow built to solve first
HyperFlow did not start by chasing a "finished editor with lots of examples".
It started by focusing on three things first.

1. **the product state stays in your app code**
2. **screen UI and canvas behavior are treated as separate layers**
3. **viewport responsiveness is handled early for larger surfaces**

So HyperFlow is not "React Flow, but better".
It is closer to **a different starting point for teams that outgrow the easy editor-first path and need a more embedded product structure.**

## One-line difference
| Question | React Flow | HyperFlow |
| --- | --- | --- |
| What is it closer to? | a toolkit for building node editors quickly | an editor foundation embedded inside a product |
| What does it do first? | broad authoring UI, examples, interaction patterns | more direct control over service state and canvas behavior |
| When is it a better fit? | when you want to start a general editor quickly | when you need to place an editor screen inside an existing React app |
| What should you expect today? | broad authoring examples | a narrower but more structural foundation |

## When to look at HyperFlow
- If you mainly want to get an editor on screen quickly, React Flow is the more natural starting point.
- If you need tighter control over state, structure, and responsiveness inside a larger product, HyperFlow is worth evaluating.

## Do you use it together with React Flow?
Not as a default assumption. It is more accurate to read them as **alternative choices you compare**, not as a bundle.

- HyperFlow does not contain React Flow internally.
- React Flow features do not automatically appear inside HyperFlow.
- They are closer to separate approaches to a similar problem.
- You can talk about migration later, but the current docs should be read as “choose your base approach first.”

## What not to assume yet
- broad authoring parity with React Flow
- a finished editor shell after install
- ready-made workflow-builder templates
- a built-in auto-layout engine`,
      },
      installation: {
        navLabel: "Installation",
        title: "Installation",
        markdown: `Do not overthink installation yet. The first step is simply to **run this repo locally and open the main editor**.

## Required environment
- Node.js 24 line
- pnpm workspace
- React 19
- React DOM 19

## What you actually do today
1. run \`pnpm install\` from the workspace root
2. run \`pnpm run dev:react-starter\`
3. open \`http://localhost:5173/en\`

## What to verify right after setup
- the main editor loads
- the setup commands succeed
- you can continue into Learn docs for nodes / edges / interaction concepts

## What you should not confuse here
- this is not yet a package-install guide for an external app
- this is a local repo setup guide
- \`@hyperflow/react\` is still a private workspace package

## What installation does not give you yet
- a finished editor shell
- ready-made workflow templates
- broad React Flow-style authoring parity

## The purpose of installation today
At this stage installation is not the moment where everything becomes interactive.
It is the moment where you open the main editor first, then use Learn as the supporting reading path for what HyperFlow is trying to become.`,
      },
      "nodes-and-edges": {
        navLabel: "Nodes and Edges",
        title: "Nodes and Edges",
        markdown: `After setup, the first things people expect to see in an editor are **boxes and lines**. But the more important step is to touch them in the \`/:locale\` main editor, not just stare at a mini doc preview.

## What appears in the main editor first
- node boxes on a canvas
- edges connecting those boxes
- a flow that looks understandable at a glance

## Nodes
Users first understand a node as **a box on screen**. Start there.
Then add the second layer: that box is backed by a **piece of data** that usually looks like this.

~~~ts
{
  id: 1,
  type: "default",
  position: { x: 120, y: 80 },
  size: { width: 180, height: 96 },
  data: { title: "Node A" }
}
~~~

## Edges
An edge is the line between two nodes.
For beginners, the first useful question is simply **"which box connects to which box?"**
Only after that does it help to think about the underlying relationship data.

## What matters in HyperFlow today
- the screen shows boxes and lines first
- those boxes and lines come from node and edge data
- the real interaction happens in the main editor, while this page works better as supporting docs

## What the frontend team actually does
- create node ids plus \`position\` / \`size\`
- define edge source / target
- treat boxes and lines on screen as the visual output of that data

## What not to assume yet
- broad edge authoring UX at React Flow parity
- a complete custom node library right after install
- built-in workflow semantics

## Beginner check
- what does this box represent?
- is this line only decoration, or does it represent a real connection?

Those two questions remove a lot of confusion early.`,
      },
      "selection-and-editing": {
        navLabel: "Selection and Editing",
        title: "Selection and Editing",
        markdown: `When beginners first touch an editor, they usually do two things first: **pick something and change something**. HyperFlow should be learned from that loop too.

1. **select something**
2. **edit something**

## The usual flow
1. click a node in the canvas
2. see selection feedback
3. open an inspector or side panel
4. edit a field
5. see that change reflected again

## Why this matters
Before people care about architecture, they need to understand **what opens when they click and where they change values**.

- selection starts in the canvas
- editing starts in the inspector
- the result should show up again in the node

## Where this meets React Flow
React Flow also revolves around selection and editing.
For beginners, HyperFlow should be read through the same loop first.

## What the frontend team actually does
- read which node is selected
- open or fill an inspector
- write the change back into node data

## What this looks like on screen
- a user clicks a node and sees selection feedback
- an inspector or side panel opens or fills in values
- the change shows up again in node data or node presentation

## What not to assume yet
- that every editing affordance is built in already
- that a workflow-specific inspector ships by default
- that HyperFlow forces a form library

## Beginner check
- do I immediately see which node is selected?
- is it obvious where I edit values?
- do edits show up again in the node?`,
      },
      viewport: {
        navLabel: "The Viewport",
        title: "The Viewport",
        markdown: `React Flow Learn teaches the viewport as its own concept. That matters because editors stop feeling usable long before they stop rendering.

## What the viewport means
- which coordinate range the screen is currently looking at
- how pan / zoom / fit view behave
- whether responsiveness holds as the graph grows

## What users feel on screen
- dragging moves the canvas
- scrolling or gestures zoom in and out
- fit view brings the whole flow back into view

## Why HyperFlow cares so much about it
This is one of the reasons HyperFlow exists in the first place.
The docs keep talking about culling, hit-test, and responsiveness because all of those show up through viewport behavior.

## What the frontend team actually does
- decide how pan / zoom / fit are exposed
- decide whether viewport state needs persistence
- separate UI jank from canvas/runtime jank during debugging

## What not to assume yet
- that good viewport behavior alone means editor parity is finished
- that runtime maturity and shell maturity are the same thing

## What beginners should look for
- does pan stay responsive?
- does zoom keep selection and hit-testing aligned?
- does the surface draw only what it needs?

## Easy framing
Think of the viewport as the camera.
HyperFlow is trying to make that camera feel stable even when the surface gets larger.`,
      },
      "basic-interactions": {
        navLabel: "Basic Interactions",
        title: "Basic Interactions",
        markdown: `If HyperFlow is going to replace React Flow for some teams, it has to be measured against the editor actions users already expect without thinking.

## The first interactions people expect
- add a node
- select a node
- move a node
- connect nodes
- edit values
- delete
- save and reopen

## The important reading today
The docs should not pretend all of this is already fully finished.
But this list is still important because **it defines the baseline that a React Flow-style editor must eventually meet.**

## What users ask right after setup
- can I move a node directly?
- can I connect nodes?
- can I see selection immediately?
- can I save and reopen the same flow?

## Why this list matters
Before users care about architecture, they ask a simpler question:
"Does it behave like a node editor I already understand?"

That is why this page belongs near the front of Learn.

## React Flow parity v1 checklist
| Capability | Why it matters |
| --- | --- |
| node rendering | users must be able to see graph data immediately |
| edge rendering | relationships cannot stay implicit forever |
| node selection | every editor starts here |
| node movement | people expect direct manipulation |
| node connection | this is a baseline authoring action |
| viewport pan / zoom / fit | large surfaces become unusable without this |
| save / restore | this is where a demo starts becoming product-like |

## How to read this page today
- this table does **not** mean every item is already finished
- this table defines the minimum parity line HyperFlow must eventually meet
- beginners should read it as a checklist of what to verify, not a promise that all items ship today

## What to try in the demo right now
- use the in-canvas **Add node** button to insert a node at the current viewport center
- drag a node directly
- pan the canvas by dragging empty space
- connect nodes through handles
- select a node or edge and remove it with **Delete selection**

## What this page is trying to prove
- HyperFlow can now show direct editor interactions inside Learn itself
- that proof still does **not** mean broad React Flow parity is already done

## Practical checklist
- can I select?
- can I move?
- can I connect?
- can I see edits reflected?
- can I save and restore?
- does the docs surface stay honest about what works today and what does not?`,
      },
      "save-and-restore": {
        navLabel: "Save and Restore",
        title: "Save and Restore",
        markdown: `A node editor stops being a toy as soon as users expect to come back to the same graph later.

## Why it matters
- users need to reopen what they built
- product teams need node / edge / viewport state to survive persistence
- this is where demo UX and product UX start to separate

## Beginner mental model
There are usually three things you eventually want to persist.

1. nodes
2. edges
3. viewport

## What this looks like on screen
- the flow you edited today should open again tomorrow
- node positions and connections should still be there
- ideally the same zoom level or viewing area can come back too

## What to inspect in HyperFlow
- does the save format include nodes, edges, and viewport together?
- does restore bring back a consistent screen state?
- do selection and inspector state come back without awkward mismatches?

## What the frontend team actually does
- choose a save format for nodes / edges / viewport
- decide between autosave and explicit save
- decide how much screen state should come back after restore

## Easy conclusion
Save and restore is not extra polish.
It is one of the clearest signs that an editor surface can really live inside a product.`,
      },
      "add-to-react-app": {
        navLabel: "Add to a React App",
        title: "Add to a React App",
        markdown: `This page is meant to answer a practical question with code: **how do you place HyperFlow inside an existing React app?**

## Smallest code shape
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

## Shortest working usage example
~~~tsx
import { useState } from "react";
import {
  HyperFlowPocCanvas,
  createPocViewport,
  updateNodeData,
  useSelectedNode,
  useWorkflowNodesState,
  useWorkflowSelection,
  type PocNode,
} from "@hyperflow/react";

const initialNodes: PocNode[] = [
  {
    id: 1,
    type: "default",
    position: { x: 80, y: 80 },
    size: { width: 180, height: 96 },
    data: { title: "Node A" },
  },
  {
    id: 2,
    type: "default",
    position: { x: 360, y: 80 },
    size: { width: 180, height: 96 },
    data: { title: "Node B" },
  },
];

export function Example() {
  const [nodes, setNodes] = useWorkflowNodesState(initialNodes);
  const [selection, , onSelectionChange] = useWorkflowSelection({ nodeId: null });
  const selectedNode = useSelectedNode({ nodes, selection });
  const [viewport] = useState(() => createPocViewport(0, 0, 1));

  function renameSelectedNode() {
    if (!selectedNode) return;

    updateNodeData(setNodes, selectedNode.id, (node) => ({
      data: { ...node.data, title: "Renamed node" },
    }));
  }

  return (
    <>
      <HyperFlowPocCanvas
        nodes={nodes}
        viewport={viewport}
        selectedNodeId={selection.nodeId}
        onNodeSelect={(nodeId) => onSelectionChange({ nodeId })}
      />

      <button type="button" onClick={renameSelectedNode} disabled={!selectedNode}>
        Rename selected node
      </button>
    </>
  );
}
~~~

## What this code should tell you immediately
- \`nodes\` live in React state
- the canvas is rendered by \`HyperFlowPocCanvas\`
- selection reads a node id
- edits go back through \`updateNodeData(...)\`

## Usual embedding flow
1. put nodes into React state
2. create selection state
3. create a viewport
4. pass all of that into the canvas
5. read the selected node
6. edit it from a button or inspector
7. commit with \`updateNodeData(...)\`

## Important framing
- HyperFlow does not force a form library
- persistence still belongs in your app
- today the React layer is easiest to read as the canvas entry point, not a full editor shell`,
      },
      layouting: {
        navLabel: "Layout and Positioning",
        title: "Layout and Positioning",
        markdown: `Layouting is one of the first questions frontend teams ask. HyperFlow does not currently promise a complete layout engine.

## Current reality
- node \`position\` and \`size\` belong to the host
- HyperFlow projects editor-facing nodes into runtime geometry before it computes visibility and rendering

## In practice
- keep a fixed layout for simple cases
- feed positions from an external layout step
- compute coordinates from your domain rules in the host app

## Mental model
~~~text
host calculates positions
↓
HyperFlow receives nodes with position/size
↓
projects them to runtime x/y/width/height
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
        navLabel: "Understand Performance",
        title: "Understand Performance",
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
        navLabel: "Common Confusion",
        title: "Common Confusion",
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
- what does HyperFlow own versus the host app?

## Smallest example
~~~tsx
import { useState } from "react";
import {
  HyperFlowPocCanvas,
  createPocViewport,
  useWorkflowNodesState,
  useWorkflowSelection,
  type PocNode,
} from "@hyperflow/react";

const nodes: PocNode[] = [
  {
    id: 1,
    type: "default",
    position: { x: 64, y: 64 },
    size: { width: 180, height: 96 },
    data: { title: "Node A" },
  },
];

export function MinimalEmbed() {
  const [workflowNodes] = useWorkflowNodesState(nodes);
  const [selection, , onSelectionChange] = useWorkflowSelection({ nodeId: null });
  const [viewport] = useState(() => createPocViewport(0, 0, 1));

  return (
    <HyperFlowPocCanvas
      nodes={workflowNodes}
      viewport={viewport}
      selectedNodeId={selection.nodeId}
      onNodeSelect={(nodeId) => onSelectionChange({ nodeId })}
    />
  );
}
~~~

## Why this example matters
- it keeps only the minimum shape needed to render a canvas
- it shows how selection is wired into React state
- it explains the canvas seam before adding inspector UI`,
      },
      "host-controlled-state": {
        navLabel: "Host-controlled State",
        title: "Host-controlled State",
        markdown: `One message should repeat across examples: host-controlled state.

- app state ownership stays in the host
- HyperFlow does not replace product state architecture
- integration seams matter more than fake product chrome

## Direct state example
~~~tsx
const [nodes, setNodes] = useWorkflowNodesState(initialNodes);
const [selection, , onSelectionChange] = useWorkflowSelection({ nodeId: null });
const selectedNode = useSelectedNode({ nodes, selection });

function renameSelectedNode(nextTitle: string) {
  if (!selectedNode) return;

  updateNodeData(setNodes, selectedNode.id, (node) => ({
    data: { ...node.data, title: nextTitle },
  }));
}
~~~

## What to notice first
- selection also stays in React state
- edits are still ordinary React state updates
- HyperFlow does not take over your product state model`,
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

function buildDocsPagePath(locale: Locale, pageId: PageId): string {
  const { section, slug } = pageMeta[pageId];
  if (section === "roadmap") {
    return `/${locale}/roadmap`;
  }
  return slug ? `/${locale}/${section}/${slug}` : `/${locale}/${section}`;
}

function buildEditorPath(locale: Locale) {
  return `/${locale}`;
}

function buildRoutePath(route: Route) {
  return route.kind === "editor" ? buildEditorPath(route.locale) : buildDocsPagePath(route.locale, route.pageId);
}

function getRouteFromPath(pathname: string): Route {
  const segments = pathname.split("/").filter(Boolean);

  let locale: Locale = detectPreferredLocale();
  let sectionIndex = 0;
  if (locales.includes(segments[0] as Locale)) {
    locale = segments[0] as Locale;
    sectionIndex = 1;
  }

  const section = segments[sectionIndex] as SectionId | undefined;
  const sub = segments[sectionIndex + 1];

  if (segments.length === 0) {
    return { locale, kind: "editor" };
  }

  if (!section || section === "editor") {
    return { locale, kind: "editor" };
  }

  switch (section) {
    case "learn":
      switch (sub) {
        case undefined:
        case "what-is-hyperflow":
          return { locale, kind: "docs", pageId: "what-is-hyperflow" };
        case "when-to-use":
          return { locale, kind: "docs", pageId: "when-to-use" };
        case "installation":
          return { locale, kind: "docs", pageId: "installation" };
        case "nodes-and-edges":
          return { locale, kind: "docs", pageId: "nodes-and-edges" };
        case "selection-and-editing":
          return { locale, kind: "docs", pageId: "selection-and-editing" };
        case "viewport":
          return { locale, kind: "docs", pageId: "viewport" };
        case "basic-interactions":
          return { locale, kind: "docs", pageId: "basic-interactions" };
        case "save-and-restore":
          return { locale, kind: "docs", pageId: "save-and-restore" };
        case "add-to-react-app":
          return { locale, kind: "docs", pageId: "add-to-react-app" };
        case "layouting":
          return { locale, kind: "docs", pageId: "layouting" };
        case "performance":
          return { locale, kind: "docs", pageId: "performance" };
        case "troubleshooting":
          return { locale, kind: "docs", pageId: "troubleshooting" };
        default:
          return { locale, kind: "docs", pageId: "what-is-hyperflow" };
      }
    case "reference":
      switch (sub) {
        case undefined:
        case "api-overview":
          return { locale, kind: "docs", pageId: "api-overview" };
        case "runtime-model":
          return { locale, kind: "docs", pageId: "runtime-model" };
        case "viewport-selection":
          return { locale, kind: "docs", pageId: "viewport-selection" };
        default:
          return { locale, kind: "docs", pageId: "api-overview" };
      }
    case "examples":
      switch (sub) {
        case undefined:
        case "examples-overview":
          return { locale, kind: "docs", pageId: "examples-intro" };
        case "minimal-embed":
          return { locale, kind: "docs", pageId: "minimal-embed" };
        case "host-controlled-state":
          return { locale, kind: "docs", pageId: "host-controlled-state" };
        default:
          return { locale, kind: "docs", pageId: "examples-intro" };
      }
    case "roadmap":
      return { locale, kind: "docs", pageId: "roadmap" };
    default:
      return { locale, kind: "editor" };
  }
}

function navigateTo(route: Route, replace = false) {
  const path = buildRoutePath(route);
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

    if (
      line.trim().startsWith("|") &&
      i + 1 < lines.length &&
      /^\s*\|?(?:\s*:?-{3,}:?\s*\|)+\s*$/.test(lines[i + 1])
    ) {
      const parseTableCells = (value: string) =>
        value
          .trim()
          .replace(/^\|/, "")
          .replace(/\|$/, "")
          .split("|")
          .map((cell) => cell.trim());

      const headers = parseTableCells(line);
      i += 2;
      const rows: string[][] = [];

      while (i < lines.length && lines[i].trim().startsWith("|")) {
        rows.push(parseTableCells(lines[i]));
        i += 1;
      }

      blocks.push({ type: "table", headers, rows });
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
      if (
        !next ||
        next.startsWith("## ") ||
        next.startsWith("> ") ||
        next.startsWith("- ") ||
        /^\d+\.\s/.test(next) ||
        next.startsWith("```") ||
        next.startsWith("~~~") ||
        next.startsWith("|")
      ) {
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
  const pattern = /(`[^`]+`|\*\*[^*]+\*\*)/g;
  let lastIndex = 0;

  for (const match of text.matchAll(pattern)) {
    const start = match.index ?? 0;
    if (start > lastIndex) {
      segments.push({ type: "text", text: text.slice(lastIndex, start) });
    }
    const token = match[0];
    if (token.startsWith("`")) {
      segments.push({ type: "code", text: token.slice(1, -1) });
    } else {
      segments.push({ type: "bold", text: token.slice(2, -2) });
    }
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
        ) : segment.type === "bold" ? (
          <strong key={`${segment.type}-${index}`}>
            <InlineMarkdown text={segment.text} />
          </strong>
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
          <h3>
            <InlineMarkdown text={guide.workspaceTitle} />
          </h3>
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
          <h3>
            <InlineMarkdown text={guide.packageStatusTitle} />
          </h3>
        </div>
        <div className="install-guide-status">
          <ul className="markdown-list">
            {guide.packageStatusLines.map((line) => (
              <li key={line}>
                <InlineMarkdown text={line} />
              </li>
            ))}
          </ul>
        </div>
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
          case "table":
            return (
              <div key={key} className="markdown-table-shell">
                <table className="markdown-table">
                  <thead>
                    <tr>
                      {block.headers.map((header, headerIndex) => (
                        <th key={`${key}-header-${headerIndex}`}>
                          <InlineMarkdown text={header} />
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {block.rows.map((row, rowIndex) => (
                      <tr key={`${key}-row-${rowIndex}`}>
                        {row.map((cell, cellIndex) => (
                          <td key={`${key}-cell-${rowIndex}-${cellIndex}`}>
                            <InlineMarkdown text={cell} />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
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

const EditorNodeCard = memo(function EditorNodeCard({
  node,
  data,
  selected,
  screenWidth,
  screenHeight,
}: HyperFlowPocNodeRendererProps<LearnDemoNode["data"]>) {
  return (
    <div
      className={`editor-node-card${selected ? " is-selected" : ""}`}
      data-node-card-id={node.id}
      style={{
        width: screenWidth,
        height: screenHeight,
      }}
    >
      <span className="editor-node-card-type">{node.type}</span>
      <strong>{data.title}</strong>
      <span className="editor-node-card-note">{data.note}</span>
    </div>
  );
});

function EditorControlButton({
  label,
  title,
  onClick,
  disabled,
  tone = "default",
  children,
}: {
  label: string;
  title?: string;
  onClick?: () => void;
  disabled?: boolean;
  tone?: "default" | "danger";
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      className={tone === "danger" ? "editor-icon-button is-danger" : "editor-icon-button"}
      aria-label={label}
      title={title ?? label}
      onClick={onClick}
      disabled={disabled}
    >
      <span aria-hidden="true">{children}</span>
    </button>
  );
}

function IconPlus() {
  return <svg viewBox="0 0 20 20"><path d="M10 4v12M4 10h12" /></svg>;
}

function IconTrash() {
  return <svg viewBox="0 0 20 20"><path d="M5 6h10M8 6V4h4v2M7 6v9m6-9v9M6 6l.6 10h6.8L14 6" /></svg>;
}

function IconFit() {
  return <svg viewBox="0 0 20 20"><path d="M7 4H4v3M13 4h3v3M16 13v3h-3M4 13v3h3" /></svg>;
}

function IconMinus() {
  return <svg viewBox="0 0 20 20"><path d="M4 10h12" /></svg>;
}

function IconSearchPlus() {
  return (
    <svg viewBox="0 0 20 20">
      <circle cx="8.5" cy="8.5" r="4.5" />
      <path d="M15 15l-3.2-3.2M8.5 6.5v4M6.5 8.5h4" />
    </svg>
  );
}

function IconSave() {
  return <svg viewBox="0 0 20 20"><path d="M5 4h8l2 2v10H5V4zm2 0v4h6V4M8 14h4" /></svg>;
}

function IconRestore() {
  return <svg viewBox="0 0 20 20"><path d="M6 7H3V4M4 7a6 6 0 1 1-1 7m7-8v4l3 2" /></svg>;
}

function IconPulse() {
  return <svg viewBox="0 0 20 20"><path d="M3 10h3l1.5-3 2.5 7 2-4h5" /></svg>;
}

const EditorMiniMap = memo(function EditorMiniMap({
  locale,
  engine,
  nodes,
  edges,
  viewport,
  onViewportChange,
}: {
  locale: Locale;
  engine: PocEngine | null;
  nodes: LearnDemoNode[];
  edges: LearnDemoEdge[];
  viewport: PocViewport;
  onViewportChange: (viewport: PocViewport) => void;
}) {
  const width = 220;
  const height = 148;
  const padding = 48;
  const label = locale === "ko" ? "에디터 미니맵" : "Editor minimap";
  const title = locale === "ko" ? "Minimap" : "Minimap";

  const model = useMemo(() => {
    const nodeMinX = Math.min(...nodes.map((node) => node.position.x));
    const nodeMinY = Math.min(...nodes.map((node) => node.position.y));
    const nodeMaxX = Math.max(...nodes.map((node) => node.position.x + node.size.width));
    const nodeMaxY = Math.max(...nodes.map((node) => node.position.y + node.size.height));
    const viewportWidth = viewport.width / viewport.zoom;
    const viewportHeight = viewport.height / viewport.zoom;
    const minX = Math.min(nodeMinX, viewport.x) - padding;
    const minY = Math.min(nodeMinY, viewport.y) - padding;
    const maxX = Math.max(nodeMaxX, viewport.x + viewportWidth) + padding;
    const maxY = Math.max(nodeMaxY, viewport.y + viewportHeight) + padding;
    const worldWidth = Math.max(maxX - minX, 1);
    const worldHeight = Math.max(maxY - minY, 1);
    const scale = Math.min((width - 24) / worldWidth, (height - 24) / worldHeight);
    const offsetX = (width - worldWidth * scale) / 2;
    const offsetY = (height - worldHeight * scale) / 2;

    const projectX = (value: number) => offsetX + (value - minX) * scale;
    const projectY = (value: number) => offsetY + (value - minY) * scale;

    return {
      minX,
      minY,
      scale,
      offsetX,
      offsetY,
      projectX,
      projectY,
      viewportWidth,
      viewportHeight,
      rect: {
        x: projectX(viewport.x),
        y: projectY(viewport.y),
        width: viewportWidth * scale,
        height: viewportHeight * scale,
      },
    };
  }, [edges, nodes, viewport]);

  const nodeById = useMemo(() => new Map(nodes.map((node) => [Number(node.id), node] as const)), [nodes]);

  const anchorMaps = useMemo(() => {
    const incomingByNodeId = new Map<number, PocNode[]>();
    const outgoingByNodeId = new Map<number, PocNode[]>();

    edges.forEach((edge) => {
      const sourceNode = nodeById.get(Number(edge.source));
      const targetNode = nodeById.get(Number(edge.target));
      if (!sourceNode || !targetNode) return;
      outgoingByNodeId.set(Number(sourceNode.id), [...(outgoingByNodeId.get(Number(sourceNode.id)) ?? []), targetNode]);
      incomingByNodeId.set(Number(targetNode.id), [...(incomingByNodeId.get(Number(targetNode.id)) ?? []), sourceNode]);
    });

    const averageCenter = (connectedNodes: PocNode[]) => {
      if (connectedNodes.length === 0) return null;
      const totals = connectedNodes.reduce(
        (sum, connectedNode) => {
          const center = getPocNodeCenter(connectedNode);
          return { x: sum.x + center.x, y: sum.y + center.y };
        },
        { x: 0, y: 0 },
      );
      return {
        x: totals.x / connectedNodes.length,
        y: totals.y / connectedNodes.length,
      };
    };

    const requests = nodes.map((node) => {
      const center = getPocNodeCenter(node);
      return {
        nodeId: Number(node.id),
        node,
        inputToward: averageCenter(incomingByNodeId.get(Number(node.id)) ?? []) ?? {
          x: center.x - 1,
          y: center.y,
        },
        outputToward: averageCenter(outgoingByNodeId.get(Number(node.id)) ?? []) ?? {
          x: center.x + 1,
          y: center.y,
        },
      };
    });

    const resolvedAnchors = engine
      ? engine.resolveNodeAnchorsBatch(
          requests.map(({ node, inputToward, outputToward }) => ({
            x: node.position.x,
            y: node.position.y,
            width: node.size.width,
            height: node.size.height,
            inputToward,
            outputToward,
            sameSideOffset: 18,
            ...getEditorNodeAnchorPreferences(),
          })),
        )
      : requests.map(({ node, inputToward, outputToward }) =>
          resolvePocNodeAnchors(node, {
            inputToward,
            outputToward,
            sameSideOffset: 18,
            ...getEditorNodeAnchorPreferences(),
          }),
        );

    return new Map<number, PocResolvedNodeAnchors>(
      requests
        .map(({ nodeId }, index) => [nodeId, resolvedAnchors[index] ?? null] as const)
        .filter((entry): entry is [number, PocResolvedNodeAnchors] => entry[1] !== null),
    );
  }, [edges, engine, nodeById, nodes]);

  const edgeAnchorsById = useMemo(() => {
    return new Map(
      resolvePocEdgeAnchorsBatch(
        nodes,
        edges,
        anchorMaps,
        engine ? (requests) => engine.resolveEdgeAnchorsBatch(requests) : undefined,
        engine ? (requests) => engine.resolveRenderedEdgeAnchorsBatch(requests) : undefined,
      ).map((entry) => [entry.edgeId, entry] as const),
    );
  }, [anchorMaps, edges, engine, nodes]);

  const worldRenderedEdges = useMemo(
    () =>
      resolvePocRenderableEdgesBatch({
        nodes,
        edges,
        resolvedEdgeAnchorsById: edgeAnchorsById,
        spreadStep: 18,
        minimumCurveOffset: 10 / Math.max(model.scale, 0.001),
        resolveCurves: engine ? (requests) => engine.resolveEdgeCurvesBatch(requests) : undefined,
      }),
    [edgeAnchorsById, edges, engine, model.scale, nodes],
  );

  const renderedEdges = useMemo(
    () =>
      worldRenderedEdges.map((edge) => {
        const projectedCurve = projectPocResolvedEdgeCurve(edge.curve, {
          projectX: model.projectX,
          projectY: model.projectY,
        });
        return {
          ...edge,
          curve: projectedCurve,
          path: buildPocSvgCurvePath(projectedCurve),
        };
      }),
    [model.projectX, model.projectY, worldRenderedEdges],
  );

  function recenterViewport(clientX: number, clientY: number, rect: DOMRect) {
    const localX = clientX - rect.left;
    const localY = clientY - rect.top;
    const worldX = model.minX + (localX - model.offsetX) / model.scale;
    const worldY = model.minY + (localY - model.offsetY) / model.scale;
    onViewportChange(
      createPocViewport(viewport.width, viewport.height, {
        x: Math.max(0, worldX - model.viewportWidth / 2),
        y: Math.max(0, worldY - model.viewportHeight / 2),
        zoom: viewport.zoom,
      }),
    );
  }

  return (
    <div
      className="editor-minimap"
      aria-label={label}
      onClick={(event) => recenterViewport(event.clientX, event.clientY, event.currentTarget.getBoundingClientRect())}
    >
      <span className="editor-minimap-title">{title}</span>
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-hidden="true">
        {renderedEdges.map((edge) => (
          <path
            key={edge.id}
            className="editor-minimap-edge"
            d={edge.path}
          />
        ))}
        {nodes.map((node) => (
          <rect
            key={node.id}
            className="editor-minimap-node"
            x={model.projectX(node.position.x)}
            y={model.projectY(node.position.y)}
            width={node.size.width * model.scale}
            height={node.size.height * model.scale}
            rx="6"
          />
        ))}
        <rect
          className="editor-minimap-viewport"
          x={model.rect.x}
          y={model.rect.y}
          width={model.rect.width}
          height={model.rect.height}
          rx="8"
        />
      </svg>
    </div>
  );
});

function MainEditorSurface({
  locale,
  copy,
  onOpenDocs,
  onOpenSection,
  onSwitchLocale,
}: {
  locale: Locale;
  copy: Copy;
  onOpenDocs: () => void;
  onOpenSection: (sectionId: SectionId) => void;
  onSwitchLocale: (locale: Locale) => void;
}) {
  const [editorCanvasFrameRef, editorCanvasSize] = useCanvasDimensions(mainEditorCanvas);
  const [nodes, setNodes] = useWorkflowNodesState<LearnDemoNode>(cloneLearnDemoNodes());
  const [edges, setEdges] = useWorkflowEdgesState<LearnDemoEdge>(cloneLearnDemoEdges());
  const [graphPreset, setGraphPreset] = useState<EditorGraphPreset>("starter");
  const [selection, , onSelectionChange] = useWorkflowSelection({ nodeId: null });
  const selectedNode = useSelectedNode({ nodes, selection });
  const [selectedNodeIds, setSelectedNodeIds] = useState<number[]>([]);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [viewport, setViewport] = useState<PocViewport>(() =>
    fitPocViewportToNodes(cloneLearnDemoNodes(), {
      width: editorCanvasSize.width,
      height: editorCanvasSize.height,
      padding: 96,
      minZoom: 0.35,
      maxZoom: 1.4,
    }),
  );
  const [titleDraft, setTitleDraft] = useState("");
  const [savedSnapshot, setSavedSnapshot] = useState<{
    nodes: LearnDemoNode[];
    edges: LearnDemoEdge[];
    viewport: PocViewport;
  } | null>(null);
  const [editorEngine, setEditorEngine] = useState<PocEngine | null>(null);
  const [perfReadout, setPerfReadout] = useState<EditorPerfReadout>({
    fps: null,
    renderMs: null,
    viewportMs: null,
    inputLatencyMs: null,
    interactionPhase: "idle",
    frameSampleCount: 0,
    fixtureSize: 0,
    visibleCount: 0,
    avgRenderMs: null,
    avgViewportMs: null,
    avgInputLatencyMs: null,
    peakInputLatencyMs: null,
    budgetMissCount: 0,
    interactionFrameSampleCount: 0,
    interactionBudgetMissCount: 0,
    interactionBurstCount: 0,
    recentInteractionSampleCount: 0,
    recentAvgRenderMs: null,
    recentAvgViewportMs: null,
    recentAvgInputLatencyMs: null,
    recentPeakInputLatencyMs: null,
    recentBudgetMissRate: null,
  });
  const editorShellRef = useRef<HTMLElement | null>(null);
  const titleInputRef = useRef<HTMLInputElement | null>(null);
  const pendingTitleFocusNodeIdRef = useRef<number | null>(null);
  const nodesRef = useRef(nodes);
  const viewportRef = useRef(viewport);
  const perfInteractionPhaseRef = useRef<EditorInteractionPhase>("idle");
  const hasUserAdjustedViewportRef = useRef(false);
  const perfSampleRef = useRef<{
    lastFrameAt: number;
    smoothedFps: number | null;
    lastInteractionLatencyMs: number | null;
    pendingInteractionAt: number | null;
    pendingInteractionPhase: Exclude<EditorInteractionPhase, "idle" | "settling"> | null;
    idleTimerId: number | null;
    frameCount: number;
    renderSumMs: number;
    viewportSumMs: number;
    inputLatencyCount: number;
    inputLatencySumMs: number;
    peakInputLatencyMs: number | null;
    budgetMissCount: number;
    interactionFrameCount: number;
    interactionBudgetMissCount: number;
    interactionBurstCount: number;
    recentInteractionFrames: Array<{
      renderMs: number;
      viewportMs: number;
      inputLatencyMs: number | null;
      budgetMiss: boolean;
    }>;
    wasInteractionFrame: boolean;
    lastPublishedAt: number;
  }>({
    lastFrameAt: 0,
    smoothedFps: null,
    lastInteractionLatencyMs: null,
    pendingInteractionAt: null,
    pendingInteractionPhase: null,
    idleTimerId: null,
    frameCount: 0,
    renderSumMs: 0,
    viewportSumMs: 0,
    inputLatencyCount: 0,
    inputLatencySumMs: 0,
    peakInputLatencyMs: null,
    budgetMissCount: 0,
    interactionFrameCount: 0,
    interactionBudgetMissCount: 0,
    interactionBurstCount: 0,
    recentInteractionFrames: [],
    wasInteractionFrame: false,
    lastPublishedAt: 0,
  });

  useEffect(() => {
    nodesRef.current = nodes;
  }, [nodes]);

  useEffect(() => {
    let cancelled = false;

    createPocEngine()
      .then((engine) => {
        if (cancelled) return;
        setEditorEngine(engine);
      })
      .catch(() => {
        if (cancelled) return;
        setEditorEngine(null);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!editorEngine) return;
    editorEngine.loadFixture(projectPocNodesToRuntimeNodes(nodes));
  }, [editorEngine, nodes]);

  useEffect(() => {
    viewportRef.current = viewport;
  }, [viewport]);

  useEffect(() => {
    perfInteractionPhaseRef.current = perfReadout.interactionPhase;
  }, [perfReadout.interactionPhase]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const captureBridgeWindow = window as PerfCaptureBridgeWindow;
    const isAutomationCapture = captureBridgeWindow.__HF_CAPTURE_EDITOR_PERF__ === true && window.navigator.webdriver === true;
    if (!isAutomationCapture) {
      delete captureBridgeWindow.__HF_EDITOR_PERF_READOUT__;
      delete captureBridgeWindow.__HF_EDITOR_PERF_GRAPH_PRESET__;
      return;
    }
    captureBridgeWindow.__HF_EDITOR_PERF_READOUT__ = { ...perfReadout };
    captureBridgeWindow.__HF_EDITOR_PERF_GRAPH_PRESET__ = graphPreset;
    return () => {
      delete captureBridgeWindow.__HF_EDITOR_PERF_READOUT__;
      delete captureBridgeWindow.__HF_EDITOR_PERF_GRAPH_PRESET__;
    };
  }, [graphPreset, perfReadout]);

  useEffect(() => {
    setTitleDraft(selectedNode?.data.title ?? "");
  }, [selectedNode?.data.title, selectedNode?.id]);

  useEffect(() => {
    if (document.activeElement && document.activeElement !== document.body) return;
    editorShellRef.current?.focus();
  }, []);

  useEffect(() => {
    return () => {
      if (perfSampleRef.current.idleTimerId !== null) {
        window.clearTimeout(perfSampleRef.current.idleTimerId);
      }
    };
  }, []);

  const schedulePerfIdleTransition = useCallback(() => {
    if (perfSampleRef.current.idleTimerId !== null) {
      window.clearTimeout(perfSampleRef.current.idleTimerId);
    }

    perfSampleRef.current.idleTimerId = window.setTimeout(() => {
      perfSampleRef.current.idleTimerId = null;
      perfSampleRef.current.wasInteractionFrame = false;
      setPerfReadout((current) =>
        current.interactionPhase === "idle"
          ? current
          : {
              ...current,
              interactionPhase: "idle",
            },
      );
    }, 420);
  }, []);

  const resetPerfSampling = useCallback(() => {
    if (perfSampleRef.current.idleTimerId !== null) {
      window.clearTimeout(perfSampleRef.current.idleTimerId);
    }
    perfSampleRef.current = {
      lastFrameAt: 0,
      smoothedFps: null,
      lastInteractionLatencyMs: null,
      pendingInteractionAt: null,
      pendingInteractionPhase: null,
      idleTimerId: null,
      frameCount: 0,
      renderSumMs: 0,
      viewportSumMs: 0,
      inputLatencyCount: 0,
      inputLatencySumMs: 0,
      peakInputLatencyMs: null,
      budgetMissCount: 0,
      interactionFrameCount: 0,
      interactionBudgetMissCount: 0,
      interactionBurstCount: 0,
      recentInteractionFrames: [],
      wasInteractionFrame: false,
      lastPublishedAt: 0,
    };
    setPerfReadout({
      fps: null,
      renderMs: null,
      viewportMs: null,
      inputLatencyMs: null,
      interactionPhase: "idle",
      frameSampleCount: 0,
      fixtureSize: nodesRef.current.length,
      visibleCount: 0,
      avgRenderMs: null,
      avgViewportMs: null,
      avgInputLatencyMs: null,
      peakInputLatencyMs: null,
      budgetMissCount: 0,
      interactionFrameSampleCount: 0,
      interactionBudgetMissCount: 0,
      interactionBurstCount: 0,
      recentInteractionSampleCount: 0,
      recentAvgRenderMs: null,
      recentAvgViewportMs: null,
      recentAvgInputLatencyMs: null,
      recentPeakInputLatencyMs: null,
      recentBudgetMissRate: null,
    });
  }, []);

  const markEditorInteraction = useCallback((phase: Exclude<EditorInteractionPhase, "idle" | "settling">) => {
    const now = performance.now();
    perfSampleRef.current.pendingInteractionAt = now;
    perfSampleRef.current.pendingInteractionPhase = phase;
    if (perfSampleRef.current.idleTimerId !== null) {
      window.clearTimeout(perfSampleRef.current.idleTimerId);
      perfSampleRef.current.idleTimerId = null;
    }
    setPerfReadout((current) =>
      current.interactionPhase === phase
        ? current
        : {
            ...current,
            interactionPhase: phase,
          },
    );
  }, []);

  const handleMetricsChange = useCallback((metrics: PocMetrics) => {
    const now = performance.now();
    const previousFrameAt = perfSampleRef.current.lastFrameAt;
    const frameDeltaMs = previousFrameAt > 0 ? now - previousFrameAt : 0;
    const instantFps = frameDeltaMs > 0 ? 1000 / frameDeltaMs : null;
    const nextFps =
      instantFps === null
        ? perfSampleRef.current.smoothedFps
        : perfSampleRef.current.smoothedFps === null
          ? instantFps
          : perfSampleRef.current.smoothedFps * 0.8 + instantFps * 0.2;
    const hasPendingInteraction = perfSampleRef.current.pendingInteractionAt !== null;
    const nextInputLatencyMs = hasPendingInteraction
      ? now - Number(perfSampleRef.current.pendingInteractionAt)
      : perfSampleRef.current.lastInteractionLatencyMs;

    perfSampleRef.current.lastFrameAt = now;
    perfSampleRef.current.smoothedFps = nextFps;
    perfSampleRef.current.lastInteractionLatencyMs = nextInputLatencyMs ?? null;
    perfSampleRef.current.pendingInteractionAt = null;
    perfSampleRef.current.pendingInteractionPhase = null;

    if (hasPendingInteraction) {
      schedulePerfIdleTransition();
    }

    const roundedFps = nextFps === null ? null : Math.max(1, Math.round(nextFps));
    const roundedRenderMs = Number(metrics.renderMs.toFixed(1));
    const roundedViewportMs = Number(metrics.viewportUpdateMs.toFixed(1));
    const roundedInputLatencyMs =
      nextInputLatencyMs === null || !Number.isFinite(nextInputLatencyMs)
        ? null
        : Math.max(0, Number(nextInputLatencyMs.toFixed(1)));
    const totalFrameWorkMs = metrics.renderMs + metrics.viewportUpdateMs;
    const currentInteractionPhase = perfInteractionPhaseRef.current;
    const isInteractionFrame = hasPendingInteraction || currentInteractionPhase !== "idle";
    const enteringInteraction = isInteractionFrame && !perfSampleRef.current.wasInteractionFrame;

    if (enteringInteraction) {
      perfSampleRef.current.interactionBurstCount += 1;
    }

    perfSampleRef.current.frameCount += 1;
    perfSampleRef.current.renderSumMs += metrics.renderMs;
    perfSampleRef.current.viewportSumMs += metrics.viewportUpdateMs;
    if (isInteractionFrame) {
      perfSampleRef.current.interactionFrameCount += 1;
    }
    if (totalFrameWorkMs > 16.7) {
      perfSampleRef.current.budgetMissCount += 1;
      if (isInteractionFrame) {
        perfSampleRef.current.interactionBudgetMissCount += 1;
      }
    }
    if (isInteractionFrame) {
      perfSampleRef.current.recentInteractionFrames.push({
        renderMs: metrics.renderMs,
        viewportMs: metrics.viewportUpdateMs,
        inputLatencyMs: roundedInputLatencyMs,
        budgetMiss: totalFrameWorkMs > 16.7,
      });
      if (perfSampleRef.current.recentInteractionFrames.length > maxPerfRecentInteractionWindow) {
        perfSampleRef.current.recentInteractionFrames.splice(
          0,
          perfSampleRef.current.recentInteractionFrames.length - maxPerfRecentInteractionWindow,
        );
      }
    }
    if (roundedInputLatencyMs !== null) {
      perfSampleRef.current.inputLatencyCount += 1;
      perfSampleRef.current.inputLatencySumMs += roundedInputLatencyMs;
      perfSampleRef.current.peakInputLatencyMs =
        perfSampleRef.current.peakInputLatencyMs === null
          ? roundedInputLatencyMs
          : Math.max(perfSampleRef.current.peakInputLatencyMs, roundedInputLatencyMs);
    }
    perfSampleRef.current.wasInteractionFrame = isInteractionFrame;

    const roundedAvgRenderMs = Number(
      (perfSampleRef.current.renderSumMs / Math.max(perfSampleRef.current.frameCount, 1)).toFixed(1),
    );
    const roundedAvgViewportMs = Number(
      (perfSampleRef.current.viewportSumMs / Math.max(perfSampleRef.current.frameCount, 1)).toFixed(1),
    );
    const roundedAvgInputLatencyMs =
      perfSampleRef.current.inputLatencyCount === 0
        ? null
        : Number((perfSampleRef.current.inputLatencySumMs / perfSampleRef.current.inputLatencyCount).toFixed(1));
    const roundedPeakInputLatencyMs =
      perfSampleRef.current.peakInputLatencyMs === null
        ? null
        : Number(perfSampleRef.current.peakInputLatencyMs.toFixed(1));
    const recentInteractionFrames = perfSampleRef.current.recentInteractionFrames;
    const recentInteractionSampleCount = recentInteractionFrames.length;
    const recentRenderSumMs = recentInteractionFrames.reduce((sum, frame) => sum + frame.renderMs, 0);
    const recentViewportSumMs = recentInteractionFrames.reduce((sum, frame) => sum + frame.viewportMs, 0);
    const recentInputLatencyFrames = recentInteractionFrames.filter((frame) => frame.inputLatencyMs !== null);
    const recentInputLatencySumMs = recentInputLatencyFrames.reduce(
      (sum, frame) => sum + Number(frame.inputLatencyMs),
      0,
    );
    const recentBudgetMissCount = recentInteractionFrames.reduce(
      (count, frame) => count + (frame.budgetMiss ? 1 : 0),
      0,
    );
    const roundedRecentAvgRenderMs =
      recentInteractionSampleCount === 0 ? null : Number((recentRenderSumMs / recentInteractionSampleCount).toFixed(1));
    const roundedRecentAvgViewportMs =
      recentInteractionSampleCount === 0 ? null : Number((recentViewportSumMs / recentInteractionSampleCount).toFixed(1));
    const roundedRecentAvgInputLatencyMs =
      recentInputLatencyFrames.length === 0
        ? null
        : Number((recentInputLatencySumMs / recentInputLatencyFrames.length).toFixed(1));
    const roundedRecentPeakInputLatencyMs =
      recentInputLatencyFrames.length === 0
        ? null
        : Number(
            Math.max(...recentInputLatencyFrames.map((frame) => Number(frame.inputLatencyMs))).toFixed(1),
          );
    const roundedRecentBudgetMissRate =
      recentInteractionSampleCount === 0
        ? null
        : Number((recentBudgetMissCount / recentInteractionSampleCount).toFixed(2));
    const nextInteractionPhase = hasPendingInteraction ? "settling" : currentInteractionPhase;
    const shouldPublishNow =
      hasPendingInteraction ||
      nextInteractionPhase !== currentInteractionPhase ||
      perfSampleRef.current.frameCount <= 3 ||
      now - perfSampleRef.current.lastPublishedAt >= 96;

    if (!shouldPublishNow) {
      return;
    }

    perfSampleRef.current.lastPublishedAt = now;

    setPerfReadout((current) => {
      const nextInteractionPhase = hasPendingInteraction ? "settling" : current.interactionPhase;
      if (
        current.fps === roundedFps &&
        current.renderMs === roundedRenderMs &&
        current.viewportMs === roundedViewportMs &&
        current.inputLatencyMs === roundedInputLatencyMs &&
        current.interactionPhase === nextInteractionPhase &&
        current.frameSampleCount === perfSampleRef.current.frameCount &&
        current.fixtureSize === metrics.fixtureSize &&
        current.visibleCount === metrics.visibleCount &&
        current.avgRenderMs === roundedAvgRenderMs &&
        current.avgViewportMs === roundedAvgViewportMs &&
        current.avgInputLatencyMs === roundedAvgInputLatencyMs &&
        current.peakInputLatencyMs === roundedPeakInputLatencyMs &&
        current.budgetMissCount === perfSampleRef.current.budgetMissCount &&
        current.interactionFrameSampleCount === perfSampleRef.current.interactionFrameCount &&
        current.interactionBudgetMissCount === perfSampleRef.current.interactionBudgetMissCount &&
        current.interactionBurstCount === perfSampleRef.current.interactionBurstCount &&
        current.recentInteractionSampleCount === recentInteractionSampleCount &&
        current.recentAvgRenderMs === roundedRecentAvgRenderMs &&
        current.recentAvgViewportMs === roundedRecentAvgViewportMs &&
        current.recentAvgInputLatencyMs === roundedRecentAvgInputLatencyMs &&
        current.recentPeakInputLatencyMs === roundedRecentPeakInputLatencyMs &&
        current.recentBudgetMissRate === roundedRecentBudgetMissRate
      ) {
        return current;
      }

      return {
        fps: roundedFps,
        renderMs: roundedRenderMs,
        viewportMs: roundedViewportMs,
        inputLatencyMs: roundedInputLatencyMs,
        interactionPhase: nextInteractionPhase,
        frameSampleCount: perfSampleRef.current.frameCount,
        fixtureSize: metrics.fixtureSize,
        visibleCount: metrics.visibleCount,
        avgRenderMs: roundedAvgRenderMs,
        avgViewportMs: roundedAvgViewportMs,
        avgInputLatencyMs: roundedAvgInputLatencyMs,
        peakInputLatencyMs: roundedPeakInputLatencyMs,
        budgetMissCount: perfSampleRef.current.budgetMissCount,
        interactionFrameSampleCount: perfSampleRef.current.interactionFrameCount,
        interactionBudgetMissCount: perfSampleRef.current.interactionBudgetMissCount,
        interactionBurstCount: perfSampleRef.current.interactionBurstCount,
        recentInteractionSampleCount,
        recentAvgRenderMs: roundedRecentAvgRenderMs,
        recentAvgViewportMs: roundedRecentAvgViewportMs,
        recentAvgInputLatencyMs: roundedRecentAvgInputLatencyMs,
        recentPeakInputLatencyMs: roundedRecentPeakInputLatencyMs,
        recentBudgetMissRate: roundedRecentBudgetMissRate,
      };
    });
  }, [schedulePerfIdleTransition]);

  const canvasNodeRenderers = useMemo(() => ({ card: EditorNodeCard }), []);
  const getCanvasNodeRendererKey = useCallback(() => "card", []);
  const getCanvasNodeRendererData = useCallback((node: LearnDemoNode) => node.data, []);
  const handleCanvasEdgeSelect = useCallback(
    (edgeId: string | null) => {
      setSelectedEdgeId(edgeId);
      if (edgeId !== null) {
        setSelectedNodeIds([]);
        onSelectionChange({ nodeId: null });
      }
    },
    [onSelectionChange],
  );
  const handleCanvasNodePositionChange = useCallback((nodeId: number, nextPosition: PocNode["position"]) => {
    updateNodeData(setNodes, nodeId, () => ({
      position: nextPosition,
    }));
  }, []);
  const handleCanvasNodesPositionChange = useCallback(
    (updates: Array<{ nodeId: number; nextPosition: PocNode["position"] }>) => {
      applyNodePositionUpdates(setNodes, updates);
    },
    [],
  );
  const handleCanvasEdgeConnect = useCallback((sourceNodeId: number, targetNodeId: number) => {
    setEdges((current) =>
      appendLearnDemoEdge(current, sourceNodeId, targetNodeId, {
        toggleExisting: true,
      }),
    );
  }, []);
  const handleCanvasEdgeReconnect = useCallback((edgeId: string, next: { sourceNodeId?: number; targetNodeId?: number }) => {
    setEdges((current) => reconnectLearnDemoEdge(current, edgeId, next));
  }, []);
  const handleCanvasEdgeBendChange = useCallback((edgeId: string, nextBend: PocEdge["bend"]) => {
    setEdges((current) =>
      current.map((edge) =>
        edge.id === edgeId
          ? {
              ...edge,
              bend: nextBend ? { ...nextBend } : null,
            }
          : edge,
      ),
    );
  }, []);

  useEffect(() => {
    if (!selectedNode || pendingTitleFocusNodeIdRef.current !== selectedNode.id || !titleInputRef.current) {
      return;
    }

    titleInputRef.current.focus();
    titleInputRef.current.select();
    pendingTitleFocusNodeIdRef.current = null;
  }, [selectedNode]);

  useEffect(() => {
    setViewport((current) => {
      if (current.width === editorCanvasSize.width && current.height === editorCanvasSize.height) {
        return current;
      }

      const shouldRefitMeasuredCanvas =
        !hasUserAdjustedViewportRef.current &&
        (editorCanvasSize.width !== mainEditorCanvas.width || editorCanvasSize.height !== mainEditorCanvas.height);

      if (shouldRefitMeasuredCanvas) {
        return fitPocViewportToNodes(nodes, {
          width: editorCanvasSize.width,
          height: editorCanvasSize.height,
          padding: 96,
          minZoom: 0.35,
          maxZoom: 1.4,
        });
      }

      const centerX = current.x + current.width / (2 * current.zoom);
      const centerY = current.y + current.height / (2 * current.zoom);

      return createPocViewport(editorCanvasSize.width, editorCanvasSize.height, {
        x: Math.max(0, centerX - editorCanvasSize.width / (2 * current.zoom)),
        y: Math.max(0, centerY - editorCanvasSize.height / (2 * current.zoom)),
        zoom: current.zoom,
      });
    });
  }, [editorCanvasSize.height, editorCanvasSize.width]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target;
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        (target instanceof HTMLElement && target.isContentEditable)
      ) {
        return;
      }

      const shortcutKey = event.metaKey || event.ctrlKey;
      if (!shortcutKey && !event.altKey && event.key.toLowerCase() === "n") {
        event.preventDefault();
        addNode();
        return;
      }

      if (shortcutKey && event.key === "0") {
        event.preventDefault();
        fitView();
        return;
      }

      if (shortcutKey && event.key.toLowerCase() === "s") {
        event.preventDefault();
        saveSnapshot();
        return;
      }

      if (event.key === "Escape") {
        if (!selectedEdgeId && selectedNodeIds.length === 0 && !selectedNode) return;
        event.preventDefault();
        setSelectedNodeIds([]);
        setSelectedEdgeId(null);
        onSelectionChange({ nodeId: null });
        return;
      }

      if (event.key !== "Delete" && event.key !== "Backspace") return;
      if (!selectedEdgeId && selectedNodeIds.length === 0 && !selectedNode) return;
      event.preventDefault();
      deleteSelected();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedEdgeId, selectedNode, selectedNodeIds]);

  const ui =
    locale === "ko"
      ? {
          shellEyebrow: "메인 interactive surface",
          shellTitle: "바로 만져보는 HyperFlow editor",
          shellBody: "노드를 추가하고, 잡아 움직이고, 핸들로 연결하고, 선택해서 지워보면 된다.",
          canvasLabel: "HyperFlow 메인 editor",
          docsButton: "학습 문서 보기",
          controls: {
            addNode: "노드 추가",
            toggleBenchmarkOn: "대형 그래프 보기",
            toggleBenchmarkOff: "기본 그래프 보기",
            deleteSelection: "선택 삭제",
            resetPerf: "성능 계측 초기화",
            fit: "맞춤 보기",
            zoomOut: "축소",
            zoomIn: "확대",
            save: "저장",
            restore: "복원",
          },
          status: {
            graph: "그래프",
            perfBaseline: "성능 기준",
            perfBaselineStatus: "기준 상태",
            nodes: "노드",
            edges: "엣지",
            zoom: "줌",
            fps: "FPS",
            render: "렌더",
            viewport: "뷰포트",
            inputLatency: "입력→프레임",
            avgRender: "평균 렌더",
            avgViewport: "평균 뷰포트",
            avgInputLatency: "평균 입력",
            peakInputLatency: "최고 입력",
            visible: "표시",
            samples: "프레임",
            frameBudget: "예산 초과",
            activity: "상태",
            pendingPerf: "측정 중",
            idle: "대기",
            dragging: "드래그",
            zooming: "줌",
            settling: "반영 중",
            starterGraph: "기본",
            benchmarkGraph: "대형",
            warming: "수집 중",
            within: "기준 내",
            over: "기준 초과",
            shortcuts:
              "N 노드 추가 · Shift+클릭 다중 선택 · Delete 삭제 · 엣지 끝점 드래그/핸들 클릭 다시 연결 · Esc 선택 해제 · ⌘/Ctrl+0 맞춤 보기 · ⌘/Ctrl+S 저장",
          },
          inspector: {
            eyebrow: "선택된 항목",
            empty: "캔버스에서 노드나 엣지를 눌러 선택하면 여기서 현재 상태를 확인할 수 있다.",
            field: "제목",
            apply: "적용",
            deleteNode: "노드 삭제",
            deleteEdge: "엣지 삭제",
            edgeLabel: "선택된 엣지",
            edgeHint: "핸들을 눌러 새 연결을 만들고, 선 자체를 끌어 경로를 움직이거나 더블클릭으로 굴곡을 초기화한 뒤 삭제할 수 있다.",
            saved: "저장된 스냅샷",
            notSaved: "아직 저장된 스냅샷이 없다.",
            multiSelectedSuffix: "개 노드 선택됨",
            multiHint: "Shift+클릭으로 선택을 더하고 빼거나, Shift를 누른 채 빈 캔버스를 드래그해 여러 노드를 한 번에 더할 수 있다. 빈 캔버스를 그냥 드래그하면 화면이 이동한다.",
          },
          topNav: {
            editor: "에디터",
          },
        }
      : {
          shellEyebrow: "Main interactive surface",
          shellTitle: "Touch the HyperFlow editor first",
          shellBody: "Add a node, drag it, connect handles, and delete the current selection.",
          canvasLabel: "HyperFlow main editor",
          docsButton: "Open Learn docs",
          controls: {
            addNode: "Add node",
            toggleBenchmarkOn: "Open benchmark graph",
            toggleBenchmarkOff: "Return to starter graph",
            deleteSelection: "Delete selection",
            resetPerf: "Reset perf readout",
            fit: "Fit view",
            zoomOut: "Zoom out",
            zoomIn: "Zoom in",
            save: "Save",
            restore: "Restore",
          },
          status: {
            graph: "Graph",
            perfBaseline: "Perf baseline",
            perfBaselineStatus: "Baseline status",
            nodes: "Nodes",
            edges: "Edges",
            zoom: "Zoom",
            fps: "FPS",
            render: "Render",
            viewport: "Viewport",
            inputLatency: "Input→frame",
            avgRender: "Avg render",
            avgViewport: "Avg viewport",
            avgInputLatency: "Avg input",
            peakInputLatency: "Peak input",
            visible: "Visible",
            samples: "Frames",
            frameBudget: "Budget misses",
            activity: "Activity",
            pendingPerf: "Sampling",
            idle: "Idle",
            dragging: "Dragging",
            zooming: "Zooming",
            settling: "Settling",
            starterGraph: "Starter",
            benchmarkGraph: "Benchmark",
            warming: "Warming",
            within: "Within",
            over: "Over",
            shortcuts:
              "N adds nodes · Shift+click multi-select · Delete removes · drag an edge endpoint or click a handle to reconnect · Esc clears selection · ⌘/Ctrl+0 fits view · ⌘/Ctrl+S saves",
          },
          inspector: {
            eyebrow: "Selected item",
            empty: "Select a node or edge on the canvas to inspect what is active right now.",
            field: "Title",
            apply: "Apply",
            deleteNode: "Delete node",
            deleteEdge: "Delete edge",
            edgeLabel: "Selected edge",
            edgeHint: "Use handles to create connections, drag the line itself to reroute it, or double-click the line to reset the bend before deleting it.",
            saved: "Saved snapshot",
            notSaved: "No saved snapshot yet.",
            multiSelectedSuffix: "nodes selected",
            multiHint: "Use Shift+click to add or remove nodes from the current selection, or Shift-drag across empty canvas to add multiple nodes at once. Drag empty canvas space to pan the viewport.",
          },
          topNav: {
            editor: "Editor",
          },
        };

  const perfBaseline = editorPerfBaselines[graphPreset];
  const perfBaselineEvaluation = evaluatePerfBaseline(perfReadout, perfBaseline);
  const perfBaselineStatus = perfBaselineEvaluation.status;
  const perfBaselineTarget = formatPerfBaselineTarget(perfBaseline);
  const deferredMinimapNodes = useDeferredValue(nodes);
  const deferredMinimapEdges = useDeferredValue(edges);
  const deferredMinimapViewport = useDeferredValue(viewport);
  const shouldDeferMiniMap =
    graphPreset === "benchmark" &&
    (perfReadout.interactionPhase === "dragging" || perfReadout.interactionPhase === "zooming");
  const minimapNodes = shouldDeferMiniMap ? deferredMinimapNodes : nodes;
  const minimapEdges = shouldDeferMiniMap ? deferredMinimapEdges : edges;
  const minimapViewport = shouldDeferMiniMap ? deferredMinimapViewport : viewport;

  const fitView = useCallback(() => {
    hasUserAdjustedViewportRef.current = true;
    setViewport(
      fitPocViewportToNodes(nodes, {
        width: editorCanvasSize.width,
        height: editorCanvasSize.height,
        padding: graphPreset === "benchmark" ? 128 : 96,
        minZoom: graphPreset === "benchmark" ? 0.18 : 0.35,
        maxZoom: 1.4,
      }),
    );
  }, [editorCanvasSize.height, editorCanvasSize.width, graphPreset, nodes]);

  const zoom = useCallback((delta: number) => {
    hasUserAdjustedViewportRef.current = true;
    setViewport((current) =>
      createPocViewport(current.width, current.height, {
        x: current.x,
        y: current.y,
        zoom: Math.max(0.3, Math.min(current.zoom + delta, 1.8)),
      }),
    );
  }, []);

  const handleViewportChange = useCallback((nextViewport: PocViewport) => {
    hasUserAdjustedViewportRef.current = true;
    setViewport(nextViewport);
  }, []);

  function addNode() {
    const currentNodes = nodesRef.current;
    const nextNodeId = getNextLearnDemoNodeId(currentNodes);
    const nextPosition = findNextNodePlacement(currentNodes, viewportRef.current);
    const nextNodes = [
      ...currentNodes,
      createLearnDemoNode(nextNodeId, { position: nextPosition, index: currentNodes.length }),
    ];

    nodesRef.current = nextNodes;
    setNodes(nextNodes);

    pendingTitleFocusNodeIdRef.current = nextNodeId;
    setSelectedNodeIds([nextNodeId]);
    onSelectionChange({ nodeId: nextNodeId });
    setSelectedEdgeId(null);
  }

  function loadGraphPreset(nextPreset: EditorGraphPreset) {
    const nextGraph =
      nextPreset === "benchmark"
        ? createBenchmarkGraph()
        : { nodes: cloneLearnDemoNodes(), edges: cloneLearnDemoEdges() };

    hasUserAdjustedViewportRef.current = true;
    setGraphPreset(nextPreset);
    nodesRef.current = nextGraph.nodes;
    setNodes(nextGraph.nodes);
    setEdges(nextGraph.edges);
    setSelectedNodeIds([]);
    setSelectedEdgeId(null);
    onSelectionChange({ nodeId: null });
    setSavedSnapshot(null);
    resetPerfSampling();
    setViewport(
      fitPocViewportToNodes(nextGraph.nodes, {
        width: editorCanvasSize.width,
        height: editorCanvasSize.height,
        padding: nextPreset === "benchmark" ? 128 : 96,
        minZoom: 0.18,
        maxZoom: 1.4,
      }),
    );
  }

  const getResolvedSelectedNodeIds = useCallback(() => {
    if (selectedNodeIds.length > 0) return selectedNodeIds.map((id) => Number(id));
    return selection.nodeId !== null ? [Number(selection.nodeId)] : [];
  }, [selectedNodeIds, selection.nodeId]);

  const applyNodeSelection = useCallback((nodeIds: number[]) => {
    const uniqueIds = Array.from(new Set(nodeIds.map((id) => Number(id))));
    setSelectedNodeIds(uniqueIds);
    onSelectionChange({ nodeId: uniqueIds[0] ?? null });
    if (uniqueIds.length > 0) setSelectedEdgeId(null);
  }, [onSelectionChange]);

  const handleNodeSelect = useCallback((nodeId: number | null, options?: { additive?: boolean }) => {
    if (!options?.additive) {
      applyNodeSelection(nodeId !== null ? [nodeId] : []);
      return;
    }

    if (nodeId === null) return;
    const currentIds = getResolvedSelectedNodeIds();
    const nextIds = currentIds.includes(Number(nodeId))
      ? currentIds.filter((id) => Number(id) !== Number(nodeId))
      : [...currentIds, Number(nodeId)];
    applyNodeSelection(nextIds);
  }, [applyNodeSelection, getResolvedSelectedNodeIds]);

  const handleNodeSelectionBoxChange = useCallback((nodeIds: number[], options?: { additive?: boolean }) => {
    if (!options?.additive) {
      applyNodeSelection(nodeIds);
      return;
    }

    const currentIds = getResolvedSelectedNodeIds();
    applyNodeSelection([...currentIds, ...nodeIds]);
  }, [applyNodeSelection, getResolvedSelectedNodeIds]);

  function deleteSelected() {
    if (selectedEdgeId) {
      setEdges((current) => current.filter((edge) => edge.id !== selectedEdgeId));
      setSelectedEdgeId(null);
      return;
    }

    const nodeIdsToDelete =
      selectedNodeIds.length > 0
        ? selectedNodeIds.map((id) => Number(id))
        : selectedNode
          ? [Number(selectedNode.id)]
          : [];
    if (nodeIdsToDelete.length === 0) return;

    setNodes((current) => current.filter((node) => !nodeIdsToDelete.includes(Number(node.id))));
    setEdges((current) =>
      current.filter(
        (edge) =>
          !nodeIdsToDelete.includes(Number(edge.source)) &&
          !nodeIdsToDelete.includes(Number(edge.target)),
      ),
    );
    setSelectedNodeIds([]);
    onSelectionChange({ nodeId: null });
  }

  function applyTitle() {
    if (!selectedNode || selectedNodeIds.length > 1) return;
    updateNodeData(setNodes, selectedNode.id, (node) => ({
      data: {
        ...node.data,
        title: titleDraft.trim() || node.data.title,
      },
    }));
  }

  function saveSnapshot() {
    setSavedSnapshot({
      nodes: nodes.map((node) => ({
        ...node,
        position: { ...node.position },
        size: { ...node.size },
        data: { ...node.data },
      })),
      edges: edges.map((edge) => ({
        ...edge,
        bend: edge.bend ? { ...edge.bend } : edge.bend ?? null,
      })),
      viewport: { ...viewport },
    });
  }

  function restoreSnapshot() {
    if (!savedSnapshot) return;
    setNodes(
      savedSnapshot.nodes.map((node) => ({
        ...node,
        position: { ...node.position },
        size: { ...node.size },
        data: { ...node.data },
      })),
    );
    setEdges(
      savedSnapshot.edges.map((edge) => ({
        ...edge,
        bend: edge.bend ? { ...edge.bend } : edge.bend ?? null,
      })),
    );
    setViewport({ ...savedSnapshot.viewport });
    setSelectedNodeIds([]);
    onSelectionChange({ nodeId: null });
    setSelectedEdgeId(null);
  }

  return (
    <main
      ref={editorShellRef}
      className="editor-shell"
      tabIndex={-1}
      onPointerDownCapture={() => {
        markEditorInteraction("dragging");
        editorShellRef.current?.focus();
      }}
      onPointerMoveCapture={(event) => {
        if (event.buttons > 0) {
          markEditorInteraction("dragging");
        }
      }}
      onWheelCapture={() => {
        markEditorInteraction("zooming");
      }}
    >
      <header className="editor-topbar">
        <div className="editor-topbar-inner">
          <div className="editor-brand-lockup">
            <span className="editor-brand">{copy.brand}</span>
            <span className="editor-brand-route">{ui.topNav.editor}</span>
          </div>
          <div className="editor-topbar-right">
            <nav className="editor-topnav" aria-label="Primary">
              <button type="button" className="is-active">
                {getEditorRouteLabel(locale)}
              </button>
              {sectionOrder.map((sectionId) => (
                <button key={sectionId} type="button" onClick={() => onOpenSection(sectionId)}>
                  {copy.topNav[sectionId]}
                </button>
              ))}
            </nav>
            <div className="lang-toggle" aria-label="Language toggle">
              <button type="button" className={locale === "ko" ? "is-active" : ""} onClick={() => onSwitchLocale("ko")}>
                {copy.lang.ko}
              </button>
              <button type="button" className={locale === "en" ? "is-active" : ""} onClick={() => onSwitchLocale("en")}>
                {copy.lang.en}
              </button>
            </div>
          </div>
        </div>
      </header>

      <section className="editor-layout">
        <div className="editor-main">
          <section className="editor-shell-header">
            <div className="editor-shell-copy">
              <p className="editor-eyebrow">{ui.shellEyebrow}</p>
              <h1>{ui.shellTitle}</h1>
              <p>{ui.shellBody}</p>
            </div>
            <button type="button" className="editor-docs-link" onClick={onOpenDocs}>
              {ui.docsButton}
            </button>
          </section>

          <section className="editor-canvas-shell" aria-label={ui.canvasLabel}>
            <div ref={editorCanvasFrameRef} className="editor-canvas-frame">
              <div className="editor-canvas-overlay editor-canvas-overlay-left">
                <div className="editor-toolbar-group">
                  <EditorControlButton label={ui.controls.addNode} onClick={addNode}>
                    <IconPlus />
                  </EditorControlButton>
                  <EditorControlButton
                    label={graphPreset === "starter" ? ui.controls.toggleBenchmarkOn : ui.controls.toggleBenchmarkOff}
                    onClick={() => loadGraphPreset(graphPreset === "starter" ? "benchmark" : "starter")}
                  >
                    {graphPreset === "starter" ? "96" : "3"}
                  </EditorControlButton>
                  <EditorControlButton
                    label={ui.controls.deleteSelection}
                    tone="danger"
                    onClick={deleteSelected}
                    disabled={!selectedNode && !selectedEdgeId}
                  >
                    <IconTrash />
                  </EditorControlButton>
                  <EditorControlButton label={ui.controls.resetPerf} onClick={resetPerfSampling}>
                    <IconPulse />
                  </EditorControlButton>
                </div>
              </div>
              <div className="editor-canvas-controls" aria-label={locale === "ko" ? "캔버스 컨트롤" : "Canvas controls"}>
                <div className="editor-toolbar-group editor-toolbar-group-vertical">
                  <EditorControlButton label={ui.controls.fit} onClick={fitView}>
                    <IconFit />
                  </EditorControlButton>
                  <EditorControlButton label={ui.controls.zoomOut} onClick={() => zoom(-0.1)}>
                    <IconMinus />
                  </EditorControlButton>
                  <EditorControlButton label={ui.controls.zoomIn} onClick={() => zoom(0.1)}>
                    <IconSearchPlus />
                  </EditorControlButton>
                </div>
                <div className="editor-toolbar-group editor-toolbar-group-vertical">
                  <EditorControlButton label={ui.controls.save} onClick={saveSnapshot}>
                    <IconSave />
                  </EditorControlButton>
                  <EditorControlButton label={ui.controls.restore} onClick={restoreSnapshot} disabled={!savedSnapshot}>
                    <IconRestore />
                  </EditorControlButton>
                </div>
              </div>
              <div className="editor-canvas-status">
                <span data-editor-perf="graph">
                  {ui.status.graph}: {graphPreset === "starter" ? ui.status.starterGraph : ui.status.benchmarkGraph}
                </span>
                <span data-editor-perf="baseline-target">
                  {ui.status.perfBaseline}: {perfBaselineTarget}
                </span>
                <span data-editor-perf="baseline-status">
                  {ui.status.perfBaselineStatus}: {ui.status[perfBaselineStatus]}
                </span>
                <span data-editor-perf="baseline-detail">{perfBaselineEvaluation.detail}</span>
                <span>
                  {ui.status.nodes}: {nodes.length}
                </span>
                <span>
                  {ui.status.edges}: {edges.length}
                </span>
                <span>
                  {ui.status.zoom}: {Math.round(viewport.zoom * 100)}%
                </span>
                <span data-editor-perf="activity">
                  {ui.status.activity}: {ui.status[perfReadout.interactionPhase]}
                </span>
                <span data-editor-perf="fps">
                  {ui.status.fps}: {perfReadout.fps ?? ui.status.pendingPerf}
                </span>
                <span data-editor-perf="render">
                  {ui.status.render}: {perfReadout.renderMs === null ? ui.status.pendingPerf : `${perfReadout.renderMs.toFixed(1)}ms`}
                </span>
                <span data-editor-perf="viewport">
                  {ui.status.viewport}: {perfReadout.viewportMs === null ? ui.status.pendingPerf : `${perfReadout.viewportMs.toFixed(1)}ms`}
                </span>
                <span data-editor-perf="input-latency">
                  {ui.status.inputLatency}:{" "}
                  {perfReadout.inputLatencyMs === null ? "--" : `${perfReadout.inputLatencyMs.toFixed(1)}ms`}
                </span>
                <span data-editor-perf="samples">
                  {ui.status.samples}: {perfReadout.frameSampleCount}
                </span>
                <span data-editor-perf="visible">
                  {ui.status.visible}: {perfReadout.visibleCount}/{perfReadout.fixtureSize}
                </span>
                <span data-editor-perf="avg-render">
                  {ui.status.avgRender}: {perfReadout.avgRenderMs === null ? "--" : `${perfReadout.avgRenderMs.toFixed(1)}ms`}
                </span>
                <span data-editor-perf="avg-viewport">
                  {ui.status.avgViewport}:{" "}
                  {perfReadout.avgViewportMs === null ? "--" : `${perfReadout.avgViewportMs.toFixed(1)}ms`}
                </span>
                <span data-editor-perf="avg-input-latency">
                  {ui.status.avgInputLatency}:{" "}
                  {perfReadout.avgInputLatencyMs === null ? "--" : `${perfReadout.avgInputLatencyMs.toFixed(1)}ms`}
                </span>
                <span data-editor-perf="peak-input-latency">
                  {ui.status.peakInputLatency}:{" "}
                  {perfReadout.peakInputLatencyMs === null ? "--" : `${perfReadout.peakInputLatencyMs.toFixed(1)}ms`}
                </span>
                <span data-editor-perf="frame-budget">
                  {ui.status.frameBudget}: {perfReadout.budgetMissCount}/{perfReadout.frameSampleCount}
                </span>
                <span>{ui.status.shortcuts}</span>
              </div>
              <EditorMiniMap
                locale={locale}
                engine={editorEngine}
                nodes={minimapNodes}
                edges={minimapEdges}
                viewport={minimapViewport}
                onViewportChange={handleViewportChange}
              />
              <HyperFlowPocCanvas
                engine={editorEngine}
                className="hf-main-editor-canvas"
                nodes={nodes}
                edges={edges}
                viewport={viewport}
                width={editorCanvasSize.width}
                height={editorCanvasSize.height}
                selectedNodeId={selection.nodeId}
                selectedNodeIds={selectedNodeIds}
                selectedEdgeId={selectedEdgeId}
                nodeRenderers={canvasNodeRenderers}
                getNodeRendererKey={getCanvasNodeRendererKey}
                getNodeRendererData={getCanvasNodeRendererData}
                getNodeAnchorPreferences={getEditorNodeAnchorPreferences}
                onNodeSelect={handleNodeSelect}
                onNodeSelectionBoxChange={handleNodeSelectionBoxChange}
                onEdgeSelect={handleCanvasEdgeSelect}
                onNodePositionChange={handleCanvasNodePositionChange}
                onNodesPositionChange={handleCanvasNodesPositionChange}
                onEdgeConnect={handleCanvasEdgeConnect}
                onEdgeReconnect={handleCanvasEdgeReconnect}
                onEdgeBendChange={handleCanvasEdgeBendChange}
                onViewportChange={handleViewportChange}
                onMetricsChange={handleMetricsChange}
                interactive
              />
            </div>
          </section>
        </div>

        <aside className="editor-sidebar">
          <div className="editor-inspector-card">
            <p className="editor-inspector-label">{ui.inspector.eyebrow}</p>
            {selectedNodeIds.length > 1 ? (
              <div className="editor-edge-card">
                <h2>
                  {selectedNodeIds.length} {ui.inspector.multiSelectedSuffix}
                </h2>
                <p>{ui.inspector.multiHint}</p>
                <button type="button" onClick={deleteSelected}>
                  {ui.inspector.deleteNode}
                </button>
              </div>
            ) : selectedNode ? (
              <>
                <h2>{selectedNode.data.title}</h2>
                <label className="editor-field">
                  <span>{ui.inspector.field}</span>
                  <input
                    ref={titleInputRef}
                    value={titleDraft}
                    onChange={(event) => setTitleDraft(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key !== "Enter") return;
                      event.preventDefault();
                      applyTitle();
                    }}
                  />
                </label>
                <div className="editor-inspector-actions">
                  <button type="button" onClick={applyTitle}>
                    {ui.inspector.apply}
                  </button>
                  <button type="button" onClick={deleteSelected}>
                    {ui.inspector.deleteNode}
                  </button>
                </div>
              </>
            ) : selectedEdgeId ? (
              <div className="editor-edge-card">
                <h2>{ui.inspector.edgeLabel}</h2>
                <p>{selectedEdgeId}</p>
                <button type="button" onClick={deleteSelected}>
                  {ui.inspector.deleteEdge}
                </button>
              </div>
            ) : (
              <p className="editor-empty">{ui.inspector.empty}</p>
            )}
            <p className="editor-hint">{ui.inspector.edgeHint}</p>
          </div>

          <div className="editor-inspector-card">
            <p className="editor-inspector-label">{ui.inspector.saved}</p>
            <pre className="editor-snapshot">
              {savedSnapshot
                ? JSON.stringify(
                    {
                      nodes: savedSnapshot.nodes.map((node) => ({
                        id: node.id,
                        title: node.data.title,
                        x: Math.round(node.position.x),
                        y: Math.round(node.position.y),
                      })),
                      edges: savedSnapshot.edges.map((edge) => ({
                        source: edge.source,
                        target: edge.target,
                        bend: edge.bend
                          ? {
                              x: Math.round(edge.bend.x),
                              y: Math.round(edge.bend.y),
                            }
                          : null,
                      })),
                      viewport: {
                        x: Math.round(savedSnapshot.viewport.x),
                        y: Math.round(savedSnapshot.viewport.y),
                        zoom: Number(savedSnapshot.viewport.zoom.toFixed(2)),
                      },
                    },
                    null,
                    2,
                  )
                : ui.inspector.notSaved}
            </pre>
          </div>
        </aside>
      </section>
    </main>
  );
}

function LearnInteractiveDemo({
  locale,
  mode,
}: {
  locale: Locale;
  mode: "nodes-and-edges" | "selection-and-editing" | "viewport" | "basic-interactions" | "save-and-restore";
}) {
  const [nodes, setNodes] = useWorkflowNodesState<LearnDemoNode>(cloneLearnDemoNodes());
  const [edges, setEdges] = useWorkflowEdgesState<LearnDemoEdge>(cloneLearnDemoEdges());
  const [selection, , onSelectionChange] = useWorkflowSelection({ nodeId: null });
  const selectedNode = useSelectedNode({ nodes, selection });
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [viewport, setViewport] = useState<PocViewport>(() =>
    fitPocViewportToNodes(cloneLearnDemoNodes(), {
      width: learnDemoCanvas.width,
      height: learnDemoCanvas.height,
      padding: 48,
      minZoom: 0.6,
      maxZoom: 1.2,
    }),
  );
  const [titleDraft, setTitleDraft] = useState("");
  const [savedSnapshot, setSavedSnapshot] = useState<{
    nodes: LearnDemoNode[];
    edges: LearnDemoEdge[];
    viewport: PocViewport;
  } | null>(null);

  useEffect(() => {
    setTitleDraft(selectedNode?.data.title ?? "");
  }, [selectedNode?.data.title, selectedNode?.id]);

  const copy =
    locale === "ko"
      ? {
          eyebrow:
            mode === "nodes-and-edges" || mode === "selection-and-editing" || mode === "viewport"
              ? "직접 조작 demo"
              : "보조 proof",
          title:
            mode === "nodes-and-edges"
              ? "노드와 엣지를 바로 만져보는 live canvas"
              : mode === "selection-and-editing"
                ? "선택과 수정 흐름을 직접 확인하는 live canvas"
                : mode === "viewport"
                  ? "뷰포트를 직접 움직여보는 live canvas"
                  : mode === "basic-interactions"
              ? "설명을 읽은 뒤 바로 만져볼 수 있는 기본 editor demo"
              : "설명을 읽은 뒤 저장과 복원을 직접 확인하는 demo",
          body:
            mode === "nodes-and-edges"
              ? "이 페이지의 핵심은 정적인 그림이 아니라 직접 조작이다. 노드를 추가하고, 잡아 움직이고, 핸들을 눌러 edge를 연결하면서 box와 line이 실제로 어떻게 작동하는지 바로 느껴보면 된다."
              : mode === "selection-and-editing"
                ? "캔버스에서 node를 고르고 오른쪽에서 제목을 바꾼 뒤 다시 반영하는 흐름을 직접 확인하면 된다."
                : mode === "viewport"
                  ? "빈 공간을 드래그해서 pan 하고, 확대·축소와 맞춤 보기를 눌러 viewport가 어떻게 움직이는지 직접 확인하면 된다."
                  : mode === "basic-interactions"
              ? "주 설명은 위 문단이 담당한다. 아래 demo에서는 캔버스 안의 노드 추가, 직접 드래그, edge 연결, 선택 삭제가 지금 어느 수준까지 되는지만 손으로 확인하면 된다."
              : "주 설명은 위 문단이 담당한다. 아래 demo에서는 노드/엣지/viewport를 저장했다가 다시 돌려놓는 감각이 현재 어떻게 보이는지 직접 확인하면 된다.",
          aria:
            mode === "nodes-and-edges"
              ? "노드와 엣지 live demo"
              : mode === "selection-and-editing"
                ? "선택과 수정 live demo"
                : mode === "viewport"
                  ? "뷰포트 live demo"
                  : mode === "basic-interactions"
                    ? "기본 상호작용 보조 demo"
                    : "저장과 복원 보조 demo",
          toolbar: {
            canvas: "캔버스 조작",
            fit: "맞춤 보기",
            zoomIn: "확대",
            zoomOut: "축소",
            addNode: "노드 추가",
            deleteSelection: "선택 삭제",
            save: "저장",
            restore: "복원",
          },
          inspector: {
            title: "선택된 항목",
            empty: "캔버스에서 노드를 클릭하면 여기서 제목을 바꾸고 다시 반영할 수 있다.",
            field: "제목",
            apply: "적용",
            deleteNode: "노드 삭제",
            deleteEdge: "엣지 삭제",
            saved: "저장된 데이터",
            notSaved: "아직 저장된 스냅샷이 없다.",
            connectHint: "오른쪽 점을 눌러 시작하고 다른 노드의 왼쪽 점을 눌러 연결한다.",
            edgeLabel: "선택된 엣지",
            edgeEmpty: "엣지를 클릭해 선택하고, 선 자체를 끌어 경로를 바꾸거나 더블클릭으로 굴곡을 초기화할 수 있다.",
          },
        }
      : {
          eyebrow:
            mode === "nodes-and-edges" || mode === "selection-and-editing" || mode === "viewport"
              ? "Live demo"
              : "Supporting proof",
          title:
            mode === "nodes-and-edges"
              ? "A live canvas for touching nodes and edges directly"
              : mode === "selection-and-editing"
                ? "A live canvas for feeling the select-and-edit loop directly"
                : mode === "viewport"
                  ? "A live canvas for moving the viewport directly"
                  : mode === "basic-interactions"
              ? "A small editor demo you can touch after reading the explanation"
              : "A small save-and-restore demo you can verify after reading the explanation",
          body:
            mode === "nodes-and-edges"
              ? "This page should not stop at a static picture. Add nodes, drag them around, and connect handles so you can feel how boxes and lines actually behave on the canvas."
              : mode === "selection-and-editing"
                ? "Pick a node on the canvas, rename it on the right, and push that change back so the edit loop is something you can actually feel."
                : mode === "viewport"
                  ? "Pan empty space, zoom in and out, and use fit view so the viewport reads like something you can move rather than just something to read about."
                  : mode === "basic-interactions"
              ? "The main explanation lives in the text above. Use the demo below only to feel the current level of in-canvas add, direct drag, edge creation, and delete behavior."
              : "The main explanation lives in the text above. Use the demo below to verify how nodes, edges, and viewport come back together after save and restore.",
          aria:
            mode === "nodes-and-edges"
              ? "Nodes and edges live demo"
              : mode === "selection-and-editing"
                ? "Selection and editing live demo"
                : mode === "viewport"
                  ? "Viewport live demo"
                  : mode === "basic-interactions"
                    ? "Basic interactions supporting demo"
                    : "Save and restore supporting demo",
          toolbar: {
            canvas: "Canvas controls",
            fit: "Fit view",
            zoomIn: "Zoom in",
            zoomOut: "Zoom out",
            addNode: "Add node",
            deleteSelection: "Delete selection",
            save: "Save",
            restore: "Restore",
          },
          inspector: {
            title: "Selected item",
            empty: "Click a node on the canvas to rename it and push the change back.",
            field: "Title",
            apply: "Apply",
            deleteNode: "Delete node",
            deleteEdge: "Delete edge",
            saved: "Saved snapshot",
            notSaved: "No saved snapshot yet.",
            connectHint: "Click a right handle to start, then a left handle on another node to connect them.",
            edgeLabel: "Selected edge",
            edgeEmpty: "Click an edge to select it, drag the line itself to reroute it, or double-click to reset the bend.",
          },
        };

  function clampZoom(nextZoom: number) {
    return Math.max(0.45, Math.min(nextZoom, 1.75));
  }

  function fitView() {
    setViewport(
      fitPocViewportToNodes(nodes, {
        width: learnDemoCanvas.width,
        height: learnDemoCanvas.height,
        padding: 48,
        minZoom: 0.6,
        maxZoom: 1.2,
      }),
    );
  }

  function zoom(delta: number) {
    setViewport((current) =>
      createPocViewport(current.width, current.height, {
        x: current.x,
        y: current.y,
        zoom: clampZoom(current.zoom + delta),
      }),
    );
  }

  function applyTitle() {
    if (!selectedNode) return;
    updateNodeData(setNodes, selectedNode.id, (node) => ({
      data: {
        ...node.data,
        title: titleDraft.trim() || node.data.title,
      },
    }));
  }

  function addNode() {
    const nextId = getNextLearnDemoNodeId(nodes);
    const nextPosition = findNextNodePlacement(nodes, viewport);
    setNodes((current) => [...current, createLearnDemoNode(nextId, { position: nextPosition, index: current.length })]);
    onSelectionChange({ nodeId: nextId });
    setSelectedEdgeId(null);
  }

  function deleteSelected() {
    if (selectedEdgeId) {
      setEdges((current) => current.filter((edge) => edge.id !== selectedEdgeId));
      setSelectedEdgeId(null);
      return;
    }

    if (!selectedNode) return;

    setNodes((current) => current.filter((node) => Number(node.id) !== Number(selectedNode.id)));
    setEdges((current) =>
      current.filter(
        (edge) => Number(edge.source) !== Number(selectedNode.id) && Number(edge.target) !== Number(selectedNode.id),
      ),
    );
    onSelectionChange({ nodeId: null });
  }

  function saveSnapshot() {
    setSavedSnapshot({
      nodes: nodes.map((node) => ({
        ...node,
        position: { ...node.position },
        size: { ...node.size },
        data: { ...node.data },
      })),
      edges: edges.map((edge) => ({
        ...edge,
        bend: edge.bend ? { ...edge.bend } : edge.bend ?? null,
      })),
      viewport: { ...viewport },
    });
  }

  function restoreSnapshot() {
    if (!savedSnapshot) return;
    setNodes(
      savedSnapshot.nodes.map((node) => ({
        ...node,
        position: { ...node.position },
        size: { ...node.size },
        data: { ...node.data },
      })),
    );
    setEdges(
      savedSnapshot.edges.map((edge) => ({
        ...edge,
        bend: edge.bend ? { ...edge.bend } : edge.bend ?? null,
      })),
    );
    setViewport({ ...savedSnapshot.viewport });
    onSelectionChange({ nodeId: null });
    setSelectedEdgeId(null);
  }

  const showInspector = mode !== "nodes-and-edges" && mode !== "viewport";
  const showSaveRestore = mode === "save-and-restore";
  const showDeleteChrome = mode !== "viewport";
  const showAddChrome = mode !== "viewport";

  return (
    <section className="learn-live-card" aria-label={copy.aria}>
      <div className="learn-visual-copy">
        <p className="learn-visual-eyebrow">{copy.eyebrow}</p>
        <h2>{copy.title}</h2>
        <p>{copy.body}</p>
      </div>

      <div className="learn-live-shell">
        <div className="learn-live-canvas">
          <div className="learn-live-canvas-chrome" aria-label={copy.toolbar.canvas}>
            <div className="learn-live-toolbar-group">
              {showAddChrome ? (
                <button type="button" onClick={addNode}>
                  {copy.toolbar.addNode}
                </button>
              ) : null}
              {showDeleteChrome ? (
                <button type="button" onClick={deleteSelected} disabled={!selectedNode && !selectedEdgeId}>
                  {copy.toolbar.deleteSelection}
                </button>
              ) : null}
            </div>
            <div className="learn-live-toolbar-group">
              <button type="button" onClick={fitView}>
                {copy.toolbar.fit}
              </button>
              <button type="button" onClick={() => zoom(-0.15)}>
                {copy.toolbar.zoomOut}
              </button>
              <button type="button" onClick={() => zoom(0.15)}>
                {copy.toolbar.zoomIn}
              </button>
              {showSaveRestore ? (
                <>
                  <button type="button" onClick={saveSnapshot}>
                    {copy.toolbar.save}
                  </button>
                  <button type="button" onClick={restoreSnapshot} disabled={!savedSnapshot}>
                    {copy.toolbar.restore}
                  </button>
                </>
              ) : null}
            </div>
          </div>
          <HyperFlowPocCanvas
            className="hf-learn-demo-canvas"
            nodes={nodes}
            edges={edges}
            viewport={viewport}
            width={learnDemoCanvas.width}
            height={learnDemoCanvas.height}
            selectedNodeId={selection.nodeId}
            selectedEdgeId={selectedEdgeId}
            getNodeAnchorPreferences={getEditorNodeAnchorPreferences}
            onNodeSelect={(nodeId) => {
              onSelectionChange({ nodeId });
              if (nodeId !== null) setSelectedEdgeId(null);
            }}
            onEdgeSelect={(edgeId) => {
              setSelectedEdgeId(edgeId);
              if (edgeId !== null) onSelectionChange({ nodeId: null });
            }}
            onNodePositionChange={(nodeId, nextPosition) => {
              updateNodeData(setNodes, nodeId, () => ({
                position: nextPosition,
              }));
            }}
            onNodesPositionChange={(updates) => {
              applyNodePositionUpdates(setNodes, updates);
            }}
            onEdgeConnect={(sourceNodeId, targetNodeId) => {
              setEdges((current) =>
                appendLearnDemoEdge(current, sourceNodeId, targetNodeId, {
                  toggleExisting: false,
                }),
              );
            }}
            onEdgeReconnect={(edgeId, next) => {
              setEdges((current) => reconnectLearnDemoEdge(current, edgeId, next));
            }}
            onEdgeBendChange={(edgeId, nextBend) => {
              setEdges((current) =>
                current.map((edge) =>
                  edge.id === edgeId
                    ? {
                        ...edge,
                        bend: nextBend ? { ...nextBend } : null,
                      }
                    : edge,
                ),
              );
            }}
            onViewportChange={setViewport}
            interactive
          />
        </div>

        {showInspector ? (
          <aside className="learn-live-inspector">
            <p className="learn-live-inspector-label">{copy.inspector.title}</p>
            {selectedNode ? (
              <>
                <h3>{selectedNode.data.title}</h3>
                <label className="learn-live-field">
                  <span>{copy.inspector.field}</span>
                  <input value={titleDraft} onChange={(event) => setTitleDraft(event.target.value)} />
                </label>
                <div className="learn-live-inspector-actions">
                  <button type="button" onClick={applyTitle}>
                    {copy.inspector.apply}
                  </button>
                  <button type="button" onClick={deleteSelected}>
                    {copy.inspector.deleteNode}
                  </button>
                </div>
              </>
            ) : selectedEdgeId ? (
              <div className="learn-live-edge-details">
                <h3>{copy.inspector.edgeLabel}</h3>
                <p className="learn-live-edge-id">{selectedEdgeId}</p>
                <button type="button" onClick={deleteSelected}>
                  {copy.inspector.deleteEdge}
                </button>
              </div>
            ) : (
              <>
                <p className="learn-live-empty">{copy.inspector.empty}</p>
                <p className="learn-live-empty learn-live-edge-empty">{copy.inspector.edgeEmpty}</p>
              </>
            )}
            <p className="learn-live-connect-hint">{copy.inspector.connectHint}</p>

            {showSaveRestore ? (
              <div className="learn-live-saved">
                <p className="learn-live-inspector-label">{copy.inspector.saved}</p>
                <pre>
                  {savedSnapshot
                    ? JSON.stringify(
                        {
                          nodes: savedSnapshot.nodes.map((node) => ({
                            id: node.id,
                            title: node.data.title,
                            x: node.position.x,
                            y: node.position.y,
                          })),
                          edges: savedSnapshot.edges.map((edge) => ({
                            source: edge.source,
                            target: edge.target,
                            bend: edge.bend
                              ? {
                                  x: Math.round(edge.bend.x),
                                  y: Math.round(edge.bend.y),
                                }
                              : null,
                          })),
                          viewport: {
                            x: savedSnapshot.viewport.x,
                            y: savedSnapshot.viewport.y,
                            zoom: Number(savedSnapshot.viewport.zoom.toFixed(2)),
                          },
                        },
                        null,
                        2,
                      )
                    : copy.inspector.notSaved}
                </pre>
              </div>
            ) : null}
          </aside>
        ) : null}
      </div>
    </section>
  );
}

function LearnEditorBridgeCard({ locale, onOpenEditor }: { locale: Locale; onOpenEditor: () => void }) {
  const copy =
    locale === "ko"
      ? {
          eyebrow: "메인 editor로 이동",
          title: "이 개념은 mini preview보다 메인 editor에서 먼저 느끼는 편이 낫다",
          body:
            "노드와 엣지, 선택과 수정, 뷰포트 감각은 `/:locale` 메인 editor에서 직접 조작하면서 이해하는 편이 자연스럽다. Learn은 그 조작을 읽는 supporting docs로 보면 된다.",
          button: "메인 editor 열기",
        }
      : {
          eyebrow: "Open the main editor",
          title: "This concept reads better after you touch the main editor first",
          body:
            "Nodes and edges, selection and editing, and viewport behavior make more sense in the `/:locale` main editor than in a cramped mini preview. Learn works better as supporting docs after that.",
          button: "Open main editor",
        };

  return (
    <section className="learn-editor-bridge">
      <p className="learn-visual-eyebrow">{copy.eyebrow}</p>
      <h2>{copy.title}</h2>
      <p>{copy.body}</p>
      <button type="button" className="editor-docs-link" onClick={onOpenEditor}>
        {copy.button}
      </button>
    </section>
  );
}

function LearnVisualPreview({
  locale,
  pageId,
  onOpenEditor,
}: {
  locale: Locale;
  pageId: PageId;
  onOpenEditor: () => void;
}) {
  if (pageId === "nodes-and-edges" || pageId === "selection-and-editing" || pageId === "viewport") {
    return <LearnEditorBridgeCard locale={locale} onOpenEditor={onOpenEditor} />;
  }

  if (pageId === "basic-interactions") {
    return <LearnInteractiveDemo locale={locale} mode="basic-interactions" />;
  }

  if (pageId === "save-and-restore") {
    return <LearnInteractiveDemo locale={locale} mode="save-and-restore" />;
  }

  return null;
}

function LearnSidebar({
  title,
  pages,
  currentPage,
  copy,
  onGoToPage,
}: {
  title: string;
  pages: PageId[];
  currentPage: PageId;
  copy: Copy;
  onGoToPage: (pageId: PageId) => void;
}) {
  return (
    <nav className="learn-sidebar" aria-label="Learn navigation">
      <p className="learn-sidebar-title">{title}</p>
      {pages.map((pageId, index) => (
        <button key={pageId} type="button" className={currentPage === pageId ? "is-active" : ""} onClick={() => onGoToPage(pageId)}>
          <span className="learn-sidebar-index">{String(index + 1).padStart(2, "0")}</span>
          <span>{copy.pages[pageId].navLabel}</span>
        </button>
      ))}
    </nav>
  );
}

export function App() {
  const contentRef = useRef<HTMLElement | null>(null);
  const [route, setRoute] = useState<Route>(() =>
    typeof window === "undefined" ? { locale: "ko", kind: "editor" } : getRouteFromPath(window.location.pathname),
  );

  useEffect(() => {
    const syncFromLocation = () => {
      const nextRoute = getRouteFromPath(window.location.pathname);
      setRoute(nextRoute);
      const canonical = buildRoutePath(nextRoute);
      if (window.location.pathname !== canonical) {
        navigateTo(nextRoute, true);
      }
    };

    syncFromLocation();
    window.addEventListener("popstate", syncFromLocation);
    return () => window.removeEventListener("popstate", syncFromLocation);
  }, []);

  const locale = route.locale;
  const copy = copyByLocale[locale];
  const currentPage = route.kind === "docs" ? route.pageId : topLevelDefaultPage.learn;
  const current = copy.pages[currentPage];
  const currentSection = route.kind === "docs" ? pageMeta[currentPage].section : "learn";
  const visiblePages = sectionPages[currentSection];
  const currentIndex = route.kind === "docs" ? visiblePages.indexOf(currentPage) : -1;
  const previousPage = currentIndex > 0 ? visiblePages[currentIndex - 1] : null;
  const nextPage = currentIndex >= 0 && currentIndex < visiblePages.length - 1 ? visiblePages[currentIndex + 1] : null;

  const goToRoute = (nextRoute: Route, replace = false) => {
    setRoute(nextRoute);
    navigateTo(nextRoute, replace);
  };

  const goToPage = (pageId: PageId) => {
    goToRoute({ locale, kind: "docs", pageId });
  };

  const goToEditor = (nextLocale = locale) => {
    goToRoute({ locale: nextLocale, kind: "editor" });
  };

  const switchLocale = (nextLocale: Locale) => {
    if (route.kind === "editor") {
      goToEditor(nextLocale);
      return;
    }

    goToRoute({ locale: nextLocale, kind: "docs", pageId: currentPage });
  };

  useEffect(() => {
    if (route.kind === "docs") {
      contentRef.current?.scrollTo(0, 0);
    }
  }, [currentPage, currentSection, locale, route.kind]);

  useEffect(() => {
    if (typeof document === "undefined") return;

    if (route.kind === "editor") {
      document.title = locale === "ko" ? "HyperFlow 에디터" : "HyperFlow Editor";
      return;
    }

    document.title = `${current.title} — HyperFlow Learn`;
  }, [current.title, locale, route.kind]);

  if (route.kind === "editor") {
    return (
      <MainEditorSurface
        locale={locale}
        copy={copy}
        onOpenDocs={() => goToPage(topLevelDefaultPage.learn)}
        onOpenSection={(sectionId) => goToPage(topLevelDefaultPage[sectionId])}
        onSwitchLocale={switchLocale}
      />
    );
  }

  return (
    <main className="learn-shell">
      <header className="learn-topbar">
        <div className="learn-topbar-inner">
          <div className="learn-brand">{copy.brand}</div>
          <div className="learn-topbar-right">
            <nav className="learn-topnav" aria-label="Primary">
              <button type="button" onClick={() => goToEditor()}>
                {getEditorRouteLabel(locale)}
              </button>
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
        <LearnSidebar
          title={copy.sectionTitles[currentSection]}
          pages={visiblePages}
          currentPage={currentPage}
          copy={copy}
          onGoToPage={goToPage}
        />

        <article ref={contentRef} className="learn-content">
          <section className="learn-page-header">
            <p className="learn-eyebrow">{copy.sectionTitles[currentSection]}</p>
            <h1>{current.title}</h1>
          </section>

          {currentPage === "installation" ? <CommandGuide copy={copy.code} guide={copy.installationGuide} /> : null}
          <LearnVisualPreview locale={locale} pageId={currentPage} onOpenEditor={() => goToEditor()} />

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
