# example-react-starter

`examples/react-starter`는 지금 **완성형 editor 데모**가 아니라,  
HyperFlow를 처음 보는 프론트엔드 팀을 위한 **beginner-first Learn surface**다.

핵심 목적은 이 네 가지를 먼저 이해하게 만드는 것이다.

1. HyperFlow가 지금 **무엇인지**
2. React Flow 옆에서 **왜 따로 존재하는지**
3. 지금 **어떻게 로컬에서 실행하고 읽는지**
4. 지금 **무엇이 되고, 무엇이 아직 아닌지**

## 현재 경로 구조

- locale-aware top-level paths
  - `/ko/learn`
  - `/ko/reference`
  - `/ko/examples`
  - `/ko/roadmap`
- 영어도 동일하게 `/en/...`
- locale 없는 경로는 브라우저 언어를 보고 `/ko/...` 또는 `/en/...`로 보정

## Learn 순서

### Beginner-first pages
- `/ko/learn`
- `/ko/learn/installation`
- `/ko/learn/when-to-use`
- `/ko/learn/nodes-and-edges`
- `/ko/learn/selection-and-editing`
- `/ko/learn/basic-interactions`
- `/ko/learn/viewport`
- `/ko/learn/save-and-restore`
- `/ko/learn/add-to-react-app`

### Later pages
- `/ko/learn/layouting`
- `/ko/learn/performance`
- `/ko/learn/troubleshooting`

## 이 Learn surface가 먼저 답하려는 질문

- HyperFlow는 지금 뭔가?
- React Flow와 무엇이 다른가?
- 지금은 패키지를 설치하는 단계인가, repo를 실행하는 단계인가?
- node editor처럼 무엇을 직접 만져볼 수 있나?
- 지금 되는 것과 아직 안 되는 것은 무엇인가?

## live demo에 대한 현재 원칙

`basic-interactions`와 `save-and-restore`는 유지한다.  
여기서 `basic-interactions`는 **직접 authoring 기본기 proof**, `save-and-restore`는 **그 상태가 persistence까지 이어지는지 보는 proof**다.

즉 문서는 먼저:
- what you see
- what you can try now
- what works now
- what is later

를 설명하고, live demo는 그 뒤에서 손으로 확인하게 한다.

현재 live demo에서 바로 해볼 수 있는 것은:
- 캔버스 안의 **노드 추가** 버튼으로 viewport 중심에 새 노드 추가
- 노드 직접 드래그
- handle 클릭으로 edge 연결
- node / edge 선택 후 **선택 삭제**
- `save-and-restore`에서 nodes / edges / viewport 저장/복원

## 아직 주장하지 않는 것

이 starter는 아직 아래를 주장하지 않는다.

- broad React Flow parity
- 완성형 authoring shell
- workflow-builder template
- built-in auto-layout engine
- published package install flow

## run

repo root에서:

```bash
pnpm install
pnpm run dev:react-starter
```

기본 확인 경로:

```text
http://localhost:5173/ko/learn
```

## 읽는 법

처음 보는 사람이라면 이 순서를 추천한다.

1. `/ko/learn`
2. `/ko/learn/installation`
3. `/ko/learn/when-to-use`
4. `/ko/learn/nodes-and-edges`
5. `/ko/learn/selection-and-editing`
6. `/ko/learn/basic-interactions`
7. `/ko/learn/viewport`
8. `/ko/learn/save-and-restore`
9. `/ko/learn/add-to-react-app`
