# PRD

## 프로젝트명(가칭): HyperFlow

**부제:** Rust + WASM 기반 고성능 워크플로우 / 에이전트 빌더 오픈소스 UI 엔진

**문서 버전:** v0.1  
**상태:** Draft  
**작성 목적:** xyflow 계열의 사용성을 유지하면서, 대규모 노드/엣지 환경에서 더 높은 성능과 더 낮은 렌더링 부담을 제공하는 오픈소스 제품의 요구사항 정의

---

## 1. 제품 개요

HyperFlow는 웹 애플리케이션에 임베드 가능한 **고성능 워크플로우 빌더 / 에이전트 빌더용 오픈소스 UI 엔진**이다.  
핵심 목표는 기존 DOM 중심 노드 에디터가 겪는 렌더링 병목, pan/zoom 성능 저하, minimap 부하, 복잡한 메모리 관리 문제를 줄이면서도, 개발자가 익숙한 **TypeScript/JavaScript 기반 개발 경험**을 유지하는 것이다.

이 제품은 모든 UI를 Rust로 재작성하는 방식이 아니라, 다음과 같은 **하이브리드 구조**를 채택한다.

- 그래프 코어, 히트테스트, 컬링, 레이아웃, 렌더링 draw pipeline은 **Rust + WASM**
- 그래프 plane 렌더링은 **Canvas/OffscreenCanvas 기반**
- 노드 내부 편집 UI, 패널, 폼, 툴바, 테마, 앱 통합은 **HTML/CSS/TypeScript**
- React/Vue/Svelte/Vanilla JS용 래퍼를 제공하여 **메인 기능**으로도, **서브 기능 삽입형**으로도 사용할 수 있게 한다

---

## 2. 문제 정의

1. 노드 수와 엣지 수가 늘어날수록 DOM 렌더링 비용이 빠르게 증가한다.
2. pan/zoom, drag, selection, minimap, edge re-routing이 겹치면 프레임 드랍이 발생한다.
3. 커스텀 노드가 많아질수록 리렌더 제어가 어려워지고 메모리 누수 추적 비용이 커진다.
4. 일부 서비스는 워크플로우 빌더가 핵심 기능이지만, 많은 서비스는 이를 “설정 화면의 일부”로 삽입하려 하기 때문에 프레임워크 종속성이 낮아야 한다.
5. 기존 라이브러리는 사용성은 좋지만, 100~1000 노드 규모에서 구조적 한계가 드러나는 경우가 있다.

즉 시장에는 “개발자 경험이 좋은 라이브러리”는 있지만, “대규모 그래프를 장시간 안정적으로 다루는 고성능 임베더블 UI 엔진”은 여전히 부족하다.

---

## 3. 제품 비전

**“웹 애플리케이션 어디에나 삽입할 수 있는, 빠르고 안정적이며 확장 가능한 오픈소스 그래프 기반 워크플로우 UI 엔진을 만든다.”**

원칙:

- **성능 우선**
- **하이브리드 우선**
- **임베드 우선**
- **프레임워크 중립 우선**
- **오픈소스 친화성**

---

## 4. 목표와 비목표

### 목표

- 100~1000 노드 규모에서 실사용 가능한 워크플로우 빌더 제공
- pan/zoom/drag/select 성능을 기존 DOM 중심 구조보다 유의미하게 개선
- Rust+WASM 코어와 TS SDK를 결합한 공개 API 제공
- React, Vue, Svelte, Vanilla JS 환경에서 사용 가능
- CSS 전역 오염 없이 기존 서비스에 쉽게 삽입 가능
- 커스텀 노드와 커스텀 엣지, 툴바, 패널 확장 가능
- minimap, selection, grouping, undo/redo, viewport control 등 실사용 필수 기능 제공
- 오픈소스 사용자 입장에서 “바로 설치해서 붙여볼 수 있는 수준”의 문서/예제 제공

### 비목표

- 서버 오케스트레이션 엔진 자체 제공
- 워크플로우 실행기(runtime) 제공
- 실시간 협업(CRDT/멀티유저 동시 편집)
- 완전한 React Flow API 1:1 호환
- 고급 AI agent runtime, MCP orchestration, tracing backend 포함

---

## 5. 타겟 사용자

- SaaS 제품 안에 워크플로우 빌더를 넣고 싶은 프론트엔드 팀
- 에이전트 빌더, 자동화 빌더, 데이터 파이프라인 UI를 만드는 스타트업
- 기존 DOM 기반 노드 에디터 성능 한계에 부딪힌 개발팀

---

## 6. 제품 범위

HyperFlow는 아래 네 개 층으로 구성된다.

1. **Core Engine** — Rust + WASM 그래프 엔진
2. **Renderer** — Canvas2D 또는 이후 WebGL 기반 렌더링 레이어
3. **DOM Overlay UI** — TS/HTML/CSS 기반 패널/폼/툴바
4. **SDK / Framework Wrappers** — vanilla, React, Vue, Svelte 진입점

---

