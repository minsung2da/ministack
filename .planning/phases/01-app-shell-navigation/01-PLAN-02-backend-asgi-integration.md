---
phase: 01-app-shell-navigation
plan: 02
type: execute
wave: 1
depends_on: ["01-app-shell-navigation/01"]
files_modified:
  - ministack/app.py
  - ministack/console/__init__.py
  - ministack/console/registry.py
  - pyproject.toml
  - tests/test_console_serve.py
autonomous: true
requirements: [FOUND-01, FOUND-03, FOUND-04]
user_setup: []

must_haves:
  truths:
    - "GET /_console/ returns 200 HTML (index.html if built, 503 stub otherwise) with Cache-Control: no-cache"
    - "GET /_console/services/ec2 (deep link) returns the same HTML (SPA fallback)"
    - "GET /_console/assets/nonexistent.js returns 404"
    - "GET /_console/api/services returns JSON list [{key,name,category}, ...] covering every SERVICE_HANDLERS key (after alias collapse)"
    - "GET /_ministack/health still returns the same payload as baseline (FOUND-03)"
    - "Every existing test in tests/test_services.py still passes unchanged"
    - "Path traversal (/_console/../etc/passwd) is blocked"
    - "pip install -e . includes ministack/static/console/** in the wheel"
  artifacts:
    - path: "ministack/app.py"
      provides: "_serve_console() + /_console/api/services block + call site"
      contains: "_serve_console"
    - path: "ministack/console/registry.py"
      provides: "Service taxonomy (display name + category) canonicalizing SERVICE_HANDLERS aliases"
      contains: "SERVICE_CATEGORIES"
    - path: "ministack/console/__init__.py"
      provides: "Python package marker"
    - path: "pyproject.toml"
      provides: "package-data entry for ministack/static/console/**"
      contains: "package-data"
  key_links:
    - from: "ministack/app.py"
      to: "ministack/console/registry.py"
      via: "import of display_name/category helpers"
      pattern: "from ministack.console.registry import"
    - from: "ministack/app.py call site"
      to: "_serve_console()"
      via: "insertion between line 255 (after lambda-layers block) and line 276 (before /_ministack/reset)"
      pattern: "await _serve_console\\("

threat_model:
  surface: "New HTTP route prefix /_console/ added to production ASGI handler"
  assets: "The ministack/static/console/ directory contents (SPA build output); the SERVICE_HANDLERS registry"
  adversaries: "Path traversal attackers trying to read /etc/passwd or other files outside static/console; attackers exploiting MIME sniffing"
  mitigations:
    - "Resolve candidate path with Path.resolve() and reject if not relative_to(_CONSOLE_ROOT.resolve()) — explicit test coverage"
    - "Only GET/HEAD methods accepted — POST/PUT/DELETE fall through to normal dispatch"
    - "Registry endpoint is read-only, no user input reflected, no state mutation"
    - "Content-Type from mimetypes stdlib (not Content-Type header from request)"
    - "SPA fallback only serves index.html — never other files by name"
    - "Insertion point is BEFORE detect_service() so /_console is never interpreted as an S3 bucket (Pitfall #2)"
  residual: "If ministack/static/console/ contains user-uploaded files, they'd be served publicly — but this is a build-output directory, never user-writable"
---

<objective>
Add the `/_console/` HTTP handler to the existing ASGI app and the single Phase 1 Console API endpoint (`GET /_console/api/services`). Ship `ministack/console/registry.py` as the canonical service taxonomy (display name + category) so the frontend sidebar and search stay in sync with `SERVICE_HANDLERS`. Add the `[tool.setuptools.package-data]` entry so the built SPA ships in the wheel.

Purpose: Lands FOUND-01 (serve under /_console/ on :4566), FOUND-03 (no regression to AWS dispatch), and FOUND-04 (Console API returns UI-friendly JSON). Without this plan, the frontend has nothing to talk to.
Output: ~40 lines added to app.py (the insertion from RESEARCH.md Pattern 2), a new `ministack/console/` package with ~60 lines of taxonomy data, and a pyproject package-data entry.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/phases/01-app-shell-navigation/01-RESEARCH.md
@.planning/phases/01-app-shell-navigation/01-UI-SPEC.md
@.planning/phases/01-app-shell-navigation/01-CONTEXT.md
@ministack/app.py
@pyproject.toml
@tests/test_console_serve.py
@tests/test_services.py

