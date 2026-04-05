# Feature Landscape

**Domain:** AWS Console-style Web UI for Local Emulator (MiniStack)
**Researched:** 2026-04-05
**Mode:** Ecosystem

## Table Stakes

Features users expect from any AWS console-like management UI. Missing any of these and the product feels incomplete or toy-like.

### Global Navigation and Layout

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Top navigation bar with service search | AWS Console's core UX pattern; users expect to type "S3" and jump there instantly | Medium | Typeahead search across 35+ services. Cloudscape calls this "service navigation" |
| Left sidebar per-service navigation | Every AWS service console has a sidebar grouping sub-resources (e.g., EC2 sidebar: Instances, Volumes, Security Groups, VPCs) | Medium | Must be service-context-aware, collapses on narrow screens |
| Breadcrumb navigation | Users need to know where they are (Service > Resource Type > Resource ID) | Low | Standard pattern from Cloudscape design system |
| Service home/dashboard page | Each service needs a landing page summarizing resource counts and status | Medium | Not just a list -- show counts, health indicators |
| Responsive layout (desktop-first) | Developers use various screen sizes, but primarily desktop | Medium | Desktop-first is correct; should not break at common laptop sizes |

### Resource Management (CRUD)

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Resource list view (table) | The fundamental pattern: sortable, filterable table of resources | Medium | Cloudscape "Table View" pattern -- columns, sorting, filtering, pagination |
| Resource detail view | Click a resource to see all its properties | Medium | Split-panel or full-page detail, showing all API-returned fields |
| Resource creation forms | Create new resources via forms (not just CLI) | High | Per-service forms with validation; this is the most labor-intensive feature category |
| Resource deletion with confirmation | Delete resources with a confirmation dialog | Low | Standard pattern, batch delete support |
| Resource actions (start/stop/invoke) | Service-specific actions beyond CRUD (e.g., start EC2, invoke Lambda, purge SQS) | Medium | Action dropdown per resource type |
| Refresh / manual reload | Explicit refresh button for resource lists | Low | Auto-refresh is a differentiator; manual refresh is table stakes |

### Per-Service UI (Priority Services)

These are the services developers interact with most frequently via UI. Each needs service-specific treatment beyond generic CRUD.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **S3: Bucket browser with folder navigation** | S3 is the most commonly used service; users expect to browse objects like a file system | High | Folder-like prefix navigation, breadcrumbs within bucket, object metadata display |
| **S3: Object upload/download** | Core S3 interaction -- drag-and-drop upload, click-to-download | Medium | Multipart upload for large files, download via presigned URL or direct stream |
| **EC2: Instance list with state indicators** | Visual state (running/stopped/terminated) with color coding | Medium | State badges (green=running, yellow=stopping, red=terminated) |
| **EC2: Instance actions (start/stop/terminate)** | Primary EC2 management actions | Low | Dropdown or button group per instance |
| **EC2: Networking sub-pages (VPC, Subnets, Security Groups)** | EC2 is MiniStack's largest module (3,175 lines) with VPC, subnet, SG, EBS, NAT resources | Medium | Reuse generic table pattern; each sub-resource gets its own list/detail |
| **Lambda: Function list with runtime/handler info** | Developers need to see what is deployed | Low | Table with function name, runtime, handler, last modified |
| **Lambda: Test invoke with JSON payload** | The single most valuable Lambda console feature -- invoke with test event and see response | Medium | JSON editor for payload, response display with execution log |
| **DynamoDB: Table item browser** | Query and scan items, view/edit individual items | High | Visual query builder or scan with filters, JSON display of items |
| **SQS: Queue list with message counts** | See approximate message count, in-flight count | Low | Queue attributes display |
| **SQS: Send/receive/purge messages** | Core debugging workflow for message queues | Medium | Send message form, poll-for-messages viewer, purge action |
| **CloudWatch Logs: Log stream viewer** | View log output from Lambda and other services | Medium | Log group > log stream > log events hierarchy with timestamps |

### Data Display Quality

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| JSON viewer/formatter | Many AWS resources have JSON configs (policies, function code, etc.) | Low | Collapsible tree view, syntax highlighting, copy button |
| ARN display with copy-to-clipboard | ARNs are long and frequently copied | Low | Click-to-copy on ARN fields |
| Timestamp formatting | AWS timestamps need human-readable display | Low | Relative time ("2 min ago") with hover for absolute |
| Empty state messaging | When a service has no resources, guide the user | Low | "No instances found. Create one?" with action button |
| Loading states | Skeleton screens or spinners during API calls | Low | Prevents layout shift, indicates activity |
| Error display | Show API errors clearly when operations fail | Low | Toast notifications or inline error messages |

