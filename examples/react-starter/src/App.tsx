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
    "installation",
    "nodes-and-edges",
    "selection-and-editing",
    "basic-interactions",
    "viewport",
    "save-and-restore",
    "when-to-use",
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
      installNote: "설치 직후에는 Learn surface가 먼저 열린다. 여기서 화면, 상호작용, 현재 범위를 먼저 이해하는 것이 맞다.",
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
현재 repo에서 먼저 뜨는 것은 localized Learn surface다. 여기서 개념을 먼저 익히고, 이후 basic node editor 방향으로 확장해 나간다.

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
2. 노드와 엣지
3. 선택과 수정
4. 기본 상호작용
5. 뷰포트
6. 저장과 복원
7. 왜 HyperFlow가 있나
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

1. **제품 상태는 host app이 계속 소유한다**
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
- React Flow 기능이 자동으로 HyperFlow 안에 포함되는 것도 아니다.
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
        markdown: `설치는 복잡하게 생각할 필요 없다. 지금은 **검증된 pnpm 경로로 repo를 띄우고 Learn을 따라가는 것**이 첫 단계다.

## 필요한 환경
- Node.js 24 계열
- pnpm workspace
- React 19
- React DOM 19

## 지금 바로 하는 순서
1. workspace 루트에서 \`pnpm install\`
2. 이어서 \`pnpm run dev:react-starter\`
3. 브라우저에서 \`http://localhost:5173/ko/learn\`

## 설치 후 처음 확인할 것
- Learn 페이지가 뜨는가
- 설치 명령이 정상 동작하는가
- 이후 문서에서 node / edge / interaction 개념을 따라갈 수 있는가

## 설치가 바로 해주지 않는 것
- 완성형 editor shell을 자동으로 만들어주지는 않는다.
- workflow builder template를 바로 주지는 않는다.
- React Flow 수준의 broad authoring parity를 바로 주지는 않는다.

## 지금 이 페이지의 목적
지금 단계에서 설치는 “기능이 다 된다”를 확인하는 절차가 아니라,
**HyperFlow를 어떤 순서로 배워야 하는지 진입점을 여는 절차**에 가깝다.`,
      },
      "nodes-and-edges": {
        navLabel: "노드와 엣지",
        title: "노드와 엣지",
        markdown: `설치 후 editor 화면을 떠올릴 때 가장 먼저 보이는 것은 **박스와 선**이다. HyperFlow Learn에서도 이걸 먼저 설명해야 한다.

## 화면에서 먼저 보이는 것
- canvas 위에 node 박스가 보인다
- node 사이를 잇는 edge가 보인다
- 이 둘이 합쳐져 하나의 flow처럼 읽힌다

## 노드
사용자는 먼저 node를 **화면 위 박스**로 본다. 그 이해부터 시작하면 된다.
그 다음 단계에서, 이 박스가 실제로는 아래처럼 **데이터 한 덩어리**와 연결된다고 이해하면 된다.

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
엣지는 두 node 사이를 잇는 선이다.
초보자는 먼저 **"어떤 박스가 어떤 박스와 연결되어 있는가"** 를 화면에서 읽을 수 있으면 된다.
그 다음에야 이 선이 관계 데이터와 이어진다고 생각하면 된다.

## 지금 HyperFlow에서 먼저 이해할 것
- 화면에서는 box와 line이 먼저 보인다.
- 그 아래에는 node/edge 데이터가 있다.
- HyperFlow는 그 데이터를 canvas에 올리는 기반으로 읽는 편이 맞다.

## 프론트 팀이 실제로 해야 하는 일
- node id와 좌표를 만든다.
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
        markdown: `초보자가 editor를 처음 만지면 제일 먼저 하는 행동은 결국 두 가지다. **하나를 고르고, 값을 바꾼다.** HyperFlow도 여기부터 읽는 게 맞다.

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
        markdown: `React Flow Learn도 viewport를 따로 설명한다. 그만큼 editor를 쓸 때는 **화면이 지금 어디를 보고 있는지**를 이해하는 게 중요하다.

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
        markdown: `이 페이지는 구현자용 저수준 설명이 아니라, **기존 React 앱에 HyperFlow를 어떻게 끼워 넣는가**를 코드로 이해하기 위한 페이지다.

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
    x: 80,
    y: 80,
    width: 180,
    height: 96,
    data: { title: "Node A" },
  },
  {
    id: 2,
    x: 360,
    y: 80,
    width: 180,
    height: 96,
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
  { id: 1, x: 64, y: 64, width: 180, height: 96, data: { title: "Node A" } },
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
      intro: "Today the only verified development flow is the pnpm workspace path. The most accurate way to learn HyperFlow is to install the repo with pnpm and run the starter from there.",
      workspaceTitle: "Verified workspace setup",
      workspaceCommands: ["pnpm install", "pnpm run dev:react-starter"],
      installTitle: "Current package status",
      installCommand: "@hyperflow/react is still a private workspace package.",
      installNote: "Right after setup, the Learn surface is what appears first. Use it to understand the screen, the interactions, and the current scope before expecting a full editor.",
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
Today this repo opens a localized Learn surface first. You learn the concepts here before the project grows back into a stronger basic node-editor demo.

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
2. Nodes and Edges
3. Selection and Editing
4. Basic Interactions
5. The Viewport
6. Save and Restore
7. Why HyperFlow Exists
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

1. **the host app keeps owning product state**
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
        markdown: `Do not overthink installation yet. The first step is simply to **run the verified pnpm path and open Learn locally**.

## Required environment
- Node.js 24 line
- pnpm workspace
- React 19
- React DOM 19

## The path to run today
1. run \`pnpm install\` from the workspace root
2. run \`pnpm run dev:react-starter\`
3. open \`http://localhost:5173/en/learn\`

## What to verify right after setup
- the Learn surface loads
- the setup commands succeed
- you can continue into nodes / edges / interaction concepts

## What installation does not give you yet
- a finished editor shell
- ready-made workflow templates
- broad React Flow-style authoring parity

## The purpose of installation today
At this stage installation is not the moment where everything becomes interactive.
It is the moment where you enter the verified learning path for understanding what HyperFlow is trying to become.`,
      },
      "nodes-and-edges": {
        navLabel: "Nodes and Edges",
        title: "Nodes and Edges",
        markdown: `After setup, the first things people expect to see in an editor are **boxes and lines**. HyperFlow Learn should start there too.

## What appears on screen first
- node boxes on a canvas
- edges connecting those boxes
- a flow that looks understandable at a glance

## Nodes
Users first understand a node as **a box on screen**. Start there.
Then add the second layer: that box is backed by a **piece of data** that usually looks like this.

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
An edge is the line between two nodes.
For beginners, the first useful question is simply **"which box connects to which box?"**
Only after that does it help to think about the underlying relationship data.

## What matters in HyperFlow today
- the screen shows boxes and lines first
- those boxes and lines come from node and edge data
- HyperFlow is closer to the foundation that places that data onto a canvas safely

## What the frontend team actually does
- create node ids and positions
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
    x: 80,
    y: 80,
    width: 180,
    height: 96,
    data: { title: "Node A" },
  },
  {
    id: 2,
    x: 360,
    y: 80,
    width: 180,
    height: 96,
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
  { id: 1, x: 64, y: 64, width: 180, height: 96, data: { title: "Node A" } },
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
