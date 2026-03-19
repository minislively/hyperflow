# Workflow Builder Open Source Front PRD
## Version 3 — Graph State API + Form Integration 기준 정립

---

## 1. 문서 목적
이 문서는 현재 구현된 Workflow Builder / Workflow Optimization UI를
**“기능적으로 되는 PoC”**에서
**“외부 개발자가 어떻게 써야 하는지 바로 이해되는 오픈소스 SDK”**로 정리하기 위한 PRD다.

이번 버전은 특히 아래 질문에 대한 기준을 명확히 한다.

- React Flow도 `react-hook-form` 기반으로 설계된 것인가?
- 우리도 내부 구조를 `react-hook-form` 중심으로 설계해야 하는가?
- 실제 사용자에게는 이 SDK를 어떤 방식으로 쓰라고 안내해야 하는가?

이 문서의 결론은 명확하다.

> **React Flow는 react-hook-form 기반 라이브러리가 아니다.**
> React Flow는 **그래프 상태 중심 라이브러리**이고,
> react-hook-form은 **폼 상태 중심 라이브러리**다.
> 
> 따라서 우리도 내부를 react-hook-form 기반으로 만들 필요는 없지만,
> **그래프 상태 API를 중심으로 하되 react-hook-form 같은 폼 라이브러리와 자연스럽게 통합되는 Builder SDK**를 목표로 해야 한다.

---

## 2. 배경 및 인사이트 요약
스크린샷 리서치의 핵심은 아래와 같다.

### 2.1 React Flow의 역할
React Flow는 주로 다음을 다룬다.

- 그래프 렌더링
- 노드/엣지 상태
- selection / viewport / interaction

즉, React Flow의 중심은 **그래프 상태와 캔버스 상호작용**이다.

대표적인 감각은 아래 API가 만든다.

- `useNodesState`
- `useEdgesState`
- `onNodesChange`
- `onEdgesChange`

이런 API는 사용자가 React 안에서 그래프 상태를 다룬다는 mental model을 갖게 만든다.

### 2.2 react-hook-form의 역할
react-hook-form은 주로 다음을 다룬다.

- 입력 폼 상태 관리
- validation
- submit
- dirty state

대표적인 감각은 아래 API가 만든다.

- `useForm`
- `register`
- `watch`
- `handleSubmit`

즉, react-hook-form의 중심은 **폼 상태와 입력 제어**다.

### 2.3 실무에서의 결합 방식
실무에서는 보통 둘을 같이 쓴다.

- React Flow = 캔버스/노드 상태
- react-hook-form = inspector/form 패널

일반적인 흐름은 다음과 같다.

1. 사용자가 노드를 클릭한다.
2. selection에 따라 inspector 패널이 열린다.
3. inspector 내부는 react-hook-form으로 구성된다.
4. 저장/적용 또는 live update 시 node data가 업데이트된다.

즉, **React Flow 자체가 react-hook-form 기반인 것은 아니고,**
**React Flow 위에 form 라이브러리를 자연스럽게 붙여 쓰는 구조**가 일반적이다.

---

## 3. 이번 PRD의 핵심 결론
### 결론 1. 내부 설계를 react-hook-form 기반으로 강제할 필요는 없다
우리가 만드는 SDK 내부 코어는 그래프 상태, selection, interaction, update pipeline 중심이어야 한다.
폼 라이브러리 구현체가 내부 코어를 지배할 필요는 없다.

### 결론 2. 대신 외부 사용 경험은 react-hook-form과 잘 붙어야 한다
사용자는 보통 inspector/form 패널을 별도 폼 라이브러리로 구성한다.
따라서 SDK는 아래를 쉽게 만들어야 한다.

- 선택된 노드를 읽기 쉽다.
- 선택된 노드를 수정하기 쉽다.
- 폼 적용 시 node data update가 간단하다.
- live preview / submit update 모두 가능하다.

### 결론 3. 우리 제품의 핵심은 “폼 기반 라이브러리”가 아니라 “그래프 상태 API + 폼 통합 경험”이다
우리가 React Flow를 대체하려면 필요한 것은 다음 두 축이다.

