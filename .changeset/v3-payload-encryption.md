---
"@runfile-ai/schemas": minor
---

Update the v3 payload encryption envelope.

Breaking change (pre-1.0; no customer SDK has shipped against the prior shape): `PayloadRef.encryption` — and the ingest `PayloadSubmission` that shares it — replaces `kms_key_arn` with an inline wrapped-data-key id `key_id` (optional) plus the now-required AES-GCM `nonce`. Regenerated JSON Schema, Python, and Go artifacts.
