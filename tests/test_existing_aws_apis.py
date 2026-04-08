"""FOUND-03 regression gate. Ensures adding /_console/ routes does not break existing AWS API dispatch.

Wave 0 baseline: records current passing behavior. Wave 5 re-runs to prove untouched.
"""
import asyncio
import json

from ministack.app import app


async def _call(method: str, path: str, headers: dict | None = None, body: bytes = b"") -> tuple[int, dict, bytes]:
    """Minimal ASGI invocation helper (mirrors tests/test_services.py style)."""
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
    sent_body = False

    async def receive():
        nonlocal sent_body
        if sent_body:
            return {"type": "http.disconnect"}
        sent_body = True
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


def test_health_endpoint_baseline():
    status, _hdrs, body = asyncio.run(_call("GET", "/_ministack/health"))
    assert status == 200
    data = json.loads(body)
    assert "edition" in data or "status" in data


def test_s3_list_buckets_baseline():
    """Empty S3 ListBuckets returns 200 XML with ListAllMyBucketsResult."""
    status, _hdrs, body = asyncio.run(
        _call(
            "GET",
            "/",
            headers={
                "host": "localhost:4566",
                "authorization": "AWS4-HMAC-SHA256 Credential=test/20260407/us-east-1/s3/aws4_request",
            },
        )
    )
    assert status == 200
    assert b"ListAllMyBucketsResult" in body


def test_dynamodb_list_tables_baseline():
    status, _hdrs, body = asyncio.run(
        _call(
            "POST",
            "/",
            headers={
                "host": "localhost:4566",
                "x-amz-target": "DynamoDB_20120810.ListTables",
                "content-type": "application/x-amz-json-1.0",
                "authorization": "AWS4-HMAC-SHA256 Credential=test/20260407/us-east-1/dynamodb/aws4_request",
            },
            body=b"{}",
        )
    )
    assert status == 200
    data = json.loads(body)
    assert "TableNames" in data


def test_lambda_list_functions_baseline():
    status, _hdrs, body = asyncio.run(
        _call("GET", "/2015-03-31/functions/", headers={"host": "localhost:4566"})
    )
    assert status == 200
    data = json.loads(body)
    assert "Functions" in data
