# HyperFlow 입문 가이드

이 문서는 **처음 이 저장소를 보는 사람**이 HyperFlow를 빠르게 이해할 수 있도록 만든 쉬운 설명서다.

핵심만 먼저 말하면:

> HyperFlow는 **노드 기반 워크플로우 에디터**를 만들 때 사용할 수 있는 기반 SDK/엔진 방향의 프로젝트다.

예를 들어 이런 화면을 만들 때 어울린다:

- AI 에이전트 빌더 UI
- 자동화 플로우 빌더
- AI 에이전트 워크플로우 편집기
- 승인 프로세스 에디터
- 내부 운영 툴용 플로우 UI

---

## 1. 이 프로젝트를 한 문장으로 설명하면

HyperFlow는:

> **"큰 그래프도 버틸 수 있는 워크플로우 편집기 기반 기술을 만들고, 그것을 React 같은 앱에서 쉽게 쓰게 하려는 프로젝트"**

라고 보면 된다.

현재 가장 먼저 떠올리면 좋은 사용 예시는:

> **기존 제품 안에 붙는 agent builder UI**

즉, 완성된 SaaS 제품 자체라기보다:

- 성능 계산 코어
- 렌더링 경로
- 브리지 계층
- SDK 계층
- React 연동 계층

을 나눠서 쌓고 있는 중이다.

---

## 2. 초보자 눈높이에서 보는 구조

이 프로젝트를 사람 역할로 비유하면:

- `packages/core-rs` = **두뇌**
- `packages/wasm-bindings` = **통역사**
- `packages/renderer-canvas` = **화가**
- `packages/sdk` = **정리된 사용 설명서**
- `packages/react` = **React용 어댑터**
- `examples/react-starter` = **실제 데모 앱**

즉,

- Rust가 계산하고
- WASM bridge가 연결하고
- canvas renderer가 그리고
- SDK가 감싸고
- React package가 앱에서 쓰기 쉽게 만들고
- example이 실제 화면처럼 보여준다

는 구조다.

---

## 3. 아키텍처 라인 다이어그램

### 가장 쉬운 라인 버전

```text
[React Starter App]
        |
        v
[@hyperflow/react]
        |
        v
[@hyperflow/sdk]
        |
        v
[wasm-bindings]
        |
        v
[core-rs (Rust/WASM)]
        |
        +--> visible nodes 계산
        +--> hit test 계산
        |
        v
[renderer-canvas]
        |
        v
[Canvas 화면에 노드 박스 렌더링]
```

### 실제 사용 흐름 기준 라인

```text
사용자 클릭
   |
   v
React example UI
   |
   +--> selection / form state 갱신
   |
   v
@hyperflow/react
   |
   +--> canvas 컴포넌트 제공
   +--> React state helper 제공
   |
   v
@hyperflow/sdk
   |
   +--> engine API 제공
   +--> renderFrame / hitTest / visible query
   |
   v
wasm-bindings
   |
   v
core-rs
   |
   +--> viewport 계산
   +--> culling
   +--> hit testing
   |
   v
renderer-canvas
   |
   v
브라우저 canvas에 박스 그림
```

### Mermaid 버전

```mermaid
flowchart TD
    A[examples/react-starter] --> B[@hyperflow/react]
    B --> C[@hyperflow/sdk]
    C --> D[packages/wasm-bindings]
    D --> E[packages/core-rs]
    C --> F[packages/renderer-canvas]
    E --> F
    F --> G[Canvas Output]
```

---

## 4. 지금 실제로 되는 것

현재 이 repo는 **완성형 전체 제품**은 아니지만, 아래 좁은 경로는 실제로 동작한다.

### 구현된 핵심 경로

- Rust core에서 viewport / culling / hit-test 계산
- JS에서 WASM bridge를 통해 Rust와 통신
- canvas에 visible box를 렌더링
- SDK로 이 경로를 한 번 감싼 API 제공
- React starter에서 선택/폼 수정/Apply 흐름 증명

즉:

> **"핵심 경로는 진짜로 동작하는 PoC"**

라고 보면 된다.

---

## 5. 아직 덜 구현된 것

아래는 아직 미래 방향에 더 가깝다.

- Vue adapter
- Svelte adapter
- Vanilla package
- theme-default package
- 더 풍부한 editor API
- 완성형 wrapper API
- 협업 / 히스토리 기능
- 전체 제품 수준 Starter Kit

즉, 폴더 구조는 넓지만 **구현 성숙도는 패키지마다 다르다**.

---

## 6. 폴더별 쉬운 설명

## `packages/core-rs`

이 프로젝트의 계산 코어다.

여기서 하는 일:

- 현재 viewport 안에 어떤 노드가 보이는지 계산
- 클릭한 좌표가 어떤 노드인지 계산

쉽게 말하면:

> "화면에 뭘 보여줘야 하고, 사용자가 뭘 눌렀는지 판단하는 곳"

---

## `packages/wasm-bindings`

JavaScript와 Rust 사이를 이어주는 계층이다.

쉽게 말하면:

> "JS가 Rust 함수를 부를 수 있게 해주는 다리"

---

## `packages/renderer-canvas`

계산된 결과를 canvas에 그리는 곳이다.

쉽게 말하면:

