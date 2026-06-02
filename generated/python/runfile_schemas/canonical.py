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


# Fields NOT covered by event_hash. The hash commits to the SDK-authored
# capture fields only — never the server-set ones — so the SDK can reproduce it
# (making prev_event_hash_intent a real chain_break signal) and fields written
# after hashing (merkle_inclusion, server-appended anomaly_flags) don't
# retroactively invalidate it. This set is the cross-language chain contract:
# it MUST match canonical.ts NON_HASHED_EVENT_FIELDS and canonical.go, and the
# Verifier uses the same projection. Changing it is chain-breaking.
NON_HASHED_EVENT_FIELDS = frozenset(
    {
        "event_hash",  # the hash field itself
        "tenant_id",  # server-resolved from the API key
        "received_at",  # server receive stamp
        "anomaly_flags",  # server may append flags after hashing
        "merkle_inclusion",  # populated later by the Merkle Builder
        "prev_event_hash_intent",  # wire-only; the hash commits to prev_event_hash
    }
)


# Fields NOT covered by event_hash WITHIN payload_ref. payload_ref is hashed (it
# commits to the payload's content), but its location/transport fields differ
# between the two authors of the chain: the witness (SDK) submits
# {ciphertext_base64, s3_uri_intent?} and no s3_uri, while the server resolves
# that to {s3_uri} and strips the ciphertext (bytes go to S3). Hashing them would
# make the witness's prev_event_hash_intent and the server's recomputed
# event_hash disagree on every payload-bearing event. The hash commits only to
# payload CONTENT (sha256, size_bytes, encryption, content_type,
# redaction_applied); the bytes are already pinned by sha256. MUST match
# canonical.ts NON_HASHED_PAYLOAD_REF_FIELDS and canonical.go.
NON_HASHED_PAYLOAD_REF_FIELDS = frozenset(
    {
        "s3_uri",  # server-assigned canonical location
        "s3_uri_intent",  # witness hint; server replaces it with s3_uri
        "ciphertext_base64",  # inline encrypted bytes; server uploads to S3 and strips
    }
)


def canonical_event_for_hash(event: dict[str, Any]) -> dict[str, Any]:
    """Projects an event onto the fields covered by event_hash.

    Drops the server-set / transport-only fields in NON_HASHED_EVENT_FIELDS and,
    within payload_ref, the location/transport fields in
    NON_HASHED_PAYLOAD_REF_FIELDS. Exclusion-based so additive minor-version
    fields are hash-protected.
    """
    out: dict[str, Any] = {}
    for k, v in event.items():
        if k in NON_HASHED_EVENT_FIELDS:
            continue
        if k == "payload_ref" and isinstance(v, dict):
            out[k] = {
                pk: pv
                for pk, pv in v.items()
                if pk not in NON_HASHED_PAYLOAD_REF_FIELDS
            }
        else:
            out[k] = v
    return out


def compute_event_hash(event: dict[str, Any]) -> str:
    """Computes event_hash for a Runfile event.

    SHA-256 over the canonical JSON of canonical_event_for_hash(event).
    """
    return canonical_sha256(canonical_event_for_hash(event))


__all__ = [
    "stringify",
    "canonical_sha256",
    "compute_event_hash",
    "canonical_event_for_hash",
    "NON_HASHED_EVENT_FIELDS",
    "NON_HASHED_PAYLOAD_REF_FIELDS",
]
