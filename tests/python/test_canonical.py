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

from runfile_schemas.canonical import canonical_sha256, stringify

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


if __name__ == "__main__":
    unittest.main()