<interfaces>
<!-- Exact contracts for this plan -->

From ministack/app.py (existing, lines 90-127):
SERVICE_HANDLERS keys (37 total — some are aliases of the same handler):
  s3, sqs, cloudformation, sns, dynamodb, lambda, iam, sts, secretsmanager, logs,
  ssm, events, kinesis, monitoring, ses, acm, wafv2, states, ecr, ecs, rds,
  elasticache, glue, athena, apigateway, firehose, route53, cognito-idp, cognito-identity,
  ec2, elasticmapreduce, elasticloadbalancing, elasticfilesystem, kms, cloudfront, appsync

Existing helper in ministack/app.py:
  async def _send_response(send, status: int, headers: dict, body: bytes) -> None

Call site — MUST insert between:
  app.py line 255 (end of the `if path.startswith("/_ministack/lambda-layers/")` block)
  AND
  app.py line 276 (`if path == "/_ministack/reset" and method == "POST":`)

ASGI scope/receive/send are standard ASGI 3.0. `path` is a str and `method` is a str in the existing handler scope.

UI-SPEC Service Categories (locked taxonomy, 01-UI-SPEC.md lines 208-217):
  Compute:                         EC2, Lambda
  Storage:                         S3
  Database:                        DynamoDB
  Networking & Content Delivery:   (empty in Phase 1)
  Application Integration:         SQS, SNS
  Management & Governance:         CloudWatch, IAM
  Security, Identity & Compliance: KMS, Secrets Manager
  Other:                           catch-all
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Create ministack/console/registry.py with canonical service taxonomy</name>
  <files>
    ministack/console/__init__.py,
    ministack/console/registry.py
  </files>
  <read_first>
    ministack/app.py (lines 90-145 for SERVICE_HANDLERS + SERVICE_NAME_ALIASES),
    .planning/phases/01-app-shell-navigation/01-UI-SPEC.md (lines 204-224 for locked categories),
    .planning/phases/01-app-shell-navigation/01-RESEARCH.md (§"Open Question 3" for alias canonicalization)
  </read_first>
  <action>
Create `ministack/console/__init__.py` as an empty file (just makes it a package):
```python
"""Console UI server-side helpers (registry, static serving)."""
```

Create `ministack/console/registry.py` with the canonical service taxonomy. This is the SINGLE source of truth for the Phase 1 sidebar/search. Aliases (e.g., `cognito-idp` and `cognito-identity` both pointing to `cognito.handle_request`) must collapse to a single logical service (`cognito`). Handler keys not listed here fall into category "Other".