## Differentiators

Features that set MiniStack apart from LocalStack Pro (paid) and the real AWS Console. These create competitive advantage for a free, open-source local tool.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **Unified resource graph / cross-service view** | Show how resources connect (Lambda -> SQS -> DynamoDB). LocalStack does not do this. AWS Console requires clicking through multiple services | High | Visual topology map of resource relationships. Major differentiator for understanding local infrastructure |
| **Real-time state updates via WebSocket** | Resources update live without manual refresh. LocalStack desktop polls. Real AWS Console polls | Medium | WebSocket from ASGI backend pushing state changes. Major DX improvement |
| **Request/response inspector** | Show every API call MiniStack receives with request/response details. Like browser DevTools for AWS calls | Medium | Invaluable for debugging SDK calls. No equivalent in AWS Console or LocalStack free tier |
| **Bulk resource reset** | One-click "reset all resources" or per-service reset. Only possible in local emulator context | Low | Unique to local dev -- clear all state between test runs |
| **Dark mode** | Developer preference, easy win | Low | CSS variables/theme toggle. High perceived value, low effort |
| **Inline code/config editing** | Edit Lambda code, IAM policies, S3 bucket policies directly in the browser | Medium | Monaco editor or CodeMirror for JSON/code editing. AWS Console recently added VS Code-based Lambda editor |
| **Import/export state snapshots** | Save and restore full emulator state as JSON | Medium | Useful for sharing reproducible test setups across a team |
| **Service health overview dashboard** | Single page showing all 35+ services, which ones have resources, quick links | Low | Home page giving instant overview of entire emulator state. LocalStack has "Stack Overview" (paid) |
| **Keyboard shortcuts / command palette** | Power-user navigation: Cmd+K for command palette, quick service switching | Low | Command palette pattern (VS Code Cmd+P style). Fast navigation without mouse |
| **Unified log tail** | Single log view showing all emulator activity, filterable by service | Medium | Combines CloudWatch Logs concept with emulator-level observability |
| **Free and open-source** | LocalStack's Resource Browser is Pro-only (paid). MiniStack's UI is free | N/A | This is the single biggest differentiator. LocalStack charges for UI access |

## Anti-Features

Features to deliberately NOT build. These add complexity without value for a local development tool.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| **Authentication/IAM enforcement in UI** | Local dev tool -- security gates slow developers down. PROJECT.md explicitly scopes this out | No login screen. Optionally display IAM policy info as read-only metadata |
| **Billing/cost dashboard** | No real costs in local emulator. PROJECT.md scopes this out | Skip entirely. Not even a placeholder |
| **Multi-region simultaneous view** | Single-region emulation per PROJECT.md constraints. Adding multi-region UI for something the backend does not support creates confusion | Show current region in header as static label. No region switcher needed |
| **CloudFormation template designer** | Extremely complex to build, niche use case for local dev. Users deploy IaC via CLI | Show CloudFormation stacks as read-only resource list. Do not build a visual template designer |
| **Pixel-perfect AWS Console clone** | Matching every pixel is infinite work and legally risky (AWS trademarks) | Follow Cloudscape patterns for familiarity but use own design language. Functional parity, not visual parity |
| **Real-time CloudWatch metrics graphs** | The emulator does not generate real CloudWatch metrics data (no actual compute running) | Show CloudWatch alarm/metric resources as list/metadata. Do not build fake metric dashboards with charts |
| **SSO/federation/SAML flows** | Authentication is out of scope for local dev | Skip entirely |
| **Mobile-first responsive design** | Nobody manages a local dev emulator from a phone | Desktop-first. Basic tablet support is fine. Skip phone layouts entirely |
| **AI/ML integration (CodeWhisperer, Q)** | AWS-specific AI features have no local equivalent | Skip entirely |
| **Notifications/alerts system** | No production alerts needed in local dev | Skip. The request inspector and log tail serve the debugging need better |
| **Real-time WebSocket for ALL updates** | Massive complexity if applied to every single resource type | Use WebSocket selectively (request inspector, explicit subscriptions). Use polling (refetchInterval) for standard resource lists |

## Feature Dependencies

