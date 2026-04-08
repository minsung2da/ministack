"""Phase 1 console serving + registry integration tests (FOUND-01, FOUND-03, FOUND-04)."""
import asyncio
import json

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
    hdrs = {k.decode().lower(): v.decode() for k, v in out_headers}
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
