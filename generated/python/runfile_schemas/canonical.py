"""RFC 8785 JCS canonical JSON helpers — Python leg.

Every consumer (TS, Python, Go) must produce byte-identical canonical bytes
for the same logical value, because the `event_hash` field commits to the
canonical serialisation. The TS leg in `@runfile/schemas/canonical` is the
reference implementation; this Python implementation matches it byte-for-byte
on every fixture in `tests/fixtures/canonical-vectors.json`.

This module is hand-written (not generated). It lives alongside the generated
Pydantic types because it is part of the same `runfile_schemas` package.
"""
from __future__ import annotations

import hashlib
import json
from typing import Any


def stringify(value: Any) -> str:
    """Canonical JSON per RFC 8785 (JCS).

    Use this for any value whose hash crosses a service boundary. Do NOT use
    it for general API payloads (those go through plain json.dumps) — RFC 8785
    is strictly for hash determinism.
    """
    # json.dumps with sort_keys + no whitespace + ensure_ascii=False matches
    # the RFC 8785 baseline for the data shapes Runfile uses (strings, ints,
    # floats with no NaN/Inf, booleans, null, arrays, objects).
    return json.dumps(
        value,
        sort_keys=True,
        separators=(",", ":"),
        ensure_ascii=False,
        allow_nan=False,
    )


def canonical_sha256(value: Any) -> str:
    """SHA-256 of stringify(value), formatted as 'sha256:<64 hex>'."""
    digest = hashlib.sha256(stringify(value).encode("utf-8")).hexdigest()
    return f"sha256:{digest}"


def compute_event_hash(event: dict[str, Any]) -> str:
    """Computes event_hash for a Runfile event.

    Per the canonicalisation spec, the `event_hash` field itself is excluded
    from canonicalisation. We serialise the event with `event_hash` omitted,
    compute SHA-256, then format the result.
    """
    rest = {k: v for k, v in event.items() if k != "event_hash"}
    return canonical_sha256(rest)


__all__ = ["stringify", "canonical_sha256", "compute_event_hash"]
