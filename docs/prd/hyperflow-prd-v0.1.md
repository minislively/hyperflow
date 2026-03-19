# PRD

## 프로젝트명: HyperFlow

**부제:** 고성능 워크플로우 빌더 SDK  
**문서 버전:** v0.1  
**상태:** Draft

**작성 목적:** HyperFlow를 “렌더링 엔진”이 아니라 **워크플로우 제품을 빠르게 만들고, 규모가 커져도 성능 저하 없이 운영할 수 있게 해주는 Workflow Builder SDK**로 정의하기 위한 제품 요구사항 문서.

---

## 1. 제품 한 줄 정의

**복잡한 워크플로우도 버벅이지 않게 만들 수 있는 production-ready workflow builder SDK**

보조 설명:

- React 같은 기존 앱에 붙이기 쉬운 워크플로우 빌더 SDK
- 커스텀 노드/패널/검증 흐름을 제품에 맞게 확장할 수 있는 기반
- 큰 그래프에서도 상호작용 품질을 지키기 위한 고성능 아키텍처를 내장한 제품

---

## 2. 문제 정의

많은 팀은 노드 기반 제품을 만들 때 다음 흐름을 겪는다.

1. 범용 라이브러리로 빠르게 프로토타입한다.
2. 노드 수, 엣지 수, 커스텀 UI, 검증 규칙, 패널 복잡도가 커진다.
3. 렌더링 병목과 구조적 한계가 드러난다.
4. 결국 캔버스, 인터랙션, 가상화, 성능 최적화를 직접 떠안게 된다.

이때 팀이 실제로 원하는 것은 “빠른 엔진” 자체가 아니다.

원하는 것은 아래에 가깝다.

- 서비스에 넣을 수 있는 워크플로우 빌더
- 커스터마이즈가 쉬운 SDK
- 규모가 커져도 느려지지 않는 편집 경험
- 출시 시간을 줄여주는 Starter Kit 방향

즉 HyperFlow가 해결하려는 문제는:

**“프로덕션에 견디는 워크플로우 빌더를 빠르게 만들 수 있는 기반이 부족하다”** 이다.

---

## 3. 제품 가설

### 핵심 가설

노드 기반 제품을 만드는 팀은 “멋진 렌더링 엔진”보다 **실제로 붙여서 바로 제품을 만들 수 있는 workflow builder SDK**를 더 높은 가치로 인식한다.

### 보조 가설

- 성능은 메인 카피보다 **도입 정당화 요소**로 작동한다.
- 메인 메시지는 “무엇을 만들 수 있는가”여야 한다.
- Rust/WASM/Canvas는 headline이 아니라 **왜 가능한지 설명하는 기술 근거**다.
- 초기 고객은 최종 사용자가 아니라 **제품팀 / 프론트엔드팀**이다.

---

## 4. 타겟 사용자

### 1차 타겟

- 자동화 SaaS 팀
- AI/에이전트 오케스트레이션 UI 팀
- 데이터 파이프라인 / ETL UI 팀
- 내부 운영툴 / 승인 프로세스 툴 팀
- 마케팅 플로우 / 규칙 엔진 / 여정 빌더 팀

### 핵심 사용자 역할

- **Product Engineer**: 화면을 빠르게 붙이고 커스터마이즈 가능한 SDK가 필요함
- **Frontend Lead**: 노드 수 증가 시 렉과 구조적 복잡도 폭증을 피하고 싶음
- **CTO / Founding Engineer**: 캔버스 엔진까지 직접 만들고 싶지 않음
- **Product Manager**: 편집기 품질이 제품 경쟁력에 직접 영향을 줌

---

## 5. 제품 원칙

1. **Product-first, engine-second**  
   겉으로는 SDK/Starter Kit, 안쪽에서 엔진이 작동한다.

2. **Production-ready by default**  
   데모용 캔버스가 아니라 실제 서비스에 넣을 수 있는 방향을 우선한다.

3. **Integrate, don’t dictate**  
   호스트 앱의 인증, 데이터 모델, 패널, 디자인 시스템과 자연스럽게 통합되어야 한다.

4. **Performance at scale**  
   작은 데모에서만 빠른 것이 아니라 복잡도가 커질수록 가치가 커져야 한다.

5. **Honest maturity**  
   현재 검증된 범위와 미래 방향을 명확히 구분한다.

---

## 6. 제품 구조

HyperFlow는 두 개의 제품 레이어와 하나의 기반 아키텍처로 이해한다.

### A. Core SDK

개발자가 React/TS 앱 안에서 워크플로우 에디터를 만들 수 있게 하는 핵심 레이어

포함 방향:

- 노드/엣지 데이터 모델
- 캔버스 렌더링과 기본 상호작용
- 상태 변경 훅 및 이벤트 시스템
- 커스텀 노드/패널 통합 지점
- 성능 최적화 레이어

### B. Starter Kit / Starter Surface