1. **React Flow처럼 그래프 상태를 다루는 API**
2. **react-hook-form 같은 폼 라이브러리와 자연스럽게 연결되는 구조**

즉 제품의 대외 정의는 아래가 맞다.

> **Workflow Builder는 그래프 상태 중심의 Builder SDK이며,
> react-hook-form 같은 폼 라이브러리와 자연스럽게 통합되는 편집 경험을 제공한다.**

---

## 4. 문제 정의
현재 제품은 기능적으로는 꽤 구현되어 있다.
하지만 외부 개발자 입장에서는 아직 아래 기준이 명확하지 않다.

- 이 SDK가 그래프 상태를 어디까지 책임지는가?
- selection / inspector / form update는 어떤 방식으로 연결해야 하는가?
- package가 책임지는 것과 example가 보여주는 것이 어디서 갈리는가?
- React Flow 대체재로서의 mental model이 무엇인가?

그 결과 사용자는 아래처럼 느낄 수 있다.

- 기능은 있어 보이는데 어떻게 붙여야 할지 애매하다.
- form-driven editing은 example에만 있는 것처럼 보인다.
- 그래프 상태 API보다 데모 화면이 먼저 보여서 SDK로 인식하기 어렵다.
- “우리 앱에서 이걸 이렇게 쓰면 되겠다”는 확신이 부족하다.

이번 PRD는 이 문제를 해결하기 위해,
**“실제 사용 기준”**을 그래프 상태 API와 폼 통합 패턴 중심으로 다시 정의한다.

---

## 5. 제품 정의
### 5.1 제품 한 줄 정의
**Workflow Builder는 React 앱 안에 임베드 가능한, 그래프 상태 중심의 Workflow Builder SDK이며, inspector/form 편집 흐름과 자연스럽게 통합되도록 설계된다.**

### 5.2 외부 사용자 관점의 제품 정의
외부 개발자는 이 제품을 아래처럼 이해해야 한다.

- 그래프 상태는 React host state에서 다룬다.
- Builder는 그래프를 렌더링하고 상호작용을 제공한다.
- 선택된 노드는 inspector/form 패널과 연결된다.
- inspector는 react-hook-form 같은 폼 라이브러리로 구현할 수 있다.
- 폼 적용 시 node data가 업데이트된다.

즉, 이 제품은 **폼 라이브러리 자체**가 아니라,
**폼 라이브러리와 잘 붙는 그래프 편집 SDK**다.

---

## 6. 제품 원칙
### 원칙 1. Graph-first
코어 mental model은 form-first가 아니라 graph-first다.

### 원칙 2. Form-friendly
graph-first이지만, selection과 node data update API는 form 라이브러리와 잘 붙도록 설계한다.

### 원칙 3. Controlled by default
오픈소스 사용 기준은 host-controlled 패턴을 기본으로 삼는다.
즉 그래프 상태는 host React state가 가진다.

### 원칙 4. Example와 package 책임을 분리한다
example는 조합 예시를 보여주고,
package는 상태 API와 통합 seam을 책임진다.

### 원칙 5. 내부 구현보다 외부 usage model이 먼저 보여야 한다
WASM/Rust/서버 구조는 중요하지만,
외부 사용자는 먼저 “어떻게 써야 하는가”를 이해해야 한다.

---

## 7. 타겟 사용자
### 7.1 1차 사용자
React 앱에 workflow builder를 붙이려는 프론트엔드 엔지니어

### 7.2 2차 사용자
React Flow를 쓰고 있지만,
custom node + inspector + form editing 경험을 더 제품 친화적으로 만들고 싶은 팀

### 7.3 3차 사용자
오픈소스 패키지를 평가하며,
public API completeness와 docs 기준을 중시하는 외부 개발자

---

## 8. 사용자가 실제로 써야 하는 방식
이 섹션이 이번 PRD의 핵심이다.

### 8.1 권장 사용 모델
권장 사용 모델은 아래와 같다.