```
Global Navigation Shell
    |
    +---> Service Search (indexes service list from nav)
    |
    +---> Per-Service Sidebar (context changes per service)
    |
    +---> Breadcrumbs (derived from current route)

Generic Resource List Framework
    |
    +---> Resource Detail View (list row click -> detail)
    |
    +---> Resource Creation Forms (create button lives in list header)
    |
    +---> Resource Actions (action buttons in list rows / detail page)
    |
    +---> All 35+ service pages (each service reuses the framework)

S3 Bucket Browser
    |
    +---> S3 Object Upload/Download (upload button in browser toolbar)
    |
    +---> S3 Object Detail View (click object to see metadata)

Lambda Function List
    |
    +---> Lambda Test Invoke (invoke panel on function detail page)

DynamoDB Table List
    |
    +---> DynamoDB Item Browser (click table to browse items)
    |
    +---> DynamoDB Query/Scan UI (controls within item browser)

SQS Queue List
    |
    +---> SQS Send/Receive/Purge (actions on queue detail page)

CloudWatch Logs
    |
    +---> Lambda Execution Logs (log groups linked from Lambda function detail)

WebSocket Infrastructure
    |
    +---> Request/Response Inspector (needs real-time transport)
    |
    +---> Real-time State Updates (optional push for resource changes)

Cross-Service Resource Graph
    |
    +---> All Per-Service Pages (needs resource data from all services to be available)
```

## MVP Recommendation

**Phase 1 -- Shell and Foundation:**
1. Global navigation with service search (the shell everything lives in)
2. Generic resource list/detail framework (reusable table/detail pattern for all services)
3. Service health overview dashboard (home page with resource counts)

**Phase 2 -- High-Value Services:**
4. EC2 dashboard -- instances, VPCs, subnets, security groups, EBS (most complex service, proves the pattern)
5. S3 dashboard -- bucket browser with folder navigation, upload/download (most used service)
6. Lambda dashboard -- function list with test invoke and execution logs (highest developer value)

**Phase 3 -- Core Services Expansion:**
7. DynamoDB -- table browser with query/scan and item editing
8. SQS -- queue management with send/receive/purge
9. SNS -- topic and subscription management
10. CloudWatch Logs -- log group/stream viewer
11. IAM -- read-only user/role/policy viewer

**Phase 4 -- Breadth (Generic Framework Payoff):**
12. Remaining 25+ services using generic list/detail framework
13. Each service becomes Low complexity because the framework handles the pattern

**Phase 5 -- Differentiators:**
14. Request/response inspector (WebSocket-based)
15. Real-time state updates for active resources
16. Bulk resource reset (per-service and global)
17. State snapshot import/export
18. Cross-service resource graph

**Defer indefinitely:**
- CloudFormation template designer: extremely high complexity, low local-dev value
- CloudWatch metric dashboards with real graphs: no real metric data to display
- Any authentication/billing features
- Mobile layouts

**Rationale for ordering:**
- Navigation shell must exist before any service page can be reached
- Generic resource framework is the highest-leverage investment: it reduces per-service effort from High to Low for ~30 of 35 services
- EC2, S3, Lambda first because they are the most complex and most used -- proving the architecture handles both compute-resource patterns (EC2) and storage-resource patterns (S3) and serverless patterns (Lambda)
- DynamoDB and SQS second because they are the most common serverless debugging scenarios
- Breadth (Phase 4) becomes cheap once the generic framework is proven -- each new service is mostly configuration
- Differentiators (Phase 5) are what make MiniStack console worth using over "just use the CLI," but they require the foundation to be solid first

## Sources

- [LocalStack Resource Browser docs](https://docs.localstack.cloud/aws/capabilities/web-app/resource-browser/)
- [LocalStack Desktop 2.0 announcement](https://blog.localstack.cloud/localstack-desktop-2-0/)
- [Cloudscape Design System - Components](https://cloudscape.design/components/)
- [Cloudscape Table View pattern](https://cloudscape.design/patterns/resource-management/view/table-view/)
- [Cloudscape Split View pattern](https://cloudscape.design/patterns/resource-management/view/split-view/)
- [Cloudscape Service Navigation pattern](https://cloudscape.design/patterns/general/service-navigation/)
- [AWS Console visual update announcement](https://aws.amazon.com/blogs/aws/announcing-a-visual-update-to-the-aws-management-console-preview/)
- [AWS Lambda enhanced code editor](https://aws.amazon.com/blogs/compute/introducing-an-enhanced-in-console-editing-experience-for-aws-lambda/)
- [AWS CloudWatch Dashboards docs](https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch_Dashboards.html)
- [AWS Storage Browser for S3](https://aws.amazon.com/s3/features/storage-browser/)
- [Daintree - open source AWS Console alternative](https://github.com/rpadovani/daintree)
- [Cloudscape Design System homepage](https://cloudscape.design/)
- [AWS Console customization features](https://aws.amazon.com/blogs/aws/customize-your-aws-management-console-experience-with-visual-settings-including-account-color-region-and-service-visibility/)
