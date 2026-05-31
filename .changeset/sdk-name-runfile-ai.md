---
"@runfile-ai/schemas": minor
---

Add `runfile-ai` and `@runfile-ai/sdk` to `SdkNameEnum`.

Additive, non-breaking: the existing values `runfile-py` and `@runfile/sdk` are kept (still emitted by the batch smoke tool and the Event Processor's synthetic-event defaults). The new values are what the Python and TS SDKs now report as `sdk.name`, so ingest accepts those events once it ships on this schema. Removing the old values is a separate, future major. Regenerated JSON Schema, Python, and Go artifacts (event, ingest, evidence).
