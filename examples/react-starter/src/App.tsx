import { Fragment, useEffect, useMemo, useState } from "react";

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
  | { type: "table"; headers: string[]; rows: string[][] }
  | { type: "code"; text: string };

type InlineSegment =
  | { type: "text"; text: string }
  | { type: "bold"; text: string }
  | { type: "code"; text: string };


const locales: Locale[] = ["ko", "en"];
const sectionOrder: SectionId[] = ["learn", "reference", "examples", "roadmap"];
const sectionPages: Record<SectionId, PageId[]> = {
  learn: [
    "what-is-hyperflow",
    "when-to-use",
    "installation",
    "nodes-and-edges",
    "selection-and-editing",
    "viewport",
    "basic-interactions",
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
      "what-is-hyperflow": {
        navLabel: "HyperFlow 소개",
        title: "HyperFlow 소개",
        markdown: `HyperFlow는 프론트엔드 팀이 자기 제품 안에 node editor나 workflow surface를 넣을 때 사용하는 foundation이다. 완성된 SaaS나 전체 editor product로 읽기보다, **기존 React 앱 안에 심는 기반 레이어**로 읽는 편이 정확하다.

## 한 줄 정의
> HyperFlow는 host app이 소유한 상태를 바탕으로, canvas와 runtime 경로를 연결해 주는 프론트엔드 foundation이다.

## 지금 바로 이해해야 할 것
- HyperFlow가 app shell 전체를 대신하지는 않는다.
- product UX, inspector, persistence는 host app이 만든다.
- HyperFlow는 canvas/runtime seam과 large-surface runtime path에 강점이 있다.
- 현재 repo는 broad authoring platform이 아니라 **narrow validated slice**를 설명한다.

## 이 문서를 읽는 추천 순서
1. 왜 HyperFlow가 있나
2. 설치하기
3. 노드와 엣지
4. 선택과 수정
5. 뷰포트
6. 기본 상호작용
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
- 에디터 상태를 제품 앱이 계속 직접 들고 있어야 할 때
- 캔버스와 제품 UI를 더 분리해서 보고 싶을 때
- 그래프가 커질수록 pan / zoom / selection 반응성이 더 중요해질 때
- 데모용 편집기가 아니라 **제품 안에 들어가는 화면**을 만들고 싶을 때

## 그래서 HyperFlow는 무엇을 먼저 풀려고 했나
HyperFlow는 "예제 많은 완성형 에디터"부터 만든 게 아니다.
먼저 아래 문제를 풀려고 했다.

1. **제품 상태는 host app이 계속 소유한다**
2. **캔버스와 런타임 경로를 분리해서 본다**
3. **큰 화면에서도 viewport 반응성을 먼저 챙긴다**

즉 HyperFlow는 React Flow를 무조건 대체하려고 나온 게 아니라,
**React Flow로 빠르게 시작한 뒤 더 깊은 제품 구조가 필요해질 때의 다른 출발점**에 가깝다.

## 한 줄 차이
| 질문 | React Flow | HyperFlow |
| --- | --- | --- |
| 무엇에 더 가깝나 | 노드 에디터를 빨리 만드는 툴킷 | 제품 안에 심는 editor foundation |
| 먼저 잘하는 것 | broad authoring UI, examples, interaction 패턴 | host app 상태와 canvas/runtime 경로 분리 |
| 잘 맞는 상황 | 범용 편집기를 빨리 시작할 때 | 기존 React 제품 안에 editor surface를 깊게 넣을 때 |
| 지금 기대해야 할 것 | 넓은 authoring 예제 | 더 좁지만 구조적인 기반 |

## 언제 HyperFlow를 보면 되나
- "일단 에디터를 빨리 띄우고 싶다"면 React Flow가 더 자연스럽다.
- "기존 제품 안에서 상태와 성능을 더 직접 통제해야 한다"면 HyperFlow를 볼 이유가 있다.

## React Flow랑 같이 쓰는 건가?
아니다. 기본적으로는 **같이 쓰는 전제가 아니라 비교해서 선택하는 대상**으로 읽는 편이 맞다.

- HyperFlow 안에 React Flow가 들어 있는 것도 아니다.
- React Flow 기능이 자동으로 HyperFlow 안에 포함되는 것도 아니다.
- 둘 다 비슷한 문제를 다른 방식으로 푸는 별도 선택지에 가깝다.
- 나중에 migration 이야기는 할 수 있어도, 현재 문서 기준 기본 가정은 “둘 중 무엇을 기준으로 갈지 고른다”에 더 가깝다.

## 아직 기대하면 안 되는 것
- React Flow 수준의 broad authoring parity
- 설치만으로 바로 완성형 editor shell이 나오는 경험
- ready-made workflow builder template
- built-in auto-layout engine |`,
      },
      installation: {
        navLabel: "설치하기",
        title: "설치하기",
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
      "nodes-and-edges": {
        navLabel: "노드와 엣지",
        title: "노드와 엣지",
        markdown: `React Flow를 대체하는 방향으로 간다면, 제일 먼저 이해해야 하는 건 **노드와 엣지가 무엇을 뜻하느냐**다.

## 노드
노드는 화면 위 박스가 아니라, **host app이 들고 있는 데이터 단위**다.
보통 최소 shape은 아래처럼 본다.

~~~ts
{
  id: "node-a",
  x: 120,
  y: 80,
  width: 180,
  height: 96,
  data: { title: "Node A" }
}
~~~

## 엣지
엣지는 두 노드 사이 관계다.
React Flow에서처럼 연결선이 보이는 UI를 기대하게 되지만, HyperFlow를 읽을 때는 먼저 **관계 데이터도 host app이 소유한다**는 생각부터 잡는 게 낫다.

## 지금 중요하게 봐야 할 점
- 노드는 host app의 제품 데이터와 이어진다.
- 엣지도 마찬가지로 host 쪽 모델에서 정의하는 것이 자연스럽다.
- HyperFlow는 이 데이터를 canvas/runtime 쪽에 안전하게 전달하는 기반에 더 가깝다.

## 초보자 체크
- "지금 내가 보는 박스가 진짜 데이터인가, 그냥 화면 표현인가?"
- "이 연결은 캔버스 장식인가, 제품 로직 관계인가?"

이 두 질문을 먼저 구분하면 문서가 훨씬 덜 헷갈린다.`,
      },
      "selection-and-editing": {
        navLabel: "선택과 수정",
        title: "선택과 수정",
        markdown: `노드 기반 UI에서 사용자가 제일 먼저 배우는 행동은 보통 두 가지다.

1. **선택한다**
2. **수정한다**

## 일반적인 흐름
1. canvas에서 node를 클릭한다.
2. host app이 selected node id를 읽는다.
3. 오른쪽 inspector나 별도 panel이 열린다.
4. 사용자가 값을 바꾼다.
5. host app이 그 값을 다시 node data에 commit한다.

## 왜 이게 중요하나
지금 HyperFlow 문서를 읽는 사람은 “예쁜 editor”보다도 먼저,
**선택과 수정의 책임이 어디 있냐**를 이해해야 한다.

- 선택 시작점: canvas
- 수정 UI: host app
- 최종 commit: host state

## React Flow와 닿는 지점
React Flow도 결국 선택과 수정이 핵심이다.
다만 HyperFlow 쪽은 이 흐름을 더 **host app 중심**으로 읽는 편이 맞다.

## 초보자 체크
- 클릭했을 때 누가 selected id를 들고 있나?
- 수정한 값은 어디서 commit되나?
- canvas와 inspector 중 어느 쪽이 진짜 편집 책임을 가지나?`,
      },
      viewport: {
        navLabel: "뷰포트",
        title: "뷰포트",
        markdown: `React Flow처럼 node editor를 쓴다면, 결국 **viewport**를 이해해야 한다.

## 뷰포트가 뜻하는 것
- 지금 화면이 어느 좌표 범위를 보고 있는가
- pan / zoom / fit view가 어떻게 움직이는가
- 큰 그래프에서도 반응성이 유지되는가

## 왜 HyperFlow에서 더 중요하게 보나
HyperFlow는 바로 이 지점에서 강점을 만들려고 시작했다.
특히 문서에서 계속 말하는 culling, hit-test, responsiveness는 대부분 viewport 경험과 연결된다.

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
        markdown: `React Flow를 대체하려면 사용자가 기대하는 기본 상호작용부터 정리해야 한다.

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

## 실무 체크리스트
- 선택은 되는가
- 이동은 되는가
- 연결은 되는가
- 수정이 다시 반영되는가
- 저장/복원이 가능한가

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

## 초보자 기준 mental model
저장 대상은 보통 세 덩어리다.

1. nodes
2. edges
3. viewport

## HyperFlow 쪽에서 먼저 봐야 하는 것
- host app이 persistence를 계속 소유하는가
- canvas state와 제품 저장 모델이 분리되는가
- 저장 후 복원했을 때 selection과 viewport가 일관되게 돌아오는가

## 쉬운 결론
저장과 복원은 부가 기능이 아니라,
**"이게 진짜 제품 안에 들어가나"를 보여주는 핵심 개념**이다.`,
      },
      "add-to-react-app": {
        navLabel: "React 앱에 붙이기",
        title: "React 앱에 붙이기",
        markdown: `이 페이지는 구현자용 저수준 설명이 아니라, **기존 React 앱에 HyperFlow를 어떻게 끼워 넣는가**를 이해하기 위한 페이지다.

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

## 보통 붙이는 순서
1. host app이 nodes를 만든다.
2. host app이 selection을 만든다.
3. canvas에 nodes와 viewport를 넘긴다.
4. selected node를 읽는다.
5. inspector나 panel에서 값을 바꾼다.
6. host state에 다시 commit한다.

## 중요한 점
- HyperFlow는 form library를 강제하지 않는다.
- persistence는 여전히 host app 책임이다.
- React layer는 canvas/runtime 연결 seam에 가깝다.`,
      },
      layouting: {
        navLabel: "위치와 레이아웃",
        title: "위치와 레이아웃",
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
      "what-is-hyperflow": {
        navLabel: "Introduction",
        title: "Introduction",
        markdown: `HyperFlow is a foundation that frontend teams use when they need a node-editor or workflow surface inside an existing product. It is easier to understand when you read it as **an embedded layer inside your React app**, not as a finished SaaS or full editor shell.

## One-line definition
> HyperFlow is a frontend foundation that connects host-owned state to canvas and runtime seams.

## What to understand first
- HyperFlow does not replace your full app shell.
- Product UX, inspector, and persistence still live in the host app.
- HyperFlow is strongest around canvas/runtime seams and large-surface runtime paths.
- The current repo explains a narrow validated slice, not a broad authoring platform.

## Suggested reading order
1. Why HyperFlow Exists
2. Installation
3. Nodes and Edges
4. Selection and Editing
5. The Viewport
6. Basic Interactions
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
- your product app must keep owning editor state directly
- you want a clearer separation between canvas behavior and product UI
- pan / zoom / selection responsiveness matters more as graphs grow
- you are building a product surface, not just a demo editor

## So what was HyperFlow built to solve first
HyperFlow did not start by chasing a "finished editor with lots of examples".
It started by focusing on three things first.

1. **the host app keeps owning product state**
2. **canvas and runtime paths are treated as a separate layer**
3. **viewport responsiveness is handled early for larger surfaces**

So HyperFlow is not "React Flow, but better".
It is closer to **a different starting point for teams that outgrow the easy editor-first path and need a more embedded product structure.**

## One-line difference
| Question | React Flow | HyperFlow |
| --- | --- | --- |
| What is it closer to? | a toolkit for building node editors quickly | an editor foundation embedded inside a product |
| What does it do first? | broad authoring UI, examples, interaction patterns | clearer separation of host state and canvas/runtime paths |
| When is it a better fit? | when you want to start a general editor quickly | when you need to embed an editor surface deeply into an existing React app |
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
- a built-in auto-layout engine |`,
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
      "nodes-and-edges": {
        navLabel: "Nodes and Edges",
        title: "Nodes and Edges",
        markdown: `If HyperFlow is going to grow into a React Flow alternative, the first concepts to understand are **nodes and edges**.

## Nodes
A node is not just a box on screen. It is a **unit of host-owned data**.
A minimal shape usually looks like this.

~~~ts
{
  id: "node-a",
  x: 120,
  y: 80,
  width: 180,
  height: 96,
  data: { title: "Node A" }
}
~~~

## Edges
An edge is a relationship between two nodes.
React Flow users naturally expect visible connection lines, but the healthier HyperFlow mental model starts one layer earlier: **the host app still owns the relationship data**.

## What matters right now
- nodes should stay connected to product data
- edges should also make sense in the host model
- HyperFlow is closer to the canvas/runtime foundation that receives this data safely

## Beginner check
- is this box real product data, or only a visual shell?
- is this connection only decoration, or part of the product logic?

Those two questions remove a lot of confusion early.`,
      },
      "selection-and-editing": {
        navLabel: "Selection and Editing",
        title: "Selection and Editing",
        markdown: `In any node-based UI, the first two actions people learn are usually these.

1. **select something**
2. **edit something**

## The usual flow
1. click a node in the canvas
2. let the host app read the selected node id
3. open an inspector or side panel
4. edit a field
5. commit that change back into host-owned node data

## Why this matters
Before people care about advanced editor features, they need to understand **where selection and editing actually live**.

- selection starts in the canvas
- editing UI usually lives in host space
- the final commit goes back into host state

## Where this meets React Flow
React Flow also revolves around selection and editing.
The difference is that HyperFlow is easier to read when this loop stays **host-app first**.

## Beginner check
- who owns the selected id?
- where does the change commit happen?
- which layer really owns the editing UX?`,
      },
      viewport: {
        navLabel: "The Viewport",
        title: "The Viewport",
        markdown: `If you want to replace React Flow, you eventually have to understand the viewport.

## What the viewport means
- which coordinate range the screen is currently looking at
- how pan / zoom / fit view behave
- whether responsiveness holds as the graph grows

## Why HyperFlow cares so much about it
This is one of the reasons HyperFlow exists in the first place.
The docs keep talking about culling, hit-test, and responsiveness because all of those show up through viewport behavior.

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
        markdown: `If HyperFlow is going to replace React Flow for some teams, it has to be measured against the basic interaction checklist people already expect.

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

## Practical checklist
- can I select?
- can I move?
- can I connect?
- can I see edits reflected?
- can I save and restore?`,
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

## What to inspect in HyperFlow
- does persistence stay in the host app?
- is the canvas state separate from the product save model?
- does restore bring back a consistent viewport and selection state?

## Easy conclusion
Save and restore is not extra polish.
It is one of the clearest signs that an editor surface can really live inside a product.`,
      },
      "add-to-react-app": {
        navLabel: "Add to a React App",
        title: "Add to a React App",
        markdown: `This page is not meant as low-level implementation jargon. It is meant to answer a simpler question: **how does HyperFlow get embedded into an existing React app?**

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

## Usual embedding flow
1. the host app creates nodes
2. the host app creates selection
3. pass nodes and viewport into the canvas
4. read the selected node
5. edit fields in an inspector or panel
6. commit back into host state

## Important framing
- HyperFlow does not force a form library
- persistence still belongs to the host app
- the React layer is mostly a canvas/runtime connection seam`,
      },
      layouting: {
        navLabel: "Layout and Positioning",
        title: "Layout and Positioning",
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
        case "what-is-hyperflow":
          return { locale, pageId: "what-is-hyperflow" };
        case "when-to-use":
          return { locale, pageId: "when-to-use" };
        case "installation":
          return { locale, pageId: "installation" };
        case "nodes-and-edges":
          return { locale, pageId: "nodes-and-edges" };
        case "selection-and-editing":
          return { locale, pageId: "selection-and-editing" };
        case "viewport":
          return { locale, pageId: "viewport" };
        case "basic-interactions":
          return { locale, pageId: "basic-interactions" };
        case "save-and-restore":
          return { locale, pageId: "save-and-restore" };
        case "add-to-react-app":
          return { locale, pageId: "add-to-react-app" };
        case "layouting":
          return { locale, pageId: "layouting" };
        case "performance":
          return { locale, pageId: "performance" };
        case "troubleshooting":
          return { locale, pageId: "troubleshooting" };
        default:
          return { locale, pageId: "what-is-hyperflow" };
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
      return { locale, pageId: "what-is-hyperflow" };
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
          <strong key={`${segment.type}-${index}`}>{segment.text}</strong>
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

export function App() {
  const [route, setRoute] = useState<{ locale: Locale; pageId: PageId }>(() =>
    typeof window === "undefined" ? { locale: "ko", pageId: "what-is-hyperflow" } : getRouteFromPath(window.location.pathname),
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
