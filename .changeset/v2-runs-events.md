---
"@runfile-ai/schemas": minor
---

Migrate to the v2 two-entity data model: Run + Event.

Breaking changes (pre-1.0; no customer SDK has shipped against the prior shape):

- **New `RunfileRun` entity** with lifecycle states (`active` / `awaiting_human` / `awaiting_webhook` / `awaiting_schedule` / `ended`), inter-run relationships (`delegated_from`, `handed_off_from`, `scheduled_from`, `invoked_by`, `continued_from`), `suspension_intervals`, active-vs-total duration, and `merkle_inclusions`. Materialised from events; not part of the hash chain.
- **`RunfileEvent`**: `agent_run_id` → `run_id`, `prev_hash` → `prev_event_hash`; `subject` is now optional; added `parallel_group_id`, `suspension_details`, `resume_details`, `delegation_details`, `handoff_details`, and `otel_attributes`. Expanded the `action.kind`, anomaly-code, and SDK-framework enums; added `model_ref.streaming`, the `audit_of_audit` data classification, and the framework-signal content type.
- **Ingest**: batches are now mixed-item (`run_create` / `run_update` / `run_end` / `event`) instead of an `events[]` array. New `RunSubmission`, `BatchItem` tagged union, `AcceptedItem` / `RejectedItem`, additional rejection codes (`run_not_found`, `run_already_ended`, `run_lifecycle_transition_invalid`, `agent_identity_mismatch_with_run`, `duplicate_id`), and redaction treatments `drop` / `tokenize` / `hash` / `pass_through` / `tokenize_with_fallback`.
- New conditional-required rules (run_suspend→suspension_details, run_resume→resume_details, delegate→delegation_details, handoff→handoff_details) are enforced in Zod and injected into the generated Pydantic / Go validators.

Generated JSON Schema, Python, and Go artifacts regenerated.
