# Requirements: MiniStack Web Console

**Defined:** 2026-04-05
**Core Value:** 브라우저에서 AWS 콘솔처럼 로컬 에뮬레이터의 모든 리소스를 시각적으로 관리할 수 있어야 한다.

## v1 Requirements

### Foundation (앱 셸 & 인프라)

- [ ] **FOUND-01**: 기존 4566 포트에서 `/_console/` 경로로 웹 UI를 서빙한다
- [ ] **FOUND-02**: React 19 + Cloudscape v3 + Vite 6 기반 SPA를 빌드하고 ASGI 미들웨어로 정적 파일을 서빙한다
- [ ] **FOUND-03**: 기존 AWS API 에뮬레이션 라우팅에 영향을 주지 않는다
- [ ] **FOUND-04**: Console API (`/_console/api/`)가 서비스 모듈 상태를 직접 읽어 UI 친화적 JSON을 반환한다

### Navigation (글로벌 네비게이션)

- [ ] **NAV-01**: 상단 네비게이션 바에서 서비스를 검색하여 즉시 이동할 수 있다
- [ ] **NAV-02**: 각 서비스 페이지에 서브 리소스별 좌측 사이드바가 표시된다
- [ ] **NAV-03**: 현재 위치를 나타내는 브레드크럼 네비게이션이 동작한다
- [ ] **NAV-04**: 각 서비스 홈 페이지에 리소스 수와 상태 요약이 표시된다
- [ ] **NAV-05**: 데스크톱 우선 반응형 레이아웃이 일반 노트북 화면에서 깨지지 않는다

### Resource Management (리소스 CRUD)

- [ ] **CRUD-01**: 리소스 목록을 정렬/필터 가능한 테이블로 조회할 수 있다
- [ ] **CRUD-02**: 리소스를 클릭하면 모든 속성이 표시되는 상세 뷰를 볼 수 있다
- [ ] **CRUD-03**: 폼을 통해 새 리소스를 생성할 수 있다
- [ ] **CRUD-04**: 확인 다이얼로그 후 리소스를 삭제할 수 있다
- [ ] **CRUD-05**: 서비스별 액션을 수행할 수 있다 (EC2 start/stop, Lambda invoke 등)
- [ ] **CRUD-06**: 수동 새로고침 버튼으로 리소스 목록을 갱신할 수 있다

### EC2 Service UI

- [ ] **EC2-01**: 인스턴스 목록에 상태 인디케이터(running=초록, stopped=노랑, terminated=빨강)가 표시된다
- [ ] **EC2-02**: 인스턴스 시작/중지/종료/재부팅 액션을 수행할 수 있다
- [ ] **EC2-03**: VPC, 서브넷, 보안그룹, 키페어 각각의 목록/상세 페이지가 있다
- [ ] **EC2-04**: EBS 볼륨, 스냅샷 목록/상세/생성/삭제가 가능하다
- [ ] **EC2-05**: Elastic IP, NAT Gateway, Internet Gateway 관리가 가능하다
- [ ] **EC2-06**: 인스턴스 생성 시 인스턴스 타입(t4g.large 등), VPC, 서브넷, 보안그룹을 선택할 수 있다

### S3 Service UI

- [ ] **S3-01**: 버킷 목록을 조회하고 새 버킷을 생성/삭제할 수 있다
- [ ] **S3-02**: 버킷 내 객체를 폴더처럼 탐색할 수 있다 (prefix 기반 네비게이션)
- [ ] **S3-03**: 객체를 업로드(드래그앤드롭)하고 다운로드할 수 있다
- [ ] **S3-04**: 객체 메타데이터를 확인할 수 있다

### Lambda Service UI

- [ ] **LAM-01**: 함수 목록에 런타임, 핸들러, 최종 수정 시간이 표시된다
- [ ] **LAM-02**: JSON 페이로드로 함수를 테스트 실행하고 응답/로그를 확인할 수 있다
- [ ] **LAM-03**: 함수 상세 페이지에서 설정, 환경변수, 트리거 정보를 볼 수 있다

### DynamoDB Service UI

- [ ] **DDB-01**: 테이블 목록과 테이블 상세 정보(키 스키마, 인덱스 등)를 볼 수 있다
- [ ] **DDB-02**: 테이블 아이템을 스캔/쿼리하고 JSON으로 볼 수 있다
- [ ] **DDB-03**: 아이템을 생성/수정/삭제할 수 있다

### SQS Service UI

- [ ] **SQS-01**: 큐 목록에 메시지 수와 in-flight 수가 표시된다
- [ ] **SQS-02**: 메시지를 보내고 수신(폴링)할 수 있다
- [ ] **SQS-03**: 큐를 퍼지할 수 있다

### Generic Service UI (나머지 30+ 서비스)

- [ ] **GEN-01**: 스키마 기반 제네릭 컴포넌트로 모든 서비스의 리소스 목록을 표시한다
- [ ] **GEN-02**: 각 서비스 리소스의 상세 뷰를 JSON 형태로 볼 수 있다
- [ ] **GEN-03**: 서비스 디스크립터(스키마)를 추가하면 별도 코드 없이 새 서비스 UI가 생성된다

