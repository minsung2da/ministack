"""Phase 1 console-serving integration tests. Stubs created in Wave 0, filled in Plan 02/06."""
import pytest


@pytest.mark.skip(reason="filled in Plan 02")
def test_root_returns_index():
    """GET /_console/ returns 200 with text/html and Cache-Control: no-cache."""
    pass


@pytest.mark.skip(reason="filled in Plan 02")
def test_spa_fallback():
    """GET /_console/services/ec2 (deep link) returns index.html."""
    pass


@pytest.mark.skip(reason="filled in Plan 02")
def test_missing_asset_404():
    """GET /_console/assets/nonexistent.js returns 404, not index.html."""
    pass


@pytest.mark.skip(reason="filled in Plan 02")
def test_health_unaffected():
    """GET /_ministack/health still returns edition JSON."""
    pass


@pytest.mark.skip(reason="filled in Plan 02")
def test_services_registry():
    """GET /_console/api/services returns [{key, name, category}, ...]."""
    pass


@pytest.mark.skip(reason="filled in Plan 02")
def test_services_covers_handlers():
    """Registry endpoint enumerates every SERVICE_HANDLERS key (canonicalized)."""
    pass


@pytest.mark.skip(reason="filled in Plan 02")
def test_path_traversal_blocked():
    """GET /_console/../etc/passwd does NOT escape ministack/static/console."""
    pass


@pytest.mark.skip(reason="filled in Plan 02")
def test_index_html_cache_no_cache():
    """index.html Cache-Control is no-cache (Pitfall #7)."""
    pass


@pytest.mark.skip(reason="filled in Plan 02")
def test_hashed_asset_cache_immutable():
    """assets/*.js Cache-Control is public, max-age=31536000, immutable."""
    pass