> "보이는 노드 박스를 실제 화면에 그리는 곳"

---

## `packages/sdk`

낮은 수준의 구현을 좀 더 쓰기 좋은 API로 감싼 계층이다.

쉽게 말하면:

> "core + wasm + renderer를 한 번 정리해서 앱에서 덜 복잡하게 쓰게 하는 레이어"

---

## `packages/react`

React 앱에서 쓰기 쉽도록 감싼 얇은 어댑터다.

여기서 보이는 것:

- canvas 컴포넌트
- selection/state helper
- viewport helper

쉽게 말하면:

> "React 개발자가 실제 앱에서 붙일 때 직접 만지는 부분"

---

## `examples/react-starter`

지금 repo에서 가장 중요한 데모다.

이 예제는:

- 노드를 선택하고
- inspector/form에서 값을 바꾸고
- Apply를 누르면
- 노드 UI와 상태가 함께 바뀌는 흐름

을 보여준다.

즉:

> "현재 HyperFlow가 제품처럼 보이는 가장 설득력 있는 샘플"

---

## `examples/vanilla-starter`

이것도 실제 데모지만, React starter보다 더 내부 proof/harness 성격이 강하다.

즉:

- 동작은 의미가 있지만
- 제품형 예제보다는 기술 검증용 느낌이 더 강함

---

## 7. 현재 상태를 표로 보면

| 영역 | 상태 | 설명 |
| --- | --- | --- |
| `packages/core-rs` | 구현됨 | Rust 계산 코어가 실제로 존재 |
| `packages/wasm-bindings` | 부분 구현 + 실제 동작 | JS 런타임 경로는 동작 |
| `packages/renderer-canvas` | 부분 구현 + 실제 동작 | JS 렌더 경로는 동작 |
| `packages/sdk` | 구현됨 | 현재 PoC API 제공 |
| `packages/react` | 구현됨 | React용 얇은 통합 레이어 |
| `examples/react-starter` | 구현됨 | 가장 중요한 제품형 데모 |
| `examples/vanilla-starter` | 부분 구현 | 실제 동작하지만 더 내부 proof 성격 |
| `packages/vue` | placeholder | 미래용 자리 |
| `packages/svelte` | placeholder | 미래용 자리 |
| `packages/vanilla` | placeholder | 미래용 자리 |
| `packages/theme-default` | placeholder | 미래용 자리 |

---

## 8. 이 프로젝트의 강점

### 강점 1: 빈 껍데기가 아니다

이 repo는 이름만 거창한 스캐폴드가 아니라:

- Rust 계산
- WASM 연결
- canvas 렌더링
- React proof

가 이어지는 **실제 동작 경로**가 있다.

### 강점 2: 역할 분리가 비교적 명확하다

- 계산은 Rust
- 연결은 WASM bridge
- 그리기는 canvas renderer
- 사용성은 SDK
- 프레임워크 연동은 React package

처럼 레이어가 분리되어 있다.

### 강점 3: React 예제가 설득력이 있다

단순히 노드 박스만 그리는 게 아니라:

- 선택
- 패널 편집
- Apply
- 상태 반영

까지 보여준다.

---

## 9. 이 프로젝트의 리스크

### 리스크 1: 문서와 실제 상태가 100% 같지는 않다

일부 README는 여전히 placeholder처럼 적혀 있는데, 실제론 일부 구현이 이미 있다.

즉:

> 문서를 그대로 믿으면 구현 상태를 과소평가하거나 과대평가할 수 있다.

### 리스크 2: 전체 패키지 지도가 구현 성숙도를 보장하진 않는다

폴더가 많다고 해서 전부 실구현은 아니다.

### 리스크 3: 전체 검증 체계는 아직 성장 중이다

기본 `pnpm test`는 Rust/JS 런타임 검증까지 포함하지만,
아직 모든 제품 시나리오를 넓게 보장하는 수준은 아니다.

즉:

> 핵심 경로 검증은 좋아졌지만, 전체 제품 수준 검증 체계는 더 커져야 한다.

### 리스크 4: package boundary가 완전히 publish-ready는 아니다

내부 `src`를 직접 참조하는 경로가 있어서, 장기적으로는 정리가 더 필요하다.

---

## 10. 초보자가 이 repo를 읽는 추천 순서

처음 보면 이 순서가 가장 이해하기 쉽다.

1. `README.md`
2. 이 문서 (`docs/architecture/hyperflow-beginner-guide-ko.md`)
3. `examples/react-starter/src/App.tsx`
4. `packages/react/src/react.tsx`
5. `packages/sdk/src/index.js`
6. `packages/wasm-bindings/src/index.js`
7. `packages/core-rs/src/lib.rs`
8. `packages/renderer-canvas/src/index.js`

이 순서로 보면:

- 먼저 "제품처럼 보이는 화면"을 이해하고
- 그 다음 "React 통합층"을 보고
- 마지막에 "낮은 수준 구현"으로 내려갈 수 있다

---

## 11. 최종 한 줄 요약

HyperFlow는 지금:

> **"대형 워크플로우 빌더 SDK를 향해 가는 프로젝트이며, 현재는 Rust/WASM/canvas 기반의 좁지만 실제로 동작하는 핵심 경로와 React proof를 가진 상태"**

라고 이해하면 가장 정확하다.
