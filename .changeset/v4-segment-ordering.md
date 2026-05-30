---
"@runfile-ai/schemas": minor
---

Add the segment-based event ordering model.

Breaking change (pre-1.0; no customer SDK has shipped against the prior shape): `RunfileEvent` — and the ingest `EventSubmission` that mirrors it — gain two required fields, `segment_index` and `local_seq`. `local_seq` is a monotonic capture counter the SDK assigns within a single process segment and is the authoritative ordering for the hash chain within that segment; together with `segment_index` it gives a total order of `(run_id, segment_index, local_seq)`. Adds the `sequence_gap` and `causality_violation` anomaly codes (a gap in `local_seq` surfaces as `sequence_gap`). Regenerated JSON Schema, Python, and Go artifacts.