- host 앱이 `nodes`, `edges`, selection 관련 상태를 가진다.
- Builder는 canvas / node / edge / interaction을 렌더링한다.
- 선택된 노드를 inspector 패널에 전달한다.
- inspector는 react-hook-form 같은 폼 라이브러리로 구현할 수 있다.
- submit 또는 live update 시 `updateNodeData`류 API로 그래프 상태를 갱신한다.

이를 한 줄로 표현하면 아래와 같다.

> **Host graph state + Builder canvas + Form-driven inspector sync**

### 8.2 대표 사용 흐름
1. 개발자가 `useWorkflowNodesState`, `useWorkflowEdgesState` 같은 helper로 그래프 상태를 가진다.
2. `WorkflowBuilder` 컴포넌트에 상태와 change handler를 전달한다.
3. 사용자가 노드를 클릭한다.
4. SDK가 selection 정보를 노출한다.
5. inspector 패널이 selection을 기반으로 현재 노드 데이터를 읽는다.
6. inspector 내부는 react-hook-form으로 렌더링된다.
7. 저장/적용 또는 live update 시 node data를 업데이트한다.
8. 노드 UI와 그래프 상태가 즉시 반영된다.

### 8.3 권장 사용 예시
```tsx
const [nodes, setNodes, onNodesChange] = useWorkflowNodesState(initialNodes)
const [edges, setEdges, onEdgesChange] = useWorkflowEdgesState(initialEdges)
const selection = useWorkflowSelection()

const selectedNode = useSelectedNode({ nodes, selection })

function handleApplyNodeData(nextData: Record<string, unknown>) {
  setNodes((prev) =>
    prev.map((node) =>
      node.id === selectedNode?.id
        ? { ...node, data: { ...node.data, ...nextData } }
        : node
    )
  )
}

return (
  <>
    <WorkflowBuilder
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      selection={selection}
      nodeRenderers={nodeRenderers}
    />

    <NodeInspector
      node={selectedNode}
      onApply={handleApplyNodeData}
    />
  </>
)
```

핵심은 이 코드가 **react-hook-form을 강제하지 않으면서도**,
react-hook-form 기반 inspector를 자연스럽게 얹을 수 있어야 한다는 점이다.

---

## 9. 제품 목표
### 9.1 제품 목표
- 외부 개발자에게 “이 SDK를 어떤 방식으로 써야 하는지”를 명확히 제시한다.
- React Flow 대체 관점에서 graph-state API mental model을 제공한다.
- form-driven editing을 example가 아니라 제품 경험으로 설명 가능하게 만든다.

### 9.2 UX 목표
- 사용자는 노드를 클릭하면 편집 맥락이 열린다는 것을 자연스럽게 이해한다.
- inspector 수정 결과가 노드 UI에 즉시 반영된다.
- 사용자는 캔버스와 폼이 연결된 편집 경험을 직관적으로 이해한다.

### 9.3 DX 목표
- 개발자는 그래프 상태를 host에서 어떻게 가져가야 하는지 바로 이해한다.
- 개발자는 react-hook-form 같은 폼 라이브러리를 어떻게 붙여야 하는지 문서만 보고 따라 할 수 있다.
- 개발자는 example를 통째로 복사하지 않고 package API를 중심으로 통합할 수 있다.

---

## 10. 비목표
이번 단계에서 아래는 메인 목표가 아니다.

- SDK 내부를 react-hook-form 기반으로 재설계하는 것
- 특정 폼 라이브러리에 종속된 코어 아키텍처를 만드는 것
- 서버/WASM/Rust 구조를 외부 사용자 학습의 출발점으로 삼는 것
- persistence를 첫 온보딩 단계의 필수 요소로 강제하는 것

즉, 이번 단계의 목표는 **폼 라이브러리 종속 SDK**가 아니라,
**폼 라이브러리와 잘 통합되는 그래프 SDK**다.

---

## 11. 기능 요구사항
### 11.1 Graph State API
React Flow 대체 관점에서 가장 먼저 보여야 하는 public API다.

최소 요구사항:

- `useWorkflowNodesState` 또는 동급 helper
- `useWorkflowEdgesState` 또는 동급 helper
- `onNodesChange`, `onEdgesChange` 유사 change helper
- controlled usage를 기본으로 지원
- selection state를 함께 연결 가능한 구조

