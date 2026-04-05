# MiniStack Web Console

## What This Is

MiniStack은 무료 오픈소스 로컬 AWS 에뮬레이터로, 현재 35+ AWS 서비스를 API 레벨에서 에뮬레이션한다. 이 프로젝트는 MiniStack에 **AWS 콘솔과 동일한 웹 UI**를 추가하여, 브라우저에서 모든 에뮬레이션 서비스의 리소스를 시각적으로 조회/생성/수정/삭제할 수 있게 하는 것이다.

## Core Value

브라우저에서 AWS 콘솔처럼 로컬 에뮬레이터의 모든 리소스를 시각적으로 관리할 수 있어야 한다.

## Requirements

### Validated

- ✓ EC2 서비스 에뮬레이션 (인스턴스, VPC, 서브넷, 보안그룹, EBS, NAT 등) — existing
- ✓ S3 서비스 에뮬레이션 — existing
- ✓ Lambda 서비스 에뮬레이션 (Docker 이미지 포함) — existing
- ✓ DynamoDB, SQS, SNS, Kinesis 등 35+ 서비스 API 에뮬레이션 — existing
- ✓ 단일 포트(4566) ASGI 게이트웨이 — existing
- ✓ AWS CLI/boto3/SDK 호환 — existing
- ✓ Docker 기반 배포 — existing

### Active

- [ ] AWS 콘솔 스타일 웹 UI (전체 35+ 서비스)
- [ ] 서비스별 리소스 목록 조회 (테이블 뷰)
- [ ] 리소스 상세 정보 확인
- [ ] 리소스 생성/수정/삭제 (CRUD)
- [ ] EC2 대시보드 (인스턴스 목록, 상태, 시작/중지/종료)
- [ ] S3 대시보드 (버킷/객체 탐색, 업로드/다운로드)
- [ ] Lambda 대시보드 (함수 목록, 테스트 실행)
- [ ] 글로벌 네비게이션 (서비스 검색, 서비스 간 이동)
- [ ] 실시간 상태 업데이트

### Out of Scope

- 실제 VM/컨테이너 기반 EC2 인스턴스 실행 — 에뮬레이터 목적은 API 호환성이지 실제 컴퓨팅이 아님
- 사용자 인증/로그인 — 로컬 개발 도구이므로 인증 불필요
- 멀티 리전 동시 지원 — 단일 리전 에뮬레이션으로 충분
- 비용/빌링 대시보드 — 로컬 에뮬레이터에 불필요

## Context

- Python 3.10+ 기반 ASGI 앱 (uvicorn)
- 포트 4566에서 모든 서비스 라우팅
- EC2 서비스가 가장 큰 모듈 (3,175줄), 메모리 기반 상태 관리
- 서비스별로 독립된 핸들러 파일 (`ministack/services/`)
- 코어 라우터가 AWS 헤더/경로 기반으로 서비스 디스패치
- Docker + Redis 기반 배포 (docker-compose.yml)
- 현재 웹 UI 없음 — API 전용

## Constraints

- **Tech stack**: Python 백엔드 유지 (기존 ASGI 앱에 통합)
- **Architecture**: 기존 4566 포트에 웹 UI 라우트 추가 (별도 서버 X)
- **Compatibility**: 기존 AWS API 에뮬레이션에 영향 없어야 함
- **Dependencies**: 최소한의 추가 의존성 (기존 ministack의 경량 철학 유지)

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| 기존 4566 포트에 UI 통합 | 별도 서버 없이 단일 진입점 유지, 사용자 경험 일관성 | — Pending |
| 프론트엔드 기술 스택 | 사용자 상관없음 — 최적 선택 필요 | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd:transition`):
1. Requirements invalidated? -> Move to Out of Scope with reason
2. Requirements validated? -> Move to Validated with phase reference
3. New requirements emerged? -> Add to Active
4. Decisions to log? -> Add to Key Decisions
5. "What This Is" still accurate? -> Update if drifted

**After each milestone** (via `/gsd:complete-milestone`):
1. Full review of all sections
2. Core Value check -- still the right priority?
3. Audit Out of Scope -- reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-04-05 after initialization*
