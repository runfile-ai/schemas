# @runfile-ai/schemas

## 0.4.0

### Minor Changes

- [#7](https://github.com/runfile-ai/schemas/pull/7) [`8b30b43`](https://github.com/runfile-ai/schemas/commit/8b30b4332f041e0ef1e9a41f626fa7003c57ebab) Thanks [@ada-raj](https://github.com/ada-raj)! - Add the segment-based event ordering model.

  Breaking change (pre-1.0; no customer SDK has shipped against the prior shape): `RunfileEvent` — and the ingest `EventSubmission` that mirrors it — gain two required fields, `segment_index` and `local_seq`. `local_seq` is a monotonic capture counter the SDK assigns within a single process segment and is the authoritative ordering for the hash chain within that segment; together with `segment_index` it gives a total order of `(run_id, segment_index, local_seq)`. Adds the `sequence_gap` and `causality_violation` anomaly codes (a gap in `local_seq` surfaces as `sequence_gap`). Regenerated JSON Schema, Python, and Go artifacts.

## 0.3.0

### Minor Changes

- [#5](https://github.com/runfile-ai/schemas/pull/5) [`3593dfb`](https://github.com/runfile-ai/schemas/commit/3593dfbedc801930f88db7fd18661436dc1a3c1e) Thanks [@ada-raj](https://github.com/ada-raj)! - Update the v3 payload encryption envelope.

  Breaking change (pre-1.0; no customer SDK has shipped against the prior shape): `PayloadRef.encryption` — and the ingest `PayloadSubmission` that shares it — replaces `kms_key_arn` with an inline wrapped-data-key id `key_id` (optional) plus the now-required AES-GCM `nonce`. Regenerated JSON Schema, Python, and Go artifacts.

## 0.2.0

### Minor Changes

- [#3](https://github.com/runfile-ai/schemas/pull/3) [`4272ec1`](https://github.com/runfile-ai/schemas/commit/4272ec1fdfde5cf64d106fd70c25b88b220e914b) Thanks [@ada-raj](https://github.com/ada-raj)! - Migrate to the v2 two-entity data model: Run + Event.

  Breaking changes (pre-1.0; no customer SDK has shipped against the prior shape):

  - **New `RunfileRun` entity** with lifecycle states (`active` / `awaiting_human` / `awaiting_webhook` / `awaiting_schedule` / `ended`), inter-run relationships (`delegated_from`, `handed_off_from`, `scheduled_from`, `invoked_by`, `continued_from`), `suspension_intervals`, active-vs-total duration, and `merkle_inclusions`. Materialised from events; not part of the hash chain.
  - **`RunfileEvent`**: `agent_run_id` → `run_id`, `prev_hash` → `prev_event_hash`; `subject` is now optional; added `parallel_group_id`, `suspension_details`, `resume_details`, `delegation_details`, `handoff_details`, and `otel_attributes`. Expanded the `action.kind`, anomaly-code, and SDK-framework enums; added `model_ref.streaming`, the `audit_of_audit` data classification, and the framework-signal content type.
  - **Ingest**: batches are now mixed-item (`run_create` / `run_update` / `run_end` / `event`) instead of an `events[]` array. New `RunSubmission`, `BatchItem` tagged union, `AcceptedItem` / `RejectedItem`, additional rejection codes (`run_not_found`, `run_already_ended`, `run_lifecycle_transition_invalid`, `agent_identity_mismatch_with_run`, `duplicate_id`), and redaction treatments `drop` / `tokenize` / `hash` / `pass_through` / `tokenize_with_fallback`.
  - New conditional-required rules (run_suspend→suspension_details, run_resume→resume_details, delegate→delegation_details, handoff→handoff_details) are enforced in Zod and injected into the generated Pydantic / Go validators.

  Generated JSON Schema, Python, and Go artifacts regenerated.

## 0.1.2

### Patch Changes

- [`4ad5c7d`](https://github.com/runfile-ai/schemas/commit/4ad5c7df1c08f995cbd099139cf2bbfae70303d4) Thanks [@ada-raj](https://github.com/ada-raj)! - Enable PyPI publishing through the same Changesets workflow that handles
  npm + Go tagging. Uses PyPI trusted publishing (OIDC) so no API token is
  stored in GitHub secrets. The previous standalone `release.yml` is removed
  since its only remaining responsibility was PyPI.

## 0.1.1

### Patch Changes

- [`36259de`](https://github.com/runfile-ai/schemas/commit/36259def73e0d1225905e3e812b1f81124f0545d) Thanks [@ada-raj](https://github.com/ada-raj)! - Initial automated release through Changesets. Establishes the `v0.1.1`
  git tag so Go consumers can fetch the module via
  `go get github.com/runfile-ai/schemas@v0.1.1`. Same shapes as `0.1.0`
  (which was a one-time manual publish to claim the npm name).
