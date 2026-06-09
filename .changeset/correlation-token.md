---
"@runfile-ai/schemas": minor
---

Add optional `correlation_token` to `SuspensionDetails` and `ResumeDetails` — the
framework's durable resume handle (LangGraph `thread_id`, Claude `session_id`,
OpenAI `trace_id`), captured at suspend/resume so an out-of-process resume or
human-approval can be joined back to the run. Additive and backward-compatible.