이 API는 사용자가 다음을 느끼게 해야 한다.

> “그래프 상태를 내 React 앱 안에서 다루는구나.”

### 11.2 Selection API
선택 상태는 inspector와 form 통합의 시작점이다.

최소 요구사항:

- 현재 선택된 node/edge를 읽을 수 있어야 한다.
- selection 변경 이벤트를 받을 수 있어야 한다.
- 단일 선택 기준 inspector 연결 예제가 제공되어야 한다.
- selection state가 host-controlled 또는 predictable하게 동작해야 한다.

### 11.3 Node Update API
폼 패널이 실제로 그래프를 수정하는 경로가 명확해야 한다.

최소 요구사항:

- 특정 node의 `data`를 업데이트하는 권장 경로가 있어야 한다.
- submit update와 live update 둘 다 가능한 패턴이 있어야 한다.
- 업데이트 결과가 node UI와 graph state에 즉시 반영되어야 한다.
- 문서상 “selected node를 어떻게 수정하는가”가 명확히 설명되어야 한다.

### 11.4 Form Integration Seam
SDK는 react-hook-form 자체를 내장할 필요는 없지만,
react-hook-form과 자연스럽게 통합되도록 해야 한다.

최소 요구사항:

- selected node를 form default value로 넣는 예제가 있어야 한다.
- `watch` 기반 live preview 예제가 있어야 한다.
- `handleSubmit` 기반 apply/update 예제가 있어야 한다.
- 폼 라이브러리 비종속적 설명 + react-hook-form 기준 예시를 함께 제공해야 한다.

### 11.5 Custom Node Architecture
custom node는 그래프 상태 API와 폼 통합 경험이 만나는 지점이다.

최소 요구사항:

- `nodeRenderers` 또는 registry 기반 등록 방식 제공
- node type별 inspector 연결 패턴 문서화
- node data schema를 predictable하게 다룰 수 있는 예제 제공
- form update 결과가 node renderer에 반영되는 흐름 보장

### 11.6 Editing Flow Package Responsibility
아래 흐름은 example-only가 아니라 package의 권장 usage model로 보여야 한다.

- node select
- inspector open
- form edit
- apply/update
- graph sync

모든 단계를 package가 직접 구현할 필요는 없지만,
최소한 **“이 흐름을 어떻게 구성해야 하는지”**는 package API와 문서가 책임져야 한다.

---

## 12. UX 요구사항
- 첫 경험에서 제품이 “엔진 데모”가 아니라 “편집 SDK”로 보여야 한다.
- 노드 선택과 편집 맥락 연결이 자연스러워야 한다.
- inspector는 보조 패널이 아니라 핵심 편집 UI여야 한다.
- 폼 값 변경 전/후가 node card에 즉시 드러나야 한다.
- 사용자는 백엔드/WASM을 몰라도 편집 흐름을 이해할 수 있어야 한다.

---

## 13. DX 요구사항
- Quickstart만 보고 host-controlled 그래프 상태를 띄울 수 있어야 한다.
- 개발자는 selection과 inspector를 어떻게 연결하는지 문서만 보고 구현할 수 있어야 한다.
- react-hook-form integration 예제를 10분 내 재구성할 수 있어야 한다.
- public hook 이름만 봐도 상태가 어디에 있는지 예측 가능해야 한다.
- example와 docs가 같은 mental model을 써야 한다.

---

## 14. 문서 요구사항
오픈소스 최소선으로 아래 문서가 필요하다.

### 필수 문서
1. `Quickstart`
2. `Mental model: Graph state first`
3. `Custom node guide`
4. `Selection + Inspector guide`
5. `react-hook-form integration guide`
6. `React Flow migration / positioning guide`

### 문서의 핵심 메시지
문서는 아래 순서로 사용자를 안내해야 한다.

1. 그래프 상태는 host가 가진다.
2. Builder는 그래프를 렌더링하고 interaction을 제공한다.
3. selection이 편집 맥락을 연다.
4. inspector는 폼 라이브러리로 구현한다.
5. apply/update가 node data를 갱신한다.

---

