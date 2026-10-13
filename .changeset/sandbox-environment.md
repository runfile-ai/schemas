---
"@runfile-ai/schemas": minor
---

`environment` is now an environment *name* (a lowercase slug, max 32 chars) instead of the fixed `production | staging | development` list, and `EnvironmentEnum` is replaced by `EnvironmentNameSchema`. Environments belong to the workspace — every workspace starts with `sandbox` and `production` — so adding one no longer needs a schema release. Each API key belongs to exactly one environment and ingest rejects data whose declared environment differs from its key's, so the value stays in the hashed record as an attested fact. All previous values remain valid, and the event hash projection is unaffected.