## 7. 제품 요구사항

### 기능 요구사항 요약

- 그래프 캔버스
- 노드 / 엣지 / 포트 관리
- viewport 제어
- 선택 기능
- LOD
- minimap
- undo/redo
- JSON 직렬화
- 커스텀 노드
- 이벤트 시스템
- 플러그인/확장성
- 스타일링
- 접근성

### 비기능 요구사항 요약

- 300~1000 노드 범위 성능 목표
- 메모리 안정성
- 임베드성
- 프레임워크 독립성
- 타입 안정성
- 최신 브라우저 호환성
- ESM 우선 번들 전략

---

## 8. 제안 아키텍처

- **Rust Core**: 그래프 자료구조, 히트테스트, 컬링, selection, edge path, minimap data, LOD 판단, 명령 로그
- **WASM Bridge**: 핸들/버퍼/배치 명령 중심 API
- **Renderer Worker**: OffscreenCanvas 가능 시 워커에서 draw 수행
- **DOM Overlay Layer**: 인스펙터, 패널, 메뉴, 툴바
- **Framework Adapters**: React/Vue/Svelte/Vanilla 래퍼

핵심 결정:

1. Canvas 우선, DOM 전체 렌더링 지양
2. v1 렌더러는 Canvas2D + Worker 중심
3. DOM overlay 분리
4. visible-only + LOD 기본값
5. 프레임워크 중립 API 우선

---

## 9. 공개 API 요구사항

### Vanilla API

```ts
const app = createHyperFlow({
  container: HTMLElement,
  graph,
  theme,
  plugins,
});

app.setGraph(graph);
app.getGraph();
app.fitView();
app.centerNode(nodeId);
app.destroy();
```

### React API

```tsx
<HyperFlowProvider>
  <HyperFlowCanvas
    nodes={nodes}
    edges={edges}
    nodeTypes={nodeTypes}
    onSelectionChange={...}
  />
  <HyperFlowInspector />
</HyperFlowProvider>
```

원칙:

- 선언형 + 명령형 API 동시 제공
- import-safe / SSR-safe
- stable serialization format
- 경량 이벤트 payload
- TS generics 지원

---

## 10. 패키지 구조 제안

- `packages/core-rs`
- `packages/wasm-bindings`
- `packages/sdk`
- `packages/renderer-canvas`
- `packages/react`
- `packages/vue`
- `packages/svelte`
- `packages/vanilla`
- `packages/theme-default`
- `packages/devtools` : 추후
- `examples/*`
- `docs/*`

---

## 11. 출시 범위

### v1 / MVP

- 노드/엣지 렌더링
- pan/zoom
- selection
- connect/disconnect
- minimap
- undo/redo
- JSON serialize/deserialize
- React wrapper
- Vanilla wrapper
- 기본 툴바/Inspector 예제
- 커스텀 노드 API
- 문서/튜토리얼/벤치 예제

### v1.1

- Vue/Svelte wrapper 안정화
- 그룹 노드
- 키보드 단축키
- minimap 개선
- edge routing 옵션 추가

### v2

- WebGL2 또는 GPU 가속 렌더러
- 클러스터/서브플로우 접기
- 협업 준비용 command/event log 정교화
- incremental layout

---

## 12. 리스크와 대응

- WASM 브리지 비용 증가 → batched command / buffer 중심 인터페이스
- 모든 것을 WASM으로 밀어 넣어 DX 저하 → UI 셸은 TS 유지
- OffscreenCanvas 제약 → main-thread Canvas fallback
- 무거운 커스텀 노드 → DOM overlay, LOD, lazy mount, complexity guide
- API 호환 기대 혼선 → “유사 문제 영역의 대안”으로 포지셔닝
- 초기 문서 부족 → docs-first 전략, 최소 5개 예제

---

## 13. 오픈소스 전략

- 라이선스: **MIT 또는 MIT/Apache-2.0 dual license** 검토
- Core 성능 벤치와 예제 공개
- `embed-first` 포지셔닝 강조
- React만 잘 되는 프로젝트가 아니라는 점 강조
- 설치 편의성, API 안정성, 예제 품질 우선

---

## 14. 구현 우선순위

### Phase 0. 기술 검증
- Rust core로 viewport, culling, hit test 구현
- Canvas renderer PoC
- 100/300/1000 노드 벤치 제작
- bridge cost 측정

### Phase 1. Core MVP
- graph model
- selection
- viewport
- edges
- serialize/deserialize
- undo/redo

### Phase 2. Renderer MVP
- Canvas renderer
- worker/offscreen 경로
- minimap
- LOD

### Phase 3. SDK/Wrapper
- vanilla
- react
- typed events
- custom node system

### Phase 4. DX/OSS
- docs
- examples
- performance guide
- theming guide
- contribution guide

---

## 15. 한 줄 결론

**“xyflow처럼 쓰기 좋되, 내부는 Rust+WASM + Canvas + DOM overlay 하이브리드 구조로 재설계된 고성능 임베더블 워크플로우 엔진”**