```python
"""
Canonical service taxonomy for the MiniStack web console.

Single source of truth for:
- Sidebar grouping (category)
- Display name (AWS canonical capitalization per UI-SPEC)
- Alias canonicalization (cognito-idp + cognito-identity → cognito)

Per 01-UI-SPEC.md §"Service Categories" (locked) and 01-RESEARCH.md §"Open Question 3".
"""
from __future__ import annotations

# Category display order matches UI-SPEC §"Service Categories" table.
CATEGORY_ORDER: tuple[str, ...] = (
    "Compute",
    "Storage",
    "Database",
    "Networking & Content Delivery",
    "Application Integration",
    "Management & Governance",
    "Security, Identity & Compliance",
    "Other",
)

# Maps a canonical service key → (display_name, category).
# Canonical key = the slug used in URLs (/_console/services/{key}).
# Handlers from SERVICE_HANDLERS that are not listed here fall into category="Other"
# with display_name=key.title(). Add to this table when a new service gets a dedicated UI.
SERVICE_TAXONOMY: dict[str, tuple[str, str]] = {
    # Compute
    "ec2":              ("EC2",              "Compute"),
    "lambda":           ("Lambda",           "Compute"),
    "ecs":              ("ECS",              "Compute"),
    "ecr":              ("ECR",              "Compute"),
    "elasticmapreduce": ("EMR",              "Compute"),
    # Storage
    "s3":               ("S3",               "Storage"),
    "elasticfilesystem":("EFS",              "Storage"),
    # Database
    "dynamodb":         ("DynamoDB",         "Database"),
    "rds":              ("RDS",              "Database"),
    "elasticache":      ("ElastiCache",      "Database"),
    # Networking & Content Delivery
    "cloudfront":       ("CloudFront",       "Networking & Content Delivery"),
    "route53":          ("Route 53",         "Networking & Content Delivery"),
    "elasticloadbalancing": ("ELB",          "Networking & Content Delivery"),
    "apigateway":       ("API Gateway",      "Networking & Content Delivery"),
    "appsync":          ("AppSync",          "Networking & Content Delivery"),
    # Application Integration
    "sqs":              ("SQS",              "Application Integration"),
    "sns":              ("SNS",              "Application Integration"),
    "events":           ("EventBridge",      "Application Integration"),
    "states":           ("Step Functions",   "Application Integration"),
    "kinesis":          ("Kinesis",          "Application Integration"),
    "firehose":         ("Kinesis Firehose", "Application Integration"),
    # Management & Governance
    "monitoring":       ("CloudWatch",       "Management & Governance"),
    "logs":             ("CloudWatch Logs",  "Management & Governance"),
    "cloudformation":   ("CloudFormation",   "Management & Governance"),
    "ssm":              ("Systems Manager",  "Management & Governance"),
    "iam":              ("IAM",              "Management & Governance"),
    "sts":              ("STS",              "Management & Governance"),
    # Security, Identity & Compliance
    "kms":              ("KMS",              "Security, Identity & Compliance"),
    "secretsmanager":   ("Secrets Manager",  "Security, Identity & Compliance"),
    "acm":              ("Certificate Manager", "Security, Identity & Compliance"),
    "wafv2":            ("WAF",              "Security, Identity & Compliance"),
    "cognito":          ("Cognito",          "Security, Identity & Compliance"),
    # Other
    "glue":             ("Glue",             "Other"),
    "athena":           ("Athena",           "Other"),
    "ses":              ("SES",              "Other"),
}

# Aliases that must collapse to a single canonical key.
# Maps SERVICE_HANDLERS key → canonical key (if different).
# Only include entries where the handler key differs from the canonical display key.
HANDLER_TO_CANONICAL: dict[str, str] = {
    "cognito-idp":      "cognito",
    "cognito-identity": "cognito",
}


def canonical_key(handler_key: str) -> str:
    """Collapse SERVICE_HANDLERS key to canonical console service key."""
    return HANDLER_TO_CANONICAL.get(handler_key, handler_key)


def display_name(canonical: str) -> str:
    """Return the AWS-canonical display name for a service key."""
    entry = SERVICE_TAXONOMY.get(canonical)
    if entry:
        return entry[0]
    # Unknown service — Title-case the key as a fallback
    return canonical.replace("-", " ").replace("_", " ").title()


def category(canonical: str) -> str:
    """Return the UI category for a service key."""
    entry = SERVICE_TAXONOMY.get(canonical)
    if entry:
        return entry[1]
    return "Other"


def build_registry(handler_keys: list[str]) -> list[dict[str, str]]:
    """
    Build the /_console/api/services payload from a list of SERVICE_HANDLERS keys.

    Collapses aliases, de-duplicates, sorts by (category order, display name).
    Returns [{key, name, category}, ...].
    """
    seen: set[str] = set()
    entries: list[dict[str, str]] = []
    for raw in handler_keys:
        key = canonical_key(raw)
        if key in seen:
            continue
        seen.add(key)
        entries.append({
            "key": key,
            "name": display_name(key),
            "category": category(key),
        })

    def sort_key(entry: dict[str, str]) -> tuple[int, str]:
        try:
            cat_idx = CATEGORY_ORDER.index(entry["category"])
        except ValueError:
            cat_idx = len(CATEGORY_ORDER)
        return (cat_idx, entry["name"].lower())

    entries.sort(key=sort_key)
    return entries
```

