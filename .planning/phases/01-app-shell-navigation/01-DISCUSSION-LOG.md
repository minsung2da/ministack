# Phase 1: App Shell & Navigation - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-05
**Phase:** 01-app-shell-navigation
**Areas discussed:** Console API Design, Service Navigation, Build/Deploy Pipeline, Layout/UX

---

## Console API Design

| Option | Description | Selected |
|--------|-------------|----------|
| Console API (권장) | /_console/api/ 전용 엔드포인트 — 서비스 모듈 상태를 직접 읽어 UI 친화적 JSON 반환 | |
| AWS API 직접 호출 | 프론트엔드가 boto3처럼 AWS API를 직접 호출하고 XML/JSON 파싱 | ✓ |
| 하이브리드 | 조회는 Console API, 액션(create/delete)은 AWS API 직접 호출 | |

**User's choice:** AWS API 직접 호출
**Notes:** 프론트엔드가 AWS SDK처럼 동작하는 방식 선호

---

| Option | Description | Selected |
|--------|-------------|----------|
| 플랫 JSON (권장) | 단순한 key-value JSON — 프론트엔드에서 바로 사용 | |
| AWS 호환 JSON | AWS API 응답과 동일한 구조 유지 | ✓ |
| 알아서 최적화 | Claude의 재량에 맡김 | |

**User's choice:** AWS 호환 JSON

---

| Option | Description | Selected |
|--------|-------------|----------|
| 프론트엔드 파싱 | fast-xml-parser로 프론트에서 XML을 JSON으로 변환 | |
| 백엔드 변환 레이어 | /_console/api/ 엔드포인트로 XML→JSON 변환해서 전달 | |
| 알아서 최적화 | Claude의 재량에 맡김 | ✓ |

**User's choice:** Claude 재량 (XML 파싱 전략)

---

## Service Navigation

| Option | Description | Selected |
|--------|-------------|----------|
| AWS 카테고리 (권장) | Compute, Storage, Database, Networking 등 AWS 콘솔과 동일한 분류 | ✓ |
| 플랫 리스트 | 카테고리 없이 알파벳순 나열 | |
| 사용 빈도순 | 자주 쓰는 서비스 상단 배치 | |

**User's choice:** AWS 카테고리

---

| Option | Description | Selected |
|--------|-------------|----------|
| 타입어헤드 (권장) | 키워드 입력시 매칭되는 서비스 즉시 필터링 | ✓ |
| 단순 필터 | 텍스트 입력 후 엔터로 검색 | |

**User's choice:** 타입어헤드

---

| Option | Description | Selected |
|--------|-------------|----------|
| 리소스 카운트 + 상태 (권장) | '인스턴스 5개 (3 running, 2 stopped)' 같은 요약 | ✓ |
| 카운트만 | 단순히 '인스턴스: 5개' 수준 | |
| 알아서 최적화 | Claude의 재량에 맡��� | |

**User's choice:** 리소스 카운트 + 상태

---

## Build/Deploy Pipeline

| Option | Description | Selected |
|--------|-------------|----------|
| Python 패키지 포함 (권장) | npm run build 후 정적 파일을 Python 패키지에 포함, pip install만으로 완료 | |
| Docker 멀티스테이지 | Dockerfile에서 Node 빌드 후 Python 이미지에 복사 | ✓ |
| 별도 npm build 단계 | 사용자가 npm build를 직접 실행해야 함 | |
| 알아서 최적화 | Claude의 재량에 맡김 | |

**User's choice:** Docker 멀티스테이지

---

| Option | Description | Selected |
|--------|-------------|----------|
| Vite dev + proxy (권장) | Vite dev server가 :5173에서 동작, API를 :4566으로 proxy | |
| 단일 서버 | Python이 Vite 리빌드를 watch해서 서빙 | |
| 알아서 최적화 | Claude의 재량에 맡김 | |

**User's choice:** Vite dev + proxy (포트 변경: 프론트 6655, API 5566)

---

## Layout/UX

| Option | Description | Selected |
|--------|-------------|----------|
| AWS 콘솔 클론 (권장) | 상단 고정 헤더 + 좌측 사이드바 + 메인 콘텐츠 — AWS 콘솔과 거의 동일 | ✓ |
| 단순화 | 상단 네비 + 메인 콘텐츠만 — 사이드바 없��� 간결하게 | |
| 알아서 최적화 | Claude의 재량에 맡김 | |

**User's choice:** AWS 콘솔 클론

---

| Option | Description | Selected |
|--------|-------------|----------|
| /_console/ec2/instances | /_console/ 프리픽스 + 서비스명 + 리소스 타입 | |
| /_console/#/ec2/instances | 해시 기반 라우팅 — 서버 설정 불필요 | |
| 알아서 최적화 | Claude의 재량에 맡김 | ✓ |

**User's choice:** Claude 재량 (URL 패턴)

---

## Claude's Discretion

- XML 파싱 전략 (프론트 vs 백엔드 vs 하이브리드)
- URL 라우팅 패턴 (hash vs history, 경로 구조)
- 프론트엔드 프로젝트 구조 및 디렉토리 레이아웃
- SPA 폴백 라우팅 구현

## Deferred Ideas

None
