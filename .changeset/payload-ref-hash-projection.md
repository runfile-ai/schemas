---
"@runfile-ai/schemas": minor
---

canonical: exclude payload_ref location/transport fields from the event hash

`payload_ref` stays hashed (it commits to the payload's content), but the
canonical projection now drops its location/transport fields —
`s3_uri`, `s3_uri_intent`, and `ciphertext_base64` — across all three legs
(`canonical.ts`, `canonical.go`, `canonical.py`).

These fields differ between the two authors of the hash chain: the witness (SDK)
submits `{ ciphertext_base64, s3_uri_intent? }` with no `s3_uri`, while the
server resolves the upload to `{ s3_uri }` and strips the ciphertext. Hashing
them made the witness's `prev_event_hash_intent` and the server's recomputed
`event_hash` disagree on **every payload-bearing event** — a permanent false
`chain_break`. The hash now commits only to payload **content**
(`sha256`, `size_bytes`, `encryption`, `content_type`, `redaction_applied`); the
bytes themselves are already pinned by `sha256`, so no integrity is lost.

This changes the canonical event-hash projection. It is a re-anchor: every
consumer — TS/Python SDK, Go Event Processor, Verifier CLI — must adopt this
version together, and hashes computed under the previous projection will not
match. Pre-release: no migration. Exports `NON_HASHED_PAYLOAD_REF_FIELDS`.