Also append unit tests to `tests/test_console_serve.py` (remove the skip marker on `test_services_registry` and `test_services_covers_handlers`, replace with real tests — see Task 3).
  </action>
  <acceptance_criteria>
    - `test -f ministack/console/__init__.py`
    - `test -f ministack/console/registry.py`
    - `python -c "from ministack.console.registry import build_registry, canonical_key, SERVICE_TAXONOMY; assert canonical_key('cognito-idp') == 'cognito'; assert canonical_key('cognito-identity') == 'cognito'; assert canonical_key('ec2') == 'ec2'"` exits 0
    - `python -c "from ministack.console.registry import build_registry; r = build_registry(['ec2','lambda','s3','cognito-idp','cognito-identity']); keys = [e['key'] for e in r]; assert keys.count('cognito') == 1; assert {'key':'ec2','name':'EC2','category':'Compute'} in r"` exits 0
    - `python -c "from ministack.app import SERVICE_HANDLERS; from ministack.console.registry import build_registry; r = build_registry(list(SERVICE_HANDLERS.keys())); assert len(r) >= 30"` exits 0
  </acceptance_criteria>
  <verify>
    <automated>python -c "from ministack.console.registry import build_registry, canonical_key; from ministack.app import SERVICE_HANDLERS; r = build_registry(list(SERVICE_HANDLERS.keys())); assert len(r) >= 30; assert canonical_key('cognito-idp') == 'cognito'; assert canonical_key('cognito-identity') == 'cognito'; print(f'OK: {len(r)} canonical services')"</automated>
  </verify>
  <done>Canonical service taxonomy module exists, builds a deduplicated sorted registry from SERVICE_HANDLERS, and handles all known aliases.</done>
</task>

<task type="auto">
  <name>Task 2: Add _serve_console() + /_console/api/services block + call site to ministack/app.py, plus pyproject package-data</name>
  <files>
    ministack/app.py,
    pyproject.toml
  </files>
  <read_first>
    ministack/app.py (entire file, especially lines 1-60 for imports and 240-290 for the insertion region),
    .planning/phases/01-app-shell-navigation/01-RESEARCH.md (§"Pattern 2: ASGI Integration — _serve_console() in app.py" and §"Pitfall #2" and §"Pitfall #6" and §"Pitfall #7"),
    pyproject.toml
  </read_first>
  <action>
**Step A — app.py imports.** Near the top of `ministack/app.py` (in the stdlib import block at lines 7-22), add:
```python
import mimetypes
from pathlib import Path
```
Only add if not already present. Do NOT reorder existing imports.

**Step B — app.py module-level constants.** After the SERVICE_NAME_ALIASES block (around line 145, wherever the existing module-level constants end), add:
```python
_CONSOLE_ROOT = Path(__file__).parent / "static" / "console"
_CONSOLE_ASSETS = _CONSOLE_ROOT / "assets"
_CONSOLE_API_PREFIX = "/_console/api/"
```

**Step C — app.py `_serve_console()` function.** Add this function at module scope, placed AFTER the existing helper functions (e.g., after `_send_response` / `_reset_all_state` — wherever the helpers cluster). It uses `_send_response` which already exists.
```python
async def _serve_console(path: str, method: str, send) -> bool:
    """
    Serve the console SPA under /_console/. Return True if handled.

    Must be called BEFORE detect_service() and BEFORE S3 virtual-host detection
    to avoid route collisions (see 01-RESEARCH.md Pitfall #2).

    Safety:
    - Only GET/HEAD methods are handled; other methods fall through.
    - Path traversal is blocked via Path.resolve().relative_to(_CONSOLE_ROOT.resolve()).
    - /_console/api/* is NOT handled here (returns False so the dispatch block below handles it).
    - SPA fallback: any unmatched /_console/* GET returns index.html so browser
      refresh on a deep link works.
    - Cache headers per 01-RESEARCH.md Pitfall #7: hashed assets immutable, everything
      else no-cache.
    """
    if not path.startswith("/_console"):
        return False
    if method not in ("GET", "HEAD"):
        return False
    if path.startswith(_CONSOLE_API_PREFIX):
        return False

    # Normalize: "/_console", "/_console/" → serve index.html
    rel = path[len("/_console/"):] if path.startswith("/_console/") else ""

    root_resolved = _CONSOLE_ROOT.resolve() if _CONSOLE_ROOT.exists() else None

    # Try to resolve a real file under static/console
    if rel and root_resolved is not None:
        candidate = (_CONSOLE_ROOT / rel).resolve()
        try:
            candidate.relative_to(root_resolved)
        except ValueError:
            # Path traversal attempt — return 404, do NOT leak error
            await _send_response(send, 404, {"Content-Type": "text/plain"}, b"Not Found")
            return True
        if candidate.is_file():
            body = await asyncio.to_thread(candidate.read_bytes)
            ctype, _ = mimetypes.guess_type(candidate.name)
            try:
                in_assets = candidate.parent.resolve() == _CONSOLE_ASSETS.resolve()
            except FileNotFoundError:
                in_assets = False
            cache = (
                "public, max-age=31536000, immutable"
                if in_assets
                else "no-cache"
            )
            await _send_response(send, 200, {
                "Content-Type": ctype or "application/octet-stream",
                "Cache-Control": cache,
            }, body)
            return True
        # File under /_console/assets/* that doesn't exist → 404 (not SPA fallback)
        if rel.startswith("assets/"):
            await _send_response(send, 404, {"Content-Type": "text/plain"}, b"Not Found")
            return True

    # SPA fallback: serve index.html for any unmatched /_console/* GET
    index = _CONSOLE_ROOT / "index.html"
    if not index.is_file():
        await _send_response(send, 503, {"Content-Type": "text/plain"},
                             b"Console UI not built. Run `npm run build` in web/.")
        return True
    body = await asyncio.to_thread(index.read_bytes)
    await _send_response(send, 200, {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-cache",
    }, body)
    return True
```