### Data Display (데이터 표시 품질)

- [ ] **DISP-01**: JSON 데이터를 접이식 트리 뷰로 표시하고 복사할 수 있다
- [ ] **DISP-02**: ARN을 클릭하면 클립보드에 복사된다
- [ ] **DISP-03**: 타임스탬프가 상대 시간("2분 전")으로 표시되고 호버 시 절대 시간을 보여준다
- [ ] **DISP-04**: 리소스가 없을 때 안내 메시지와 생성 버튼이 표시된다
- [ ] **DISP-05**: API 호출 중 로딩 상태(스켈레톤/스피너)가 표시된다
- [ ] **DISP-06**: 오류 발생 시 토스트 알림이 표시된다

### Differentiators (차별화 기능)

- [ ] **DIFF-01**: 서비스별 또는 전체 리소스를 한 번에 리셋할 수 있다
- [ ] **DIFF-02**: 다크 모드 토글이 동작한다

## v2 Requirements

### Advanced Features

- **ADV-01**: 크로스 서비스 리소스 그래프 (Lambda -> SQS -> DynamoDB 연결 시각화)
- **ADV-02**: 리퀘스트/리스폰스 인스펙터 (MiniStack이 받은 모든 API 호출 DevTools)
- **ADV-03**: 실시간 WebSocket 업데이트
- **ADV-04**: 상태 스냅샷 Import/Export
- **ADV-05**: Cmd+K 커맨드 팔레트
- **ADV-06**: 통합 로그 테일 뷰
- **ADV-07**: 인라인 코드/설정 편집기 (Lambda 코드, IAM 정책)
- **ADV-08**: CloudWatch Logs 스트림 뷰어

## Out of Scope

| Feature | Reason |
|---------|--------|
| 인증/로그인 | 로컬 개발 도구이므로 불필요 |
| 빌링/비용 대시보드 | 로컬 에뮬레이터에 실제 비용 없음 |
| 멀티 리전 전환 | 백엔드가 단일 리전만 지원 |
| CloudFormation 디자이너 | 복잡도 대비 가치 낮음, CLI로 충분 |
| 픽셀 단위 AWS 콘솔 복제 | 무한한 작업량, 법적 리스크 |
| CloudWatch 메트릭 차트 | 실제 컴퓨팅 없어 메트릭 데이터 없음 |
| 모바일 레이아웃 | 로컬 개발 도구를 모바일로 관리할 필요 없음 |
| 실시간 WebSocket (전체) | v1에서는 polling으로 충분, 복잡도 높음 |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| FOUND-01 | Phase 1 | Pending |
| FOUND-02 | Phase 1 | Pending |
| FOUND-03 | Phase 1 | Pending |
| FOUND-04 | Phase 1 | Pending |
| NAV-01 | Phase 1 | Pending |
| NAV-02 | Phase 1 | Pending |
| NAV-03 | Phase 1 | Pending |
| NAV-04 | Phase 1 | Pending |
| NAV-05 | Phase 1 | Pending |
| CRUD-01 | Phase 2 | Pending |
| CRUD-02 | Phase 2 | Pending |
| CRUD-03 | Phase 2 | Pending |
| CRUD-04 | Phase 2 | Pending |
| CRUD-05 | Phase 2 | Pending |
| CRUD-06 | Phase 2 | Pending |
| EC2-01 | Phase 2 | Pending |
| EC2-02 | Phase 2 | Pending |
| EC2-03 | Phase 2 | Pending |
| EC2-04 | Phase 2 | Pending |
| EC2-05 | Phase 2 | Pending |
| EC2-06 | Phase 2 | Pending |
| S3-01 | Phase 3 | Pending |
| S3-02 | Phase 3 | Pending |
| S3-03 | Phase 3 | Pending |
| S3-04 | Phase 3 | Pending |
| LAM-01 | Phase 3 | Pending |
| LAM-02 | Phase 3 | Pending |
| LAM-03 | Phase 3 | Pending |
| DDB-01 | Phase 4 | Pending |
| DDB-02 | Phase 4 | Pending |
| DDB-03 | Phase 4 | Pending |
| SQS-01 | Phase 4 | Pending |
| SQS-02 | Phase 4 | Pending |
| SQS-03 | Phase 4 | Pending |
| GEN-01 | Phase 4 | Pending |
| GEN-02 | Phase 4 | Pending |
| GEN-03 | Phase 4 | Pending |
| DISP-01 | Phase 5 | Pending |
| DISP-02 | Phase 5 | Pending |
| DISP-03 | Phase 5 | Pending |
| DISP-04 | Phase 5 | Pending |
| DISP-05 | Phase 5 | Pending |
| DISP-06 | Phase 5 | Pending |
| DIFF-01 | Phase 5 | Pending |
| DIFF-02 | Phase 5 | Pending |

**Coverage:**
- v1 requirements: 45 total
- Mapped to phases: 45
- Unmapped: 0

---
*Requirements defined: 2026-04-05*
*Last updated: 2026-04-05 after roadmap creation*
