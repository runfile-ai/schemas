"""Cross-language canonical-JSON parity — Python leg.

Loads the shared fixture at tests/fixtures/canonical-vectors.json and asserts
that the Python `runfile_schemas.canonical.stringify` implementation produces
byte-identical output to the `canonical` field of each vector. When a vector
carries an `sha256` field, also asserts that `canonical_sha256` matches.

This file is the Python counterpart of tests/cross-language.test.ts; together
they enforce the "all three languages reproduce exactly" guarantee from the
schemas spec.
"""
from __future__ import annotations

import json
import unittest
from pathlib import Path

from runfile_schemas.canonical import (
    NON_HASHED_EVENT_FIELDS,
    NON_HASHED_PAYLOAD_REF_FIELDS,
    canonical_event_for_hash,
    canonical_sha256,
    compute_event_hash,
    stringify,
)

FIXTURE_PATH = (
    Path(__file__).resolve().parent.parent / "fixtures" / "canonical-vectors.json"
)


def _load_vectors() -> list[dict]:
    payload = json.loads(FIXTURE_PATH.read_text(encoding="utf-8"))
    return payload["vectors"]


class CanonicalParityTests(unittest.TestCase):
    def test_every_vector_canonical_bytes_match(self) -> None:
        for vector in _load_vectors():
            with self.subTest(name=vector["name"]):
                self.assertEqual(
                    stringify(vector["input"]),
                    vector["canonical"],
                    f"canonical bytes diverge for vector {vector['name']!r}",
                )

    def test_every_vector_sha256_matches_when_committed(self) -> None:
        for vector in _load_vectors():
            if "sha256" not in vector:
                continue
            with self.subTest(name=vector["name"]):
                self.assertEqual(
                    canonical_sha256(vector["input"]),
                    vector["sha256"],
                    f"sha256 diverges for vector {vector['name']!r}",
                )


def _sample_event() -> dict:
    return {
        "event_id": "01HQ3X9N8K7P2M5R4T6V8W0Y1Z",
        "run_id": "run_01HQ3X9N8K7P2M5R4T6V8W0Y00",
        "captured_at": "2026-05-21T14:32:17.482Z",
        "prev_event_hash": "sha256:" + "0" * 64,
        "action": {"kind": "llm_call", "name": "messages.create"},
    }


class EventHashFieldContractTests(unittest.TestCase):
    """The hashed field set must match canonical.ts / canonical.go."""

    def test_server_set_fields_do_not_change_the_hash(self) -> None:
        want = compute_event_hash(_sample_event())
        for field in NON_HASHED_EVENT_FIELDS:
            if field == "event_hash":
                continue
            ev = _sample_event()
            ev[field] = "server-set-value-should-not-matter"
            with self.subTest(field=field):
                self.assertEqual(
                    compute_event_hash(ev),
                    want,
                    f"server-set field {field!r} changed the event hash",
                )

    def test_authoritative_prev_event_hash_changes_the_hash(self) -> None:
        want = compute_event_hash(_sample_event())
        ev = _sample_event()
        ev["prev_event_hash"] = "sha256:" + "d" * 64
        self.assertNotEqual(compute_event_hash(ev), want)

    def test_projection_drops_excluded_keys(self) -> None:
        ev = _sample_event()
        ev["received_at"] = "2026-05-21T14:32:18.103Z"
        ev["tenant_id"] = "tnt_h7q3n2bz5kp8"
        projected = canonical_event_for_hash(ev)
        for field in NON_HASHED_EVENT_FIELDS:
            self.assertNotIn(field, projected)
        self.assertIn("event_id", projected)
        self.assertIn("prev_event_hash", projected)


def _payload_content() -> dict:
    return {
        "sha256": "sha256:" + "e" * 64,
        "size_bytes": 1234,
        "encryption": {"algorithm": "AES-256-GCM", "data_key_id": "dk_abc"},
        "content_type": "application/vnd.runfile.llm-request+json",
    }


class PayloadRefProjectionTests(unittest.TestCase):
    """payload_ref commits to content, not location/transport. Must match
    canonical.ts / canonical.go so witness and server agree."""

    def test_witness_and_server_hash_payload_event_identically(self) -> None:
        # Witness (SDK): inline ciphertext + URI hint, no resolved s3_uri.
        witness = _sample_event()
        witness["payload_ref"] = {
            **_payload_content(),
            "s3_uri_intent": "s3://hint/x",
            "ciphertext_base64": "Y2lwaGVydGV4dA==",
        }
        # Server: ciphertext uploaded and stripped, canonical s3_uri written.
        server = _sample_event()
        server["payload_ref"] = {
            **_payload_content(),
            "s3_uri": "s3://runfile-payloads-prod/tnt/run/evt.bin",
        }
        self.assertEqual(compute_event_hash(witness), compute_event_hash(server))

    def test_projection_drops_location_keeps_content(self) -> None:
        server = _sample_event()
        server["payload_ref"] = {
            **_payload_content(),
            "s3_uri": "s3://runfile-payloads-prod/tnt/run/evt.bin",
        }
        ref = canonical_event_for_hash(server)["payload_ref"]
        for field in NON_HASHED_PAYLOAD_REF_FIELDS:
            self.assertNotIn(field, ref)
        self.assertIn("sha256", ref)
        self.assertIn("size_bytes", ref)
        self.assertIn("encryption", ref)

    def test_payload_content_stays_committed(self) -> None:
        server = _sample_event()
        server["payload_ref"] = {
            **_payload_content(),
            "s3_uri": "s3://runfile-payloads-prod/tnt/run/evt.bin",
        }
        want = compute_event_hash(server)
        tampered = _sample_event()
        tampered["payload_ref"] = {
            **_payload_content(),
            "sha256": "sha256:" + "f" * 64,
            "s3_uri": "s3://runfile-payloads-prod/tnt/run/evt.bin",
        }
        self.assertNotEqual(compute_event_hash(tampered), want)


class Rfc8785NumberTests(unittest.TestCase):
    """Integer-valued floats must serialise without '.0' (RFC 8785), matching
    canonical.ts / canonical.go and the JS-normalised value the EP hashes."""

    def test_integer_valued_floats_drop_dot_zero(self) -> None:
        self.assertEqual(stringify({"x": 2.0}), '{"x":2}')
        self.assertEqual(stringify(19555.0), "19555")
        self.assertEqual(stringify([1.0, 2.5]), "[1,2.5]")

    def test_non_integer_floats_preserved(self) -> None:
        self.assertEqual(stringify({"t": 0.7}), '{"t":0.7}')

    def test_event_with_integer_valued_float_hashes_like_int_form(self) -> None:
        # The otel cache-token floats that caused the cross-language chain_break:
        # the witness's float form must now hash identically to the int form the
        # server sees after the ingest layer's JSON round-trip.
        ev_float = _sample_event()
        ev_float["otel_attributes"] = {
            "extra": {"uncached_input_tokens": 2.0, "cache_read_input_tokens": 19555.0}
        }
        ev_int = _sample_event()
        ev_int["otel_attributes"] = {
            "extra": {"uncached_input_tokens": 2, "cache_read_input_tokens": 19555}
        }
        self.assertEqual(compute_event_hash(ev_float), compute_event_hash(ev_int))


if __name__ == "__main__":
    unittest.main()