**Step D — app.py call site.** Open `ministack/app.py` and find the lambda-layers block ending at line 255 (it ends with `return` after `_send_response`). INSERT the following IMMEDIATELY AFTER that block and BEFORE the `.well-known` block at line 259 (or if easier, BEFORE `if path == "/_ministack/reset"` at line 276 — either location is inside the "underscore-prefix internal routes" cluster, per Pitfall #2):

```python
    # Console SPA static assets + SPA fallback — must run before AWS dispatch
    # (See .planning/phases/01-app-shell-navigation/01-RESEARCH.md Pitfall #2.)
    if await _serve_console(path, method, send):
        return

    # Console API: services registry (Phase 1 — only endpoint per D-01 exemption)
    if path == "/_console/api/services" and method == "GET":
        from ministack.console.registry import build_registry
        payload = build_registry(list(SERVICE_HANDLERS.keys()))
        await _send_response(send, 200, {
            "Content-Type": "application/json",
            "Cache-Control": "no-store",
            # Dev-mode CORS — production is same-origin so this is harmless
            "Access-Control-Allow-Origin": "*",
        }, json.dumps(payload).encode())
        return
```

**IMPORTANT:** Do NOT touch `detect_service()`, `SERVICE_HANDLERS`, `SERVICE_NAME_ALIASES`, or the CORS block. Surgical changes only (CLAUDE.md rule). The only edits to app.py are:
1. Two new stdlib imports (mimetypes, pathlib.Path)
2. Three module-level constants (_CONSOLE_ROOT, _CONSOLE_ASSETS, _CONSOLE_API_PREFIX)
3. One new function (_serve_console)
4. Two new dispatch blocks inserted at the call site

**Step E — pyproject.toml package-data.** Edit `pyproject.toml`. After the `[tool.setuptools.packages.find]` block, add:
```toml
[tool.setuptools.package-data]
ministack = ["static/console/**/*", "console/py.typed"]
```
The `py.typed` path is a stub to make setuptools happy with glob matching even when the static dir doesn't exist yet in a fresh checkout. Do NOT actually create py.typed — it's optional per PEP 561 and absent is fine; the glob handles the missing-on-fresh-clone case.

Actually simpler: just use the single glob entry:
```toml
[tool.setuptools.package-data]
ministack = ["static/console/**/*"]
```
  </action>
  <acceptance_criteria>
    - `grep -q "^import mimetypes" ministack/app.py` matches
    - `grep -q "^import json" ministack/app.py` matches (already present in app.py line 11; the /_console/api/services block uses json.dumps)
    - `grep -q "from pathlib import Path" ministack/app.py` matches
    - `grep -q "_CONSOLE_ROOT = Path" ministack/app.py` matches
    - `grep -q "async def _serve_console" ministack/app.py` matches
    - `grep -q "if await _serve_console" ministack/app.py` matches
    - `grep -q '/_console/api/services' ministack/app.py` matches
    - `grep -q "from ministack.console.registry import build_registry" ministack/app.py` matches
    - `grep -q "package-data" pyproject.toml` matches
    - `grep -q 'static/console' pyproject.toml` matches
    - `python -c "import ministack.app; assert hasattr(ministack.app, '_serve_console')"` exits 0
    - `python -c "import ast; t = ast.parse(open('ministack/app.py').read()); print('OK')"` exits 0 (syntax valid)
    - `python -m pytest tests/test_services.py -q` still exits 0 (FOUND-03: no regression)
    - `python -m pytest tests/test_existing_aws_apis.py -q` still exits 0 (baseline untouched)
    - The _serve_console call site is located AFTER the lambda-layers block (line ~255) and BEFORE the /_ministack/reset block (line ~276) — verify by running: `python -c "import re; src = open('ministack/app.py').read(); lambda_end = src.find('lambda-layers'); console_call = src.find('_serve_console(path'); reset_line = src.find('_ministack/reset'); assert lambda_end < console_call < reset_line, f'order wrong: {lambda_end} {console_call} {reset_line}'"` exits 0
  </acceptance_criteria>
  <verify>
    <automated>python -c "import ast; ast.parse(open('ministack/app.py').read())" && python -c "import ministack.app; assert hasattr(ministack.app, '_serve_console')" && python -m pytest tests/test_services.py tests/test_existing_aws_apis.py -q</automated>
  </verify>
  <done>`_serve_console()` and `/_console/api/services` dispatch are wired into app.py at the correct position (after lambda-layers, before /_ministack/reset), pyproject ships static/console/** in the wheel, and zero existing tests regress.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 3: Fill in tests/test_console_serve.py with real assertions for FOUND-01/03/04</name>
  <files>tests/test_console_serve.py</files>
  <read_first>
    tests/test_console_serve.py (Wave 0 stubs),
    tests/test_existing_aws_apis.py (for the _call() ASGI helper pattern),
    ministack/app.py (_serve_console + /_console/api/services block)
  </read_first>
  <behavior>
    - Test 1: GET /_console/ returns 200 OR 503 (if not built) with Cache-Control: no-cache and Content-Type text/html
    - Test 2: GET /_console/services/ec2 (deep link) returns the same body as GET /_console/ (SPA fallback)
    - Test 3: GET /_console/assets/nonexistent.js returns 404 (NOT index.html)
    - Test 4: Path traversal GET /_console/../app.py returns 404 and does NOT leak file contents
    - Test 5: GET /_ministack/health still returns a 200 JSON payload (FOUND-03 regression)
    - Test 6: GET /_console/api/services returns 200 JSON list with keys {key, name, category}
    - Test 7: Registry enumerates every SERVICE_HANDLERS key after canonicalization (len(registry) + aliases_collapsed == len(SERVICE_HANDLERS))
    - Test 8: POST /_console/ falls through (returns != 200/HTML — either 400 or an AWS-style error, not the index.html)
    - Test 9: If ministack/static/console/index.html exists, GET /_console/ returns 200 with Cache-Control: no-cache; if not, returns 503. Test BOTH by creating a temporary index.html.
  </behavior>
  <action>
Rewrite `tests/test_console_serve.py` removing the `@pytest.mark.skip` markers. Reuse the `_call()` helper pattern from `tests/test_existing_aws_apis.py` (copy into this file — small duplication is fine; keep test files self-contained).

```python
"""Phase 1 console serving + registry integration tests (FOUND-01, FOUND-03, FOUND-04)."""
import asyncio
import json
from pathlib import Path

import pytest

from ministack.app import app, SERVICE_HANDLERS
from ministack.console.registry import build_registry, canonical_key


async def _call(method: str, path: str, headers: dict | None = None, body: bytes = b"") -> tuple[int, dict, bytes]:
    scope = {
        "type": "http",
        "method": method,
        "path": path,
        "raw_path": path.encode(),
        "query_string": b"",
        "headers": [(k.lower().encode(), v.encode()) for k, v in (headers or {}).items()],
    }
    status: dict = {}
    out_headers: list[tuple[bytes, bytes]] = []
    out_body = bytearray()
    sent = False

    async def receive():
        nonlocal sent
        if sent:
            return {"type": "http.disconnect"}
        sent = True
        return {"type": "http.request", "body": body, "more_body": False}

    async def send(message):
        if message["type"] == "http.response.start":
            status["code"] = message["status"]
            out_headers.extend(message.get("headers", []))
        elif message["type"] == "http.response.body":
            out_body.extend(message.get("body", b""))

    await app(scope, receive, send)
    hdrs = {k.decode(): v.decode() for k, v in out_headers}
    return status["code"], hdrs, bytes(out_body)


# -------------- FOUND-01 + SPA fallback --------------

def test_root_returns_html_or_503():
    """GET /_console/ returns 200 with text/html if built, 503 if not."""
    status, hdrs, body = asyncio.run(_call("GET", "/_console/"))
    assert status in (200, 503)
    if status == 200:
        assert "text/html" in hdrs.get("content-type", "")
        assert hdrs.get("cache-control") == "no-cache"
    else:
        assert b"not built" in body.lower()


def test_spa_fallback_deep_link():
    """GET /_console/services/ec2 (deep link) returns same body as /_console/."""
    _, _, root_body = asyncio.run(_call("GET", "/_console/"))
    status, hdrs, body = asyncio.run(_call("GET", "/_console/services/ec2"))
    assert status in (200, 503)
    if status == 200:
        assert "text/html" in hdrs.get("content-type", "")
        # SPA fallback serves identical bytes
        assert body == root_body


def test_missing_asset_returns_404_not_index():
    """GET /_console/assets/nonexistent.js returns 404, NOT index.html (no hash mismatch)."""
    status, _hdrs, body = asyncio.run(_call("GET", "/_console/assets/nonexistent.js"))
    assert status == 404
    assert b"<html" not in body.lower()


def test_path_traversal_blocked():
    """GET /_console/../app.py must NOT leak app.py contents."""
    status, _hdrs, body = asyncio.run(_call("GET", "/_console/../app.py"))
    # Either 404 (traversal blocked) or the SPA fallback (treats as unmatched deep link).
    # What matters: body must NOT contain the app.py source.
    assert b"_serve_console" not in body
    assert b"SERVICE_HANDLERS" not in body


def test_post_to_console_root_does_not_return_html():
    """POST /_console/ must NOT be swallowed by _serve_console (GET/HEAD only)."""
    status, hdrs, _body = asyncio.run(_call("POST", "/_console/"))
    # May be 400, 404, 405, or an AWS-style error — just must not be the HTML SPA.
    assert "text/html" not in hdrs.get("content-type", "")


# -------------- FOUND-03 regression --------------

def test_health_unaffected_by_console_routes():
    """GET /_ministack/health still returns a 200 JSON payload."""
    status, hdrs, body = asyncio.run(_call("GET", "/_ministack/health"))
    assert status == 200
    data = json.loads(body)
    assert isinstance(data, dict)


# -------------- FOUND-04 registry --------------

def test_services_registry_shape():
    """GET /_console/api/services returns JSON list of {key, name, category}."""
    status, hdrs, body = asyncio.run(_call("GET", "/_console/api/services"))
    assert status == 200
    assert "application/json" in hdrs.get("content-type", "")
    data = json.loads(body)
    assert isinstance(data, list)
    assert len(data) > 0
    for entry in data:
        assert set(entry.keys()) == {"key", "name", "category"}
        assert isinstance(entry["key"], str) and entry["key"]
        assert isinstance(entry["name"], str) and entry["name"]
        assert isinstance(entry["category"], str) and entry["category"]


def test_services_registry_covers_all_handlers():
    """Every SERVICE_HANDLERS key maps (directly or via alias) to a registry entry."""
    _, _, body = asyncio.run(_call("GET", "/_console/api/services"))
    data = json.loads(body)
    registry_keys = {e["key"] for e in data}
    for handler_key in SERVICE_HANDLERS.keys():
        canonical = canonical_key(handler_key)
        assert canonical in registry_keys, (
            f"Handler {handler_key!r} (canonical {canonical!r}) missing from registry"
        )


def test_services_registry_aliases_collapsed():
    """cognito-idp and cognito-identity collapse to a single 'cognito' entry."""
    _, _, body = asyncio.run(_call("GET", "/_console/api/services"))
    data = json.loads(body)
    keys = [e["key"] for e in data]
    # No duplicate keys
    assert len(keys) == len(set(keys))
    # cognito appears exactly once (not as cognito-idp or cognito-identity)
    assert keys.count("cognito") == 1
    assert "cognito-idp" not in keys
    assert "cognito-identity" not in keys


# -------------- Cache headers (Pitfall #7) --------------

def test_index_served_with_no_cache(tmp_path, monkeypatch):
    """When index.html exists, it is served with Cache-Control: no-cache."""
    from ministack import app as app_module
    fake_root = tmp_path / "console"
    (fake_root / "assets").mkdir(parents=True)
    (fake_root / "index.html").write_text("<html><body>hello</body></html>")
    (fake_root / "assets" / "app-abc123.js").write_text("console.log('ok')")
    monkeypatch.setattr(app_module, "_CONSOLE_ROOT", fake_root)
    monkeypatch.setattr(app_module, "_CONSOLE_ASSETS", fake_root / "assets")

    status, hdrs, body = asyncio.run(_call("GET", "/_console/"))
    assert status == 200
    assert hdrs.get("cache-control") == "no-cache"
    assert b"hello" in body


def test_hashed_asset_served_with_immutable_cache(tmp_path, monkeypatch):
    """assets/*.js are served with public, max-age=31536000, immutable."""
    from ministack import app as app_module
    fake_root = tmp_path / "console"
    (fake_root / "assets").mkdir(parents=True)
    (fake_root / "index.html").write_text("<html></html>")
    (fake_root / "assets" / "app-abc123.js").write_text("console.log('ok')")
    monkeypatch.setattr(app_module, "_CONSOLE_ROOT", fake_root)
    monkeypatch.setattr(app_module, "_CONSOLE_ASSETS", fake_root / "assets")

    status, hdrs, _body = asyncio.run(_call("GET", "/_console/assets/app-abc123.js"))
    assert status == 200
    cc = hdrs.get("cache-control", "")
    assert "immutable" in cc
    assert "max-age=31536000" in cc
```
  </action>
  <acceptance_criteria>
    - `grep -c "^def test_" tests/test_console_serve.py` returns ≥ 10
    - `grep -c "@pytest.mark.skip" tests/test_console_serve.py` returns 0
    - `python -m pytest tests/test_console_serve.py -q` exits 0 (all tests pass)
    - `python -m pytest tests/test_services.py -q` still exits 0 (FOUND-03 regression)
    - `python -m pytest tests/test_existing_aws_apis.py -q` still exits 0 (baseline still green)
    - Test `test_services_registry_covers_all_handlers` succeeds when run against the live registry with current SERVICE_HANDLERS
    - Test `test_path_traversal_blocked` passes (confirms security mitigation works)
  </acceptance_criteria>
  <verify>
    <automated>python -m pytest tests/test_console_serve.py tests/test_services.py tests/test_existing_aws_apis.py -q</automated>
  </verify>
  <done>All FOUND-01/03/04 backend behaviors are automatically verified. No skipped tests remain in test_console_serve.py. Full Python suite green.</done>
</task>

</tasks>

<verification>
Backend phase gate:
```bash
python -m pytest tests/test_console_serve.py tests/test_services.py tests/test_existing_aws_apis.py -q
python -c "import ministack.app; assert hasattr(ministack.app, '_serve_console'); from ministack.console.registry import build_registry; print('ok')"
grep -q 'static/console' pyproject.toml
```
</verification>

<success_criteria>
- FOUND-01: `GET /_console/` returns HTML (or the explicit "not built" 503)
- FOUND-03: `tests/test_services.py` and `tests/test_existing_aws_apis.py` stay green — zero regression
- FOUND-04: `/_console/api/services` returns deduplicated JSON covering every SERVICE_HANDLERS key
- Package data entry ensures pip-installed wheels ship the SPA
- Path traversal is blocked (security threat_model mitigation verified)
</success_criteria>

<output>
Create `.planning/phases/01-app-shell-navigation/01-02-SUMMARY.md` documenting: the exact line number where `_serve_console()` was inserted, the final count of test_console_serve.py tests, any aliases added to HANDLER_TO_CANONICAL beyond cognito, and confirmation that no tests in tests/test_services.py were modified.
</output>