도입 속도를 높이기 위한 예제/가이드/기본 UI 뼈대

포함 방향:

- 기본 레이아웃 예시
- palette / inspector / toolbar 같은 표면 예제
- persistence / theming / custom node 예시
- docs + examples

### C. Enabling Architecture

제품 약속을 가능하게 하는 내부 기술 기반

- Rust + WASM 기반 코어 계산
- Canvas 중심 렌더링 경로
- DOM overlay 기반 제품 UI 통합

외부 메시지 우선순위는 **SDK → Starter Kit → enabling architecture** 순서다.

---

## 7. 현재 repo 기준으로 검증된 범위

현재 저장소는 전체 제품을 구현한 상태가 아니라, 아래 **narrow validated slice**를 증명하는 단계다.

검증됨:

- viewport math
- visible culling
- hit testing
- thin WASM bridge
- visible-box canvas rendering
- guided vanilla demo surface
- small PoC용 안정화 SDK contract

아직 제품 완성으로 약속하지 않는 것:

- 광범위한 wrapper maturity
- 풍부한 editor/runtime authoring API
- 완성형 Starter Kit UI
- 협업 / 버전 히스토리
- 전체 패키지 수준의 넓은 public API stabilization

---

## 8. MVP 방향

이번 단계에서 HyperFlow가 외부에 약속해야 하는 MVP는 “완성형 플랫폼”이 아니라 다음과 같다.

### 필수 약속

- HyperFlow는 workflow builder SDK다.
- 현재는 좁은 PoC contract가 검증된 상태다.
- 제품 표면은 Starter Kit 방향으로 확장 중이다.
- 큰 그래프와 복잡한 상호작용을 염두에 둔 아키텍처를 택하고 있다.

### 방향성 약속

- 제품 통합 친화적 API
- 커스텀 노드/패널 중심 확장성
- React-friendly integration
- examples/docs 기반 빠른 평가 경로

### 이번 단계에서 명시적으로 제외

- 실시간 협업
- 버전 히스토리 UI
- 워크플로우 실행 엔진 자체
- 전체 패키지 수준의 broad stable API freeze

---

## 9. 포지셔닝

### 메인 포지션

**고성능 워크플로우 빌더 SDK**

### 보조 포지션

**빠른 도입을 위한 Starter Kit 방향을 가진 SDK**

### 피해야 할 포지션

- 차세대 렌더링 엔진
- Rust/WASM 그래프 엔진
- Canvas 기반 시각화 기술

기술적으로 맞더라도 제품 도입 관점에서는 한 단계 추상적이다.

---

## 10. React Flow 비교 원칙

React Flow 비교는 허용하지만 **secondary bridge**로만 사용한다.

올바른 순서:

1. HyperFlow는 workflow builder SDK다.
2. 대규모 그래프/커스텀 제품화에 강한 방향을 가진다.
3. 그래서 React Flow–style 도구를 검토하던 팀에게도 대안이 될 수 있다.

잘못된 순서:

1. React Flow 대체재
2. 더 빠름
3. 그래서 HyperFlow

---

## 11. 비목표

초기 단계에서 아래는 핵심 목표가 아니다.

- 범용 다이어그램 툴
- 화이트보드형 자유 캔버스
- 워크플로우 실행기(runtime)
- 백엔드 오케스트레이션 플랫폼
- 실시간 협업 편집
- 버전 히스토리 UI
- 완전한 노코드 플랫폼
- 모든 프레임워크 wrapper의 동시 성숙화

---

## 12. 성공 기준

### Product clarity

- README 첫 화면만 보고도 workflow builder SDK라는 점이 이해된다.
- PRD와 architecture docs가 서로 다른 제품 정체성을 말하지 않는다.
- SDK vs Starter Kit vs enabling architecture 구분이 명확하다.

### Evaluation readiness

- 현재 repo가 무엇을 이미 검증했고, 무엇이 아직 방향성인지 구분된다.
- example/demo를 통해 제품 방향을 이해할 수 있다.
- 성능 메시지가 headline이 아니라 trust signal로 동작한다.

### Scope honesty

- placeholder surface가 실제 완성도 이상을 암시하지 않는다.
- collaboration/history가 이번 MVP 범위가 아님이 명확하다.
- React Flow 비교가 메인 카테고리를 잠식하지 않는다.

---

## 13. 메시지 가드레일

- Primary category: **workflow builder SDK**
- Secondary support: **Starter Kit direction**
- Technical proof: **Rust + WASM + Canvas**
- Comparison bridge: **React Flow–style alternatives**

항상 “무엇을 만들 수 있는가”를 먼저 말하고, “왜 빠른가”는 뒤에 둔다.

---

## 14. 한 줄 결론

**HyperFlow는 렌더링 기술을 파는 제품이 아니라, 성능 문제 없이 워크플로우 제품을 만들고 출시하게 해주는 Workflow Builder SDK다.**