## 15. 성공 지표
### 정성 지표
- 사용자가 이 제품을 “react-hook-form 기반 엔진”이 아니라 “그래프 상태 SDK + 폼 통합 구조”로 설명할 수 있다.
- 사용자가 “우리 앱 상태와 붙일 수 있겠다”는 감각을 얻는다.
- 리뷰어가 데모보다 public API와 usage model을 먼저 언급한다.

### 실행 지표
- Quickstart만 보고 그래프 상태를 띄울 수 있다.
- 문서만 보고 selection + inspector + form apply 흐름을 구현할 수 있다.
- react-hook-form 기반 inspector 예제를 별도 설명 없이 재현할 수 있다.

---

## 16. 오픈소스 공개 최소선
### A. Graph state helper
최소 1개 이상은 React Flow의 `useNodesState`에 대응하는 체감 API가 필요하다.

예시:

- `useWorkflowNodesState`
- `useWorkflowEdgesState`
- `useWorkflowSelection`

### B. Form integration 문서화
react-hook-form 기준의 통합 가이드가 필요하다.
다만 코어를 react-hook-form에 종속시키면 안 된다.

### C. Selected node update path 명확화
선택된 노드를 읽고 수정하는 public path가 명확해야 한다.

### D. Example에서 package로 승격된 사용 모델
example만 잘 되는 것이 아니라,
package 문서만으로도 같은 구조를 구현할 수 있어야 한다.

---

## 17. 우선순위
### P0
**React Flow의 `useNodesState`에 대응하는 graph-state helper 설계**

이게 있어야 사용자가 제품을 graph-state SDK로 이해한다.

### P1
**Selection → inspector → node update 흐름의 public seam 정리**

특히 selected node를 안전하고 예측 가능하게 다루는 usage model이 필요하다.

### P2
**react-hook-form integration guide 작성**

내부를 RHF 기반으로 바꾸는 것이 아니라,
RHF와 잘 붙는 사용 방식을 공식 문서로 제시한다.

### P3
**Custom node + form sync example를 package 사용 모델에 맞게 재정리**

example가 package 철학을 증명하는 방향으로 정렬되어야 한다.

---

## 18. 수용 기준
다음 조건이 충족되면 이번 PRD 목표를 달성한 것으로 본다.

1. 제품 정의가 “graph-state SDK + form integration”으로 설명된다.
2. public API에서 graph-state helper가 최소 하나 제공된다.
3. selected node를 읽고 수정하는 권장 경로가 문서화된다.
4. react-hook-form integration 예제가 공식 문서에 존재한다.
5. 개발자가 example 없이도 selection → inspector → apply 흐름을 재현할 수 있다.
6. 내부 구현이 RHF 기반이 아니어도 외부 사용 경험이 자연스럽다.

---

## 19. 리스크
- 내부 설계를 폼 라이브러리 중심으로 잘못 끌고 가면 코어 그래프 모델이 약해질 수 있다.
- 반대로 form integration seam이 약하면 실제 제품 편집 경험이 거칠어질 수 있다.
- docs 없이 example만 남으면 다시 PoC처럼 보일 수 있다.
- React Flow와의 차이와 대응 관계를 설명하지 못하면 마이그레이션 동기가 약해진다.

---

## 20. 한 줄 결론
**React Flow는 react-hook-form 기반이 아니다.**
React Flow는 **그래프 상태 중심 라이브러리**이고,
react-hook-form은 **폼 상태 중심 라이브러리**다.

따라서 우리도 내부를 react-hook-form 기반으로 만들 필요는 없다.
대신,

> **그래프 상태 API는 React Flow처럼 명확하게 제공하고,
> 폼 통합 경험은 react-hook-form과 자연스럽게 붙도록 설계하는 Builder SDK**

로 가는 것이 맞다.

---

## 21. 다음 액션 제안
1. `useWorkflowNodesState` / `useWorkflowEdgesState` API spec 작성
2. `useWorkflowSelection`과 selected node access pattern 정의
3. `updateNodeData` 권장 경로 설계
4. `react-hook-form integration guide` 초안 작성
5. package responsibility와 example responsibility 재분리
